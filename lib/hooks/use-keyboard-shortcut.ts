'use client';

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';

// Enhanced types with better flexibility
type ModifierKey = 'ctrl' | 'shift' | 'alt' | 'meta' | 'cmd';
type SpecialKey = 'enter' | 'escape' | 'tab' | 'space' | 'backspace' | 'delete' | 'home' | 'end' | 'pageup' | 'pagedown' | 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright';

type KeyCombo = {
  key: string;
  modifiers: Set<ModifierKey>;
  code?: string; // For better key identification
  sequence?: string[]; // For sequential key combinations
};

type ShortcutContext = {
  event: KeyboardEvent;
  combo: string;
  timestamp: number;
  element: HTMLElement | null;
};

type ShortcutHandler = (context: ShortcutContext) => void | Promise<void>;

type ShortcutConfig = {
  handler: ShortcutHandler;
  description: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  allowInInputs?: boolean;
  priority?: number; // Higher priority shortcuts are checked first
  debounce?: number; // Debounce time in milliseconds
  throttle?: number; // Throttle time in milliseconds
  enabled?: boolean;
  condition?: (event: KeyboardEvent) => boolean; // Custom condition
  category?: string; // For grouping shortcuts
};

type ShortcutMap = Record<string, ShortcutConfig>;

type UseKeyboardShortcutOptions = {
  enabled?: boolean;
  target?: HTMLElement | Document | Window | null;
  capturePhase?: boolean;
  enableSequences?: boolean;
  sequenceTimeout?: number;
  globalMode?: boolean; // Ignore input focus checks
  debug?: boolean;
};

type ShortcutStats = {
  totalShortcuts: number;
  enabledShortcuts: number;
  triggerCount: Record<string, number>;
  lastTriggered: Record<string, number>;
  categories: Record<string, number>;
};

// Performance optimizations
const MODIFIER_KEYS = new Set(['ctrl', 'shift', 'alt', 'meta', 'cmd']);
const SPECIAL_KEYS = new Set(['enter', 'escape', 'tab', 'space', 'backspace', 'delete', 'home', 'end', 'pageup', 'pagedown', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

// Advanced debounce and throttle utilities
const createDebounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

const createThrottle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  let lastCall = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func(...args);
    }
  }) as T;
};

// Trie data structure for efficient shortcut matching
class ShortcutTrie {
  private root: Map<string, any> = new Map();
  
  insert(combo: string, config: ShortcutConfig): void {
    const keys = this.parseCombo(combo);
    let node = this.root;
    
    for (const key of keys) {
      if (!node.has(key)) {
        node.set(key, new Map());
      }
      node = node.get(key);
    }
    
    node.set('__config__', config);
    node.set('__combo__', combo);
  }
  
  search(keys: string[]): { config: ShortcutConfig; combo: string } | null {
    let node = this.root;
    
    for (const key of keys) {
      if (!node.has(key)) {
        return null;
      }
      node = node.get(key);
    }
    
    const config = node.get('__config__');
    const combo = node.get('__combo__');
    
    return config ? { config, combo } : null;
  }
  
  private parseCombo(combo: string): string[] {
    return combo.toLowerCase().split('+').map(k => k.trim()).sort();
  }
}

// Enhanced keyboard shortcut hook
export function useKeyboardShortcut(
  shortcuts: ShortcutMap,
  options: UseKeyboardShortcutOptions = {}
) {
  const {
    enabled = true,
    target = typeof document !== 'undefined' ? document : null,
    capturePhase = false,
    enableSequences = false,
    sequenceTimeout = 1000,
    globalMode = false,
    debug = false,
  } = options;

  const shortcutsRef = useRef<ShortcutMap>(shortcuts);
  const enabledRef = useRef(enabled);
  const sequenceRef = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedHandlers = useRef<Map<string, ShortcutHandler>>(new Map());
  const throttledHandlers = useRef<Map<string, ShortcutHandler>>(new Map());
  const triggerCountRef = useRef<Record<string, number>>({});
  const lastTriggeredRef = useRef<Record<string, number>>({});
  
  const [stats, setStats] = useState<ShortcutStats>({
    totalShortcuts: 0,
    enabledShortcuts: 0,
    triggerCount: {},
    lastTriggered: {},
    categories: {},
  });

  // Build optimized trie for fast lookups
  const shortcutTrie = useMemo(() => {
    const trie = new ShortcutTrie();
    Object.entries(shortcuts).forEach(([combo, config]) => {
      trie.insert(combo, config);
    });
    return trie;
  }, [shortcuts]);

  // Update refs when props change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
    enabledRef.current = enabled;
  }, [shortcuts, enabled]);

  // Update stats
  useEffect(() => {
    const totalShortcuts = Object.keys(shortcuts).length;
    const enabledShortcuts = Object.values(shortcuts).filter(s => s.enabled !== false).length;
    const categories = Object.values(shortcuts).reduce((acc, s) => {
      if (s.category) {
        acc[s.category] = (acc[s.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    setStats({
      totalShortcuts,
      enabledShortcuts,
      triggerCount: triggerCountRef.current,
      lastTriggered: lastTriggeredRef.current,
      categories,
    });
  }, [shortcuts]);

  // Enhanced key combo parser with better normalization
  const parseKeyCombo = useCallback((combo: string): KeyCombo => {
    const parts = combo.toLowerCase().split('+').map(k => k.trim());
    const modifiers = new Set<ModifierKey>();
    let key = '';
    let code = '';
    
    for (const part of parts) {
      if (MODIFIER_KEYS.has(part as ModifierKey)) {
        if (part === 'cmd') {
          modifiers.add('meta');
        } else {
          modifiers.add(part as ModifierKey);
        }
      } else {
        key = part;
        // Map special keys to their proper codes
        if (SPECIAL_KEYS.has(part as SpecialKey)) {
          code = part;
        }
      }
    }
    
    return { key, modifiers, code };
  }, []);

  // Advanced event matching with better accuracy
  const matchesCombo = useCallback((event: KeyboardEvent, combo: KeyCombo): boolean => {
    // Check key or code match
    const keyMatch = event.key.toLowerCase() === combo.key || 
                    (combo.code && event.code.toLowerCase() === combo.code);
    
    if (!keyMatch) return false;
    
    // Check modifiers
    const eventModifiers = new Set<ModifierKey>();
    if (event.ctrlKey) eventModifiers.add('ctrl');
    if (event.shiftKey) eventModifiers.add('shift');
    if (event.altKey) eventModifiers.add('alt');
    if (event.metaKey) eventModifiers.add('meta');
    
    return eventModifiers.size === combo.modifiers.size && 
           [...combo.modifiers].every(mod => eventModifiers.has(mod));
  }, []);

  // Check if element should be ignored
  const shouldIgnoreElement = useCallback((element: HTMLElement): boolean => {
    if (globalMode) return false;
    
    const tagName = element.tagName.toLowerCase();
    const isInput = tagName === 'input' || tagName === 'textarea';
    const isContentEditable = element.isContentEditable;
    const hasRole = element.getAttribute('role') === 'textbox';
    
    return isInput || isContentEditable || hasRole;
  }, [globalMode]);

  // Enhanced handler with context and async support
  const executeHandler = useCallback(async (
    combo: string,
    config: ShortcutConfig,
    event: KeyboardEvent
  ) => {
    const context: ShortcutContext = {
      event,
      combo,
      timestamp: Date.now(),
      element: event.target as HTMLElement,
    };

    // Update statistics
    triggerCountRef.current[combo] = (triggerCountRef.current[combo] || 0) + 1;
    lastTriggeredRef.current[combo] = context.timestamp;

    if (debug) {
      console.log(`🔥 Shortcut triggered: ${combo}`, context);
    }

    // Execute handler
    try {
      await config.handler(context);
    } catch (error) {
      console.error(`Error executing shortcut handler for ${combo}:`, error);
    }
  }, [debug]);

  // Main event handler with optimizations
  const handleKeyDown = useCallback(async (event: KeyboardEvent) => {
    if (!enabledRef.current) return;
    
    const target = event.target as HTMLElement;
    
    // Get all potential shortcuts sorted by priority
    const potentialShortcuts = Object.entries(shortcutsRef.current)
      .filter(([_, config]) => config.enabled !== false)
      .sort(([_, a], [__, b]) => (b.priority || 0) - (a.priority || 0));
    
    for (const [comboStr, config] of potentialShortcuts) {
      // Check custom condition first
      if (config.condition && !config.condition(event)) continue;
      
      // Check if we should ignore this element
      if (!config.allowInInputs && shouldIgnoreElement(target)) continue;
      
      const combo = parseKeyCombo(comboStr);
      
      if (matchesCombo(event, combo)) {
        // Handle event prevention
        if (config.preventDefault !== false) {
          event.preventDefault();
        }
        
        if (config.stopPropagation) {
          event.stopPropagation();
        }
        
        // Handle debouncing
        if (config.debounce) {
          if (!debouncedHandlers.current.has(comboStr)) {
            debouncedHandlers.current.set(
              comboStr,
              createDebounce((context: ShortcutContext) => executeHandler(comboStr, config, context.event), config.debounce)
            );
          }
          const context: ShortcutContext = {
            event,
            combo: comboStr,
            timestamp: Date.now(),
            element: event.target as HTMLElement
          };
          debouncedHandlers.current.get(comboStr)!(context);
        }
        // Handle throttling
        else if (config.throttle) {
          if (!throttledHandlers.current.has(comboStr)) {
            throttledHandlers.current.set(
              comboStr,
              createThrottle((context: ShortcutContext) => executeHandler(comboStr, config, context.event), config.throttle)
            );
          }
          const context: ShortcutContext = {
            event,
            combo: comboStr,
            timestamp: Date.now(),
            element: event.target as HTMLElement
          };
          throttledHandlers.current.get(comboStr)!(context);
        }
        // Normal execution
        else {
          await executeHandler(comboStr, config, event);
        }
        
        return; // Only trigger first matching shortcut
      }
    }
  }, [matchesCombo, parseKeyCombo, shouldIgnoreElement, executeHandler]);

  // Event listener management
  useEffect(() => {
    if (!target) return;
    
    const currentTarget = target as HTMLElement | Document | Window;
    
    currentTarget.addEventListener('keydown', handleKeyDown, capturePhase);
    
    return () => {
      currentTarget.removeEventListener('keydown', handleKeyDown, capturePhase);
      // Clear timeouts
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [target, handleKeyDown, capturePhase]);

  // Return enhanced API
  return {
    stats,
    shortcuts: shortcutsRef.current,
    enabled: enabledRef.current,
    // Utility methods
    getShortcutsByCategory: (category: string) => 
      Object.entries(shortcuts).filter(([_, config]) => config.category === category),
    getShortcutStats: () => stats,
    resetStats: () => {
      triggerCountRef.current = {};
      lastTriggeredRef.current = {};
    },
    isShortcutEnabled: (combo: string) => shortcuts[combo]?.enabled !== false,
  };
}

// Enhanced single shortcut hook
export function useShortcut(
  combo: string,
  handler: ShortcutHandler,
  options: Omit<ShortcutConfig, 'handler'> & UseKeyboardShortcutOptions = {
    description: '',
    enabled: true
  }
) {
  const {
    description = '',
    preventDefault = true,
    stopPropagation = false,
    allowInInputs = false,
    priority = 0,
    debounce,
    throttle,
    enabled = true,
    condition,
    category,
    ...hookOptions
  } = options;

  return useKeyboardShortcut(
    {
      [combo]: {
        handler,
        description,
        preventDefault,
        stopPropagation,
        allowInInputs,
        priority,
        debounce,
        throttle,
        enabled,
        condition,
        category,
      },
    },
    hookOptions
  );
}

// Utility hook for managing shortcut groups
export function useShortcutGroup(
  shortcuts: ShortcutMap,
  options: UseKeyboardShortcutOptions & { groupEnabled?: boolean } = {}
) {
  const { groupEnabled = true, ...restOptions } = options;
  
  const groupedShortcuts = useMemo(() => {
    if (!groupEnabled) return {};
    return shortcuts;
  }, [shortcuts, groupEnabled]);
  
  return useKeyboardShortcut(groupedShortcuts, restOptions);
}

// Context provider for global shortcut management
export function useGlobalShortcuts(shortcuts: ShortcutMap) {
  return useKeyboardShortcut(shortcuts, {
    globalMode: true,
    target: typeof window !== 'undefined' ? window : null,
  });
}

// SSR-safe exports
const isClient = typeof window !== 'undefined';

export const mockUseKeyboardShortcut = () => ({
  stats: { totalShortcuts: 0, enabledShortcuts: 0, triggerCount: {}, lastTriggered: {}, categories: {} },
  shortcuts: {},
  enabled: false,
  getShortcutsByCategory: () => [],
  getShortcutStats: () => ({ totalShortcuts: 0, enabledShortcuts: 0, triggerCount: {}, lastTriggered: {}, categories: {} }),
  resetStats: () => {},
  isShortcutEnabled: () => false,
});

export const mockUseShortcut = () => mockUseKeyboardShortcut();
export const mockUseShortcutGroup = () => mockUseKeyboardShortcut();
export const mockUseGlobalShortcuts = () => mockUseKeyboardShortcut();

// Default exports with SSR safety
export default {
  useKeyboardShortcut: isClient ? useKeyboardShortcut : mockUseKeyboardShortcut,
  useShortcut: isClient ? useShortcut : mockUseShortcut,
  useShortcutGroup: isClient ? useShortcutGroup : mockUseShortcutGroup,
  useGlobalShortcuts: isClient ? useGlobalShortcuts : mockUseGlobalShortcuts,
};

// Type exports for better TypeScript support
export type {
  KeyCombo,
  ShortcutContext,
  ShortcutHandler,
  ShortcutConfig,
  ShortcutMap,
  UseKeyboardShortcutOptions,
  ShortcutStats,
  ModifierKey,
  SpecialKey,
};