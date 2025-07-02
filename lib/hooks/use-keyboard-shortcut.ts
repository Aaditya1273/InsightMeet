'use client';

import { useEffect, useCallback, useRef } from 'react';

type KeyCombo = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
};

type ShortcutHandler = (event: KeyboardEvent) => void;

type ShortcutMap = Record<string, {
  handler: ShortcutHandler;
  description: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}>;

/**
 * A custom hook that handles keyboard shortcuts with support for key combinations.
 * @param shortcuts - An object mapping key combinations to their handlers and metadata
 * @param options - Configuration options for the keyboard shortcuts
 * @param options.enabled - Whether the keyboard shortcuts are currently active (default: true)
 * @param options.target - The target element to attach the event listener to (default: document)
 */
export function useKeyboardShortcut(
  shortcuts: ShortcutMap,
  options: {
    enabled?: boolean;
    target?: HTMLElement | Document | Window | null;
  } = {}
) {
  const { enabled = true, target = typeof document !== 'undefined' ? document : null } = options;
  const shortcutsRef = useRef(shortcuts);
  const enabledRef = useRef(enabled);

  // Update the shortcuts ref when the shortcuts prop changes
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Update the enabled ref when the enabled prop changes
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Parse a key combination string into a KeyCombo object
  const parseKeyCombo = useCallback((combo: string): KeyCombo => {
    const keys = combo.toLowerCase().split('+').map(key => key.trim());
    
    const result: KeyCombo = { key: '' };
    
    for (const key of keys) {
      switch (key) {
        case 'ctrl':
          result.ctrlKey = true;
          break;
        case 'shift':
          result.shiftKey = true;
          break;
        case 'alt':
          result.altKey = true;
          break;
        case 'cmd':
        case 'meta':
          result.metaKey = true;
          break;
        default:
          result.key = key.toLowerCase();
      }
    }
    
    return result;
  }, []);

  // Check if the current key event matches the given key combination
  const matchesCombo = useCallback((event: KeyboardEvent, combo: KeyCombo): boolean => {
    return (
      event.key.toLowerCase() === combo.key &&
      !!event.ctrlKey === !!combo.ctrlKey &&
      !!event.shiftKey === !!combo.shiftKey &&
      !!event.altKey === !!combo.altKey &&
      !!event.metaKey === !!combo.metaKey
    );
  }, []);

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current) return;
    
    // Skip if typing in an input, textarea, or contenteditable element
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Check each shortcut
    for (const [comboStr, { handler, preventDefault = true, stopPropagation = false }] of Object.entries(shortcutsRef.current)) {
      const combo = parseKeyCombo(comboStr);
      
      if (matchesCombo(event, combo)) {
        if (preventDefault) {
          event.preventDefault();
        }
        
        if (stopPropagation) {
          event.stopPropagation();
        }
        
        handler(event);
        break; // Only trigger one shortcut per key press
      }
    }
  }, [matchesCombo, parseKeyCombo]);

  // Add and remove the event listener
  useEffect(() => {
    if (!target) return;
    
    const currentTarget = target as HTMLElement | Document | Window;
    
    currentTarget.addEventListener('keydown', handleKeyDown);
    
    return () => {
      currentTarget.removeEventListener('keydown', handleKeyDown);
    };
  }, [target, handleKeyDown]);
}

/**
 * A higher-order hook that creates a keyboard shortcut handler.
 * @param combo - The key combination (e.g., 'ctrl+s', 'cmd+shift+p')
 * @param handler - The function to call when the shortcut is triggered
 * @param options - Additional options for the shortcut
 * @param options.enabled - Whether the shortcut is currently active (default: true)
 * @param options.preventDefault - Whether to prevent default browser behavior (default: true)
 * @param options.stopPropagation - Whether to stop event propagation (default: false)
 * @param options.target - The target element to attach the event listener to (default: document)
 */
export function useShortcut(
  combo: string,
  handler: ShortcutHandler,
  options: {
    enabled?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
    target?: HTMLElement | Document | Window | null;
    description?: string;
  } = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    target,
    description = '',
  } = options;

  useKeyboardShortcut(
    {
      [combo]: {
        handler,
        preventDefault,
        stopPropagation,
        description,
      },
    },
    { enabled, target }
  );
}

// Export a mock version for testing or SSR
export const mockUseKeyboardShortcut = () => {};
export const mockUseShortcut = () => {};

// Export the appropriate version based on the environment
const isClient = typeof window !== 'undefined';
export default {
  useKeyboardShortcut: isClient ? useKeyboardShortcut : mockUseKeyboardShortcut,
  useShortcut: isClient ? useShortcut : mockUseShortcut,
};
