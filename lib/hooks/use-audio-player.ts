      isMuted: newVolume === 0 ? true : prev.isMuted,
    }));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMuted: !prev.isMuted,
    }));
  }, []);

  // Skip forward by a number of seconds
  const skipForward = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    
    const newTime = Math.min(
      audioRef.current.currentTime + seconds,
      state.duration || 0
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
  pause: () => {},
  togglePlayPause: async () => {},
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
