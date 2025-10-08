// Auth helpers to check authentication state from main application
export function checkExternalAuth(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check for auth indicators from the main application
  // Check cookies
  const hasAuthCookie = document.cookie.includes('auth_success=true');
  
  // Check localStorage
  const isAuthenticatedLS = localStorage.getItem('authenticated') === 'true';
  
  // Check sessionStorage
  const isAuthenticatedSS = sessionStorage.getItem('authenticated') === 'true';
  
  // Check URL parameters (added for cross-port communication)
  const urlParams = new URLSearchParams(window.location.search);
  const hasAuthParam = urlParams.get('auth_success') === 'true';
  
  // Store user data from URL parameters if available
  const userName = urlParams.get('user_name');
  const userEmail = urlParams.get('user_email');
  const userAvatar = urlParams.get('user_avatar');
  
  // Check for user data encoded in the 'user' parameter
  const userDataParam = urlParams.get('user');
  if (userDataParam) {
    try {
      const decodedUserData = JSON.parse(decodeURIComponent(userDataParam));
      console.log("Received user data from redirect:", decodedUserData);
      
      // Store the user data in localStorage
      localStorage.setItem('user_data', JSON.stringify(decodedUserData));
      
      // Also store individual fields
      if (decodedUserData.name) localStorage.setItem('user_name', decodedUserData.name);
      if (decodedUserData.email) localStorage.setItem('user_email', decodedUserData.email);
      if (decodedUserData.avatar) localStorage.setItem('user_avatar', decodedUserData.avatar);

      try { window.dispatchEvent(new CustomEvent('ai_ui_auth_updated')); } catch {}
      // Treat this as an explicit login for session priority purposes
      try {
        localStorage.setItem('ai_ui_just_logged_in', 'true');
        localStorage.setItem('ai_ui_login_priority_until', String(Date.now() + 15000));
      } catch {}
    } catch (e) {
      console.error("Failed to parse user data from URL:", e);
    }
  }

  if (userName) localStorage.setItem('user_name', userName);
  if (userEmail) localStorage.setItem('user_email', userEmail);
  if (userAvatar) localStorage.setItem('user_avatar', userAvatar);

  // Create a user_data object if we have the necessary components
  if (userName || userEmail || userAvatar) {
    const userData = {
      name: userName || localStorage.getItem('user_name') || 'User',
      email: userEmail || localStorage.getItem('user_email') || 'user@example.com',
      avatar: userAvatar || localStorage.getItem('user_avatar') || '',
    };
    
    localStorage.setItem('user_data', JSON.stringify(userData));
    try { window.dispatchEvent(new CustomEvent('ai_ui_auth_updated')); } catch {}
  }

  // Fallback: attempt to derive user_data from known keys used by the main app
  if (!localStorage.getItem('user_data')) {
    const possibleKeys = ['currentUser', 'user', 'user_info'];
    for (const key of possibleKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed) {
          const email = parsed.email || parsed.user?.email || parsed.profile?.email || parsed.userEmail;
          const name = parsed.name || parsed.user?.name || parsed.profile?.name || parsed.userName;
          const avatar = parsed.avatar || parsed.avatar_url || parsed.picture || parsed.user?.avatar_url || parsed.profile?.avatar_url;
          if (email || name || avatar) {
            const userData = {
              name: name || localStorage.getItem('user_name') || 'User',
              email: email || localStorage.getItem('user_email') || 'user@example.com',
              avatar: avatar || localStorage.getItem('user_avatar') || '',
            };
            localStorage.setItem('user_data', JSON.stringify(userData));
            if (userData.name) localStorage.setItem('user_name', userData.name);
            if (userData.email) localStorage.setItem('user_email', userData.email);
            if (userData.avatar) localStorage.setItem('user_avatar', userData.avatar);
            try { window.dispatchEvent(new CustomEvent('ai_ui_auth_updated')); } catch {}
            break;
          }
        }
      } catch {}
    }
  }
  
  // If auth is found, store it in our own format
  if (hasAuthCookie || isAuthenticatedLS || isAuthenticatedSS || hasAuthParam) {
    const wasAuthed = localStorage.getItem('ai_ui_authenticated') === 'true';
    // Mark that this session just performed an explicit login (used to prioritize claiming)
    if (hasAuthCookie || hasAuthParam || !wasAuthed) {
      try {
        localStorage.setItem('ai_ui_just_logged_in', 'true');
        localStorage.setItem('ai_ui_login_priority_until', String(Date.now() + 15000));
      } catch {}
    }
    // Store auth in local format
    localStorage.setItem('ai_ui_authenticated', 'true');
    // Notify listeners that auth state has been updated
    try { window.dispatchEvent(new CustomEvent('ai_ui_auth_updated')); } catch {}
    // Initialize single-session enforcement after auth
    try { initSingleSessionEnforcement(); } catch {}
    
    // Clean up external auth markers
    if (hasAuthCookie) {
      document.cookie = 'auth_success=; max-age=0; path=/';
    }
    
    // Clean URL parameter if it exists
    if ((hasAuthParam || userName || userEmail || userAvatar || userDataParam) && window.history && window.history.replaceState) {
      // Remove the auth_success parameter from URL without refreshing
      const newUrl = window.location.pathname + 
        window.location.search
          .replace(/[?&]auth_success=true/, '')
          .replace(/[?&]user_name=[^&]*/, '')
          .replace(/[?&]user_email=[^&]*/, '')
          .replace(/[?&]user_avatar=[^&]*/, '')
          .replace(/[?&]user=[^&]*/, '') +
        window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    return true;
  }
  
  // Check our own storage as fallback
  return localStorage.getItem('ai_ui_authenticated') === 'true';
}

