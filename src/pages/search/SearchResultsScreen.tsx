import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { favoriteService, PodcastResponse, SpotifyTrack, UserPlaylistResponse } from '../../api';
import { showToast } from '../../components/ui/Toast';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export interface SearchResultBundle {
  tracks: SpotifyTrack[];
  podcasts?: PodcastResponse[];
  playlists?: UserPlaylistResponse[];
}

interface SearchResultsScreenProps {
  query: string;
  data: SearchResultBundle | null;
  isLoading: boolean;
  onBackToSuggestions: () => void;
  onOpenSpotifyLink: (url: string) => void;
  onOpenPlaylistDetail?: (playlist: UserPlaylistResponse) => void;
  onOpenPodcastTab?: (podcastId: string) => void;
  onAddFavoriteTrack: (track: SpotifyTrack) => Promise<{
    success: boolean;
    message?: string;
  }>;
}

type SearchTab = 'track' | 'podcast' | 'playlist';

export default function SearchResultsScreen({
  query,
  data,
  isLoading,
  onOpenSpotifyLink,
  onOpenPlaylistDetail,
  onOpenPodcastTab,
  onAddFavoriteTrack,
}: SearchResultsScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const tracks = data?.tracks || [];
  const podcasts = data?.podcasts || [];
  const playlists = data?.playlists || [];
  const totalResults = tracks.length + podcasts.length + playlists.length;
  const [activeTab, setActiveTab] = useState<SearchTab>('track');
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [favoritedTrackIds, setFavoritedTrackIds] = useState<Set<string>>(new Set());

  const loadFavoritedTracks = useCallback(async () => {
    try {
      const result = await favoriteService.getFavorites({
        itemType: 'track',
        source: 'spotify',
        page: 1,
        pageSize: 200,
      });

      if (!result.success) {
        return;
      }

      setFavoritedTrackIds(new Set(result.data.map((item) => item.itemId)));
    } catch (error) {
      console.log('[SearchResultsScreen] loadFavoritedTracks error:', error);
    }
  }, []);

  useEffect(() => {
    void loadFavoritedTracks();
  }, [loadFavoritedTracks, query]);

  const handleAddFavorite = useCallback(async (track: SpotifyTrack) => {
    if (favoritedTrackIds.has(track.id)) {
      showToast.info('Đã có trong yêu thích', 'Bài hát này đã nằm trong danh sách yêu thích.');
      return;
    }

    if (isAddingFavorite) {
      return;
    }

    setIsAddingFavorite(true);

    try {
      const result = await onAddFavoriteTrack(track);

      if (result.success) {
        setFavoritedTrackIds((prev) => {
          const next = new Set(prev);
          next.add(track.id);
          return next;
        });

        showToast.success('Đã thêm vào yêu thích', result.message || 'Bài hát đã được thêm vào danh sách yêu thích.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      showToast.error('Không thể thêm vào yêu thích', result.message || 'Vui lòng thử lại sau.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('[SearchResultsScreen] handleAddFavorite error:', error);
      showToast.error('Không thể thêm vào yêu thích', 'Vui lòng thử lại sau.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAddingFavorite(false);
    }
  }, [favoritedTrackIds, isAddingFavorite, onAddFavoriteTrack]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Kết quả cho "{query}"</Text>
        <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>{totalResults} kết quả</Text>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'track' && { borderBottomColor: palette.primary }]}
          onPress={() => setActiveTab('track')}
        >
          <Text style={[styles.tabText, activeTab === 'track' ? { color: palette.primary, fontWeight: '700' } : { color: palette.textSecondary }]}>
            Bài hát ({tracks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'podcast' && { borderBottomColor: palette.primary }]}
          onPress={() => setActiveTab('podcast')}
        >
          <Text style={[styles.tabText, activeTab === 'podcast' ? { color: palette.primary, fontWeight: '700' } : { color: palette.textSecondary }]}>
            Podcast ({podcasts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'playlist' && { borderBottomColor: palette.primary }]}
          onPress={() => setActiveTab('playlist')}
        >
          <Text style={[styles.tabText, activeTab === 'playlist' ? { color: palette.primary, fontWeight: '700' } : { color: palette.textSecondary }]}>
            Playlist ({playlists.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerBlock}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải kết quả...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyContent}>
          {/* ── Spotify Tracks ── */}
          {activeTab === 'track' && (
            tracks.length > 0 ? (
              <View style={styles.sectionBlock}>
                {tracks.map((track, idx) => {
                  const isFavorited = favoritedTrackIds.has(track.id);
                  return (
                    <Animated.View key={track.id} entering={FadeInDown.delay(idx * 40)}>
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
                          disabled={isAddingFavorite}
                          onPress={() => { void handleAddFavorite(track); }}
                          style={[styles.favBtn, { backgroundColor: isFavorited ? 'rgba(239, 68, 68, 0.16)' : palette.primary + '15' }]}
                        >
                          <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={20} color={isFavorited ? '#EF4444' : palette.primary} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={48} color={palette.border} />
                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Không tìm thấy bài hát nào</Text>
              </View>
            )
          )}

          {/* ── Podcasts ── */}
          {activeTab === 'podcast' && (
            podcasts.length > 0 ? (
              <View style={styles.sectionBlock}>
                {podcasts.map((pod, idx) => (
                  <Animated.View key={pod.id} entering={FadeInDown.delay(idx * 40)}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onOpenPodcastTab?.(pod.id)}
                      style={[styles.trackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    >
                      <View style={[styles.trackImage, { backgroundColor: palette.primary + '20', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }]}>
                        {pod.banner
                          ? <Image source={{ uri: pod.banner }} style={styles.trackImage} />
                          : <Ionicons name="mic" size={22} color={palette.primary} />}
                      </View>
                      <View style={styles.trackInfo}>
                        <Text numberOfLines={1} style={[styles.trackName, { color: palette.textPrimary }]}>{pod.title}</Text>
                        <Text numberOfLines={1} style={[styles.artistName, { color: palette.textSecondary }]}>
                          {pod.author || pod.createdBy || 'Podcast'} · {pod.episodeCount} tập
                        </Text>
                      </View>
                      <View style={[styles.favBtn, { backgroundColor: palette.primary + '15' }]}>
                        <Ionicons name="headset-outline" size={20} color={palette.primary} />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="mic-outline" size={48} color={palette.border} />
                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Không tìm thấy podcast nào</Text>
              </View>
            )
          )}

          {/* ── Playlists ── */}
          {activeTab === 'playlist' && (
            playlists.length > 0 ? (
              <View style={styles.sectionBlock}>
                {playlists.map((pl, idx) => (
                  <Animated.View key={pl.id} entering={FadeInDown.delay(idx * 40)}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onOpenPlaylistDetail?.(pl)}
                      style={[styles.trackCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    >
                      <View style={[styles.trackImage, { backgroundColor: palette.primary + '20', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }]}>
                        {pl.thumbnailUrl
                          ? <Image source={{ uri: pl.thumbnailUrl }} style={styles.trackImage} />
                          : <Ionicons name="musical-notes" size={22} color={palette.primary} />}
                      </View>
                      <View style={styles.trackInfo}>
                        <Text numberOfLines={1} style={[styles.trackName, { color: palette.textPrimary }]}>{pl.playlistName}</Text>
                        <Text numberOfLines={1} style={[styles.artistName, { color: palette.textSecondary }]}>
                          {pl.totalTracks} bài hát · Playlist công khai
                        </Text>
                      </View>
                      <View style={[styles.favBtn, { backgroundColor: palette.primary + '15' }]}>
                        <Ionicons name="list-outline" size={20} color={palette.primary} />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="list-outline" size={48} color={palette.border} />
                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Không tìm thấy playlist nào</Text>
              </View>
            )
          )}
        </ScrollView>
      )}

      {isAddingFavorite && (
        <View style={styles.favoriteLoadingOverlay}>
          <View style={[styles.favoriteLoadingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={[styles.favoriteLoadingText, { color: palette.textPrimary }]}>Đang thêm vào yêu thích...</Text>
          </View>
        </View>
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
    paddingTop: 10,
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
    paddingTop: 10,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: 20,
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
  favoriteLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  favoriteLoadingCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  favoriteLoadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
