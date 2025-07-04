'use client';

import { useRouter } from 'next/navigation';
import { useFileUpload } from '@/lib/hooks/use-file-upload';
import { Upload } from '@/components/Upload';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { uploadFile, status, progress, error } = useFileUpload({
    onSuccess: (data) => {
      // Navigate to results page with file key
      router.push(`/results?fileKey=${data.fileKey}`);
    },
    onError: (error) => {
      console.error('Upload error:', error);
    }
  });

  const handleFileSelect = (file: File) => {
    uploadFile(file);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Your Document</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a PDF document to generate a summary and action items.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <Upload 
          onFileSelect={handleFileSelect} 
          isLoading={status === 'uploading'}
          accept=".pdf"
          maxSize={50}
        />

        {status === 'uploading' && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Uploading... {progress}%
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 rounded-md text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {status === 'success' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 rounded-md text-green-700 dark:text-green-300">
            File uploaded successfully! Redirecting to results...
          </div>
        )}
      </div>
    </div>
  );
}
