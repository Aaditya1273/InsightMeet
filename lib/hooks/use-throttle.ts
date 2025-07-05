import { useCallback, useRef } from 'react';

/**
 * A hook that creates a throttled version of a callback function.
 * @param callback - The function to throttle
 * @param delay - The delay in milliseconds between executions
 * @returns A throttled version of the callback function
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}
