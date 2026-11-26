


function isServer(): boolean {
  return typeof window === 'undefined';
}


export function getUserEmail(): string | null {
  if (isServer()) return null;

  try {
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (userData && userData.email) {

      return userData.email.toLowerCase();
    }

    const email = localStorage.getItem('user_email');
    if (email) {

      return email.toLowerCase();
    }

    return null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
}



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





function dispatchConversationUpdated() {
  if (!isServer()) {
    window.dispatchEvent(new CustomEvent('conversationUpdated'));
  }
}


function generateTitleFromMessage(messages: any[]): string {

  const firstUserMessage = messages.find(m => m.isUser);

  if (!firstUserMessage || !firstUserMessage.content) {
    return 'New Conversation';
  }

  let content = firstUserMessage.content.trim();


  const markers = ['\n\n[WEB SEARCH RESULTS', '\n\n[FILES CONTEXT]'];
  for (const marker of markers) {
    const idx = content.indexOf(marker);
    if (idx >= 0) {
      content = content.substring(0, idx).trim();
    }
  }


  content = content.replace(/\s+/g, ' ').trim();


  const sentenceBoundary = content.search(/[.!?]/);
  if (sentenceBoundary > 0) {
    content = content.substring(0, sentenceBoundary);
  }


  const words = content.split(' ').filter(Boolean);
  const maxWords = 8;
  let truncated = words.slice(0, maxWords).join(' ');
  if (words.length > maxWords) {
    truncated = `${truncated}...`;
  }


  truncated = truncated.replace(/^[^a-zA-Z0-9]+/, '').replace(/[:;,.!?]+$/, '');

  if (!truncated) return 'New Conversation';


  const title = truncated
    .split(' ')
    .map((word: string) => word ? word[0].toUpperCase() + word.slice(1) : '')
    .join(' ')
    .trim();


  if (title.length > 60) {
    return `${title.substring(0, 57)}...`;
  }

  return title || 'New Conversation';
}


const knownConversations = new Set<string>();

const autoTitledConversations = new Set<string>();


function isPlaceholderTitle(title?: string | null): boolean {
  if (!title) return true;
  const normalized = title.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === 'new conversation' || normalized === 'untitled conversation') return true;
  return /^conversation\s+[0-9a-f]{4,}$/i.test(title.trim());
}


async function saveConversationToDatabase(id: string, messages: any[], title?: string, projectId?: string | null): Promise<boolean> {
  const email = getUserEmail();
  if (!email) {
    console.warn('[DB Save] No email found, skipping database save');
    return false;
  }

  try {

    if (!knownConversations.has(id)) {
      let generatedTitle: string | undefined = title;
      const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);


      let conversationExists = false;
      if (response.ok) {
        const data = await response.json();
        conversationExists = data.exists !== false && data.conversation !== undefined;
      }

      if (!conversationExists) {


        generatedTitle = title || generateTitleFromMessage(messages);
        console.log('[DB Save] Creating new conversation:', id.substring(0, 8), 'with title:', generatedTitle, 'projectId:', projectId);
        const createResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            email,
            title: generatedTitle,
            projectId: projectId || null,
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('[DB Save] Failed to create conversation:', createResponse.status, errorText);
          return false;
        }


        dispatchConversationUpdated();
      }

      knownConversations.add(id);
      if (generatedTitle && generatedTitle !== 'New Conversation') {
        autoTitledConversations.add(id);
      }
    }


    const messagesResponse = await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, messages }),
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('[DB Save] Failed to save messages:', messagesResponse.status, errorText);

      if (messagesResponse.status === 404) {
        knownConversations.delete(id);
      }
      return false;
    }


    if (messages.some(m => m.isUser) && !autoTitledConversations.has(id)) {

      autoTitledConversations.add(id);
      const candidateTitle = generateTitleFromMessage(messages);


      if (candidateTitle && candidateTitle !== 'New Conversation') {

        (async () => {
          try {
            const metaRes = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);
            let currentTitle: string | null | undefined = undefined;

            if (metaRes.ok) {
              const data = await metaRes.json();
              currentTitle = data?.conversation?.title || data?.title;
            }


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

              autoTitledConversations.delete(id);
            }
          } catch (error) {
            console.error('[DB Save] Failed to auto-title conversation:', error);

            autoTitledConversations.delete(id);
          }
        })();
      } else {

        autoTitledConversations.delete(id);
      }
    }

    return true;
  } catch (error) {
    console.error('[DB Save] Error saving conversation to database:', error);
    return false;
  }
}


