'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadThing } from '@/utils/uploadthing';
import { File, Loader2, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Progress } from './progress';

type FileWithPreview = File & {
  preview: string;
  uploadProgress?: number;
  status?: 'uploading' | 'done' | 'error';
  error?: string;
};

type UploadInputProps = {
  className?: string;
  onUploadComplete?: (files: FileWithPreview[]) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  disabled?: boolean;
};

const DEFAULT_ACCEPT = {
  'audio/*': ['.mp3', '.wav', '.m4a'],
  'text/plain': ['.txt'],
};

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

export function UploadInput({
  className,
  onUploadComplete,
  onUploadError,
  maxFiles = 1,
  maxSize = MAX_FILE_SIZE,
  accept = DEFAULT_ACCEPT,
  disabled = false,
}: UploadInputProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload, isUploading: isUploadThingUploading } = useUploadThing(
    'meetingUploader',
    {
      onClientUploadComplete: (res) => {
        const uploadedFiles = files.map(file => ({
          ...file,
          status: 'done' as const,
          uploadProgress: 100,
        }));
        setFiles(uploadedFiles);
        onUploadComplete?.(uploadedFiles);
        setIsUploading(false);
      },
      onUploadError: (error: Error) => {
        const erroredFiles = files.map(file => ({
          ...file,
          status: 'error' as const,
          error: error.message,
        }));
        setFiles(erroredFiles);
        onUploadError?.(error);
        setIsUploading(false);
      },
      onUploadProgress: (progress) => {
        setFiles(prevFiles =>
          prevFiles.map(file => ({
            ...file,
            uploadProgress: progress,
            status: 'uploading' as const,
          }))
        );
      },
    }
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;

      const newFiles = acceptedFiles.map(file =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
          uploadProgress: 0,
          status: 'uploading' as const,
        })
      );

      setFiles(prevFiles => {
        const updatedFiles = [...prevFiles, ...newFiles].slice(0, maxFiles);
        return updatedFiles;
      });

      // Start upload immediately
      handleUpload(newFiles);
    },
    [disabled, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    disabled: disabled || isUploading || files.length >= maxFiles,
  });

  const handleUpload = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;

    try {
      setIsUploading(true);
      await startUpload(filesToUpload);
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
      setIsUploading(false);
    }
  };

  const removeFile = (fileIndex: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      const [removed] = newFiles.splice(fileIndex, 1);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return newFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('audio/')) {
      return <File className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const isLoading = isUploading || isUploadThingUploading;

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30',
          disabled && 'opacity-60 cursor-not-allowed',
          (isUploading || files.length >= maxFiles) && 'cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-3">
            <UploadCloud
              className={cn(
                'h-6 w-6',
                isDragActive ? 'text-blue-600' : 'text-gray-500',
                disabled && 'text-gray-400'
              )}
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {isDragActive ? (
              <p>Drop the files here</p>
            ) : (
              <p>
                <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Object.values(accept)
                .flat()
                .map(ext => ext.toUpperCase())
                .join(', ')}{' '}
              (max {formatFileSize(maxSize)})
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={file.name}
              className="border rounded-lg p-3 flex items-center justify-between bg-white dark:bg-gray-800"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span
                      className={cn(
                        'font-medium',
                        file.status === 'error'
                          ? 'text-red-500'
                          : file.status === 'done'
                          ? 'text-green-500'
                          : 'text-blue-500'
                      )}
                    >
                      {file.status === 'uploading'
                        ? 'Uploading...'
                        : file.status === 'done'
                        ? 'Uploaded'
                        : 'Error'}
                    </span>
                  </div>
                  {file.uploadProgress !== undefined && file.uploadProgress < 100 && (
                    <div className="mt-1">
                      <Progress
                        value={file.uploadProgress}
                        className="h-1.5"
                      />
                    </div>
                  )}
                  {file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing files...</span>
        </div>
      )}

      {files.length > 0 && !isLoading && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => setFiles([])}
            disabled={isLoading}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
