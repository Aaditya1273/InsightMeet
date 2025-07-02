'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { isClient } from '@/lib/utils';

type SetValue<T> = T | ((prevValue: T) => T);
type Options = {
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
};

const defaultOptions: Options = {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: Options = {}
): [T, (value: SetValue<T>) => void, () => void] {
  const { serialize, deserialize } = { ...defaultOptions, ...options };
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isClient) {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Keep track of the key to handle key changes
  const prevKeyRef = useRef(key);

  // Update local storage when the key or value changes
  useEffect(() => {
    if (!isClient) return;

    // If the key has changed, update the stored value from the new key
    if (prevKeyRef.current !== key) {
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? deserialize(item) : initialValue);
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        setStoredValue(initialValue);
      }
      prevKeyRef.current = key;
    }

    // Save the current value to local storage
    try {
      window.localStorage.setItem(key, serialize(storedValue));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  }, [key, storedValue, initialValue, serialize]);

  // Handle storage events from other tabs/windows
  useEffect(() => {
    if (!isClient) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;

      try {
        const newValue = event.newValue ? deserialize(event.newValue) : initialValue;
        setStoredValue(newValue);
      } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue, deserialize]);

  // Set a new value in local storage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove the key from local storage
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// Export a mock version for testing or SSR
export const mockUseLocalStorage = <T,>(
  _key: string,
  initialValue: T,
  _options: Options = {}
): [T, (value: SetValue<T>) => void, () => void] => {
  const [value, setValue] = useState<T>(initialValue);
  const removeValue = useCallback(() => setValue(initialValue), [initialValue]);
  return [value, setValue, removeValue];
};

// Export the appropriate version based on the environment
export default typeof window !== 'undefined' ? useLocalStorage : mockUseLocalStorage;
