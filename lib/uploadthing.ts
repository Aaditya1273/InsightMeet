import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadButton as UploadButtonBase, UploadDropzone as UploadDropzoneBase } from '@uploadthing/react';
import { z } from 'zod';
import * as React from 'react';

const f = createUploadthing();

// Enhanced file validation schema
const fileValidationSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive(),
  fileType: z.string().min(1),
  uploadedBy: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Define the file size type that UploadThing expects
type FileSize = "1B" | "1KB" | "1MB" | "1GB" | "2B" | "2KB" | "2MB" | "2GB" | "4B" | "4KB" | "4MB" | "4GB" | "8B" | "8KB" | "8MB" | "8GB" | "16B" | "16KB" | "16MB" | "16GB" | "32MB" | "32GB" | "64MB" | "64GB" | "128MB" | "256MB" | "512MB" | "1024KB" | "1024MB" | "1024GB";

// Supported file types with their configurations
const SUPPORTED_FILE_TYPES = {
  // Text files
  'text/plain': { maxFileSize: '16MB' as FileSize, maxFileCount: 10, category: 'document' } as const,
  'text/csv': { maxFileSize: '16MB' as FileSize, maxFileCount: 10, category: 'document' } as const,
  
  // Images
  'image/jpeg': { maxFileSize: '8MB' as FileSize, maxFileCount: 10, category: 'image' } as const,
  'image/png': { maxFileSize: '8MB' as FileSize, maxFileCount: 10, category: 'image' } as const,
  'image/webp': { maxFileSize: '8MB' as FileSize, maxFileCount: 10, category: 'image' } as const,
  'image/svg+xml': { maxFileSize: '4MB' as FileSize, maxFileCount: 10, category: 'image' } as const,
  
  // Audio files
  'audio/mp3': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'audio' } as const,
  'audio/mpeg': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'audio' } as const,
  'audio/wav': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'audio' } as const,
  'audio/ogg': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'audio' } as const,
  'audio/webm': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'audio' } as const,
  'audio/mp4': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'audio' } as const,
  'audio/x-m4a': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'audio' } as const,
  
  // Video files
  'video/mp4': { maxFileSize: '256MB' as FileSize, maxFileCount: 5, category: 'video' } as const,
  'video/webm': { maxFileSize: '256MB' as FileSize, maxFileCount: 5, category: 'video' } as const,
  'video/quicktime': { maxFileSize: '256MB' as FileSize, maxFileCount: 5, category: 'video' } as const,
  'video/x-msvideo': { maxFileSize: '256MB' as FileSize, maxFileCount: 5, category: 'video' } as const,
  
  // Documents
  'application/msword': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'document' } as const,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    maxFileSize: '32MB' as FileSize, 
    maxFileCount: 5, 
    category: 'document' 
  } as const,
  'application/vnd.ms-excel': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'document' } as const,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { 
    maxFileSize: '32MB' as FileSize, 
    maxFileCount: 5, 
    category: 'document' 
  } as const,
  'application/vnd.ms-powerpoint': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'document' } as const,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { 
    maxFileSize: '32MB' as FileSize, 
    maxFileCount: 5, 
    category: 'document' 
  } as const,
  'application/pdf': { maxFileSize: '32MB' as FileSize, maxFileCount: 5, category: 'document' } as const,
} as const;

// Extract the category type from the SUPPORTED_FILE_TYPES values
type FileCategory = typeof SUPPORTED_FILE_TYPES[keyof typeof SUPPORTED_FILE_TYPES]['category'];

// Supported file types with their configurations
type SupportedFileTypes = keyof typeof SUPPORTED_FILE_TYPES;

