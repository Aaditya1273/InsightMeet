import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();

// Helper function to validate file before upload
export const validateFile = (file: File, accept: Record<string, string[]>, maxSize: number) => {
  // Check file type
  const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const acceptedExtensions = Object.values(accept).flat();
  
  if (!acceptedExtensions.some(ext => fileExtension === ext.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid file type. Accepted types: ${acceptedExtensions.join(', ')}`
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File is too large. Maximum size is ${formatFileSize(maxSize)}`
    };
  }

  return { isValid: true };
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Get file icon based on file type
export const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('audio/')) {
    return '🎵';
  }
  if (fileType.startsWith('image/')) {
    return '🖼️';
  }
  if (fileType === 'application/pdf') {
    return '📄';
  }
  if (fileType === 'text/plain') {
    return '📝';
  }
  return '📁';
};