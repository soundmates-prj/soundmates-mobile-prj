import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PodcastDetailScreen } from './PodcastDetailScreen';

interface Podcast {
  id: string;
  title: string;
  subtitle: string;
  host: string;
  hostAvatar: string;
  coverImage: string;
  followers: number;
  episodes: number;
  category: string;
  isNew?: boolean;
  isTrending?: boolean;
}

const CATEGORIES = ['Tất cả', 'Mới nhất', 'Thịnh hành', 'Yêu thích', 'Tâm sự', 'Nhạc', 'Câu chuyện'];

const PODCASTS: Podcast[] = [
  {
    id: '1',
    title: 'Thuần Podcast',
    subtitle: 'Yêu lành',
    host: 'Minh Anh',
    hostAvatar: 'https://i.pravatar.cc/100?img=10',
    coverImage:
      'https://images.unsplash.com/photo-1531369333294-39fa52b799ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvZGNhc3QlMjByZWNvcmRpbmclMjBvdXRkb29yJTIwbmF0dXJlfGVufDF8fHx8MTc3MzI5NjgxM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    followers: 1234,
    episodes: 2,
    category: 'Tâm sự',
    isNew: true,
    isTrending: true,
  },
  {
    id: '2',
    title: 'Đêm Nghe Thơ',
    subtitle: 'Thơ và đời',
    host: 'Hoàng Lan',
    hostAvatar: 'https://i.pravatar.cc/100?img=5',
    coverImage:
      'https://images.unsplash.com/photo-1764160750195-8a646b8c8437?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2RjYXN0JTIwcmVjb3JkaW5nJTIwbWljcm9waG9uZSUyMHNldHVwfGVufDF8fHx8MTc3MzI5NzA5N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    followers: 2456,
    episodes: 15,
    category: 'Câu chuyện',
    isTrending: true,
  },
  {
    id: '3',
    title: 'Âm Thanh Trị Liệu',
    subtitle: 'Chữa lành tâm hồn',
    host: 'Dr. Phương',
    hostAvatar: 'https://i.pravatar.cc/100?img=7',
    coverImage:
      'https://images.unsplash.com/photo-1758876201548-ade1eff8b169?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMHRoZXJhcHklMjByZWxheGF0aW9ufGVufDF8fHx8MTc3MzI5NzA5OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    followers: 3892,
    episodes: 24,
    category: 'Nhạc',
  },
  {
    id: '4',
    title: 'Chuyện Radio',
    subtitle: 'Kể chuyện đêm khuya',
    host: 'Quang Minh',
    hostAvatar: 'https://i.pravatar.cc/100?img=3',
    coverImage:
      'https://images.unsplash.com/photo-1772812660568-994f09a62167?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYWRpbyUyMGJyb2FkY2FzdCUyMHZpbnRhZ2UlMjByZXRyb3xlbnwxfHx8fDE3NzMyOTcwOTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    followers: 5621,
    episodes: 42,
    category: 'Câu chuyện',
    isTrending: true,
  },
  {
    id: '5',
    title: 'Tâm Tình Tuổi 20',
    subtitle: 'Những suy nghĩ trẻ trung',
    host: 'Thu Hà',
    hostAvatar: 'https://i.pravatar.cc/100?img=9',
    coverImage:
      'https://images.unsplash.com/photo-1655468289134-bb764181b0e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGhlYWRwaG9uZXMlMjBtdXNpYyUyMGxpc3RlbmluZ3xlbnwxfHx8fDE3NzMyMzUxMDB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    followers: 1876,
    episodes: 8,
    category: 'Tâm sự',
    isNew: true,
  },
  {
    id: '6',
    title: 'Podcast Letter',
    subtitle: 'Những lá thư âm thanh',
    host: 'Văn Anh',
    hostAvatar: 'https://i.pravatar.cc/100?img=8',
    coverImage:
      'https://images.unsplash.com/photo-1764160750138-117c555328c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdG9yeXRlbGxpbmclMjBhdWRpbyUyMG1pY3JvcGhvbmV8ZW58MXx8fHwxNzczMjk3MDk4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    followers: 4234,
    episodes: 31,
    category: 'Tâm sự',
  },
];

function FeaturedPodcast({ podcast, onPress }: { podcast: Podcast; onPress: () => void }) {
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
            <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.featuredStatText}>{podcast.followers.toLocaleString()}</Text>
          </View>

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

function PodcastCard({ podcast, onPress }: { podcast: Podcast; onPress: () => void }) {
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
              <Ionicons name="people-outline" size={12} color="#9CA3AF" />
              <Text style={styles.podcastMetaText}>{podcast.followers.toLocaleString()}</Text>
            </View>

            <View style={styles.podcastMetaInline}>
              <Ionicons name="mic-outline" size={12} color="#9CA3AF" />
              <Text style={styles.podcastMetaText}>{podcast.episodes} tập</Text>
            </View>
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

export default function PodcastScreen() {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedPodcast, setSelectedPodcast] = useState<string | null>(null);

  const filteredPodcasts = useMemo(() => {
    return PODCASTS.filter((podcast) => {
      if (activeCategory === 'Tất cả') return true;
      if (activeCategory === 'Mới nhất') return podcast.isNew;
      if (activeCategory === 'Thịnh hành') return podcast.isTrending;
      return podcast.category === activeCategory;
    });
  }, [activeCategory]);

  const featuredPodcast = useMemo(() => {
    return PODCASTS.find((podcast) => podcast.isTrending) || PODCASTS[0];
  }, []);

  const selectedPodcastData = useMemo(() => {
    if (!selectedPodcast) return undefined;
    return PODCASTS.find((podcast) => podcast.id === selectedPodcast);
  }, [selectedPodcast]);

  if (selectedPodcast) {
    return <PodcastDetailScreen onBack={() => setSelectedPodcast(null)} podcast={selectedPodcastData} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Podcast Letter</Text>
        <TouchableOpacity activeOpacity={0.8} style={styles.headerSearchButton}>
          <Ionicons name="search" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.featuredSection}>
          <View style={styles.featuredSectionTitleRow}>
            <Ionicons name="sparkles" size={18} color="#55C5F1" />
            <Text style={styles.featuredSectionTitle}>Nổi bật hôm nay</Text>
          </View>
          <FeaturedPodcast podcast={featuredPodcast} onPress={() => setSelectedPodcast(featuredPodcast.id)} />
        </View>

        <View style={styles.categoriesWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {CATEGORIES.map((category) => {
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
                <Text style={styles.statsPrimaryValue}>{PODCASTS.length}</Text>
              </View>

              <View style={styles.statsRightBlock}>
                <Text style={styles.statsLabel}>Lượt nghe hôm nay</Text>
                <Text style={styles.statsSecondaryValue}>12.5K</Text>
              </View>

              <View style={styles.statsIconWrap}>
                <Ionicons name="mic" size={24} color="#55C5F1" />
              </View>
            </View>
          </LinearGradient>
        </View>

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
