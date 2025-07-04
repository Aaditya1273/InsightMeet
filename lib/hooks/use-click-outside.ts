'use client';

import React, { RefObject, useEffect, useRef, useCallback, useMemo } from 'react';

// Enhanced type definitions
type Event = MouseEvent | TouchEvent | KeyboardEvent | FocusEvent;
type Handler = (event: Event, context: ClickOutsideContext) => void;
type Refs = RefObject<HTMLElement | null>[];

interface ClickOutsideContext {
  eventType: string;
  targetElement: HTMLElement | null;
  triggeredBy: 'click' | 'touch' | 'escape' | 'focus' | 'custom';
  isOutside: boolean;
  closestRef?: RefObject<HTMLElement | null>;
  distance?: number;
  timestamp: number;
}

interface UseClickOutsideOptions {
  /**
   * The event type(s) to listen for. Supports mouse, touch, keyboard, and focus events.
   */
  eventType?: string | string[];
  
  /**
   * Whether the hook is enabled. Defaults to true.
   */
  enabled?: boolean;
  
  /**
   * Callback to run when a click outside is detected.
   */
  handler: Handler;
  
  /**
   * Ref(s) to the element(s) that should not trigger the handler when clicked.
   */
  refs: Refs;
  
  /**
   * Keys that should trigger the handler. Defaults to ['Escape'].
   */
  triggerKeys?: string[];
  
  /**
   * Whether to prevent default behavior on trigger keys. Defaults to true.
   */
  preventDefaultOnKeys?: boolean;
  
  /**
   * Whether to stop event propagation on trigger keys. Defaults to false.
   */
  stopPropagationOnKeys?: boolean;
  
  /**
   * Delay in milliseconds before triggering the handler. Useful for debouncing.
   */
  delay?: number;
  
  /**
   * Whether to capture events during the capture phase. Defaults to false.
   */
  capture?: boolean;
  
  /**
   * Whether to listen for focus events. Defaults to false.
   */
  listenForFocus?: boolean;
  
  /**
   * Custom condition to determine if an event should trigger the handler.
   */
  customCondition?: (event: Event, context: Partial<ClickOutsideContext>) => boolean;
  
  /**
   * Whether to ignore events from specific elements or selectors.
   */
  ignoreElements?: string[] | HTMLElement[];
  
  /**
   * Whether to enable debug logging. Defaults to false.
   */
  debug?: boolean;
  
  /**
   * Boundary element to constrain the outside detection. Defaults to document.
   */
  boundary?: RefObject<HTMLElement | null>;
  
  /**
   * Whether to use passive event listeners for better performance. Defaults to true.
   */
  passive?: boolean;
  
  /**
   * Whether to trigger on right-click events. Defaults to false.
   */
  includeRightClick?: boolean;
  
  /**
   * Minimum distance in pixels from the ref elements to trigger. Defaults to 0.
   */
  minDistance?: number;
  
  /**
   * Whether to trigger immediately or wait for the next tick. Defaults to false.
   */
  immediate?: boolean;
  
  /**
   * Custom event listener options.
   */
  eventOptions?: AddEventListenerOptions;
}

interface ClickOutsideState {
  isActive: boolean;
  lastEventTimestamp: number;
  eventCount: number;
  debounceTimer: number | null;
}

/**
 * Advanced custom hook that triggers a handler when interactions occur outside specified elements.
 * Supports multiple event types, debouncing, custom conditions, and extensive configuration options.
 */
