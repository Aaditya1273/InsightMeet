import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { config } from '@/lib/config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RetryConfig = {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error, response?: Response) => boolean;
};

type CacheConfig = {
  key?: string;
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
};

type ApiOptions<T> = {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: ProgressEvent) => void;
  showSuccessToast?: boolean | string;
  showErrorToast?: boolean | string;
  timeout?: number;
  retry?: RetryConfig;
  cache?: CacheConfig;
  skipLoading?: boolean;
  transformResponse?: (data: any) => T;
  validateResponse?: (data: any) => boolean;
  auth?: boolean;
  baseURL?: string;
  params?: Record<string, string | number | boolean>;
  responseType?: 'json' | 'blob' | 'text' | 'formData';
  onUploadProgress?: (progress: ProgressEvent) => void;
  onDownloadProgress?: (progress: ProgressEvent) => void;
};

type ApiState<T> = {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isValidating: boolean;
  retryCount: number;
  lastFetch: Date | null;
  progress: number;
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100;

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > entry.ttl * 0.8; // Consider stale at 80% of TTL
  }
}

const apiCache = new ApiCache();

export function useApi<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    isValidating: false,
    retryCount: 0,
    lastFetch: null,
    progress: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const buildUrl = useCallback((endpoint: string, params?: Record<string, string | number | boolean>, baseURL?: string) => {
    const base = baseURL || config.api.baseUrl;
    const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
    
    if (!params) return url;
    
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    
    return `${url}${url.includes('?') ? '&' : '?'}${searchParams}`;
  }, []);

  const getCacheKey = useCallback((endpoint: string, options: ApiOptions<T>) => {
    const key = `${options.method || 'GET'}:${endpoint}`;
    if (options.body) {
      return `${key}:${JSON.stringify(options.body)}`;
    }
    return key;
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const executeWithRetry = useCallback(async (
    fn: () => Promise<Response>,
    retryConfig: RetryConfig = {}
  ): Promise<Response> => {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoffMultiplier = 2,
      retryCondition = (error) => error.name === 'NetworkError' || error.message.includes('fetch')
    } = retryConfig;

    let lastError: Error;
    let currentDelay = delay;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fn();
        
        // Only retry on 5xx errors or specific 4xx errors
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429)) {
          return response;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxAttempts - 1 || !retryCondition(lastError)) {
          throw lastError;
        }

        setState(prev => ({ ...prev, retryCount: attempt + 1 }));
        
        // Exponential backoff with jitter
        const jitter = Math.random() * 0.1 * currentDelay;
        await sleep(currentDelay + jitter);
        currentDelay *= backoffMultiplier;
      }
    }

    throw lastError!;
  }, []);

  const request = useCallback(
    async (
      endpoint: string,
      options: ApiOptions<T> = {}
    ): Promise<{ data: T | null; error: Error | null }> => {
      const {
        method = 'GET',
        body,
        headers = {},
        onSuccess,
        onError,
        showSuccessToast = false,
        showErrorToast = true,
        timeout = 30000,
        retry,
        cache,
        skipLoading = false,
        transformResponse,
        validateResponse,
        auth = true,
        baseURL,
        params,
        responseType = 'json',
        onUploadProgress,
        onDownloadProgress,
      } = options;

      // Build URL with params
      const url = buildUrl(endpoint, params, baseURL);
      const cacheKey = cache?.key || getCacheKey(url, options);

      // Check cache first
      if (method === 'GET' && cache && apiCache.has(cacheKey)) {
        const cachedData = apiCache.get<T>(cacheKey);
        if (cachedData) {
          setState(prev => ({
            ...prev,
            data: cachedData,
            isSuccess: true,
            isError: false,
            lastFetch: new Date(),
          }));

          // If stale-while-revalidate, continue with request
          if (!cache.staleWhileRevalidate || !apiCache.isStale(cacheKey)) {
            onSuccess?.(cachedData);
            return { data: cachedData, error: null };
          }
          
          setState(prev => ({ ...prev, isValidating: true }));
        }
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Set timeout
      if (timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          controller.abort();
        }, timeout);
      }

      if (!skipLoading) {
        setState(prev => ({
          ...prev,
          data: cache?.staleWhileRevalidate && prev.data ? prev.data : null,
          error: null,
          isLoading: true,
          isSuccess: false,
          isError: false,
          retryCount: 0,
          progress: 0,
        }));
      }

      try {
        // Build headers
        const defaultHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers,
        };

        // Add auth header if needed
        if (auth && config.api.token) {
          defaultHeaders['Authorization'] = `Bearer ${config.api.token}`;
        } else if (auth) {
          console.warn('Authentication requested but no token found in config');
        }

        // Handle form data
        if (body instanceof FormData) {
          delete defaultHeaders['Content-Type'];
        }

        const fetchOptions: RequestInit = {
          method,
          headers: defaultHeaders,
          body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
          signal: controller.signal,
        };

        // Execute with retry
        const response = await executeWithRetry(
          () => fetch(url, fetchOptions),
          retry
        );

        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Handle non-2xx responses
        if (!response.ok) {
          let errorMessage = `Request failed with status ${response.status}`;
          let errorData: any = null;
          
          try {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
              errorData = await response.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
            } else {
              errorMessage = await response.text() || errorMessage;
            }
          } catch (e) {
            // Couldn't parse error response
          }
          
          const error = new Error(errorMessage);
          (error as any).status = response.status;
          (error as any).data = errorData;
          throw error;
        }

        // Handle different response types
        let responseData: any;
        
        if (response.status === 204) {
          responseData = null;
        } else {
          switch (responseType) {
            case 'json':
              responseData = await response.json();
              break;
            case 'blob':
              responseData = await response.blob();
              break;
            case 'text':
              responseData = await response.text();
              break;
            case 'formData':
              responseData = await response.formData();
              break;
            default:
              responseData = await response.json();
          }
        }

        // Transform response if needed
        if (transformResponse) {
          responseData = transformResponse(responseData);
        }

        // Validate response if needed
        if (validateResponse && !validateResponse(responseData)) {
          throw new Error('Response validation failed');
        }

        // Cache the response
        if (method === 'GET' && cache && responseData !== null) {
          apiCache.set(cacheKey, responseData, cache.ttl);
        }

        setState({
          data: responseData,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
          isValidating: false,
          retryCount: 0,
          lastFetch: new Date(),
          progress: 100,
        });

        onSuccess?.(responseData);
        if (showSuccessToast) {
          toast.success(
            typeof showSuccessToast === 'string' 
              ? showSuccessToast 
              : 'Operation completed successfully'
          );
        }

        return { data: responseData, error: null };
      } catch (err) {
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Ignore aborted requests
        if (err instanceof Error && err.name === 'AbortError') {
          return { data: null, error: null };
        }

        const error = err instanceof Error ? err : new Error('An unknown error occurred');
        
        setState(prev => ({
          ...prev,
          data: cache?.staleWhileRevalidate && prev.data ? prev.data : null,
          error,
          isLoading: false,
          isSuccess: false,
          isError: true,
          isValidating: false,
          progress: 0,
        }));

        onError?.(error);
        if (showErrorToast) {
          toast.error(
            typeof showErrorToast === 'string' 
              ? showErrorToast 
              : error.message || 'An error occurred'
          );
        }

        return { data: null, error };
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [buildUrl, getCacheKey, executeWithRetry]
  );

  // Helper methods for common HTTP methods
  const get = useCallback(
    (endpoint: string, options?: Omit<ApiOptions<T>, 'method'>) =>
      request(endpoint, { ...options, method: 'GET' }),
    [request]
  );

  const post = useCallback(
    (endpoint: string, body?: any, options?: Omit<ApiOptions<T>, 'method' | 'body'>) =>
      request(endpoint, { ...options, method: 'POST', body }),
    [request]
  );

  const put = useCallback(
    (endpoint: string, body?: any, options?: Omit<ApiOptions<T>, 'method' | 'body'>) =>
      request(endpoint, { ...options, method: 'PUT', body }),
    [request]
  );

  const patch = useCallback(
    (endpoint: string, body?: any, options?: Omit<ApiOptions<T>, 'method' | 'body'>) =>
      request(endpoint, { ...options, method: 'PATCH', body }),
    [request]
  );

  const del = useCallback(
    (endpoint: string, options?: Omit<ApiOptions<T>, 'method'>) =>
      request(endpoint, { ...options, method: 'DELETE' }),
    [request]
  );

  // Upload with progress
  const upload = useCallback(
    (endpoint: string, file: File | FormData, options?: Omit<ApiOptions<T>, 'method' | 'body'>) => {
      const formData = file instanceof FormData ? file : new FormData();
      if (file instanceof File) {
        formData.append('file', file);
      }
      
      return request(endpoint, { 
        ...options, 
        method: 'POST', 
        body: formData,
        onUploadProgress: options?.onUploadProgress,
      });
    },
    [request]
  );

  // Cancel the current request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
      
    setState(prev => ({
      ...prev,
      isLoading: false,
      isValidating: false,
    }));
  }, []);

  // Reset the state
  const reset = useCallback(() => {
    cancel();
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
      isValidating: false,
      retryCount: 0,
      lastFetch: null,
      progress: 0,
    });
  }, [cancel]);

  // Invalidate cache
  const invalidate = useCallback((key?: string) => {
    if (key) {
      apiCache.delete(key);
    } else {
      apiCache.clear();
    }
  }, []);

  // Revalidate (refetch with cache)
  const revalidate = useCallback((endpoint: string, options?: ApiOptions<T>) => {
    const cacheKey = getCacheKey(endpoint, options || {});
    apiCache.delete(cacheKey);
    return request(endpoint, options);
  }, [request, getCacheKey]);

  // Mutate cache directly
  const mutate = useCallback((key: string, data: T, ttl?: number) => {
    apiCache.set(key, data, ttl);
    setState(prev => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    upload,
    cancel,
    reset,
    invalidate,
    revalidate,
    mutate,
  };
}