// Enhanced file router with multiple upload endpoints
export const ourFileRouter = {
  // Main meeting uploader with comprehensive file support
  meetingUploader: f(SUPPORTED_FILE_TYPES as Record<keyof typeof SUPPORTED_FILE_TYPES, { 
    maxFileSize: FileSize; 
    maxFileCount: number;
    category: FileCategory;
  }>)
    .middleware(async ({ req, files }) => {
      // Enhanced authentication and validation
      const timestamp = Date.now();
      
      // Validate each file before processing
      for (const file of files) {
        const validationErrors = validateFileIntegrity(file);
        if (validationErrors.length > 0) {
          throw new Error(`File validation failed: ${validationErrors.join(', ')}`);
        }
      }
      
      // Return metadata for the upload process
      return {
        userId: req.headers.get('user-id') || 'anonymous',
        uploadId: `upload_${timestamp}`,
        timestamp,
        totalFiles: files.length,
        sessionId: req.headers.get('session-id') || `session_${timestamp}`,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        // Process file metadata
        const processedMetadata = processFileMetadata(file, metadata);
        
        // Enhanced file processing based on type
        const fileCategory = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]?.category;
        
        let processingResult: any = {};
        
        switch (fileCategory) {
          case 'audio':
            processingResult = {
              duration: null, // Could be extracted with audio processing library
              format: file.type,
              isProcessingRequired: true,
            };
            break;
            
          case 'document':
            processingResult = {
              pageCount: null, // Could be extracted with document processing
              wordCount: null,
              isTextExtractionRequired: true,
            };
            break;
            
          case 'image':
            processingResult = {
              dimensions: null, // Could be extracted with image processing
              hasText: null, // OCR capability
            };
            break;
            
          case 'video':
            processingResult = {
              duration: null,
              resolution: null,
              isTranscriptionRequired: true,
            };
            break;
        }
        
        // Enhanced return object with comprehensive metadata
        const result = {
          success: true,
          fileKey: processedMetadata.fileKey,
          fileUrl: file.url,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileCategory,
          uploadId: metadata.uploadId,
          uploadTimestamp: processedMetadata.uploadTimestamp,
          userId: metadata.userId,
          sessionId: metadata.sessionId,
          processingResult,
          metadata: processedMetadata,
          // Additional useful fields
          downloadUrl: file.url,
          previewUrl: fileCategory === 'image' ? file.url : null,
          isProcessingComplete: false,
          processingStatus: 'pending',
        };
        
        // Here you would typically:
        // 1. Save to database
        // 2. Trigger background processing
        // 3. Send notifications
        // 4. Update analytics
        
        console.log('File upload completed successfully:', result);
        
        return result;
        
      } catch (error) {
        console.error('Upload processing error:', error);
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          fileKey: file.key,
          fileUrl: file.url,
          fileName: file.name,
          uploadTimestamp: Date.now(),
        };
      }
    }),

  // Specialized audio uploader for meeting recordings
  audioUploader: f({
    'audio/mpeg': { maxFileSize: '256MB' as FileSize, maxFileCount: 1 },
    'audio/mp4': { maxFileSize: '256MB' as FileSize, maxFileCount: 1 },
    'audio/webm': { maxFileSize: '256MB' as FileSize, maxFileCount: 1 },
  } as const)
    .middleware(async ({ req }) => ({
      userId: req.headers.get('user-id') || 'anonymous',
      uploadType: 'audio-recording',
      timestamp: Date.now(),
    }))
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        success: true,
        fileKey: file.key,
        audioUrl: file.url,
        fileName: file.name,
        fileSize: file.size,
        uploadType: metadata.uploadType,
        timestamp: metadata.timestamp,
        requiresTranscription: true,
        processingStatus: 'queued-for-transcription',
      };
    }),

  // Batch document uploader
  documentBatchUploader: f({
    'application/pdf': { maxFileSize: '32MB' as FileSize, maxFileCount: 20 },
    'text/plain': { maxFileSize: '16MB' as FileSize, maxFileCount: 20 },
    'application/msword': { maxFileSize: '32MB' as FileSize, maxFileCount: 20 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
      maxFileSize: '32MB' as FileSize, maxFileCount: 20 
    },
  } as const)
    .middleware(async ({ req }) => ({
      userId: req.headers.get('user-id') || 'anonymous',
      batchId: `batch_${Date.now()}`,
      uploadType: 'document-batch',
    }))
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        success: true,
        fileKey: file.key,
        documentUrl: file.url,
        fileName: file.name,
        fileSize: file.size,
        batchId: metadata.batchId,
        uploadType: metadata.uploadType,
        requiresTextExtraction: true,
        processingStatus: 'queued-for-processing',
      };
    }),

} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

