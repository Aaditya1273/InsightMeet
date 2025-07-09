import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// =============================================================================
// CORE UTILITIES
// =============================================================================

/**
 * Combines multiple class names using clsx and tailwind-merge with memoization
 */
const classCache = new Map<string, string>();
export function cn(...inputs: ClassValue[]): string {
  const key = JSON.stringify(inputs);
  if (classCache.has(key)) {
    return classCache.get(key)!;
  }
  
  const result = twMerge(clsx(inputs));
  classCache.set(key, result);
  return result;
}

/**
 * Enhanced ID generator with customizable options
 */
export function generateId(options: {
  prefix?: string;
  length?: number;
  timestamp?: boolean;
  secure?: boolean;
} = {}): string {
  const { prefix = '', length = 12, timestamp = false, secure = false } = options;
  
  let id = '';
  
  if (secure && typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    id = Array.from(array, byte => byte.toString(36)).join('').substring(0, length);
  } else {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  if (timestamp) {
    id = `${Date.now().toString(36)}_${id}`;
  }
  
  return prefix ? `${prefix}_${id}` : id;
}

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Enhanced string truncation with word boundaries and custom ellipsis
 */
export function truncate(
  str: string, 
  length: number, 
  options: {
    ellipsis?: string;
    wordBoundary?: boolean;
    stripHtml?: boolean;
  } = {}
): string {
  const { ellipsis = '...', wordBoundary = true, stripHtml = false } = options;
  
  let text = stripHtml ? str.replace(/<[^>]*>/g, '') : str;
  
  if (text.length <= length) return text;
  
  let truncated = text.substring(0, length);
  
  if (wordBoundary) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > length * 0.8) {
      truncated = truncated.substring(0, lastSpace);
    }
  }
  
  return truncated + ellipsis;
}

/**
 * Advanced string case conversions
 */
export const stringCase = {
  camelCase: (str: string): string => 
    str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : ''),
  
  pascalCase: (str: string): string => {
    const camel = stringCase.camelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  },
  
  kebabCase: (str: string): string =>
    str.replace(/([a-z])([A-Z])/g, '$1-$2')
       .replace(/[\s_]+/g, '-')
       .toLowerCase(),
  
  snakeCase: (str: string): string =>
    str.replace(/([a-z])([A-Z])/g, '$1_$2')
       .replace(/[\s-]+/g, '_')
       .toLowerCase(),
  
  titleCase: (str: string): string =>
    str.replace(/\w\S*/g, txt => 
      txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    ),
  
  sentenceCase: (str: string): string =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
};

/**
 * String validation utilities
 */
export const stringValidation = {
  isEmail: (str: string): boolean => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str),
  
  isUrl: (str: string): boolean => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  },
  
  isUuid: (str: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str),
  
  isPhoneNumber: (str: string): boolean =>
    /^[\+]?[1-9][\d]{0,15}$/.test(str.replace(/[\s\-\(\)]/g, '')),
  
  isStrongPassword: (str: string): boolean =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(str)
};

// =============================================================================
// DATE & TIME UTILITIES
// =============================================================================

/**
 * Comprehensive date formatting with locale support
 */
