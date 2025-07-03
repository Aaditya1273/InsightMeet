'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload as FileUpload } from '@/components/Upload';
import { Upload as UploadIcon } from 'lucide-react';
import { useUploadThing } from '@/utils/uploadthing';
import { FileText, Mic, Sparkles, Clock, Users, Target, CheckCircle } from 'lucide-react';

interface UploadedFile {
  key: string;
  url: string;
  name: string;
  size: number;
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const { startUpload, isUploading } = useUploadThing('meetingUploader', {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        const file = res[0];
        // Store the file info for the results page
        const fileData: UploadedFile = {
          key: file.key,
          url: file.url,
          name: file.name,
          size: file.size
        };
        
        // Use localStorage as fallback since sessionStorage might not be available
        try {
          sessionStorage.setItem('uploadedFile', JSON.stringify(fileData));
        } catch {
          localStorage.setItem('uploadedFile', JSON.stringify(fileData));
        }
        
        // Navigate to results with file key as query param
        router.push(`/results?fileKey=${file.key}`);
      }
      setIsLoading(false);
      setUploadProgress(0);
    },
    onUploadError: (error: Error) => {
      console.error('Error uploading file:', error);
      setError('Failed to upload file. Please try again.');
      setIsLoading(false);
      setUploadProgress(0);
    },
    onUploadProgress: (progress) => {
      setUploadProgress(progress);
    },
  });

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      await startUpload([file]);
    } catch (err) {
      console.error('Error starting upload:', err);
      setError('Failed to start file upload. Please try again.');
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [startUpload]);

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
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const features = [
    {
      icon: <Mic className="w-5 h-5" />,
      title: "Audio Analysis",
      description: "Advanced AI transcription with speaker identification and emotion detection"
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Smart Summaries",
      description: "Automatic generation of key points, decisions, and action items"
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: "Action Tracking",
      description: "Extract and organize actionable tasks with assigned owners and deadlines"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Team Insights",
      description: "Analyze participation patterns and collaboration dynamics"
    }
  ];

  const supportedFormats = [
    { type: "Audio", formats: ["MP3", "WAV", "M4A", "OGG"] },
    { type: "Video", formats: ["MP4", "MOV", "AVI"] },
    { type: "Text", formats: ["TXT", "DOCX", "PDF"] }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-3 mr-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              InsightMeet
            </h1>
          </div>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-8">
            Transform your meetings into actionable insights with AI-powered analysis. 
            Upload recordings or transcripts and get intelligent summaries, action items, and team insights.
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              Secure & Private
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              AI-Powered
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              Instant Results
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center mb-6">
                  <UploadIcon className="w-6 h-6 text-blue-600 mr-3" />
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Upload Meeting Content
                  </h2>
                </div>
                
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <FileUpload onFileSelect={handleFileUpload} isLoading={isLoading || isUploading} />
                  
                  {/* Progress Bar */}
                  {(isLoading || isUploading) && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
                        <span>Uploading...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Supported Formats */}
                <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4">
                    Supported Formats
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {supportedFormats.map((category) => (
                      <div key={category.type} className="text-center">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          {category.type}
                        </div>
                        <div className="flex flex-wrap justify-center gap-1">
                          {category.formats.map((format) => (
                            <span 
                              key={format}
                              className="inline-block px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded"
                            >
                              {format}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
                AI-Powered Features
              </h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Processing Speed</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">Audio Analysis</span>
                  <span className="font-medium">~2-3 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">Text Processing</span>
                  <span className="font-medium">~30 sec</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">Insight Generation</span>
                  <span className="font-medium">~1 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Ready to Transform Your Meetings?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Join thousands of teams already using InsightMeet to make their meetings more productive and actionable.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Save 2+ hours per week
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Improve team alignment
              </div>
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Never miss action items
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}