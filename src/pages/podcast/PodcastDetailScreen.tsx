import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { podcastService } from '../../api';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useTheme } from '../../context/ThemeContext';
import { PodcastPurchaseModal } from '../../components/common/PodcastPurchaseModal';

const { width, height } = Dimensions.get('window');

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
  isPaid?: boolean;
  isPurchased?: boolean;
  price?: number;
}

interface EpisodeVM {
  id: string;
  title: string;
  duration: string;
  durationSeconds: number;
  audioUrl?: string;
  thumbnailUrl?: string;
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
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const [episodes, setEpisodes] = useState<EpisodeVM[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
  const [localPurchased, setLocalPurchased] = useState(false);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [150, 250],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 1],
    extrapolate: 'clamp',
  });

  const { loadTrack, activeTrack, isPlaying, togglePlayback } = useAudioPlayer();

  const fetchEpisodeInfo = useCallback(async () => {
    if (!podcast) return;

    try {
      setLoadingEpisodes(true);
      const detail = await podcastService.getById(podcast.id);

      const realEpisodes = detail.allEpisodes || [];
      const episodeList: EpisodeVM[] = realEpisodes.map((ep, i) => ({
        id: ep.id,
        title: ep.title || `Tập ${i + 1}: ${podcast.subtitle}`,
        duration: formatDuration(ep.duration || 0),
        durationSeconds: ep.duration || 0,
        audioUrl: ep.audioUrl,
        thumbnailUrl: ep.thumbnailUrl || detail.banner || podcast.coverImage,
      }));

      setEpisodes(episodeList);
    } catch (err) {
      console.log('[PodcastDetail] fetch error:', err);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [podcast]);

  useEffect(() => {
    fetchEpisodeInfo();
  }, [fetchEpisodeInfo]);

  // Check if this podcast is already saved as favorite
  useEffect(() => {
    if (!podcast) return;
    podcastService.getSavedPodcasts().then((list) => {
      if (list.some(p => p.id === podcast.id)) {
        setIsFollowed(true);
      }
    });
  }, [podcast?.id]);

  const handleToggleSave = async () => {
    if (!podcast || isSaving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      if (isFollowed) {
        // Already saved — remove
        const success = await podcastService.unsavePodcast(podcast.id);
        if (success) {
          setIsFollowed(false);
          Toast.show({
            type: 'success',
            text1: 'Đã bỏ lưu Podcast',
            text2: 'Podcast này đã được xóa khỏi mục Yêu thích.',
          });
        }
      } else {
        // Not saved — add
        const success = await podcastService.savePodcast(podcast.id);
        if (success) {
          setIsFollowed(true);
          Toast.show({
            type: 'success',
            text1: 'Đã lưu Podcast',
            text2: 'Bạn có thể tìm thấy trong mục Yêu thích ở Hồ sơ.',
          });
        }
      }
    } catch (err) {
      console.log('[PodcastDetail] handleToggleSave error:', err);
      Toast.show({
        type: 'error',
        text1: 'Đã xảy ra lỗi',
        text2: 'Không thể cập nhật danh sách Yêu thích.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFollowed(!isFollowed);
  };

  if (!podcast) return null;

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      {/* Immersive Header Image */}
      <RNAnimated.View style={[styles.heroContainer, { transform: [{ scale: imageScale }] }]}>
        <Image source={{ uri: podcast.coverImage }} style={styles.heroImage} blurRadius={10} />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', palette.background]}
          style={StyleSheet.absoluteFill}
        />
      </RNAnimated.View>

      {/* Sticky Header */}
      <RNAnimated.View style={[styles.stickyHeader, { opacity: headerOpacity, backgroundColor: palette.surface + 'E6' }]}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint={isDarkMode ? 'dark' : 'light'} />
        <View style={styles.headerContent}>
          <Text style={[styles.stickyTitle, { color: palette.textPrimary }]} numberOfLines={1}>{podcast.title}</Text>
        </View>
      </RNAnimated.View>

      {/* Back Button */}
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDarkMode ? 'dark' : 'light'} />
        <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
      </TouchableOpacity>

      <RNAnimated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Main Podcast Info */}
        <View style={styles.infoSection}>
          <Animated.View entering={FadeInDown.delay(200)} style={styles.coverWrapper}>
            <Image source={{ uri: podcast.coverImage }} style={styles.mainCover} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.titleWrapper}>
            <Text style={[styles.mainTitle, { color: palette.textPrimary }]}>{podcast.title}</Text>
            <Text style={[styles.mainSubtitle, { color: palette.textSecondary }]}>{podcast.subtitle}</Text>
            <Text style={[styles.mainSubtitle, { color: palette.primary, marginTop: 4, fontWeight: '600' }]}>{podcast.host}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)} style={styles.actionRow}>
            {podcast.isPaid && !podcast.isPurchased && !localPurchased ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsPurchaseModalVisible(true);
                }}
                style={[styles.followBtn, { backgroundColor: '#F59E0B' }]}
              >
                <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                <Text style={[styles.followBtnText, { color: "#FFFFFF" }]}>
                  Mua {podcast.price?.toLocaleString('vi-VN')}đ
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  if (episodes.length === 0 || !episodes[0].audioUrl) return;
                  const latestEp = episodes[0];
                  if (activeTrack?.id === latestEp.id) {
                    void togglePlayback();
                  } else {
                    loadTrack({
                      id: latestEp.id,
                      url: latestEp.audioUrl!,
                      title: latestEp.title,
                      artist: podcast.host || 'Podcast',
                      artUrl: latestEp.thumbnailUrl || podcast.coverImage,
                      duration: latestEp.durationSeconds,
                    });
                  }
                }}
                style={[styles.followBtn, { backgroundColor: palette.primary }]}
              >
                <Ionicons name={activeTrack?.id === episodes[0]?.id && isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
                <Text style={[styles.followBtnText, { color: "#FFFFFF" }]}>
                  {activeTrack?.id === episodes[0]?.id && isPlaying ? 'Đang phát' : 'Phát tập mới nhất'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSaving}
              onPress={handleToggleSave}
              style={[styles.shareBtn, isFollowed
                ? { backgroundColor: palette.surface, borderColor: palette.primary }
                : { backgroundColor: palette.surface, borderColor: palette.border }
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={palette.primary} />
              ) : (
                <Ionicons name={isFollowed ? "bookmark" : "bookmark-outline"} size={20} color={isFollowed ? palette.primary : palette.textPrimary} />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)} style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: palette.textPrimary }]}>{podcast.episodes}</Text>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Tập</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: palette.textPrimary }]}>{podcast.category}</Text>
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Danh mục</Text>
            </View>
          </Animated.View>
        </View>

        {/* Episode List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Danh sách tập</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: palette.primary }]}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {loadingEpisodes ? (
            <ActivityIndicator size="small" color={palette.primary} style={{ marginTop: 20 }} />
          ) : (
            episodes.map((episode, idx) => {
              const isCurrentTrack = activeTrack?.id === episode.id;
              const isCurrentlyPlaying = isCurrentTrack && isPlaying;

              return (
                <Animated.View key={episode.id} entering={FadeInUp.delay(600 + idx * 50)}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.episodeCard, { backgroundColor: isCurrentTrack ? palette.primary + '10' : palette.surface, borderColor: isCurrentTrack ? palette.primary : palette.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (podcast.isPaid && !podcast.isPurchased && !localPurchased) {
                        setIsPurchaseModalVisible(true);
                        return;
                      }
                      if (!episode.audioUrl) return;
                      if (isCurrentTrack) {
                        void togglePlayback();
                      } else {
                        loadTrack({
                          id: episode.id,
                          url: episode.audioUrl,
                          title: episode.title,
                          artist: podcast.host || 'Podcast',
                          artUrl: episode.thumbnailUrl || podcast.coverImage,
                          duration: episode.durationSeconds,
                        });
                      }
                    }}
                  >
                    <View style={[styles.playCircle, { backgroundColor: isCurrentTrack ? palette.primary : palette.primary + '15' }]}>
                      <Ionicons name={isCurrentlyPlaying ? "pause" : "play"} size={18} color={isCurrentTrack ? '#FFF' : palette.primary} style={{ marginLeft: isCurrentlyPlaying ? 0 : 2 }} />
                    </View>
                    <View style={styles.episodeInfo}>
                      <Text style={[styles.episodeTitle, { color: isCurrentTrack ? palette.primary : palette.textPrimary }]} numberOfLines={1}>{episode.title}</Text>
                      <View style={styles.episodeMeta}>
                        <Ionicons name="time-outline" size={12} color={palette.textSecondary} />
                        <Text style={[styles.episodeDuration, { color: palette.textSecondary }]}>{episode.duration}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.moreBtn}>
                      <Ionicons name="ellipsis-horizontal" size={18} color={palette.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Animated.View>
              )
            })
          )}
        </View>
      </RNAnimated.ScrollView>

      <PodcastPurchaseModal
        visible={isPurchaseModalVisible}
        podcastId={podcast.id}
        title={podcast.title}
        coverImage={podcast.coverImage}
        price={podcast.price || 0}
        author={podcast.host}
        onClose={() => setIsPurchaseModalVisible(false)}
        onPaymentSuccess={() => {
          setIsPurchaseModalVisible(false);
          setLocalPurchased(true);
          Toast.show({
            type: 'success',
            text1: 'Thanh toán thành công',
            text2: 'Bạn đã mở khóa Podcast này.',
          });
          // Refresh episode list to get actual audioUrls if they were stripped
          fetchEpisodeInfo();
        }}
        onPaymentFailed={(reason) => {
          setIsPurchaseModalVisible(false);
          if (reason) {
            Toast.show({
              type: 'error',
              text1: 'Thanh toán thất bại',
              text2: reason,
            });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
  },
  heroImage: {
    width: '100%',
    height: '100%',
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
    paddingHorizontal: 60,
    alignItems: 'center',
  },
  stickyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    position: 'absolute',
    top: 5,
    left: 20,
    zIndex: 11,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingTop: height * 0.08,
    paddingBottom: 150,
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  coverWrapper: {
    width: width * 0.6,
    aspectRatio: 1,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  mainCover: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  titleWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginRight: 12,
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  shareBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    opacity: 0.5,
  },
  listSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeDuration: {
    fontSize: 12,
    marginLeft: 4,
  },
  moreBtn: {
    padding: 8,
  },
  floatingPlayWrapper: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  floatingPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  floatingPlayText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
  },
});