// Utility functions for file processing
const generateFileKey = (originalName: string, timestamp: number): string => {
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${timestamp}_${sanitizedName}`;
};

const validateFileIntegrity = (file: { name: string; size: number; type: string }): string[] => {
  const errors: string[] = [];
  
  // Check file name
  if (!file.name || file.name.length > 255) {
    errors.push('Invalid file name length');
  }
  
  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs'];
  const hasExt = dangerousExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  if (hasExt) {
    errors.push('File type not allowed for security reasons');
  }
  
  // Check file size
  if (file.size <= 0) {
    errors.push('File appears to be empty');
  }
  
  // Check MIME type
  if (!SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]) {
    errors.push(`File type ${file.type} is not supported`);
  }
  
  return errors;
};

const processFileMetadata = (file: any, metadata: any): any => {
  const timestamp = Date.now();
  const fileCategory = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]?.category || 'unknown';
  
  return {
    ...metadata,
    uploadTimestamp: timestamp,
    originalFileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileCategory,
    processedAt: new Date().toISOString(),
    fileKey: generateFileKey(file.name, timestamp),
  };
};

// Enhanced upload button configurations
interface EnhancedUploadButtonProps extends Omit<React.ComponentProps<typeof UploadButtonBase>, 
  'onClientUploadComplete' | 'onUploadError' | 'onUploadBegin' | 'onUploadProgress'
> {
  endpoint?: keyof OurFileRouter;
  onClientUploadComplete?: (res: any[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadBegin?: (name: string) => void;
  onUploadProgress?: (progress: number) => void;
}

export const UploadButton: React.FC<EnhancedUploadButtonProps> = ({
  endpoint = 'meetingUploader',
  onClientUploadComplete,
  onUploadError,
  onUploadBegin,
  onUploadProgress,
  ...props
}) => {
  return React.createElement(
    UploadButtonBase,
    {
      endpoint: endpoint,
      onClientUploadComplete: onClientUploadComplete,
      onUploadError: onUploadError,
      onUploadBegin: onUploadBegin,
      onUploadProgress: onUploadProgress,
      ...props
    },
    []
  );
};

export const UploadDropzone: React.FC<EnhancedUploadButtonProps> = ({
  endpoint = 'meetingUploader',
  onClientUploadComplete,
  onUploadError,
  onUploadBegin,
  onUploadProgress,
  ...props
}) => {
  return (
    <UploadDropzoneBase
      endpoint={endpoint}
      onClientUploadComplete={onClientUploadComplete}
      onUploadError={onUploadError}
      onUploadBegin={onUploadBegin}
      onUploadProgress={onUploadProgress}
      {...props}
    />
  );
};

// Utility functions for client-side usage
export const fileUtils = {
  validateFileSize: (file: File, maxSize: string): boolean => {
    const sizeInBytes = parseInt(maxSize.replace(/\D/g, '')) * 1024 * 1024;
    return file.size <= sizeInBytes;
  },
  
  getFileCategory: (fileType: string): string => {
    return (SUPPORTED_FILE_TYPES as Record<string, { category: string }>)[fileType]?.category || 'unknown';
  },
  
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },
  
  getSupportedFileTypes: (): string[] => Object.keys(SUPPORTED_FILE_TYPES),
  
  isFileTypeSupported: (fileType: string): boolean => {
    return fileType in SUPPORTED_FILE_TYPES;
  },
};

// Error handling utilities
export const uploadErrorHandler = (error: Error): string => {
  console.error('Upload error:', error);
  
  if (error.message.includes('File too large')) {
    return 'File size exceeds the maximum allowed limit';
  } else if (error.message.includes('File type not supported')) {
    return 'This file type is not supported for upload';
  } else if (error.message.includes('Network')) {
    return 'Network error occurred. Please check your connection and try again';
  } else if (error.message.includes('Authentication')) {
    return 'Authentication failed. Please log in and try again';
  }
  return 'An unexpected error occurred. Please try again later';
};