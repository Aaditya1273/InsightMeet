'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

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
  cacheTTL?: number; // Time to live in milliseconds
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
}

// Global cache and deduplication storage
const globalCache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<ApiResponse<any>>>();
const requestQueue = new Set<string>();

// Request interceptors and middleware
const globalInterceptors = {
  request: new Set<(config: RequestConfig) => RequestConfig>(),
  response: new Set<(response: ApiResponse<any>) => ApiResponse<any>>(),
  error: new Set<(error: Error) => Error>(),
};

// Performance metrics
const performanceMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0,
  errorRate: 0,
};

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
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string>('');
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique request ID
  const generateRequestId = useCallback(() => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Cache management
  const getCacheKey = useCallback((url: string, options: RequestOptions) => {
    const cacheKey = options.cacheKey || 
      `${options.method || 'GET'}_${url}_${JSON.stringify(options.params || {})}_${JSON.stringify(options.body || {})}`;
    return cacheKey;
  }, []);

  const getCachedData = useCallback(<T>(cacheKey: string): CacheEntry<T> | null => {
    const cached = globalCache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      globalCache.delete(cacheKey);
      return null;
    }

    return cached;
  }, []);

  const setCachedData = useCallback(<T>(cacheKey: string, data: T, ttl: number, headers: Record<string, string>, status: number) => {
    globalCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
      headers,
      status,
    });
  }, []);

  // Progress tracking for requests with bodies
  const trackProgress = useCallback((request: XMLHttpRequest, onProgress?: (loaded: number, total: number) => void) => {
    if (onProgress) {
      request.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
          setState(prev => ({ ...prev, progress: { loaded: e.loaded, total: e.total } }));
        }
      });
    }
  }, []);

  // Advanced retry logic with exponential backoff
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
            ? retryConfig.retryDelay * Math.pow(2, attempt - 1)
            : retryConfig.retryDelay;
          
          await new Promise(resolve => {
            retryTimeoutRef.current = setTimeout(resolve, delay);
          });

          setState(prev => ({ ...prev, retryCount: attempt }));
        }

        const result = await requestFn();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const shouldRetry = retryConfig.retryCondition 
          ? retryConfig.retryCondition(lastError, attempt)
          : true;

        if (attempt === retryConfig.maxRetries || !shouldRetry) {
          onError?.(lastError, attempt);
          throw lastError;
        }
      }
    }

    throw lastError!;
  }, []);

  // Main request function with all advanced features
  const request = useCallback(
    async <T>(url: string, options: RequestOptions<T> = {}): Promise<ApiResponse<T>> => {
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
        retry = { enabled: true, maxRetries: 3, retryDelay: 1000, exponentialBackoff: true },
        transform,
        validateResponse,
        middleware = [],
        dedupe = true,
        backgroundRefresh = false,
        optimistic = false,
        optimisticData,
      } = mergedOptions;

      // Apply optimistic updates
      if (optimistic && optimisticData) {
        setState((prevState: RequestState<T>) => ({
          ...prevState,
          data: optimisticData,
          isLoading: true,
          error: null,
          requestId: requestId,
          progress: null,
          retryCount: 0,
          lastRequestTime: Date.now()
        } as RequestState<T>));
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
        const cachedData = getCachedData<T>(cacheKey);
        
        if (cachedData) {
          performanceMetrics.cacheHits++;
          
          const cacheResponse: ApiResponse<T> = {
            data: cachedData.data,
            error: null,
            status: cachedData.status,
            headers: cachedData.headers,
            fromCache: true,
            requestId,
            timestamp: cachedData.timestamp,
          };

          setState((prev: RequestState<T>) => {
            const newState: RequestState<T> = {
              ...prev,
              data: cachedData.data,
              status: cachedData.status,
              headers: cachedData.headers,
              fromCache: true,
              requestId,
              isLoading: false,
              error: null,
              lastRequestTime: Date.now(),
              progress: null,
              retryCount: 0
            };
            return newState;
          });

          onSuccess?.(cachedData.data, new Response());

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
        return pendingRequests.get(dedupeKey)!;
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController
      abortControllerRef.current = new AbortController();
      
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        requestId,
        progress: null,
        retryCount: 0,
        fromCache: false,
        lastRequestTime: Date.now(),
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

      const executeRequest = async <T>(): Promise<ApiResponse<T>> => {
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

          setState(prev => ({ ...prev, status: response.status, headers: responseHeaders }));

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

          setState(prev => ({ 
            ...prev, 
            data: finalData as T,
            status: response.status,
            headers: responseHeaders,
            isLoading: false,
            error: null,
            fromCache: false,
            lastRequestTime: Date.now(),
            progress: { loaded: 100, total: 100 },
            retryCount: 0,
          }));

          onSuccess?.(finalData, response);

          if (!skipToast) {
            toast.success('Request completed successfully');
          }

          // Update performance metrics
          performanceMetrics.totalRequests++;
          const responseTime = Date.now() - startTime;
          performanceMetrics.averageResponseTime = 
            (performanceMetrics.averageResponseTime * (performanceMetrics.totalRequests - 1) + responseTime) / performanceMetrics.totalRequests;

          const apiResponse: ApiResponse<T> = {
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
            setState(prev => ({ ...prev, error: errorMessage }));
            
            if (!skipToast) {
              toast.error(errorMessage);
            }

            performanceMetrics.errorRate = 
              (performanceMetrics.errorRate * performanceMetrics.totalRequests + 1) / (performanceMetrics.totalRequests + 1);
          }

          throw error;
        } finally {
          pendingRequests.delete(dedupeKey);
          setState(prev => ({ ...prev, isLoading: false }));
        }
      };

      // Add to pending requests for deduplication
      const requestPromise = retry.enabled
        ? executeWithRetry(executeRequest, retry as RetryConfig, requestId, onError)
        : executeRequest();

      if (dedupe) {
        pendingRequests.set(dedupeKey, requestPromise);
      }

  const get = useCallback(
    <T = any>(
      url: string,
      options: Omit<RequestOptions<T>, 'method'> = {}
    ): Promise<ApiResponse<typeof responseData>> => {
      return request<T>(url, { ...options, method: 'GET' });
    },
    [request]
  );

  const post = useCallback(
    <T = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<T>, 'method' | 'body'> = {}
    ): Promise<ApiResponse<typeof responseData>> => {
      return request<T>(url, { ...options, method: 'POST', body });
    },
    [request]
  );

  const put = useCallback(
    <T = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<T>, 'method' | 'body'> = {}
    ): Promise<ApiResponse<typeof responseData>> => {
      return request<T>(url, { ...options, method: 'PUT', body });
    },
    [request]
  );

  const patch = useCallback(
    <T = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<T>, 'method' | 'body'> = {}
    ): Promise<ApiResponse<typeof responseData>> => {
      return request<T>(url, { ...options, method: 'PATCH', body });
    },
    [request]
  );

  const deleteRequest = useCallback(
    <T = any>(
      url: string,
      options: Omit<RequestOptions<T>, 'method'> = {}
    ): Promise<ApiResponse<typeof responseData>> => {
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
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const reset = useCallback(() => {
    cancelRequest();
    setState({
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
    });
  }, [cancelRequest]);

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

  // Cleanup effect
  useEffect(() => {
    return () => {
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
    addRequestInterceptor: (interceptor: (config: RequestConfig) => RequestConfig) => {
      globalInterceptors.request.add(interceptor);
      return () => globalInterceptors.request.delete(interceptor);
    },
    
    addResponseInterceptor: (interceptor: (response: ApiResponse<any>) => ApiResponse<any>) => {
      globalInterceptors.response.add(interceptor);
      return () => globalInterceptors.response.delete(interceptor);
    },
    
    addErrorInterceptor: (interceptor: (error: Error) => Error) => {
      globalInterceptors.error.add(interceptor);
      return () => globalInterceptors.error.delete(interceptor);
    },
  };
}

// Enhanced mock version for testing
export const mockUseApiRequest = () => ({
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
  isSuccess: false,
  isError: false,
  isIdle: true,
  request: async () => ({ data: null, error: null, status: 200, headers: {}, fromCache: false, requestId: 'mock', timestamp: Date.now() }),
  get: async () => ({ data: null, error: null, status: 200, headers: {}, fromCache: false, requestId: 'mock', timestamp: Date.now() }),
  post: async () => ({ data: null, error: null, status: 200, headers: {}, fromCache: false, requestId: 'mock', timestamp: Date.now() }),
  put: async () => ({ data: null, error: null, status: 200, headers: {}, fromCache: false, requestId: 'mock', timestamp: Date.now() }),
  patch: async () => ({ data: null, error: null, status: 200, headers: {}, fromCache: false, requestId: 'mock', timestamp: Date.now() }),
  delete: async () => ({ data: null, error: null, status: 200, headers: {}, fromCache: false, requestId: 'mock', timestamp: Date.now() }),
  cancelRequest: () => {},
  reset: () => {},
  revalidate: async () => ({ data: null, error: null, status: 200, headers: {}, fromCache: false, requestId: 'mock', timestamp: Date.now() }),
  prefetch: async () => ({ data: null, error: null, status: 200, headers: {}, fromCache: false, requestId: 'mock', timestamp: Date.now() }),
  clearCache: () => {},
  getCacheSize: () => 0,
  getMetrics: () => ({ totalRequests: 0, cacheHits: 0, cacheMisses: 0, averageResponseTime: 0, errorRate: 0 }),
  clearQueue: () => {},
  addRequestInterceptor: () => () => {},
  addResponseInterceptor: () => () => {},
  addErrorInterceptor: () => () => {},
});

// Export the appropriate version based on environment
export default typeof window !== 'undefined' ? useApiRequest : mockUseApiRequest;