'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

// Types
type RequestStateUpdate<T> = {
  data?: T;
  error?: string | null;
  requestId?: string;
  progress?: { loaded: number; total: number } | null;
  retryCount?: number;
  lastRequestTime?: number;
  [key: string]: any;
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

type CacheStrategy = 'no-cache' | 'cache-first' | 'network-first' | 'stale-while-revalidate';

type RetryConfig = {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  retryCondition?: (error: Error, attemptNumber: number) => boolean;
};

type RequestOptions<T = any> = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  onSuccess?: (data: T, response: Response) => void;
  onError?: (error: Error, attemptNumber?: number) => void;
  onProgress?: (loaded: number, total: number) => void;
  skipToast?: boolean;
  cacheStrategy?: CacheStrategy;
  cacheKey?: string;
  cacheTTL?: number;
  retry?: Partial<RetryConfig>;
  transform?: (data: any) => T;
  validateResponse?: (data: any) => boolean;
  middleware?: Array<(config: RequestConfig) => RequestConfig>;
  dedupe?: boolean;
  backgroundRefresh?: boolean;
  optimistic?: boolean;
  optimisticData?: T;
};

type RequestConfig = {
  url: string;
  options: RequestOptions;
  abortController: AbortController;
  timestamp: number;
};

type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  status: number | null;
  headers: Record<string, string>;
  fromCache: boolean;
  requestId: string;
  timestamp: number;
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
  headers: Record<string, string>;
  status: number;
};

type RequestState<T> = {
  isLoading: boolean;
  error: string | null;
  data: T | null;
  status: number | null;
  headers: Record<string, string>;
  fromCache: boolean;
  requestId: string | null;
  progress: { loaded: number; total: number } | null;
  retryCount: number;
  lastRequestTime: number;
  loaded: number;
  total: number;
};

type PerformanceMetrics = {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  errorRate: number;
};

// Global storage
const globalCache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<ApiResponse<any>>>();
const requestQueue = new Set<string>();

// Global interceptors
const globalInterceptors = {
  request: new Set<(config: RequestConfig) => RequestConfig>(),
  response: new Set<(response: ApiResponse<any>) => ApiResponse<any>>(),
  error: new Set<(error: Error) => Error>(),
};

// Performance metrics
const performanceMetrics: PerformanceMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0,
  errorRate: 0,
};

// Default retry configuration
const defaultRetryConfig: RetryConfig = {
  enabled: true,
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryCondition: (error: Error, attemptNumber: number) => {
    // Don't retry on client errors (4xx), only on server errors (5xx) and network errors
    if (error.message.includes('4')) return false;
    return attemptNumber < 3;
  },
};

