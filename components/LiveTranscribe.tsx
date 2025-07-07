'use client';

// Add this to declare the webkitSpeechRecognition property on the window object
declare global {
    interface Window {
        webkitSpeechRecognition: new () => SpeechRecognition;
        SpeechRecognition: new () => SpeechRecognition;
    }
}

import React, { useState, useEffect, useRef } from 'react';

const LiveTranscribe = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(prev => prev + finalTranscript + interimTranscript);
      };

    } else {
      console.warn('Speech Recognition not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleToggleRecording = () => {
    if (recognitionRef.current) {
      if (isRecording) {
        recognitionRef.current.stop();
      } else {
        setTranscript(''); // Clear previous transcript
        recognitionRef.current.start();
      }
      setIsRecording(!isRecording);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-lg bg-white dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Live Transcription</h2>
      <div className="mb-4">
        <button 
          onClick={handleToggleRecording}
          className={`px-4 py-2 rounded-md text-white font-semibold ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      <div className="w-full h-48 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 overflow-y-auto">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{transcript}</p>
      </div>
    </div>
  );
};

export default LiveTranscribe;
