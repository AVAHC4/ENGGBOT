"use client";

import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { checkExternalAuth, setAuthenticated, logout } from '@/lib/auth-helpers';

interface UserData {
  id?: string;
  google_id?: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userData: UserData | null;
  persistentUserId: string | null;
  login: () => void;
  logout: () => void;
  updateUserData: (data: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [persistentUserId, setPersistentUserId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Set isMounted flag on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    if (isMounted) {
      // Check if user is authenticated
      const isAuth = checkExternalAuth();
      setIsAuthenticated(isAuth);

      // Get persistent user ID
      const storedPersistentId = localStorage.getItem('persistent_user_id');
      setPersistentUserId(storedPersistentId);

      // Get user data from localStorage
      try {
        const storedUserData = localStorage.getItem('user_data');
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);
        } else {
          // Try to build user data from individual fields
          const name = localStorage.getItem('user_name');
          const email = localStorage.getItem('user_email');
          const avatar = localStorage.getItem('user_avatar');
          const id = localStorage.getItem('user_id');
          const googleId = localStorage.getItem('google_id');

          if (name || email) {
            const constructedUserData: UserData = {
              name: name || 'User',
              email: email || 'user@example.com',
              avatar: avatar || undefined,
              id: id || undefined,
              google_id: googleId || undefined,
            };
            setUserData(constructedUserData);
            
            // Store the constructed data
            localStorage.setItem('user_data', JSON.stringify(constructedUserData));
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  }, [isMounted]);

  // Login function
  const login = useCallback(() => {
    setAuthenticated(true);
    setIsAuthenticated(true);
    
    // Redirect to main app auth page
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000';
    window.location.href = `${mainAppUrl}/api/auth/google`;
  }, []);

  // Logout function
  const handleLogout = useCallback(() => {
    logout();
    setIsAuthenticated(false);
    setUserData(null);
  }, []);

  // Update user data
  const updateUserData = useCallback((data: Partial<UserData>) => {
    setUserData(prevData => {
      const newData = { ...prevData, ...data } as UserData;
      
      // Save to localStorage
      localStorage.setItem('user_data', JSON.stringify(newData));
      
      // Also save individual fields for backward compatibility
      if (data.name) localStorage.setItem('user_name', data.name);
      if (data.email) localStorage.setItem('user_email', data.email);
      if (data.avatar) localStorage.setItem('user_avatar', data.avatar);
      if (data.id) localStorage.setItem('user_id', data.id);
      if (data.google_id) localStorage.setItem('google_id', data.google_id);
      
      return newData;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userData,
        persistentUserId,
        login,
        logout: handleLogout,
        updateUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 