// Main hook
export function useApiRequest<T = any>(globalConfig: Partial<RequestOptions<T>> = {}) {
  const [state, setState] = useState<RequestState<T>>({
    isLoading: false,
    error: null,
    data: null,
    status: null,
    headers: {},
    fromCache: false,
    requestId: null,
    progress: null,
    retryCount: 0,
    lastRequestTime: 0,
    loaded: 0,
    total: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string>('');
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Safe state update that checks if component is still mounted
  const safeSetState = useCallback(
    (update: Partial<RequestState<T>> | ((prev: RequestState<T>) => Partial<RequestState<T>>)) => {
      if (mountedRef.current) {
        if (typeof update === 'function') {
          setState(prev => ({ ...prev, ...update(prev) }));
        } else {
          setState(prev => ({ ...prev, ...update }));
        }
      }
    },
    []
  );

  // Generate unique request ID
  const generateRequestId = useCallback(() => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Cache management
  const getCacheKey = useCallback((url: string, options: RequestOptions) => {
    return options.cacheKey || 
      `${options.method || 'GET'}_${url}_${JSON.stringify(options.params || {})}_${JSON.stringify(options.body || {})}`;
  }, []);

  const getCachedData = useCallback(<T>(cacheKey: string): CacheEntry<T> | null => {
    const cached = globalCache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      globalCache.delete(cacheKey);
      return null;
    }

    return cached as CacheEntry<T>;
  }, []);

  const setCachedData = useCallback(<T>(
    cacheKey: string, 
    data: T, 
    ttl: number, 
    headers: Record<string, string>, 
    status: number
  ) => {
    globalCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
      headers,
      status,
    });
  }, []);

  // Enhanced retry logic with exponential backoff
  const executeWithRetry = useCallback(async <T>(
    requestFn: () => Promise<ApiResponse<T>>,
    retryConfig: RetryConfig,
    requestId: string,
    onError?: (error: Error, attemptNumber?: number) => void
  ): Promise<ApiResponse<T>> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = retryConfig.exponentialBackoff 
            ? Math.min(retryConfig.retryDelay * Math.pow(2, attempt - 1), 30000) // Cap at 30 seconds
            : retryConfig.retryDelay;
          
          await new Promise(resolve => {
            retryTimeoutRef.current = setTimeout(resolve, delay);
          });

          safeSetState(prev => ({ ...prev, retryCount: attempt }));
        }

        const result = await requestFn();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const shouldRetry = retryConfig.retryCondition 
          ? retryConfig.retryCondition(lastError, attempt)
          : attempt < retryConfig.maxRetries;

        if (attempt === retryConfig.maxRetries || !shouldRetry) {
          onError?.(lastError, attempt);
          throw lastError;
        }
      }
    }

    throw lastError!;
  }, [safeSetState]);

  // Main request function
  const request = useCallback(
    async <TLocal = any>(url: string, options: RequestOptions<TLocal> = {}): Promise<ApiResponse<TLocal>> => {
      const startTime = Date.now();
      const requestId = generateRequestId();
      requestIdRef.current = requestId;

      // Merge global config with request options
      const mergedOptions = { ...globalConfig, ...options };
      
      const {
        method = 'GET',
        headers = { 'Content-Type': 'application/json' },
        body,
        params,
        timeout = 30000,
        onSuccess,
        onError,
        onProgress,
        skipToast = false,
        cacheStrategy = 'no-cache',
        cacheTTL = 5 * 60 * 1000, // 5 minutes default
        retry = defaultRetryConfig,
        transform,
        validateResponse,
        middleware = [],
        dedupe = true,
        backgroundRefresh = false,
        optimistic = false,
        optimisticData,
      } = mergedOptions;

      // Merge retry config with defaults
      const finalRetryConfig: RetryConfig = { ...defaultRetryConfig, ...retry };

      // Apply optimistic updates
      if (optimistic && optimisticData) {
        const nextState: Partial<RequestState<T>> = {
          data: optimisticData as T | null,
          isLoading: true,
          error: null,
          requestId: requestId,
          progress: null,
          retryCount: 0,
          fromCache: false,
          lastRequestTime: Date.now(),
          status: null,
          headers: {},
          loaded: 0,
          total: 0,
        };
        
        const updateFn = (prev: RequestState<T>): Partial<RequestState<T>> => {
          const result: Partial<RequestState<T>> = {
            ...prev,
            ...nextState
          };
          return result;
        };
        
        safeSetState(updateFn);
      }

      // Build URL with query parameters
      let requestUrl = url;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        requestUrl += `?${searchParams.toString()}`;
      }

      // Cache handling
      const cacheKey = getCacheKey(requestUrl, mergedOptions);
      
      // Check cache first for GET requests
      if (method === 'GET' && cacheStrategy !== 'no-cache') {
        const cachedData = getCachedData<TLocal>(cacheKey);
        
        if (cachedData) {
          performanceMetrics.cacheHits++;
          
          const cacheResponse: ApiResponse<TLocal> = {
            data: cachedData.data as unknown as TLocal,
            error: null,
            status: cachedData.status,
            headers: cachedData.headers,
            fromCache: true,
            requestId: requestId,
            timestamp: cachedData.timestamp,
          };

          safeSetState(prev => ({
            data: cachedData.data as unknown as T,
            status: cachedData.status,
            headers: cachedData.headers,
            fromCache: true,
            requestId: requestId,
            isLoading: false,
            error: null,
            lastRequestTime: Date.now(),
            retryCount: prev.retryCount,
            progress: null,
            loaded: 0,
            total: 0
          }));

          onSuccess?.(cachedData.data as unknown as TLocal & T, new Response());

          // Background refresh for stale-while-revalidate
          if (cacheStrategy === 'stale-while-revalidate' && backgroundRefresh) {
            setTimeout(() => {
              request(url, { ...mergedOptions, cacheStrategy: 'network-first' });
            }, 0);
          }

          return cacheResponse;
        } else {
          performanceMetrics.cacheMisses++;
        }
      }

      // Deduplication
      const dedupeKey = `${method}_${requestUrl}_${JSON.stringify(body)}`;
      if (dedupe && pendingRequests.has(dedupeKey)) {
        return pendingRequests.get(dedupeKey)! as Promise<ApiResponse<TLocal>>;
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController
      abortControllerRef.current = new AbortController();
      
      safeSetState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        requestId,
        progress: null,
        retryCount: 0,
        fromCache: false,
        lastRequestTime: Date.now(),
        loaded: 0,
        total: 0,
      }));

      // Apply middleware
      let requestConfig: RequestConfig = {
        url: requestUrl,
        options: mergedOptions,
        abortController: abortControllerRef.current,
        timestamp: Date.now(),
      };

      for (const mw of middleware) {
        requestConfig = mw(requestConfig);
      }

      // Apply global request interceptors
      for (const interceptor of globalInterceptors.request) {
        requestConfig = interceptor(requestConfig);
      }

      const executeRequest = async (): Promise<ApiResponse<TLocal>> => {
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, timeout);

        try {
          const fetchOptions: RequestInit = {
            method,
            headers: requestConfig.options.headers || headers,
            body: body instanceof FormData ? body : body ? JSON.stringify(body) : null,
            signal: abortControllerRef.current?.signal,
          };

          const response = await fetch(requestConfig.url, fetchOptions);
          console.log('Requesting URL:', requestConfig.url);
          clearTimeout(timeoutId);

          // Extract response headers
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          // Parse response based on content type
          let responseData: any;
          const contentType = response.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            responseData = await response.json();
          } else if (contentType?.includes('text/')) {
            responseData = await response.text();
          } else if (contentType?.includes('application/octet-stream')) {
            responseData = await response.blob();
          } else {
            responseData = await response.text();
          }

          safeSetState(prev => ({ ...prev, status: response.status, headers: responseHeaders }));

          if (!response.ok) {
            const errorMessage = 
              typeof responseData === 'object' && responseData !== null && 'message' in responseData
                ? String(responseData.message)
                : `Request failed with status ${response.status}`;
            
            throw new Error(errorMessage);
          }

          // Validate response if validator provided
          if (validateResponse && !validateResponse(responseData)) {
            throw new Error('Response validation failed');
          }

          // Transform response data if transformer provided
          const finalData = transform ? transform(responseData) : responseData;

          // Cache successful GET requests
          if (method === 'GET' && cacheStrategy !== 'no-cache') {
            setCachedData(cacheKey, finalData, cacheTTL, responseHeaders, response.status);
          }

          safeSetState(prev => ({ 
            ...prev, 
            data: finalData as unknown as T,
            status: response.status,
            headers: responseHeaders,
            isLoading: false,
            error: null,
            fromCache: false,
            lastRequestTime: Date.now(),
            progress: { loaded: 100, total: 100 },
            retryCount: 0,
            loaded: 100,
            total: 100,
          }));

          onSuccess?.(finalData as unknown as TLocal & T, response);

          if (!skipToast) {
            toast.success('Request completed successfully');
          }

          // Update performance metrics
          performanceMetrics.totalRequests++;
          const responseTime = Date.now() - startTime;
          performanceMetrics.averageResponseTime = 
            (performanceMetrics.averageResponseTime * (performanceMetrics.totalRequests - 1) + responseTime) / performanceMetrics.totalRequests;

          const apiResponse: ApiResponse<TLocal> = {
            data: finalData,
            error: null,
            status: response.status,
            headers: responseHeaders,
            fromCache: false,
            requestId,
            timestamp: Date.now(),
          };

          // Apply global response interceptors
          let interceptedResponse = apiResponse;
          for (const interceptor of globalInterceptors.response) {
            interceptedResponse = interceptor(interceptedResponse);
          }

          return interceptedResponse;

        } catch (err) {
          clearTimeout(timeoutId);
          
          let error = err instanceof Error ? err : new Error('Unknown error occurred');
          
          // Apply global error interceptors
          for (const interceptor of globalInterceptors.error) {
            error = interceptor(error);
          }

          const errorMessage = error.message;

          // Only update state if request wasn't aborted
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            safeSetState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
            
            if (!skipToast) {
              toast.error(errorMessage);
            }

            performanceMetrics.errorRate = 
              (performanceMetrics.errorRate * performanceMetrics.totalRequests + 1) / (performanceMetrics.totalRequests + 1);
          }

          throw error;
        } finally {
          pendingRequests.delete(dedupeKey);
        }
      };

      // Add to pending requests for deduplication
      const requestPromise = finalRetryConfig.enabled
        ? executeWithRetry(executeRequest, finalRetryConfig, requestId, onError)
        : executeRequest();

      if (dedupe) {
        pendingRequests.set(dedupeKey, requestPromise);
      }

      return requestPromise;
    },
    [
      generateRequestId,
      getCacheKey,
      getCachedData,
      setCachedData,
      executeWithRetry,
      safeSetState,
      globalConfig,
    ]
  );

  // HTTP method shortcuts
  const get = useCallback(
    <T = any>(
      url: string,
      options: Omit<RequestOptions<T>, 'method'> = {}
    ): Promise<ApiResponse<T>> => {
      return request<T>(url, { ...options, method: 'GET' });
    },
    [request]
  );

  const post = useCallback(
    <T = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<T>, 'method' | 'body'> = {}
    ): Promise<ApiResponse<T>> => {
      return request<T>(url, { ...options, method: 'POST', body });
    },
    [request]
  );

  const put = useCallback(
    <T = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<T>, 'method' | 'body'> = {}
    ): Promise<ApiResponse<T>> => {
      return request<T>(url, { ...options, method: 'PUT', body });
    },
    [request]
  );

  const patch = useCallback(
    <T = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<T>, 'method' | 'body'> = {}
    ): Promise<ApiResponse<T>> => {
      return request<T>(url, { ...options, method: 'PATCH', body });
    },
    [request]
  );

  const deleteRequest = useCallback(
    <T = any>(
      url: string,
      options: Omit<RequestOptions<T>, 'method'> = {}
    ): Promise<ApiResponse<T>> => {
      return request<T>(url, { ...options, method: 'DELETE' });
    },
    [request]
  );

  // Request management methods
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    safeSetState(prev => ({ ...prev, isLoading: false }));
  }, [safeSetState]);

  const reset = useCallback(() => {
    cancelRequest();
    safeSetState({
      isLoading: false,
      error: null,
      data: null,
      status: null,
      headers: {},
      fromCache: false,
      requestId: null,
      progress: null,
      retryCount: 0,
      lastRequestTime: 0,
      loaded: 0,
      total: 0,
    });
  }, [cancelRequest, safeSetState]);

  const revalidate = useCallback(
    <T = any>(url: string, options: RequestOptions<T> = {}): Promise<ApiResponse<T>> => {
      const cacheKey = getCacheKey(url, options);
      globalCache.delete(cacheKey);
      return request(url, { ...options, cacheStrategy: 'network-first' });
    },
    [getCacheKey, request]
  );

  const prefetch = useCallback(
    <T = any>(url: string, options: RequestOptions<T> = {}): Promise<ApiResponse<T>> => {
      return request(url, { ...options, skipToast: true });
    },
    [request]
  );

  // Interceptor management
  const addRequestInterceptor = useCallback((): (() => void) => {
    return () => {};
  }, []);

  const addResponseInterceptor = useCallback((): (() => void) => {
    return () => {};
  }, []);

  const addErrorInterceptor = useCallback((): (() => void) => {
    return () => {};
  }, []);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRequest();
    };
  }, [cancelRequest]);

  // Computed values for better performance
  const computedState = useMemo(() => ({
    ...state,
    isSuccess: !state.isLoading && !state.error && state.data !== null,
    isError: !state.isLoading && state.error !== null,
    isIdle: !state.isLoading && state.error === null && state.data === null,
  }), [state]);

  return {
    // Enhanced state
    ...computedState,
    
    // Core methods
    request,
    get,
    post,
    put,
    patch,
    delete: deleteRequest,
    
    // Advanced methods
    cancelRequest,
    reset,
    revalidate,
    prefetch,
    
    // Utility methods
    clearCache: () => globalCache.clear(),
    getCacheSize: () => globalCache.size,
    getMetrics: () => ({ ...performanceMetrics }),
    
    // Request queue management
    clearQueue: () => {
      requestQueue.clear();
      pendingRequests.clear();
    },
    
    // Interceptor management
    addRequestInterceptor,
    addResponseInterceptor,
    addErrorInterceptor,
  };
}

