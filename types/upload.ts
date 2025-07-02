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
  /**
   * Maximum file size in bytes
   * @default 16 * 1024 * 1024 (16MB)
   */
  maxSize?: number;
  
  /**
   * Maximum number of files allowed to be uploaded
   * @default 1
   */
  maxFiles?: number;
  
  /**
   * Accepted file types
   * @default {
   *   'audio/*': ['.mp3', '.wav', '.m4a'],
   *   'text/plain': ['.txt']
   * }
   */
  accept?: Record<string, string[]>;
  
  /**
   * Whether to automatically start upload when files are selected
   * @default true
   */
  autoUpload?: boolean;
  
  /**
   * Whether to show file previews
   * @default true
   */
  showPreviews?: boolean;
  
  /**
   * Whether to show file size
   * @default true
   */
  showFileSize?: boolean;
  
  /**
   * Whether to show file type icon
   * @default true
   */
  showFileTypeIcon?: boolean;
  
  /**
   * Custom upload handler function
   * If not provided, will use the default UploadThing handler
   */
  onUpload?: FileUploadHandler;
  
  /**
   * Callback when upload is complete
   */
  onComplete?: (files: UploadedFile[]) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
  
  /**
   * Callback when files are added
   */
  onFilesAdded?: (files: File[]) => void;
  
  /**
   * Callback when files are removed
   */
  onFilesRemoved?: (files: UploadedFile[]) => void;
}

export interface FileUploaderProps extends FileUploadOptions {
  /**
   * Additional class name for the root element
   */
  className?: string;
  
  /**
   * Whether the uploader is disabled
   */
  disabled?: boolean;
  
  /**
   * Custom dropzone text
   */
  dropzoneText?: string | React.ReactNode;
  
  /**
   * Custom dropzone active text
   */
  dropzoneActiveText?: string | React.ReactNode;
  
  /**
   * Custom upload button text
   */
  uploadButtonText?: string;
  
  /**
   * Custom clear all button text
   */
  clearButtonText?: string;
  
  /**
   * Whether to show the clear all button
   * @default true
   */
  showClearButton?: boolean;
  
  /**
   * Whether to show the upload button
   * Only applicable when autoUpload is false
   * @default true
   */
  showUploadButton?: boolean;
}
