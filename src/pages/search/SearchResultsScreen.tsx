import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { SpotifyTrack } from '../../api';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export interface SearchResultBundle {
  tracks: SpotifyTrack[];
}

interface SearchResultsScreenProps {
  query: string;
  data: SearchResultBundle | null;
  isLoading: boolean;
  onBackToSuggestions: () => void;
  onOpenSpotifyLink: (url: string) => void;
  onAddFavoriteTrack: (track: SpotifyTrack) => void;
}

export default function SearchResultsScreen({
  query,
  data,
  isLoading,
  onOpenSpotifyLink,
  onAddFavoriteTrack,
}: SearchResultsScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const tracks = data?.tracks || [];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Kết quả cho {query}</Text>
        <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>{tracks.length} bài hát</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBlock}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải kết quả...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          {tracks.map((track, idx) => (
            <Animated.View key={track.id} entering={FadeInDown.delay(idx * 50)}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (track.external_urls?.spotify) onOpenSpotifyLink(track.external_urls.spotify);
                }}
                style={[styles.trackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <Image
                  source={{ uri: track.album?.images?.[0]?.url || 'https://i.pravatar.cc/100?img=12' }}
                  style={styles.trackImage}
                />
                <View style={styles.trackInfo}>
                  <Text numberOfLines={1} style={[styles.trackName, { color: palette.textPrimary }]}>{track.name}</Text>
                  <Text numberOfLines={1} style={[styles.artistName, { color: palette.textSecondary }]}>
                    {track.artists?.map((a) => a.name).join(', ')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onAddFavoriteTrack(track);
                  }}
                  style={[styles.favBtn, { backgroundColor: palette.primary + '15' }]}
                >
                  <Ionicons name="heart-outline" size={20} color={palette.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          ))}

          {tracks.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={palette.border} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Không tìm thấy bài hát nào</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 120,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 15,
  },
  trackName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  artistName: {
    fontSize: 13,
  },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
});
