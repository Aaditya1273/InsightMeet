'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Types
interface MediaQueryState {
  matches: boolean;
  media: string;
  loading: boolean;
  error: string | null;
}

interface MediaQueryOptions {
  defaultState?: boolean;
  ssr?: boolean;
  debounceMs?: number;
  enablePersistence?: boolean;
  storageKey?: string;
  onMatch?: (matches: boolean) => void;
  onError?: (error: string) => void;
}

interface MediaQueryCache {
  [key: string]: {
    mediaQueryList: MediaQueryList;
    listeners: Set<(matches: boolean) => void>;
    lastValue: boolean;
  };
}

// Utilities
const isClient = typeof window !== 'undefined';
const isSSR = !isClient;

// Global cache for MediaQueryList objects to prevent memory leaks
const mediaQueryCache: MediaQueryCache = {};

// Debounce utility for performance optimization
const debounce = <T extends (...args: any[]) => void>(
  func: T, 
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

// Enhanced storage utility with error handling
const storage = {
  get: (key: string, fallback: boolean = false): boolean => {
    if (isSSR) return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key: string, value: boolean): void => {
    if (isSSR) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silently fail if localStorage is not available
    }
  }
};

// Media query validation
const validateMediaQuery = (query: string): boolean => {
  if (isSSR) return true;
  try {
    window.matchMedia(query);
    return true;
  } catch {
    return false;
  }
};

/**
 * Advanced media query hook with caching, debouncing, and persistence
 * @param query - CSS media query string
 * @param options - Configuration options
 * @returns Media query state object
 */
export function useMediaQuery(
  query: string, 
  options: MediaQueryOptions = {}
): MediaQueryState {
  const {
    defaultState = false,
    ssr = true,
    debounceMs = 0,
    enablePersistence = false,
    storageKey,
    onMatch,
    onError
  } = options;

  // Generate storage key if persistence is enabled
  const persistenceKey = useMemo(() => 
    enablePersistence ? (storageKey || `media-query-${btoa(query)}`) : null,
    [enablePersistence, storageKey, query]
  );

  // Initialize state with SSR support and persistence
  const [state, setState] = useState<MediaQueryState>(() => {
    if (isSSR && !ssr) {
      return { matches: defaultState, media: query, loading: true, error: null };
    }

    if (isSSR) {
      const persistedValue = persistenceKey ? storage.get(persistenceKey, defaultState) : defaultState;
      return { matches: persistedValue, media: query, loading: false, error: null };
    }

    // Validate query
    if (!validateMediaQuery(query)) {
      const error = `Invalid media query: ${query}`;
      onError?.(error);
      return { matches: defaultState, media: query, loading: false, error };
    }

    // Get initial value
    const mediaQueryList = window.matchMedia(query);
    const initialMatches = mediaQueryList.matches;
    
    // Save to persistence if enabled
    if (persistenceKey) {
      storage.set(persistenceKey, initialMatches);
    }

    return { matches: initialMatches, media: query, loading: false, error: null };
  });

  // Refs for cleanup and performance
  const callbackRef = useRef<((matches: boolean) => void) | null>(null);
  const queryRef = useRef(query);

  // Memoized update function with debouncing
  const updateMatches = useCallback((matches: boolean) => {
    setState(prev => {
      if (prev.matches === matches) return prev;
      
      // Persist state if enabled
      if (persistenceKey) {
        storage.set(persistenceKey, matches);
      }
      
      // Trigger callback
      onMatch?.(matches);
      
      return { ...prev, matches, loading: false, error: null };
    });
  }, [persistenceKey, onMatch]);

  // Debounced update function
  const debouncedUpdate = useMemo(() => 
    debounceMs > 0 ? debounce(updateMatches, debounceMs) : updateMatches,
    [updateMatches, debounceMs]
  );

  // Effect for client-side media query handling
  useEffect(() => {
    if (isSSR) return;

    // Validate query on change
    if (!validateMediaQuery(query)) {
      const error = `Invalid media query: ${query}`;
      onError?.(error);
      setState(prev => ({ ...prev, error, loading: false }));
      return;
    }

    // Check if we have a cached MediaQueryList
    if (!mediaQueryCache[query]) {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryCache[query] = {
        mediaQueryList,
        listeners: new Set(),
        lastValue: mediaQueryList.matches
      };
    }

    const cached = mediaQueryCache[query];
    const { mediaQueryList, listeners } = cached;

    // Create listener function
    const listener = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = event instanceof MediaQueryListEvent ? event.matches : event.matches;
      if (cached.lastValue !== matches) {
        cached.lastValue = matches;
        debouncedUpdate(matches);
      }
    };

    // Store reference for cleanup
    callbackRef.current = (matches: boolean) => debouncedUpdate(matches);
    listeners.add(callbackRef.current);

    // Initial check if this is the first listener
    if (listeners.size === 1) {
      listener(mediaQueryList);
    }

    // Add event listener with fallback for older browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', listener);
    } else {
      // @ts-ignore - Legacy browser support
      mediaQueryList.addListener(listener);
    }

    // Cleanup function
    return () => {
      if (callbackRef.current) {
        listeners.delete(callbackRef.current);
      }

      // Remove event listener
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', listener);
      } else {
        // @ts-ignore - Legacy browser support
        mediaQueryList.removeListener(listener);
      }

      // Clean up cache if no more listeners
      if (listeners.size === 0) {
        delete mediaQueryCache[query];
      }
    };
  }, [query, debouncedUpdate, onError]);

  // Update query ref
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  return state;
}

// Advanced preset hooks with optimized breakpoints
export const useIsMobile = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(max-width: 767.98px)', options).matches;

export const useIsTablet = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(min-width: 768px) and (max-width: 1023.98px)', options).matches;

export const useIsDesktop = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(min-width: 1024px)', options).matches;

export const useIsLargeDesktop = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(min-width: 1280px)', options).matches;

export const useIsExtraLargeDesktop = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(min-width: 1536px)', options).matches;

export const useIsPortrait = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(orientation: portrait)', options).matches;

export const useIsLandscape = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(orientation: landscape)', options).matches;

export const usePrefersReducedMotion = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(prefers-reduced-motion: reduce)', options).matches;

export const usePrefersDarkMode = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(prefers-color-scheme: dark)', options).matches;

export const usePrefersHighContrast = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(prefers-contrast: high)', options).matches;

export const useSupportsHover = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(hover: hover)', options).matches;

export const useIsTouchDevice = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(pointer: coarse)', options).matches;

export const useIsRetina = (options?: MediaQueryOptions): boolean => 
  useMediaQuery('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)', options).matches;

// Multi-query hook for complex responsive logic
export function useMultiMediaQuery(
  queries: Record<string, string>, 
  options?: MediaQueryOptions
): Record<string, boolean> {
  const results = useMemo(() => {
    const initialState: Record<string, boolean> = {};
    Object.keys(queries).forEach(key => {
      initialState[key] = false;
    });
    return initialState;
  }, [queries]);

  const [matches, setMatches] = useState(results);

  useEffect(() => {
    const updates: Record<string, boolean> = {};
    let hasChanges = false;

    Object.entries(queries).forEach(([key, query]) => {
      const { matches: queryMatches } = useMediaQuery(query, options);
      updates[key] = queryMatches;
      if (matches[key] !== queryMatches) {
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setMatches(updates);
    }
  }, [queries, options, matches]);

  return matches;
}

// Breakpoint system hook
export function useBreakpoint(): {
  breakpoint: string;
  isBelow: (bp: string) => boolean;
  isAbove: (bp: string) => boolean;
  isOnly: (bp: string) => boolean;
} {
  const breakpoints = {
    xs: '(max-width: 575.98px)',
    sm: '(min-width: 576px) and (max-width: 767.98px)',
    md: '(min-width: 768px) and (max-width: 991.98px)',
    lg: '(min-width: 992px) and (max-width: 1199.98px)',
    xl: '(min-width: 1200px) and (max-width: 1399.98px)',
    xxl: '(min-width: 1400px)'
  };

  const matches = useMultiMediaQuery(breakpoints);
  
  const currentBreakpoint = useMemo(() => {
    const activeBreakpoint = Object.entries(matches).find(([_, isMatch]) => isMatch);
    return activeBreakpoint ? activeBreakpoint[0] : 'xs';
  }, [matches]);

  const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  const isBelow = useCallback((bp: string) => {
    const targetIndex = breakpointOrder.indexOf(bp);
    return targetIndex !== -1 && currentIndex < targetIndex;
  }, [currentIndex]);

  const isAbove = useCallback((bp: string) => {
    const targetIndex = breakpointOrder.indexOf(bp);
    return targetIndex !== -1 && currentIndex > targetIndex;
  }, [currentIndex]);

  const isOnly = useCallback((bp: string) => {
    return currentBreakpoint === bp;
  }, [currentBreakpoint]);

  return {
    breakpoint: currentBreakpoint,
    isBelow,
    isAbove,
    isOnly
  };
}

// Performance monitoring hook
export function useMediaQueryPerformance(): {
  activeQueries: number;
  cacheSize: number;
  clearCache: () => void;
} {
  const [stats, setStats] = useState({
    activeQueries: 0,
    cacheSize: 0
  });

  useEffect(() => {
    const updateStats = () => {
      setStats({
        activeQueries: Object.values(mediaQueryCache).reduce(
          (sum, cache) => sum + cache.listeners.size, 0
        ),
        cacheSize: Object.keys(mediaQueryCache).length
      });
    };

    const interval = setInterval(updateStats, 1000);
    updateStats();

    return () => clearInterval(interval);
  }, []);

  const clearCache = useCallback(() => {
    Object.keys(mediaQueryCache).forEach(key => {
      delete mediaQueryCache[key];
    });
    setStats({ activeQueries: 0, cacheSize: 0 });
  }, []);

  return { ...stats, clearCache };
}

// Mock version for testing
export const mockUseMediaQuery = (
  query: string, 
  options: MediaQueryOptions = {}
): MediaQueryState => ({
  matches: options.defaultState || false,
  media: query,
  loading: false,
  error: null
});

// Default export with environment detection
export default isClient ? useMediaQuery : mockUseMediaQuery;