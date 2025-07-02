'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { config, isValidFile } from '@/lib/config';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type UseFileUploadOptions = {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  maxSize?: number;
  allowedTypes?: string[];
};

export function useFileUpload({
  onSuccess,
  onError,
  maxSize = config.upload.maxFileSize,
  allowedTypes = config.upload.allowedFileTypes,
}: UseFileUploadOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async (fileToUpload: File) => {
      // Validate the file
      const validation = isValidFile(fileToUpload);
      if (!validation.valid) {
        const errorMsg = validation.error || 'Invalid file';
        setError(errorMsg);
        setStatus('error');
        onError?.(new Error(errorMsg));
        toast.error(errorMsg);
        return null;
      }

      setFile(fileToUpload);
      setStatus('uploading');
      setProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', fileToUpload);

      try {
        const xhr = new XMLHttpRequest();
        
        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setProgress(percentComplete);
          }
        });

        // Handle completion
        const response = await new Promise<{ success: boolean; data?: any; error?: string }>(
          (resolve, reject) => {
            xhr.open('POST', config.api.baseUrl + config.api.endpoints.upload, true);
            
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve({ success: true, data: response });
                } catch (e) {
                  resolve({ 
                    success: false, 
                    error: 'Failed to parse server response' 
                  });
                }
              } else {
                let errorMessage = 'Upload failed';
                try {
                  const errorResponse = JSON.parse(xhr.responseText);
                  errorMessage = errorResponse.message || errorMessage;
                } catch (e) {
                  // Couldn't parse error response
                }
                resolve({ success: false, error: errorMessage });
              }
            };
            
            xhr.onerror = () => {
              resolve({ success: false, error: 'Network error occurred' });
            };
            
            xhr.send(formData);
          }
        );

        if (response.success) {
          setStatus('success');
          setProgress(100);
          onSuccess?.(response.data);
          return response.data;
        } else {
          throw new Error(response.error || 'Upload failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        setStatus('error');
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        toast.error(errorMessage);
        return null;
      }
    },
    [onError, onSuccess]
  );

  return {
    file,
    uploadFile,
    status,
    progress,
    error,
    reset,
    isIdle: status === 'idle',
    isLoading: status === 'uploading',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}