export function formatDate(
  date: Date | string | number,
  options: {
    format?: 'short' | 'medium' | 'long' | 'full' | 'relative' | 'iso';
    locale?: string;
    timezone?: string;
    includeTime?: boolean;
  } = {}
): string {
  const { format = 'medium', locale = 'en-US', timezone, includeTime = false } = options;
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const formatOptions: Intl.DateTimeFormatOptions = { timeZone: timezone };
  
  if (format === 'relative') {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
  
  if (format === 'iso') {
    return d.toISOString();
  }
  
  const dateStyles: Record<string, Intl.DateTimeFormatOptions['dateStyle']> = {
    short: 'short',
    medium: 'medium',
    long: 'long',
    full: 'full'
  };
  
  formatOptions.dateStyle = dateStyles[format];
  if (includeTime) {
    formatOptions.timeStyle = 'short';
  }
  
  return d.toLocaleDateString(locale, formatOptions);
}

/**
 * Advanced duration formatting
 */
export function formatDuration(
  seconds: number,
  options: {
    format?: 'short' | 'long' | 'compact';
    precision?: number;
    showZero?: boolean;
  } = {}
): string {
  const { format = 'short', precision = 2, showZero = false } = options;
  
  const units = [
    { label: { short: 'y', long: 'year' }, value: 31536000 },
    { label: { short: 'mo', long: 'month' }, value: 2592000 },
    { label: { short: 'd', long: 'day' }, value: 86400 },
    { label: { short: 'h', long: 'hour' }, value: 3600 },
    { label: { short: 'm', long: 'minute' }, value: 60 },
    { label: { short: 's', long: 'second' }, value: 1 }
  ];
  
  const parts = [];
  let remaining = Math.abs(seconds);
  
  for (const unit of units) {
    const count = Math.floor(remaining / unit.value);
    if (count > 0 || (showZero && parts.length === 0)) {
      const label = format === 'long' 
        ? `${unit.label.long}${count !== 1 ? 's' : ''}`
        : unit.label.short;
      
      parts.push(format === 'compact' ? `${count}${label}` : `${count}${format === 'long' ? ' ' : ''}${label}`);
      remaining -= count * unit.value;
    }
    
    if (parts.length >= precision) break;
  }
  
  return parts.length > 0 ? parts.join(format === 'compact' ? '' : ' ') : '0s';
}

// =============================================================================
// PERFORMANCE UTILITIES
// =============================================================================

/**
 * Enhanced debounce with immediate execution option
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: {
    immediate?: boolean;
    maxWait?: number;
  } = {}
): (...args: Parameters<T>) => void {
  const { immediate = false, maxWait } = options;
  let timeout: NodeJS.Timeout | null = null;
  let maxTimeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      maxTimeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    if (maxTimeout) clearTimeout(maxTimeout);
    
    timeout = setTimeout(later, wait);
    
    if (maxWait && !maxTimeout) {
      maxTimeout = setTimeout(() => {
        if (timeout) clearTimeout(timeout);
        later();
      }, maxWait);
    }
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function with trailing execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  const { trailing = true } = options;
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  
  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    
    if (!previous && !trailing) previous = now;
    
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

/**
 * Memoization utility with TTL support
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    ttl?: number;
    maxSize?: number;
    keyFn?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const { ttl, maxSize = 100, keyFn = (...args) => JSON.stringify(args) } = options;
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  
  return ((...args: Parameters<T>) => {
    const key = keyFn(...args);
    const now = Date.now();
    
    if (cache.has(key)) {
      const cached = cache.get(key)!;
      if (!ttl || (now - cached.timestamp) < ttl) {
        return cached.value;
      }
    }
    
    const result = fn(...args);
    
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, { value: result, timestamp: now });
    return result;
  }) as T;
}

// =============================================================================
// DATA UTILITIES
// =============================================================================

/**
 * Safe JSON parsing with schema validation
 */
export function safeJsonParse<T>(
  str: string,
  validator?: (data: any) => data is T
): T | null {
  try {
    const parsed = JSON.parse(str);
    return validator ? (validator(parsed) ? parsed : null) : parsed;
  } catch {
    return null;
  }
}

/**
 * Deep object utilities
 */
export const objectUtils = {
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => objectUtils.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = objectUtils.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  },
  
  deepMerge: <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T => {
    if (!sources.length) return target;
    const source = sources.shift()!;
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {} as any;
        }
        objectUtils.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key] as any;
      }
    }
    
    return objectUtils.deepMerge(target, ...sources);
  },
  
  get: (obj: any, path: string, defaultValue?: any): any => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      result = result?.[key];
      if (result === undefined) return defaultValue;
    }
    
    return result;
  },
  
  set: (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
};

/**
 * Array utilities with performance optimizations
 */
