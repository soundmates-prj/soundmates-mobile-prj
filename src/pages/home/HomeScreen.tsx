import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';

const { width } = Dimensions.get('window');

import {
    blogService,
    favoriteService,
    LiveSessionResult,
    livestreamService,
    PopularPostResponse,
    spotifyService,
    SpotifyTrack,
} from '../../api';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useTheme } from '../../context/ThemeContext';
import BlogScreen from '../blog/BlogScreen';
import { formatTimeAgo } from '../../components/blog/BlogPostCard';
import CreatePostScreen from '../blog/CreatePostScreen';
import PostDetailScreen from '../blog/PostDetailScreen';
import BottomNavigation, { TabName } from '../BottomNavigation';
import PodcastScreen from '../podcast/PodcastScreen';
import SearchResultsScreen, { SearchResultBundle } from '../search/SearchResultsScreen';

// ── Types ──────────────────────────────────────────────
type PlaylistItem = { id: string; title: string; subtitle: string; image: string };
type PodcastItem = { id: string; title: string; host: string; image: string };
type ForumPostItem = {
    id: string; userId: string; userFullName?: string;
    userAvatarUrl?: string; moodTag?: string | null;
    title: string; likes: number; comments: number; time: string;
};
type AppPalette = typeof SoundMateLightColors | typeof SoundMateDarkColors;
interface SearchSuggestionItem {
    id: string; source: 'spotify'; category: 'track';
    title: string; subtitle: string; imageUrl?: string;
}

// ── Constants ──────────────────────────────────────────
const SEARCH_MIN_CHARS = 2;
const TAB_BAR_HEIGHT = 82; // approx nav height with safe area
const HEADER_HEIGHT = 58;

