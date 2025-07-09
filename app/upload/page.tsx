'use client';

import { useRouter } from 'next/navigation';
import { useFileUpload } from '@/lib/hooks/use-file-upload';
import Upload from '@/components/Upload';
import type { FileMetadata } from '@/components/Upload';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Zap, Shield, Sparkles, Check, X, Upload as UploadIcon } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export default function EpicUploadPage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploadStarted, setUploadStarted] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<{ fileKey: string } | null>(null);
  
  const { uploadFile, status, progress, error } = useFileUpload({
    onSuccess: (data) => {
      setUploadResult(data);
      setAnimationPhase('success');
      setTimeout(() => {
        router.push(`/results?fileKey=${data.fileKey}`);
      }, 1500);
    },
    onError: (error) => {
      setAnimationPhase('error');
      console.error('Upload error:', error);
    }
  });

  const handleFileSelect = useCallback((files: FileMetadata[]) => {
    if (files.length > 0) {
      setUploadStarted(true);
      setAnimationPhase('processing');
      uploadFile(files[0].file as File); 
    }
  }, [uploadFile]);

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
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      const fileMetadata: FileMetadata = {
        id: `${file.name}-${new Date().getTime()}`,
        file: file,
        category: 'meeting',
        uploadProgress: 0,
        status: 'pending',
        uploadSpeed: 0,
        tags: [],
        lastModified: new Date(file.lastModified),
      };
      handleFileSelect([fileMetadata]);
    }
  }, [handleFileSelect]);

  const features = [
    { icon: Zap, text: "Lightning Fast Processing", delay: 0 },
    { icon: Shield, text: "Enterprise-Grade Security", delay: 100 },
    { icon: FileText, text: "Intelligent Analysis", delay: 200 },
    { icon: Sparkles, text: "AI-Powered Insights", delay: 300 }
  ];

  const getProgressColor = () => {
    const percentage = progress?.percentage ?? 0;
    if (percentage < 30) return 'from-blue-400 to-purple-600';
    if (percentage < 70) return 'from-purple-400 to-pink-600';
    return 'from-pink-400 to-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6 shadow-lg shadow-purple-500/25">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent mb-4">
            Document Intelligence Hub
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Transform your PDFs into actionable insights with our advanced AI-powered analysis engine
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-all duration-500 hover:scale-105"
              style={{ animationDelay: `${feature.delay}ms` }}
            >
              <feature.icon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300 font-medium">{feature.text}</p>
            </div>
          ))}
        </div>

        {/* Main Upload Section */}
        <div className="relative">
          <div 
            className={`
              bg-white/10 backdrop-blur-md border-2 border-dashed rounded-2xl p-8 transition-all duration-500
              ${dragActive ? 'border-purple-400 bg-purple-500/20 scale-105' : 'border-white/20'}
              ${animationPhase === 'processing' ? 'border-blue-400 bg-blue-500/20' : ''}
              ${animationPhase === 'success' ? 'border-green-400 bg-green-500/20' : ''}
              ${animationPhase === 'error' ? 'border-red-400 bg-red-500/20' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Upload States */}
            {animationPhase === 'idle' && (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4 animate-bounce">
                  <UploadIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Drop your PDF here</h3>
                  <p className="text-gray-300 mb-6">or click to browse files</p>
                  <Upload 
                    onFileSelect={handleFileSelect} 
                    isLoading={status === 'uploading'}
                    accept=".pdf"
                    maxSize={50 * 1024 * 1024} // 50MB
                    allowMultiple={false}
                  />
                </div>
              </div>
            )}

            {animationPhase === 'processing' && (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4 animate-spin">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Processing Your Document</h3>
                  <p className="text-gray-300 mb-6">Our AI is analyzing your content...</p>
                  
                  {/* Epic Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-3 mb-4 overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full transition-all duration-300 ease-out relative`}
                      style={{ width: `${progress?.percentage ?? 0}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    {progress?.percentage ?? 0}% complete - Extracting insights...
                  </p>
                </div>
              </div>
            )}

            {animationPhase === 'success' && (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4 animate-pulse">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Upload Complete!</h3>
                  <p className="text-gray-300 mb-6">Redirecting to your results...</p>
                  <div className="flex justify-center">
                    <Button 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
                      onClick={() => uploadResult && router.push(`/results?fileKey=${uploadResult.fileKey}`)}
                    >
                      View Results
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {animationPhase === 'error' && (
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full mb-4 animate-pulse">
                  <X className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Upload Failed</h3>
                  <p className="text-gray-300 mb-6">{error}</p>
                  <Button 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
                    onClick={() => {
                      setAnimationPhase('idle');
                      setUploadStarted(false);
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File Requirements */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-4 text-sm text-gray-400">
            <span>• PDF files only</span>
            <span>• Max 50MB</span>
            <span>• Secure & encrypted</span>
          </div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}