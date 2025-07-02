'use client';

import { RefObject, useEffect, useRef } from 'react';

type Event = MouseEvent | TouchEvent | KeyboardEvent;
type Handler = (event: Event) => void;
type Refs = RefObject<HTMLElement | null>[];

type UseClickOutsideOptions = {
  /**
   * The event type to listen for. Defaults to 'mousedown' and 'touchstart'.
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
   * Whether to listen for the Escape key. Defaults to true.
   */
  listenForEscape?: boolean;
};

/**
 * A custom hook that triggers a handler when a click or touch event occurs outside of the specified element(s).
 * Also supports the Escape key to trigger the handler.
 * 
 * @param options - Configuration options for the hook
 */
export function useClickOutside({
  eventType: initialEventType = ['mousedown', 'touchstart'],
  enabled = true,
  handler,
  refs,
  listenForEscape = true,
}: UseClickOutsideOptions) {
  const handlerRef = useRef(handler);
  const enabledRef = useRef(enabled);
  const refsRef = useRef(refs);

  // Update the refs when they change
  useEffect(() => {
    refsRef.current = refs;
  }, [refs]);

  // Update the handler ref when the handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Update the enabled ref when the enabled prop changes
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Normalize event types to an array
  const eventTypes = Array.isArray(initialEventType)
    ? initialEventType
    : [initialEventType];

  // Check if the click is outside the refs
  const isOutside = (event: Event) => {
    const target = event.target as Node;
    
    // Check if the target is contained within any of the refs
    return refsRef.current.every(ref => {
      const element = ref.current;
      return element && !element.contains(target);
    });
  };

  // Handle click/touch events
  const handleEvent = (event: Event) => {
    if (!enabledRef.current) return;
    
    // Check if the click is outside all the refs
    if (isOutside(event)) {
      handlerRef.current(event);
    }
  };

  // Handle Escape key press
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!enabledRef.current || !listenForEscape) return;
    
    if (event.key === 'Escape') {
      handlerRef.current(event);
    }
  };

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;

    // Add event listeners for each event type
    eventTypes.forEach(eventType => {
      document.addEventListener(eventType, handleEvent as EventListener);
    });

    // Add keydown listener for Escape key if enabled
    if (listenForEscape) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Clean up event listeners
    return () => {
      eventTypes.forEach(eventType => {
        document.removeEventListener(eventType, handleEvent as EventListener);
      });
      
      if (listenForEscape) {
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [enabled, eventTypes, listenForEscape]);
}

// Export a mock version for testing or SSR
export const mockUseClickOutside = () => {};

// Export the appropriate version based on the environment
export default typeof document !== 'undefined' ? useClickOutside : mockUseClickOutside;
