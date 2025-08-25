
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface NeonAuthContextType {
  user: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const NeonAuthContext = createContext<NeonAuthContextType | undefined>(undefined);

export const NeonAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const isCheckingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    // Only check auth on initial load
    checkAuthStatus();
  }, []); // Remove user dependency that was causing loops

  const checkAuthStatus = async () => {
    // Prevent multiple simultaneous auth checks
    if (isCheckingRef.current) {
      return;
    }
    
    // Rate limit - only check once every 30 seconds minimum
    const now = Date.now();
    if (now - lastCheckRef.current < 30000) {
      setLoading(false);
      return;
    }
    
    isCheckingRef.current = true;
    lastCheckRef.current = now;

    try {
      // First, try to load from localStorage immediately
      const storedUser = localStorage.getItem('admin_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAdmin(userData.role === 'admin' || userData.role === 'super_admin');
          setLoading(false);
          isCheckingRef.current = false;
          // Trust localStorage completely - no server verification needed
          return;
        } catch (parseError) {
          localStorage.removeItem('admin_user');
        }
      }

      // Only verify with server if no stored user exists
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          setUser(result.user);
          setIsAdmin(result.user.role === 'admin' || result.user.role === 'super_admin');
          localStorage.setItem('admin_user', JSON.stringify(result.user));
        } else {
          // Server says no auth - clear everything
          setUser(null);
          setIsAdmin(false);
          localStorage.removeItem('admin_user');
        }
      } else {
        // Server error - maintain existing auth state if we have one
        console.log('Auth check failed, maintaining existing state');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // On any error, maintain existing auth state
    } finally {
      setLoading(false);
      isCheckingRef.current = false;
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsAdmin(result.user.role === 'admin' || result.user.role === 'super_admin');
        localStorage.setItem('admin_user', JSON.stringify(result.user));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error: Unable to connect to server' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAdmin(false);
      localStorage.removeItem('admin_user');
    }
  };

  const value = {
    user,
    isAdmin,
    loading,
    login,
    logout,
  };

  return (
    <NeonAuthContext.Provider value={value}>
      {children}
    </NeonAuthContext.Provider>
  );
};

export const useNeonAuth = () => {
  const context = useContext(NeonAuthContext);
  if (context === undefined) {
    throw new Error('useNeonAuth must be used within a NeonAuthProvider');
  }
  return context;
};
