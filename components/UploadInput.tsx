import { UploadButton, UploadDropzone } from "@uploadthing/react";
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { OurFileRouter } from "../app/api/uploadthing/core";

// Enhanced interfaces with comprehensive typing
interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
  lastModified: number;
  uploadedAt: Date;
  id: string;
  preview?: string;
  metadata?: Record<string, any>;
}

interface UploadProgress {
  fileId: string;
  progress: number;
  bytesUploaded: number;
  totalBytes: number;
  speed: number;
  eta: number;
}

interface UploadInputProps {
  onUploadSuccess?: (files: UploadedFile[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadProgress?: (progress: UploadProgress[]) => void;
  onFileValidation?: (file: File) => boolean | string;
  onFilePreview?: (file: File) => Promise<string>;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  enablePreview?: boolean;
  enableBatchUpload?: boolean;
  enableRetry?: boolean;
  enableCompression?: boolean;
  enableMetadata?: boolean;
  enableAnalytics?: boolean;
  customValidation?: (file: File) => Promise<boolean | string>;
  compressionQuality?: number;
  retryAttempts?: number;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showUploadStats?: boolean;
  enableDuplicateCheck?: boolean;
  onDuplicateFound?: (file: File, existing: UploadedFile) => 'skip' | 'replace' | 'keep-both';
}

// Utility functions for enhanced capabilities
const generateFileId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatTime = (seconds: number): string => {
  if (seconds === Infinity || isNaN(seconds)) return '∞';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
};

const getFileType = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type;
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('document') || ['doc', 'docx'].includes(extension || '')) return 'document';
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx'].includes(extension || '')) return 'spreadsheet';
  if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension || '')) return 'presentation';
  if (['txt', 'md', 'json', 'xml', 'csv'].includes(extension || '')) return 'text';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) return 'archive';
  return 'other';
};

