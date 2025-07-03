'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload as UploadIcon, File, Mic, FileText, Video, X } from 'lucide-react';

interface UploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export function Upload({ 
  onFileSelect, 
  isLoading = false, 
  accept = ".mp3,.wav,.m4a,.ogg,.mp4,.mov,.avi,.txt,.docx,.pdf",
  maxSize = 100 
}: UploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    if (type.includes('audio')) return <Mic className="w-8 h-8 text-blue-500" />;
    if (type.includes('video')) return <Video className="w-8 h-8 text-purple-500" />;
    if (type.includes('text') || type.includes('pdf') || type.includes('document')) {
      return <FileText className="w-8 h-8 text-green-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = accept.split(',').map(type => type.trim().toLowerCase());
    
    if (!acceptedTypes.includes(fileExtension)) {
      return 'File type not supported';
    }

    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  }, [onFileSelect, accept, maxSize]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  }, [isLoading]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="space-y-4">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative cursor-pointer transition-all duration-300 ${
          dragActive 
            ? 'scale-105' 
            : 'hover:scale-[1.02]'
        } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isLoading}
        />
        
        {selectedFile && !isLoading ? (
          // File Selected State
          <div className="flex items-center justify-between p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center space-x-4">
              {getFileIcon(selectedFile)}
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="p-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          // Upload State
          <div className="text-center py-12">
            <div className="mx-auto mb-4">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${
                dragActive 
                  ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' 
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}>
                <UploadIcon className={`w-8 h-8 transition-colors ${
                  dragActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-slate-400 dark:text-slate-500'
                }`} />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                {isLoading ? 'Processing...' : 'Drop your file here or click to browse'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isLoading 
                  ? 'Please wait while we process your file...' 
                  : `Supports audio, video, and text files up to ${maxSize}MB`
                }
              </p>
            </div>

            {/* Loading Animation */}
            {isLoading && (
              <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Type Examples */}
      {!selectedFile && !isLoading && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Audio</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">MP3, WAV, M4A</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Video className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Video</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">MP4, MOV, AVI</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <FileText className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">Text</p>
            <p className="text-xs text-green-600 dark:text-green-400">TXT, DOCX, PDF</p>
          </div>
        </div>
      )}
    </div>
  );
}