import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import {
    blogService,
    favoriteService,
    livestreamService,
    NowPlayingData,
    PopularPostResponse,
    spotifyService,
    SpotifyTrack
} from '../../api';
import { BlogPostCard, DisplayPost } from '../../components/blog/BlogPostCard';
import FormTextField from '../../components/ui/FormTextField';
import { useTheme } from '../../context/ThemeContext';
import BlogScreen from '../blog/BlogScreen';
import CreatePostScreen from '../blog/CreatePostScreen';
import PostDetailScreen from '../blog/PostDetailScreen';
import BottomNavigation, { TabName } from '../BottomNavigation';
import PodcastScreen from '../podcast/PodcastScreen';
import ProfileScreen from '../profile/ProfileScreen';
import SearchResultsScreen, { SearchResultBundle } from '../search/SearchResultsScreen';
import {
    MyPlaylistCard,
    PodcastHotCard,
    SectionHeader,
    TopHitPlaylistCard,
} from './HomeScreen.cards';
import {
    PLAYLIST_TABS,
    PLAYLISTS,
    PlaylistTab,
    PODCASTS,
    SCHEDULE_ITEMS,
    SEARCH_MIN_CHARS,
    SearchSuggestionItem,
    TOP_HIT_PLAYLISTS,
} from './HomeScreen.data';
import styles from './HomeScreen.styles';

interface HomeScreenProps {
    initialTab?: TabName;
    onLogout?: () => void;
    onNavigateToLive?: () => void;
    onNavigateToForgotPassword?: () => void;
    onNavigateToSubscription?: () => void;
}