// ================= Single-session enforcement =================
let singleSessionInterval: number | null = null;
let reclaimHandler: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;

function getUserEmailFromStorage(): string | null {
  try {
    const userDataRaw = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null;
    if (userDataRaw) {
      const parsed = JSON.parse(userDataRaw);
      if (parsed && parsed.email) return String(parsed.email).trim().toLowerCase();
    }
    const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
    return email ? String(email).trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

function ensureLocalSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('ai_ui_session_id');
  if (!sid) {
    try {
      sid = crypto.randomUUID();
    } catch {
      sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
    localStorage.setItem('ai_ui_session_id', sid);
  }
  return sid;
}

async function claimServerSession(email: string, sessionId: string): Promise<void> {
  try {
    // Record local claim time to ignore stale server reads briefly
    try { localStorage.setItem('ai_ui_session_claimed_at', String(Date.now())); } catch {}
    await fetch('/api/user/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sessionId })
    });
  } catch {}
}

type ServerSessionInfo = { sessionId: string | null; updatedAt: number | null };
async function fetchServerSession(email: string): Promise<ServerSessionInfo> {
  try {
    const res = await fetch(`/api/user/session?email=${encodeURIComponent(email)}`);
    if (!res.ok) return { sessionId: null, updatedAt: null };
    const data = await res.json();
    const sid = data?.sessionId ?? null;
    const updatedAt = data?.updatedAt ? Date.parse(data.updatedAt) : null;
    return { sessionId: sid, updatedAt: isNaN(updatedAt as any) ? null : updatedAt };
  } catch {
    return { sessionId: null, updatedAt: null };
  }
}

export function initSingleSessionEnforcement(): void {
  if (typeof window === 'undefined') return;
  const tryStart = () => {
    const email = getUserEmailFromStorage();
    if (!email) return false;
    const localSid = ensureLocalSessionId();
    const justLoggedIn = localStorage.getItem('ai_ui_just_logged_in') === 'true';
    if (justLoggedIn) {
      // New login takes precedence: claim immediately and clear the flag
      claimServerSession(email, localSid);
      try { localStorage.removeItem('ai_ui_just_logged_in'); } catch {}
    } else {
      // Resumed session: never steal from a newer session
      (async () => {
        const { sessionId: serverSid } = await fetchServerSession(email);
        if (serverSid && serverSid !== localSid) {
          // Another owner exists; logout this session
          logout();
          return;
        }
        if (serverSid === localSid) {
          // We are still the owner; refresh the lock
          claimServerSession(email, localSid);
        }
        // If serverSid is null, do nothing to avoid stealing during stale reads
      })();
    }
    // Start watcher
    if (singleSessionInterval) {
      window.clearInterval(singleSessionInterval);
      singleSessionInterval = null;
    }
    singleSessionInterval = window.setInterval(async () => {
      try {
        const currentSid = localStorage.getItem('ai_ui_session_id');
        if (!currentSid) return;
        const { sessionId: serverSid, updatedAt } = await fetchServerSession(email);
        if (serverSid && serverSid !== currentSid) {
          const claimedAt = Number(localStorage.getItem('ai_ui_session_claimed_at') || '0');
          const priorityUntil = Number(localStorage.getItem('ai_ui_login_priority_until') || '0');
          // If we are within the priority window (new login), do not logout; assert claim
          if (priorityUntil && Date.now() < priorityUntil) {
            claimServerSession(email, currentSid);
            return;
          }
          // If server's update is older than our claim, do not logout; re-assert claim instead
          if (updatedAt !== null && claimedAt && updatedAt < claimedAt + 10000) {
            claimServerSession(email, currentSid);
            return;
          }
          // Server has a newer owner; logout this one
          logout();
        }
      } catch {}
    }, 1000);

    // Re-claim lock on focus/visibility regain for instant precedence
    reclaimHandler = async () => {
      const em = getUserEmailFromStorage();
      const sid = localStorage.getItem('ai_ui_session_id');
      if (!em || !sid) return;
      const { sessionId: serverSid } = await fetchServerSession(em);
      // Only reclaim if we already are the owner. Do not steal if server is null or owned by another.
      if (serverSid === sid) {
        claimServerSession(em, sid);
      }
    };
    visibilityHandler = () => { if (document.visibilityState === 'visible' && reclaimHandler) reclaimHandler(); };
    window.addEventListener('focus', reclaimHandler);
    window.addEventListener('visibilitychange', visibilityHandler);
    return true;
  };

  // If email isn't available yet, try again shortly
  if (!tryStart()) {
    setTimeout(() => { tryStart(); }, 500);
  }
}

export function stopSingleSessionEnforcement(): void {
  if (typeof window === 'undefined') return;
  if (singleSessionInterval) {
    window.clearInterval(singleSessionInterval);
    singleSessionInterval = null;
  }
  if (reclaimHandler) {
    window.removeEventListener('focus', reclaimHandler);
    reclaimHandler = null;
  }
  if (visibilityHandler) {
    window.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}

export function setAuthenticated(value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  if (value) {
    const wasAuthed = localStorage.getItem('ai_ui_authenticated') === 'true';
    localStorage.setItem('ai_ui_authenticated', 'true');
    // If we were previously unauthenticated, treat this as a new login
    if (!wasAuthed) {
      try {
        localStorage.setItem('ai_ui_just_logged_in', 'true');
        localStorage.setItem('ai_ui_login_priority_until', String(Date.now() + 15000));
      } catch {}
    }
    try { initSingleSessionEnforcement(); } catch {}
  } else {
    localStorage.removeItem('ai_ui_authenticated');
  }
}

// Clear all authentication data and redirect to main app landing page
export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Clear all auth-related localStorage items
  localStorage.removeItem('ai_ui_authenticated');
  localStorage.removeItem('authenticated');
  localStorage.removeItem('redirectToChat');
  localStorage.removeItem('activeConversation');
  
  // Stop single-session watcher and clear local session id
  try { stopSingleSessionEnforcement(); } catch {}
  localStorage.removeItem('ai_ui_session_id');

  // Clear main app authentication state
  localStorage.removeItem('user');
  localStorage.removeItem('user_info');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token');
  localStorage.removeItem('session');
  localStorage.removeItem('currentUser');
  
  // Explicitly set redirectToChat to false to prevent auto-redirect
  localStorage.setItem('redirectToChat', 'false');
  localStorage.setItem('forceMainPage', 'true');
  localStorage.setItem('forceLogout', 'true');
  
  // Avoid clearing conversation data or user identity to preserve per-user history across sessions
  try {
    // Preserve conversation data across logouts so it loads after fresh login
    // Only clear transient auth flags beyond the explicit removals above
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      // Do NOT remove any keys that store conversations or their metadata
      if (key.includes('conversation')) continue;

      // Optionally clear extra auth-related flags
      if (key.includes('ai_ui_authenticated') || key.startsWith('auth_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
  
  // Clear session storage
  sessionStorage.removeItem('authenticated');
  sessionStorage.clear();
  
  // Clear auth cookies
  document.cookie = 'auth_success=; max-age=0; path=/';
  document.cookie = 'authenticated=; max-age=0; path=/';
  document.cookie = 'auth_attempt=; max-age=0; path=/';
  
  // Forcefully clear all cookies
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
  
  // Compute the public landing base from env (preferred) or current origin
  // NEXT_PUBLIC_MAIN_APP_URL may be like: https://www.enggbot.me/ (path is ignored; we always send to site root)
  const configured = process.env.NEXT_PUBLIC_MAIN_APP_URL || process.env.NEXT_PUBLIC_VITE_APP_URL;
  let baseOrigin = '';
  let redirectPath = '/';
  try {
    if (configured) {
      const u = new URL(configured);
      baseOrigin = u.origin;
      // Always route to the site root regardless of configured pathname
      redirectPath = '/';
    } else {
      baseOrigin = window.location.origin;
      // For local dev convenience: if running on localhost:3000 and no env, prefer Vite at 5173
      try {
        const url = new URL(window.location.href);
        if (url.hostname === 'localhost' && url.port !== '5173') {
          baseOrigin = `${url.protocol}//${url.hostname}:5173`;
        }
      } catch {}
    }
  } catch {
    baseOrigin = window.location.origin;
  }
  const mainAppUrl = `${baseOrigin}${redirectPath}?logout=true&no_redirect=true&force_logout=true`;
  
  // Use a combination of methods for maximum browser compatibility
  // Navigate immediately; provide a minimal fallback
  try { window.location.replace(mainAppUrl); } catch {}
  setTimeout(() => { try { window.location.href = mainAppUrl; } catch {} }, 100);
}