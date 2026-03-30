import { Audio } from 'expo-av';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { LiveSessionResult, NowPlayingData, livestreamService } from '../api';

// ── Types ──────────────────────────────────────────────────────────────────
export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  streamUrl: string;
  nowPlaying: NowPlayingData | null;
  activeSession: LiveSessionResult | null;
  displayElapsed: number;
}

interface AudioPlayerActions {
  loadSession: (session: LiveSessionResult) => void;
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
  const [displayElapsed, setDisplayElapsed] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const loadingUrlRef = useRef<string | null>(null);
  const nowPlayingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Audio Mode Setup ──────────────────────────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  useEffect(() => {
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
    nowPlaying?.currentTrack?.shId,
    nowPlaying?.currentTrack?.elapsed,
    nowPlaying?.currentTrack?.duration,
  ]);

  // ── NowPlaying polling ─────────────────────────────────────────────────────
  const startNowPlayingPolling = useCallback(() => {
    if (nowPlayingIntervalRef.current) clearInterval(nowPlayingIntervalRef.current);
    const poll = async () => {
      try {
        const data = await livestreamService.getNowPlaying();
        setNowPlaying(data);
      } catch {
        // silent
      }
    };
    void poll(); // immediate first call
    nowPlayingIntervalRef.current = setInterval(poll, 10000);
  }, []);

  const stopNowPlayingPolling = useCallback(() => {
    if (nowPlayingIntervalRef.current) {
      clearInterval(nowPlayingIntervalRef.current);
      nowPlayingIntervalRef.current = null;
    }
  }, []);

  // ── Internal stream management ─────────────────────────────────────────────
  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const createAndPlay = useCallback(async (url: string, muted: boolean) => {
    loadingUrlRef.current = url;
    await unloadSound();
    setIsLoading(true);

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url, headers: { 'User-Agent': 'SoundMates/1.0' } },
        { shouldPlay: true, isMuted: muted, volume: 1.0 },
        (status) => {
          if ('isLoaded' in status && status.isLoaded) {
            setIsPlaying(status.isPlaying ?? false);
          }
        },
      );

      // CRITICAL: If a new request arrived while we were loading, discard this one
      if (loadingUrlRef.current !== url) {
        await sound.unloadAsync();
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
  }, [unloadSound]);

  // ── Public Actions ─────────────────────────────────────────────────────────
  const loadSession = useCallback((session: LiveSessionResult) => {
    const url = livestreamService.getListenUrl(session.streamUrl ?? undefined);
    
    // GUARD: If we are already playing this exact stream, don't reload
    if (url === streamUrl && isPlaying) {
      return;
    }

    setActiveSession(session);
    setStreamUrl(url);
    setNowPlaying(null);
    startNowPlayingPolling();
    void createAndPlay(url, isMuted);
  }, [createAndPlay, isMuted, isPlaying, startNowPlayingPolling, streamUrl]);

  const togglePlayback = useCallback(async () => {
    if (isLoading) return;
    if (!soundRef.current) {
      if (streamUrl) {
        await createAndPlay(streamUrl, isMuted);
      }
      return;
    }
    try {
      const status = await soundRef.current.getStatusAsync();
      if ('isLoaded' in status && status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      }
    } catch {
      if (streamUrl) await createAndPlay(streamUrl, isMuted);
    }
  }, [createAndPlay, isLoading, isMuted, streamUrl]);

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
    await unloadSound();
    stopNowPlayingPolling();
    setActiveSession(null);
    setNowPlaying(null);
    setStreamUrl('');
  }, [stopNowPlayingPolling, unloadSound]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      void unloadSound();
      stopNowPlayingPolling();
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [stopNowPlayingPolling, unloadSound]);

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying, isLoading, isMuted, streamUrl,
        nowPlaying, activeSession, displayElapsed,
        loadSession, togglePlayback, toggleMute, stopAndUnload,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export default AudioPlayerContext;