export const arrayUtils = {
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
  
  unique: <T>(array: T[], keyFn?: (item: T) => any): T[] => {
    if (!keyFn) return [...new Set(array)];
    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
  
  groupBy: <T, K extends string | number | symbol>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> => {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  },
  
  shuffle: <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
};

// =============================================================================
// FILE & FORMAT UTILITIES
// =============================================================================

/**
 * Enhanced file size formatting with binary/decimal options
 */
export function formatFileSize(
  bytes: number,
  options: {
    binary?: boolean;
    precision?: number;
    longForm?: boolean;
  } = {}
): string {
  const { binary = false, precision = 2, longForm = false } = options;
  
  if (bytes === 0) return '0 Bytes';
  
  const k = binary ? 1024 : 1000;
  const sizes = binary
    ? (longForm ? ['Bytes', 'Kibibytes', 'Mebibytes', 'Gibibytes', 'Tebibytes'] 
                : ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'])
    : (longForm ? ['Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes'] 
                : ['Bytes', 'KB', 'MB', 'GB', 'TB']);
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  
  return `${size.toFixed(precision)} ${sizes[i]}`;
}

/**
 * MIME type detection from file extension
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    // Documents
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Text
    txt: 'text/plain', csv: 'text/csv', json: 'application/json',
    xml: 'application/xml', html: 'text/html', css: 'text/css',
    js: 'application/javascript', ts: 'application/typescript',
    // Audio/Video
    mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4',
    avi: 'video/x-msvideo', mov: 'video/quicktime',
    // Archives
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    tar: 'application/x-tar', gz: 'application/gzip'
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Advanced color utilities
 */
export const colorUtils = {
  /**
   * Generate random color with constraints
   */
  random: (options: {
    format?: 'hex' | 'rgb' | 'hsl';
    alpha?: boolean;
    brightness?: 'light' | 'dark' | 'any';
  } = {}): string => {
    const { format = 'hex', alpha = false, brightness = 'any' } = options;
    
    let r = Math.floor(Math.random() * 256);
    let g = Math.floor(Math.random() * 256);
    let b = Math.floor(Math.random() * 256);
    
    if (brightness === 'light') {
      r = Math.max(r, 128);
      g = Math.max(g, 128);
      b = Math.max(b, 128);
    } else if (brightness === 'dark') {
      r = Math.min(r, 127);
      g = Math.min(g, 127);
      b = Math.min(b, 127);
    }
    
    const a = alpha ? Math.random() : 1;
    
    switch (format) {
      case 'rgb':
        return alpha ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` : `rgb(${r}, ${g}, ${b})`;
      case 'hsl':
        const [h, s, l] = colorUtils.rgbToHsl(r, g, b);
        return alpha ? `hsla(${h}, ${s}%, ${l}%, ${a.toFixed(2)})` : `hsl(${h}, ${s}%, ${l}%)`;
      default:
        const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
        return `#${hex}`;
    }
  },
  
  /**
   * Convert RGB to HSL
   */
  rgbToHsl: (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  },
  
  /**
   * Get contrasting color (black or white)
   */
  getContrast: (color: string): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
};

// =============================================================================
// ASYNC UTILITIES
// =============================================================================

/**
 * Enhanced sleep with cancellation support
 */
export function sleep(ms: number): Promise<void> & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout;
  let cancelled = false;
  
  const promise = new Promise<void>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (!cancelled) resolve();
    }, ms);
  });
  
  (promise as any).cancel = () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };
  
  return promise as Promise<void> & { cancel: () => void };
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoff?: 'linear' | 'exponential';
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoff = 'exponential',
    shouldRetry = () => true
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }
      
      const delay = backoff === 'exponential' 
        ? Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
        : Math.min(baseDelay * attempt, maxDelay);
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Input sanitization utilities
 */
export const sanitize = {
  html: (input: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return input.replace(/[&<>"'/]/g, s => map[s]);
  },
  
  sql: (input: string): string => {
    return input.replace(/['";\\]/g, '\\$&');
  },
  
  filename: (input: string): string => {
    return input.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  }
};

/**
 * Form validation helpers
 */
export const validators = {
  required: (value: any) => value !== null && value !== undefined && value !== '',
  minLength: (min: number) => (value: string) => value.length >= min,
  maxLength: (max: number) => (value: string) => value.length <= max,
  pattern: (regex: RegExp) => (value: string) => regex.test(value),
  email: (value: string) => stringValidation.isEmail(value),
  url: (value: string) => stringValidation.isUrl(value),
  number: (value: any) => !isNaN(Number(value)),
  integer: (value: any) => Number.isInteger(Number(value)),
  positive: (value: number) => value > 0,
  negative: (value: number) => value < 0,
  range: (min: number, max: number) => (value: number) => value >= min && value <= max
};

// =============================================================================
// ENVIRONMENT UTILITIES
// =============================================================================

/**
 * Environment detection utilities
 */
export const environment = {
  isBrowser: typeof window !== 'undefined',
  isNode: typeof process !== 'undefined' && process.versions?.node,
  isWorker: typeof importScripts === 'function',
  isMobile: typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent),
  isTouch: typeof window !== 'undefined' && 'ontouchstart' in window,
  isDarkMode: typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  isOnline: typeof navigator !== 'undefined' && navigator.onLine,
  
  getViewport: () => ({
    width: window.innerWidth,
    height: window.innerHeight
  }),
  
  getDevicePixelRatio: () => window.devicePixelRatio || 1,
  
  supportsWebP: () => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
};

// =============================================================================
// EXPORT ENHANCED UTILITIES
// =============================================================================

export const utils = {
  // Core
  cn,
  generateId,
  
  // String
  truncate,
  ...stringCase,
  stringValidation,
  
  // Date
  formatDate,
  formatDuration,
  
  // Performance
  debounce,
  throttle,
  memoize,
  
  // Data
  safeJsonParse,
  objectUtils,
  arrayUtils,
  
  // File
  formatFileSize,
  getMimeType,
  
  // Color
  colorUtils,
  
  // Async
  sleep,
  retry,
  withTimeout,
  
  // Validation
  sanitize,
  validators,
  
  // Environment
  environment
};

export default utils;