 

 
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
      body: JSON.stringify({ email, title: metadata.title }),
    }).catch(err => console.log('Failed to update conversation title in database:', err));
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

 
export async function getAllConversationsMetadata(): Promise<any[]> {
  if (isServer()) return [];

   
  const dbConversations = await loadConversationsFromDatabase();
  return dbConversations.map((c: any) => ({
    id: c.id,
    title: c.title,
    created: c.created_at || c.createdAt,
    updated: c.updated_at || c.updatedAt,
  })).sort((a: any, b: any) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
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

 
export async function saveProjectConversation(projectId: string, conversationId: string, messages: any[]): Promise<boolean> {
  if (isServer()) return false;

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