const TOP_HIT_PLAYLISTS: PlaylistItem[] = [
    { id: '1', title: 'V-Pop Hits 2024', subtitle: '2.4M lượt nghe', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400' },
    { id: '2', title: 'Bolero Vàng', subtitle: '1.8M lượt nghe', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400' },
    { id: '3', title: 'Chill Việt Mix', subtitle: '1.5M lượt nghe', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400' },
];

const FEATURED_PLAYLISTS: PlaylistItem[] = [
    { id: '1', title: 'Aethereal Flow', subtitle: 'Celestial Waves', image: 'https://images.unsplash.com/photo-1646542923878-8f478d501a16?w=400' },
    { id: '2', title: 'Skyward Serenade', subtitle: 'Celeste', image: 'https://images.unsplash.com/photo-1769478734130-047e0823f96c?w=400' },
    { id: '3', title: 'Purr-fect Beats', subtitle: 'Luna Paws', image: 'https://images.unsplash.com/photo-1593828772876-58fc75d8ad98?w=400' },
    { id: '4', title: 'Radio Waves', subtitle: 'The Vintage Sound', image: 'https://images.unsplash.com/photo-1772812474654-a94307e5df20?w=400' },
    { id: '5', title: 'Rainy Day Coffee', subtitle: 'Warmth & Wood', image: 'https://images.unsplash.com/photo-1676483489320-534657bdb0f6?w=400' },
];

const PODCASTS: PodcastItem[] = [
    { id: '1', title: 'Chuyện Tình Yêu', host: 'Minh Anh', image: 'https://i.pravatar.cc/200?img=1' },
    { id: '2', title: 'Kỷ Niệm Tuổi Học Trò', host: 'Lan Anh', image: 'https://i.pravatar.cc/200?img=5' },
    { id: '3', title: 'Đời Sống Hằng Ngày', host: 'Hoàng Vy', image: 'https://i.pravatar.cc/200?img=8' },
    { id: '4', title: 'Tâm Sự Đêm Khuya', host: 'Thu Hà', image: 'https://i.pravatar.cc/200?img=9' },
];

// ── Helpers ────────────────────────────────────────────
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
}

// ── Sub-components ─────────────────────────────────────
function SectionHeader({ title, palette, onPressSeeAll }: {
    title: string; palette: AppPalette; onPressSeeAll?: () => void;
}) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{title}</Text>
            {onPressSeeAll && (
                <TouchableOpacity activeOpacity={0.7} onPress={onPressSeeAll} style={styles.seeAllButton}>
                    <Text style={[styles.seeAllText, { color: palette.primary }]}>Xem tất cả</Text>
                    <Ionicons name="chevron-forward" size={14} color={palette.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
}

function PlaylistCard({ item, palette }: { item: PlaylistItem; palette: AppPalette }) {
    return (
        <TouchableOpacity style={styles.playlistCard} activeOpacity={0.9}>
            <View style={styles.playlistImageWrapper}>
                <Image source={{ uri: item.image }} style={styles.playlistImage} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
                <View style={styles.playIconButton}>
                    <Ionicons name="play" size={18} color="#FFFFFF" />
                </View>
            </View>
            <Text style={[styles.playlistTitle, { color: palette.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.playlistSubtitle, { color: palette.textMuted }]} numberOfLines={1}>{item.subtitle}</Text>
        </TouchableOpacity>
    );
}

function PodcastCard({ item, palette }: { item: PodcastItem; palette: AppPalette }) {
    return (
        <TouchableOpacity style={styles.podcastCard} activeOpacity={0.9}>
            <Image source={{ uri: item.image }} style={[styles.podcastImage, { borderColor: palette.border }]} />
            <Text style={[styles.podcastTitle, { color: palette.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.podcastHost, { color: palette.textSecondary }]} numberOfLines={1}>{item.host}</Text>
        </TouchableOpacity>
    );
}

function ForumPost({ post, onPress, palette, isDarkMode }: {
    post: ForumPostItem; onPress?: () => void; palette: AppPalette; isDarkMode: boolean;
}) {
    const displayName = post.userFullName || post.userId.substring(0, 10);
    const avatarUri = post.userAvatarUrl
        || `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1`;

    return (
        <TouchableOpacity
            style={[styles.forumCard, { backgroundColor: palette.surface }]}
            activeOpacity={0.9}
            onPress={onPress}
        >
            <View style={styles.forumAuthorRow}>
                <Image source={{ uri: avatarUri }} style={styles.forumAvatar} />
                <View style={styles.forumAuthorInfo}>
                    <Text style={[styles.forumAuthorName, { color: palette.textPrimary }]}>{displayName}</Text>
                    <Text style={[styles.forumTime, { color: palette.textMuted }]}>{post.time}</Text>
                </View>
                <View style={[styles.forumBadge, { backgroundColor: `${palette.primary}20` }]}>
                    <Text style={[styles.forumBadgeText, { color: palette.primary }]}>#{post.moodTag || 'Trending'}</Text>
                </View>
            </View>
            <Text style={[styles.forumPostTitle, { color: palette.textPrimary }]} numberOfLines={2}>{post.title}</Text>
            <View style={styles.forumActionRow}>
                <View style={styles.forumStat}>
                    <Ionicons name="heart-outline" size={16} color={palette.textMuted} />
                    <Text style={[styles.forumStatText, { color: palette.textMuted }]}>{post.likes}</Text>
                </View>
                <View style={styles.forumStat}>
                    <Ionicons name="chatbubble-outline" size={16} color={palette.textMuted} />
                    <Text style={[styles.forumStatText, { color: palette.textMuted }]}>{post.comments}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ── Props ──────────────────────────────────────────────
interface HomeScreenProps {
    initialTab?: TabName;
    onLogout?: () => void;
    onNavigateToProfile?: () => void;
    onNavigateToLive?: () => void;
}

// ── Main Component ─────────────────────────────────────
export default function HomeScreen({ initialTab = 'home', onLogout, onNavigateToProfile, onNavigateToLive }: HomeScreenProps) {
    const { isDarkMode } = useTheme();
    const { stopAndUnload, isPlaying } = useAudioPlayer();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<TabName>(initialTab);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [communityPosts, setCommunityPosts] = useState<ForumPostItem[]>([]);
    const [isCommunityLoading, setIsCommunityLoading] = useState(false);
    const [activeLiveSession, setActiveLiveSession] = useState<LiveSessionResult | null>(null);
    const [liveSessions, setLiveSessions] = useState<LiveSessionResult[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Search state
    const [showSearchScreen, setShowSearchScreen] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestionItem[]>([]);
    const [searchResultBundle, setSearchResultBundle] = useState<SearchResultBundle | null>(null);
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    const [isSearchingResults, setIsSearchingResults] = useState(false);
    const suggestionRequestIdRef = useRef(0);

    // Animations
    const scrollY = useSharedValue(0);
    const pulseScale = useSharedValue(1);
    const horizontalScrollX = useSharedValue(0);
    const headerTranslateY = useSharedValue(0);
    const lastScrollY = useSharedValue(0);
    const scrollRef = useRef<Animated.ScrollView>(null);

    const pulseAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentY = event.contentOffset.y;
            const diff = currentY - lastScrollY.value;
            
            // Limit hiding when close to top to avoid overlap issues
            if (currentY > 10) {
                const newVal = headerTranslateY.value - diff;
                // -100 is enough to hide even with large status bar
                headerTranslateY.value = Math.max(-100, Math.min(0, newVal)); 
            } else {
                headerTranslateY.value = 0; 
            }
            
            scrollY.value = currentY;
            lastScrollY.value = currentY;
        },
        onBeginDrag: (event) => {
            lastScrollY.value = event.contentOffset.y;
        }
    });

    const horizontalScrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            horizontalScrollX.value = event.contentOffset.x;
        },
    });

    const handleMomentumScrollEnd = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        const tabs: TabName[] = ['home', 'podcast', 'blog'];
        if (tabs[index] && tabs[index] !== activeTab) {
            setActiveTab(tabs[index]);
        }
    };

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: headerTranslateY.value }],
        opacity: interpolate(scrollY.value, [0, 20], [0.95, 1], Extrapolate.CLAMP),
    }));

    // ── Fetch helpers ──────────────────────────────────
    const fetchCommunityPosts = useCallback(async () => {
        setIsCommunityLoading(true);
        try {
            const result = await blogService.getPopularPosts({ page: 1, pageSize: 10 });
            if (result.success && result.data?.items) {
                const mapped = result.data.items.map((post: PopularPostResponse) => ({
                    id: post.id,
                    userId: post.userId,
                    userFullName: post.userFullName,
                    userAvatarUrl: post.userAvatarUrl,
                    moodTag: post.moodTag,
                    title: post.title,
                    likes: post.reactionCount,
                    comments: post.commentCount,
                    time: formatTimeAgo(post.publishedAt || post.createdAt),
                }));
                setCommunityPosts(mapped);
            } else {
                setCommunityPosts([]);
            }
        } catch {
            setCommunityPosts([]);
        } finally {
            setIsCommunityLoading(false);
        }
    }, []);

    const fetchActiveLiveSession = useCallback(async () => {
        try {
            const sessions = await livestreamService.getActiveSessions();
            const liveSession = sessions.find((s) => s.status === 'live' || s.status === 'active') || sessions[0] || null;
            setActiveLiveSession(liveSession);
        } catch {
            setActiveLiveSession(null);
        }
    }, []);

    const fetchLiveSessions = useCallback(async () => {
        try {
            const result = await livestreamService.getLiveSessions({ pageNumber: 1, pageSize: 10 });
            setLiveSessions(result?.items || []);
        } catch {
            setLiveSessions([]);
        }
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([fetchCommunityPosts(), fetchActiveLiveSession(), fetchLiveSessions()]);
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchCommunityPosts, fetchActiveLiveSession, fetchLiveSessions]);

    // ── Search helpers ─────────────────────────────────
    const fetchSearchBundle = useCallback(async (keyword: string, limit: number): Promise<SearchResultBundle> => {
        const res = await spotifyService.search({ q: keyword, type: 'track', limit });
        return { tracks: res.data?.tracks?.items || [] };
    }, []);

    const makeSuggestions = useCallback((bundle: SearchResultBundle): SearchSuggestionItem[] =>
        bundle.tracks.slice(0, 5).map((t) => ({
            id: `track-${t.id}`,
            source: 'spotify' as const,
            category: 'track' as const,
            title: t.name,
            subtitle: t.artists?.map((a) => a.name).join(', ') || '',
            imageUrl: t.album?.images?.[0]?.url,
        })), []);

    const executeSearch = useCallback(async (keyword: string) => {
        const normalized = keyword.trim();
        if (normalized.length < SEARCH_MIN_CHARS) return;
        setIsSearchingResults(true);
        setSearchQuery(normalized);
        setShowSearchResults(true);
        try {
            const bundle = await fetchSearchBundle(normalized, 10);
            setSearchResultBundle(bundle);
        } catch {
            setSearchResultBundle({ tracks: [] });
        } finally {
            setIsSearchingResults(false);
        }
    }, [fetchSearchBundle]);

    const openSearch = useCallback(() => {
        setShowSearchScreen(true);
        setShowSearchResults(false);
        setSearchInput('');
        setSearchQuery('');
        setSearchSuggestions([]);
        setSearchResultBundle(null);
    }, []);

    const closeSearch = useCallback(() => {
        setShowSearchScreen(false);
        setShowSearchResults(false);
        setSearchInput('');
        setSearchQuery('');
        setSearchSuggestions([]);
        setSearchResultBundle(null);
    }, []);

    const handleAddFavoriteTrack = useCallback(async (track: SpotifyTrack) => {
        try {
            await favoriteService.addFavorite({
                itemType: 'track', itemId: track.id, source: 'spotify',
                name: track.name, artistName: track.artists?.map((a) => a.name).join(', ') || '',
                albumName: track.album?.name || '', imgUrl: track.album?.images?.[0]?.url,
                previewUrl: track.preview_url || undefined, rawJson: JSON.stringify(track),
            });
            Alert.alert('Đã thêm yêu thích', 'Bài hát đã được thêm vào mục yêu thích.');
        } catch (error: any) {
            Alert.alert('Không thể thêm', error?.response?.data?.message || 'Vui lòng thử lại.');
        }
    }, []);

    const handleOpenSpotifyLink = useCallback(async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) await Linking.openURL(url);
            else Alert.alert('Không mở được', 'Thiết bị không hỗ trợ liên kết này.');
        } catch {
            Alert.alert('Không mở được', 'Vui lòng thử lại.');
        }
    }, []);

    // ── Effects ────────────────────────────────────────
    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })),
            -1, true,
        );
    }, [pulseScale]);

    useEffect(() => {
        if (initialTab === 'home' || initialTab === 'blog' || initialTab === 'podcast') {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        if (activeTab !== 'home') return;
        fetchCommunityPosts();
        fetchActiveLiveSession();
        fetchLiveSessions();

        const interval = setInterval(() => { fetchActiveLiveSession(); }, 15000);
        return () => clearInterval(interval);
    }, [activeTab, fetchCommunityPosts, fetchActiveLiveSession, fetchLiveSessions]);

    useFocusEffect(useCallback(() => {
        if (activeTab === 'home') fetchCommunityPosts();
    }, [activeTab, fetchCommunityPosts]));

    // Search suggestion debounce
    useEffect(() => {
        if (!showSearchScreen || showSearchResults) return;
        const keyword = searchInput.trim();
        if (keyword.length < SEARCH_MIN_CHARS) {
            setSearchSuggestions([]);
            setIsSearchingSuggestions(false);
            return;
        }

        const reqId = suggestionRequestIdRef.current + 1;
        suggestionRequestIdRef.current = reqId;
        setIsSearchingSuggestions(true);

        const timer = setTimeout(() => {
            void (async () => {
                try {
                    const bundle = await fetchSearchBundle(keyword, 6);
                    if (suggestionRequestIdRef.current !== reqId) return;
                    setSearchSuggestions(makeSuggestions(bundle));
                } catch {
                    if (suggestionRequestIdRef.current === reqId) setSearchSuggestions([]);
                } finally {
                    if (suggestionRequestIdRef.current === reqId) setIsSearchingSuggestions(false);
                }
            })();
        }, 350);

        return () => clearTimeout(timer);
    }, [fetchSearchBundle, makeSuggestions, searchInput, showSearchResults, showSearchScreen]);

    // ── Tab-based Audio Isolation Policy ───────────────
    // If user is not on 'home' tab (Music tab), and they want "only music tab" audio, 
    // we should stop the background audio when they swipe to Blog/Podcast.
    useEffect(() => {
        // Music isolation policy:
        // Background audio should persist on 'home' and 'live' tabs.
        // It should STOP on 'blog', 'podcast', 'profile'.
        const musicFriendlyTabs: TabName[] = ['home', 'live'];
        if (!musicFriendlyTabs.includes(activeTab) && isPlaying) {
            void stopAndUnload();
        }
    }, [activeTab, isPlaying, stopAndUnload]);

    const handleTabPress = (tab: TabName) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (tab === 'profile') { onNavigateToProfile?.(); return; }
        if (tab === 'live') { onNavigateToLive?.(); return; }

        setActiveTab(tab);
        const tabs: TabName[] = ['home', 'podcast', 'blog'];
        const index = tabs.indexOf(tab);
        if (index !== -1 && scrollRef.current) {
            scrollRef.current.scrollTo({ x: index * width, animated: true });
        }
    };

    useEffect(() => {
        const tabs: TabName[] = ['home', 'podcast', 'blog'];
        const index = tabs.indexOf(activeTab);
        if (index !== -1 && scrollRef.current) {
            scrollRef.current.scrollTo({ x: index * width, animated: false });
        }
    }, []);

    const handleLivePress = () => {
        onNavigateToLive?.();
    };

    // ── Live banner data ───────────────────────────────
    const bannerTitle = activeLiveSession?.sessionName || 'Phiên Live Cộng Đồng';
    const bannerGenre = activeLiveSession?.genre || 'Live Music';
    const bannerListeners = activeLiveSession?.listenersCount ?? 0;
    const isSessionLive = activeLiveSession?.status === 'live' || activeLiveSession?.status === 'active';
    const bannerThumbnail = activeLiveSession?.thumbnailUrl;

    // ── Bottom inset padding ───────────────────────────
    const navBarHeight = TAB_BAR_HEIGHT + (insets.bottom > 0 ? 0 : 8);

    // ── Render ─────────────────────────────────────────
    return (
        <View style={[styles.root, { backgroundColor: palette.background }]}>
            {showSearchScreen ? (
                // ── Search Screen ───────────────────────
                <View style={[styles.fill, { backgroundColor: palette.background }]}>
                    <View style={[styles.searchHeader, { paddingTop: insets.top + 8, backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
                        <TouchableOpacity style={styles.searchBackBtn} onPress={closeSearch} activeOpacity={0.8}>
                            <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
                        </TouchableOpacity>
                        <View style={[styles.searchInputWrap, { backgroundColor: isDarkMode ? '#111827' : '#F1F5F9', borderColor: palette.border }]}>
                            <Ionicons name="search" size={16} color={palette.textSecondary} />
                            <TextInput
                                value={searchInput}
                                onChangeText={setSearchInput}
                                style={[styles.searchInput, { color: palette.textPrimary }]}
                                placeholder="Tìm bài hát, podcast, blog..."
                                placeholderTextColor={palette.textMuted}
                                autoFocus
                                returnKeyType="search"
                                onSubmitEditing={() => void executeSearch(searchInput)}
                            />
                            {!!searchInput && (
                                <TouchableOpacity onPress={() => { setSearchInput(''); setSearchSuggestions([]); }}>
                                    <Ionicons name="close-circle" size={18} color={palette.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.searchGoBtn, { backgroundColor: palette.primary }]}
                            onPress={() => void executeSearch(searchInput)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.searchGoText}>Tìm</Text>
                        </TouchableOpacity>
                    </View>

                    {!showSearchResults ? (
                        <Animated.ScrollView contentContainerStyle={styles.searchBody} keyboardShouldPersistTaps="handled">
                            {isSearchingSuggestions ? (
                                <View style={styles.searchLoading}>
                                    <ActivityIndicator size="small" color={palette.primary} />
                                    <Text style={[styles.searchHint, { color: palette.textSecondary }]}>Đang tìm kiếm...</Text>
                                </View>
                            ) : (
                                searchSuggestions.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.suggestionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                                        activeOpacity={0.85}
                                        onPress={() => { setSearchInput(item.title); void executeSearch(item.title); }}
                                    >
                                        {item.imageUrl ? (
                                            <Image source={{ uri: item.imageUrl }} style={styles.suggestionImg} />
                                        ) : (
                                            <View style={[styles.suggestionImgFallback, { backgroundColor: isDarkMode ? '#1F2937' : '#E2E8F0' }]}>
                                                <Ionicons name="musical-notes-outline" size={16} color={palette.textSecondary} />
                                            </View>
                                        )}
                                        <View style={styles.suggestionInfo}>
                                            <Text numberOfLines={1} style={[styles.suggestionTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                                            <Text numberOfLines={1} style={[styles.suggestionSub, { color: palette.textSecondary }]}>{item.subtitle}</Text>
                                        </View>
                                        <View style={[styles.suggestionTag, { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' }]}>
                                            <Text style={[styles.suggestionTagText, { color: isDarkMode ? '#BFDBFE' : '#1D4ED8' }]}>{item.source}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </Animated.ScrollView>
                    ) : (
                        <SearchResultsScreen
                            query={searchQuery}
                            data={searchResultBundle}
                            isLoading={isSearchingResults}
                            onBackToSuggestions={() => setShowSearchResults(false)}
                            onOpenSpotifyLink={handleOpenSpotifyLink}
                            onAddFavoriteTrack={handleAddFavoriteTrack}
                        />
                    )}
                </View>
            ) : selectedPostId ? (
                <PostDetailScreen postId={selectedPostId} onBack={() => setSelectedPostId(null)} />
            ) : showCreatePost ? (
                <CreatePostScreen onBack={() => setShowCreatePost(false)} onPostCreated={() => setShowCreatePost(false)} />
            ) : (
                <>
                    {/* ── Sticky Header ──────────────────────────────── */}
                    <Animated.View style={[styles.header, { paddingTop: insets.top }, headerAnimatedStyle]}>
                        <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, { 
                            opacity: interpolate(scrollY.value, [0, 30], [0, 1], Extrapolate.CLAMP) 
                        }]}>
                            <BlurView intensity={90} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                            <View style={[styles.headerBorder, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]} />
                        </Animated.View>
                        <View style={styles.headerContent}>
                            <View style={styles.brandRow}>
                                <Image source={require('../../../assets/logo_notext.png')} style={styles.brandLogo} />
                                <Text style={[styles.brandName, { color: palette.textPrimary }]}>SoundMates</Text>
                            </View>
                            <View style={styles.headerActions}>
                                <TouchableOpacity style={[styles.headerBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} onPress={openSearch} activeOpacity={0.7}>
                                    <Ionicons name="search" size={19} color={palette.textPrimary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.headerBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} activeOpacity={0.7}>
                                    <Ionicons name="notifications-outline" size={19} color={palette.textPrimary} />
                                    <View style={styles.notifDot} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Horizontal Paging Content ─────────────────── */}
                    <Animated.ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={horizontalScrollHandler}
                        onMomentumScrollEnd={handleMomentumScrollEnd}
                        scrollEventThrottle={16}
                        style={styles.horizontalPager}
                    >
                        {/* Tab 1: Home */}
                        <View style={styles.tabPage}>
                            <Animated.ScrollView
                                onScroll={scrollHandler}
                                scrollEventThrottle={16}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={[
                                    styles.scrollContent,
                                    { paddingTop: HEADER_HEIGHT + insets.top, paddingBottom: navBarHeight },
                                ]}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={isRefreshing}
                                        onRefresh={() => void handleRefresh()}
                                        progressViewOffset={HEADER_HEIGHT + insets.top}
                                        colors={[palette.primary]}
                                        tintColor={palette.primary}
                                    />
                                }
                            >
                                {/* Greeting */}
                                <View style={styles.greeting}>
                                    <Text style={[styles.greetingLabel, { color: palette.textMuted }]}>{getGreeting()} 👋</Text>
                                    <Text style={[styles.greetingTitle, { color: palette.textPrimary }]}>Âm nhạc hôm nay thế nào?</Text>
                                </View>

                                {/* Live Banner */}
                                <TouchableOpacity activeOpacity={0.92} onPress={handleLivePress} style={styles.bannerWrapper}>
                                    <LinearGradient
                                        colors={['#667EEA', '#764BA2', '#F093FB']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={styles.banner}
                                    >
                                        {bannerThumbnail && (
                                            <Image source={{ uri: bannerThumbnail }} style={styles.bannerBgImage} blurRadius={2} />
                                        )}
                                        <LinearGradient
                                            colors={['rgba(102,126,234,0.85)', 'rgba(118,75,162,0.92)']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={styles.bannerContent}>
                                            <Animated.View style={[styles.statusPill, pulseAnimatedStyle]}>
                                                <View style={[styles.statusDot, { backgroundColor: isSessionLive ? '#FF4B2B' : '#9CA3AF' }]} />
                                                <Text style={styles.statusLabel}>
                                                    {isSessionLive ? 'ĐANG LIVE' : activeLiveSession ? 'SẮP TỚI' : 'KÊNH NHẠC'}
                                                </Text>
                                            </Animated.View>
                                            <Text style={styles.bannerTitle} numberOfLines={2}>{bannerTitle}</Text>
                                            <View style={styles.bannerMeta}>
                                                <View style={styles.bannerGenrePill}>
                                                    <Ionicons name="musical-note" size={12} color="rgba(255,255,255,0.9)" />
                                                    <Text style={styles.bannerGenreText}>{bannerGenre}</Text>
                                                </View>
                                                <View style={styles.bannerListenerBadge}>
                                                    <Ionicons name="headset" size={13} color="#FFF" />
                                                    <Text style={styles.bannerListenerText}>{bannerListeners} đang nghe</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <Image source={require('../../../assets/logo_notext.png')} style={styles.bannerLogo} />
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Active Live Sessions Discovery */}
                                {liveSessions.length > 0 && (
                                    <View style={styles.section}>
                                        <SectionHeader title="Phiên Live Đang Diễn Ra 🎙️" palette={palette} onPressSeeAll={handleLivePress} />
                                        <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                                            {liveSessions.map((session) => (
                                                <TouchableOpacity
                                                    key={session.id}
                                                    style={[styles.liveDiscoveryCard, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                                                    activeOpacity={0.85}
                                                    onPress={handleLivePress}
                                                >
                                                    <Image 
                                                        source={{ uri: session.thumbnailUrl || 'https://i.pravatar.cc/200?img=12' }} 
                                                        style={styles.liveDiscoveryThumb} 
                                                    />
                                                    <LinearGradient
                                                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                                                        style={StyleSheet.absoluteFill}
                                                    />
                                                    <View style={styles.liveDiscoveryOverlay}>
                                                        <View style={styles.liveStatusRow}>
                                                            <View style={styles.liveIndicator}>
                                                                <View style={styles.liveDot} />
                                                                <Text style={styles.liveText}>LIVE</Text>
                                                            </View>
                                                            <View style={styles.liveListenerPill}>
                                                                <Ionicons name="people" size={10} color="#FFF" />
                                                                <Text style={styles.liveListenerText}>{session.listenersCount || 0}</Text>
                                                            </View>
                                                        </View>
                                                        <Text style={styles.liveDiscoveryTitle} numberOfLines={2}>
                                                            {session.sessionName || session.stationName}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </Animated.ScrollView>
                                    </View>
                                )}

                                {/* Rest of Home content... */}
                                <View style={styles.section}>
                                    <SectionHeader title="Top Playlist Live 🔥" palette={palette} />
                                    <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
                                        {TOP_HIT_PLAYLISTS.map((item) => (
                                            <PlaylistCard key={item.id} item={item} palette={palette} />
                                        ))}
                                    </Animated.ScrollView>
                                </View>

                                <View style={styles.section}>
                                    <SectionHeader title="Cộng đồng 💬" palette={palette} onPressSeeAll={() => handleTabPress('blog')} />
                                    <View style={styles.forumList}>
                                        {communityPosts.slice(0, 3).map((post) => (
                                            <ForumPost
                                                key={post.id}
                                                post={post}
                                                palette={palette}
                                                isDarkMode={isDarkMode}
                                                onPress={() => setSelectedPostId(post.id)}
                                            />
                                        ))}
                                    </View>
                                </View>
                            </Animated.ScrollView>
                        </View>

                        {/* Tab 2: Podcast */}
                        <View style={styles.tabPage}>
                            <PodcastScreen 
                                paddingTop={HEADER_HEIGHT + insets.top} 
                                paddingBottom={navBarHeight} 
                                hideStickyHeader={true}
                                onScroll={scrollHandler}
                            />
                        </View>

                        {/* Tab 3: Blog */}
                        <View style={styles.tabPage}>
                            <BlogScreen
                                paddingTop={HEADER_HEIGHT + insets.top}
                                paddingBottom={navBarHeight}
                                hideStickyHeader={true}
                                onNavigateToCreatePost={() => setShowCreatePost(true)}
                                onNavigateToPostDetail={(id) => setSelectedPostId(id)}
                                onScroll={scrollHandler}
                            />
                        </View>
                    </Animated.ScrollView>

                    {/* ── Tab Navigation ────────────────────────────── */}
                    <BottomNavigation
                        activeTab={activeTab}
                        onTabPress={handleTabPress}
                        onLogout={onLogout}
                    />
                </>
            )}
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1 },
    fill: { flex: 1 },

    // Header
    header: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    headerBorder: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: StyleSheet.hairlineWidth,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brandLogo: { width: 30, height: 30 },
    brandName: { fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    notifDot: {
        position: 'absolute', top: 9, right: 9,
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: '#FF4B2B', borderWidth: 1.5, borderColor: '#FFF',
    },

    // Scroll
    scrollContent: { paddingHorizontal: 0 },

    // Greeting
    greeting: { paddingHorizontal: 20, marginBottom: 12 },
    greetingLabel: { fontSize: 12, fontWeight: '500', marginBottom: 1 },
    greetingTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

    // Live Banner
    bannerWrapper: { paddingHorizontal: 20, marginBottom: 32 },
    banner: { borderRadius: 24, height: 190, overflow: 'hidden', justifyContent: 'flex-end' },
    bannerBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    bannerContent: { padding: 20, zIndex: 1 },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20, marginBottom: 10,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
    bannerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 12 },
    bannerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bannerGenrePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    },
    bannerGenreText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },
    bannerListenerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(0,0,0,0.25)',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    },
    bannerListenerText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    bannerLogo: {
        position: 'absolute', right: -24, top: -24,
        width: 130, height: 130, opacity: 0.08,
    },

    // Sections
    section: { marginBottom: 28 },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, marginBottom: 12,
    },
    sectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
    seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    seeAllText: { fontSize: 13, fontWeight: '600' },
    hList: { paddingLeft: 20, paddingRight: 10 },

    // Playlist Card
    playlistCard: { width: 155, marginRight: 14 },
    playlistImageWrapper: { width: 155, height: 155, borderRadius: 20, overflow: 'hidden', marginBottom: 9 },
    playlistImage: { width: '100%', height: '100%' },
    playIconButton: {
        position: 'absolute', right: 8, bottom: 8,
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
    },
    playlistTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2, paddingHorizontal: 2 },
    playlistSubtitle: { fontSize: 12, fontWeight: '500', paddingHorizontal: 2 },

    // Podcast Card
    podcastCard: { width: 130, alignItems: 'center', marginRight: 14 },
    podcastImage: { width: 110, height: 110, borderRadius: 22, borderWidth: 2, marginBottom: 8 },
    podcastTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
    podcastHost: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

    // Community
    communitySection: { paddingHorizontal: 20, marginBottom: 16 },
    forumList: { gap: 12, marginTop: 4 },
    forumCard: { borderRadius: 20, padding: 18 },
    forumAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    forumAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
    forumAuthorInfo: { flex: 1 },
    forumAuthorName: { fontSize: 14, fontWeight: '700' },
    forumTime: { fontSize: 11, marginTop: 1 },
    forumBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    forumBadgeText: { fontSize: 10, fontWeight: '800' },
    forumPostTitle: { fontSize: 16, fontWeight: '700', lineHeight: 23, marginBottom: 12 },
    forumActionRow: { flexDirection: 'row', gap: 14 },
    forumStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    forumStatText: { fontSize: 13, fontWeight: '600' },
    emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 20 },

    // Live discovery cards
    liveDiscoveryCard: {
        width: 160,
        height: 160,
        marginRight: 14,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1.5,
    },
    liveDiscoveryThumb: {
        width: '100%',
        height: '100%',
    },
    liveDiscoveryOverlay: {
        ...StyleSheet.absoluteFillObject,
        padding: 12,
        justifyContent: 'space-between',
    },
    liveStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FFF',
    },
    liveText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: '900',
    },
    liveListenerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    liveListenerText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '700',
    },
    liveDiscoveryTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    },

    // Search
    searchHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    searchBackBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    searchInputWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 10, height: 40, gap: 6,
    },
    searchInput: { flex: 1, fontSize: 14 },
    searchGoBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    searchGoText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    searchBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 80 },
    searchLoading: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    searchHint: { fontSize: 13 },
    suggestionCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
        padding: 10, marginBottom: 8,
    },
    suggestionImg: { width: 42, height: 42, borderRadius: 10, marginRight: 10 },
    suggestionImgFallback: {
        width: 42, height: 42, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    suggestionInfo: { flex: 1 },
    suggestionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    suggestionSub: { fontSize: 12 },
    suggestionTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    suggestionTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    horizontalPager: { flex: 1 },
    tabPage: { width: width, height: '100%' },
});
