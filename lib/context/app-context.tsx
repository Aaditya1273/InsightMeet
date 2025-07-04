'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/hooks/use-theme';
import { useApi } from '@/lib/hooks/use-api';
import { toast } from 'sonner';

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

type AppContextType = {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  isDark: boolean;
  isMounted: boolean;
  toggleTheme: () => void;
  
  // Auth
  auth: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  
  // UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Toast
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

type AppProviderProps = {
  children: ReactNode;
  initialUser?: User | null;
};

export function AppProvider({ children, initialUser = null }: AppProviderProps) {
  const router = useRouter();
  const { theme, setTheme: setThemeState, isMounted } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [auth, setAuth] = useState<AuthState>({
    user: initialUser,
    isAuthenticated: !!initialUser,
    isLoading: false,
    error: null,
  });
  
  const { post } = useApi();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuth(prev => ({ ...prev, isLoading: true }));
        
        // In a real app, you would validate the token with the server
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        
        if (token && userJson) {
          const user = JSON.parse(userJson);
          setAuth({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          setAuth({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setAuth({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Failed to initialize authentication',
        });
      }
    };
    
    initializeAuth();
  }, []);

  // Handle login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: null }));
      
      // In a real app, you would make an API call to your authentication endpoint
      // const { data, error } = await post('/auth/login', { email, password });
      
      // Mock API response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful login
      const mockUser: User = {
        id: 'user-123',
        name: 'John Doe',
        email,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // In a real app, you would store the token in an HTTP-only cookie
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      setAuth({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      toast.success('Logged in successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuth(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      return false;
    }
  };

  // Handle registration
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: null }));
      
      // In a real app, you would make an API call to your registration endpoint
      // const { data, error } = await post('/auth/register', { name, email, password });
      
      // Mock API response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful registration
      const mockUser: User = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        name,
        email,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // In a real app, you would store the token in an HTTP-only cookie
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      setAuth({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      toast.success('Account created successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setAuth(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      return false;
    }
  };

  // Handle logout
  const logout = () => {
    // In a real app, you would also make an API call to invalidate the token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setAuth({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    
    // Redirect to login page
    router.push('/login');
    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!auth.user) return false;
    
    try {
      setAuth(prev => ({ ...prev, isLoading: true, error: null }));
      
      // In a real app, you would make an API call to update the user profile
      // const { data, error } = await patch('/users/me', updates);
      
      // Mock API response
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedUser = { ...auth.user, ...updates, updatedAt: new Date().toISOString() };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setAuth(prev => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
      }));
      
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setAuth(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      return false;
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    setThemeState(theme === 'dark' ? 'light' : 'dark');
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Show toast message
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'warning':
        toast.warning(message);
        break;
      default:
        toast.info(message);
    }
  };

  // Context value
  const value = {
    // Theme
    theme,
    setTheme: setThemeState,
    isDark: isDarkMode,
    isMounted,
    toggleTheme,
    auth,
    login,
    register,
    logout,
    updateProfile,
    isSidebarOpen,
    toggleSidebar,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
