/**
 * RAG (Retrieval-Augmented Generation) API Routes for ENGGBOT
 * 
 * Provides project-aware document ingestion and context retrieval endpoints.
 * Integrates with the vector database service for project-isolated RAG operations.
 */

import express from 'express';
import multer from 'multer';
import { vectorDatabase } from '../services/vector-database.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow text files, PDFs, and common document formats
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload text, markdown, or PDF files.'));
    }
  }
});

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user?.google_id) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'You must be logged in to access RAG features.'
    });
  }
  next();
};

// Middleware to validate project ownership
const validateProjectOwnership = async (req: any, res: any, next: any) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.google_id;

    if (!projectId) {
      return res.status(400).json({
        error: 'Missing project ID',
        message: 'Project ID is required for this operation.'
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid format', 
        message: 'Project ID must be a valid UUID.' 
      });
    }

    // Check project ownership
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error || !project) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project not found or access denied.'
      });
    }

    req.project = project;
    next();

  } catch (error) {
    console.error('Error validating project ownership:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate project ownership.'
    });
  }
};

/**
 * POST /api/rag/:projectId/ingest
 * Ingest a document into the project's vector database
 */
router.post('/:projectId/ingest', requireAuth, validateProjectOwnership, upload.single('document'), async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.google_id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload a document file.'
      });
    }

    // Extract text content from file
    let content: string;
    
    if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
      content = file.buffer.toString('utf8');
    } else if (file.mimetype === 'application/pdf') {
      // For PDF files, you would typically use a library like pdf-parse
      // For now, we'll return an error asking for text files
      return res.status(400).json({
        error: 'PDF processing not implemented',
        message: 'Please convert your PDF to text format and upload as a .txt file.'
      });
    } else {
      return res.status(400).json({
        error: 'Unsupported file type',
        message: 'Currently only text and markdown files are supported.'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Empty document',
        message: 'The uploaded document appears to be empty.'
      });
    }

    // Ingest the document into the vector database
    const result = await vectorDatabase.ingestDocument(
      projectId,
      userId,
      content,
      file.originalname
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Ingestion failed',
        message: result.error || 'Failed to process the document.'
      });
    }

    console.log(`Document ingested: ${file.originalname} for project ${projectId}`);
    res.json({
      success: true,
      message: 'Document ingested successfully',
      filename: file.originalname,
      chunksProcessed: result.chunksProcessed,
      projectId: projectId
    });

  } catch (error) {
    console.error('Error ingesting document:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing the document.'
    });
  }
});

/**
 * POST /api/rag/:projectId/search
 * Search for relevant content within a project's vector database
 */
router.post('/:projectId/search', requireAuth, validateProjectOwnership, async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.google_id;
    const { query, topK = 5 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Query must be a non-empty string.'
      });
    }

    if (topK && (typeof topK !== 'number' || topK < 1 || topK > 20)) {
      return res.status(400).json({
        error: 'Invalid topK',
        message: 'topK must be a number between 1 and 20.'
      });
    }

    // Search the project's vector database
    const result = await vectorDatabase.searchProject(
      projectId,
      userId,
      query.trim(),
      topK
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Search failed',
        message: result.error || 'Failed to search the project documents.'
      });
    }

    console.log(`RAG search performed for project ${projectId}: "${query}" -> ${result.results.length} results`);
    res.json({
      success: true,
      query: query.trim(),
      results: result.results,
      projectId: projectId,
      projectName: req.project.name
    });

  } catch (error) {
    console.error('Error searching project:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while searching.'
    });
  }
});

/**
 * POST /api/rag/:projectId/ingest-text
 * Ingest raw text content into the project's vector database
 */
router.post('/:projectId/ingest-text', requireAuth, validateProjectOwnership, async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.google_id;
    const { content, filename = 'user-input.txt' } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid content',
        message: 'Content must be a non-empty string.'
      });
    }

    // Ingest the text content into the vector database
    const result = await vectorDatabase.ingestDocument(
      projectId,
      userId,
      content.trim(),
      filename
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Ingestion failed',
        message: result.error || 'Failed to process the text content.'
      });
    }

    console.log(`Text content ingested for project ${projectId}`);
    res.json({
      success: true,
      message: 'Text content ingested successfully',
      filename: filename,
      chunksProcessed: result.chunksProcessed,
      projectId: projectId
    });

  } catch (error) {
    console.error('Error ingesting text content:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing the text content.'
    });
  }
});

/**
 * GET /api/rag/:projectId/stats
 * Get statistics about the project's vector database
 */
router.get('/:projectId/stats', requireAuth, validateProjectOwnership, async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    const globalStats = vectorDatabase.getStats();
    const projectVectorCount = globalStats.projectStats[projectId] || 0;

    res.json({
      success: true,
      projectId: projectId,
      projectName: req.project.name,
      vectorCount: projectVectorCount,
      hasContent: projectVectorCount > 0
    });

  } catch (error) {
    console.error('Error getting project stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while getting project statistics.'
    });
  }
});

/**
 * DELETE /api/rag/:projectId/vectors
 * Delete all vectors associated with a project
 */
router.delete('/:projectId/vectors', requireAuth, validateProjectOwnership, async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.google_id;

    const result = await vectorDatabase.deleteProjectVectors(projectId, userId);

    if (!result.success) {
      return res.status(500).json({
        error: 'Deletion failed',
        message: result.error || 'Failed to delete project vectors.'
      });
    }

    console.log(`Deleted all vectors for project ${projectId}`);
    res.json({
      success: true,
      message: 'All project vectors deleted successfully',
      projectId: projectId
    });

  } catch (error) {
    console.error('Error deleting project vectors:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while deleting project vectors.'
    });
  }
});

export default router;
