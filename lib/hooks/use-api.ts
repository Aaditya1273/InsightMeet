import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { config } from '@/lib/config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiOptions<T> = {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean | string;
  showErrorToast?: boolean | string;
};

type ApiState<T> = {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
};

export function useApi<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

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
      } = options;

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({
        data: null,
        error: null,
        isLoading: true,
        isSuccess: false,
        isError: false,
      });

      try {
        // Add default headers
        const defaultHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers,
        };

        const url = endpoint.startsWith('http') 
          ? endpoint 
          : `${config.api.baseUrl}${endpoint}`;

        const response = await fetch(url, {
          method,
          headers: defaultHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        // Handle non-2xx responses
        if (!response.ok) {
          let errorMessage = `Request failed with status ${response.status}`;
          
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Couldn't parse error response
          }
          
          throw new Error(errorMessage);
        }

        // Handle empty responses (like 204 No Content)
        if (response.status === 204) {
          setState({
            data: null as unknown as T,
            error: null,
            isLoading: false,
            isSuccess: true,
            isError: false,
          });
          
          onSuccess?.(null as unknown as T);
          if (showSuccessToast) {
            toast.success(
              typeof showSuccessToast === 'string' 
                ? showSuccessToast 
                : 'Operation completed successfully'
            );
          }
          
          return { data: null, error: null };
        }

        // Parse JSON response
        const responseData = await response.json();

        setState({
          data: responseData,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
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
        // Ignore aborted requests
        if (err instanceof Error && err.name === 'AbortError') {
          return { data: null, error: null };
        }

        const error = err instanceof Error ? err : new Error('An unknown error occurred');
        
        setState({
          data: null,
          error,
          isLoading: false,
          isSuccess: false,
          isError: true,
        });

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
    []
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

  // Cancel the current request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
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
    });
  }, [cancel]);

  return {
    ...state,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    cancel,
    reset,
  };
}
