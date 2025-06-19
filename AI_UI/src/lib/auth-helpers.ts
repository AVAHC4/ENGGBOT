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
      
      // Generate a consistent user ID based on email or ID
      const userId = decodedUserData.email 
        ? btoa(encodeURIComponent(decodedUserData.email)).replace(/[^a-z0-9]/gi, '_')
        : (decodedUserData.id ? `user_${decodedUserData.id}` : null);
      
      // If we have a userId, store it as the persistent ID
      if (userId) {
        localStorage.setItem('persistent_user_id', userId);
        console.log("Set persistent user ID:", userId);
      }
      
      // Store the user data in localStorage
      localStorage.setItem('user_data', JSON.stringify(decodedUserData));
      localStorage.setItem('user', JSON.stringify(decodedUserData));
      
      // Also store individual fields
      if (decodedUserData.name) localStorage.setItem('user_name', decodedUserData.name);
      if (decodedUserData.email) localStorage.setItem('user_email', decodedUserData.email);
      if (decodedUserData.avatar) localStorage.setItem('user_avatar', decodedUserData.avatar);
      if (decodedUserData.id) localStorage.setItem('user_id', decodedUserData.id);
      if (decodedUserData.google_id) localStorage.setItem('google_id', decodedUserData.google_id);
    } catch (e) {
      console.error("Failed to parse user data from URL:", e);
    }
  }
  
  // Process individual URL parameters if available
  if (userName || userEmail || userAvatar) {
    // Generate a consistent user ID if we have an email
    if (userEmail) {
      const userId = btoa(encodeURIComponent(userEmail)).replace(/[^a-z0-9]/gi, '_');
      localStorage.setItem('persistent_user_id', userId);
    }
    
    if (userName) localStorage.setItem('user_name', userName);
    if (userEmail) localStorage.setItem('user_email', userEmail);
    if (userAvatar) localStorage.setItem('user_avatar', userAvatar);
    
    // Create a user_data object with the available components
    const userData = {
      name: userName || localStorage.getItem('user_name') || 'User',
      email: userEmail || localStorage.getItem('user_email') || 'user@example.com',
      avatar: userAvatar || localStorage.getItem('user_avatar') || '',
    };
    
    localStorage.setItem('user_data', JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData));
  }
  
  // If auth is found, store it in our own format
  if (hasAuthCookie || isAuthenticatedLS || isAuthenticatedSS || hasAuthParam) {
    // Store auth in local format
    localStorage.setItem('ai_ui_authenticated', 'true');
    
    // Ensure we have a persistent user ID even if no user data was provided
    if (!localStorage.getItem('persistent_user_id')) {
      // Try to generate from existing data
      const existingEmail = localStorage.getItem('user_email');
      if (existingEmail) {
        const userId = btoa(encodeURIComponent(existingEmail)).replace(/[^a-z0-9]/gi, '_');
        localStorage.setItem('persistent_user_id', userId);
      } else {
        // Create a new persistent ID as last resort
        const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('persistent_user_id', newId);
      }
    }
    
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
  
  // Save the persistent user ID before clearing everything
  const persistentUserId = localStorage.getItem('persistent_user_id');
  
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
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Remove all conversation-related items
    for (const key of keys) {
      if (key.includes('conversation') || key.includes('user_') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
  
  // Restore the persistent user ID for future logins
  if (persistentUserId) {
    localStorage.setItem('persistent_user_id', persistentUserId);
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
  
  // Explicitly set the URL with path and a no_redirect parameter
  const mainAppUrl = (process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000') + '/?logout=true&no_redirect=true&force_logout=true';
  
  // Use a combination of methods for maximum browser compatibility
  try {
    // Method 1: Replace current history entry
    window.location.replace(mainAppUrl);
    
    // Method 2: As a fallback, also try setting href if replace doesn't work
    setTimeout(() => {
      window.location.href = mainAppUrl;
    }, 100);
    
    // Method 3: For very stubborn browsers, try a form submit
    setTimeout(() => {
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = mainAppUrl;
      document.body.appendChild(form);
      form.submit();
    }, 200);
  } catch (e) {
    console.error('Error during redirection:', e);
    // Last resort
    window.location.href = mainAppUrl;
  }
} 