import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
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
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 120;
import {
    blogService,
    favoriteService,
    livestreamService,
    NowPlayingData,
    PopularPostResponse,
    spotifyService,
    SpotifyTrack
} from '../../api';
import { useTheme } from '../../context/ThemeContext';
import BlogScreen from '../blog/BlogScreen';
import { formatTimeAgo } from '../../components/blog/BlogPostCard';
import CreatePostScreen from '../blog/CreatePostScreen';
import PostDetailScreen from '../blog/PostDetailScreen';
import BottomNavigation, { TabName } from '../BottomNavigation';
import PodcastScreen from '../podcast/PodcastScreen';
import SearchResultsScreen, { SearchResultBundle } from '../search/SearchResultsScreen';

type PlaylistItem = {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    plays?: number;
};

type PodcastItem = {
    id: string;
    title: string;
    host: string;
    image: string;
};

type ForumPostItem = {
    id: string;
    userId: string;
    moodTag?: string | null;
    title: string;
    likes: number;
    comments: number;
    time: string;
};

type AppPalette = typeof SoundMateLightColors | typeof SoundMateDarkColors;

interface SearchSuggestionItem {
    id: string;
    source: 'spotify';
    category: 'track';
    title: string;
    subtitle: string;
    imageUrl?: string;
}

const SEARCH_MIN_CHARS = 2;

const PLAYLISTS: PlaylistItem[] = [
    {
        id: '1',
        title: 'Aethereal Flow',
        subtitle: 'Celestial Waves',
        image: 'https://images.unsplash.com/photo-1646542923878-8f478d501a16?w=400',
    },
    {
        id: '2',
        title: 'Skyward Serenade',
        subtitle: 'Celeste',
        image: 'https://images.unsplash.com/photo-1769478734130-047e0823f96c?w=400',
    },
    {
        id: '3',
        title: 'Purr-fect Beats',
        subtitle: 'Luna Paws',
        image: 'https://images.unsplash.com/photo-1593828772876-58fc75d8ad98?w=400',
    },
    {
        id: '4',
        title: 'Radio Waves',
        subtitle: 'The Vintage Sound',
        image: 'https://images.unsplash.com/photo-1772812474654-a94307e5df20?w=400',
    },
    {
        id: '5',
        title: 'Rainy Day Coffee',
        subtitle: 'Warmth & Wood',
        image: 'https://images.unsplash.com/photo-1676483489320-534657bdb0f6?w=400',
    },
];

const TOP_HIT_PLAYLISTS: PlaylistItem[] = [
    {
        id: '1',
        title: 'V-Pop Hits 2024',
        subtitle: '2.4M lượt nghe',
        image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
        plays: 2400000,
    },
    {
        id: '2',
        title: 'Bolero Vàng',
        subtitle: '1.8M lượt nghe',
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
        plays: 1800000,
    },
    {
        id: '3',
        title: 'Chill Việt Mix',
        subtitle: '1.5M lượt nghe',
        image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
        plays: 1500000,
    },
];

const PODCASTS: PodcastItem[] = [
    { id: '1', title: 'Chuyện Tình Yêu', host: 'Minh Anh', image: 'https://i.pravatar.cc/200?img=1' },
    { id: '2', title: 'Kỷ Niệm Tuổi Học Trò', host: 'Lan Anh', image: 'https://i.pravatar.cc/200?img=5' },
    { id: '3', title: 'Đời Sống Hằng Ngày', host: 'Hoàng Vy', image: 'https://i.pravatar.cc/200?img=8' },
    { id: '4', title: 'Tâm Sự Đêm Khuya', host: 'Thu Hà', image: 'https://i.pravatar.cc/200?img=9' },
];

interface HomeScreenProps {
    initialTab?: TabName;
    onLogout?: () => void;
    onNavigateToProfile?: () => void;
    onNavigateToLive?: () => void;
}

