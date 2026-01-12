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
      // Always lowercase for consistent matching with Supabase
      return userData.email.toLowerCase();
    }

    const email = localStorage.getItem('user_email');
    if (email) {
      // Always lowercase for consistent matching with Supabase
      return email.toLowerCase();
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

// Helper to dispatch conversation update event (for event-driven UI updates)
function dispatchConversationUpdated() {
  if (!isServer()) {
    window.dispatchEvent(new CustomEvent('conversationUpdated'));
  }
}

// Generate a meaningful title from the first user message
function generateTitleFromMessage(messages: any[]): string {
  // Find the first user message
  const firstUserMessage = messages.find(m => m.isUser);

  if (!firstUserMessage || !firstUserMessage.content) {
    return 'New Conversation';
  }

  let content = firstUserMessage.content.trim();

  // Remove any system context that might have been appended
  const markers = ['\n\n[WEB SEARCH RESULTS', '\n\n[FILES CONTEXT]'];
  for (const marker of markers) {
    const idx = content.indexOf(marker);
    if (idx >= 0) {
      content = content.substring(0, idx).trim();
    }
  }

  // Clean up the content - remove newlines and extra whitespace
  content = content.replace(/\s+/g, ' ').trim();

  // Prefer the first sentence to keep titles concise
  const sentenceBoundary = content.search(/[.!?]/);
  if (sentenceBoundary > 0) {
    content = content.substring(0, sentenceBoundary);
  }

  // Limit to a handful of words so sidebar titles stay readable
  const words = content.split(' ').filter(Boolean);
  const maxWords = 8;
  let truncated = words.slice(0, maxWords).join(' ');
  if (words.length > maxWords) {
    truncated = `${truncated}...`;
  }

  // Strip leading/trailing punctuation
  truncated = truncated.replace(/^[^a-zA-Z0-9]+/, '').replace(/[:;,.!?]+$/, '');

  if (!truncated) return 'New Conversation';

  // Simple title casing for a cleaner look
  const title = truncated
    .split(' ')
    .map((word: string) => word ? word[0].toUpperCase() + word.slice(1) : '')
    .join(' ')
    .trim();

  // Truncate very long strings defensively
  if (title.length > 60) {
    return `${title.substring(0, 57)}...`;
  }

  return title || 'New Conversation';
}

// Cache of conversations we know exist (to avoid constant GET checks)
const knownConversations = new Set<string>();
// Track conversations that have already been auto-titled to avoid repeated updates
const autoTitledConversations = new Set<string>();

// Detect placeholder titles that should be replaced
function isPlaceholderTitle(title?: string | null): boolean {
  if (!title) return true;
  const normalized = title.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === 'new conversation' || normalized === 'untitled conversation') return true;
  return /^conversation\s+[0-9a-f]{4,}$/i.test(title.trim());
}

