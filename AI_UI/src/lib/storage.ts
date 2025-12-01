/**
 * Hybrid storage utilities for saving and loading conversations
 * Uses database (Supabase) when available, falls back to localStorage
 */

// Helper function to check if code is running on the server
function isServer(): boolean {
  return typeof window === 'undefined';
}

// Helper to get user email
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

// Helper to get current user identifier
function getCurrentUserId(): string {
  return getUserPrefix();
}

// ==================== Database API Helpers ====================

// Save conversation to database
async function saveConversationToDatabase(id: string, messages: any[], title?: string): Promise<boolean> {
  const email = getUserEmail();
  if (!email) return false;

  try {
    // First, ensure conversation exists
    const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      // Conversation doesn't exist, create it
      const createResponse = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          title: title || `Conversation ${id.substring(0, 6)}`,
        }),
      });

      if (!createResponse.ok) {
        console.error('Failed to create conversation in database');
        return false;
      }
    } else if (title) {
      // Update title if provided
      await fetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, title }),
      });
    }

    // Save messages
    const messagesResponse = await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, messages }),
    });

    return messagesResponse.ok;
  } catch (error) {
    console.error('Error saving conversation to database:', error);
    return false;
  }
}

// Load conversation from database
async function loadConversationFromDatabase(id: string): Promise<any[] | null> {
  const email = getUserEmail();
  if (!email) return null;

  try {
    const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error loading conversation from database:', error);
    return null;
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

// ==================== LocalStorage Helpers (Fallback) ====================

// Save a conversation to localStorage
function saveConversationToLocalStorage(id: string, messages: any[]) {
  if (isServer()) return;

  const userId = getCurrentUserId();
  localStorage.setItem(`${userId}-conversation-${id}`, JSON.stringify(messages));

  // Save conversation list
  const savedConversations = getConversationListFromLocalStorage();
  if (!savedConversations.includes(id)) {
    localStorage.setItem(`${userId}-conversations`, JSON.stringify([...savedConversations, id]));
  }

  // Update conversation metadata
  const metadata = getConversationMetadataFromLocalStorage(id) || {
    title: `Conversation ${id.substring(0, 6)}`,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };

  // Update timestamp
  metadata.updated = new Date().toISOString();

  // Update title based on first message if it doesn't already have a custom title
  if (metadata.title === `Conversation ${id.substring(0, 6)}` && messages.length > 0) {
    const firstUserMessage = messages.find(m => m.isUser)?.content;
    if (firstUserMessage) {
      metadata.title = firstUserMessage.substring(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
    }
  }

  saveConversationMetadataToLocalStorage(id, metadata);
}

// Load a conversation from localStorage
function loadConversationFromLocalStorage(id: string) {
  if (isServer()) return null;

  const userId = getCurrentUserId();
  const saved = localStorage.getItem(`${userId}-conversation-${id}`);
  return saved ? JSON.parse(saved) : null;
}

// Get list of all saved conversations from localStorage
function getConversationListFromLocalStorage() {
  if (isServer()) return [];

  const userId = getCurrentUserId();
  const saved = localStorage.getItem(`${userId}-conversations`);
  return saved ? JSON.parse(saved) : [];
}

// Delete a conversation from localStorage
function deleteConversationFromLocalStorage(id: string) {
  if (isServer()) return [];

  const userId = getCurrentUserId();
  // Remove from list
  const savedConversations = getConversationListFromLocalStorage();
  localStorage.setItem(
    `${userId}-conversations`,
    JSON.stringify(savedConversations.filter((cid: string) => cid !== id))
  );

  // Remove the conversation data
  localStorage.removeItem(`${userId}-conversation-${id}`);

  // Remove metadata
  localStorage.removeItem(`${userId}-conversation-meta-${id}`);

  return getConversationListFromLocalStorage();
}

// Save metadata for a conversation to localStorage
function saveConversationMetadataToLocalStorage(id: string, metadata: ConversationMetadata) {
  if (isServer()) return;

  const userId = getCurrentUserId();
  localStorage.setItem(`${userId}-conversation-meta-${id}`, JSON.stringify(metadata));
}

// Get metadata for a conversation from localStorage
function getConversationMetadataFromLocalStorage(id: string): ConversationMetadata | null {
  if (isServer()) return null;

  const userId = getCurrentUserId();
  const saved = localStorage.getItem(`${userId}-conversation-meta-${id}`);
  return saved ? JSON.parse(saved) : null;
}

// ==================== Public API (Hybrid) ====================

// Interface for conversation metadata
export interface ConversationMetadata {
  title: string;
  created: string;
  updated: string;
}

// Save a conversation (tries database first, falls back to localStorage)
export function saveConversation(id: string, messages: any[]) {
  if (isServer()) return;

  // Always save to localStorage immediately for offline support
  saveConversationToLocalStorage(id, messages);

  // Try to save to database in the background
  const metadata = getConversationMetadataFromLocalStorage(id);
  saveConversationToDatabase(id, messages, metadata?.title).catch(err => {
    console.log('Database save failed, using localStorage only:', err);
  });
}

// Load a conversation (tries database first, falls back to localStorage)
export async function loadConversation(id: string): Promise<any[] | null> {
  if (isServer()) return null;

  // Try database first
  try {
    const dbMessages = await loadConversationFromDatabase(id);
    if (dbMessages && dbMessages.length > 0) {
      // Cache in localStorage
      saveConversationToLocalStorage(id, dbMessages);
      return dbMessages;
    }
  } catch (error) {
    console.log('Database load failed, using localStorage:', error);
  }

  // Fall back to localStorage
  return loadConversationFromLocalStorage(id);
}

// Get list of all saved conversations (tries database first)
export async function getConversationList(): Promise<string[]> {
  if (isServer()) return [];

  // Try database first
  try {
    const dbConversations = await loadConversationsFromDatabase();
    if (dbConversations && dbConversations.length > 0) {
      return dbConversations.map((c: any) => c.id);
    }
  } catch (error) {
    console.log('Database list failed, using localStorage:', error);
  }

  // Fall back to localStorage
  return getConversationListFromLocalStorage();
}

// Delete a conversation (from both database and localStorage)
export async function deleteConversation(id: string): Promise<string[]> {
  if (isServer()) return [];

  // Delete from localStorage immediately
  deleteConversationFromLocalStorage(id);

  // Try to delete from database
  try {
    await deleteConversationFromDatabase(id);
  } catch (error) {
    console.log('Database delete failed, localStorage already cleared:', error);
  }

  return getConversationListFromLocalStorage();
}

// Save metadata for a conversation
export function saveConversationMetadata(id: string, metadata: ConversationMetadata) {
  if (isServer()) return;

  // Save to localStorage
  saveConversationMetadataToLocalStorage(id, metadata);

  // Update database title in background
  const email = getUserEmail();
  if (email) {
    fetch(`/api/conversations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, title: metadata.title }),
    }).catch(err => console.log('Failed to update conversation title in database:', err));
  }
}

// Get metadata for a conversation
export function getConversationMetadata(id: string): ConversationMetadata | null {
  return getConversationMetadataFromLocalStorage(id);
}

// Get all conversation metadata (async version that tries database first)
export async function getAllConversationsMetadata(): Promise<any[]> {
  if (isServer()) return [];

  // Try database first
  try {
    const dbConversations = await loadConversationsFromDatabase();
    if (dbConversations && dbConversations.length > 0) {
      return dbConversations.map((c: any) => ({
        id: c.id,
        title: c.title,
        created: c.created_at || c.createdAt,
        updated: c.updated_at || c.updatedAt,
      })).sort((a: any, b: any) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
    }
  } catch (error) {
    console.log('Database metadata load failed, using localStorage:', error);
  }

  // Fall back to localStorage
  const conversations = getConversationListFromLocalStorage();
  return conversations.map((id: string) => ({
    id,
    ...getConversationMetadataFromLocalStorage(id)
  })).sort((a: any, b: any) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
}

// Sync version for backwards compatibility
export function getAllConversationsMetadataSync() {
  if (isServer()) return [];

  const conversations = getConversationListFromLocalStorage();
  return conversations.map((id: string) => ({
    id,
    ...getConversationMetadataFromLocalStorage(id)
  })).sort((a: any, b: any) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
}

// Clear all conversations
export function clearAllConversations() {
  if (isServer()) return [];

  const userId = getCurrentUserId();
  const conversations = getConversationListFromLocalStorage();

  // Remove each conversation
  conversations.forEach((id: string) => {
    localStorage.removeItem(`${userId}-conversation-${id}`);
    localStorage.removeItem(`${userId}-conversation-meta-${id}`);
  });

  // Clear the list
  localStorage.removeItem(`${userId}-conversations`);

  return [];
} 