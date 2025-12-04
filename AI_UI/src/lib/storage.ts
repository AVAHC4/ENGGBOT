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

// Helper to get user email prefix consistently (for localStorage keys)
// Note: This is still used for localStorage keys like active conversation tracking
export function getUserPrefix(): string {
  if (isServer()) {
    return 'default';
  }

  const email = getUserEmail();
  if (email) {
    return btoa(encodeURIComponent(email)).replace(/[^a-z0-9]/gi, '_');
  }

  return 'default';
}


// ==================== Database API Functions ====================

// Cache of conversations we know exist (to avoid constant GET checks)
const knownConversations = new Set<string>();

// Save conversation to database
async function saveConversationToDatabase(id: string, messages: any[], title?: string): Promise<boolean> {
  const email = getUserEmail();
  if (!email) {
    console.warn('[DB Save] No email found, skipping database save');
    return false;
  }

  try {
    // Only check if conversation exists if we haven't verified it before
    if (!knownConversations.has(id)) {
      const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);

      if (!response.ok) {
        // Conversation doesn't exist, create it with the same ID
        console.log('[DB Save] Creating new conversation:', id.substring(0, 8));
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
      }
      // Mark as known to avoid future checks
      knownConversations.add(id);
    }

    // Save messages directly (no need to check every time)
    const messagesResponse = await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, messages }),
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('[DB Save] Failed to save messages:', messagesResponse.status, errorText);
      // If we get a 404, the conversation was deleted - remove from cache
      if (messagesResponse.status === 404) {
        knownConversations.delete(id);
      }
      return false;
    }

    return true;
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

// Helper to dispatch conversation update event (for event-driven UI updates)
function dispatchConversationUpdated() {
  if (!isServer()) {
    window.dispatchEvent(new CustomEvent('conversationUpdated'));
  }
}

// Debounce map to prevent excessive saves
const saveDebounceMap = new Map<string, NodeJS.Timeout>();

// Save a conversation (database only) with debouncing
export function saveConversation(id: string, messages: any[]) {
  if (isServer()) return;

  // Clear existing debounce timer for this conversation
  const existingTimer = saveDebounceMap.get(id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Debounce: wait 500ms after last change before saving
  const timer = setTimeout(() => {
    saveDebounceMap.delete(id);

    // Save to database (don't dispatch event on every save to avoid loops)
    saveConversationToDatabase(id, messages)
      .then((success) => {
        if (success) {
          // Only dispatch event for new conversations or significant changes
          // Not on every message update to prevent render loops
          console.log('[Storage] Saved conversation:', id.substring(0, 8));
        }
      })
      .catch(err => {
        console.error('Database save failed:', err);
      });
  }, 500);

  saveDebounceMap.set(id, timer);
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

  // Dispatch event to refresh sidebar
  dispatchConversationUpdated();

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