// Save conversation to database
async function saveConversationToDatabase(id: string, messages: any[], title?: string, projectId?: string | null): Promise<boolean> {
  const email = getUserEmail();
  if (!email) {
    console.warn('[DB Save] No email found, skipping database save');
    return false;
  }

  try {
    // Only check if conversation exists if we haven't verified it before
    if (!knownConversations.has(id)) {
      let generatedTitle: string | undefined = title;
      const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);

      // Check if conversation exists - API returns 200 with { exists: false } for non-existent
      let conversationExists = false;
      if (response.ok) {
        const data = await response.json();
        conversationExists = data.exists !== false && data.conversation !== undefined;
      }

      if (!conversationExists) {
        // Conversation doesn't exist, create it with the same ID
        // Generate title from first user message instead of using generic ID
        generatedTitle = title || generateTitleFromMessage(messages);
        console.log('[DB Save] Creating new conversation:', id.substring(0, 8), 'with title:', generatedTitle, 'projectId:', projectId);
        const createResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id, // Pass the ID to ensure consistency
            email,
            title: generatedTitle,
            projectId: projectId || null, // Pass projectId when creating
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('[DB Save] Failed to create conversation:', createResponse.status, errorText);
          return false;
        }

        // Dispatch event to update sidebar for new conversation
        dispatchConversationUpdated();
      }
      // Mark as known to avoid future checks
      knownConversations.add(id);
      if (generatedTitle && generatedTitle !== 'New Conversation') {
        autoTitledConversations.add(id);
      }
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

    // Auto-update title based on the first user message once we have one
    if (messages.some(m => m.isUser) && !autoTitledConversations.has(id)) {
      // Mark as in-progress to avoid concurrent duplicate calls
      autoTitledConversations.add(id);
      const candidateTitle = generateTitleFromMessage(messages);

      // Skip if we still don't have a meaningful title
      if (candidateTitle && candidateTitle !== 'New Conversation') {
        // Verify the existing title before overwriting user edits
        (async () => {
          try {
            const metaRes = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);
            let currentTitle: string | null | undefined = undefined;

            if (metaRes.ok) {
              const data = await metaRes.json();
              currentTitle = data?.conversation?.title || data?.title;
            }

            // If the user already named it, do nothing
            if (metaRes.ok && !isPlaceholderTitle(currentTitle)) {
              return;
            }

            const updateResponse = await fetch(`/api/conversations/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, title: candidateTitle }),
            });

            if (updateResponse.ok) {
              dispatchConversationUpdated();
            } else {
              // Allow retry if the update fails
              autoTitledConversations.delete(id);
            }
          } catch (error) {
            console.error('[DB Save] Failed to auto-title conversation:', error);
            // Allow a retry on the next save attempt
            autoTitledConversations.delete(id);
          }
        })();
      } else {
        // Allow retry when there is still no usable title
        autoTitledConversations.delete(id);
      }
    }

    return true;
  } catch (error) {
    console.error('[DB Save] Error saving conversation to database:', error);
    return false;
  }
}

// Special marker to indicate conversation was not found (404)
const CONVERSATION_NOT_FOUND = Symbol('CONVERSATION_NOT_FOUND');

// Load conversation from database
// Returns messages array, empty array on error, or CONVERSATION_NOT_FOUND on 404
async function loadConversationFromDatabase(id: string): Promise<any[] | typeof CONVERSATION_NOT_FOUND> {
  const email = getUserEmail();
  console.log('[DB Load] Loading conversation:', id.substring(0, 8), 'email:', email ? email.substring(0, 5) + '...' : 'null');

  if (!email) {
    console.warn('[DB Load] No email found, cannot load from database');
    return [];
  }

  try {
    const url = `/api/conversations/${id}?email=${encodeURIComponent(email)}`;
    console.log('[DB Load] Fetching from:', url.substring(0, 50) + '...');
    const response = await fetch(url);

    if (!response.ok) {
      // Network error or server error, return empty array
      console.error('[DB Load] Response not ok:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('[DB Load] Response data:', { exists: data.exists, messageCount: data.messages?.length || 0 });

    // Check if conversation doesn't exist (API returns 200 with exists: false)
    if (data.exists === false) {
      return CONVERSATION_NOT_FOUND;
    }

    return data.messages || [];
  } catch (error) {
    // Silently handle errors - no console.error to keep production console clean
    console.error('[DB Load] Error:', error);
    return [];
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



// Debounce map to prevent excessive saves
const saveDebounceMap = new Map<string, NodeJS.Timeout>();

// ==================== LocalStorage Cache Functions ====================

// Generate a unique cache key for a conversation (prevents mixing)
function getConversationCacheKey(conversationId: string): string {
  const userPrefix = getUserPrefix();
  return `${userPrefix}_msg_cache_${conversationId}`;
}

// Save messages to localStorage cache (instant)
function saveToCache(conversationId: string, messages: any[]): void {
  if (isServer()) return;

  try {
    const cacheKey = getConversationCacheKey(conversationId);
    const cacheData = {
      conversationId, // Store the ID for validation
      messages,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('[Cache] Saved to localStorage:', conversationId.substring(0, 8), messages.length, 'messages');
  } catch (error) {
    console.warn('[Cache] Failed to save to localStorage:', error);
  }
}

// Load messages from localStorage cache (instant)
function loadFromCache(conversationId: string): any[] | null {
  if (isServer()) return null;

  try {
    const cacheKey = getConversationCacheKey(conversationId);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const cacheData = JSON.parse(cached);

    // CRITICAL: Validate that cached data belongs to this conversation
    if (cacheData.conversationId !== conversationId) {
      console.warn('[Cache] Cache key mismatch, ignoring stale cache');
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log('[Cache] Loaded from localStorage:', conversationId.substring(0, 8), cacheData.messages?.length || 0, 'messages');
    return cacheData.messages || [];
  } catch (error) {
    console.warn('[Cache] Failed to load from localStorage:', error);
    return null;
  }
}

// Clear cache for a specific conversation
function clearCache(conversationId: string): void {
  if (isServer()) return;

  try {
    const cacheKey = getConversationCacheKey(conversationId);
    localStorage.removeItem(cacheKey);
    console.log('[Cache] Cleared cache for:', conversationId.substring(0, 8));
  } catch (error) {
    console.warn('[Cache] Failed to clear cache:', error);
  }
}

// ==================== Hybrid Public API ====================

// Save a conversation (hybrid: localStorage immediately + database with debounce)
// For NEW conversations (not in knownConversations), create immediately to avoid race conditions
export function saveConversation(id: string, messages: any[], projectId?: string | null) {
  if (isServer()) return;

  console.log('[Storage] saveConversation called:', id.substring(0, 8), 'messages:', messages.length, 'projectId:', projectId);

  // Step 1: Save to localStorage IMMEDIATELY (for instant reload)
  saveToCache(id, messages);

  // Step 2: If this is a NEW conversation, create it IMMEDIATELY (no debounce)
  // This ensures the conversation exists in the database before user navigates away
  if (!knownConversations.has(id)) {
    // Create immediately - don't debounce new conversations
    saveConversationToDatabase(id, messages, undefined, projectId)
      .then((success) => {
        if (success) {
          console.log('[Storage] Created new conversation in database:', id.substring(0, 8), 'projectId:', projectId);
        }
      })
      .catch(err => {
        console.error('Database creation failed:', err);
      });
    return; // Don't also add to debounce queue
  }

  // Step 3: For EXISTING conversations, debounce updates (500ms after last change)
  const existingTimer = saveDebounceMap.get(id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    saveDebounceMap.delete(id);

    // Save to database in background, including projectId
    saveConversationToDatabase(id, messages, undefined, projectId)
      .then((success) => {
        if (success) {
          console.log('[Storage] Synced to database:', id.substring(0, 8));
        }
      })
      .catch(err => {
        console.error('Database save failed:', err);
      });
  }, 500);

  saveDebounceMap.set(id, timer);
}

// Load a conversation (hybrid: localStorage first, then sync with database)
export async function loadConversation(id: string): Promise<any[]> {
  if (isServer()) return [];

  // Step 1: Try to load from localStorage cache FIRST (instant)
  const cachedMessages = loadFromCache(id);

  if (cachedMessages && cachedMessages.length > 0) {
    // Return cached data immediately, but also sync with database in background
    console.log('[Storage] Using cached messages for:', id.substring(0, 8), cachedMessages.length, 'messages');

    // Background sync: fetch from database and update cache if different
    loadConversationFromDatabase(id).then((dbMessages) => {
      // Check if conversation was deleted from database (404)
      if (dbMessages === CONVERSATION_NOT_FOUND) {
        // Clear stale cache - conversation no longer exists in DB
        console.log('[Storage] Conversation not found in DB, clearing stale cache:', id.substring(0, 8));
        clearCache(id);
        knownConversations.delete(id);
        dispatchConversationUpdated();
        return;
      }

      if (dbMessages && dbMessages.length > 0) {
        // Check if database has different/newer data
        const cacheStr = JSON.stringify(cachedMessages.map(m => m.id).sort());
        const dbStr = JSON.stringify(dbMessages.map((m: any) => m.id).sort());

        if (cacheStr !== dbStr) {
          console.log('[Storage] Database has different data, updating cache');
          saveToCache(id, dbMessages);
          dispatchConversationUpdated();
        }
      }
    }).catch(() => {
      // Silently handle background sync errors
    });

    return cachedMessages;
  }

  // Step 2: No cache, load from database
  console.log('[Storage] No cache, loading from database:', id.substring(0, 8));
  const dbMessages = await loadConversationFromDatabase(id);
  console.log('[Storage] DB returned:', dbMessages === CONVERSATION_NOT_FOUND ? 'NOT_FOUND' : (Array.isArray(dbMessages) ? dbMessages.length + ' messages' : 'error'));

  // Handle 404 - conversation doesn't exist
  if (dbMessages === CONVERSATION_NOT_FOUND) {
    return [];
  }

  // Step 3: Save to cache for next time
  if (dbMessages && dbMessages.length > 0) {
    saveToCache(id, dbMessages);
  }

  return dbMessages;
}

// Get list of all saved conversations (database only)
export async function getConversationList(): Promise<string[]> {
  if (isServer()) return [];

  // Load from database only
  const dbConversations = await loadConversationsFromDatabase();
  return dbConversations.map((c: any) => c.id);
}

// Delete a conversation (hybrid: clear cache + delete from database)
export async function deleteConversation(id: string): Promise<string[]> {
  if (isServer()) return [];

  // Clear from localStorage cache
  clearCache(id);

  // Delete from database
  await deleteConversationFromDatabase(id);

  // Dispatch event to refresh sidebar
  dispatchConversationUpdated();

  // Return updated conversation list
  const conversations = await loadConversationsFromDatabase();
  return conversations.map((c: any) => c.id);
}

// Clear all messages from a conversation (but keep the conversation)
export async function clearConversationMessages(id: string): Promise<boolean> {
  if (isServer()) return false;

  // Clear from localStorage cache first
  clearCache(id);

  const email = getUserEmail();
  console.log('[Storage] clearConversationMessages called:', { id: id.substring(0, 8), email });

  if (!email) {
    console.log('[Storage] No email found, skipping clear');
    return false;
  }

  try {
    const url = `/api/conversations/${id}/messages?email=${encodeURIComponent(email)}`;
    console.log('[Storage] Sending DELETE request to:', url);

    const response = await fetch(url, {
      method: 'DELETE',
    });

    console.log('[Storage] DELETE response:', response.status, response.ok);

    if (!response.ok) {
      const text = await response.text();
      console.error('[Storage] DELETE failed:', text);
    }

    return response.ok;
  } catch (error) {
    console.error('[Storage] Error clearing conversation messages:', error);
    return false;
  }
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

// ==================== Projects API Functions ====================

// Dispatch project update event (for event-driven UI updates)
function dispatchProjectUpdated() {
  if (!isServer()) {
    window.dispatchEvent(new CustomEvent('projectUpdated'));
  }
}

// Cache for project conversations
const knownProjectConversations = new Set<string>();
const autoTitledProjectConversations = new Set<string>();

// Load all projects for the user
export async function loadProjects(): Promise<any[]> {
  if (isServer()) return [];

  const email = getUserEmail();
  if (!email) return [];

  try {
    const response = await fetch(`/api/projects?email=${encodeURIComponent(email)}`);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.projects || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

// Create a new project
export async function createProject(name: string, description?: string): Promise<any | null> {
  if (isServer()) return null;

  const email = getUserEmail();
  if (!email) return null;

  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, description }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    dispatchProjectUpdated();
    return data.project;
  } catch (error) {
    console.error('Error creating project:', error);
    return null;
  }
}

// Delete a project
export async function deleteProject(projectId: string): Promise<boolean> {
  if (isServer()) return false;

  const email = getUserEmail();
  if (!email) return false;

  try {
    const response = await fetch(`/api/projects/${projectId}?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      dispatchProjectUpdated();
    }

    return response.ok;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

// Rename a project
export async function renameProject(projectId: string, newName: string): Promise<boolean> {
  if (isServer()) return false;

  const email = getUserEmail();
  if (!email) return false;

  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: newName }),
    });

    if (response.ok) {
      dispatchProjectUpdated();
    }

    return response.ok;
  } catch (error) {
    console.error('Error renaming project:', error);
    return false;
  }
}

