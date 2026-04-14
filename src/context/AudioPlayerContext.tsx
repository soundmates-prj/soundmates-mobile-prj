import { Audio } from 'expo-av';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { LiveSessionResult, NowPlayingData, livestreamService } from '../api';

export interface AudioTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  artUrl: string;
  duration?: number;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  streamUrl: string;
  nowPlaying: NowPlayingData | null;
  activeSession: LiveSessionResult | null;
  activeTrack: AudioTrack | null;
  displayElapsed: number;
}

interface AudioPlayerActions {
  loadSession: (session: LiveSessionResult) => void;
  loadTrack: (track: AudioTrack) => void;
  seekTo: (positionMillis: number) => Promise<void>;
  togglePlayback: () => Promise<void>;
  toggleMute: () => Promise<void>;
  stopAndUnload: () => Promise<void>;
}

type AudioPlayerContextValue = AudioPlayerState & AudioPlayerActions;

// ── Context ────────────────────────────────────────────────────────────────
const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used inside AudioPlayerProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────
export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [activeSession, setActiveSession] = useState<LiveSessionResult | null>(null);
  const [activeTrack, setActiveTrack] = useState<AudioTrack | null>(null);
  const [displayElapsed, setDisplayElapsed] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const loadingUrlRef = useRef<string | null>(null);
  const nowPlayingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const podcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const activeTrackRef = useRef<AudioTrack | null>(null); // always-current ref for callbacks
  const appStateRef = useRef(AppState.currentState);

  // ── Audio Mode Setup ──────────────────────────────────────────────────────
  const configureAudioMode = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  useEffect(() => {
    void configureAudioMode().catch(() => {});
  }, [configureAudioMode]);

  // Keep activeTrackRef in sync so callbacks always have current value
  useEffect(() => {
    activeTrackRef.current = activeTrack;
  }, [activeTrack]);

  // ── Elapsed timer – Livestream (driven by nowPlaying) ─────────────────────
  useEffect(() => {
    // Only run for livestream sessions; podcasts use podcastTimerRef instead
    if (activeTrack) return;

    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    if (!nowPlaying?.currentTrack) {
      setDisplayElapsed(0);
      return;
    }

    const base = Math.max(0, Math.floor(nowPlaying.currentTrack.elapsed || 0));
    const max = Math.max(0, Math.floor(nowPlaying.currentTrack.duration || 0));
    const syncedAt = Date.now();
    setDisplayElapsed(base);

    elapsedIntervalRef.current = setInterval(() => {
      const delta = Math.floor((Date.now() - syncedAt) / 1000);
      const next = base + delta;
      setDisplayElapsed(max > 0 ? Math.min(next, max) : next);
    }, 1000);

    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [
    activeTrack,
    nowPlaying?.currentTrack?.shId,
    nowPlaying?.currentTrack?.elapsed,
    nowPlaying?.currentTrack?.duration,
  ]);

  // ── Elapsed timer – Podcast (polls sound position every second) ───────────
  useEffect(() => {
    if (podcastTimerRef.current) {
      clearInterval(podcastTimerRef.current);
      podcastTimerRef.current = null;
    }

    if (!activeTrack || !isPlaying) return;

    podcastTimerRef.current = setInterval(async () => {
      const sound = soundRef.current;
      if (!sound) return;
      try {
        const status = await sound.getStatusAsync();
        if ('isLoaded' in status && status.isLoaded && status.positionMillis !== undefined) {
          setDisplayElapsed(Math.floor(status.positionMillis / 1000));
        }
      } catch { /* ignore */ }
    }, 500);

    return () => {
      if (podcastTimerRef.current) clearInterval(podcastTimerRef.current);
    };
  }, [activeTrack, isPlaying]);

  // ── NowPlaying polling ─────────────────────────────────────────────────────
  const startNowPlayingPolling = useCallback((sessionId?: string) => {
    activeSessionIdRef.current = sessionId || null;

    if (nowPlayingIntervalRef.current) clearInterval(nowPlayingIntervalRef.current);
    const poll = async () => {
      try {
        const data = activeSessionIdRef.current
          ? await livestreamService.getNowPlayingBySession(activeSessionIdRef.current)
          : await livestreamService.getNowPlaying();
        setNowPlaying(data);
      } catch {
        setNowPlaying(null);
      }
    };
    void poll(); // immediate first call
    nowPlayingIntervalRef.current = setInterval(poll, 10000);
  }, []);

  const stopNowPlayingPolling = useCallback(() => {
    activeSessionIdRef.current = null;
    if (nowPlayingIntervalRef.current) {
      clearInterval(nowPlayingIntervalRef.current);
      nowPlayingIntervalRef.current = null;
    }
  }, []);

  // ── Internal stream management ─────────────────────────────────────────────
  const unloadSound = useCallback(async () => {
    const currentSound = soundRef.current;
    soundRef.current = null;

    if (currentSound) {
      try {
        currentSound.setOnPlaybackStatusUpdate(null);
      } catch {
        // ignore
      }

      try {
        await currentSound.pauseAsync();
      } catch {
        // ignore
      }

      try {
        await currentSound.stopAsync();
      } catch {
        // ignore
      }

      try {
        await currentSound.unloadAsync();
      } catch {
        // ignore
      }
    }

    setIsPlaying(false);
  }, []);

  const createAndPlay = useCallback(async (url: string, muted: boolean) => {
    loadingUrlRef.current = url;
    await configureAudioMode().catch(() => {});
    await unloadSound();
    setIsLoading(true);

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url, headers: { 'User-Agent': 'SoundMates/1.0' } },
        { shouldPlay: true, isMuted: muted, volume: 1.0 },
        (status) => {
          if ('isLoaded' in status && status.isLoaded) {
            setIsPlaying(status.isPlaying ?? false);
            // Update elapsed for podcasts using ref (avoids stale closure)
            if (status.positionMillis !== undefined && activeTrackRef.current) {
                setDisplayElapsed(Math.floor(status.positionMillis / 1000));
            }
          }
        },
      );

      // CRITICAL: If a new request arrived while we were loading, discard this one
      if (loadingUrlRef.current !== url) {
        try {
          await sound.unloadAsync();
        } catch {
          // ignore
        }
        return;
      }

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.log('[AudioPlayerContext] createAndPlay error:', err);
      setIsPlaying(false);
    } finally {
      if (loadingUrlRef.current === url) {
        setIsLoading(false);
      }
    }
  }, [configureAudioMode, unloadSound]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      const becameActive =
        (prevState === 'background' || prevState === 'inactive')
        && nextState === 'active';

      if (!becameActive) {
        return;
      }

      void (async () => {
        await configureAudioMode().catch(() => {});

        const sound = soundRef.current;
        if (!sound) {
          if (isLoading) {
            setIsLoading(false);
          }
          return;
        }

        try {
          const status = await sound.getStatusAsync();
          if (!('isLoaded' in status) || !status.isLoaded) {
            soundRef.current = null;
            setIsPlaying(false);
            if (isLoading) {
              setIsLoading(false);
            }
          }
        } catch {
          soundRef.current = null;
          setIsPlaying(false);
          if (isLoading) {
            setIsLoading(false);
          }
        }
      })();
    });

    return () => {
      subscription.remove();
    };
  }, [configureAudioMode, isLoading]);

  // ── Public Actions ─────────────────────────────────────────────────────────
  const loadSession = useCallback((session: LiveSessionResult) => {
    const url = livestreamService.getListenUrl(session.streamUrl ?? undefined);
    setActiveSession(session);
    setActiveTrack(null);
    setNowPlaying(null);
    startNowPlayingPolling(session.id);
    
    // GUARD: If we are already playing this exact stream, don't reload
    if (url === streamUrl && isPlaying) {
      return;
    }

    setStreamUrl(url);
    void createAndPlay(url, isMuted);
  }, [createAndPlay, isMuted, isPlaying, startNowPlayingPolling, streamUrl]);

  const loadTrack = useCallback((track: AudioTrack) => {
    setActiveSession(null);
    setActiveTrack(track);
    stopNowPlayingPolling();
    setNowPlaying(null);
    
    if (track.url === streamUrl && isPlaying) {
        return;
    }

    setStreamUrl(track.url);
    void createAndPlay(track.url, isMuted);
  }, [createAndPlay, isMuted, isPlaying, stopNowPlayingPolling, streamUrl]);

  const seekTo = useCallback(async (positionMillis: number) => {
      if (soundRef.current) {
          try {
              await soundRef.current.setPositionAsync(positionMillis);
              setDisplayElapsed(Math.floor(positionMillis / 1000));
          } catch { /* ignore */ }
      }
  }, []);

  const togglePlayback = useCallback(async () => {
    if (isLoading) return;
    const sound = soundRef.current;

    if (!sound) {
      if (streamUrl) {
        await createAndPlay(streamUrl, isMuted);
      }
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      if ('isLoaded' in status && status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await configureAudioMode().catch(() => {});
          await sound.playAsync();
          // Optimistically mark as playing; onPlaybackStatusUpdate will correct if needed
          setIsPlaying(true);
        }
      } else if (streamUrl) {
        soundRef.current = null;
        await createAndPlay(streamUrl, isMuted);
      }
    } catch {
      soundRef.current = null;
      if (streamUrl) await createAndPlay(streamUrl, isMuted);
    }
  }, [configureAudioMode, createAndPlay, isLoading, isMuted, streamUrl]);

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (soundRef.current) {
      try {
        await soundRef.current.setIsMutedAsync(newMuted);
      } catch { /* ignore */ }
    }
  }, [isMuted]);

  const stopAndUnload = useCallback(async () => {
    loadingUrlRef.current = null;
    await unloadSound();
    stopNowPlayingPolling();
    setActiveSession(null);
    setActiveTrack(null);
    setNowPlaying(null);
    setStreamUrl('');
    setIsLoading(false);
  }, [stopNowPlayingPolling, unloadSound]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      void unloadSound();
      stopNowPlayingPolling();
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (podcastTimerRef.current) clearInterval(podcastTimerRef.current);
    };
  }, [stopNowPlayingPolling, unloadSound]);

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying, isLoading, isMuted, streamUrl,
        nowPlaying, activeSession, activeTrack, displayElapsed,
        loadSession, loadTrack, seekTo, togglePlayback, toggleMute, stopAndUnload,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export default AudioPlayerContext;