interface SectionHeaderProps {
    title: string;
    titleColor?: string;
    onPressSeeAll?: () => void;
}

function SectionHeader({ title, titleColor, onPressSeeAll, palette }: { title: string; titleColor?: string; onPressSeeAll?: () => void; palette: AppPalette }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: titleColor || palette.textPrimary }]}>{title}</Text>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPressSeeAll}
                style={styles.seeAllButton}
            >
                <Text style={[styles.seeAllText, { color: palette.primary }]}>Xem tất cả</Text>
                <Ionicons name="chevron-forward" size={14} color={palette.primary} />
            </TouchableOpacity>
        </View>
    );
}

function PlaylistCard({ item, palette }: { item: PlaylistItem; palette: AppPalette }) {
    return (
        <TouchableOpacity style={styles.playlistCard} activeOpacity={0.9}>
            <View style={styles.playlistImageWrapper}>
                <Image source={{ uri: item.image }} style={styles.playlistImage} />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={styles.playlistOverlay}
                />
                <View style={styles.playIconButton}>
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                </View>
            </View>
            <View style={styles.playlistInfo}>
                <Text style={[styles.playlistTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={[styles.playlistSubtitle, { color: palette.textMuted }]} numberOfLines={1}>
                    {item.subtitle}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

function PodcastCard({ item, palette }: { item: PodcastItem; palette: AppPalette }) {
    return (
        <TouchableOpacity style={styles.podcastCard} activeOpacity={0.9}>
            <View style={[styles.podcastImageFrame, { borderColor: palette.surface, backgroundColor: palette.surfaceLight }]}>
                <Image source={{ uri: item.image }} style={styles.podcastImage} />
            </View>
            <Text style={[styles.podcastTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                {item.title}
            </Text>
            <Text style={[styles.podcastHost, { color: palette.textSecondary }]} numberOfLines={1}>
                {item.host}
            </Text>
        </TouchableOpacity>
    );
}

function ForumPost({
    post,
    onPress,
    palette,
    isDarkMode,
}: {
    post: ForumPostItem;
    onPress?: () => void;
    palette: AppPalette;
    isDarkMode: boolean;
}) {
    return (
        <TouchableOpacity
            style={[styles.forumCard, { backgroundColor: palette.surface }]}
            activeOpacity={0.9}
            onPress={onPress}
        >
            <View style={styles.forumAuthorRow}>
                <Image
                    source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1` }}
                    style={styles.forumAvatar}
                />
                <View style={styles.forumAuthorInfo}>
                    <Text style={[styles.forumAuthorName, { color: palette.textPrimary }]}>{post.userId.substring(0, 8)}</Text>
                    <Text style={[styles.forumTime, { color: palette.textMuted }]}>{post.time} trước</Text>
                </View>
                <View style={[styles.forumBadge, { backgroundColor: palette.primary + '20' }]}>
                    <Text style={[styles.forumBadgeText, { color: palette.primary }]}>#{post.moodTag || 'Trending'}</Text>
                </View>
            </View>

            <Text style={[styles.forumPostTitle, { color: palette.textPrimary }]} numberOfLines={2}>
                {post.title}
            </Text>

            <View style={styles.forumActionRow}>
                <View style={styles.forumStat}>
                    <Ionicons name="heart-outline" size={18} color={palette.textMuted} />
                    <Text style={[styles.forumStatText, { color: palette.textMuted }]}>{post.likes}</Text>
                </View>
                <View style={styles.forumStat}>
                    <Ionicons name="chatbubble-outline" size={18} color={palette.textMuted} />
                    <Text style={[styles.forumStatText, { color: palette.textMuted }]}>{post.comments}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function HomeScreen({ initialTab = 'home', onLogout, onNavigateToProfile, onNavigateToLive }: HomeScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
    const [activeTab, setActiveTab] = useState<TabName>(initialTab);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [communityPosts, setCommunityPosts] = useState<ForumPostItem[]>([]);
    const [isCommunityLoading, setIsCommunityLoading] = useState(false);
    const [liveBannerData, setLiveBannerData] = useState<NowPlayingData | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSearchScreen, setShowSearchScreen] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestionItem[]>([]);
    const [searchResultBundle, setSearchResultBundle] = useState<SearchResultBundle | null>(null);
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    const [isSearchingResults, setIsSearchingResults] = useState(false);
    const suggestionRequestIdRef = useRef(0);

    // Animation values
    const scrollY = useSharedValue(0);
    const pulseScale = useSharedValue(1);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, 50], [0, 1], Extrapolate.CLAMP);
        return { opacity };
    });

    const brandAnimatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(scrollY.value, [-50, 0, 100], [1.1, 1, 0.9], Extrapolate.CLAMP);
        return { transform: [{ scale }] };
    });

    const handleOpenSpotifyLink = useCallback(async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (!canOpen) {
                Alert.alert('Khong mo duoc link', 'Thiet bi khong ho tro mo lien ket Spotify nay.');
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            console.log('[HomeScreen] handleOpenSpotifyLink error:', error);
            Alert.alert('Khong mo duoc link', 'Vui long thu lai sau.');
        }
    }, []);

    const fetchSearchBundle = useCallback(async (keyword: string, limit: number): Promise<SearchResultBundle> => {
        const spotifyRes = await spotifyService.search({ q: keyword, type: 'track', limit });

        return {
            tracks: spotifyRes.data?.tracks?.items || [],
        };
    }, []);

    const makeSuggestions = useCallback((bundle: SearchResultBundle): SearchSuggestionItem[] => {
        const fromTracks: SearchSuggestionItem[] = bundle.tracks.slice(0, 3).map((track) => ({
            id: `track-${track.id}`,
            source: 'spotify',
            category: 'track',
            title: track.name,
            subtitle: track.artists?.map((artist) => artist.name).join(', ') || 'Spotify Track',
            imageUrl: track.album?.images?.[0]?.url,
        }));

        return fromTracks.slice(0, 10);
    }, []);

    const executeSearch = useCallback(async (keyword: string) => {
        const normalized = keyword.trim();
        if (normalized.length < SEARCH_MIN_CHARS) {
            return;
        }

        setIsSearchingResults(true);
        setSearchQuery(normalized);
        setShowSearchResults(true);

        try {
            const bundle = await fetchSearchBundle(normalized, 10);
            setSearchResultBundle(bundle);
        } catch (error) {
            console.log('[HomeScreen] executeSearch error:', error);
            setSearchResultBundle({
                tracks: [],
            });
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
            const result = await favoriteService.addFavorite({
                itemType: 'track',
                itemId: track.id,
                source: 'spotify',
                name: track.name,
                artistName: track.artists?.map((artist) => artist.name).join(', ') || '',
                albumName: track.album?.name || '',
                imgUrl: track.album?.images?.[0]?.url,
                previewUrl: track.preview_url || undefined,
                rawJson: JSON.stringify(track),
            });

            Alert.alert('Da them ua thich', result.message || 'Ban da them bai hat vao muc ua thich.');
        } catch (error: any) {
            console.log('[HomeScreen] handleAddFavoriteTrack error:', error);
            Alert.alert('Khong the them ua thich', error?.response?.data?.message || 'Vui long thu lai sau.');
        }
    }, []);

    const handleSubmitSearch = useCallback(() => {
        void executeSearch(searchInput);
    }, [executeSearch, searchInput]);

    const handleSuggestionPress = useCallback((item: SearchSuggestionItem) => {
        setSearchInput(item.title);
        void executeSearch(item.title);
    }, [executeSearch]);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            true
        );
    }, [pulseScale]);

    useEffect(() => {
        if (initialTab === 'home' || initialTab === 'blog' || initialTab === 'podcast') {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        if (!showSearchScreen || showSearchResults) {
            return;
        }

        const keyword = searchInput.trim();
        if (keyword.length < SEARCH_MIN_CHARS) {
            setSearchSuggestions([]);
            setIsSearchingSuggestions(false);
            return;
        }

        const requestId = suggestionRequestIdRef.current + 1;
        suggestionRequestIdRef.current = requestId;
        setIsSearchingSuggestions(true);

        const timer = setTimeout(() => {
            void (async () => {
                try {
                    const bundle = await fetchSearchBundle(keyword, 6);
                    if (suggestionRequestIdRef.current !== requestId) {
                        return;
                    }

                    setSearchSuggestions(makeSuggestions(bundle));
                } catch (error) {
                    if (suggestionRequestIdRef.current !== requestId) {
                        return;
                    }

                    console.log('[HomeScreen] suggestion search error:', error);
                    setSearchSuggestions([]);
                } finally {
                    if (suggestionRequestIdRef.current === requestId) {
                        setIsSearchingSuggestions(false);
                    }
                }
            })();
        }, 350);

        return () => {
            clearTimeout(timer);
        };
    }, [fetchSearchBundle, makeSuggestions, searchInput, showSearchResults, showSearchScreen]);

    const handleTabPress = (tab: TabName) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);

        if (tab === 'profile') {
            onNavigateToProfile?.();
            return;
        }

        if (tab === 'live') {
            onNavigateToLive?.();
        }
    };

    const handleLivePress = () => {
        setActiveTab('live');
        onNavigateToLive?.();
    };

    const fetchCommunityPosts = useCallback(async () => {
        setIsCommunityLoading(true);
        try {
            const result = await blogService.getPopularPosts({ page: 1, pageSize: 10 });
            if (result.success && result.data?.items) {
                const mappedPosts = result.data.items.map((post: PopularPostResponse) => ({
                    id: post.id,
                    userId: post.userId,
                    moodTag: post.moodTag,
                    title: post.title,
                    likes: post.reactionCount,
                    comments: post.commentCount,
                    time: formatTimeAgo(post.publishedAt || post.createdAt),
                }));
                setCommunityPosts(mappedPosts);
            } else {
                setCommunityPosts([]);
            }
        } catch (error) {
            console.log('[HomeScreen] fetchCommunityPosts error:', error);
            setCommunityPosts([]);
        } finally {
            setIsCommunityLoading(false);
        }
    }, []);

    const fetchLiveBannerData = useCallback(async () => {
        try {
            const data = await livestreamService.getNowPlaying();
            setLiveBannerData(data);
        } catch (error) {
            console.log('[HomeScreen] fetchLiveBannerData error:', error);
            setLiveBannerData(null);
        }
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([fetchCommunityPosts(), fetchLiveBannerData()]);
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchCommunityPosts, fetchLiveBannerData]);

    useEffect(() => {
        if (activeTab === 'home') {
            fetchCommunityPosts();
            fetchLiveBannerData();
        }

        const intervalId = setInterval(() => {
            if (activeTab === 'home') {
                fetchLiveBannerData();
            }
        }, 10000);

        return () => clearInterval(intervalId);
    }, [activeTab, fetchCommunityPosts, fetchLiveBannerData]);

    const liveBannerTitle = liveBannerData?.stationName || 'Đêm nhạc bolero học';
    const liveBannerHost = liveBannerData?.streamerName || 'Emily_vui';
    const liveBannerListeners = liveBannerData?.totalListeners ?? 256;
    const isLiveNow = liveBannerData
        ? liveBannerData.isLive || liveBannerData.isOnline
        : true;

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            {showSearchScreen ? (
                <View style={[styles.searchScreen, { backgroundColor: palette.background }]}>
                    <View style={[styles.searchHeader, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}>
                        <TouchableOpacity activeOpacity={0.8} style={styles.searchBackButton} onPress={closeSearch}>
                            <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
                        </TouchableOpacity>

                        <View style={[styles.searchInputWrap, { borderColor: palette.border, backgroundColor: isDarkMode ? '#111827' : '#F8FAFC' }]}>
                            <Ionicons name="search" size={16} color={palette.textSecondary} />
                            <TextInput
                                value={searchInput}
                                onChangeText={setSearchInput}
                                style={[styles.searchInput, { color: palette.textPrimary }]}
                                placeholder="Tim Spotify, podcast, blog..."
                                placeholderTextColor={palette.textMuted}
                                autoFocus
                                returnKeyType="search"
                                onSubmitEditing={handleSubmitSearch}
                            />
                            {!!searchInput && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setSearchInput('');
                                        setSearchSuggestions([]);
                                    }}
                                >
                                    <Ionicons name="close-circle" size={18} color={palette.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.searchGoButton, { backgroundColor: palette.primary }]}
                            onPress={handleSubmitSearch}
                        >
                            <Text style={styles.searchGoText}>Tim</Text>
                        </TouchableOpacity>
                    </View>

                    {!showSearchResults ? (
                        <ScrollView contentContainerStyle={styles.searchBodyContent} keyboardShouldPersistTaps="handled">
                            {isSearchingSuggestions ? (
                                <View style={styles.searchLoadingBlock}>
                                    <ActivityIndicator size="small" color={palette.primary} />
                                    <Text style={[styles.searchHintText, { color: palette.textSecondary }]}>Đang tìm kiếm...</Text>
                                </View>
                            ) : (
                                searchSuggestions.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        activeOpacity={0.85}
                                        style={[styles.suggestionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                                        onPress={() => handleSuggestionPress(item)}
                                    >
                                        {item.imageUrl ? (
                                            <Image source={{ uri: item.imageUrl }} style={styles.suggestionImage} />
                                        ) : (
                                            <View style={[styles.suggestionImageFallback, { backgroundColor: isDarkMode ? '#1F2937' : '#E2E8F0' }]}>
                                                <Ionicons name="musical-notes-outline" size={16} color={palette.textSecondary} />
                                            </View>
                                        )}

                                        <View style={styles.suggestionInfo}>
                                            <Text numberOfLines={1} style={[styles.suggestionTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                                            <Text numberOfLines={1} style={[styles.suggestionSubtitle, { color: palette.textSecondary }]}>{item.subtitle}</Text>
                                        </View>

                                        <View style={[styles.suggestionTag, { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' }]}>
                                            <Text style={[styles.suggestionTagText, { color: isDarkMode ? '#BFDBFE' : '#1D4ED8' }]}>{item.source}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
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
                <PostDetailScreen
                    postId={selectedPostId}
                    onBack={() => setSelectedPostId(null)}
                />
            ) : showCreatePost ? (
                <CreatePostScreen
                    onBack={() => setShowCreatePost(false)}
                    onPostCreated={() => setShowCreatePost(false)}
                />
            ) : (
                <>
                    {/* Custom Modern Header */}
                    <View style={styles.headerContainer}>
                        <Animated.View style={[StyleSheet.absoluteFill, headerAnimatedStyle, { overflow: 'hidden' }]}>
                            <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        </Animated.View>
                        <View style={styles.topBar}>
                            <Animated.View style={[styles.brandWrapper, brandAnimatedStyle]}>
                                <Image source={require('../../../assets/logo_notext.png')} style={styles.brandLogoIcon} />
                                <Text style={[styles.brandText, { color: palette.textPrimary }]}>SoundMates</Text>
                            </Animated.View>
                            <View style={styles.headerIcons}>
                                <TouchableOpacity style={[styles.iconButton, { backgroundColor: palette.surface }]} onPress={openSearch}>
                                    <Ionicons name="search" size={20} color={palette.textPrimary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.iconButton, { backgroundColor: palette.surface }]}>
                                    <Ionicons name="notifications-outline" size={20} color={palette.textPrimary} />
                                    <View style={styles.notifBadge} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <Animated.ScrollView
                        onScroll={scrollHandler}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={() => void handleRefresh()}
                                colors={[palette.primary]}
                                tintColor={palette.primary}
                            />
                        }
                    >
                        {activeTab === 'blog' ? (
                            <BlogScreen
                                onNavigateToCreatePost={() => setShowCreatePost(true)}
                                onNavigateToPostDetail={(id) => setSelectedPostId(id)}
                            />
                        ) : activeTab === 'podcast' ? (
                            <PodcastScreen />
                        ) : (
                            <>
                                {/* Greetings */}
                                <View style={styles.greetingSection}>
                                    <Text style={[styles.greetingText, { color: palette.textMuted }]}>Chào buổi sáng,</Text>
                                    <Text style={[styles.userNameText, { color: palette.textPrimary }]}>Âm nhạc hôm nay thế nào?</Text>
                                </View>

                                {/* Immersive Live Banner */}
                                <TouchableOpacity
                                    activeOpacity={0.92}
                                    onPress={handleLivePress}
                                    style={styles.liveBannerWrapper}
                                >
                                    <LinearGradient
                                        colors={['#667EEA', '#764BA2', '#F093FB']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.liveBanner}
                                    >
                                        <View style={styles.liveBannerContent}>
                                            <Animated.View style={[styles.liveIndicator, { transform: [{ scale: pulseScale.value }] }]}>
                                                <View style={styles.liveDot} />
                                                <Text style={styles.liveLabel}>{isLiveNow ? 'ĐANG LIVE' : 'OFFLINE'}</Text>
                                            </Animated.View>

                                            <Text style={styles.liveTitle} numberOfLines={2}>
                                                {liveBannerTitle}
                                            </Text>

                                            <View style={styles.liveHostRow}>
                                                <Image
                                                    source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${liveBannerHost}` }}
                                                    style={styles.hostAvatar}
                                                />
                                                <Text style={styles.hostName}>{liveBannerHost}</Text>
                                                <View style={styles.listenerBadge}>
                                                    <Ionicons name="radio" size={14} color="#FFFFFF" />
                                                    <Text style={styles.listenerCount}>{liveBannerListeners} người</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <Image
                                            source={require('../../../assets/logo_notext.png')}
                                            style={[styles.bannerLogoBg, { opacity: 0.1 }]}
                                        />
                                    </LinearGradient>
                                </TouchableOpacity>

                                <View style={styles.sectionContainer}>
                                    <SectionHeader title="Top Hit Playlist Live" palette={palette} />
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.horizontalList}
                                    >
                                        {TOP_HIT_PLAYLISTS.map((item) => (
                                            <PlaylistCard key={item.id} item={item} palette={palette} />
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={styles.sectionContainer}>
                                    <SectionHeader title="Dành cho bạn" palette={palette} />
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.horizontalList}
                                    >
                                        {PLAYLISTS.map((item) => (
                                            <PlaylistCard key={item.id} item={item} palette={palette} />
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={styles.communitySection}>
                                    <SectionHeader
                                        title="Cộng đồng"
                                        palette={palette}
                                        onPressSeeAll={() => setActiveTab('blog')}
                                    />

                                    <View style={styles.forumList}>
                                        {isCommunityLoading ? (
                                            <ActivityIndicator size="large" color={palette.primary} style={{ marginVertical: 20 }} />
                                        ) : communityPosts.length === 0 ? (
                                            <Text style={styles.communityEmptyText}>Chưa có bài viết cộng đồng</Text>
                                        ) : (
                                            communityPosts.map((post) => (
                                                <ForumPost
                                                    key={post.id}
                                                    post={post}
                                                    palette={palette}
                                                    isDarkMode={isDarkMode}
                                                    onPress={() => setSelectedPostId(post.id)}
                                                />
                                            ))
                                        )}
                                    </View>
                                </View>
                            </>
                        )}
                    </Animated.ScrollView>

                    <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} onLogout={onLogout} />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchScreen: {
        flex: 1,
    },
    searchHeader: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    searchBackButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 10,
        marginHorizontal: 8,
        minHeight: 42,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
        marginRight: 8,
    },
    searchGoButton: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    searchGoText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    searchBodyContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 120,
    },
    searchSectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
    },
    searchSubTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
    },
    searchHintText: {
        fontSize: 13,
        lineHeight: 18,
    },
    searchLoadingBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    suggestionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        padding: 10,
        marginBottom: 8,
    },
    suggestionImage: {
        width: 42,
        height: 42,
        borderRadius: 10,
        marginRight: 10,
    },
    suggestionImageFallback: {
        width: 42,
        height: 42,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    suggestionInfo: {
        flex: 1,
    },
    suggestionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    suggestionSubtitle: {
        fontSize: 12,
    },
    suggestionTag: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    suggestionTagText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    searchFallbackButton: {
        marginTop: 12,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    searchFallbackText: {
        fontSize: 13,
        fontWeight: '600',
    },
    searchResultHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    searchBackToSuggestText: {
        fontSize: 12,
        fontWeight: '600',
    },
    searchSectionWrap: {
        marginTop: 14,
    },
    resultRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        padding: 10,
        marginBottom: 8,
    },
    resultRowImage: {
        width: 44,
        height: 44,
        borderRadius: 10,
        marginRight: 10,
    },
    resultRowInfo: {
        flex: 1,
    },
    resultRowTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    resultRowSubtitle: {
        fontSize: 12,
    },
    scrollContent: {
        paddingBottom: 114,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    header: {
        paddingHorizontal: 16,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        top: 4,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        zIndex: 100,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    brandLogoIcon: {
        width: 32,
        height: 32,
    },
    brandText: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    notifBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF4B2B',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    greetingSection: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    greetingText: {
        fontSize: 16,
        fontWeight: '500',
    },
    userNameText: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    liveBannerWrapper: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    liveBanner: {
        borderRadius: 28,
        padding: 24,
        height: 200,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    liveBannerContent: {
        zIndex: 1,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
        marginBottom: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF4B2B',
    },
    liveLabel: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    liveTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 15,
        lineHeight: 30,
    },
    liveHostRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    hostAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    hostName: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    listenerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    listenerCount: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    bannerLogoBg: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        width: 150,
        height: 150,
    },
    sectionContainer: {
        marginBottom: 30,
    },
    communitySection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '700',
    },
    horizontalList: {
        paddingLeft: 20,
        paddingRight: 10,
    },
    playlistCard: {
        width: 160,
        marginRight: 15,
    },
    playlistImageWrapper: {
        width: 160,
        height: 160,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 10,
    },
    playlistImage: {
        width: '100%',
        height: '100%',
    },
    playlistOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    playIconButton: {
        position: 'absolute',
        right: 10,
        bottom: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playlistInfo: {
        paddingHorizontal: 4,
    },
    playlistTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    playlistSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    podcastCard: {
        width: 140,
        alignItems: 'center',
        marginRight: 12,
    },
    podcastImageFrame: {
        width: 120,
        height: 120,
        borderRadius: 24,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 8,
    },
    podcastImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    podcastTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    podcastHost: {
        fontSize: 12,
        fontWeight: '500',
    },
    forumList: {
        gap: 15,
    },
    forumCard: {
        borderRadius: 24,
        padding: 20,
    },
    forumAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    forumAuthorInfo: {
        flex: 1,
    },
    forumAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    forumAuthorName: {
        fontSize: 15,
        fontWeight: '700',
    },
    forumTime: {
        fontSize: 12,
    },
    forumBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    forumBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    forumPostTitle: {
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 24,
        marginBottom: 15,
    },
    forumActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 10,
    },
    forumStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    forumStatText: {
        fontSize: 14,
        fontWeight: '600',
    },
    communityEmptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});
