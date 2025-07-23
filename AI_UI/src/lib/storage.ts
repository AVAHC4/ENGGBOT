/**
 * Storage utilities for saving and loading conversations
 * Now uses Supabase backend instead of localStorage
 */

// Helper function to check if code is running on the server
function isServer(): boolean {
  return typeof window === 'undefined';
}

// Helper to get user email for API calls
export function getUserEmail(): string {
  if (isServer()) {
    return '';
  }
  
  try {
    // Get user email from localStorage
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (userData && userData.email) {
      return userData.email;
    }
    
    // Fallback to the email stored directly
    const email = localStorage.getItem('user_email');
    if (email) {
      return email;
    }
    
    return '';
  } catch (error) {
    console.error('Error getting user email:', error);
    return '';
  }
}

// Helper to get user email prefix consistently (for backward compatibility)
export function getUserPrefix(): string {
  const email = getUserEmail();
  if (!email) return 'default';
  
  try {
    return btoa(encodeURIComponent(email)).replace(/[^a-z0-9]/gi, '_');
  } catch (error) {
    console.error('Error getting user prefix:', error);
    return 'default';
  }
}

// Helper to make API calls with user email header
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const userEmail = getUserEmail();
  
  return fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': userEmail,
      ...options.headers,
    },
  });
}

// Save a conversation to Supabase
export async function saveConversation(id: string, messages: any[]) {
  if (isServer()) return;
  
  try {
    // First, ensure the conversation exists
    let title = `Conversation ${id.substring(0, 6)}`;
    
    // Update title based on first message if messages exist
    if (messages.length > 0) {
      const firstUserMessage = messages.find(m => m.isUser)?.content;
      if (firstUserMessage) {
        title = firstUserMessage.substring(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
      }
    }
    
    // Create or update conversation
    const response = await apiCall('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ conversationId: id, title })
    });
    
    if (!response.ok) {
      console.error('Failed to save conversation metadata');
      return;
    }
    
    // Save each message
    for (const message of messages) {
      await apiCall(`/api/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          role: message.isUser ? 'user' : 'assistant',
          content: message.content,
          metadata: {
            id: message.id,
            timestamp: message.timestamp,
            attachments: message.attachments,
            replyToId: message.replyToId,
            isStreaming: message.isStreaming
          }
        })
      });
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

// Load a conversation from Supabase
export async function loadConversation(id: string) {
  if (isServer()) return null;
  
  try {
    const response = await apiCall(`/api/conversations/${id}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Convert messages back to the expected format
    return data.messages.map((msg: any) => ({
      id: msg.metadata?.id || msg.id,
      content: msg.content,
      isUser: msg.role === 'user',
      timestamp: msg.metadata?.timestamp || msg.created_at,
      attachments: msg.metadata?.attachments,
      replyToId: msg.metadata?.replyToId,
      isStreaming: msg.metadata?.isStreaming
    }));
  } catch (error) {
    console.error('Error loading conversation:', error);
    return null;
  }
}

// Get list of all saved conversations from Supabase
export async function getConversationList() {
  if (isServer()) return [];
  
  try {
    const response = await apiCall('/api/conversations');
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.conversations.map((conv: any) => conv.id);
  } catch (error) {
    console.error('Error getting conversation list:', error);
    return [];
  }
}

// Delete a conversation from Supabase
export async function deleteConversation(id: string) {
  if (isServer()) return [];
  
  try {
    const response = await apiCall(`/api/conversations/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      console.error('Failed to delete conversation');
    }
    
    return await getConversationList();
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return [];
  }
}

// Interface for conversation metadata
export interface ConversationMetadata {
  title: string;
  created: string;
  updated: string;
}

// Save metadata for a conversation in Supabase
export async function saveConversationMetadata(id: string, metadata: ConversationMetadata) {
  if (isServer()) return;
  
  try {
    await apiCall(`/api/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: metadata.title })
    });
  } catch (error) {
    console.error('Error saving conversation metadata:', error);
  }
}

// Get metadata for a conversation from Supabase
export async function getConversationMetadata(id: string): Promise<ConversationMetadata | null> {
  if (isServer()) return null;
  
  try {
    const response = await apiCall(`/api/conversations/${id}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return {
      title: data.conversation.title,
      created: data.conversation.created_at,
      updated: data.conversation.updated_at
    };
  } catch (error) {
    console.error('Error getting conversation metadata:', error);
    return null;
  }
}

// Get all conversation metadata from Supabase
export async function getAllConversationsMetadata() {
  if (isServer()) return [];
  
  try {
    const response = await apiCall('/api/conversations');
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.conversations.map((conv: any) => ({
      id: conv.id,
      title: conv.title,
      created: conv.created_at,
      updated: conv.updated_at
    }));
  } catch (error) {
    console.error('Error getting all conversations metadata:', error);
    return [];
  }
}

// Clear all conversations from Supabase
export async function clearAllConversations() {
  if (isServer()) return [];
  
  try {
    const conversations = await getConversationList();
    
    // Delete each conversation
    for (const id of conversations) {
      await deleteConversation(id);
    }
    
    return [];
  } catch (error) {
    console.error('Error clearing all conversations:', error);
    return [];
  }
} 