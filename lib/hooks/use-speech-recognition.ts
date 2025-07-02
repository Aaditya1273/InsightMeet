'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

type SpeechRecognitionHook = {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
};

// Type definitions for cross-browser compatibility
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const SpeechRecognition = 
  (typeof window !== 'undefined' && (
    window.SpeechRecognition || 
    window.webkitSpeechRecognition
  )) || 
  null;

export function useSpeechRecognition(lang: string = 'en-US'): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = !!SpeechRecognition;

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    // Create a new instance of SpeechRecognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    // Set up event handlers
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const newTranscript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');

      setTranscript((prev) => {
        // Only update if the new transcript is different from the previous one
        // This prevents unnecessary re-renders
        return newTranscript !== prev ? newTranscript : prev;
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'An error occurred with speech recognition.';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access was denied. Please allow microphone access to use this feature.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone was found. Please ensure a microphone is connected.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access is blocked. Please allow microphone access in your browser settings.';
          break;
        case 'language-not-supported':
          errorMessage = 'The selected language is not supported.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart recognition if it was manually stopped
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isSupported, lang]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) return;

    setError(null);
    setTranscript('');
    
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start speech recognition. Please try again.');
      toast.error('Failed to start speech recognition');
    }
  }, [isListening, isSupported]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!isSupported || !isListening) return;

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      setError('Failed to stop speech recognition.');
      toast.error('Failed to stop speech recognition');
    }
  }, [isListening, isSupported]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  // Toggle listening state when language changes
  useEffect(() => {
    if (recognitionRef.current && isListening) {
      stopListening();
      startListening();
    }
  }, [lang, startListening, stopListening, isListening]);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error,
  };
}

// Export a mock version for testing or when not in a browser environment
export const mockUseSpeechRecognition = (): SpeechRecognitionHook => ({
  isListening: false,
  transcript: '',
  isSupported: false,
  startListening: () => {},
  stopListening: () => {},
  resetTranscript: () => {},
  error: 'Speech recognition is not available in this environment.',
});

// Export the appropriate version based on the environment
export default typeof window !== 'undefined' ? useSpeechRecognition : mockUseSpeechRecognition;
