'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

// Enhanced theme types with comprehensive options
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeConfig {
  storageKey?: string;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  enableTransitions?: boolean;
  transitionDuration?: number;
  disableTransitionOnChange?: boolean;
}

export interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
  isMounted: boolean;
  config: Required<ThemeConfig>;
}

// Default configuration
const DEFAULT_CONFIG: Required<ThemeConfig> = {
  storageKey: 'theme',
  attribute: 'data-theme',
  defaultTheme: 'system',
  enableSystem: true,
  enableTransitions: true,
  transitionDuration: 300,
  disableTransitionOnChange: false,
};

// Utility functions
const getSystemTheme = (): ResolvedTheme => 
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const getStoredTheme = (storageKey: string): Theme | null => {
  try {
    return (typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null) as Theme | null;
  } catch {
    return null;
  }
};

const setStoredTheme = (storageKey: string, theme: Theme): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, theme);
    }
  } catch {
    // Silently fail if localStorage is not available
  }
};

const removeStoredTheme = (storageKey: string): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  } catch {
    // Silently fail if localStorage is not available
  }
};

// Enhanced theme hook with advanced features
export function useTheme(userConfig: ThemeConfig = {}): ThemeState {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...userConfig }), [userConfig]);
  
  // State management
  const [theme, setThemeState] = useState<Theme>(config.defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');
  const [isMounted, setIsMounted] = useState(false);
  
  // Refs for performance optimization
  const mediaQueryRef = useRef<MediaQueryList | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousThemeRef = useRef<Theme | null>(null);

  // Memoized computed values
  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') {
      return systemTheme;
    }
    return theme as ResolvedTheme;
  }, [theme, systemTheme]);

  const isDark = useMemo(() => resolvedTheme === 'dark', [resolvedTheme]);
  const isLight = useMemo(() => resolvedTheme === 'light', [resolvedTheme]);
  const isSystem = useMemo(() => theme === 'system', [theme]);

  // Optimized theme application function
  const applyTheme = useCallback((newTheme: Theme, systemTheme: ResolvedTheme) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const effectiveTheme = newTheme === 'system' ? systemTheme : newTheme;
    
    // Handle transitions
    if (config.enableTransitions && config.disableTransitionOnChange) {
      root.style.setProperty('--theme-transition', 'none');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        root.style.removeProperty('--theme-transition');
      }, config.transitionDuration);
    }

    // Apply theme classes and attributes
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    root.setAttribute(config.attribute, effectiveTheme);
    root.style.colorScheme = effectiveTheme;

    // Handle storage
    if (newTheme === 'system') {
      removeStoredTheme(config.storageKey);
    } else {
      setStoredTheme(config.storageKey, newTheme);
    }

    // Dispatch custom event for external listeners
    const event = new CustomEvent('themechange', {
      detail: { theme: newTheme, resolvedTheme: effectiveTheme }
    });
    window.dispatchEvent(event);
  }, [config]);

  // System theme change handler
  const handleSystemThemeChange = useCallback((e: MediaQueryListEvent) => {
    const newSystemTheme = e.matches ? 'dark' : 'light';
    setSystemTheme(newSystemTheme);
    
    // Only apply if current theme is system
    if (theme === 'system') {
      applyTheme('system', newSystemTheme);
    }
  }, [theme, applyTheme]);

  // Theme setter with validation
  const setTheme = useCallback((newTheme: Theme) => {
    if (newTheme === previousThemeRef.current) return;
    
    previousThemeRef.current = newTheme;
    setThemeState(newTheme);
    
    if (isMounted) {
      applyTheme(newTheme, systemTheme);
    }
  }, [isMounted, applyTheme, systemTheme]);

  // Theme toggle function
  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  }, [theme, systemTheme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    const initialSystemTheme = getSystemTheme();
    const storedTheme = getStoredTheme(config.storageKey);
    
    setSystemTheme(initialSystemTheme);
    
    // Determine initial theme
    let initialTheme: Theme;
    if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || (storedTheme === 'system' && config.enableSystem))) {
      initialTheme = storedTheme;
    } else {
      initialTheme = config.defaultTheme;
    }
    
    setThemeState(initialTheme);
    previousThemeRef.current = initialTheme;
    
    // Apply initial theme
    applyTheme(initialTheme, initialSystemTheme);
    
    setIsMounted(true);
  }, [config.storageKey, config.defaultTheme, config.enableSystem, applyTheme]);

  // Set up system theme listener
  useEffect(() => {
    if (!config.enableSystem || typeof window === 'undefined') return;

    mediaQueryRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryRef.current.addEventListener('change', handleSystemThemeChange);

    return () => {
      if (mediaQueryRef.current) {
        mediaQueryRef.current.removeEventListener('change', handleSystemThemeChange);
      }
    };
  }, [config.enableSystem, handleSystemThemeChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Return memoized state object
  return useMemo(() => ({
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
    isSystem,
    isMounted,
    config,
  }), [theme, resolvedTheme, systemTheme, setTheme, toggleTheme, isDark, isLight, isSystem, isMounted, config]);
}

// Theme Provider Context (optional advanced usage)
import { createContext, useContext, ReactNode } from 'react';

// Create context with null as initial value
export const ThemeContext = createContext<ThemeState | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  config?: ThemeConfig;
}

export function ThemeProvider({ children, config }: ThemeProviderProps) {
  const theme = useTheme(config);
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

// Additional utility hooks
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return isMounted ? matches : false;
}

// CSS-in-JS theme utilities
export const createThemeStyles = (config: ThemeConfig = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  return {
    transition: mergedConfig.enableTransitions 
      ? `background-color ${mergedConfig.transitionDuration}ms ease-in-out, color ${mergedConfig.transitionDuration}ms ease-in-out, border-color ${mergedConfig.transitionDuration}ms ease-in-out`
      : 'none',
    colorScheme: 'light dark',
  };
};

// Advanced theme detection and management
export class ThemeManager {
  private static instance: ThemeManager;
  private listeners: Set<(theme: ResolvedTheme) => void> = new Set();
  private currentTheme: ResolvedTheme = 'light';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.currentTheme = getSystemTheme();
      this.setupListeners();
    }
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private setupListeners(): void {
    window.addEventListener('themechange', (e: CustomEvent) => {
      this.currentTheme = e.detail.resolvedTheme;
      this.notifyListeners();
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }

  subscribe(listener: (theme: ResolvedTheme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCurrentTheme(): ResolvedTheme {
    return this.currentTheme;
  }
}

export default useTheme;