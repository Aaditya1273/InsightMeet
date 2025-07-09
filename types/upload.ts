// Types
export type FileUploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface UploadedFile {
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

export type FileUploadHandler = (files: File[]) => Promise<UploadedFile[]>;

export interface FileUploadOptions {
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

export interface FileUploaderProps extends FileUploadOptions {
  className?: string;
  disabled?: boolean;
  dropzoneText?: string | React.ReactNode;
  dropzoneActiveText?: string | React.ReactNode;
  uploadButtonText?: string;
  clearButtonText?: string;
  showClearButton?: boolean;
  showUploadButton?: boolean;
}