import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, File, FileText, Music, Image, Video, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// Types
type FileUploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  status: FileUploadStatus;
  progress?: number;
  error?: string;
  uploadedAt?: Date;
  metadata?: Record<string, any>;
}

type FileUploadHandler = (files: File[]) => Promise<UploadedFile[]>;

interface FileUploadOptions {
  maxSize?: number;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  autoUpload?: boolean;
  showPreviews?: boolean;
  showFileSize?: boolean;
  showFileTypeIcon?: boolean;
  onUpload?: FileUploadHandler;
  onComplete?: (files: UploadedFile[]) => void;
  onError?: (error: Error) => void;
  onFilesAdded?: (files: File[]) => void;
  onFilesRemoved?: (files: UploadedFile[]) => void;
}

interface FileUploaderProps extends FileUploadOptions {
  className?: string;
  disabled?: boolean;
  dropzoneText?: string | React.ReactNode;
  dropzoneActiveText?: string | React.ReactNode;
  uploadButtonText?: string;
  clearButtonText?: string;
  showClearButton?: boolean;
  showUploadButton?: boolean;
}

// Default values
const DEFAULT_OPTIONS: Required<Omit<FileUploadOptions, 'onUpload' | 'onComplete' | 'onError' | 'onFilesAdded' | 'onFilesRemoved'>> = {
  maxSize: 16 * 1024 * 1024, // 16MB
  maxFiles: 1,
  accept: {
    'audio/*': ['.mp3', '.wav', '.m4a'],
    'text/plain': ['.txt']
  },
  autoUpload: true,
  showPreviews: true,
  showFileSize: true,
  showFileTypeIcon: true,
};

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const validateFile = (file: File, options: FileUploadOptions): string | null => {
  const { maxSize = DEFAULT_OPTIONS.maxSize, accept = DEFAULT_OPTIONS.accept } = options;
  
  if (file.size > maxSize) {
    return `File size exceeds ${formatFileSize(maxSize)}`;
  }
  
  const acceptedTypes = Object.keys(accept);
  const acceptedExtensions = Object.values(accept).flat();
  
  const isTypeAccepted = acceptedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -1));
    }
    return file.type === type;
  });
  
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isExtensionAccepted = acceptedExtensions.includes(fileExtension);
  
  if (!isTypeAccepted && !isExtensionAccepted) {
    return `File type not supported. Accepted types: ${acceptedExtensions.join(', ')}`;
  }
  
  return null;
};

const mockUpload = async (files: File[]): Promise<UploadedFile[]> => {
  // Simulate upload with progress
  return new Promise((resolve) => {
    setTimeout(() => {
      const uploadedFiles: UploadedFile[] = files.map(file => ({
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        status: 'done' as FileUploadStatus,
        progress: 100,
        uploadedAt: new Date(),
        metadata: {
          lastModified: file.lastModified,
          webkitRelativePath: (file as any).webkitRelativePath || ''
        }
      }));
      resolve(uploadedFiles);
    }, 1000 + Math.random() * 2000);
  });
};

