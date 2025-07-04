'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { config, isValidFile } from '@/lib/config';
import { UploadButton } from '../uploadthing';
import type { OurFileRouter } from '../uploadthing';

// Enhanced types for better type safety
type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error' | 'cancelled';

interface UploadResult {
  fileKey: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

interface UseFileUploadOptions {
  onSuccess?: (data: UploadResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
  onValidationStart?: (file: File) => void;
  onValidationComplete?: (file: File, isValid: boolean) => void;
  maxSize?: number;
  allowedTypes?: ReadonlyArray<string>;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableCompression?: boolean;
  compressionQuality?: number;
  enableChunkedUpload?: boolean;
  chunkSize?: number;
  enableDuplicateDetection?: boolean;
  enablePreview?: boolean;
  showToasts?: boolean;
  autoUpload?: boolean;
}

interface FileUploadState {
  file: File | null;
  status: UploadStatus;
  progress: UploadProgress | null;
  error: string | null;
  result: UploadResult | null;
  preview: string | null;
  uploadId: string | null;
  retryCount: number;
  isDuplicate: boolean;
  validationErrors: string[];
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    onSuccess,
    onError,
    onProgress,
    onValidationStart,
    onValidationComplete,
    maxSize = config.upload.maxFileSize,
    allowedTypes = config.upload.allowedFileTypes,
    enableRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
    enableCompression = false,
    compressionQuality = 0.8,
    enableChunkedUpload = false,
    chunkSize = 1024 * 1024, // 1MB chunks
    enableDuplicateDetection = false,
    enablePreview = false,
    showToasts = true,
    autoUpload = false,
  } = options;

  // State management with better structure
  const [state, setState] = useState<FileUploadState>({
    file: null,
    status: 'idle',
    progress: null,
    error: null,
    result: null,
    preview: null,
    uploadId: null,
    retryCount: 0,
    isDuplicate: false,
    validationErrors: [],
  });

  // Refs for performance optimization
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const uploadedFilesRef = useRef<Set<string>>(new Set());
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized computed values
  const computedState = useMemo(() => ({
    isIdle: state.status === 'idle',
    isValidating: state.status === 'validating',
    isUploading: state.status === 'uploading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isCancelled: state.status === 'cancelled',
    canRetry: enableRetry && state.retryCount < maxRetries && state.status === 'error',
    hasPreview: Boolean(state.preview),
    uploadSpeed: state.progress?.speed || 0,
    timeRemaining: state.progress?.timeRemaining || 0,
  }), [state.status, state.retryCount, state.progress, state.preview, enableRetry, maxRetries]);

