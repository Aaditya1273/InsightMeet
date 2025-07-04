'use client';

import { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo,
  useLayoutEffect,
  startTransition,
  useDeferredValue
} from 'react';
import { toast } from 'sonner';

// Advanced configuration types
interface SpeechConfig {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: SpeechGrammarList;
  serviceURI?: string;
  confidenceThreshold: number;
  silenceTimeoutMs: number;
  autoRestart: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
}

interface SpeechAnalytics {
  totalWords: number;
  avgConfidence: number;
  sessionDuration: number;
  errorCount: number;
  restartCount: number;
  languageDetected?: string;
}

interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
}

interface VoiceCommand {
  pattern: RegExp | string;
  callback: (match: string[], confidence: number) => void;
  confidence?: number;
  description?: string;
}

type SpeechRecognitionHook = {
  // Core states
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  isSupported: boolean;
  isInitialized: boolean;
  
  // Control functions
  startListening: (config?: Partial<SpeechConfig>) => Promise<void>;
  stopListening: () => Promise<void>;
  pauseListening: () => void;
  resumeListening: () => void;
  resetTranscript: () => void;
  
  // Advanced features
  getAnalytics: () => SpeechAnalytics;
  exportSession: () => string;
  importSession: (data: string) => void;
  addVoiceCommand: (command: VoiceCommand) => string;
  removeVoiceCommand: (id: string) => void;
  
  // Error handling
  error: string | null;
  lastError: Error | null;
  
  // Performance metrics
  performance: {
    processingTime: number;
    accuracy: number;
    latency: number;
  };
  
  // Real-time data
  volume: number;
  isProcessing: boolean;
  currentResult: SpeechResult | null;
  
  // Configuration
  config: SpeechConfig;
  updateConfig: (newConfig: Partial<SpeechConfig>) => void;
};

// Global type declarations with enhanced compatibility
// Enhanced type definitions for Speech Recognition API
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult | null;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

interface SpeechGrammarList {
  addFromString(string: string, weight?: number): number;
  addFromURI(src: string, weight?: number): number;
  length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  grammars: SpeechGrammarList;
  serviceURI: string;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition }
    webkitSpeechRecognition: { new(): SpeechRecognition }
    SpeechGrammarList: { new(): SpeechGrammarList }
    webkitSpeechGrammarList: { new(): SpeechGrammarList }
    performance: Performance & {
      readonly timeOrigin: DOMHighResTimeStamp;
      now(): DOMHighResTimeStamp;
    }
  }

  interface Navigator {
    webkitGetUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
    mozGetUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  }
}

// Feature detection with caching
const detectSpeechSupport = (() => {
  let cached: boolean | null = null;
  return (): boolean => {
    if (cached !== null) return cached;
    if (typeof window === 'undefined') return (cached = false);
    
    const hasSpeechRecognition = !!(
      window.SpeechRecognition || 
      window.webkitSpeechRecognition
    );
    
    const hasMediaDevices = !!(
      navigator?.mediaDevices?.getUserMedia ||
      navigator?.webkitGetUserMedia ||
      navigator?.mozGetUserMedia
    );
    
    return (cached = hasSpeechRecognition && hasMediaDevices);
  };
})();

// Cross-browser SpeechRecognition constructor
const SpeechRecognition = 
  (typeof window !== 'undefined' && (
    window.SpeechRecognition || 
    window.webkitSpeechRecognition
  )) || null;

// Default configuration
const DEFAULT_CONFIG: SpeechConfig = {
  lang: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 3,
  confidenceThreshold: 0.7,
  silenceTimeoutMs: 3000,
  autoRestart: true,
  noiseSuppression: true,
  echoCancellation: true,
};

// Advanced utilities
class SpeechProcessor {
  private static instance: SpeechProcessor;
  private wordCount = 0;
  private confidenceScores: number[] = [];
  private startTime = 0;
  private processingTimes: number[] = [];
  
  static getInstance(): SpeechProcessor {
    if (!SpeechProcessor.instance) {
      SpeechProcessor.instance = new SpeechProcessor();
    }
    return SpeechProcessor.instance;
  }
  
  startSession(): void {
    this.startTime = Date.now();
    this.wordCount = 0;
    this.confidenceScores = [];
    this.processingTimes = [];
  }
  
  processResult(result: SpeechResult): void {
    const processingStart = performance.now();
    
    // Word counting with smart detection
    const words = result.transcript.trim().split(/\s+/).filter(Boolean);
    this.wordCount += words.length;
    
    // Confidence tracking
    this.confidenceScores.push(result.confidence);
    
    // Performance tracking
    this.processingTimes.push(performance.now() - processingStart);
  }
  