const FileUploader: React.FC<FileUploaderProps> = ({
  className = '',
  disabled = false,
  dropzoneText = 'Drop files here or click to browse',
  dropzoneActiveText = 'Drop files here',
  uploadButtonText = 'Upload Files',
  clearButtonText = 'Clear All',
  showClearButton = true,
  showUploadButton = true,
  maxSize = DEFAULT_OPTIONS.maxSize,
  maxFiles = DEFAULT_OPTIONS.maxFiles,
  accept = DEFAULT_OPTIONS.accept,
  autoUpload = DEFAULT_OPTIONS.autoUpload,
  showPreviews = DEFAULT_OPTIONS.showPreviews,
  showFileSize = DEFAULT_OPTIONS.showFileSize,
  showFileTypeIcon = DEFAULT_OPTIONS.showFileTypeIcon,
  onUpload = mockUpload,
  onComplete,
  onError,
  onFilesAdded,
  onFilesRemoved,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Create accept string for input element
  const acceptString = React.useMemo(() => {
    const types = Object.keys(accept);
    const extensions = Object.values(accept).flat();
    return [...types, ...extensions].join(',');
  }, [accept]);

  const handleFiles = useCallback(async (newFiles: File[]) => {
    if (disabled) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate files
    for (const file of newFiles) {
      const error = validateFile(file, { maxSize, accept });
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // Check max files limit
    if (files.length + validFiles.length > maxFiles) {
      errors.push(`Cannot upload more than ${maxFiles} file(s)`);
      return;
    }

    if (errors.length > 0) {
      onError?.(new Error(errors.join(', ')));
      return;
    }

    if (validFiles.length === 0) return;

    // Create initial file objects
    const initialFiles: UploadedFile[] = validFiles.map(file => ({
      id: generateId(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: '',
      status: 'idle' as FileUploadStatus,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...initialFiles]);
    onFilesAdded?.(validFiles);

    if (autoUpload) {
      await uploadFiles(validFiles, initialFiles);
    }
  }, [disabled, files.length, maxFiles, maxSize, accept, onError, onFilesAdded, autoUpload]);

  const uploadFiles = useCallback(async (filesToUpload: File[], fileObjects: UploadedFile[]) => {
    if (!onUpload) return;

    setIsUploading(true);

    try {
      // Update status to uploading
      setFiles(prev => prev.map(file => 
        fileObjects.find(f => f.id === file.id) 
          ? { ...file, status: 'uploading' as FileUploadStatus }
          : file
      ));

      const uploadedFiles = await onUpload(filesToUpload);
      
      // Update with uploaded results
      setFiles(prev => prev.map(file => {
        const uploadedFile = uploadedFiles.find(uf => uf.id === file.id);
        return uploadedFile || file;
      }));

      onComplete?.(uploadedFiles);
    } catch (error) {
      // Update status to error
      setFiles(prev => prev.map(file => 
        fileObjects.find(f => f.id === file.id) 
          ? { ...file, status: 'error' as FileUploadStatus, error: (error as Error).message }
          : file
      ));
      onError?.(error as Error);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, onComplete, onError]);

  const handleManualUpload = useCallback(() => {
    if (!fileInputRef.current) return;
    
    const filesToUpload: File[] = [];
    const fileObjects: UploadedFile[] = [];
    
    files.forEach(file => {
      if (file.status === 'idle') {
        // We need to reconstruct the File object from the stored data
        // In a real implementation, you'd store the File objects separately
        fileObjects.push(file);
      }
    });

    if (fileObjects.length > 0) {
      // In a real implementation, you'd have access to the original File objects
      console.log('Manual upload would upload:', fileObjects);
    }
  }, [files]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      const newFiles = prev.filter(f => f.id !== fileId);
      if (fileToRemove) {
        onFilesRemoved?.([ fileToRemove]);
      }
      return newFiles;
    });
  }, [onFilesRemoved]);

  const clearAll = useCallback(() => {
    const filesToRemove = [...files];
    setFiles([]);
    onFilesRemoved?.(filesToRemove);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [files, onFilesRemoved]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={`w-full max-w-2xl mx-auto p-4 ${className}`}>
      {/* Dropzone */}
      <div
        ref={dropzoneRef}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptString}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        
        <p className="text-lg font-medium text-gray-700 mb-2">
          {dragActive ? dropzoneActiveText : dropzoneText}
        </p>
        
        <p className="text-sm text-gray-500">
          Max {maxFiles} file(s), up to {formatFileSize(maxSize)} each
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  {showFileSize && (
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                  {file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {file.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                  {file.status === 'done' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  disabled={file.status === 'uploading'}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {files.length > 0 && (
        <div className="flex justify-between mt-4">
          <div className="space-x-2">
            {!autoUpload && showUploadButton && (
              <button
                onClick={handleManualUpload}
                disabled={disabled || isUploading || files.every(f => f.status !== 'idle')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <span className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </span>
                ) : (
                  uploadButtonText
                )}
              </button>
            )}
          </div>
          
          {showClearButton && (
            <button
              onClick={clearAll}
              disabled={disabled || isUploading}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {clearButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Example usage
const App = () => {
  const handleUpload = async (files: File[]): Promise<UploadedFile[]> => {
    // Simulate upload process
    console.log('Uploading files:', files);
    return mockUpload(files);
  };

  const handleComplete = (files: UploadedFile[]) => {
    console.log('Upload complete:', files);
  };

  const handleError = (error: Error) => {
    console.error('Upload error:', error);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">File Uploader</h1>
        
        <FileUploader
          maxFiles={5}
          maxSize={10 * 1024 * 1024} // 10MB
          accept={{
            'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
            'text/*': ['.txt', '.csv'],
            'application/pdf': ['.pdf']
          }}
          onUpload={handleUpload}
          onComplete={handleComplete}
          onError={handleError}
          autoUpload={true}
          showPreviews={true}
          dropzoneText="Drop your files here or click to browse"
          dropzoneActiveText="Release to upload files"
        />
      </div>
    </div>
  );
};

export default App;