import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserResponse } from '../types/api';

interface AuthContextType {
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'phishradar_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserResponse | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setUser = (newUser: UserResponse | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      document.documentElement.setAttribute('data-phishradar-user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      document.documentElement.removeAttribute('data-phishradar-user');
    }

    // Broadcast for extension content script and other listeners
    window.postMessage({ type: 'PHISHRADAR_AUTH_SYNC', user: newUser }, '*');
    window.dispatchEvent(new CustomEvent('phishradar-auth-sync', { detail: { user: newUser } }));
  };

  const logout = () => {
    setUser(null);
  };

  // Sync user state to DOM and postMessage whenever it changes
  useEffect(() => {
    if (user) {
      document.documentElement.setAttribute('data-phishradar-user', JSON.stringify(user));
      window.postMessage({ type: 'PHISHRADAR_AUTH_SYNC', user }, '*');
    } else {
      document.documentElement.removeAttribute('data-phishradar-user');
      window.postMessage({ type: 'PHISHRADAR_AUTH_SYNC', user: null }, '*');
    }
  }, [user]);

  // Set up storage and message listeners on mount
  useEffect(() => {
    // Sync across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          setUserState(parsed);
          if (parsed) {
            document.documentElement.setAttribute('data-phishradar-user', JSON.stringify(parsed));
          } else {
            document.documentElement.removeAttribute('data-phishradar-user');
          }
        } catch {
          setUserState(null);
        }
      }
    };

    // Listen for extension sync if extension sends message to webpage
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'PHISHRADAR_AUTH_SYNC_FROM_EXT') {
        const extUser = e.data.user || null;
        setUserState(extUser);
        if (extUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(extUser));
          document.documentElement.setAttribute('data-phishradar-user', JSON.stringify(extUser));
        } else {
          localStorage.removeItem(STORAGE_KEY);
          document.documentElement.removeAttribute('data-phishradar-user');
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
