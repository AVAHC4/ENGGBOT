/**
 * Authentication Storage Helper
 * 
 * Centralizes all authentication-related storage operations to improve performance
 * and maintainability. Uses localStorage as the single source of truth for auth data.
 */

const AUTH_STORAGE_KEY = 'auth_user_data';
const AUTH_STATE_KEY = 'auth_state';

/**
 * User data interface
 */
export interface UserData {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
}

/**
 * Stores user data in localStorage
 * @param userData - User data object with id, name, email, avatar
 */
export function storeUserData(userData: UserData): void {
  if (!userData) return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
  localStorage.setItem(AUTH_STATE_KEY, 'authenticated');
}

/**
 * Retrieves user data from localStorage
 * @returns User data object or null if not found
 */
export function getUserData(): UserData | null {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Checks if the user is authenticated
 * @returns True if authenticated, false otherwise
 */
export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_STATE_KEY) === 'authenticated' && !!getUserData();
}

/**
 * Sets the authentication state without changing user data
 * @param state - Authentication state
 */
export function setAuthState(state: boolean): void {
  if (state) {
    localStorage.setItem(AUTH_STATE_KEY, 'authenticated');
  } else {
    localStorage.removeItem(AUTH_STATE_KEY);
  }
}

/**
 * Marks that the user should be redirected to chat
 * @param shouldRedirect - Whether to redirect to chat
 */
export function setRedirectToChat(shouldRedirect: boolean = true): void {
  if (shouldRedirect) {
    localStorage.setItem('redirectToChat', 'true');
  } else {
    localStorage.removeItem('redirectToChat');
  }
}

/**
 * Checks if the user should be redirected to chat
 * @returns True if should redirect, false otherwise
 */
export function shouldRedirectToChat(): boolean {
  return localStorage.getItem('redirectToChat') === 'true';
}

/**
 * Clears all authentication data
 */
export function clearAuthData(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STATE_KEY);
  localStorage.removeItem('redirectToChat');
  
  // Also clear legacy auth data
  localStorage.removeItem('user');
  localStorage.removeItem('user_info');
  localStorage.removeItem('authenticated');
  localStorage.removeItem('auth_token');
  
  // Clear sessionStorage auth data
  sessionStorage.removeItem('authenticated');
} 