'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions<T = any> = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  params?: Record<string, string | number | boolean>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  skipToast?: boolean;
};

type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  status: number | null;
};

export function useApiRequest<T = any>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const request = useCallback(
    async (url: string, options: RequestOptions<T> = {}): Promise<ApiResponse<T>> => {
      const {
        method = 'GET',
        headers = { 'Content-Type': 'application/json' },
        body,
        params,
        onSuccess,
        onError,
        skipToast = false,
      } = options;

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

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

      try {
        const response = await fetch(requestUrl, {
          method,
          headers,
          body: body instanceof FormData ? body : body ? JSON.stringify(body) : null,
          signal: abortControllerRef.current.signal,
        });

        const responseData = await (response.headers.get('content-type')?.includes('application/json')
          ? response.json()
          : response.text());

        setStatus(response.status);

        if (!response.ok) {
          const errorMessage =
            typeof responseData === 'object' && responseData !== null && 'message' in responseData
              ? String(responseData.message)
              : `Request failed with status ${response.status}`;

          throw new Error(errorMessage);
        }

        setData(responseData);
        onSuccess?.(responseData);

        if (!skipToast) {
          toast.success('Request completed successfully');
        }

        return { data: responseData, error: null, status: response.status };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred';

        // Only set error if the request wasn't aborted
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(errorMessage);
          onError?.(err instanceof Error ? err : new Error(errorMessage));

          if (!skipToast) {
            toast.error(errorMessage);
          }
        }

        return { data: null, error: errorMessage, status };
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  // Helper methods for common HTTP methods
  const get = useCallback(
    (url: string, options: Omit<RequestOptions<T>, 'method'> = {}) =>
      request(url, { ...options, method: 'GET' }),
    [request]
  );

  const post = useCallback(
    <TData = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<TData>, 'method' | 'body'> = {}
    ) => request<TData>(url, { ...options, method: 'POST', body }),
    [request]
  );

  const put = useCallback(
    <TData = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<TData>, 'method' | 'body'> = {}
    ) => request<TData>(url, { ...options, method: 'PUT', body }),
    [request]
  );

  const patch = useCallback(
    <TData = any>(
      url: string,
      body?: any,
      options: Omit<RequestOptions<TData>, 'method' | 'body'> = {}
    ) => request<TData>(url, { ...options, method: 'PATCH', body }),
    [request]
  );

  const del = useCallback(
    (url: string, options: Omit<RequestOptions, 'method'> = {}) =>
      request(url, { ...options, method: 'DELETE' }),
    [request]
  );

  // Cancel the current request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // Reset hook state
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
    setStatus(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    // State
    isLoading,
    error,
    data,
    status,
    
    // Methods
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    cancelRequest,
    reset,
  };
}

// Export a mock version for testing or when not in a browser environment
export const mockUseApiRequest = () => ({
  isLoading: false,
  error: null,
  data: null,
  status: null,
  request: async () => ({ data: null, error: null, status: 200 }),
  get: async () => ({ data: null, error: null, status: 200 }),
  post: async () => ({ data: null, error: null, status: 200 }),
  put: async () => ({ data: null, error: null, status: 200 }),
  patch: async () => ({ data: null, error: null, status: 200 }),
  delete: async () => ({ data: null, error: null, status: 200 }),
  cancelRequest: () => {},
  reset: () => {},
});

// Export the appropriate version based on the environment
export default typeof window !== 'undefined' ? useApiRequest : mockUseApiRequest;
