'use client';

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Download, Copy, Trash2, Settings, Play, Pause, Volume2, Search, FileText, Clock, Languages, Save, RefreshCw, Zap } from 'lucide-react';

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
  duration: number;
  speaker?: string;
}

interface TranscriptionSettings {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  autoSave: boolean;
  showTimestamps: boolean;
  showConfidence: boolean;
  speechDetection: boolean;
  keywordHighlighting: boolean;
  autoExport: boolean;
}

const LiveTranscribe = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [averageConfidence, setAverageConfidence] = useState(0);
  const [speechSpeed, setSpeechSpeed] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('txt');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [speakingRate, setSpeakingRate] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const lastSpeechTimeRef = useRef<Date | null>(null);

  const [settings, setSettings] = useState<TranscriptionSettings>({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    autoSave: true,
    showTimestamps: true,
    showConfidence: true,
    speechDetection: true,
    keywordHighlighting: true,
    autoExport: false
  });

  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'ar-SA', name: 'Arabic' },
    { code: 'ru-RU', name: 'Russian' }
  ];

  const addNotification = useCallback((message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  }, []);

  const setupAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const analyseAudio = () => {
        if (analyserRef.current && isRecording) {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setVolume(Math.min(100, (average / 128) * 100));
          
          requestAnimationFrame(analyseAudio);
        }
      };
      
      analyseAudio();
    } catch (error) {
      console.error('Error setting up audio analyser:', error);
      addNotification('Audio setup failed');
    }
  }, [isRecording, addNotification]);

  const calculateStats = useCallback(() => {
    const words = transcript.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    
    if (transcriptEntries.length > 0) {
      const totalConfidence = transcriptEntries.reduce((sum, entry) => sum + entry.confidence, 0);
      setAverageConfidence(totalConfidence / transcriptEntries.length);
      
      const totalDuration = transcriptEntries.reduce((sum, entry) => sum + entry.duration, 0);
      if (totalDuration > 0) {
        setSpeechSpeed(words.length / (totalDuration / 60000)); // words per minute
      }
    }
  }, [transcript, transcriptEntries]);

  const highlightKeywords = useCallback((text: string) => {
    if (!settings.keywordHighlighting || keywords.length === 0) return text;
    
    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `<mark class="bg-yellow-200 dark:bg-yellow-600">${keyword}</mark>`);
    });
    
    return highlightedText;
  }, [keywords, settings.keywordHighlighting]);

  const exportTranscript = useCallback((format: string) => {
    let content = '';
    let filename = `transcript_${new Date().toISOString().split('T')[0]}`;
    
    switch (format) {
      case 'txt':
        content = transcript;
        filename += '.txt';
        break;
      case 'json':
        content = JSON.stringify({
          transcript,
          entries: transcriptEntries,
          statistics: {
            wordCount,
            sessionTime,
            averageConfidence,
            speechSpeed
          },
          settings
        }, null, 2);
        filename += '.json';
        break;
      case 'csv':
        content = 'Timestamp,Text,Confidence,Duration\n' + 
          transcriptEntries.map(entry => 
            `"${entry.timestamp.toISOString()}","${entry.text.replace(/"/g, '""')}",${entry.confidence},${entry.duration}`
          ).join('\n');
        filename += '.csv';
        break;
      case 'srt':
        content = transcriptEntries.map((entry, index) => {
          const start = entry.timestamp;
          const end = new Date(entry.timestamp.getTime() + entry.duration);
          return `${index + 1}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${entry.text}\n`;
        }).join('\n');
        filename += '.srt';
        break;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    addNotification(`Exported as ${format.toUpperCase()}`);
  }, [transcript, transcriptEntries, wordCount, sessionTime, averageConfidence, speechSpeed, settings, addNotification]);

  const formatSRTTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  };

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      addNotification('Copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      addNotification('Copy failed');
    }
  }, [transcript, addNotification]);

  const addKeyword = useCallback(() => {
    if (currentKeyword.trim() && !keywords.includes(currentKeyword.trim())) {
      setKeywords(prev => [...prev, currentKeyword.trim()]);
      setCurrentKeyword('');
      addNotification(`Added keyword: ${currentKeyword.trim()}`);
    }
  }, [currentKeyword, keywords, addNotification]);

  const removeKeyword = useCallback((keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
    addNotification(`Removed keyword: ${keyword}`);
  }, [addNotification]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setTranscriptEntries([]);
    setInterimTranscript('');
    setWordCount(0);
    setSessionTime(0);
    setAverageConfidence(0);
    setSpeechSpeed(0);
    addNotification('Transcript cleared');
  }, [addNotification]);

  const searchInTranscript = useCallback((term: string) => {
    setSearchTerm(term);
    if (term) {
      const regex = new RegExp(term, 'gi');
      const matches = transcript.match(regex);
      if (matches) {
        addNotification(`Found ${matches.length} matches for "${term}"`);
      } else {
        addNotification(`No matches found for "${term}"`);
      }
    }
  }, [transcript, addNotification]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      recognition.continuous = settings.continuous;
      recognition.interimResults = settings.interimResults;
      recognition.lang = settings.language;
      recognition.maxAlternatives = settings.maxAlternatives;
      
      recognition.onstart = () => {
        setIsListening(true);
        startTimeRef.current = new Date();
        addNotification('Recording started');
      };
      
      recognition.onend = () => {
        setIsListening(false);
        if (isRecording) {
          recognition.start(); // Restart if still recording
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        addNotification(`Recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const resultText = result[0].transcript;
          
          if (result.isFinal) {
            finalText += resultText;
            
            // Create transcript entry
            const entry: TranscriptEntry = {
              id: Date.now().toString(),
              text: resultText,
              timestamp: new Date(),
              confidence: result[0].confidence || 0,
              duration: lastSpeechTimeRef.current 
                ? new Date().getTime() - lastSpeechTimeRef.current.getTime()
                : 1000
            };
            
            setTranscriptEntries(prev => [...prev, entry]);
            lastSpeechTimeRef.current = new Date();
            
            // Check for keywords
            keywords.forEach(keyword => {
              if (resultText.toLowerCase().includes(keyword.toLowerCase())) {
                addNotification(`Keyword detected: ${keyword}`);
              }
            });
            
          } else {
            interimText += resultText;
          }
        }
        
        if (finalText) {
          setTranscript(prev => prev + finalText + ' ');
        }
        
        setInterimTranscript(interimText);
      };
      
    } else {
      addNotification('Speech Recognition not supported');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [settings, keywords, isRecording, addNotification]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  useEffect(() => {
    if (isRecording) {
      setupAudioAnalyser();
      
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, setupAudioAnalyser]);

  const handleToggleRecording = useCallback(() => {
    if (recognitionRef.current) {
      if (isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
        addNotification('Recording stopped');
      } else {
        recognitionRef.current.start();
        setIsRecording(true);
      }
    }
  }, [isRecording, addNotification]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredTranscript = searchTerm 
    ? transcript.replace(new RegExp(searchTerm, 'gi'), match => `<mark class="bg-blue-200 dark:bg-blue-600">${match}</mark>`)
    : transcript;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div key={index} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
            {notification}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="text-yellow-500" />
              AI-Powered Live Transcribe
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Professional speech-to-text with advanced analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Session Time</div>
              <div className="text-xl font-mono text-blue-600 dark:text-blue-400">
                {formatTime(sessionTime)}
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Words</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{wordCount}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Speed (WPM)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.round(speechSpeed)}</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Confidence</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(averageConfidence * 100)}%</p>
            </div>
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Volume</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{Math.round(volume)}%</p>
            </div>
            <Volume2 className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="txt">Text (.txt)</option>
                <option value="json">JSON (.json)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="srt">Subtitles (.srt)</option>
              </select>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.showTimestamps}
                  onChange={(e) => setSettings(prev => ({ ...prev, showTimestamps: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Timestamps</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.showConfidence}
                  onChange={(e) => setSettings(prev => ({ ...prev, showConfidence: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Confidence</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.keywordHighlighting}
                  onChange={(e) => setSettings(prev => ({ ...prev, keywordHighlighting: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Keyword Highlighting</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Keyword Management */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Keyword Detection</h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={currentKeyword}
            onChange={(e) => setCurrentKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Add keyword to detect..."
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={addKeyword}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {keywords.map(keyword => (
            <span
              key={keyword}
              className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm"
            >
              {keyword}
              <button
                onClick={() => removeKeyword(keyword)}
                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-center">
          <button
            onClick={handleToggleRecording}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all transform hover:scale-105 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
            } shadow-lg`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            <Copy className="w-5 h-5" />
            Copy
          </button>
          
          <button
            onClick={() => exportTranscript(exportFormat)}
            className="flex items-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
          
          <button
            onClick={clearTranscript}
            className="flex items-center gap-2 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
            Clear
          </button>
        </div>
        
        {/* Status Indicators */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRecording ? 'Recording' : 'Stopped'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isListening ? 'Listening' : 'Idle'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${volume}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search in transcript..."
            value={searchTerm}
            onChange={(e) => searchInTranscript(e.target.value)}
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Transcript Display */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Live Transcript</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {wordCount} words • {transcriptEntries.length} segments
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border">
          {transcript || interimTranscript ? (
            <div className="space-y-2">
              <div 
                className="text-gray-800 dark:text-gray-200 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: highlightKeywords(filteredTranscript) 
                }}
              />
              
              {interimTranscript && (
                <div className="text-gray-500 dark:text-gray-400 italic">
                  {interimTranscript}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic text-center py-8">
              {isRecording ? 'Listening for speech...' : 'Click "Start Recording" to begin transcription'}
            </div>
          )}
        </div>
        
        {/* Detailed Transcript Entries */}
        {settings.showTimestamps && transcriptEntries.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Detailed Transcript
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transcriptEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                    {settings.showConfidence && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(entry.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTranscribe;