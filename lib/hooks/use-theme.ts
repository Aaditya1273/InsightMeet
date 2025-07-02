'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isMounted, setIsMounted] = useState(false);

  // Get the current theme from localStorage or system preference
  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    
    if (storedTheme) {
      setThemeState(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('system');
    }
  }, []);

  // Apply the theme class to the document element
  useEffect(() => {
    if (!isMounted) return;

    const root = window.document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark');
    
    // Determine the effective theme
    let effectiveTheme: 'light' | 'dark';
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effectiveTheme = theme;
    }
    
    // Apply the effective theme
    root.classList.add(effectiveTheme);
    root.style.colorScheme = effectiveTheme;
    
    // Save the theme preference
    if (theme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  }, [theme, isMounted]);

  // Handle system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = window.document.documentElement;
      const isDark = mediaQuery.matches;
      
      root.classList.remove('light', 'dark');
      root.classList.add(isDark ? 'dark' : 'light');
      root.style.colorScheme = isDark ? 'dark' : 'light';
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    setTheme: (newTheme: Theme) => {
      setThemeState(newTheme);
    },
    isDark: isMounted 
      ? theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      : false,
    isMounted,
  };
}
