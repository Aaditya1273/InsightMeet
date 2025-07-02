'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  mediaRecorder: MediaRecorder | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

type UseAudioRecorderOptions = {
  onStart?: () => void;
  onStop?: (audioBlob: Blob) => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: Error) => void;
};

export function useAudioRecorder({
  onStart,
  onStop,
  onPause,
  onResume,
  onError,
}: UseAudioRecorderOptions = {}) {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    mediaRecorder: null,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);

  // Clean up resources when unmounting
  useEffect(() => {
    return () => {
      stopRecording();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
    };
  }, [state.audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create a new MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream);
      
      // Reset state
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      totalPausedTimeRef.current = 0;
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          mediaRecorder: null,
          audioBlob,
          audioUrl,
        }));
        
        onStop?.(audioBlob);
        
        // Clean up the stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Request data every 100ms
      
      // Update state
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        mediaRecorder,
        audioBlob: null,
        audioUrl: null,
        error: null,
      }));
      
      // Start timer
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      
      timerRef.current = window.setInterval(() => {
        if (!state.isPaused) {
          const elapsed = Date.now() - startTimeRef.current - totalPausedTimeRef.current;
          setState(prev => ({
            ...prev,
            recordingTime: Math.floor(elapsed / 1000),
          }));
        }
      }, 1000);
      
      // Save stream reference for cleanup
      mediaStreamRef.current = stream;
      
      onStart?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      toast.error('Microphone access denied');
    }
  }, [onStart, onStop, onError, state.isPaused]);

  const stopRecording = useCallback(() => {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
      
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Clean up the stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [state.mediaRecorder]);

  const togglePause = useCallback(() => {
    if (!state.mediaRecorder) return;
    
    if (state.isPaused) {
      // Resume recording
      state.mediaRecorder.resume();
      totalPausedTimeRef.current += Date.now() - pausedTimeRef.current;
      
      setState(prev => ({
        ...prev,
        isPaused: false,
      }));
      
      onResume?.();
    } else {
      // Pause recording
      state.mediaRecorder.pause();
      pausedTimeRef.current = Date.now();
      
      setState(prev => ({
        ...prev,
        isPaused: true,
      }));
      
      onPause?.();
    }
  }, [state.mediaRecorder, state.isPaused, onPause, onResume]);

  const resetRecording = useCallback(() => {
    stopRecording();
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      mediaRecorder: null,
      audioBlob: null,
      audioUrl: null,
      error: null,
    });
    
    chunksRef.current = [];
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    totalPausedTimeRef.current = 0;
    
    // Clean up the stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, [stopRecording]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    // State
    ...state,
    
    // Formatted time
    formattedTime: formatTime(state.recordingTime),
    
    // Methods
    startRecording,
    stopRecording,
    togglePause,
    reset: resetRecording,
  };
}
