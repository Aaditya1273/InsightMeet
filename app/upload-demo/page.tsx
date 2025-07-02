'use client';

import { useState } from 'react';
import { UploadInput } from '@/components/ui/upload-input';
import { Button } from '@/components/ui/button';
import { FileText, FileAudio } from 'lucide-react';

export default function UploadDemoPage() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadComplete = (files: any[]) => {
    console.log('Upload complete:', files);
    setUploadedFiles(files);
    setIsProcessing(false);
    
    // Here you would typically process the files further
    // For example, send them to your API for transcription/summarization
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    setIsProcessing(false);
  };

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Here you would send the files to your API for processing
      // For example:
      // const response = await fetch('/api/process-meeting', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     files: uploadedFiles.map(file => ({
      //       url: file.url,
      //       name: file.name,
      //       type: file.type,
      //     })),
      //   }),
      // });
      // const result = await response.json();
      // console.log('Processing result:', result);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Files processed successfully');
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Meeting Files</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload audio recordings or transcripts of your meetings to generate summaries and action items.
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <UploadInput
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          maxFiles={3}
          className="mb-6"
        />
        
        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Uploaded Files</h2>
              <span className="text-sm text-gray-500">
                {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    {file.type.startsWith('audio/') ? (
                      <FileAudio className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)} • {file.type}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                    Uploaded
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={processFiles} 
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Process Files'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-3">Supported File Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 dark:bg-blue-800/50 p-2 rounded-md">
              <FileAudio className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Audio Files</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">MP3, WAV, M4A</p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                Maximum 16MB per file
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-green-100 dark:bg-green-800/50 p-2 rounded-md">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <h4 className="font-medium text-green-900 dark:text-green-100">Text Files</h4>
              <p className="text-sm text-green-700 dark:text-green-300">TXT</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
                Maximum 4MB per file
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
