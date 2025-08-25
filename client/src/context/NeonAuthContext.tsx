import React, { createContext, useContext, useEffect, useState } from 'react';

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

  useEffect(() => {
    // Check if user is logged in on app start
    checkAuthStatus();
    
    // Reduce refresh frequency to 15 minutes for super stable sessions
    const refreshInterval = setInterval(() => {
      if (user) {
        checkAuthStatus();
      }
    }, 900000); // 15 minutes
    
    return () => clearInterval(refreshInterval);
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      // First check localStorage for immediate UI response
      const storedUser = localStorage.getItem('admin_user');
      if (storedUser && !user) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAdmin(userData.role === 'admin' || userData.role === 'super_admin');
          
          // For super stable sessions, trust localStorage more
          setLoading(false);
          return; // Skip server verification for stored users
        } catch (parseError) {
          localStorage.removeItem('admin_user');
        }
      }

      // Only verify with backend on first load or when no stored user
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
        }
      }
      // Never clear auth on errors - maintain existing state
    } catch (error) {
      console.error('Auth check failed:', error);
      // On any error, maintain existing auth state
      if (storedUser && !user) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAdmin(userData.role === 'admin' || userData.role === 'super_admin');
        } catch (parseError) {
          // Only clear on parse errors
          localStorage.removeItem('admin_user');
        }
      }
    } finally {
      setLoading(false);
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
        setIsAdmin(result.user.role === 'admin');
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