export function useClickOutside({
  eventType: initialEventType = ['mousedown', 'touchstart'],
  enabled = true,
  handler,
  refs,
  triggerKeys = ['Escape'],
  preventDefaultOnKeys = true,
  stopPropagationOnKeys = false,
  delay = 0,
  capture = false,
  listenForFocus = false,
  customCondition,
  ignoreElements = [],
  debug = false,
  boundary,
  passive = true,
  includeRightClick = false,
  minDistance = 0,
  immediate = false,
  eventOptions = {},
}: UseClickOutsideOptions) {
  // Stable refs for handlers and state
  const handlerRef = useRef(handler);
  const enabledRef = useRef(enabled);
  const refsRef = useRef(refs);
  const stateRef = useRef<ClickOutsideState>({
    isActive: false,
    lastEventTimestamp: 0,
    eventCount: 0,
    debounceTimer: null,
  });

  // Performance optimization: memoize event types
  const eventTypes = useMemo(() => {
    const types = Array.isArray(initialEventType) ? initialEventType : [initialEventType];
    
    // Add focus events if enabled
    if (listenForFocus) {
      types.push('focusin', 'focusout');
    }
    
    return types;
  }, [initialEventType, listenForFocus]);

  // Memoize event listener options
  const listenerOptions = useMemo(() => ({
    capture,
    passive: passive && !preventDefaultOnKeys,
    ...eventOptions,
  }), [capture, passive, preventDefaultOnKeys, eventOptions]);

  // Update refs when they change
  useEffect(() => {
    refsRef.current = refs;
  }, [refs]);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Utility functions
  const log = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[useClickOutside] ${message}`, ...args);
    }
  }, [debug]);

  const calculateDistance = useCallback((event: MouseEvent | TouchEvent, element: HTMLElement): number => {
    const x = 'clientX' in event ? event.clientX : event.touches[0]?.clientX ?? 0;
    const y = 'clientY' in event ? event.clientY : event.touches[0]?.clientY ?? 0;
    
    if (!x || !y) return 0;
    
    const rect = element.getBoundingClientRect();
    
    const dx = Math.max(0, Math.max(rect.left - x, x - rect.right));
    const dy = Math.max(0, Math.max(rect.top - y, y - rect.bottom));
    
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const isElementIgnored = useCallback((target: HTMLElement): boolean => {
    return ignoreElements.some(ignored => {
      if (typeof ignored === 'string') {
        return target.matches(ignored) || target.closest(ignored);
      }
      return ignored.contains(target);
    });
  }, [ignoreElements]);

  const findClosestRef = useCallback((target: HTMLElement): {
    ref?: RefObject<HTMLElement | null>;
    distance: number;
  } => {
    let closestRef: RefObject<HTMLElement | null> | undefined;
    let minDistance = Infinity;

    refsRef.current.forEach(ref => {
      if (ref.current) {
        const distance = calculateDistance({ 
          clientX: 0, 
          clientY: 0,
          target,
        } as any, ref.current);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestRef = ref;
        }
      }
    });

    return { ref: closestRef, distance: minDistance };
  }, [calculateDistance]);

  const isOutsideRefs = useCallback((event: Event): boolean => {
    const target = event.target as HTMLElement;
    
    if (!target) return false;
    
    // Check if target is ignored
    if (isElementIgnored(target)) {
      log('Event ignored due to ignored element');
      return false;
    }
    
    // Check boundary constraint
    if (boundary?.current && !boundary.current.contains(target)) {
      log('Event outside boundary');
      return false;
    }
    
    // Check if target is outside all refs
    const isOutside = refsRef.current.every(ref => {
      const element = ref.current;
      return element && !element.contains(target);
    });
    
    // Check minimum distance requirement
    if (isOutside && minDistance > 0) {
      const { distance } = findClosestRef(target);
      return distance >= minDistance;
    }
    
    return isOutside;
  }, [isElementIgnored, boundary, minDistance, findClosestRef, log]);

  const createContext = useCallback((
    event: Event,
    triggeredBy: ClickOutsideContext['triggeredBy']
  ): ClickOutsideContext => {
    const target = event.target as HTMLElement;
    const isOutside = isOutsideRefs(event);
    const { ref: closestRef, distance } = findClosestRef(target);
    
    return {
      eventType: event.type,
      targetElement: target,
      triggeredBy,
      isOutside,
      closestRef,
      distance,
      timestamp: Date.now(),
    };
  }, [isOutsideRefs, findClosestRef]);

  const executeHandler = useCallback((event: Event, context: ClickOutsideContext) => {
    const execute = () => {
      try {
        handlerRef.current(event, context);
        stateRef.current.eventCount++;
        stateRef.current.lastEventTimestamp = context.timestamp;
        log('Handler executed', context);
      } catch (error) {
        console.error('[useClickOutside] Handler execution failed:', error);
      }
    };

    if (delay > 0) {
      // Clear existing debounce timer
      if (stateRef.current.debounceTimer) {
        clearTimeout(stateRef.current.debounceTimer);
      }
      
      stateRef.current.debounceTimer = window.setTimeout(execute, delay);
    } else if (immediate) {
      execute();
    } else {
      // Next tick execution
      Promise.resolve().then(execute);
    }
  }, [delay, immediate, log]);

  const handleEvent = useCallback((event: Event) => {
    if (!enabledRef.current) return;
    
    // Handle right-click filtering
    if (event instanceof MouseEvent && event.button === 2 && !includeRightClick) {
      return;
    }
    
    const context = createContext(event, 
      event.type.includes('touch') ? 'touch' : 
      event.type.includes('focus') ? 'focus' : 'click'
    );
    
    log('Event detected', { type: event.type, target: event.target });
    
    // Apply custom condition if provided
    if (customCondition && !customCondition(event, context)) {
      log('Event ignored due to custom condition');
      return;
    }
    
    // Check if event is outside refs
    if (context.isOutside) {
      log('Event is outside refs, executing handler');
      executeHandler(event, context);
    }
  }, [includeRightClick, createContext, customCondition, executeHandler, log]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current || !triggerKeys.includes(event.key)) return;
    
    log('Key event detected', { key: event.key });
    
    if (preventDefaultOnKeys) {
      event.preventDefault();
    }
    
    if (stopPropagationOnKeys) {
      event.stopPropagation();
    }
    
    const context = createContext(event, 'escape');
    
    // Apply custom condition if provided
    if (customCondition && !customCondition(event, context)) {
      log('Key event ignored due to custom condition');
      return;
    }
    
    executeHandler(event, context);
  }, [triggerKeys, preventDefaultOnKeys, stopPropagationOnKeys, createContext, customCondition, executeHandler, log]);

  // Enhanced cleanup function
  const cleanup = useCallback(() => {
    if (stateRef.current.debounceTimer) {
      clearTimeout(stateRef.current.debounceTimer);
      stateRef.current.debounceTimer = null;
    }
    
    eventTypes.forEach(eventType => {
      document.removeEventListener(eventType, handleEvent as EventListener, listenerOptions);
    });
    
    if (triggerKeys.length > 0) {
      document.removeEventListener('keydown', handleKeyDown, listenerOptions);
    }
    
    stateRef.current.isActive = false;
    log('Event listeners removed');
  }, [eventTypes, triggerKeys, handleEvent, handleKeyDown, listenerOptions, log]);

  // Main effect for setting up event listeners
  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    // Add event listeners for each event type
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, handleEvent as EventListener, listenerOptions);
    });

    // Add keydown listener for trigger keys
    if (triggerKeys.length > 0) {
      document.addEventListener('keydown', handleKeyDown, listenerOptions);
    }

    stateRef.current.isActive = true;
    log('Event listeners attached', { eventTypes, triggerKeys });

    return cleanup;
  }, [enabled, eventTypes, triggerKeys, handleEvent, handleKeyDown, listenerOptions, cleanup, log]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Return hook state and utilities for advanced usage
  return {
    isActive: stateRef.current.isActive,
    eventCount: stateRef.current.eventCount,
    lastEventTimestamp: stateRef.current.lastEventTimestamp,
    cleanup,
    forceCheck: useCallback((event: Event) => {
      handleEvent(event);
    }, [handleEvent]),
  };
}

// Enhanced context provider for global click outside management
export class ClickOutsideManager {
  private static instance: ClickOutsideManager;
  private activeHooks: Set<string> = new Set();
  private globalListeners: Map<string, EventListener> = new Map();
  
  static getInstance(): ClickOutsideManager {
    if (!ClickOutsideManager.instance) {
      ClickOutsideManager.instance = new ClickOutsideManager();
    }
    return ClickOutsideManager.instance;
  }
  
  register(id: string, handler: EventListener): void {
    this.activeHooks.add(id);
    this.globalListeners.set(id, handler);
  }
  
  unregister(id: string): void {
    this.activeHooks.delete(id);
    this.globalListeners.delete(id);
  }
  
  getActiveHooks(): string[] {
    return Array.from(this.activeHooks);
  }
  
  clear(): void {
    this.activeHooks.clear();
    this.globalListeners.clear();
  }
}

// Higher-order component for click outside functionality
export function withClickOutside<P extends {}>(
  Component: React.ComponentType<P>,
  options: Omit<UseClickOutsideOptions, 'refs' | 'handler'>
): React.ComponentType<P & { onClickOutside?: Handler; clickOutsideRef?: RefObject<HTMLElement> }> {
  return function ClickOutsideWrapper(props: P & { 
    onClickOutside?: Handler;
    clickOutsideRef?: RefObject<HTMLElement>;
  }): React.ReactElement {
    const ref = useRef<HTMLElement>(null);
    const targetRef = props.clickOutsideRef ?? ref;

    useClickOutside({
      ...options,
      refs: [targetRef],
      handler: (event: Event, context: ClickOutsideContext) => {
        if (props.onClickOutside) {
          props.onClickOutside(event, context);
        }
      },
    });
    
    const forwardedRef = useRef<HTMLElement>(null);
    useEffect(() => {
      if (targetRef.current) {
        forwardedRef.current = targetRef.current;
      }
    }, [targetRef]);

    return React.createElement(Component, {
      ...props,
      ref: forwardedRef
    });
  };
}

// Hook for managing multiple click outside instances
export function useClickOutsideManager() {
  const manager = useMemo(() => ClickOutsideManager.getInstance(), []);
  
  return {
    register: manager.register.bind(manager),
    unregister: manager.unregister.bind(manager),
    getActiveHooks: manager.getActiveHooks.bind(manager),
    clear: manager.clear.bind(manager),
  };
}

// Utility hooks for common use cases
export function useModalClickOutside(
  isOpen: boolean,
  onClose: () => void,
  modalRef: RefObject<HTMLElement>
) {
  return useClickOutside({
    enabled: isOpen,
    refs: [modalRef],
    handler: () => onClose(),
    triggerKeys: ['Escape'],
    eventType: ['mousedown', 'touchstart'],
    preventDefaultOnKeys: true,
  });
}

export function useDropdownClickOutside(
  isOpen: boolean,
  onClose: () => void,
  triggerRef: RefObject<HTMLElement>,
  dropdownRef: RefObject<HTMLElement>
) {
  return useClickOutside({
    enabled: isOpen,
    refs: [triggerRef, dropdownRef],
    handler: () => onClose(),
    eventType: ['mousedown', 'touchstart'],
    delay: 100, // Small delay to handle rapid clicks
  });
}

// Mock version for testing and SSR
export const mockUseClickOutside = () => ({
  isActive: false,
  eventCount: 0,
  lastEventTimestamp: 0,
  cleanup: () => {},
  forceCheck: () => {},
});

// Environment-aware export
export default typeof document !== 'undefined' ? useClickOutside : mockUseClickOutside;

// Type exports for external use
export type {
  Event,
  Handler,
  Refs,
  ClickOutsideContext,
  UseClickOutsideOptions,
  ClickOutsideState,
};