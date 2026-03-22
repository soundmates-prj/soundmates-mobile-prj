import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { PodcastResponse, podcastService } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { PodcastDetailScreen } from './PodcastDetailScreen';

// ─── Helpers ─────────────────────────────────────────────────────

/** Map API response → view-model used by UI components */
interface PodcastVM {
  id: string;
  title: string;
  subtitle: string;
  host: string;
  hostAvatar: string;
  coverImage: string;
  followers: number;
  episodes: number;
  category: string;
  isNew: boolean;
  isTrending: boolean;
  createdAt: string;
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1531369333294-39fa52b799ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/100?img=10';

/** Consider podcast "new" if created within the last 7 days */
const isRecentlyCreated = (dateStr: string): boolean => {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const mapToPodcastVM = (raw: PodcastResponse, idx: number): PodcastVM => ({
  id: raw.id,
  title: raw.title,
  subtitle: raw.description || '',
  host: raw.author || 'Unknown',
  hostAvatar: DEFAULT_AVATAR,
  coverImage: raw.banner || DEFAULT_COVER,
  followers: 0,
  episodes: raw.episodeCount,
  category: raw.type || 'Khác',
  isNew: isRecentlyCreated(raw.createdAt),
  // Mark the top 3 podcasts (by episode count) as trending
  isTrending: false, // will be set after sorting
  createdAt: raw.createdAt,
});

const CATEGORIES = ['Tất cả', 'Mới nhất', 'Thịnh hành'];

// ─── Sub-Components ──────────────────────────────────────────────

function FeaturedPodcast({ podcast, onPress }: { podcast: PodcastVM; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.featuredWrap} onPress={onPress}>
      <Image source={{ uri: podcast.coverImage }} style={styles.featuredImage} />

      <LinearGradient
        colors={['rgba(0,0,0,0.80)', 'rgba(0,0,0,0.40)', 'rgba(0,0,0,0.10)']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.featuredOverlay}
      />

      <View style={styles.featuredCircle} />

      <View style={styles.featuredContent}>
        <View style={styles.featuredBadgeRow}>
          {podcast.isTrending && (
            <View style={styles.badgeTrending}>
              <Ionicons name="trending-up" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>TRENDING</Text>
            </View>
          )}

          {podcast.isNew && (
            <View style={styles.badgeNew}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>MỚI</Text>
            </View>
          )}
        </View>

        <Text style={styles.featuredTitle}>{podcast.title}</Text>
        <Text style={styles.featuredSubtitle}>{podcast.subtitle}</Text>

        <View style={styles.featuredStatsRow}>
          <View style={styles.featuredStatInline}>
            <Ionicons name="mic-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.featuredStatText}>{podcast.episodes} tập</Text>
          </View>
        </View>
      </View>

      <View style={styles.featuredPlayWrap}>
        <View style={styles.featuredPlayButton}>
          <Ionicons name="play" size={20} color="#FFFFFF" style={styles.featuredPlayIcon} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PodcastCard({ podcast, onPress }: { podcast: PodcastVM; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.podcastCard} onPress={onPress}>
      <View style={styles.podcastCardTop}>
        <View style={styles.podcastCoverWrap}>
          <Image source={{ uri: podcast.coverImage }} style={styles.podcastCover} />
          {podcast.isNew && <View style={styles.newDot} />}
        </View>

        <View style={styles.podcastInfoWrap}>
          <Text numberOfLines={1} style={styles.podcastTitle}>
            {podcast.title}
          </Text>
          <Text numberOfLines={1} style={styles.podcastSubtitle}>
            {podcast.subtitle}
          </Text>

          <View style={styles.podcastMetaRow}>
            <View style={styles.podcastMetaInline}>
              <Ionicons name="mic-outline" size={12} color="#9CA3AF" />
              <Text style={styles.podcastMetaText}>{podcast.episodes} tập</Text>
            </View>

            {podcast.category ? (
              <View style={styles.podcastMetaInline}>
                <Ionicons name="pricetag-outline" size={12} color="#9CA3AF" />
                <Text style={styles.podcastMetaText}>{podcast.category}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.cardPlayButton}>
          <Ionicons name="play" size={16} color="#FFFFFF" style={styles.cardPlayIcon} />
        </TouchableOpacity>
      </View>

      <View style={styles.hostRow}>
        <Image source={{ uri: podcast.hostAvatar }} style={styles.hostAvatar} />
        <Text numberOfLines={1} style={styles.hostText}>
          Host: <Text style={styles.hostName}>{podcast.host}</Text>
        </Text>
        {podcast.isTrending && <Ionicons name="trending-up" size={14} color="#EF4444" style={styles.trendingIcon} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────

export default function PodcastScreen() {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedPodcast, setSelectedPodcast] = useState<string | null>(null);
  const [podcasts, setPodcasts] = useState<PodcastVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPodcasts = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const data = await podcastService.getPublished();

      // Sort by episode count descending to determine "trending"
      const sorted = [...data].sort((a, b) => b.episodeCount - a.episodeCount);
      const trendingIds = new Set(sorted.slice(0, 3).map((p) => p.id));

      const mapped = data.map((raw, idx) => {
        const vm = mapToPodcastVM(raw, idx);
        vm.isTrending = trendingIds.has(raw.id);
        return vm;
      });

      setPodcasts(mapped);
    } catch (err: any) {
      console.log('[PodcastScreen] fetchPodcasts error:', err);
      setError('Không thể tải danh sách podcast. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPodcasts(true);
  }, [fetchPodcasts]);

  // ─── Derived data ──────────────────────────────────────────────

  const filteredPodcasts = useMemo(() => {
    return podcasts.filter((podcast) => {
      if (activeCategory === 'Tất cả') return true;
      if (activeCategory === 'Mới nhất') return podcast.isNew;
      if (activeCategory === 'Thịnh hành') return podcast.isTrending;
      return podcast.category === activeCategory;
    });
  }, [activeCategory, podcasts]);

  const featuredPodcast = useMemo(() => {
    return podcasts.find((podcast) => podcast.isTrending) || podcasts[0];
  }, [podcasts]);

  const selectedPodcastData = useMemo(() => {
    if (!selectedPodcast) return undefined;
    return podcasts.find((podcast) => podcast.id === selectedPodcast);
  }, [selectedPodcast, podcasts]);

  // Build dynamic category chips from the data
  const dynamicCategories = useMemo(() => {
    const typeSet = new Set<string>();
    podcasts.forEach((p) => {
      if (p.category) typeSet.add(p.category);
    });
    // Always keep base categories, append unique types from data
    const extra = [...typeSet].filter((t) => !CATEGORIES.includes(t));
    return [...CATEGORIES, ...extra];
  }, [podcasts]);

  // ─── Detail screen ────────────────────────────────────────────

  if (selectedPodcast) {
    return <PodcastDetailScreen onBack={() => setSelectedPodcast(null)} podcast={selectedPodcastData} />;
  }

  // ─── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.screen, styles.centerContent, { backgroundColor: palette.background }]}> 
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải podcast...</Text>
      </View>
    );
  }

  // ─── Error state ──────────────────────────────────────────────

  if (error && podcasts.length === 0) {
    return (
      <View style={[styles.screen, styles.centerContent, { backgroundColor: palette.background }]}> 
        <View style={styles.emptyIconWrap}>
          <Ionicons name="cloud-offline-outline" size={32} color="#D1D5DB" />
        </View>
        <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>{error}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.retryButton, { backgroundColor: palette.primary }]}
          onPress={() => fetchPodcasts()}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}> 
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Podcast Letter</Text>
        <TouchableOpacity activeOpacity={0.8} style={styles.headerSearchButton}>
          <Ionicons name="search" size={20} color={palette.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.primary]} tintColor={palette.primary} />
        }
      >
        {/* Featured */}
        {featuredPodcast && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredSectionTitleRow}>
              <Ionicons name="sparkles" size={18} color="#55C5F1" />
              <Text style={styles.featuredSectionTitle}>Nổi bật hôm nay</Text>
            </View>
            <FeaturedPodcast podcast={featuredPodcast} onPress={() => setSelectedPodcast(featuredPodcast.id)} />
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {dynamicCategories.map((category) => {
              const isActive = category === activeCategory;

              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setActiveCategory(category)}
                  activeOpacity={0.85}
                  style={[styles.categoryPill, isActive ? styles.categoryPillActive : styles.categoryPillInactive]}
                >
                  <Text style={[styles.categoryPillText, isActive ? styles.categoryPillTextActive : styles.categoryPillTextInactive]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={styles.statsWrap}>
          <LinearGradient
            colors={['#E0F2FE', '#F0F9FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
          >
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statsLabel}>Tổng số podcast</Text>
                <Text style={styles.statsPrimaryValue}>{podcasts.length}</Text>
              </View>

              <View style={styles.statsRightBlock}>
                <Text style={styles.statsLabel}>Tổng số tập</Text>
                <Text style={styles.statsSecondaryValue}>
                  {podcasts.reduce((sum, p) => sum + p.episodes, 0)}
                </Text>
              </View>

              <View style={styles.statsIconWrap}>
                <Ionicons name="mic" size={24} color="#55C5F1" />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Podcast List */}
        <View style={styles.listWrap}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>{activeCategory === 'Tất cả' ? 'Tất cả Podcast' : activeCategory}</Text>
            <Text style={styles.listCount}>{filteredPodcasts.length} podcast</Text>
          </View>

          {filteredPodcasts.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} onPress={() => setSelectedPodcast(podcast.id)} />
          ))}

          {filteredPodcasts.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="mic" size={32} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>Không có podcast</Text>
              <Text style={styles.emptySubtitle}>Chưa có podcast nào trong danh mục này</Text>
            </View>
          )}
        </View>
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#55C5F1',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSearchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 114,
  },
  featuredSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  featuredSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredSectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  featuredWrap: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  featuredContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeTrending: {
    marginRight: 8,
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeNew: {
    backgroundColor: 'rgba(16,185,129,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 30,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  featuredStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredStatInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  featuredStatText: {
    marginLeft: 4,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  featuredPlayWrap: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  featuredPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#55C5F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  featuredPlayIcon: {
    marginLeft: 2,
  },
  categoriesWrap: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoriesScrollContent: {
    paddingBottom: 4,
  },
  categoryPill: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryPillActive: {
    backgroundColor: '#55C5F1',
    borderColor: '#55C5F1',
  },
  categoryPillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E293B',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  categoryPillTextInactive: {
    color: '#6B7280',
  },
  statsWrap: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statsPrimaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  statsRightBlock: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  statsSecondaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#55C5F1',
  },
  statsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(85,197,241,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  listWrap: {
    paddingHorizontal: 20,
  },
  listHeaderRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  listCount: {
    fontSize: 13,
    color: '#94A3B8',
  },
  podcastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 12,
  },
  podcastCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  podcastCoverWrap: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  podcastCover: {
    width: '100%',
    height: '100%',
  },
  newDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  podcastInfoWrap: {
    flex: 1,
    minWidth: 0,
  },
  podcastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  podcastSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  podcastMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  podcastMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  podcastMetaText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#9CA3AF',
  },
  cardPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#55C5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cardPlayIcon: {
    marginLeft: 1,
  },
  hostRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  hostText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  hostName: {
    fontWeight: '600',
    color: '#1E293B',
  },
  trendingIcon: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
