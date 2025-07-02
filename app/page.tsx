'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from '@/components/Upload';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const { sessionId } = await response.json();
      router.push(`/results?sessionId=${sessionId}`);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to process file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">InsightMeet</h1>
        <p className="text-lg text-muted-foreground">
          Transform your meetings into actionable insights with AI
        </p>
      </header>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Upload Meeting</h2>
          <p className="card-description">
            Upload an audio recording or text transcript of your meeting
          </p>
        </div>
        <div className="card-content">
          <Upload onFileSelect={handleFileUpload} isLoading={isLoading} />
          {error && (
            <div className="mt-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