export default function HomeScreen({
    initialTab = 'home',
    onLogout,
    onNavigateToLive,
    onNavigateToForgotPassword,
    onNavigateToSubscription,
}: HomeScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const [activeTab, setActiveTab] = useState<TabName>(initialTab);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [communityPosts, setCommunityPosts] = useState<DisplayPost[]>([]);
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
    const [activePlaylistTab, setActivePlaylistTab] = useState<PlaylistTab>('Mới');
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const suggestionRequestIdRef = useRef(0);

    const filteredPlaylists = useMemo(() => {
        if (activePlaylistTab === 'Mới') {
            return PLAYLISTS;
        }

        return PLAYLISTS.filter((item) => item.category === activePlaylistTab);
    }, [activePlaylistTab]);

    const featuredPlaylist = filteredPlaylists[0] || PLAYLISTS[0];
    const playlistCarouselItems = useMemo(
        () => (filteredPlaylists.length > 1 ? filteredPlaylists.slice(1) : filteredPlaylists),
        [filteredPlaylists]
    );
    const featuredPodcast = PODCASTS[0];
    const podcastCarouselItems = PODCASTS.slice(1);

    const handleOpenSpotifyLink = useCallback(async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (!canOpen) {
                Alert.alert('Không thể mở liên kết', 'Thiết bị không hỗ trợ mở liên kết Spotify này.');
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            console.log('[HomeScreen] handleOpenSpotifyLink error:', error);
            Alert.alert('Không thể mở liên kết', 'Vui lòng thử lại sau.');
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

            Alert.alert('Đã thêm vào yêu thích', result.message || 'Bạn đã thêm bài hát vào mục yêu thích.');
        } catch (error: any) {
            console.log('[HomeScreen] handleAddFavoriteTrack error:', error);
            Alert.alert('Không thể thêm vào yêu thích', error?.response?.data?.message || 'Vui lòng thử lại sau.');
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
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 850,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 850,
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();

        return () => {
            loop.stop();
        };
    }, [pulseAnim]);

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
        if (tab === 'profile') {
            setActiveTab('profile');
            return;
        }

        if (tab === 'live') {
            onNavigateToLive?.();
            return;
        }

        setActiveTab(tab);
    };

    const handleLivePress = () => {
        onNavigateToLive?.();
    };

    const handleToggleCommunityLike = useCallback((postId: string) => {
        setCommunityPosts((prevPosts) =>
            prevPosts.map((post) => {
                if (post.id !== postId) {
                    return post;
                }

                const nextLiked = !post.isLiked;

                return {
                    ...post,
                    isLiked: nextLiked,
                    reactionCount: Math.max(0, post.reactionCount + (nextLiked ? 1 : -1)),
                };
            })
        );
    }, []);

    const fetchCommunityPosts = useCallback(async () => {
        setIsCommunityLoading(true);
        try {
            const result = await blogService.getPopularPosts({ page: 1, pageSize: 10 });
            if (result.success && result.data?.items) {
                const mappedPosts = result.data.items.map((post: PopularPostResponse) => {
                    const candidateShareMusic = (
                        (post as PopularPostResponse & { share_music?: unknown; sharedMusic?: unknown }).shareMusic
                        || (post as PopularPostResponse & { share_music?: unknown; sharedMusic?: unknown }).share_music
                        || (post as PopularPostResponse & { share_music?: unknown; sharedMusic?: unknown }).sharedMusic
                    );

                    const normalizedShareMusic = candidateShareMusic
                        && typeof candidateShareMusic === 'object'
                        ? (candidateShareMusic as DisplayPost['shareMusic'])
                        : null;

                    return {
                        id: post.id,
                        userId: post.userId,
                        title: post.title,
                        contentText: post.contentText,
                        imageUrl: post.imgUrl || null,
                        audioUrl: post.audioUrl || null,
                        moodTag: post.moodTag,
                        postType: post.postType || null,
                        shareMusic: normalizedShareMusic,
                        status: post.status,
                        createdAt: post.createdAt,
                        publishedAt: post.publishedAt,
                        reactionCount: post.reactionCount,
                        commentCount: post.commentCount,
                        viewCount: 0,
                        isLiked: false,
                    };
                });
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

    const liveBannerTitle = liveBannerData?.stationName || 'SoundMate Radio';
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
                            <FormTextField
                                containerStyle={styles.searchInputFieldWrap}
                                value={searchInput}
                                onChangeText={setSearchInput}
                                style={[styles.searchInput, { color: palette.textPrimary }]}
                                placeholder="Tìm Spotify, podcast, blog..."
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
                            <Text style={styles.searchGoText}>Tìm</Text>
                        </TouchableOpacity>
                    </View>

                    {!showSearchResults ? (
                        <ScrollView contentContainerStyle={styles.searchBodyContent} keyboardShouldPersistTaps="handled">
                            {/* <Text style={[styles.searchSectionTitle, { color: palette.textPrimary }]}>Goi y ket qua</Text> */}

                            {isSearchingSuggestions ? (
                                <View style={styles.searchLoadingBlock}>
                                    <ActivityIndicator size="small" color={palette.primary} />
                                    <Text style={[styles.searchHintText, { color: palette.textSecondary }]}>Đang tìm kiếm...</Text>
                                </View>
                            // ) : searchInput.trim().length < SEARCH_MIN_CHARS ? (
                            //     <Text style={[styles.searchHintText, { color: palette.textSecondary }]}>Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm.</Text>
                            // ) : searchSuggestions.length === 0 ? (
                            //     <Text style={[styles.searchHintText, { color: palette.textSecondary }]}>Chưa có gợi ý phù hợp. Bấm Tìm để xem kết quả đầy đủ.</Text>
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

                            {/* <TouchableOpacity
                                activeOpacity={0.85}
                                style={[styles.searchFallbackButton, { borderColor: palette.primary }]}
                                onPress={handleSubmitSearch}
                            >
                                <Ionicons name="open-outline" size={15} color={palette.primary} />
                                <Text style={[styles.searchFallbackText, { color: palette.primary }]}>Khong chon goi y? Xem ket qua day du</Text>
                            </TouchableOpacity> */}
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
                    {activeTab === 'blog' ? (
                        <BlogScreen 
                            onNavigateToCreatePost={() => setShowCreatePost(true)} 
                            onNavigateToPostDetail={(id) => setSelectedPostId(id)}
                        />
                    ) : activeTab === 'podcast' ? (
                        <PodcastScreen />
                    ) : activeTab === 'profile' ? (
                        <ProfileScreen
                            hideBottomNav
                            onBackToHome={(tab = 'home') => {
                                if (tab === 'blog' || tab === 'podcast' || tab === 'home') {
                                    setActiveTab(tab);
                                    return;
                                }

                                setActiveTab('home');
                            }}
                            onNavigateToForgotPassword={onNavigateToForgotPassword}
                            onNavigateToSubscription={onNavigateToSubscription}
                            onLogout={onLogout}
                        />
                    ) : (
                        <ScrollView
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
                            <LinearGradient
                                colors={isDarkMode ? ['#1F2937', '#0F172A', '#111827'] : ['#5CCAF2', '#3BB5E8', '#1E90D6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.header}
                            >
                                <View style={styles.headerGlowTop} />
                                <View style={styles.headerGlowBottom} />

                                <View style={styles.topBar}>
                                    <View style={styles.brandWrapper}>
                                        <Image
                                            source={require('../../../assets/dark_logo.png')}
                                            style={styles.brandLogoIcon}
                                        />
                                        <Image
                                            source={require('../../../assets/logo_text.png')}
                                            style={styles.brandLogoText}
                                        />
                                    </View>

                                    <View style={styles.headerIcons}>
                                        <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8} onPress={openSearch}>
                                            <Ionicons name="search" size={18} color="#FFFFFF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8}>
                                            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* <View style={styles.heroContent}>
                                    <View style={styles.quickActionRow}>
                                        <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.9} onPress={openSearch}>
                                            <Ionicons name="search" size={16} color="#FFFFFF" />
                                            <Text style={styles.quickActionText}>Tim nhanh</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.9} onPress={handleLivePress}>
                                            <Ionicons name="radio" size={16} color="#FFFFFF" />
                                            <Text style={styles.quickActionText}>Vao live</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.quickActionButton}
                                            activeOpacity={0.9}
                                            onPress={() => setActiveTab('blog')}
                                        >
                                            <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
                                            <Text style={styles.quickActionText}>Cong dong</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View> */}
                            </LinearGradient>

                            <TouchableOpacity
                                activeOpacity={0.92}
                                onPress={handleLivePress}
                                style={styles.liveBannerContainer}
                            >
                                <LinearGradient
                                    colors={isLiveNow ? ['#2563EB', '#7C3AED', '#EC4899'] : ['#334155', '#1F2937', '#0F172A']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.liveBanner}
                                >
                                    <View style={styles.liveBannerAuraTop} />
                                    <View style={styles.liveBannerAuraBottom} />

                                    <Animated.View style={[styles.livePill, { transform: [{ scale: pulseAnim }] }]}>
                                        <View style={styles.livePillDot} />
                                        <Text style={styles.livePillText}>{isLiveNow ? 'ĐANG LIVE' : 'OFFLINE'}</Text>
                                    </Animated.View>

                                    <View style={styles.liveBannerMainRow}>
                                        <View style={styles.liveBannerMainInfo}>
                                            <Text style={styles.liveBannerTitle} numberOfLines={2}>{liveBannerTitle}</Text>
                                            <Text style={styles.liveBannerHost}>Host: {liveBannerHost}</Text>

                                            <View style={styles.liveBannerMeta}>
                                                <Ionicons name="radio" size={14} color="rgba(255,255,255,0.92)" />
                                                <Text style={styles.liveBannerMetaText}>{liveBannerListeners} ngườI đang nghe</Text>
                                            </View>
                                        </View>

                                        <View style={styles.liveStatCard}>
                                            <Ionicons name="headset" size={18} color="#FFFFFF" />
                                            <Text style={styles.liveStatValue}>{liveBannerListeners}</Text>
                                            <Text style={styles.liveStatLabel}>Người nghe</Text>
                                        </View>
                                    </View>

                                    <View style={styles.liveBannerFooterRow}>
                                        <View style={styles.liveWaveBadge}>
                                            <Ionicons name="musical-notes" size={14} color="#FFFFFF" />
                                            <Text style={styles.liveWaveBadgeText}>Phát trực tiếp chất lượng cao</Text>
                                        </View>

                                        <View style={styles.liveBannerButton}>
                                            <Text style={styles.liveBannerButtonText}>Tham gia ngay</Text>
                                            <Ionicons name="arrow-forward" size={14} color="#0F172A" />
                                        </View>
                                    </View>

                                    <View style={styles.liveBannerOverlay} />
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.topHitSection}>
                                <SectionHeader title="Top Hit Playlist Live" titleColor={palette.primary} />
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.topHitScrollContent}
                                >
                                    {TOP_HIT_PLAYLISTS.map((item, index) => (
                                        <TopHitPlaylistCard key={item.id} item={item} rank={index + 1} />
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.scheduleSection}>
                                <SectionHeader title="Lịch phát sóng" titleColor={palette.primary} />

                                <LinearGradient
                                    colors={isDarkMode ? ['#111827', '#0F172A'] : ['#EAF6FF', '#F8FBFF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.schedulePanel}
                                >
                                    {SCHEDULE_ITEMS.map((item, index) => (
                                        <View
                                            key={item.id}
                                            style={[
                                                styles.scheduleCard,
                                                {
                                                    backgroundColor: palette.surface,
                                                    borderColor: palette.border,
                                                },
                                            ]}
                                        >
                                            <View style={styles.scheduleTimelineCol}>
                                                <View
                                                    style={[
                                                        styles.scheduleTimelineDot,
                                                        {
                                                            backgroundColor: item.isLive ? '#EF4444' : palette.primary,
                                                        },
                                                    ]}
                                                />
                                                {index < SCHEDULE_ITEMS.length - 1 ? (
                                                    <View
                                                        style={[
                                                            styles.scheduleTimelineLine,
                                                            { backgroundColor: isDarkMode ? '#334155' : '#BFDBFE' },
                                                        ]}
                                                    />
                                                ) : null}
                                            </View>

                                            <View style={styles.scheduleContentWrap}>
                                                <View style={styles.scheduleTopRow}>
                                                    <Text style={[styles.scheduleTime, { color: palette.primary }]}>{item.time}</Text>
                                                    <View
                                                        style={[
                                                            styles.scheduleStatusPill,
                                                            {
                                                                backgroundColor: item.isLive
                                                                    ? '#FEE2E2'
                                                                    : isDarkMode
                                                                        ? '#1F2937'
                                                                        : '#E2E8F0',
                                                            },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.scheduleStatusText,
                                                                {
                                                                    color: item.isLive ? '#B91C1C' : palette.textSecondary,
                                                                },
                                                            ]}
                                                        >
                                                            {item.period}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={[styles.scheduleTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                                                    {item.title}
                                                </Text>
                                                <Text style={[styles.scheduleHost, { color: palette.textSecondary }]} numberOfLines={1}>
                                                    Host: {item.host}
                                                </Text>
                                            </View>
                                            <View style={styles.scheduleActionCol}>
                                                <TouchableOpacity
                                                    activeOpacity={0.85}
                                                    style={[
                                                        styles.scheduleAction,
                                                        item.isLive
                                                            ? { backgroundColor: palette.primary }
                                                            : { backgroundColor: isDarkMode ? '#1F2937' : '#F1F5F9' },
                                                    ]}
                                                    onPress={() => {
                                                        if (item.isLive) {
                                                            handleLivePress();
                                                            return;
                                                        }

                                                        Alert.alert('Thông báo', `Đã bật thông báo cho ${item.title}.`);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.scheduleActionText,
                                                            { color: item.isLive ? '#FFFFFF' : palette.textPrimary },
                                                        ]}
                                                    >
                                                        {item.isLive ? 'Tham gia' : 'Nhắc tôi'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </LinearGradient>
                            </View>

                            <View style={styles.sectionBlock}>
                                <SectionHeader title="Playlist cá nhân" titleColor={palette.primary} />

                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.playlistTabScrollContent}
                                >
                                    {PLAYLIST_TABS.map((tab) => {
                                        const isActive = tab === activePlaylistTab;

                                        return (
                                            <TouchableOpacity
                                                key={tab}
                                                style={[
                                                    styles.playlistTabChip,
                                                    {
                                                        backgroundColor: isActive
                                                            ? palette.primary
                                                            : isDarkMode
                                                                ? '#1F2937'
                                                                : '#EEF2FF',
                                                    },
                                                ]}
                                                activeOpacity={0.85}
                                                onPress={() => setActivePlaylistTab(tab)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.playlistTabChipText,
                                                        {
                                                            color: isActive ? '#FFFFFF' : palette.textSecondary,
                                                        },
                                                    ]}
                                                >
                                                    {tab}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                <TouchableOpacity
                                    style={styles.playlistFeaturedCard}
                                    activeOpacity={0.92}
                                >
                                    <Image source={{ uri: featuredPlaylist.image }} style={styles.playlistFeaturedImage} />
                                    <LinearGradient
                                        colors={['rgba(2,6,23,0.78)', 'rgba(2,6,23,0.16)']}
                                        start={{ x: 0, y: 1 }}
                                        end={{ x: 0, y: 0 }}
                                        style={styles.playlistFeaturedOverlay}
                                    />

                                    <View style={styles.playlistFeaturedBadge}>
                                        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                                        <Text style={styles.playlistFeaturedBadgeText}>Đề cử cho bạn</Text>
                                    </View>

                                    <View style={styles.playlistFeaturedInfo}>
                                        <Text style={styles.playlistFeaturedTitle} numberOfLines={1}>{featuredPlaylist.title}</Text>
                                        <Text style={styles.playlistFeaturedSubtitle} numberOfLines={1}>{featuredPlaylist.subtitle}</Text>

                                        <View style={styles.playlistFeaturedFooter}>
                                            <View style={styles.playlistFeaturedChip}>
                                                <Text style={styles.playlistFeaturedChipText}>{featuredPlaylist.category}</Text>
                                            </View>
                                            <View style={styles.playlistFeaturedPlayButton}>
                                                <Ionicons name="play" size={15} color="#0F172A" />
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.horizontalScrollContent}
                                >
                                    {playlistCarouselItems.map((item) => (
                                        <MyPlaylistCard key={item.id} item={item} palette={palette} isDarkMode={isDarkMode} />
                                    ))}
                                </ScrollView>
                            </View>

                            <LinearGradient
                                colors={isDarkMode ? ['#111827', '#0F172A'] : ['#E0F2FE', '#FAFAFA']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.podcastSection}
                            >
                                <SectionHeader title="Podcast Hot" titleColor={palette.primary} />

                                <TouchableOpacity style={styles.podcastFeaturedCard} activeOpacity={0.92}>
                                    <Image source={{ uri: featuredPodcast.image }} style={styles.podcastFeaturedImage} />
                                    <LinearGradient
                                        colors={['rgba(14,116,144,0.92)', 'rgba(15,118,110,0.5)', 'rgba(2,6,23,0.3)']}
                                        start={{ x: 0, y: 1 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.podcastFeaturedOverlay}
                                    />

                                    <View style={styles.podcastFeaturedHeader}>
                                        <View style={styles.podcastFeaturedBadge}>
                                            <Ionicons name="mic" size={12} color="#FFFFFF" />
                                            <Text style={styles.podcastFeaturedBadgeText}>Podcast Spotlight</Text>
                                        </View>
                                    </View>

                                    <View style={styles.podcastFeaturedInfo}>
                                        <Text style={styles.podcastFeaturedTitle} numberOfLines={1}>{featuredPodcast.title}</Text>
                                        <Text style={styles.podcastFeaturedHost} numberOfLines={1}>Host: {featuredPodcast.host}</Text>

                                        <View style={styles.podcastFeaturedFooter}>
                                            <View style={styles.podcastFeaturedMetaChip}>
                                                <Text style={styles.podcastFeaturedMetaChipText}>Mới cập nhật</Text>
                                            </View>

                                            <View style={styles.podcastFeaturedPlayCta}>
                                                <Ionicons name="play" size={14} color="#0F172A" />
                                                <Text style={styles.podcastFeaturedPlayCtaText}>Nghe ngay</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.horizontalScrollContent}
                                >
                                    {podcastCarouselItems.map((item) => (
                                        <PodcastHotCard key={item.id} item={item} palette={palette} isDarkMode={isDarkMode} />
                                    ))}
                                </ScrollView>
                            </LinearGradient>

                            <View style={styles.communitySection}>
                                {/* <LinearGradient
                                    colors={isDarkMode ? ['#1F2937', '#0B1120'] : ['#1E90D6', '#55C5F1']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.premiumCard}
                                >
                                    <View style={styles.premiumGlow} />
                                    <Text style={[styles.premiumTag, { color: '#E0F2FE' }]}>PREMIUM</Text>
                                    <Text style={styles.premiumTitle}>Mở khóa đặc quyền âm nhạc không giới hạn</Text>
                                    <Text style={[styles.premiumDesc, { color: '#E2E8F0' }]}>
                                        Khong quang cao, chat luong cao hon va uu tien vao phong live hot ngay khi bat dau.
                                    </Text>
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        style={[styles.premiumButton, { backgroundColor: '#FFFFFF' }]}
                                    >
                                        <Text style={[styles.premiumButtonText, { color: '#0F172A' }]}>Kham pha goi</Text>
                                    </TouchableOpacity>
                                </LinearGradient> */}

                                <SectionHeader
                                    title="Cộng đồng"
                                    titleColor={palette.primary}
                                    onPressSeeAll={() => setActiveTab('blog')}
                                />

                                {isCommunityLoading ? (
                                    <View style={styles.communityLoadingWrap}>
                                        <ActivityIndicator size="small" color={palette.primary} />
                                        <Text style={styles.communityLoadingText}>Đang tải bài viết cộng đồng...</Text>
                                    </View>
                                ) : communityPosts.length === 0 ? (
                                    <Text style={styles.communityEmptyText}>Chưa có bài viết cộng đồng</Text>
                                ) : (
                                    communityPosts.map((post) => (
                                        <BlogPostCard
                                            key={post.id}
                                            post={post}
                                            onLike={() => handleToggleCommunityLike(post.id)}
                                            onNavigateToDetail={(postId) => setSelectedPostId(postId)}
                                        />
                                    ))
                                )}
                            </View>
                        </ScrollView>
                    )}

                    <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} onLogout={onLogout} />
                </>
            )}
        </View>
    );
}