// Load conversations for a project
export async function loadProjectConversations(projectId: string): Promise<any[]> {
  if (isServer()) return [];

  const email = getUserEmail();
  if (!email) return [];

  try {
    const response = await fetch(`/api/projects/${projectId}/conversations?email=${encodeURIComponent(email)}`);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.conversations || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      created: c.created_at,
      updated: c.updated_at,
    }));
  } catch (error) {
    console.error('Error loading project conversations:', error);
    return [];
  }
}

// Create a conversation in a project
export async function createProjectConversation(projectId: string, title?: string): Promise<any | null> {
  if (isServer()) return null;

  const email = getUserEmail();
  if (!email) return null;

  try {
    const response = await fetch(`/api/projects/${projectId}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, title: title || 'New Conversation' }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    dispatchProjectUpdated();
    return data.conversation;
  } catch (error) {
    console.error('Error creating project conversation:', error);
    return null;
  }
}

// Load a project conversation with messages
export async function loadProjectConversation(projectId: string, conversationId: string): Promise<any[]> {
  if (isServer()) return [];

  const email = getUserEmail();
  if (!email) return [];

  try {
    const response = await fetch(
      `/api/projects/${projectId}/conversations/${conversationId}?email=${encodeURIComponent(email)}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (data.exists === false) return [];

    return data.messages || [];
  } catch (error) {
    console.error('Error loading project conversation:', error);
    return [];
  }
}

// Save messages to a project conversation
export async function saveProjectConversation(projectId: string, conversationId: string, messages: any[]): Promise<boolean> {
  if (isServer()) return false;

  const email = getUserEmail();
  if (!email) return false;

  try {
    // Check if conversation exists, create if not
    if (!knownProjectConversations.has(conversationId)) {
      const checkResponse = await fetch(
        `/api/projects/${projectId}/conversations/${conversationId}?email=${encodeURIComponent(email)}`
      );

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        if (data.exists === false) {
          // Generate title from first user message
          const generatedTitle = generateTitleFromMessage(messages);
          // Create the conversation
          const createResponse = await fetch(`/api/projects/${projectId}/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, id: conversationId, title: generatedTitle }),
          });

          if (!createResponse.ok) return false;
          dispatchProjectUpdated();

          if (generatedTitle && generatedTitle !== 'New Conversation') {
            autoTitledProjectConversations.add(conversationId);
          }
        }
      }
      knownProjectConversations.add(conversationId);
    }

    // Save messages
    const response = await fetch(`/api/projects/${projectId}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, messages }),
    });

    if (!response.ok) return false;

    // Auto-update title based on the first user message once we have one
    if (messages.some(m => m.isUser) && !autoTitledProjectConversations.has(conversationId)) {
      autoTitledProjectConversations.add(conversationId);
      const candidateTitle = generateTitleFromMessage(messages);

      if (candidateTitle && candidateTitle !== 'New Conversation') {
        // Update the conversation title
        (async () => {
          try {
            const metaRes = await fetch(
              `/api/projects/${projectId}/conversations/${conversationId}?email=${encodeURIComponent(email)}`
            );
            let currentTitle: string | null | undefined = undefined;

            if (metaRes.ok) {
              const data = await metaRes.json();
              currentTitle = data?.conversation?.title || data?.title;
            }

            // Only update if still a placeholder title
            if (metaRes.ok && !isPlaceholderTitle(currentTitle)) {
              return;
            }

            const updateResponse = await fetch(
              `/api/projects/${projectId}/conversations/${conversationId}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, title: candidateTitle }),
              }
            );

            if (updateResponse.ok) {
              dispatchProjectUpdated();
            } else {
              autoTitledProjectConversations.delete(conversationId);
            }
          } catch (error) {
            console.error('[DB Save] Failed to auto-title project conversation:', error);
            autoTitledProjectConversations.delete(conversationId);
          }
        })();
      } else {
        autoTitledProjectConversations.delete(conversationId);
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving project conversation:', error);
    return false;
  }
}

// Delete a project conversation
export async function deleteProjectConversation(projectId: string, conversationId: string): Promise<boolean> {
  if (isServer()) return false;

  const email = getUserEmail();
  if (!email) return false;

  try {
    const response = await fetch(
      `/api/projects/${projectId}/conversations/${conversationId}?email=${encodeURIComponent(email)}`,
      { method: 'DELETE' }
    );

    if (response.ok) {
      knownProjectConversations.delete(conversationId);
      dispatchProjectUpdated();
    }

    return response.ok;
  } catch (error) {
    console.error('Error deleting project conversation:', error);
    return false;
  }
}
