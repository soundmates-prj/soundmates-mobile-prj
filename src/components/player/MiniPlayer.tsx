import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useTheme } from '../../context/ThemeContext';

type MinimalPalette = {
  primary: string;
  textPrimary: string;
  textSecondary: string;
};

export default function MiniPlayer() {
  const { isDarkMode } = useTheme();
  const palette: MinimalPalette = isDarkMode
    ? { primary: '#FF6B35', textPrimary: '#FFFFFF', textSecondary: '#9CA3AF' }
    : { primary: '#55C5F1', textPrimary: '#1E293B', textSecondary: '#6B7280' };
  const {
    isPlaying, isLoading, activeSession, nowPlaying,
    displayElapsed, togglePlayback, stopAndUnload,
  } = useAudioPlayer();

  // Don't render if there's no active session
  if (!activeSession || (!isPlaying && !isLoading && !nowPlaying)) {
    return null;
  }

  // Data
  const track = nowPlaying?.currentTrack;
  const artUrl = track?.artUrl || activeSession?.thumbnailUrl || undefined;
  const title = track?.title || activeSession?.sessionName || 'Live Stream';
  const subtitle = track?.artist || nowPlaying?.streamerName || activeSession?.stationName || '';
  const duration = track?.duration || 0;
  const progress = duration > 0 ? Math.min((displayElapsed / duration) * 100, 100) : 0;

  return (
    <MiniPlayerContent
      palette={palette}
      isDarkMode={isDarkMode}
      artUrl={artUrl}
      title={title}
      subtitle={subtitle}
      progress={progress}
      isPlaying={isPlaying}
      isLoading={isLoading}
      onToggle={togglePlayback}
      onDismiss={stopAndUnload}
    />
  );
}

function MiniPlayerContent({
  palette, isDarkMode, artUrl, title, subtitle,
  progress, isPlaying, isLoading, onToggle, onDismiss,
}: {
  palette: MinimalPalette;
  isDarkMode: boolean;
  artUrl?: string;
  title: string; subtitle: string;
  progress: number; isPlaying: boolean; isLoading: boolean;
  onToggle: () => void; onDismiss: () => void;
}) {
  // Pulsing animation for playback dots
  const dot1 = useSharedValue(0.4);
  const dot2 = useSharedValue(0.4);
  const dot3 = useSharedValue(0.4);

  useEffect(() => {
    if (!isPlaying) {
      dot1.value = 0.4; dot2.value = 0.4; dot3.value = 0.4;
      return;
    }
    const animate = (sv: typeof dot1, delay: number) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 + delay }),
          withTiming(0.4, { duration: 300 + delay }),
        ), -1, true,
      );
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, [isPlaying]);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value, height: 10 + 6 * dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value, height: 10 + 6 * dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value, height: 10 + 6 * dot3.value }));

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
      {/* Hair-line top border */}
      <View style={[styles.topBorder, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />

      {/* Progress line */}
      <View style={[styles.progressTrack, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
        <LinearGradient
          colors={[palette.primary, '#2DD4BF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress}%` }]}
        />
      </View>

      <View style={styles.row}>
        {/* Album art */}
        <View style={styles.artWrapper}>
          {artUrl ? (
            <Image source={{ uri: artUrl }} style={styles.art} />
          ) : (
            <View style={[styles.artPlaceholder, { backgroundColor: palette.primary + '30' }]}>
              <Ionicons name="musical-note" size={18} color={palette.primary} />
            </View>
          )}
          {/* Playing dots */}
          {isPlaying && (
            <View style={styles.playingDotsOverlay}>
              <Animated.View style={[styles.playingDot, { backgroundColor: palette.primary }, dot1Style]} />
              <Animated.View style={[styles.playingDot, { backgroundColor: palette.primary }, dot2Style]} />
              <Animated.View style={[styles.playingDot, { backgroundColor: palette.primary }, dot3Style]} />
            </View>
          )}
        </View>

        {/* Track info */}
        <View style={styles.info}>
          <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={1}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.subtitle, { color: palette.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={onToggle}
            style={[styles.playBtn, { backgroundColor: palette.primary }]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Ionicons name="hourglass-outline" size={18} color="#FFF" />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#FFF" style={!isPlaying && { marginLeft: 2 }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={palette.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Positioned by parent
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 6,
    paddingTop: 0,
  },
  topBorder: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginBottom: 0,
  },
  progressTrack: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  artWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  art: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  artPlaceholder: {
    width: '100%', height: '100%', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  playingDotsOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'flex-end',
    flexDirection: 'row', gap: 3, paddingBottom: 6, paddingHorizontal: 7,
  },
  playingDot: {
    width: 3.5, borderRadius: 2,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
});
