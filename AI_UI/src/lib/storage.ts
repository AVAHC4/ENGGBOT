/**
 * Storage utilities for saving and loading conversations
 */

// Helper function to check if code is running on the server
function isServer(): boolean {
  return typeof window === 'undefined';
}

// Migrate conversations from an old (case-variant) email-based prefix to the normalized prefix
export function migrateUserNamespaceEmailCase(): boolean {
  if (isServer()) return false;
  try {
    // Compute new normalized prefix
    const newPrefix = getCurrentUserId();
    if (newPrefix === 'default') return false;

    // Derive a possible old (non-normalized) prefix from stored user email fields
    const userDataRaw = localStorage.getItem('user_data');
    let oldEmail: string | null = null;
    if (userDataRaw) {
      try {
        const parsed = JSON.parse(userDataRaw);
        if (parsed && parsed.email) oldEmail = String(parsed.email);
      } catch {}
    }
    if (!oldEmail) {
      const userEmail = localStorage.getItem('user_email');
      if (userEmail) oldEmail = String(userEmail);
    }
    if (!oldEmail) return false;

    const oldPrefix = btoa(encodeURIComponent(oldEmail)).replace(/[^a-z0-9]/gi, '_');
    if (oldPrefix === newPrefix) return false;

    const oldListRaw = localStorage.getItem(`${oldPrefix}-conversations`);
    if (!oldListRaw) return false;

    const oldList: string[] = JSON.parse(oldListRaw) || [];
    const existingNewList = new Set<string>(
      JSON.parse(localStorage.getItem(`${newPrefix}-conversations`) || '[]')
    );

    let changed = false;
    for (const id of oldList) {
      const oldConvKey = `${oldPrefix}-conversation-${id}`;
      const oldMetaKey = `${oldPrefix}-conversation-meta-${id}`;
      const newConvKey = `${newPrefix}-conversation-${id}`;
      const newMetaKey = `${newPrefix}-conversation-meta-${id}`;

      const payload = localStorage.getItem(oldConvKey);
      if (payload && !localStorage.getItem(newConvKey)) {
        localStorage.setItem(newConvKey, payload);
        changed = true;
      }

      const meta = localStorage.getItem(oldMetaKey);
      if (meta && !localStorage.getItem(newMetaKey)) {
        localStorage.setItem(newMetaKey, meta);
        changed = true;
      }

      if (payload || meta) existingNewList.add(id);
    }

    localStorage.setItem(`${newPrefix}-conversations`, JSON.stringify(Array.from(existingNewList)));

    const oldActive = localStorage.getItem(`${oldPrefix}-activeConversation`);
    const newActiveKey = `${newPrefix}-activeConversation`;
    if (oldActive && !localStorage.getItem(newActiveKey)) {
      localStorage.setItem(newActiveKey, oldActive);
      changed = true;
    }

    return changed;
  } catch (e) {
    console.error('Error migrating case-variant user namespace:', e);
    return false;
  }
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
      // Normalize email to avoid namespace drift due to case/whitespace
      const normalized = String(userData.email).trim().toLowerCase();
      return btoa(encodeURIComponent(normalized)).replace(/[^a-z0-9]/gi, '_');
    }
    
    // Fallback to the email stored directly
    const email = localStorage.getItem('user_email');
    if (email) {
      const normalized = String(email).trim().toLowerCase();
      return btoa(encodeURIComponent(normalized)).replace(/[^a-z0-9]/gi, '_');
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
export function getConversationList() {
  if (isServer()) return [];
  
  const userId = getCurrentUserId();
  const saved = localStorage.getItem(`${userId}-conversations`);
  return saved ? JSON.parse(saved) : [];
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
  return conversations.map((id: string) => ({
    id,
    ...getConversationMetadata(id)
  })).sort((a: any, b: any) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
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

// Migrate any conversations stored under the 'default' namespace into the current user's namespace
// Call this right after a user becomes authenticated and a non-default user prefix is available
export function migrateDefaultNamespaceToUser(): boolean {
  if (isServer()) return false;
  const userId = getCurrentUserId();
  if (userId === 'default') return false;

  let changed = false;
  try {
    const defaultListRaw = localStorage.getItem(`default-conversations`);
    const defaultList: string[] = defaultListRaw ? JSON.parse(defaultListRaw) : [];
    const existingUserList = new Set<string>(getConversationList());

    // Copy conversation payloads and metadata
    for (const id of defaultList) {
      const defaultConvKey = `default-conversation-${id}`;
      const defaultMetaKey = `default-conversation-meta-${id}`;
      const userConvKey = `${userId}-conversation-${id}`;
      const userMetaKey = `${userId}-conversation-meta-${id}`;

      const payload = localStorage.getItem(defaultConvKey);
      if (payload && !localStorage.getItem(userConvKey)) {
        localStorage.setItem(userConvKey, payload);
        changed = true;
      }

      const meta = localStorage.getItem(defaultMetaKey);
      if (meta && !localStorage.getItem(userMetaKey)) {
        localStorage.setItem(userMetaKey, meta);
        changed = true;
      }

      if (payload || meta) existingUserList.add(id);
    }

    // Merge and write the conversations list for the user
    localStorage.setItem(`${userId}-conversations`, JSON.stringify(Array.from(existingUserList)));

    // Copy active conversation pointer if the user doesn't have one
    const defaultActive = localStorage.getItem(`default-activeConversation`);
    const userActiveKey = `${userId}-activeConversation`;
    if (defaultActive && !localStorage.getItem(userActiveKey)) {
      localStorage.setItem(userActiveKey, defaultActive);
      changed = true;
    }

    return changed;
  } catch (e) {
    console.error('Error migrating default conversations:', e);
    return changed;
  }
}