 
export function checkExternalAuth(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

   
   
  const hasAuthCookie = document.cookie.includes('auth_success=true');
  
   
  const isAuthenticatedLS = localStorage.getItem('authenticated') === 'true';
  
   
  const isAuthenticatedSS = sessionStorage.getItem('authenticated') === 'true';
  
   
  const urlParams = new URLSearchParams(window.location.search);
  const hasAuthParam = urlParams.get('auth_success') === 'true';
  
   
  const userName = urlParams.get('user_name');
  const userEmail = urlParams.get('user_email');
  const userAvatar = urlParams.get('user_avatar');
  
   
  const userDataParam = urlParams.get('user');
  if (userDataParam) {
    try {
      const decodedUserData = JSON.parse(decodeURIComponent(userDataParam));
      console.log("Received user data from redirect:", decodedUserData);
      
       
      localStorage.setItem('user_data', JSON.stringify(decodedUserData));
      
       
      if (decodedUserData.name) localStorage.setItem('user_name', decodedUserData.name);
      if (decodedUserData.email) localStorage.setItem('user_email', decodedUserData.email);
      if (decodedUserData.avatar) localStorage.setItem('user_avatar', decodedUserData.avatar);
    } catch (e) {
      console.error("Failed to parse user data from URL:", e);
    }
  }
  
  if (userName) localStorage.setItem('user_name', userName);
  if (userEmail) localStorage.setItem('user_email', userEmail);
  if (userAvatar) localStorage.setItem('user_avatar', userAvatar);
  
   
  if (userName || userEmail || userAvatar) {
    const userData = {
      name: userName || localStorage.getItem('user_name') || 'User',
      email: userEmail || localStorage.getItem('user_email') || 'user@example.com',
      avatar: userAvatar || localStorage.getItem('user_avatar') || '',
    };
    
    localStorage.setItem('user_data', JSON.stringify(userData));
  }
  
   
  if (hasAuthCookie || isAuthenticatedLS || isAuthenticatedSS || hasAuthParam) {
     
    localStorage.setItem('ai_ui_authenticated', 'true');
    
     
    if (hasAuthCookie) {
      document.cookie = 'auth_success=; max-age=0; path=/';
    }
    
     
    if ((hasAuthParam || userName || userEmail || userAvatar || userDataParam) && window.history && window.history.replaceState) {
       
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

 
export function logout(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
   
  localStorage.removeItem('ai_ui_authenticated');
  localStorage.removeItem('authenticated');
  localStorage.removeItem('user_data');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_avatar');
  localStorage.removeItem('redirectToChat');
  localStorage.removeItem('activeConversation');
  
   
  localStorage.removeItem('user');
  localStorage.removeItem('user_info');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token');
  localStorage.removeItem('session');
  localStorage.removeItem('currentUser');
  
   
  localStorage.setItem('redirectToChat', 'false');
  localStorage.setItem('forceMainPage', 'true');
  localStorage.setItem('forceLogout', 'true');
  
   
  try {
     
    const keys = Object.keys(localStorage);
    
     
    for (const key of keys) {
      if (key.includes('conversation') || key.includes('user_') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
  
   
  sessionStorage.removeItem('authenticated');
  sessionStorage.clear();
  
   
  document.cookie = 'auth_success=; max-age=0; path=/';
  document.cookie = 'authenticated=; max-age=0; path=/';
  document.cookie = 'auth_attempt=; max-age=0; path=/';
  
   
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
  
   
   
  const configured = process.env.NEXT_PUBLIC_MAIN_APP_URL || process.env.NEXT_PUBLIC_VITE_APP_URL;
  let baseOrigin = '';
  let loginPath = '/login';
  try {
    if (configured) {
      const u = new URL(configured);
      baseOrigin = u.origin;
       
      loginPath = u.pathname && u.pathname !== '/' ? u.pathname : '/login';
    } else {
      baseOrigin = window.location.origin;
       
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
  
   
   
  try { window.location.replace(mainAppUrl); } catch {}
  setTimeout(() => { try { window.location.href = mainAppUrl; } catch {} }, 100);
}