  getAnalytics(): SpeechAnalytics {
    return {
      totalWords: this.wordCount,
      avgConfidence: this.confidenceScores.length > 0 
        ? this.confidenceScores.reduce((a, b) => a + b, 0) / this.confidenceScores.length 
        : 0,
      sessionDuration: this.startTime > 0 ? Date.now() - this.startTime : 0,
      errorCount: 0, // Will be updated by the hook
      restartCount: 0, // Will be updated by the hook
    };
  }
  
  getPerformanceMetrics() {
    return {
      processingTime: this.processingTimes.length > 0 
        ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length 
        : 0,
      accuracy: this.confidenceScores.length > 0 
        ? this.confidenceScores.filter(c => c >= 0.8).length / this.confidenceScores.length 
        : 0,
      latency: this.processingTimes.length > 0 
        ? Math.max(...this.processingTimes) 
        : 0,
    };
  }
}

// Voice command manager
class VoiceCommandManager {
  private commands = new Map<string, VoiceCommand>();
  private commandId = 0;
  
  addCommand(command: VoiceCommand): string {
    const id = `cmd_${++this.commandId}`;
    this.commands.set(id, command);
    return id;
  }
  
  removeCommand(id: string): void {
    this.commands.delete(id);
  }
  
  processTranscript(transcript: string, confidence: number): void {
    for (const [id, command] of this.commands) {
      const minConfidence = command.confidence ?? 0.8;
      if (confidence < minConfidence) continue;
      
      if (command.pattern instanceof RegExp) {
        const match = transcript.match(command.pattern);
        if (match) {
          try {
            command.callback(match, confidence);
          } catch (error) {
            console.error(`Voice command ${id} failed:`, error);
          }
        }
      } else {
        const lowerTranscript = transcript.toLowerCase();
        const lowerPattern = command.pattern.toLowerCase();
        if (lowerTranscript.includes(lowerPattern)) {
          try {
            command.callback([lowerPattern], confidence);
          } catch (error) {
            console.error(`Voice command ${id} failed:`, error);
          }
        }
      }
    }
  }
  
  clear(): void {
    this.commands.clear();
  }
}

// Advanced error handling
class SpeechErrorHandler {
  private static errorMessages = {
    'not-allowed': 'Microphone access denied. Please grant permission and try again.',
    'audio-capture': 'No microphone detected. Please connect a microphone.',
    'not-allowed-permission': 'Microphone permission blocked. Check browser settings.',
    'language-not-supported': 'Selected language not supported.',
    'service-not-allowed': 'Speech recognition service unavailable.',
    'network': 'Network error. Please check your connection.',
    'aborted': 'Speech recognition was aborted.',
    'no-speech': 'No speech detected. Please try speaking closer to the microphone.',
  } as const;
  
  static handleError(error: SpeechRecognitionErrorEvent): {
    message: string;
    shouldRestart: boolean;
    isRecoverable: boolean;
  } {
    const message = this.errorMessages[error.error as keyof typeof this.errorMessages] 
      || `Speech recognition error: ${error.error}`;
    
    const shouldRestart = ['network', 'aborted', 'no-speech'].includes(error.error);
    const isRecoverable = !['not-allowed', 'audio-capture'].includes(error.error);
    
    return { message, shouldRestart, isRecoverable };
  }
}