const CONVERSATION_NOT_FOUND = Symbol('CONVERSATION_NOT_FOUND');



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

      console.error('[DB Load] Response not ok:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('[DB Load] Response data:', { exists: data.exists, messageCount: data.messages?.length || 0 });


    if (data.exists === false) {
      return CONVERSATION_NOT_FOUND;
    }

    return data.messages || [];
  } catch (error) {

    console.error('[DB Load] Error:', error);
    return [];
  }
}


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




export interface ConversationMetadata {
  title: string;
  created: string;
  updated: string;
  pinned?: boolean;
}




const saveDebounceMap = new Map<string, NodeJS.Timeout>();




function getConversationCacheKey(conversationId: string): string {
  const userPrefix = getUserPrefix();
  return `${userPrefix}_msg_cache_${conversationId}`;
}


function saveToCache(conversationId: string, messages: any[]): void {
  if (isServer()) return;

  try {
    const cacheKey = getConversationCacheKey(conversationId);
    const cacheData = {
      conversationId,
      messages,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('[Cache] Saved to localStorage:', conversationId.substring(0, 8), messages.length, 'messages');
  } catch (error) {
    console.warn('[Cache] Failed to save to localStorage:', error);
  }
}


function loadFromCache(conversationId: string): any[] | null {
  if (isServer()) return null;

  try {
    const cacheKey = getConversationCacheKey(conversationId);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const cacheData = JSON.parse(cached);


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





export function saveConversation(id: string, messages: any[], projectId?: string | null) {
  if (isServer()) return;

  console.log('[Storage] saveConversation called:', id.substring(0, 8), 'messages:', messages.length, 'projectId:', projectId);


  saveToCache(id, messages);



  if (!knownConversations.has(id)) {

    saveConversationToDatabase(id, messages, undefined, projectId)
      .then((success) => {
        if (success) {
          console.log('[Storage] Created new conversation in database:', id.substring(0, 8), 'projectId:', projectId);
        }
      })
      .catch(err => {
        console.error('Database creation failed:', err);
      });
    return;
  }


  const existingTimer = saveDebounceMap.get(id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    saveDebounceMap.delete(id);


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


export async function loadConversation(id: string): Promise<any[]> {
  if (isServer()) return [];


  const cachedMessages = loadFromCache(id);

  if (cachedMessages && cachedMessages.length > 0) {

    console.log('[Storage] Using cached messages for:', id.substring(0, 8), cachedMessages.length, 'messages');


    loadConversationFromDatabase(id).then((dbMessages) => {

      if (dbMessages === CONVERSATION_NOT_FOUND) {


        if (cachedMessages && cachedMessages.length > 0) {
          console.log('[Storage] Conversation not found in DB but exists locally. Restoring to server:', id.substring(0, 8));

          saveConversation(id, cachedMessages);
          return;
        }



        console.log('[Storage] Conversation not found in DB, clearing stale cache:', id.substring(0, 8));
        clearCache(id);
        knownConversations.delete(id);
        dispatchConversationUpdated();
        return;
      }

      if (dbMessages && dbMessages.length > 0) {

        const cacheStr = JSON.stringify(cachedMessages.map(m => m.id).sort());
        const dbStr = JSON.stringify(dbMessages.map((m: any) => m.id).sort());

        if (cacheStr !== dbStr) {
          console.log('[Storage] Database has different data, updating cache');
          saveToCache(id, dbMessages);
          dispatchConversationUpdated();
        }
      }
    }).catch(() => {

    });

    return cachedMessages;
  }


  console.log('[Storage] No cache, loading from database:', id.substring(0, 8));
  const dbMessages = await loadConversationFromDatabase(id);
  console.log('[Storage] DB returned:', dbMessages === CONVERSATION_NOT_FOUND ? 'NOT_FOUND' : (Array.isArray(dbMessages) ? dbMessages.length + ' messages' : 'error'));


  if (dbMessages === CONVERSATION_NOT_FOUND) {
    return [];
  }


  if (dbMessages && dbMessages.length > 0) {
    saveToCache(id, dbMessages);
  }

  return dbMessages;
}


export async function getConversationList(): Promise<string[]> {
  if (isServer()) return [];


  const dbConversations = await loadConversationsFromDatabase();
  return dbConversations.map((c: any) => c.id);
}


export async function deleteConversation(id: string): Promise<string[]> {
  if (isServer()) return [];


  clearCache(id);


  await deleteConversationFromDatabase(id);


  dispatchConversationUpdated();


  const conversations = await loadConversationsFromDatabase();
  return conversations.map((c: any) => c.id);
}


export async function clearConversationMessages(id: string): Promise<boolean> {
  if (isServer()) return false;


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


export function saveConversationMetadata(id: string, metadata: ConversationMetadata) {
  if (isServer()) return;

  const email = getUserEmail();
  if (email) {
    fetch(`/api/conversations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, title: metadata.title, pinned: metadata.pinned }),
    }).catch(err => console.log('Failed to update conversation metadata in database:', err));
  }
}


export async function getConversationMetadata(id: string): Promise<ConversationMetadata | null> {
  if (isServer()) return null;

  const email = getUserEmail();
  if (!email) return null;

  try {
    const response = await fetch(`/api/conversations/${id}?email=${encodeURIComponent(email)}`);
    if (!response.ok) return null;

    const data = await response.json();
    const conversation = data.conversation ?? data;
    return {
      title: conversation.title,
      created: conversation.created_at ?? conversation.createdAt,
      updated: conversation.updated_at ?? conversation.updatedAt,
      pinned: conversation.pinned ?? false,
    };
  } catch (error) {
    console.error('Error getting conversation metadata:', error);
    return null;
  }
}


export async function getAllConversationsMetadata(): Promise<any[]> {
  if (isServer()) return [];


  const dbConversations = await loadConversationsFromDatabase();
  return dbConversations.map((c: any) => ({
    id: c.id,
    title: c.title,
    created: c.created_at || c.createdAt,
    updated: c.updated_at || c.updatedAt,
    pinned: c.pinned ?? false,
  })).sort((a: any, b: any) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
  });
}


export async function getAllConversationsMetadataSync() {
  return await getAllConversationsMetadata();
}


export async function clearAllConversations() {
  if (isServer()) return [];

  const email = getUserEmail();
  if (!email) return [];

  try {

    const conversations = await loadConversationsFromDatabase();


    await Promise.all(
      conversations.map((c: any) => deleteConversationFromDatabase(c.id))
    );

    return [];
  } catch (error) {
    console.error('Error clearing conversations:', error);
    return [];
  }
}




function dispatchProjectUpdated() {
  if (!isServer()) {
    window.dispatchEvent(new CustomEvent('projectUpdated'));
  }
}


const knownProjectConversations = new Set<string>();
const autoTitledProjectConversations = new Set<string>();

const projectListMemoryCache = new Map<string, { projects: any[]; conversationsByProject?: Record<string, any[]> }>();
const projectConversationsMemoryCache = new Map<string, any[]>();
const projectDetailMemoryCache = new Map<string, { project: any; conversations: any[] }>();
const projectMessageMemoryCache = new Map<string, any[]>();
const projectConversationInFlight = new Map<string, Promise<any[] | null>>();


function getProjectsCacheKey(): string {
  return `${getUserPrefix()}_projects_cache`;
}

function getProjectConversationsCacheKey(projectId: string): string {
  return `${getUserPrefix()}_project_convos_${projectId}`;
}

function getProjectDetailCacheKey(projectId: string): string {
  return `${getUserPrefix()}_project_detail_${projectId}`;
}

function getProjectMessageCacheKey(projectId: string, conversationId: string): string {
  return `${getUserPrefix()}_project_msg_cache_${projectId}_${conversationId}`;
}

function getScopedProjectKey(projectId: string, conversationId?: string): string {
  const prefix = getUserPrefix();
  return conversationId ? `${prefix}:${projectId}:${conversationId}` : `${prefix}:${projectId}`;
}

function readJsonCache<T>(key: string): T | null {
  if (isServer()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJsonCache<T>(key: string, value: T): void {
  if (isServer()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[Cache] Failed to write localStorage cache:', error);
  }
}

function removeJsonCache(key: string): void {
  if (isServer()) return;
  try {
    localStorage.removeItem(key);
  } catch {
  }
}

function normalizeProjectSummary(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt ?? p.created_at,
    updatedAt: p.updatedAt ?? p.updated_at,
  };
}

function normalizeProjectConversationSummary(c: any) {
  return {
    id: c.id,
    title: c.title,
    created: c.created ?? c.created_at,
    updated: c.updated ?? c.updated_at,
  };
}

function areMessageListsEqual(a: any[], b: any[]): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]?.id !== b[i]?.id ||
      a[i]?.content !== b[i]?.content ||
      Boolean(a[i]?.isUser) !== Boolean(b[i]?.isUser) ||
      Boolean(a[i]?.isStreaming) !== Boolean(b[i]?.isStreaming)
    ) {
      return false;
    }
  }
  return true;
}

function saveProjectConversationsCache(projectId: string, conversations: any[]): void {
  const scopedKey = getScopedProjectKey(projectId);
  projectConversationsMemoryCache.set(scopedKey, conversations);
  writeJsonCache(getProjectConversationsCacheKey(projectId), { projectId, conversations });
}

function saveProjectMessageCache(projectId: string, conversationId: string, messages: any[]): void {
  const scopedKey = getScopedProjectKey(projectId, conversationId);
  projectMessageMemoryCache.set(scopedKey, messages);
  writeJsonCache(getProjectMessageCacheKey(projectId, conversationId), {
    projectId,
    conversationId,
    messages,
    timestamp: Date.now(),
  });
}

function clearProjectMessageCache(projectId: string, conversationId: string): void {
  const scopedKey = getScopedProjectKey(projectId, conversationId);
  projectMessageMemoryCache.delete(scopedKey);
  removeJsonCache(getProjectMessageCacheKey(projectId, conversationId));
}

/**
 * Synchronously returns cached projects and (when available) their grouped conversations.
 */
export function getCachedProjectsWithConversations(): {
  projects: any[];
  conversationsByProject: Record<string, any[]>;
} | null {
  if (isServer()) return null;
  const userPrefix = getUserPrefix();
  const mem = projectListMemoryCache.get(userPrefix);
  const stored = mem ?? readJsonCache<{ projects: any[]; conversationsByProject?: Record<string, any[]> }>(getProjectsCacheKey());
  if (!stored || !Array.isArray(stored.projects)) return null;

  if (!mem) {
    projectListMemoryCache.set(userPrefix, stored);
  }

  const conversationsByProject: Record<string, any[]> = { ...(stored.conversationsByProject || {}) };
  for (const project of stored.projects) {
    if (!conversationsByProject[project.id]) {
      const perProject = projectConversationsMemoryCache.get(getScopedProjectKey(project.id))
        ?? readJsonCache<{ conversations?: any[] }>(getProjectConversationsCacheKey(project.id))?.conversations;
      if (Array.isArray(perProject)) {
        conversationsByProject[project.id] = perProject;
      }
    }
  }

  return { projects: stored.projects, conversationsByProject };
}

/**
 * Fetches all projects and their conversations in a single request and updates caches.
 */
export async function loadProjectsWithConversations(): Promise<{
  projects: any[];
  conversationsByProject: Record<string, any[]>;
}> {
  if (isServer()) return { projects: [], conversationsByProject: {} };

  const email = getUserEmail();
  if (!email) return { projects: [], conversationsByProject: {} };

  try {
    const response = await fetch(`/api/projects?email=${encodeURIComponent(email)}&includeConversations=true`);
    if (!response.ok) {
      return getCachedProjectsWithConversations() ?? { projects: [], conversationsByProject: {} };
    }

    const data = await response.json();
    const projects = (data.projects || []).map(normalizeProjectSummary);
    const rawGrouped: Record<string, any[]> = data.conversationsByProject || {};
    const conversationsByProject: Record<string, any[]> = {};

    for (const project of projects) {
      const normalizedConvos = (rawGrouped[project.id] || []).map(normalizeProjectConversationSummary);
      conversationsByProject[project.id] = normalizedConvos;
      saveProjectConversationsCache(project.id, normalizedConvos);
    }

    const payload = { projects, conversationsByProject };
    projectListMemoryCache.set(getUserPrefix(), payload);
    writeJsonCache(getProjectsCacheKey(), payload);
    return payload;
  } catch (error) {
    console.error('Error loading projects with conversations:', error);
    return getCachedProjectsWithConversations() ?? { projects: [], conversationsByProject: {} };
  }
}

/**
 * Synchronously returns cached project metadata and its conversations for a project page.
 */
export function getCachedProjectDetail(projectId: string): { project: any; conversations: any[] } | null {
  if (isServer() || !projectId) return null;
  const scopedKey = getScopedProjectKey(projectId);
  const mem = projectDetailMemoryCache.get(scopedKey);
  if (mem) return mem;

  const stored = readJsonCache<{ project?: any; conversations?: any[] }>(getProjectDetailCacheKey(projectId));
  if (stored?.project) {
    const entry = { project: stored.project, conversations: stored.conversations || [] };
    projectDetailMemoryCache.set(scopedKey, entry);
    return entry;
  }

  return null;
}

/**
 * Loads project details and conversations in one API call, updating local caches.
 */
export async function loadProjectDetail(projectId: string): Promise<{
  project: any | null;
  conversations: any[];
  error?: string;
}> {
  if (isServer()) return { project: null, conversations: [] };

  const email = getUserEmail();
  if (!email) {
    return { project: null, conversations: [], error: 'Please log in to view this project' };
  }

  try {
    const response = await fetch(`/api/projects/${projectId}?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        project: null,
        conversations: [],
        error: err.error || `Failed to load project (Status: ${response.status})`,
      };
    }

    const data = await response.json();
    if (!data.project) {
      return { project: null, conversations: [], error: 'Project data missing in response' };
    }

    const project = {
      id: data.project.id,
      name: data.project.name,
      description: data.project.description,
    };
    const conversations = (data.conversations || []).map(normalizeProjectConversationSummary);
    const detail = { project, conversations };

    projectDetailMemoryCache.set(getScopedProjectKey(projectId), detail);
    writeJsonCache(getProjectDetailCacheKey(projectId), detail);
    saveProjectConversationsCache(projectId, conversations);

    return detail;
  } catch (err: any) {
    console.error('Error loading project detail:', err);
    return {
      project: null,
      conversations: [],
      error: err?.message || 'Failed to load project. Please check your connection.',
    };
  }
}

/**
 * Synchronously returns cached messages for a project conversation if available.
 */
export function getCachedProjectConversation(projectId: string, conversationId: string): any[] | null {
  if (isServer() || !projectId || !conversationId) return null;
  const scopedKey = getScopedProjectKey(projectId, conversationId);
  const mem = projectMessageMemoryCache.get(scopedKey);
  if (mem !== undefined) return mem;

  const stored = readJsonCache<{ projectId?: string; conversationId?: string; messages?: any[] }>(
    getProjectMessageCacheKey(projectId, conversationId)
  );
  if (stored && stored.projectId === projectId && stored.conversationId === conversationId && Array.isArray(stored.messages)) {
    projectMessageMemoryCache.set(scopedKey, stored.messages);
    return stored.messages;
  }

  return null;
}

/**
 * Seeds an empty cache entry for a newly created project conversation so it opens immediately.
 */
export function seedNewProjectConversationCache(projectId: string, conversationId: string): void {
  if (isServer() || !projectId || !conversationId) return;
  saveProjectMessageCache(projectId, conversationId, []);
}

async function fetchProjectConversationFromDatabase(projectId: string, conversationId: string): Promise<any[] | null> {
  const email = getUserEmail();
  if (!email) return [];

  const scopedKey = getScopedProjectKey(projectId, conversationId);
  const existing = projectConversationInFlight.get(scopedKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/conversations/${conversationId}?email=${encodeURIComponent(email)}`
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data.exists === false) return [];

      return Array.isArray(data.messages) ? data.messages : [];
    } catch (error) {
      console.error('Error loading project conversation:', error);
      return null;
    } finally {
      projectConversationInFlight.delete(scopedKey);
    }
  })();

  projectConversationInFlight.set(scopedKey, promise);
  return promise;
}

/**
 * Prefetches a project conversation into memory/localStorage cache if not already cached.
 */
export function prefetchProjectConversation(projectId: string, conversationId: string): void {
  if (isServer() || !projectId || !conversationId) return;
  if (getCachedProjectConversation(projectId, conversationId) !== null) return;
  void loadProjectConversation(projectId, conversationId);
}


export async function loadProjects(): Promise<any[]> {
  if (isServer()) return [];

  const email = getUserEmail();
  if (!email) return [];

  try {
    const response = await fetch(`/api/projects?email=${encodeURIComponent(email)}`);
    if (!response.ok) return [];

    const data = await response.json();
    const projects = (data.projects || []).map(normalizeProjectSummary);
    const existing = getCachedProjectsWithConversations();
    const payload = {
      projects,
      conversationsByProject: existing?.conversationsByProject || {},
    };
    projectListMemoryCache.set(getUserPrefix(), payload);
    writeJsonCache(getProjectsCacheKey(), payload);
    return projects;
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}


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
    if (data.project) {
      const normalized = normalizeProjectSummary(data.project);
      const cached = getCachedProjectsWithConversations();
      if (cached) {
        const updated = {
          projects: [normalized, ...cached.projects.filter(p => p.id !== normalized.id)],
          conversationsByProject: { ...cached.conversationsByProject, [normalized.id]: [] },
        };
        projectListMemoryCache.set(getUserPrefix(), updated);
        writeJsonCache(getProjectsCacheKey(), updated);
      }
      saveProjectConversationsCache(normalized.id, []);
    }
    dispatchProjectUpdated();
    return data.project;
  } catch (error) {
    console.error('Error creating project:', error);
    return null;
  }
}


export async function deleteProject(projectId: string): Promise<boolean> {
  if (isServer()) return false;

  const email = getUserEmail();
  if (!email) return false;

  try {
    const response = await fetch(`/api/projects/${projectId}?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      const cached = getCachedProjectsWithConversations();
      if (cached) {
        const { [projectId]: _removed, ...restConvos } = cached.conversationsByProject;
        const updated = {
          projects: cached.projects.filter(p => p.id !== projectId),
          conversationsByProject: restConvos,
        };
        projectListMemoryCache.set(getUserPrefix(), updated);
        writeJsonCache(getProjectsCacheKey(), updated);
      }
      projectConversationsMemoryCache.delete(getScopedProjectKey(projectId));
      projectDetailMemoryCache.delete(getScopedProjectKey(projectId));
      removeJsonCache(getProjectConversationsCacheKey(projectId));
      removeJsonCache(getProjectDetailCacheKey(projectId));
      dispatchProjectUpdated();
    }

    return response.ok;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}


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
      const cached = getCachedProjectsWithConversations();
      if (cached) {
        const updated = {
          ...cached,
          projects: cached.projects.map(p => (p.id === projectId ? { ...p, name: newName } : p)),
        };
        projectListMemoryCache.set(getUserPrefix(), updated);
        writeJsonCache(getProjectsCacheKey(), updated);
      }
      const detail = getCachedProjectDetail(projectId);
      if (detail) {
        const updatedDetail = { ...detail, project: { ...detail.project, name: newName } };
        projectDetailMemoryCache.set(getScopedProjectKey(projectId), updatedDetail);
        writeJsonCache(getProjectDetailCacheKey(projectId), updatedDetail);
      }
      dispatchProjectUpdated();
    }

    return response.ok;
  } catch (error) {
    console.error('Error renaming project:', error);
    return false;
  }
}


export async function loadProjectConversations(projectId: string): Promise<any[]> {
  if (isServer()) return [];

  const email = getUserEmail();
  if (!email) return [];

  try {
    const response = await fetch(`/api/projects/${projectId}/conversations?email=${encodeURIComponent(email)}`);
    if (!response.ok) return [];

    const data = await response.json();
    const convos = (data.conversations || []).map(normalizeProjectConversationSummary);
    saveProjectConversationsCache(projectId, convos);
    return convos;
  } catch (error) {
    console.error('Error loading project conversations:', error);
    return [];
  }
}


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
    if (data.conversation?.id) {
      knownProjectConversations.add(data.conversation.id);
      seedNewProjectConversationCache(projectId, data.conversation.id);
    }
    dispatchProjectUpdated();
    return data.conversation;
  } catch (error) {
    console.error('Error creating project conversation:', error);
    return null;
  }
}


export async function loadProjectConversation(
  projectId: string,
  conversationId: string,
  onBackgroundUpdate?: (messages: any[]) => void
): Promise<any[]> {
  if (isServer()) return [];

  const cachedMessages = getCachedProjectConversation(projectId, conversationId);
  if (cachedMessages !== null) {
    fetchProjectConversationFromDatabase(projectId, conversationId).then((dbMessages) => {
      if (dbMessages === null) return;
      if (!areMessageListsEqual(cachedMessages, dbMessages)) {
        saveProjectMessageCache(projectId, conversationId, dbMessages);
        onBackgroundUpdate?.(dbMessages);
      }
    });
    return cachedMessages;
  }

  const dbMessages = await fetchProjectConversationFromDatabase(projectId, conversationId);
  if (dbMessages === null) return [];

  saveProjectMessageCache(projectId, conversationId, dbMessages);
  return dbMessages;
}


export async function saveProjectConversation(projectId: string, conversationId: string, messages: any[]): Promise<boolean> {
  if (isServer()) return false;

  saveProjectMessageCache(projectId, conversationId, messages);

  const email = getUserEmail();
  if (!email) return false;

  try {

    if (!knownProjectConversations.has(conversationId)) {
      const checkResponse = await fetch(
        `/api/projects/${projectId}/conversations/${conversationId}?email=${encodeURIComponent(email)}`
      );

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        if (data.exists === false) {

          const generatedTitle = generateTitleFromMessage(messages);

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


    const response = await fetch(`/api/projects/${projectId}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, messages }),
    });

    if (!response.ok) return false;


    if (messages.some(m => m.isUser) && !autoTitledProjectConversations.has(conversationId)) {
      autoTitledProjectConversations.add(conversationId);
      const candidateTitle = generateTitleFromMessage(messages);

      if (candidateTitle && candidateTitle !== 'New Conversation') {

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


function updateCachedProjectConversationList(
  projectId: string,
  updater: (convos: any[]) => any[]
): void {
  const cached = getCachedProjectsWithConversations();
  if (cached && cached.conversationsByProject[projectId]) {
    const updatedConvos = updater(cached.conversationsByProject[projectId]);
    const updated = {
      ...cached,
      conversationsByProject: { ...cached.conversationsByProject, [projectId]: updatedConvos },
    };
    projectListMemoryCache.set(getUserPrefix(), updated);
    writeJsonCache(getProjectsCacheKey(), updated);
    saveProjectConversationsCache(projectId, updatedConvos);
  }

  const detail = getCachedProjectDetail(projectId);
  if (detail) {
    const updatedDetail = { ...detail, conversations: updater(detail.conversations) };
    projectDetailMemoryCache.set(getScopedProjectKey(projectId), updatedDetail);
    writeJsonCache(getProjectDetailCacheKey(projectId), updatedDetail);
  }
}


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
      clearProjectMessageCache(projectId, conversationId);
      updateCachedProjectConversationList(projectId, (convos) =>
        convos.filter((c) => c.id !== conversationId)
      );
      dispatchProjectUpdated();
    }

    return response.ok;
  } catch (error) {
    console.error('Error deleting project conversation:', error);
    return false;
  }
}


export async function renameProjectConversation(projectId: string, conversationId: string, newTitle: string): Promise<boolean> {
  if (isServer()) return false;

  const email = getUserEmail();
  if (!email) return false;

  try {
    const response = await fetch(
      `/api/projects/${projectId}/conversations/${conversationId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, title: newTitle }),
      }
    );

    if (response.ok) {
      updateCachedProjectConversationList(projectId, (convos) =>
        convos.map((c) => (c.id === conversationId ? { ...c, title: newTitle } : c))
      );
    }

    return response.ok;
  } catch (error) {
    console.error('Error renaming project conversation:', error);
    return false;
  }
}
