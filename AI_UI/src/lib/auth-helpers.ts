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

      // Notify listeners that auth/user context has been updated
      try { window.dispatchEvent(new CustomEvent('ai_ui_auth_updated')); } catch {}
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
  }
  
  // If auth is found, store it in our own format
  if (hasAuthCookie || isAuthenticatedLS || isAuthenticatedSS || hasAuthParam) {
    // Store auth in local format
    localStorage.setItem('ai_ui_authenticated', 'true');
    // Notify listeners that auth state has been updated
    try { window.dispatchEvent(new CustomEvent('ai_ui_auth_updated')); } catch {}
    
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

export function setAuthenticated(value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  if (value) {
    localStorage.setItem('ai_ui_authenticated', 'true');
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
  localStorage.removeItem('user_data');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_avatar');
  localStorage.removeItem('redirectToChat');
  localStorage.removeItem('activeConversation');
  
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
  
  // Clear all conversation data too
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
  // NEXT_PUBLIC_MAIN_APP_URL is expected like: https://www.enggbot.me/login
  const configured = process.env.NEXT_PUBLIC_MAIN_APP_URL || process.env.NEXT_PUBLIC_VITE_APP_URL;
  let baseOrigin = '';
  let loginPath = '/login';
  try {
    if (configured) {
      const u = new URL(configured);
      baseOrigin = u.origin;
      // If the env points directly to /login, keep that path; otherwise default to /login
      loginPath = u.pathname && u.pathname !== '/' ? u.pathname : '/login';
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
  const mainAppUrl = `${baseOrigin}${loginPath}?logout=true&no_redirect=true&force_logout=true`;
  
  // Use a combination of methods for maximum browser compatibility
  // Navigate immediately; provide a minimal fallback
  try { window.location.replace(mainAppUrl); } catch {}
  setTimeout(() => { try { window.location.href = mainAppUrl; } catch {} }, 100);
}