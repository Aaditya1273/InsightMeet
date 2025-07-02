'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useThrottle } from './use-throttle';

type UseInfiniteScrollOptions = {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | Document | null;
  enabled?: boolean;
  direction?: 'vertical' | 'horizontal';
  initialLoad?: boolean;
  triggerOnce?: boolean;
};

type UseInfiniteScrollResult = {
  loadMoreRef: (node: Element | null) => void;
  isLoading: boolean;
  hasMore: boolean;
  error: Error | null;
  reset: () => void;
};

/**
 * A custom hook that implements infinite scroll functionality using Intersection Observer.
 * @param fetchMore - Function to call when more data should be loaded
 * @param options - Configuration options for the infinite scroll
 * @returns An object containing refs and state for the infinite scroll
 */
export function useInfiniteScroll<T>(
  fetchMore: (page: number) => Promise<T[] | undefined>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    root = null,
    enabled = true,
    direction = 'vertical',
    initialLoad = true,
    triggerOnce = false,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<Element | null>(null);
  const isInitialMount = useRef(true);
  const hasTriggered = useRef(false);

  // Throttle the fetch more function to prevent rapid firing
  const throttledFetchMore = useThrottle(async () => {
    if (!enabled || isLoading || !hasMore) return;

    try {
      setIsLoading(true);
      setError(null);

      const newItems = await fetchMore(page);

      if (newItems === undefined || newItems.length === 0) {
        setHasMore(false);
      } else {
        setPage(prev => prev + 1);
      }

      // If triggerOnce is true, mark that we've triggered once
      if (triggerOnce) {
        hasTriggered.current = true;
      }
    } catch (err) {
      console.error('Error in infinite scroll:', err);
      setError(err instanceof Error ? err : new Error('Failed to load more items'));
    } finally {
      setIsLoading(false);
    }
  }, 300);

  // Handle the intersection observer callback
  const handleIntersect: IntersectionObserverCallback = useCallback(
    ([entry]) => {
      if (
        entry.isIntersecting &&
        !isLoading &&
        hasMore &&
        enabled &&
        (!triggerOnce || !hasTriggered.current)
      ) {
        throttledFetchMore();
      }
    },
    [isLoading, hasMore, enabled, triggerOnce, throttledFetchMore]
  );

  // Set up the intersection observer
  const setLoadMoreRef = useCallback(
    (node: Element | null) => {
      if (!enabled) return;

      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // If we have a new node to observe
      if (node) {
        loadMoreRef.current = node;

        // Create new observer
        observerRef.current = new IntersectionObserver(handleIntersect, {
          root,
          rootMargin,
          threshold,
        });

        // Start observing the node
        observerRef.current.observe(node);
      }
    },
    [enabled, handleIntersect, root, rootMargin, threshold]
  );

  // Initial load
  useEffect(() => {
    if (initialLoad && isInitialMount.current && enabled) {
      throttledFetchMore();
      isInitialMount.current = false;
    }
  }, [enabled, initialLoad, throttledFetchMore]);

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Reset the infinite scroll state
  const reset = useCallback(() => {
    setPage(0);
    setHasMore(true);
    setError(null);
    hasTriggered.current = false;
    isInitialMount.current = true;
  }, []);

  return {
    loadMoreRef: setLoadMoreRef,
    isLoading,
    hasMore,
    error,
    reset,
  };
}

// Helper hook to throttle function calls
function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecuted.current;

      const execute = () => {
        lastExecuted.current = now;
        callback(...args);
      };

      if (timeSinceLastExecution >= delay) {
        execute();
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          execute();
        }, delay - timeSinceLastExecution);
      }
    },
    [callback, delay]
  );
}

// Export a mock version for testing or SSR
export const mockUseInfiniteScroll = (): UseInfiniteScrollResult => ({
  loadMoreRef: () => {},
  isLoading: false,
  hasMore: false,
  error: null,
  reset: () => {},
});

// Export the appropriate version based on the environment
export default typeof window !== 'undefined' ? useInfiniteScroll : mockUseInfiniteScroll;
