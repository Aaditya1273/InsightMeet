'use client';

import { useState, useEffect } from 'react';
import { isClient } from '@/lib/utils';

/**
 * A custom hook that tracks the state of a CSS media query.
 * @param query - The media query to evaluate (e.g., '(min-width: 768px)').
 * @param defaultState - The default state to use during SSR or before the component mounts.
 * @returns A boolean indicating whether the media query matches.
 */
export function useMediaQuery(query: string, defaultState: boolean = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (!isClient) return defaultState;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!isClient) return;

    const mediaQueryList = window.matchMedia(query);
    
    // Update state with current match value
    const updateMatches = (event: MediaQueryListEvent | MediaQueryList) => {
      setMatches('matches' in event ? event.matches : event.matches);
    };

    // Initial check
    updateMatches(mediaQueryList);

    // Add event listener for changes
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updateMatches);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(updateMatches);
    }

    // Clean up
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', updateMatches);
      } else {
        mediaQueryList.removeListener(updateMatches);
      }
    };
  }, [query]);

  return matches;
}

// Common media query presets
export const useIsMobile = (): boolean => 
  useMediaQuery('(max-width: 767px)');

export const useIsTablet = (): boolean => 
  useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

export const useIsDesktop = (): boolean => 
  useMediaQuery('(min-width: 1024px)');

export const useIsLargeDesktop = (): boolean => 
  useMediaQuery('(min-width: 1280px)');

export const useIsPortrait = (): boolean => 
  useMediaQuery('(orientation: portrait)');

export const useIsLandscape = (): boolean => 
  useMediaQuery('(orientation: landscape)');

export const usePrefersReducedMotion = (): boolean => 
  useMediaQuery('(prefers-reduced-motion: reduce)');

export const usePrefersDarkMode = (): boolean => 
  useMediaQuery('(prefers-color-scheme: dark)');

// Export a mock version for testing or SSR
export const mockUseMediaQuery = (): boolean => false;

// Export the appropriate version based on the environment
export default typeof window !== 'undefined' ? useMediaQuery : mockUseMediaQuery;
