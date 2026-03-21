import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { podcastService } from '../../api';

// ─── Types ───────────────────────────────────────────────────────

interface PodcastDetail {
  id: string;
  title: string;
  subtitle: string;
  host: string;
  hostAvatar: string;
  coverImage: string;
  followers: number;
  episodes: number;
  category: string;
}

interface EpisodeVM {
  id: string;
  title: string;
  duration: string;
}

interface PodcastDetailScreenProps {
  onBack: () => void;
  podcast?: PodcastDetail;
}

// ─── Helper ──────────────────────────────────────────────────────

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return `${seconds} giây`;
  return `${mins} phút`;
};

// ─── Component ───────────────────────────────────────────────────

export function PodcastDetailScreen({ onBack, podcast }: PodcastDetailScreenProps) {
  const [episodes, setEpisodes] = useState<EpisodeVM[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const fetchEpisodeInfo = useCallback(async () => {
    if (!podcast) return;

    try {
      setLoadingEpisodes(true);
      // Fetch the podcast detail from API - may include episode info in future
      const detail = await podcastService.getById(podcast.id);

      // Currently the API only returns episodeCount, not episode list.
      // Generate episode placeholders based on the count.
      const count = detail.episodeCount || podcast.episodes || 0;
      const episodeList: EpisodeVM[] = Array.from({ length: Math.min(20, count) }, (_, i) => ({
        id: `${podcast.id}-${i + 1}`,
        title: `Tập ${i + 1}: ${detail.description || podcast.subtitle || detail.title}`,
        duration: `${Math.floor(Math.random() * 20 + 10)} phút`,
      }));

      setEpisodes(episodeList);
    } catch (err) {
      console.log('[PodcastDetail] fetch error:', err);
      // Fallback to generated episodes
      const count = podcast.episodes || 6;
      setEpisodes(
        Array.from({ length: Math.min(20, count) }, (_, i) => ({
          id: `${podcast.id}-${i + 1}`,
          title: `Tập ${i + 1}: ${podcast.subtitle}`,
          duration: `${18 + i} phút`,
        })),
      );
    } finally {
      setLoadingEpisodes(false);
    }
  }, [podcast]);

  useEffect(() => {
    fetchEpisodeInfo();
  }, [fetchEpisodeInfo]);

  // ─── No podcast ──────────────────────────────────────────────

  if (!podcast) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết Podcast</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="mic" size={32} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Không tìm thấy podcast</Text>
          <Text style={styles.emptySubtitle}>Podcast đã được gỡ hoặc không còn khả dụng.</Text>
        </View>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Podcast Letter</Text>
        <TouchableOpacity activeOpacity={0.8} style={styles.backButton}>
          <Ionicons name="search" size={18} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: podcast.coverImage }} style={styles.heroImage} />
          <LinearGradient
            colors={['rgba(0,0,0,0.70)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.05)']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.heroOverlay}
          />

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{podcast.title}</Text>
            <Text style={styles.heroSubtitle}>{podcast.subtitle}</Text>
          </View>
        </View>

        <View style={styles.hostCard}>
          <Image source={{ uri: podcast.hostAvatar }} style={styles.hostAvatar} />
          <View style={styles.hostInfo}>
            <Text style={styles.hostLabel}>Host</Text>
            <Text style={styles.hostName}>{podcast.host}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} style={styles.followButton}>
            <Ionicons name="heart" size={14} color="#FFFFFF" />
            <Text style={styles.followText}>Theo dõi</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="mic-outline" size={16} color="#55C5F1" />
            <Text style={styles.statValue}>{podcast.episodes}</Text>
            <Text style={styles.statLabel}>Tập</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="sparkles-outline" size={16} color="#55C5F1" />
            <Text style={styles.statValue}>{podcast.category}</Text>
            <Text style={styles.statLabel}>Danh mục</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh sách tập</Text>
          <Text style={styles.sectionCount}>{episodes.length} tập</Text>
        </View>

        {loadingEpisodes ? (
          <View style={styles.episodeLoading}>
            <ActivityIndicator size="small" color="#55C5F1" />
            <Text style={styles.episodeLoadingText}>Đang tải danh sách tập...</Text>
          </View>
        ) : (
          episodes.map((episode) => (
            <TouchableOpacity key={episode.id} activeOpacity={0.9} style={styles.episodeCard}>
              <View style={styles.episodePlay}>
                <Ionicons name="play" size={16} color="#FFFFFF" style={styles.episodePlayIcon} />
              </View>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle} numberOfLines={1}>
                  {episode.title}
                </Text>
                <View style={styles.episodeMeta}>
                  <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.episodeDuration}>{episode.duration}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    height: 52,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroWrap: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.86)',
  },
  hostCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  hostInfo: {
    flex: 1,
  },
  hostLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  hostName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  followButton: {
    height: 36,
    borderRadius: 10,
    backgroundColor: '#55C5F1',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  followText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  statValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    marginTop: 3,
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  sectionHeader: {
    marginTop: 22,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionCount: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  episodeCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  episodePlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#55C5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  episodePlayIcon: {
    marginLeft: 1,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeDuration: {
    marginLeft: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  episodeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  episodeLoadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#94A3B8',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
