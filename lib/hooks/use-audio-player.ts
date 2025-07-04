      import { useState, useEffect, useCallback, useRef } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AudioPlayerHook {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
  audioRef: React.RefObject<HTMLAudioElement>;
  play: () => Promise<boolean>;
  pause: () => boolean;
  togglePlayPause: () => Promise<boolean>;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  formatTime: (time: number) => string;
  formattedCurrentTime: string;
  formattedDuration: string;
}

export function useAudioPlayer(): AudioPlayerHook {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    volume: 1,
    isMuted: false,
    isLoading: false,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement>(null);

  // Play audio
  const play = useCallback(async () => {
    if (!audioRef.current) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: audioRef.current ? getAudioError(audioRef.current) : 'Failed to play audio',
      }));
      return false;
    }
  }, []);

  // Pause audio
  const pause = useCallback((): boolean => {
    if (!audioRef.current) return false;

    audioRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
    return true;
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return false;

    if (state.isPlaying) {
      await pause();
      return false;
    } else {
      const played = await play();
      return played;
    }
  }, [state.isPlaying, pause, play]);

  // Seek to a specific time
  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    if (!audioRef.current) return;

    const volume = Math.max(0, Math.min(newVolume, 1));
    audioRef.current.volume = volume;
    setState(prev => ({
      ...prev,
      volume,
      isMuted: volume === 0 ? true : prev.isMuted,
    }));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMuted: !prev.isMuted,
      volume: prev.isMuted ? 1 : 0,
    }));
    if (audioRef.current) {
      audioRef.current.volume = state.isMuted ? 1 : 0;
    }
  }, [state.isMuted]);

  // Skip forward by a number of seconds
  const skipForward = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    
    const newTime = Math.min(
      audioRef.current.currentTime + seconds,
      state.duration
    );
    
    audioRef.current.currentTime = newTime;
    
    setState(prev => ({
      ...prev,
      currentTime: newTime,
    }));
  }, [state.duration]);

  // Skip backward by a number of seconds
  const skipBackward = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    
    const newTime = Math.max(0, audioRef.current.currentTime - seconds);
    
    audioRef.current.currentTime = newTime;
    
    setState(prev => ({
      ...prev,
      currentTime: newTime,
    }));
  }, []);

  // Format time (seconds to MM:SS)
  const formatTime = useCallback((timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Refs
    audioRef,
    
    // Methods
    play,
    pause,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    skipForward,
    skipBackward,
    
    // Formatters
    formatTime,
    
    // Current time formatted
    formattedCurrentTime: formatTime(state.currentTime),
    
    // Duration formatted
    formattedDuration: formatTime(state.duration),
  };
}

// Helper function to get a user-friendly error message
export function getAudioError(audio: HTMLAudioElement): string {
  if (!audio.error) return 'An unknown error occurred with the audio player.';
  
  switch (audio.error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return 'The audio playback was aborted.';
    case MediaError.MEDIA_ERR_NETWORK:
      return 'A network error occurred while loading the audio.';
    case MediaError.MEDIA_ERR_DECODE:
      return 'The audio could not be decoded.';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'The audio format is not supported by your browser.';
    default:
      return 'An error occurred while playing the audio.';
  }
}

// Export a mock version for testing or when not in a browser environment
export const mockUseAudioPlayer = (): ReturnType<typeof useAudioPlayer> => ({
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  volume: 1,
  isMuted: false,
  isLoading: false,
  error: null,
  audioRef: { current: null },
  play: async () => false,
  pause: () => true,
  togglePlayPause: async () => false,
  seek: () => {},
  setVolume: () => {},
  toggleMute: () => {},
  skipForward: () => {},
  skipBackward: () => {},
  formatTime: () => '0:00',
  formattedCurrentTime: '0:00',
  formattedDuration: '0:00',
});

// Export the appropriate version based on the environment
export default typeof window !== 'undefined' ? useAudioPlayer : mockUseAudioPlayer;
