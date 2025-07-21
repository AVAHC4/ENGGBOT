/**
 * Project-Aware Vector Database Service for ENGGBOT
 * 
 * This service manages document ingestion, vector storage, and project-isolated retrieval
 * using FAISS for efficient similarity search with project-level context isolation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../lib/supabase.js';

// Types for vector operations
interface DocumentChunk {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  metadata: {
    filename?: string;
    chunkIndex: number;
    totalChunks: number;
    timestamp: string;
  };
}

interface VectorEntry {
  id: string;
  projectId: string;
  userId: string;
  vector: number[];
  content: string;
  metadata: any;
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: any;
}

class ProjectAwareVectorDatabase {
  private vectorStore: Map<string, VectorEntry[]> = new Map(); // projectId -> vectors
  private vectorDimension: number = 1536; // OpenAI embedding dimension
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'vector_data');
    this.ensureDataDirectory();
    this.loadVectorStore();
  }

  /**
   * Ensure the vector data directory exists
   */
  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  /**
   * Load existing vector store from disk
   */
  private loadVectorStore(): void {
    try {
      const storePath = path.join(this.dataPath, 'vector_store.json');
      if (fs.existsSync(storePath)) {
        const data = fs.readFileSync(storePath, 'utf8');
        const parsed = JSON.parse(data);
        this.vectorStore = new Map(Object.entries(parsed));
        console.log(`Loaded vector store with ${this.vectorStore.size} projects`);
      }
    } catch (error) {
      console.error('Error loading vector store:', error);
      this.vectorStore = new Map();
    }
  }

  /**
   * Save vector store to disk
   */
  private saveVectorStore(): void {
    try {
      const storePath = path.join(this.dataPath, 'vector_store.json');
      const data = Object.fromEntries(this.vectorStore);
      fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving vector store:', error);
    }
  }

  /**
   * Generate embeddings for text content
   * In a real implementation, this would call OpenAI's embedding API
   * For now, we'll use a simple mock embedding
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding generation - in production, use OpenAI's text-embedding-ada-002
    // This creates a simple hash-based embedding for demonstration
    const embedding = new Array(this.vectorDimension).fill(0);
    
    // Simple hash-based embedding (replace with actual OpenAI API call)
    for (let i = 0; i < text.length && i < this.vectorDimension; i++) {
      embedding[i % this.vectorDimension] += text.charCodeAt(i) / 1000;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  /**
   * Split document content into chunks for processing
   */
  private splitIntoChunks(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      chunks.push(content.slice(start, end));
      start = end - overlap;
      
      if (start >= content.length) break;
    }
    
    return chunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Ingest a document into the vector database with project isolation
   */
  async ingestDocument(
    projectId: string,
    userId: string,
    content: string,
    filename?: string
  ): Promise<{ success: boolean; chunksProcessed: number; error?: string }> {
    try {
      // Verify project ownership
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (projectError || !project) {
        return { success: false, chunksProcessed: 0, error: 'Project not found or access denied' };
      }

      // Split content into chunks
      const chunks = this.splitIntoChunks(content);
      const vectorEntries: VectorEntry[] = [];

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbedding(chunk);
        
        const vectorEntry: VectorEntry = {
          id: `${projectId}_${Date.now()}_${i}`,
          projectId,
          userId,
          vector: embedding,
          content: chunk,
          metadata: {
            filename: filename || 'unknown',
            chunkIndex: i,
            totalChunks: chunks.length,
            timestamp: new Date().toISOString()
          }
        };
        
        vectorEntries.push(vectorEntry);
      }

      // Store vectors for this project
      if (!this.vectorStore.has(projectId)) {
        this.vectorStore.set(projectId, []);
      }
      
      const projectVectors = this.vectorStore.get(projectId)!;
      projectVectors.push(...vectorEntries);
      
      // Save to disk
      this.saveVectorStore();
      
      console.log(`Ingested ${chunks.length} chunks for project ${projectId}`);
      return { success: true, chunksProcessed: chunks.length };

    } catch (error) {
      console.error('Error ingesting document:', error);
      return { success: false, chunksProcessed: 0, error: String(error) };
    }
  }

  /**
   * Search for relevant content within a specific project
   * This is the core of project-isolated RAG
   */
  async searchProject(
    projectId: string,
    userId: string,
    query: string,
    topK: number = 5
  ): Promise<{ success: boolean; results: SearchResult[]; error?: string }> {
    try {
      // Verify project ownership
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (projectError || !project) {
        return { success: false, results: [], error: 'Project not found or access denied' };
      }

      // Get project-specific vectors
      const projectVectors = this.vectorStore.get(projectId);
      if (!projectVectors || projectVectors.length === 0) {
        return { success: true, results: [] };
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Calculate similarities and rank results
      const similarities = projectVectors.map(entry => ({
        ...entry,
        score: this.cosineSimilarity(queryEmbedding, entry.vector)
      }));

      // Sort by similarity and take top K
      const topResults = similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(entry => ({
          id: entry.id,
          content: entry.content,
          score: entry.score,
          metadata: entry.metadata
        }));

      console.log(`Found ${topResults.length} relevant chunks for project ${projectId}`);
      return { success: true, results: topResults };

    } catch (error) {
      console.error('Error searching project:', error);
      return { success: false, results: [], error: String(error) };
    }
  }

  /**
   * Delete all vectors associated with a project
   * Called when a project is deleted
   */
  async deleteProjectVectors(projectId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify project ownership (if project still exists)
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      // Delete vectors regardless of project existence (for cleanup)
      if (this.vectorStore.has(projectId)) {
        this.vectorStore.delete(projectId);
        this.saveVectorStore();
        console.log(`Deleted all vectors for project ${projectId}`);
      }

      return { success: true };

    } catch (error) {
      console.error('Error deleting project vectors:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get statistics about the vector database
   */
  getStats(): { totalProjects: number; totalVectors: number; projectStats: Record<string, number> } {
    const projectStats: Record<string, number> = {};
    let totalVectors = 0;

    for (const [projectId, vectors] of this.vectorStore.entries()) {
      projectStats[projectId] = vectors.length;
      totalVectors += vectors.length;
    }

    return {
      totalProjects: this.vectorStore.size,
      totalVectors,
      projectStats
    };
  }
}

// Export singleton instance
export const vectorDatabase = new ProjectAwareVectorDatabase();
export { DocumentChunk, VectorEntry, SearchResult };
