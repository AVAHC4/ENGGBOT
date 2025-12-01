/**
 * Database-only storage utilities for saving and loading conversations
 * Uses Supabase database exclusively - no localStorage
 */

// Helper function to check if code is running on the server
function isServer(): boolean {
  return typeof window === 'undefined';
}

// Helper to get user email from session storage (not localStorage for data)
export function getUserEmail(): string | null {
  if (isServer()) return null;

  try {
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (userData && userData.email) {
      return userData.email;
    }

    const email = localStorage.getItem('user_email');
    if (email) {
      return email;
    }

    return null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
}

// ==================== Database API Functions ====================

// Save conversation to database
async function saveConversationToDatabase(id: string, messages: any[], title?: string): Promise<boolean> {
  const email = getUserEmail();
  console.log('[DB Save] Attempting to save conversation:', { id: id.substring(0, 8), email, messagesCount: messages.length, title });
  if (!email) {
    console.warn('[DB Save] No email found, skipping database save');
    return false;
  }

  try {
    // First, ensure conversation exists
    console.log('[DB Save] Checking if conversation exists...');
    const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      // Conversation doesn't exist, create it with the same ID
      console.log('[DB Save] Conversation does not exist, creating...');
      const createResponse = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, // Pass the ID to ensure consistency
          email,
          title: title || `Conversation ${id.substring(0, 6)}`,
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[DB Save] Failed to create conversation:', createResponse.status, errorText);
        return false;
      }
      console.log('[DB Save] Conversation created successfully');
    } else if (title) {
      // Update title if provided
      console.log('[DB Save] Updating conversation title...');
      await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, title }),
      });
    }

    // Save messages
    console.log('[DB Save] Saving messages to database...');
    const messagesResponse = await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, messages }),
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('[DB Save] Failed to save messages:', messagesResponse.status, errorText);
      return false;
    }

    console.log('[DB Save] ✅ Successfully saved conversation and messages to database');
    return messagesResponse.ok;
  } catch (error) {
    console.error('[DB Save] Error saving conversation to database:', error);
    return false;
  }
}

// Load conversation from database
async function loadConversationFromDatabase(id: string): Promise<any[]> {
  const email = getUserEmail();
  if (!email) return [];

  try {
    const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      // Conversation not found in database, return empty array
      return [];
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error loading conversation from database:', error);
    return []; // Return empty array instead of null to prevent .length errors
  }
}

// Load all conversations from database
async function loadConversationsFromDatabase(): Promise<any[]> {
  const email = getUserEmail();
  if (!email) return [];

  try {
    const response = await fetch(`/api/conversations?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.conversations || [];
  } catch (error) {
    console.error('Error loading conversations from database:', error);
    return [];
  }
}

// Delete conversation from database
async function deleteConversationFromDatabase(id: string): Promise<boolean> {
  const email = getUserEmail();
  if (!email) return false;

  try {
    const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting conversation from database:', error);
    return false;
  }
}

// ==================== Public API (Database Only) ====================

// Interface for conversation metadata
export interface ConversationMetadata {
  title: string;
  created: string;
  updated: string;
}

// Save a conversation (database only)
export function saveConversation(id: string, messages: any[]) {
  if (isServer()) return;

  // Save to database only
  saveConversationToDatabase(id, messages).catch(err => {
    console.error('Database save failed:', err);
  });
}

// Load a conversation (database only)
export async function loadConversation(id: string): Promise<any[]> {
  if (isServer()) return [];

  // Load from database only
  return await loadConversationFromDatabase(id);
}

// Get list of all saved conversations (database only)
export async function getConversationList(): Promise<string[]> {
  if (isServer()) return [];

  // Load from database only
  const dbConversations = await loadConversationsFromDatabase();
  return dbConversations.map((c: any) => c.id);
}

// Delete a conversation (database only)
export async function deleteConversation(id: string): Promise<string[]> {
  if (isServer()) return [];

  // Delete from database
  await deleteConversationFromDatabase(id);

  // Return updated conversation list
  const conversations = await loadConversationsFromDatabase();
  return conversations.map((c: any) => c.id);
}

// Save metadata for a conversation (title updates)
export function saveConversationMetadata(id: string, metadata: ConversationMetadata) {
  if (isServer()) return;

  const email = getUserEmail();
  if (email) {
    fetch(`/api/conversations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, title: metadata.title }),
    }).catch(err => console.log('Failed to update conversation title in database:', err));
  }
}

// Get metadata for a conversation (from database)
export async function getConversationMetadata(id: string): Promise<ConversationMetadata | null> {
  if (isServer()) return null;

  const email = getUserEmail();
  if (!email) return null;

  try {
    const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);
    if (!response.ok) return null;

    const data = await response.json();
    return {
      title: data.title,
      created: data.created_at,
      updated: data.updated_at,
    };
  } catch (error) {
    console.error('Error getting conversation metadata:', error);
    return null;
  }
}

// Get all conversation metadata (database only)
export async function getAllConversationsMetadata(): Promise<any[]> {
  if (isServer()) return [];

  // Load from database only
  const dbConversations = await loadConversationsFromDatabase();
  return dbConversations.map((c: any) => ({
    id: c.id,
    title: c.title,
    created: c.created_at || c.createdAt,
    updated: c.updated_at || c.updatedAt,
  })).sort((a: any, b: any) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
}

// Sync version for backwards compatibility - loads from database
export async function getAllConversationsMetadataSync() {
  return await getAllConversationsMetadata();
}

// Clear all conversations from database
export async function clearAllConversations() {
  if (isServer()) return [];

  const email = getUserEmail();
  if (!email) return [];

  try {
    // Get all conversations
    const conversations = await loadConversationsFromDatabase();

    // Delete each one
    await Promise.all(
      conversations.map((c: any) => deleteConversationFromDatabase(c.id))
    );

    return [];
  } catch (error) {
    console.error('Error clearing conversations:', error);
    return [];
  }
}