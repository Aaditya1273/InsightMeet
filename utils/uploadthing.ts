import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';
import { toast } from 'sonner'; // or your preferred toast library

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

// Enhanced types for better type safety
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  extension: string;
  lastModified: Date;
  hash?: string;
  dimensions?: { width: number; height: number };
}

export interface UploadProgress {
  file: File;
  progress: number;
  speed: number;
  eta: number;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';
  error?: string;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress[]) => void;
  onSuccess?: (results: any[]) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  maxConcurrent?: number;
  retryAttempts?: number;
  retryDelay?: number;
  showToast?: boolean;
  validateBeforeUpload?: boolean;
  generatePreviews?: boolean;
  compressImages?: boolean;
  maxImageDimensions?: { width: number; height: number };
}

// Enhanced file validation with comprehensive checks
export const validateFile = (
  file: File, 
  accept: Record<string, string[]>, 
  maxSize: number,
  options: {
    minSize?: number;
    maxDimensions?: { width: number; height: number };
    allowedMimeTypes?: string[];
    blockedMimeTypes?: string[];
    customValidators?: ((file: File) => FileValidationResult)[];
  } = {}
): FileValidationResult => {
  const warnings: string[] = [];
  
  // Check file type
  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const acceptedExtensions = Object.values(accept).flat();
  
  if (!acceptedExtensions.some(ext => fileExtension === ext.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid file type. Accepted types: ${acceptedExtensions.join(', ')}`
    };
  }

  // Check MIME type if specified
  if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid MIME type. Allowed types: ${options.allowedMimeTypes.join(', ')}`
    };
  }

  if (options.blockedMimeTypes && options.blockedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Blocked file type: ${file.type}`
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File is too large. Maximum size is ${formatFileSize(maxSize)}`
    };
  }

  if (options.minSize && file.size < options.minSize) {
    return {
      isValid: false,
      error: `File is too small. Minimum size is ${formatFileSize(options.minSize)}`
    };
  }

  // Check for suspicious file characteristics
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty'
    };
  }

  // Check for potentially dangerous files
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js'];
  if (dangerousExtensions.includes(fileExtension)) {
    warnings.push('This file type could be potentially dangerous');
  }

  // Run custom validators
  if (options.customValidators) {
    for (const validator of options.customValidators) {
      const result = validator(file);
      if (!result.isValid) {
        return result;
      }
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    }
  }

  return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
};

// Enhanced file size formatting with more units
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Enhanced file icon system with more file types
export const getFileIcon = (fileType: string, fileName?: string): string => {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  
  // Audio files
  if (fileType.startsWith('audio/')) {
    return '🎵';
  }
  
  // Image files
  if (fileType.startsWith('image/')) {
    return '🖼️';
  }
  
  // Video files
  if (fileType.startsWith('video/')) {
    return '🎬';
  }
  
  // Document files
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word') || extension === 'docx' || extension === 'doc') return '📝';
  if (fileType.includes('excel') || extension === 'xlsx' || extension === 'xls') return '📊';
  if (fileType.includes('powerpoint') || extension === 'pptx' || extension === 'ppt') return '📈';
  if (fileType === 'text/plain' || extension === 'txt') return '📝';
  if (fileType === 'text/csv' || extension === 'csv') return '📊';
  if (fileType === 'application/json' || extension === 'json') return '📋';
  if (fileType === 'application/xml' || extension === 'xml') return '📋';
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) return '📦';
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'py', 'java', 'cpp', 'c'].includes(extension || '')) return '💻';
  
  return '📁';
};

// Generate file metadata
export const getFileMetadata = async (file: File): Promise<FileMetadata> => {
  const metadata: FileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    extension: `.${file.name.split('.').pop()?.toLowerCase()}`,
    lastModified: new Date(file.lastModified),
  };

  // Generate file hash for deduplication
  if (window.crypto && window.crypto.subtle) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      metadata.hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('Failed to generate file hash:', error);
    }
  }

  // Get image dimensions if it's an image
  if (file.type.startsWith('image/')) {
    metadata.dimensions = await getImageDimensions(file);
  }

  return metadata;
};

// Get image dimensions
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Image compression utility
export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Generate file preview
export const generateFilePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      // For non-images, create a generic preview
      const preview = `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="#f0f0f0"/>
          <text x="50" y="50" text-anchor="middle" font-size="30">${getFileIcon(file.type, file.name)}</text>
        </svg>
      `)}`;
      resolve(preview);
    }
  });
};

// Enhanced upload function with progress tracking and error handling
export const uploadFilesWithProgress = async (
  files: File[],
  endpoint: keyof OurFileRouter,
  options: UploadOptions = {}
): Promise<any[]> => {
  const {
    onProgress,
    onSuccess,
    onError,
    onComplete,
    maxConcurrent = 3,
    retryAttempts = 3,
    retryDelay = 1000,
    showToast = true,
    validateBeforeUpload = true,
    generatePreviews = false,
    compressImages = false,
    maxImageDimensions = { width: 1920, height: 1080 }
  } = options;

  const progressMap = new Map<File, UploadProgress>();
  const results: any[] = [];

  // Initialize progress tracking
  files.forEach(file => {
    progressMap.set(file, {
      file,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'pending'
    });
  });

  const updateProgress = () => {
    if (onProgress) {
      onProgress(Array.from(progressMap.values()));
    }
  };

  try {
    // Process files in batches
    const batches = [];
    for (let i = 0; i < files.length; i += maxConcurrent) {
      batches.push(files.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (file) => {
        let processedFile = file;
        const progress = progressMap.get(file)!;

        try {
          // Validate file if requested
          if (validateBeforeUpload) {
            // You'll need to pass validation options here
            const validation = validateFile(file, {}, 10 * 1024 * 1024); // Example: 10MB limit
            if (!validation.isValid) {
              throw new Error(validation.error);
            }
          }

          // Compress images if requested
          if (compressImages && file.type.startsWith('image/')) {
            progress.status = 'uploading';
            updateProgress();
            processedFile = await compressImage(file, maxImageDimensions.width, maxImageDimensions.height);
          }

          progress.status = 'uploading';
          updateProgress();

          // Upload with retry logic
          let lastError: Error | null = null;
          for (let attempt = 0; attempt <= retryAttempts; attempt++) {
            try {
              const startTime = Date.now();
              let lastLoaded = 0;

              const result = await uploadFiles(endpoint, {
                files: [processedFile],
                onUploadProgress: (progressEvent) => {
                  const currentTime = Date.now();
                  const timeDiff = currentTime - startTime;
                  const loadedDiff = progressEvent.loaded - lastLoaded;
                  
                  progress.progress = (progressEvent.loaded / progressEvent.totalLoaded) * 100;
                  progress.speed = timeDiff > 0 ? (loadedDiff / timeDiff) * 1000 : 0;
                  progress.eta = progress.speed > 0 ? (progressEvent.totalLoaded - progressEvent.loaded) / progress.speed : 0;
                  
                  lastLoaded = progressEvent.loaded;
                  updateProgress();
                }
              });

              progress.status = 'success';
              progress.progress = 100;
              updateProgress();

              return result[0];
            } catch (error) {
              lastError = error as Error;
              if (attempt < retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
              }
            }
          }

          throw lastError;
        } catch (error) {
          progress.status = 'error';
          progress.error = (error as Error).message;
          updateProgress();
          
          if (showToast) {
            toast.error(`Failed to upload ${file.name}: ${(error as Error).message}`);
          }
          
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }

    if (showToast) {
      toast.success(`Successfully uploaded ${results.length} file(s)`);
    }

    onSuccess?.(results);
    return results;
  } catch (error) {
    if (showToast) {
      toast.error(`Upload failed: ${(error as Error).message}`);
    }
    onError?.(error as Error);
    throw error;
  } finally {
    onComplete?.();
  }
};

// File deduplication utility
export const deduplicateFiles = (files: File[]): File[] => {
  const seen = new Set<string>();
  return files.filter(file => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// Utility to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Utility to download file from URL
export const downloadFile = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Batch file operations
export const batchFileOperations = {
  delete: async (fileIds: string[]) => {
    // Implement batch delete logic
    const results = await Promise.allSettled(
      fileIds.map(id => fetch(`/api/files/${id}`, { method: 'DELETE' }))
    );
    return results;
  },
  
  move: async (fileIds: string[], destinationFolder: string) => {
    // Implement batch move logic
    const results = await Promise.allSettled(
      fileIds.map(id => 
        fetch(`/api/files/${id}/move`, {
          method: 'POST',
          body: JSON.stringify({ destination: destinationFolder })
        })
      )
    );
    return results;
  }
};

// File system utilities
export const fileSystemUtils = {
  // Check if file system access is supported
  isFileSystemAccessSupported: () => 'showOpenFilePicker' in window,
  
  // Open file picker with enhanced options
  openFilePicker: async (options: {
    multiple?: boolean;
    types?: { description: string; accept: Record<string, string[]> }[];
  } = {}) => {
    if (!fileSystemUtils.isFileSystemAccessSupported()) {
      throw new Error('File System Access API not supported');
    }
    
    const fileHandles = await (window as any).showOpenFilePicker(options);
    const files = await Promise.all(
      fileHandles.map(async (handle: any) => await handle.getFile())
    );
    return files;
  },
  
  // Save file to system
  saveFile: async (content: string | Blob, filename: string) => {
    if (!fileSystemUtils.isFileSystemAccessSupported()) {
      // Fallback to download
      const blob = typeof content === 'string' ? new Blob([content]) : content;
      const url = URL.createObjectURL(blob);
      downloadFile(url, filename);
      URL.revokeObjectURL(url);
      return;
    }
    
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: filename
    });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }
};

// Export all utilities
export default {
  validateFile,
  formatFileSize,
  getFileIcon,
  getFileMetadata,
  getImageDimensions,
  compressImage,
  generateFilePreview,
  uploadFilesWithProgress,
  deduplicateFiles,
  fileToBase64,
  downloadFile,
  batchFileOperations,
  fileSystemUtils
};