// Enhanced mock version for testing
export const mockUseApiRequest = <T = any>(): ReturnType<typeof useApiRequest<T>> => ({
  isLoading: false,
  error: null,
  data: null,
  status: null,
  headers: {},
  fromCache: false,
  requestId: null,
  progress: null,
  retryCount: 0,
  lastRequestTime: 0,
  loaded: 0,
  total: 0,
  isSuccess: false,
  isError: false,
  isIdle: true,
  request: async () => ({ 
    data: null, 
    error: null, 
    status: 200, 
    headers: {}, 
    fromCache: false, 
    requestId: 'mock', 
    timestamp: Date.now() 
  }),
  get: async () => ({ 
    data: null, 
    error: null, 
    status: 200, 
    headers: {}, 
    fromCache: false, 
    requestId: 'mock', 
    timestamp: Date.now() 
  }),
  post: async () => ({ 
    data: null, 
    error: null, 
    status: 200, 
    headers: {}, 
    fromCache: false, 
    requestId: 'mock', 
    timestamp: Date.now() 
  }),
  put: async () => ({ 
    data: null, 
    error: null, 
    status: 200, 
    headers: {}, 
    fromCache: false, 
    requestId: 'mock', 
    timestamp: Date.now() 
  }),
  patch: async () => ({ 
    data: null, 
    error: null, 
    status: 200, 
    headers: {}, 
    fromCache: false, 
    requestId: 'mock', 
    timestamp: Date.now() 
  }),
  delete: async () => ({ 
    data: null, 
    error: null, 
    status: 200, 
    headers: {}, 
    fromCache: false, 
    requestId: 'mock', 
    timestamp: Date.now() 
  }),
  cancelRequest: () => {},
  reset: () => {},
  revalidate: async () => ({ 
    data: null, 
    error: null, 
    status: 200, 
    headers: {}, 
    fromCache: false, 
    requestId: 'mock', 
    timestamp: Date.now() 
  }),
  prefetch: async () => ({ 
    data: null, 
    error: null, 
    status: 200, 
    headers: {}, 
    fromCache: false, 
    requestId: 'mock', 
    timestamp: Date.now() 
  }),
  clearCache: () => {},
  getCacheSize: () => 0,
  getMetrics: () => ({ 
    totalRequests: 0, 
    cacheHits: 0, 
    cacheMisses: 0, 
    averageResponseTime: 0, 
    errorRate: 0 
  }),
  clearQueue: () => {},
  addRequestInterceptor: (): () => void => () => {},
  addResponseInterceptor: (): () => void => () => {},
  addErrorInterceptor: (): () => void => () => {},
  
});

export default useApiRequest;