// Main hook implementation
export function useSpeechRecognition(
  initialConfig: Partial<SpeechConfig> = {}
): SpeechRecognitionHook {
  // Core state management
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [volume, setVolume] = useState(0);
  const [currentResult, setCurrentResult] = useState<SpeechResult | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Configuration management
  const [config, setConfig] = useState<SpeechConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  // Refs for stable references
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const processorRef = useRef<SpeechProcessor>();
  const commandManagerRef = useRef<VoiceCommandManager>();
  const errorCountRef = useRef(0);
  const restartCountRef = useRef(0);
  
  // Performance state
  const [performance, setPerformance] = useState({
    processingTime: 0,
    accuracy: 0,
    latency: 0,
  });
  
  // Deferred values for performance
  const deferredTranscript = useDeferredValue(transcript);
  const deferredInterimTranscript = useDeferredValue(interimTranscript);
  
  // Memoized values
  const isSupported = useMemo(() => detectSpeechSupport(), []);
  
  // Initialize managers
  useLayoutEffect(() => {
    processorRef.current = SpeechProcessor.getInstance();
    commandManagerRef.current = new VoiceCommandManager();
    
    return () => {
      commandManagerRef.current?.clear();
    };
  }, []);
  
  // Audio analysis setup
  const setupAudioAnalysis = useCallback(async () => {
    if (!isSupported || audioContextRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseSuppression,
          sampleRate: 16000,
        },
      });
      
      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      
      const updateVolume = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(average / 255);
        
        if (isListening) {
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      };
      
      updateVolume();
    } catch (error) {
      console.error('Audio analysis setup failed:', error);
    }
  }, [isSupported, config.echoCancellation, config.noiseSuppression, isListening]);
  
  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;
    
    const recognition = new SpeechRecognition!();
    
    // Apply configuration
    Object.assign(recognition, {
      continuous: config.continuous,
      interimResults: config.interimResults,
      lang: config.lang,
      maxAlternatives: config.maxAlternatives,
      serviceURI: config.serviceURI,
    });
    
    // Event handlers with advanced processing
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const processingStart = performance.now();
      setIsProcessing(true);
      
      let interimText = '';
      let finalText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || result.length === 0) continue;
        
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalText += transcript;
          
          // Process final result
          const speechResult: SpeechResult = {
            transcript,
            confidence: result[0].confidence || 0,
            isFinal: true,
            timestamp: Date.now(),
            alternatives: Array.from(result).map((alt: SpeechRecognitionAlternative) => ({
              transcript: alt.transcript,
              confidence: alt.confidence || 0,
            })),
          };
          
          setCurrentResult(speechResult);
          processorRef.current?.processResult(speechResult);
          
          // Voice command processing
          if (speechResult.confidence >= config.confidenceThreshold) {
            commandManagerRef.current?.processTranscript(
              speechResult.transcript,
              speechResult.confidence
            );
          }
        } else {
          interimText += transcript;
        }
      }
      
      // Update transcripts with transitions for performance
      startTransition(() => {
        if (finalText) {
          setFinalTranscript(prev => prev + finalText);
          setTranscript(prev => prev + finalText);
        }
        setInterimTranscript(interimText);
      });
      
      // Update performance metrics
      const processingTime = performance.now() - processingStart;
      setPerformance(prev => ({
        ...prev,
        processingTime,
        latency: Math.max(prev.latency, processingTime),
      }));
      
      setIsProcessing(false);
      
      // Reset silence timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (config.silenceTimeoutMs > 0) {
        timeoutRef.current = setTimeout(() => {
          if (isListening && config.autoRestart) {
            console.log('Restarting due to silence timeout');
            restartCountRef.current++;
            recognition.stop();
            setTimeout(() => recognition.start(), 100);
          }
        }, config.silenceTimeoutMs);
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsProcessing(false);
      errorCountRef.current++;
      
      const errorInfo = SpeechErrorHandler.handleError(event);
      setError(errorInfo.message);
      setLastError(new Error(errorInfo.message));
      
      if (errorInfo.shouldRestart && config.autoRestart && isListening) {
        console.log('Auto-restarting after error');
        restartCountRef.current++;
        setTimeout(() => {
          if (isListening) {
            recognition.start();
          }
        }, 1000);
      } else {
        setIsListening(false);
      }
      
      toast.error(errorInfo.message, {
        duration: errorInfo.isRecoverable ? 3000 : 5000,
      });
    };
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setError(null);
      setIsProcessing(false);
      processorRef.current?.startSession();
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsProcessing(false);
      
      if (isListening && config.autoRestart) {
        console.log('Auto-restarting recognition');
        restartCountRef.current++;
        setTimeout(() => recognition.start(), 100);
      } else {
        setIsListening(false);
      }
    };
    
    recognitionRef.current = recognition;
    setIsInitialized(true);
  }, [isSupported, config, isListening]);
  
  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeSpeechRecognition();
    }
  }, [initializeSpeechRecognition, isInitialized]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Control functions
  const startListening = useCallback(async (runtimeConfig?: Partial<SpeechConfig>) => {
    if (!isSupported) {
      throw new Error('Speech recognition not supported');
    }
    
    if (isListening) return;
    
    // Update config if provided
    if (runtimeConfig) {
      setConfig(prev => ({ ...prev, ...runtimeConfig }));
    }
    
    setError(null);
    setLastError(null);
    errorCountRef.current = 0;
    restartCountRef.current = 0;
    
    try {
      await setupAudioAnalysis();
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Speech recognition started');
      }
    } catch (error) {
      const errorMessage = 'Failed to start speech recognition';
      setError(errorMessage);
      setLastError(error instanceof Error ? error : new Error(errorMessage));
      toast.error(errorMessage);
      throw error;
    }
  }, [isSupported, isListening, setupAudioAnalysis]);
  
  const stopListening = useCallback(async () => {
    if (!isListening) return;
    
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      setIsListening(false);
      toast.success('Speech recognition stopped');
    } catch (error) {
      const errorMessage = 'Failed to stop speech recognition';
      setError(errorMessage);
      setLastError(error instanceof Error ? error : new Error(errorMessage));
      toast.error(errorMessage);
      throw error;
    }
  }, [isListening]);
  
  const pauseListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      // Don't set isListening to false to allow resume
    }
  }, [isListening]);
  
  const resumeListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);
  
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFinalTranscript('');
    setCurrentResult(null);
    setError(null);
    setLastError(null);
    processorRef.current?.startSession();
  }, []);
  
  // Advanced features
  const getAnalytics = useCallback((): SpeechAnalytics => {
    const baseAnalytics = processorRef.current?.getAnalytics() || {
      totalWords: 0,
      avgConfidence: 0,
      sessionDuration: 0,
      errorCount: 0,
      restartCount: 0,
    };
    
    return {
      ...baseAnalytics,
      errorCount: errorCountRef.current,
      restartCount: restartCountRef.current,
    };
  }, []);
  
  const exportSession = useCallback((): string => {
    return JSON.stringify({
      transcript: finalTranscript,
      analytics: getAnalytics(),
      config,
      timestamp: Date.now(),
    });
  }, [finalTranscript, getAnalytics, config]);
  
  const importSession = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      setFinalTranscript(parsed.transcript || '');
      setTranscript(parsed.transcript || '');
      if (parsed.config) {
        setConfig(prev => ({ ...prev, ...parsed.config }));
      }
    } catch (error) {
      console.error('Failed to import session:', error);
      toast.error('Failed to import session data');
    }
  }, []);
  
  const addVoiceCommand = useCallback((command: VoiceCommand): string => {
    return commandManagerRef.current?.addCommand(command) || '';
  }, []);
  
  const removeVoiceCommand = useCallback((id: string) => {
    commandManagerRef.current?.removeCommand(id);
  }, []);
  
  const updateConfig = useCallback((newConfig: Partial<SpeechConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    
    // Restart recognition if active and critical config changed
    if (isListening && recognitionRef.current) {
      const criticalKeys = ['lang', 'continuous', 'interimResults', 'maxAlternatives'];
      const hasCriticalChange = criticalKeys.some(key => 
        newConfig[key as keyof SpeechConfig] !== undefined
      );
      
      if (hasCriticalChange) {
        stopListening().then(() => startListening());
      }
    }
  }, [isListening, stopListening, startListening]);
  
  // Update performance metrics
  useEffect(() => {
    const metrics = processorRef.current?.getPerformanceMetrics();
    if (metrics) {
      setPerformance(prev => ({
        ...prev,
        ...metrics,
      }));
    }
  }, [transcript]);
  
  return {
    // Core states
    isListening,
    transcript: deferredTranscript,
    interimTranscript: deferredInterimTranscript,
    finalTranscript,
    isSupported,
    isInitialized,
    
    // Control functions
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
    
    // Advanced features
    getAnalytics,
    exportSession,
    importSession,
    addVoiceCommand,
    removeVoiceCommand,
    
    // Error handling
    error,
    lastError,
    
    // Performance metrics
    performance,
    
    // Real-time data
    volume,
    isProcessing,
    currentResult,
    
    // Configuration
    config,
    updateConfig,
  };
}

// Enhanced mock for testing
export const mockUseSpeechRecognition = (): SpeechRecognitionHook => ({
  isListening: false,
  transcript: '',
  interimTranscript: '',
  finalTranscript: '',
  isSupported: false,
  isInitialized: false,
  startListening: async () => {},
  stopListening: async () => {},
  pauseListening: () => {},
  resumeListening: () => {},
  resetTranscript: () => {},
  getAnalytics: () => ({
    totalWords: 0,
    avgConfidence: 0,
    sessionDuration: 0,
    errorCount: 0,
    restartCount: 0,
  }),
  exportSession: () => '{}',
  importSession: () => {},
  addVoiceCommand: () => '',
  removeVoiceCommand: () => {},
  error: 'Speech recognition not available in this environment',
  lastError: null,
  performance: { processingTime: 0, accuracy: 0, latency: 0 },
  volume: 0,
  isProcessing: false,
  currentResult: null,
  config: DEFAULT_CONFIG,
  updateConfig: () => {},
});

// Export appropriate version based on environment
export default typeof window !== 'undefined' ? useSpeechRecognition : mockUseSpeechRecognition;