const generatePreview = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve('');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const compressImage = async (file: File, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export function UploadInput({
  onUploadSuccess,
  onUploadError,
  onUploadProgress,
  onFileValidation,
  onFilePreview,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedFileTypes = ['*'],
  enablePreview = true,
  enableBatchUpload = true,
  enableRetry = true,
  enableCompression = false,
  enableMetadata = true,
  enableAnalytics = true,
  customValidation,
  compressionQuality = 0.8,
  retryAttempts = 3,
  theme = 'auto',
  className = '',
  disabled = false,
  placeholder = 'Drop files here or click to browse',
  showUploadStats = true,
  enableDuplicateCheck = true,
  onDuplicateFound = () => 'skip',
}: UploadInputProps) {
  // Enhanced state management
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploadStats, setUploadStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    successCount: 0,
    errorCount: 0,
    averageSpeed: 0,
    totalTime: 0,
  });
  const [retryQueue, setRetryQueue] = useState<{ file: File; attempts: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTime = useRef<number>(0);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Enhanced file validation
  const validateFile = useCallback(async (file: File): Promise<boolean | string> => {
    const errors: string[] = [];

    // Size validation
    if (file.size > maxFileSize) {
      errors.push(`File too large. Maximum size: ${formatBytes(maxFileSize)}`);
    }

    // Type validation
    if (!acceptedFileTypes.includes('*')) {
      const isAccepted = acceptedFileTypes.some(type => 
        file.type.includes(type) || file.name.toLowerCase().endsWith(type.toLowerCase())
      );
      if (!isAccepted) {
        errors.push(`File type not accepted. Accepted types: ${acceptedFileTypes.join(', ')}`);
      }
    }

    // Duplicate check
    if (enableDuplicateCheck) {
      const duplicate = uploadedFiles.find(f => f.name === file.name && f.size === file.size);
      if (duplicate) {
        const action = onDuplicateFound(file, duplicate);
        if (action === 'skip') {
          errors.push('File already exists and was skipped');
        }
      }
    }

    // Custom validation
    if (customValidation) {
      try {
        const customResult = await customValidation(file);
        if (customResult !== true) {
          errors.push(typeof customResult === 'string' ? customResult : 'Custom validation failed');
        }
      } catch (err) {
        errors.push('Custom validation error');
      }
    }

    // Component-level validation
    if (onFileValidation) {
      const result = onFileValidation(file);
      if (result !== true) {
        errors.push(typeof result === 'string' ? result : 'File validation failed');
      }
    }

    return errors.length === 0 ? true : errors.join('; ');
  }, [maxFileSize, acceptedFileTypes, enableDuplicateCheck, uploadedFiles, customValidation, onFileValidation, onDuplicateFound]);

  // Enhanced file processing
  const processFile = useCallback(async (file: File): Promise<File> => {
    let processedFile = file;

    // Compression
    if (enableCompression && file.type.startsWith('image/')) {
      try {
        processedFile = await compressImage(file, compressionQuality);
      } catch (error) {
        console.warn('Compression failed, using original file:', error);
      }
    }

    return processedFile;
  }, [enableCompression, compressionQuality]);

  // Enhanced preview generation
  const generateFilePreviews = useCallback(async (files: File[]): Promise<Record<string, string>> => {
    if (!enablePreview) return {};

    const previewPromises = files.map(async (file) => {
      const id = generateFileId();
      try {
        let preview = '';
        if (onFilePreview) {
          preview = await onFilePreview(file);
        } else {
          preview = await generatePreview(file);
        }
        return { id: file.name, preview };
      } catch (error) {
        console.warn('Preview generation failed:', error);
        return { id: file.name, preview: '' };
      }
    });

    const results = await Promise.all(previewPromises);
    return results.reduce((acc, { id, preview }) => {
      acc[id] = preview;
      return acc;
    }, {} as Record<string, string>);
  }, [enablePreview, onFilePreview]);

  // Enhanced upload handler
  const handleUploadComplete = useCallback(
    (res: { name: string; url: string; size: number }[]) => {
      const enhancedFiles: UploadedFile[] = res.map(file => ({
        ...file,
        type: getFileType(new File([], file.name)),
        lastModified: Date.now(),
        uploadedAt: new Date(),
        id: generateFileId(),
        preview: previews[file.name],
        metadata: enableMetadata ? {
          fileType: getFileType(new File([], file.name)),
          uploadDuration: Date.now() - uploadStartTime.current,
        } : undefined,
      }));

      setUploadedFiles(prev => [...prev, ...enhancedFiles]);
      setUploading(false);
      setError(null);
      setUploadProgress([]);

      // Update stats
      setUploadStats(prev => ({
        ...prev,
        totalFiles: prev.totalFiles + res.length,
        totalSize: prev.totalSize + res.reduce((sum, file) => sum + file.size, 0),
        successCount: prev.successCount + res.length,
        totalTime: Date.now() - uploadStartTime.current,
      }));

      // Analytics
      if (enableAnalytics) {
        const analyticsData = {
          filesUploaded: res.length,
          totalSize: res.reduce((sum, file) => sum + file.size, 0),
          uploadDuration: Date.now() - uploadStartTime.current,
          fileTypes: res.map(file => getFileType(new File([], file.name))),
        };
        setAnalysisResults(prev => ({ ...prev, lastUpload: analyticsData }));
      }

      if (onUploadSuccess) {
        onUploadSuccess(enhancedFiles);
      }

      console.log("Enhanced upload completed:", enhancedFiles);
    },
    [previews, enableMetadata, enableAnalytics, onUploadSuccess]
  );

  // Enhanced error handler with retry logic
  const handleUploadError = useCallback(
    (error: Error, file?: File) => {
      setUploading(false);
      setError(error.message);

      // Retry logic
      if (enableRetry && file && retryAttempts > 0) {
        const existingRetry = retryQueue.find(r => r.file.name === file.name);
        if (!existingRetry) {
          setRetryQueue(prev => [...prev, { file, attempts: 1 }]);
        } else if (existingRetry.attempts < retryAttempts) {
          existingRetry.attempts++;
        }
      }

      setUploadStats(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
      }));

      if (onUploadError) {
        onUploadError(error);
      }

      console.error("Enhanced upload error:", error);
    },
    [enableRetry, retryAttempts, retryQueue, onUploadError]
  );

  // Progress tracking
  const handleUploadProgress = useCallback((progress: UploadProgress) => {
    setUploadProgress(prev => {
      const existing = prev.find(p => p.fileId === progress.fileId);
      if (existing) {
        return prev.map(p => p.fileId === progress.fileId ? progress : p);
      }
      return [...prev, progress];
    });

    if (onUploadProgress) {
      onUploadProgress([progress]);
    }
  }, [onUploadProgress]);

  // File removal
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[fileId];
      return newPreviews;
    });
  }, []);

  // Retry failed uploads
  const retryFailedUploads = useCallback(() => {
    // Implementation would depend on your upload library's retry mechanism
    console.log('Retrying failed uploads:', retryQueue);
  }, [retryQueue]);

  // Clear all uploads
  const clearAllUploads = useCallback(() => {
    setUploadedFiles([]);
    setPreviews({});
    setError(null);
    setValidationErrors([]);
    setUploadProgress([]);
    setRetryQueue([]);
    setUploadStats({
      totalFiles: 0,
      totalSize: 0,
      successCount: 0,
      errorCount: 0,
      averageSpeed: 0,
      totalTime: 0,
    });
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Computed values
  const canUploadMore = useMemo(() => {
    return uploadedFiles.length < maxFiles && !disabled;
  }, [uploadedFiles.length, maxFiles, disabled]);

  const totalUploadProgress = useMemo(() => {
    if (uploadProgress.length === 0) return 0;
    return uploadProgress.reduce((sum, p) => sum + p.progress, 0) / uploadProgress.length;
  }, [uploadProgress]);

  const uploadSpeed = useMemo(() => {
    if (uploadProgress.length === 0) return 0;
    return uploadProgress.reduce((sum, p) => sum + p.speed, 0);
  }, [uploadProgress]);

  // Theme classes
  const themeClasses = useMemo(() => {
    const base = 'transition-all duration-300 ease-in-out';
    const themes = {
      light: 'bg-white border-gray-300 text-gray-900',
      dark: 'bg-gray-900 border-gray-600 text-white',
      auto: 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white',
    };
    return `${base} ${themes[theme]}`;
  }, [theme]);

  return (
    <div className={`flex flex-col items-center justify-center w-full space-y-6 ${className}`}>
      {/* Enhanced Upload Zone */}
      <div className="w-full relative">
        <UploadDropzone<OurFileRouter, "meetingUploader">
          endpoint="meetingUploader"
          onClientUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          onUploadBegin={(fileName) => {
            setUploading(true);
            setError(null);
            setValidationErrors([]);
            uploadStartTime.current = Date.now();
            console.log("Enhanced upload started:", fileName);
          }}
          disabled={!canUploadMore}
          className={`
            relative min-h-[200px] border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105' : 'border-gray-300 hover:border-gray-400'}
            ${!canUploadMore ? 'opacity-50 cursor-not-allowed' : ''}
            ${themeClasses}
          `}
        />
        
        {/* Upload Progress Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center min-w-[300px]">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${totalUploadProgress}%` }}
                />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Uploading... {Math.round(totalUploadProgress)}%
              </p>
              {uploadSpeed > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {formatBytes(uploadSpeed)}/s
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Status Messages */}
      {error && (
        <div className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800 dark:text-red-200 font-medium">Error: {error}</p>
            {enableRetry && retryQueue.length > 0 && (
              <button
                onClick={retryFailedUploads}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Retry ({retryQueue.length})
              </button>
            )}
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="w-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Validation Errors:</h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Statistics */}
      {showUploadStats && (uploadStats.totalFiles > 0 || uploading) && (
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{uploadStats.totalFiles}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatBytes(uploadStats.totalSize)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{uploadStats.successCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Success</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{uploadStats.errorCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Errors</div>
          </div>
        </div>
      )}

      {/* Enhanced File List */}
      {uploadedFiles.length > 0 && (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <button
              onClick={clearAllUploads}
              className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid gap-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* File Preview */}
                {enablePreview && file.preview && (
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </h4>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatBytes(file.size)}</span>
                    <span className="capitalize">{file.type}</span>
                    <span>{file.uploadedAt.toLocaleDateString()}</span>
                  </div>
                  {file.metadata && (
                    <div className="mt-2 text-xs text-gray-400">
                      Upload time: {file.metadata.uploadDuration}ms
                    </div>
                  )}
                </div>
                
                {/* Success Indicator */}
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Controls */}
      <div className="w-full flex flex-wrap gap-2 justify-center">
        {enableBatchUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!canUploadMore}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            Add More Files
          </button>
        )}
        
        {uploadedFiles.length > 0 && (
          <button
            onClick={() => {
              const urls = uploadedFiles.map(f => f.url);
              navigator.clipboard.writeText(urls.join('\n'));
            }}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Copy URLs
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple={enableBatchUpload}
        className="hidden"
        accept={acceptedFileTypes.join(',')}
      />
    </div>
  );
}