  // Enhanced file validation with detailed error reporting
  const validateFile = useCallback((file: File): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds limit (${(maxSize / (1024 * 1024)).toFixed(2)}MB)`);
    }
    
    // Type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // Name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }
    
    // Duplicate detection
    if (enableDuplicateDetection) {
      const fileHash = `${file.name}-${file.size}-${file.lastModified}`;
      if (uploadedFilesRef.current.has(fileHash)) {
        errors.push('This file has already been uploaded');
      }
    }
    
    return { valid: errors.length === 0, errors };
  }, [maxSize, allowedTypes, enableDuplicateDetection]);

  // File compression utility
  const compressFile = useCallback(async (file: File): Promise<File> => {
    if (!enableCompression || !file.type.startsWith('image/')) {
      return file;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, { type: file.type });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, compressionQuality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, [enableCompression, compressionQuality]);

  // Generate file preview
  const generatePreview = useCallback(async (file: File): Promise<string | null> => {
    if (!enablePreview) return null;

    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    
    // Add support for other file types if needed
    return null;
  }, [enablePreview]);

  // Progress calculation with speed and time estimation
  const calculateProgress = useCallback((loaded: number, total: number): UploadProgress => {
    const percentage = Math.round((loaded / total) * 100);
    const elapsed = (Date.now() - uploadStartTimeRef.current) / 1000;
    const speed = elapsed > 0 ? loaded / elapsed : 0;
    const timeRemaining = speed > 0 ? (total - loaded) / speed : 0;

    return { loaded, total, percentage, speed, timeRemaining };
  }, []);

  // Reset function with cleanup
  const reset = useCallback(() => {
    // Cancel any ongoing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Cleanup preview URL
    if (state.preview) {
      URL.revokeObjectURL(state.preview);
    }

    setState({
      file: null,
      status: 'idle',
      progress: null,
      error: null,
      result: null,
      preview: null,
      uploadId: null,
      retryCount: 0,
      isDuplicate: false,
      validationErrors: [],
    });
  }, [state.preview]);

  // Cancel upload function
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({ ...prev, status: 'cancelled' }));
    
    if (showToasts) {
      toast.info('Upload cancelled');
    }
  }, [showToasts]);

  // Retry upload function
  const retry = useCallback(() => {
    if (!state.file || !computedState.canRetry) return;

    setState(prev => ({ 
      ...prev, 
      retryCount: prev.retryCount + 1,
      status: 'uploading',
      error: null 
    }));

    retryTimeoutRef.current = setTimeout(() => {
      if (state.file) {
        uploadFile(state.file);
      }
    }, retryDelay);
  }, [state.file, computedState.canRetry, retryDelay]);

  // Main upload function with all optimizations
  const uploadFile = useCallback(async (fileToUpload: File) => {
    try {
      // Start validation
      setState(prev => ({ ...prev, status: 'validating', error: null }));
      onValidationStart?.(fileToUpload);

      // Validate file
      const validation = validateFile(fileToUpload);
      if (!validation.valid) {
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: validation.errors.join(', '),
          validationErrors: validation.errors 
        }));
        onValidationComplete?.(fileToUpload, false);
        const error = new Error(validation.errors.join(', '));
        onError?.(error);
        if (showToasts) {
          toast.error(validation.errors.join(', '));
        }
        return null;
      }

      onValidationComplete?.(fileToUpload, true);

      // Compress file if enabled
      const processedFile = await compressFile(fileToUpload);
      
      // Generate preview
      const preview = await generatePreview(processedFile);
      
      // Generate upload ID
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update state
      setState(prev => ({
        ...prev,
        file: processedFile,
        status: 'uploading',
        uploadId,
        preview,
        validationErrors: [],
      }));

      // Create abort controller
      abortControllerRef.current = new AbortController();
      uploadStartTimeRef.current = Date.now();

      // Perform upload with progress tracking
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', processedFile);

        // Use XMLHttpRequest for better progress tracking
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = calculateProgress(event.loaded, event.total);
            setState(prev => ({ ...prev, progress }));
            onProgress?.(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response?.[0]?.ufsUrl && response?.[0]?.fileKey) {
                const result: UploadResult = {
                  fileKey: response[0].fileKey,
                  url: response[0].ufsUrl,
                  fileName: processedFile.name,
                  fileSize: processedFile.size,
                  mimeType: processedFile.type,
                  uploadedAt: new Date(),
                };
                resolve(result);
              } else {
                reject(new Error('Upload failed: Invalid response format'));
              }
            } catch (e) {
              reject(new Error('Upload failed: Invalid response'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed: Network error'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));

        // Set up abort signal
        abortControllerRef.current?.signal.addEventListener('abort', () => {
          xhr.abort();
        });

        xhr.open('POST', '/api/upload'); // Adjust endpoint as needed
        xhr.send(formData);
      });

      // Mark as duplicate if enabled
      if (enableDuplicateDetection) {
        const fileHash = `${processedFile.name}-${processedFile.size}-${processedFile.lastModified}`;
        uploadedFilesRef.current.add(fileHash);
      }

      // Update state with success
      setState(prev => ({
        ...prev,
        status: 'success',
        result,
        progress: calculateProgress(processedFile.size, processedFile.size),
      }));

      onSuccess?.(result);
      
      if (showToasts) {
        toast.success('File uploaded successfully');
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));

      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      onError?.(errorObj);

      if (showToasts) {
        toast.error(errorMessage);
      }

      // Auto-retry if enabled
      if (enableRetry && state.retryCount < maxRetries) {
        retry();
      }

      return null;
    }
  }, [
    validateFile,
    compressFile,
    generatePreview,
    calculateProgress,
    onValidationStart,
    onValidationComplete,
    onProgress,
    onSuccess,
    onError,
    showToasts,
    enableDuplicateDetection,
    enableRetry,
    maxRetries,
    state.retryCount,
    retry,
  ]);

  // Auto-upload when file is selected
  const selectFile = useCallback((file: File) => {
    if (autoUpload) {
      uploadFile(file);
    } else {
      setState(prev => ({ ...prev, file }));
    }
  }, [autoUpload, uploadFile]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (state.preview) {
      URL.revokeObjectURL(state.preview);
    }
  }, [state.preview]);

  return {
    // State
    ...state,
    ...computedState,
    
    // Actions
    uploadFile,
    selectFile,
    reset,
    cancel,
    retry,
    cleanup,
    
    // Utilities
    validateFile,
    
    // Configuration
    maxSize,
    allowedTypes,
    enableRetry,
    maxRetries,
    enableCompression,
    enableChunkedUpload,
    enableDuplicateDetection,
    enablePreview,
  };
}