import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Extrapolate,
  FadeInDown,
  FadeInRight,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { PodcastResponse, podcastService } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { resolveAuthorAvatar, resolveAuthorName } from '../../utils/authorUtils';
import { PodcastDetailScreen } from './PodcastDetailScreen';

const { width } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────────

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
  price: number;
  isPaid: boolean;
  isPurchased: boolean;
}

const formatVnd = (value: number): string =>
  !value || Number.isNaN(value) ? '0' : value.toLocaleString('vi-VN');

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1531369333294-39fa52b799ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/100?img=10';

const isRecentlyCreated = (dateStr: string): boolean => {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const mapToPodcastVM = (raw: PodcastResponse): PodcastVM => ({
  id: raw.id,
  title: raw.title,
  subtitle: raw.description || '',
  host: resolveAuthorName(raw.author) || 'Unknown',
  hostAvatar: resolveAuthorAvatar(raw.author) || DEFAULT_AVATAR,
  coverImage: raw.banner || DEFAULT_COVER,
  followers: 0,
  episodes: raw.episodeCount,
  category: raw.type || 'Khác',
  isNew: isRecentlyCreated(raw.createdAt),
  isTrending: false,
  createdAt: raw.createdAt,
  price: raw.price || 0,
  isPaid: raw.isPaid || false,
  isPurchased: raw.isPurchased || false,
});

const CATEGORIES = ['Tất cả', 'Mới nhất', 'Thịnh hành'];

// ─── Sub-Components ──────────────────────────────────────────────

function FeaturedPodcast({ podcast, onPress }: { podcast: PodcastVM; onPress: () => void }) {
  const { isDarkMode } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={[styles.featuredWrap, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.featuredTouchable}
      >
        <Image source={{ uri: podcast.coverImage }} style={styles.featuredImage} />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.featuredGradient}
        />

        <BlurView intensity={20} style={styles.featuredGlassOverlay} tint={isDarkMode ? 'dark' : 'light'} />

        {podcast.price > 0 && (
          podcast.isPurchased ? (
            <View style={[styles.featuredPriceBadge, { backgroundColor: 'rgba(16, 185, 129, 0.9)' }]}>
              <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.featuredPriceText}>Đã sở hữu</Text>
            </View>
          ) : (
            <View style={[styles.featuredPriceBadge, { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }]}>
              {podcast.isPaid && <Ionicons name="lock-closed" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />}
              <Text style={styles.featuredPriceText}>{formatVnd(podcast.price)}₫</Text>
            </View>
          )
        )}

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

          <Text style={styles.featuredTitle} numberOfLines={2}>{podcast.title}</Text>
          <Text style={styles.featuredSubtitle} numberOfLines={1}>{podcast.subtitle}</Text>

          <View style={styles.featuredFooter}>
            <View style={styles.featuredHostRow}>
              <Image source={{ uri: podcast.hostAvatar }} style={styles.featuredHostAvatar} />
              <Text style={styles.featuredHostName}>{podcast.host}</Text>
            </View>
            <View style={styles.featuredPlayBtn}>
              <Ionicons name="play" size={20} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PodcastCard({ podcast, onPress }: { podcast: PodcastVM; onPress: () => void }) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.podcastCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <View style={{ position: 'relative' }}>
          <View style={styles.cardImageContainer}>
            <Image source={{ uri: podcast.coverImage }} style={styles.cardImage} />
          </View>
          {podcast.price > 0 && (
            <View style={[
              styles.cardPriceBadge,
              podcast.isPurchased
                ? { backgroundColor: 'rgba(16, 185, 129, 0.9)', borderColor: 'rgba(16, 185, 129, 0.9)' }
                : { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }
            ]}>
              {podcast.isPurchased ? (
                <>
                  <Ionicons name="checkmark-circle" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                  <Text style={styles.cardPriceText}>Đã sở hữu</Text>
                </>
              ) : (
                <>
                  {podcast.isPaid && <Ionicons name="lock-closed" size={11} color="#FFFFFF" style={{ marginRight: 2 }} />}
                  <Text style={styles.cardPriceText}>{formatVnd(podcast.price)}₫</Text>
                </>
              )}
            </View>
          )}
          {podcast.isNew && (
            <View style={styles.cardNewBadge}>
              <View style={styles.cardNewDot} />
            </View>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]} numberOfLines={1}>
            {podcast.title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]} numberOfLines={1}>
            {podcast.subtitle}
          </Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="mic-outline" size={12} color={palette.textSecondary} />
              <Text style={[styles.metaText, { color: palette.textSecondary }]}>{podcast.episodes} tập</Text>
            </View>
            <View style={styles.metaDivider} />
            <Text style={[styles.metaText, { color: palette.primary }]}>{podcast.category}</Text>
          </View>
        </View>

        <View style={[styles.cardAction, { backgroundColor: palette.primary + '20' }]}>
          <Ionicons name="chevron-forward" size={16} color={palette.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────

interface PodcastScreenProps {
  paddingTop?: number;
  paddingBottom?: number;
  hideStickyHeader?: boolean;
  onScroll?: any;
  initialSelectedPodcastId?: string | null;
  onClearSelectedPodcast?: () => void;
}

export default function PodcastScreen({
  paddingTop = 0,
  paddingBottom = 0,
  hideStickyHeader = false,
  onScroll,
  initialSelectedPodcastId,
  onClearSelectedPodcast
}: PodcastScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedPodcast, setSelectedPodcast] = useState<string | null>(initialSelectedPodcastId || null);
  const [podcasts, setPodcasts] = useState<PodcastVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedPodcastId) {
      setSelectedPodcast(initialSelectedPodcastId);
    }
  }, [initialSelectedPodcastId]);

  const handleBackFromDetail = useCallback(() => {
    setSelectedPodcast(null);
    onClearSelectedPodcast?.();
  }, [onClearSelectedPodcast]);

  const scrollY = useSharedValue(0);
  const internalScrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const scrollHandler = onScroll ?? internalScrollHandler;

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 50], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 50], [-10, 0], Extrapolate.CLAMP) }],
  }));

  const fetchPodcasts = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const data = await podcastService.getPublished();
      const sorted = [...data].sort((a, b) => b.episodeCount - a.episodeCount);
      const trendingIds = new Set(sorted.slice(0, 3).map((p) => p.id));

      const mapped = data.map((raw) => {
        const vm = mapToPodcastVM(raw);
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

  const filteredPodcasts = useMemo(() => {
    return podcasts.filter((podcast) => {
      if (activeCategory === 'Tất cả') return true;
      if (activeCategory === 'Mới nhất') return podcast.isNew;
      if (activeCategory === 'Thịnh hành') return podcast.isTrending;
      return podcast.category === activeCategory;
    });
  }, [activeCategory, podcasts]);

  const featuredPodcasts = useMemo(() => {
    return podcasts.filter(p => p.isTrending).slice(0, 5);
  }, [podcasts]);

  const selectedPodcastData = useMemo(() => {
    if (!selectedPodcast) return undefined;
    return podcasts.find((podcast) => podcast.id === selectedPodcast);
  }, [selectedPodcast, podcasts]);

  const dynamicCategories = useMemo(() => {
    const typeSet = new Set<string>();
    podcasts.forEach((p) => {
      if (p.category) typeSet.add(p.category);
    });
    const extra = [...typeSet].filter((t) => !CATEGORIES.includes(t));
    return [...CATEGORIES, ...extra];
  }, [podcasts]);

  if (selectedPodcast) {
    return <PodcastDetailScreen onBack={handleBackFromDetail} podcast={selectedPodcastData} />;
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.centerContent, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      {/* Animated Sticky Header */}
      {!hideStickyHeader && (
        <Animated.View style={[
          styles.stickyHeader,
          headerAnimatedStyle,
          { backgroundColor: palette.surface + 'CC' }
        ]}>
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint={isDarkMode ? 'dark' : 'light'} />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Podcast</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="search" size={22} color={palette.textPrimary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 10 + paddingTop, paddingBottom: 120 + paddingBottom }]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.primary]} tintColor={palette.primary} />
        }
      >
        <View style={styles.topSection}>
          <Animated.Text entering={FadeInDown.delay(100)} style={[styles.mainTitle, { color: palette.textPrimary }]}>
            Podcast
          </Animated.Text>
          <Animated.View entering={FadeInDown.delay(200)} style={styles.searchPlaceholder}>
            <Ionicons name="search" size={20} color={palette.textSecondary} />
            <Text style={[styles.searchText, { color: palette.textSecondary }]}>Tìm kiếm podcast...</Text>
          </Animated.View>
        </View>

        {/* Featured Carousels */}
        {featuredPodcasts.length > 0 && (
          <View
            style={styles.featuredSection}
            onTouchStart={() => DeviceEventEmitter.emit('HorizontalListActive', true)}
            onTouchEnd={() => DeviceEventEmitter.emit('HorizontalListActive', false)}
            onTouchCancel={() => DeviceEventEmitter.emit('HorizontalListActive', false)}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Nổi bật</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.85 + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredPodcasts.map((p, idx) => (
                <FeaturedPodcast key={p.id} podcast={p} onPress={() => setSelectedPodcast(p.id)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View
          style={styles.categoriesSection}
          onTouchStart={() => DeviceEventEmitter.emit('HorizontalListActive', true)}
          onTouchEnd={() => DeviceEventEmitter.emit('HorizontalListActive', false)}
          onTouchCancel={() => DeviceEventEmitter.emit('HorizontalListActive', false)}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {dynamicCategories.map((category, idx) => {
              const isActive = category === activeCategory;
              return (
                <Animated.View key={category} entering={FadeInRight.delay(idx * 50)}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveCategory(category);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.categoryChip,
                      isActive ? { backgroundColor: palette.primary } : { backgroundColor: palette.surface, borderColor: palette.border }
                    ]}
                  >
                    <Text style={[
                      styles.categoryText,
                      isActive ? { color: '#FFFFFF' } : { color: palette.textSecondary }
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* List Section */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              {activeCategory === 'Tất cả' ? 'Dành cho bạn' : activeCategory}
            </Text>
            <Text style={[styles.sectionCount, { color: palette.textSecondary }]}>
              {filteredPodcasts.length} kết quả
            </Text>
          </View>

          {filteredPodcasts.map((p, idx) => (
            <PodcastCard key={p.id} podcast={p} onPress={() => setSelectedPodcast(p.id)} />
          ))}

          {filteredPodcasts.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="mic-off-outline" size={48} color={palette.border} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Không tìm thấy podcast nào</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 10,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
  },
  topSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  searchPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchText: {
    marginLeft: 8,
    fontSize: 16,
  },
  featuredSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 13,
  },
  featuredScroll: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  featuredWrap: {
    width: width * 0.85,
    height: 220,
    marginRight: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  featuredTouchable: {
    flex: 1,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  featuredContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgeTrending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  badgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 4,
  },
  featuredSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 16,
  },
  featuredPriceBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    left: 'auto',
    alignSelf: 'flex-end',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  featuredPriceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredHostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  featuredHostName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listSection: {
    paddingHorizontal: 20,
  },
  podcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardNewBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    padding: 2,
    borderRadius: 6,
  },
  cardNewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  cardPriceBadge: {
    position: 'absolute',
    bottom: 6,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardPriceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  cardAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
  },
});
