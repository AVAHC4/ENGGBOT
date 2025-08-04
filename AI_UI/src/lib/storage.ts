/**
 * Storage utilities for saving and loading conversations
 */

// Helper function to check if code is running on the server
function isServer(): boolean {
  return typeof window === 'undefined';
}

// Helper to get user email prefix consistently
export function getUserPrefix(): string {
  if (isServer()) {
    return 'default';
  }
  
  try {
    // Get user email as the identifier, since it's unique per Google account
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (userData && userData.email) {
      // Return a hash of the email to use as prefix, safely encode non-ASCII characters
      return btoa(encodeURIComponent(userData.email)).replace(/[^a-z0-9]/gi, '_');
    }
    
    // Fallback to the email stored directly
    const email = localStorage.getItem('user_email');
    if (email) {
      return btoa(encodeURIComponent(email)).replace(/[^a-z0-9]/gi, '_');
    }
    
    // If no user data available, use a default namespace
    return 'default';
  } catch (error) {
    console.error('Error getting user prefix:', error);
    return 'default';
  }
}

// Helper to get current user identifier
function getCurrentUserId(): string {
  return getUserPrefix();
}

// Save a conversation to localStorage
export function saveConversation(id: string, messages: any[]) {
  if (isServer()) return;
  
  const userId = getCurrentUserId();
  localStorage.setItem(`${userId}-conversation-${id}`, JSON.stringify(messages));
  
  // Save conversation list
  const savedConversations = getConversationList();
  if (!savedConversations.includes(id)) {
    localStorage.setItem(`${userId}-conversations`, JSON.stringify([...savedConversations, id]));
  }
  
  // Update conversation metadata
  const metadata = getConversationMetadata(id) || { 
    id: id,
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
  
  saveConversationMetadata(id, metadata);
}

// Load a conversation from localStorage
export function loadConversation(id: string) {
  if (isServer()) return null;
  
  const userId = getCurrentUserId();
  const saved = localStorage.getItem(`${userId}-conversation-${id}`);
  return saved ? JSON.parse(saved) : null;
}

// Get list of all saved conversations
export function getConversationList(): string[] {
  if (isServer()) return [];

  const userId = getCurrentUserId();
  const saved = localStorage.getItem(`${userId}-conversations`);
  const list: string[] = saved ? JSON.parse(saved) : [];

  if (!Array.isArray(list)) {
    return [];
  }

  // Return a unique list of IDs
  return [...new Set(list)];
}

// Delete a conversation
export function deleteConversation(id: string) {
  if (isServer()) return [];
  
  const userId = getCurrentUserId();
  // Remove from list
  const savedConversations = getConversationList();
  localStorage.setItem(
    `${userId}-conversations`, 
    JSON.stringify(savedConversations.filter((cid: string) => cid !== id))
  );
  
  // Remove the conversation data
  localStorage.removeItem(`${userId}-conversation-${id}`);
  
  // Remove metadata
  localStorage.removeItem(`${userId}-conversation-meta-${id}`);
  
  return getConversationList();
}

// Interface for conversation metadata
export interface ConversationMetadata {
  id: string;
  title: string;
  created: string;
  updated: string;
}

// Save metadata for a conversation
export function saveConversationMetadata(id: string, metadata: ConversationMetadata) {
  if (isServer()) return;
  
  const userId = getCurrentUserId();
  localStorage.setItem(`${userId}-conversation-meta-${id}`, JSON.stringify(metadata));
}

// Get metadata for a conversation
export function getConversationMetadata(id: string): ConversationMetadata | null {
  if (isServer()) return null;
  
  const userId = getCurrentUserId();
  const saved = localStorage.getItem(`${userId}-conversation-meta-${id}`);
  return saved ? JSON.parse(saved) : null;
}

// Get all conversation metadata
export function getAllConversationsMetadata() {
  if (isServer()) return [];
  
  const conversations = getConversationList();
  const allMetadata = conversations
    .map((id: string) => getConversationMetadata(id))
    .filter((meta: ConversationMetadata | null): meta is ConversationMetadata => meta !== null)
    .sort((a: ConversationMetadata, b: ConversationMetadata) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

  return allMetadata;
}

// Clear all conversations
export function clearAllConversations() {
  if (isServer()) return [];
  
  const userId = getCurrentUserId();
  const conversations = getConversationList();
  
  // Remove each conversation
  conversations.forEach((id: string) => {
    localStorage.removeItem(`${userId}-conversation-${id}`);
    localStorage.removeItem(`${userId}-conversation-meta-${id}`);
  });
  
  // Clear the list
  localStorage.removeItem(`${userId}-conversations`);
  
  return [];
} 