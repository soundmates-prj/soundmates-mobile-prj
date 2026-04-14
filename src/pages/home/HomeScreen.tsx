import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, Linking, PanResponder, RefreshControl, ScrollView, Text, TouchableOpacity, View, DeviceEventEmitter } from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import {
    blogService,
    favoriteService,
    LiveScheduleResult,
    livestreamService,
    NowPlayingData,
    PopularPostResponse,
    spotifyService,
    SpotifyTrack,
    userPlaylistService,
} from '../../api';
import { BlogPostCard, DisplayPost, ReactionType } from '../../components/blog/BlogPostCard';
import FormTextField from '../../components/ui/FormTextField';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import BlogScreen from '../blog/BlogScreen';
import CreatePostScreen, { EditablePostDraft } from '../blog/CreatePostScreen';
import PostDetailScreen from '../blog/PostDetailScreen';
import BottomNavigation, { TabName } from '../BottomNavigation';
import LiveSessionsScreen from '../live/LiveSessionsScreen';
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
    PlaylistItem,
    PLAYLISTS,
    PlaylistTab,
    PODCASTS,
    ScheduleItem,
    SEARCH_MIN_CHARS,
    SearchSuggestionItem,
    TOP_HIT_PLAYLISTS,
} from './HomeScreen.data';
import styles from './HomeScreen.styles';

const PLAYLIST_VISIBILITY_CATEGORY_MAP: Record<number, PlaylistTab> = {
    0: 'Thịnh Hành',
    1: 'Acoustic',
    2: 'Bolero',
};

const MAIN_TAB_SWIPE_ORDER: TabName[] = ['home', 'podcast', 'live', 'blog', 'profile'];

const parseTimeParts = (rawTime?: string | null): { hour: number; minute: number } => {
    if (!rawTime) return { hour: 0, minute: 0 };
    const [hourText = '0', minuteText = '0'] = rawTime.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);

    return {
        hour: Number.isNaN(hour) ? 0 : hour,
        minute: Number.isNaN(minute) ? 0 : minute,
    };
};

const formatClock = (rawTime?: string | null): string => {
    if (!rawTime) return '--:--';
    const [hour = '00', minute = '00'] = rawTime.split(':');
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

const parseDateOnly = (rawDate?: string | null): Date | null => {
    if (!rawDate) return null;
    const parsed = new Date(`${rawDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSameDate = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isDateAllowedByMask = (date: Date, mask?: number): boolean => {
    if (!mask || mask <= 0) return true;
    const flag = 1 << date.getDay();
    return (mask & flag) !== 0;
};

const buildDateTimeFromTime = (baseDate: Date, rawTime?: string | null): Date => {
    const { hour, minute } = parseTimeParts(rawTime);
    const result = new Date(baseDate);
    result.setHours(hour, minute, 0, 0);
    return result;
};

const getOccurrenceOnDate = (schedule: LiveScheduleResult, targetDate: Date): Date | null => {
    const startBoundary = parseDateOnly(schedule.startDate);
    if (!startBoundary) return null;

    const endBoundary = parseDateOnly(schedule.endDate);
    if (endBoundary) {
        endBoundary.setHours(23, 59, 59, 999);
    }

    const normalizedTarget = new Date(targetDate);
    normalizedTarget.setHours(0, 0, 0, 0);

    if (normalizedTarget < startBoundary) {
        return null;
    }

    if (endBoundary && normalizedTarget > endBoundary) {
        return null;
    }

    if (!schedule.isRecurring) {
        if (!isSameDate(normalizedTarget, startBoundary)) {
            return null;
        }

        return buildDateTimeFromTime(normalizedTarget, schedule.startTime);
    }

    if (!isDateAllowedByMask(normalizedTarget, schedule.daysOfWeek)) {
        return null;
    }

    return buildDateTimeFromTime(normalizedTarget, schedule.startTime);
};

interface HomeScreenProps {
    initialTab?: TabName;
    onLogout?: () => void;
    onNavigateToLiveSession?: (sessionId: string) => void;
    onNavigateToForgotPassword?: () => void;
    onNavigateToSubscription?: () => void;
}

export default function HomeScreen({
    initialTab = 'home',
    onLogout,
    onNavigateToLiveSession,
    onNavigateToForgotPassword,
    onNavigateToSubscription,
}: HomeScreenProps) {
    const { isDarkMode } = useTheme();
    const { user } = useUser();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const [activeTab, setActiveTab] = useState<TabName>(initialTab);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [createPostDraft, setCreatePostDraft] = useState<EditablePostDraft | null>(null);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [communityPosts, setCommunityPosts] = useState<DisplayPost[]>([]);
    const [isCommunityLoading, setIsCommunityLoading] = useState(false);
    const [personalPlaylists, setPersonalPlaylists] = useState<PlaylistItem[] | null>(null);
    const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
    const [todaySchedules, setTodaySchedules] = useState<ScheduleItem[]>([]);
    const [isScheduleLoading, setIsScheduleLoading] = useState(false);
    const [liveBannerData, setLiveBannerData] = useState<NowPlayingData | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSearchScreen, setShowSearchScreen] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestionItem[]>([]);

    const [globalScrollEnabled, setGlobalScrollEnabled] = useState(true);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('GlobalScrollEnabled', (enabled: boolean) => {
            setGlobalScrollEnabled(enabled);
        });

        const reactSub = DeviceEventEmitter.addListener('PostReactionUpdated', ({ postId, newReaction }) => {
            setCommunityPosts((prevPosts) =>
                prevPosts.map((post) => {
                    if (post.id !== postId) return post;
                    const currentReaction = post.myReactionType ?? (post.isLiked ? 'like' : null);
                    if (currentReaction === newReaction) return post;

                    const isRemoving = newReaction === null;
                    if (isRemoving) {
                        return { ...post, isLiked: false, myReactionType: null, reactionCount: Math.max(0, post.reactionCount - 1) };
                    } else {
                        const countDelta = currentReaction ? 0 : 1;
                        return { ...post, isLiked: true, myReactionType: newReaction, reactionCount: post.reactionCount + countDelta };
                    }
                })
            );
        });

        return () => {
            sub.remove();
            reactSub.remove();
        };
    }, []);

    const [searchResultBundle, setSearchResultBundle] = useState<SearchResultBundle | null>(null);
    const [isProfileMainTabSwipeLocked, setIsProfileMainTabSwipeLocked] = useState(false);
    const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
    const [isSearchingResults, setIsSearchingResults] = useState(false);
    const [suggestionFavoriteTrackIds, setSuggestionFavoriteTrackIds] = useState<Set<string>>(new Set());
    const [activePlaylistTab, setActivePlaylistTab] = useState<PlaylistTab>('Mới');
    const screenWidth = Dimensions.get('window').width;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const tabSwipeTranslateX = useRef(new Animated.Value(0)).current;
    const isMainTabSwipeSwitchingRef = useRef(false);
    const suggestionRequestIdRef = useRef(0);

    const filteredPlaylists = useMemo(() => {
        if (personalPlaylists) {
            return personalPlaylists;
        }

        if (activePlaylistTab === 'Mới') {
            return PLAYLISTS;
        }

        return PLAYLISTS.filter((item) => item.category === activePlaylistTab);
    }, [activePlaylistTab, personalPlaylists]);

    const shouldShowPlaylistTabs = !personalPlaylists;

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
            trackId: track.id,
            title: track.name,
            subtitle: track.artists?.map((artist) => artist.name).join(', ') || 'Spotify Track',
            artistName: track.artists?.map((artist) => artist.name).join(', ') || '',
            albumName: track.album?.name || '',
            imageUrl: track.album?.images?.[0]?.url,
            previewUrl: track.preview_url || undefined,
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

    const fetchFavoriteTrackIds = useCallback(async () => {
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

            setSuggestionFavoriteTrackIds(new Set(result.data.map((item) => item.itemId)));
        } catch (error) {
            console.log('[HomeScreen] fetchFavoriteTrackIds error:', error);
        }
    }, []);

    const handleAddFavoriteTrack = useCallback(async (track: SpotifyTrack): Promise<{ success: boolean; message?: string }> => {
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

            return {
                success: true,
                message: result.message || 'Bạn đã thêm bài hát vào mục yêu thích.',
            };
        } catch (error: any) {
            console.log('[HomeScreen] handleAddFavoriteTrack error:', error);

            return {
                success: false,
                message: error?.response?.data?.message || 'Vui lòng thử lại sau.',
            };
        }
    }, []);

    const handleAddFavoriteSuggestion = useCallback(async (item: SearchSuggestionItem) => {
        if (suggestionFavoriteTrackIds.has(item.trackId)) {
            return;
        }

        try {
            const result = await favoriteService.addFavorite({
                itemType: 'track',
                itemId: item.trackId,
                source: item.source,
                name: item.title,
                artistName: item.artistName || item.subtitle,
                albumName: item.albumName || '',
                imgUrl: item.imageUrl,
                previewUrl: item.previewUrl,
            });

            if (result.success) {
                setSuggestionFavoriteTrackIds((prev) => {
                    const next = new Set(prev);
                    next.add(item.trackId);
                    return next;
                });
                return;
            }

            Alert.alert('Không thể thêm vào yêu thích', result.message || 'Vui lòng thử lại sau.');
        } catch (error: any) {
            console.log('[HomeScreen] handleAddFavoriteSuggestion error:', error);
            Alert.alert('Không thể thêm vào yêu thích', error?.response?.data?.message || 'Vui lòng thử lại sau.');
        }
    }, [suggestionFavoriteTrackIds]);

    const handleSubmitSearch = useCallback(() => {
        void executeSearch(searchInput);
    }, [executeSearch, searchInput]);

    const handleSuggestionPress = useCallback((item: SearchSuggestionItem) => {
        setSearchInput(item.title);
        void executeSearch(item.title);
    }, [executeSearch]);

    useEffect(() => {
        if (showSearchScreen) {
            void fetchFavoriteTrackIds();
        }
    }, [fetchFavoriteTrackIds, showSearchScreen]);

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
        if (initialTab === 'home' || initialTab === 'blog' || initialTab === 'podcast' || initialTab === 'profile' || initialTab === 'live') {
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

    const activeTabIndex = useMemo(
        () => MAIN_TAB_SWIPE_ORDER.indexOf(activeTab),
        [activeTab],
    );

    const previousMainTab = useMemo<TabName | null>(
        () => (activeTabIndex > 0 ? MAIN_TAB_SWIPE_ORDER[activeTabIndex - 1] : null),
        [activeTabIndex],
    );

    const nextMainTab = useMemo<TabName | null>(
        () => (
            activeTabIndex >= 0 && activeTabIndex < MAIN_TAB_SWIPE_ORDER.length - 1
                ? MAIN_TAB_SWIPE_ORDER[activeTabIndex + 1]
                : null
        ),
        [activeTabIndex],
    );

    const previousTabTranslateX = useMemo(
        () => Animated.subtract(tabSwipeTranslateX, screenWidth),
        [screenWidth, tabSwipeTranslateX],
    );

    const nextTabTranslateX = useMemo(
        () => Animated.add(tabSwipeTranslateX, screenWidth),
        [screenWidth, tabSwipeTranslateX],
    );

    const resetMainTabSwipePosition = useCallback(() => {
        Animated.spring(tabSwipeTranslateX, {
            toValue: 0,
            damping: 18,
            stiffness: 180,
            mass: 0.5,
            useNativeDriver: true,
        }).start(() => {
            isMainTabSwipeSwitchingRef.current = false;
        });
    }, [tabSwipeTranslateX]);

    const completeMainTabSwipeSwitch = useCallback((targetTab: TabName, direction: 'left' | 'right') => {
        if (isMainTabSwipeSwitchingRef.current) {
            return;
        }

        isMainTabSwipeSwitchingRef.current = true;
        const targetOffset = direction === 'left' ? -screenWidth : screenWidth;

        Animated.timing(tabSwipeTranslateX, {
            toValue: targetOffset,
            duration: 190,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (!finished) {
                resetMainTabSwipePosition();
                return;
            }

            setActiveTab(targetTab);
            tabSwipeTranslateX.setValue(0);
            isMainTabSwipeSwitchingRef.current = false;
        });
    }, [resetMainTabSwipePosition, screenWidth, tabSwipeTranslateX]);

    const handleTabPress = useCallback((tab: TabName) => {
        if (tab === activeTab) {
            return;
        }

        tabSwipeTranslateX.stopAnimation();
        tabSwipeTranslateX.setValue(0);
        isMainTabSwipeSwitchingRef.current = false;
        setActiveTab(tab);
    }, [activeTab, tabSwipeTranslateX]);

    const mainTabSwipeResponder = useMemo(
        () => PanResponder.create({
            onPanResponderGrant: () => {
                tabSwipeTranslateX.stopAnimation();
            },
            onMoveShouldSetPanResponderCapture: (_, gesture) => {
                const isHorizontalSwipe =
                    Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35;

                return (
                    isHorizontalSwipe
                    && !showSearchScreen
                    && !showCreatePost
                    && !selectedPostId
                    && !isProfileMainTabSwipeLocked
                );
            },
            onPanResponderMove: (_, gesture) => {
                if (isMainTabSwipeSwitchingRef.current) {
                    return;
                }

                const minDx = nextMainTab ? -screenWidth * 0.9 : 0;
                const maxDx = previousMainTab ? screenWidth * 0.9 : 0;
                const clampedDx = Math.max(minDx, Math.min(maxDx, gesture.dx));
                tabSwipeTranslateX.setValue(clampedDx);
            },
            onPanResponderRelease: (_, gesture) => {
                const passedDistance = Math.abs(gesture.dx) > 78;
                const passedVelocity = Math.abs(gesture.vx) > 0.16;
                const isHorizontalIntent = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15;

                if ((!passedDistance && !passedVelocity) || !isHorizontalIntent) {
                    resetMainTabSwipePosition();
                    return;
                }

                if (gesture.dx < 0 && nextMainTab) {
                    completeMainTabSwipeSwitch(nextMainTab, 'left');
                    return;
                }

                if (gesture.dx > 0 && previousMainTab) {
                    completeMainTabSwipeSwitch(previousMainTab, 'right');
                    return;
                }

                resetMainTabSwipePosition();
            },
            onPanResponderTerminate: () => {
                resetMainTabSwipePosition();
            },
        }),
        [
            completeMainTabSwipeSwitch,
            nextMainTab,
            previousMainTab,
            resetMainTabSwipePosition,
            screenWidth,
            selectedPostId,
            showCreatePost,
            showSearchScreen,
            isProfileMainTabSwipeLocked,
            tabSwipeTranslateX,
        ],
    );

    useEffect(() => {
        if (!showSearchScreen && !showCreatePost && !selectedPostId) {
            return;
        }

        tabSwipeTranslateX.stopAnimation();
        tabSwipeTranslateX.setValue(0);
        isMainTabSwipeSwitchingRef.current = false;
    }, [selectedPostId, showCreatePost, showSearchScreen, tabSwipeTranslateX]);

    const handleLivePress = useCallback(async (preferredSessionId?: string) => {
        if (preferredSessionId && onNavigateToLiveSession) {
            onNavigateToLiveSession(preferredSessionId);
            return;
        }

        if (onNavigateToLiveSession) {
            const liveScheduleSessionId = todaySchedules.find((item) => item.isLive && item.sessionId)?.sessionId;
            if (liveScheduleSessionId) {
                onNavigateToLiveSession(liveScheduleSessionId);
                return;
            }

            try {
                const activeSessions = await livestreamService.getActiveSessions();
                if (activeSessions.length > 0) {
                    onNavigateToLiveSession(activeSessions[0].id);
                    return;
                }
            } catch (error) {
                console.log('[HomeScreen] handleLivePress resolve session error:', error);
            }
        }

        setActiveTab('live');
    }, [onNavigateToLiveSession, todaySchedules]);

    const handleCommunityReaction = useCallback(async (postId: string, newReaction: ReactionType | null) => {
        const targetPost = communityPosts.find((p) => p.id === postId);
        if (!targetPost) return;

        const currentReaction = targetPost.myReactionType;
        const isRemoving = newReaction === null;

        setCommunityPosts((prevPosts) =>
            prevPosts.map((post) => {
                if (post.id !== postId) return post;
                if (isRemoving) {
                    return { ...post, isLiked: false, myReactionType: null, reactionCount: Math.max(0, post.reactionCount - 1) };
                } else {
                    const countDelta = currentReaction ? 0 : 1;
                    return { ...post, isLiked: true, myReactionType: newReaction, reactionCount: post.reactionCount + countDelta };
                }
            }),
        );

        try {
            if (isRemoving) {
                await blogService.removeReaction(postId);
            } else {
                if (currentReaction) {
                    await blogService.removeReaction(postId);
                }
                await blogService.addReaction(postId, newReaction!);
            }
        } catch (error) {
            console.log('[HomeScreen] handleCommunityReaction error:', error);
            setCommunityPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post.id === postId
                        ? { ...post, isLiked: targetPost.isLiked, myReactionType: targetPost.myReactionType, reactionCount: targetPost.reactionCount }
                        : post,
                ),
            );
        }
    }, [communityPosts]);

    const fetchCommunityPosts = useCallback(async () => {
        setIsCommunityLoading(true);
        try {
            const result = await blogService.getPopularPosts({ page: 1, pageSize: 10 });
            if (result.success && result.data?.items) {
                const mappedPosts = result.data.items.map((post: PopularPostResponse) => {
                    let candidateShareMusic = (
                        (post as PopularPostResponse & { share_music?: unknown; sharedMusic?: unknown }).shareMusic
                        || (post as PopularPostResponse & { share_music?: unknown; sharedMusic?: unknown }).share_music
                        || (post as PopularPostResponse & { share_music?: unknown; sharedMusic?: unknown }).sharedMusic
                    );

                    let inferredPostType = post.postType;
                    if (!candidateShareMusic && post.moodTag && post.moodTag.includes('share-music')) {
                        inferredPostType = 'share-music';
                        if (post.contentText) {
                            try {
                                const parsed = JSON.parse(post.contentText);
                                candidateShareMusic = {
                                    trackId: parsed.TrackId || parsed.trackId,
                                    title: parsed.Title || parsed.title,
                                    artist: parsed.Artist || parsed.artist,
                                    albumImage: parsed.AlbumImage || parsed.albumImage,
                                    previewUrl: parsed.PreviewUrl || parsed.previewUrl,
                                    template: parsed.Template || parsed.template,
                                };
                            } catch (e) {}
                        }
                    }

                    let normalizedShareMusic = null;
                    if (candidateShareMusic) {
                        if (typeof candidateShareMusic === 'string') {
                            try {
                                normalizedShareMusic = JSON.parse(candidateShareMusic as string);
                            } catch (e) {
                                normalizedShareMusic = null;
                            }
                        } else if (typeof candidateShareMusic === 'object') {
                            normalizedShareMusic = candidateShareMusic;
                        }
                    }

                    return {
                        id: post.id,
                        userId: post.userId,
                        userFullName:
                            (post as PopularPostResponse & { user_full_name?: string }).userFullName
                            || (post as PopularPostResponse & { user_full_name?: string }).user_full_name,
                        userAvatarUrl:
                            (post as PopularPostResponse & { user_avatar_url?: string }).userAvatarUrl
                            || (post as PopularPostResponse & { user_avatar_url?: string }).user_avatar_url,
                        title: post.title,
                        contentText: post.contentText,
                        imageUrl: post.imgUrl || null,
                        audioUrl: post.audioUrl || null,
                        moodTag: post.moodTag,
                        postType: inferredPostType || post.postType || null,
                        shareMusic: normalizedShareMusic as DisplayPost['shareMusic'],
                        status: post.status,
                        createdAt: post.createdAt,
                        publishedAt: post.publishedAt,
                        reactionCount: post.reactionCount,
                        commentCount: post.commentCount,
                        viewCount: 0,
                        isLiked: false,
                    };
                });

                if (user?.userId) {
                    const enrichedPosts = await Promise.all(
                        mappedPosts.map(async (post) => {
                            try {
                                const reactions = await blogService.getPostReactions(post.id);
                                const userReaction = reactions.data?.find((reaction) => reaction.userId === user.userId);
                                const isLiked = !!userReaction;
                                const myReactionType = userReaction ? (userReaction.reactionType as ReactionType) : null;
                                return {
                                    ...post,
                                    isLiked,
                                    myReactionType,
                                };
                            } catch {
                                return post;
                            }
                        }),
                    );

                    setCommunityPosts(enrichedPosts);
                } else {
                    setCommunityPosts(mappedPosts);
                }
            } else {
                setCommunityPosts([]);
            }
        } catch (error) {
            console.log('[HomeScreen] fetchCommunityPosts error:', error);
            setCommunityPosts([]);
        } finally {
            setIsCommunityLoading(false);
        }
    }, [user?.userId]);

    const fetchLiveBannerData = useCallback(async () => {
        try {
            const data = await livestreamService.getNowPlaying();
            setLiveBannerData(data);
        } catch (error) {
            console.log('[HomeScreen] fetchLiveBannerData error:', error);
            setLiveBannerData(null);
        }
    }, []);

    const fetchPersonalPlaylists = useCallback(async () => {
        setIsPlaylistLoading(true);

        try {
            const result = await userPlaylistService.getMyPlaylists();
            if (!result.success) {
                setPersonalPlaylists(null);
                return;
            }

            const mapped = (result.data || [])
                .filter((item) => item.isEnabled)
                .sort((a, b) => {
                    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
                    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
                    return timeB - timeA;
                })
                .map((item, index) => ({
                    id: item.id,
                    title: item.playlistName,
                    subtitle: `${item.totalTracks || 0} bài hát`,
                    image: item.thumbnailUrl || PLAYLISTS[index % PLAYLISTS.length].image,
                    category: PLAYLIST_VISIBILITY_CATEGORY_MAP[item.visibility] || 'Mới',
                }));

            setPersonalPlaylists(mapped);
        } catch (error) {
            console.log('[HomeScreen] fetchPersonalPlaylists error:', error);
            setPersonalPlaylists(null);
        } finally {
            setIsPlaylistLoading(false);
        }
    }, []);

    const fetchTodaySchedules = useCallback(async () => {
        setIsScheduleLoading(true);

        try {
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);

            const schedules = await livestreamService.getSchedules();

            const mapped = schedules
                .filter((schedule) => {
                    const normalizedStatus = (schedule.liveSession?.status || schedule.status || '').toLowerCase();
                    return normalizedStatus === 'scheduled' || normalizedStatus === 'live';
                })
                .map((schedule) => {
                    const occurrenceAt = getOccurrenceOnDate(schedule, today);
                    if (!occurrenceAt) {
                        return null;
                    }

                    const resolvedSessionId = schedule.liveSessionId || schedule.liveSession?.id;

                    const status = (schedule.liveSession?.status || schedule.status || '').toLowerCase();
                    const endAt = buildDateTimeFromTime(today, schedule.endTime);
                    if (endAt < occurrenceAt) {
                        endAt.setDate(endAt.getDate() + 1);
                    }

                    const isLiveByTime = now >= occurrenceAt && now <= endAt;
                    const isLive = status === 'live' || isLiveByTime;

                    return {
                        id: schedule.id,
                        ...(resolvedSessionId ? { sessionId: resolvedSessionId } : {}),
                        time: formatClock(schedule.startTime),
                        period: isLive ? 'Đang phát' : 'Sắp tới',
                        title: schedule.title || schedule.liveSession?.sessionName || 'Phiên live sắp diễn ra',
                        host: schedule.liveSession?.station?.stationName || 'Chưa cập nhật',
                        isLive,
                        occurrenceAt,
                    };
                })
                .filter((item): item is ScheduleItem & { occurrenceAt: Date } => Boolean(item))
                .sort((a, b) => a.occurrenceAt.getTime() - b.occurrenceAt.getTime())
                .map(({ occurrenceAt: _occurrenceAt, ...item }) => item);

            setTodaySchedules(mapped);
        } catch (error) {
            console.log('[HomeScreen] fetchTodaySchedules error:', error);
            setTodaySchedules([]);
        } finally {
            setIsScheduleLoading(false);
        }
    }, []);

    const fetchAllData = useCallback(async (forceRefresh = false) => {
        await Promise.all([fetchCommunityPosts(), fetchLiveBannerData(), fetchTodaySchedules(), fetchPersonalPlaylists()]);
    }, [fetchCommunityPosts, fetchLiveBannerData, fetchTodaySchedules, fetchPersonalPlaylists]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await fetchAllData(true);
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchAllData]);

    useEffect(() => {
        if (activeTab === 'home') {
            fetchAllData();
        }

        const intervalId = setInterval(() => {
            if (activeTab === 'home') {
                fetchLiveBannerData();
            }
        }, 10000);

        return () => clearInterval(intervalId);
    }, [activeTab, fetchAllData, fetchLiveBannerData]);

    const liveBannerTitle = liveBannerData?.stationName || 'SoundMate Radio';
    const liveBannerHost = liveBannerData?.streamerName || 'Emily_vui';
    const liveBannerListeners = liveBannerData?.totalListeners ?? 256;
    const isLiveNow = liveBannerData
        ? liveBannerData.isLive || liveBannerData.isOnline
        : true;

    const renderHomeTabContent = () => (
        <ScrollView
            style={[styles.container, { backgroundColor: palette.background }]}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={() => handleRefresh()} tintColor={palette.primary} />
            }
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            scrollEnabled={globalScrollEnabled}
            contentContainerStyle={styles.scrollContent}
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
            </LinearGradient>

            <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => {
                    void handleLivePress();
                }}
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
                    {isScheduleLoading ? (
                        <View style={styles.searchLoadingBlock}>
                            <ActivityIndicator size="small" color={palette.primary} />
                            <Text style={[styles.searchHintText, { color: palette.textSecondary }]}>Đang tải lịch phát sóng...</Text>
                        </View>
                    ) : todaySchedules.length === 0 ? (
                        <Text style={[styles.searchHintText, { color: palette.textSecondary }]}>Hôm nay chưa có phiên live theo lịch.</Text>
                    ) : (
                        todaySchedules.map((item, index) => (
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
                                    {index < todaySchedules.length - 1 ? (
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
                                                void handleLivePress(item.sessionId);
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
                        ))
                    )}
                </LinearGradient>
            </View>

            <View style={styles.sectionBlock}>
                <SectionHeader title="Playlist cá nhân" titleColor={palette.primary} />

                {shouldShowPlaylistTabs && (
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
                )}

                {isPlaylistLoading ? (
                    <View style={styles.searchLoadingBlock}>
                        <ActivityIndicator size="small" color={palette.primary} />
                        <Text style={[styles.searchHintText, { color: palette.textSecondary }]}>Đang tải playlist cá nhân...</Text>
                    </View>
                ) : personalPlaylists && personalPlaylists.length === 0 ? (
                    <Text style={[styles.searchHintText, { color: palette.textSecondary }]}>Bạn chưa có playlist cá nhân.</Text>
                ) : (
                    <>
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
                    </>
                )}
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
                            onReaction={(type) => handleCommunityReaction(post.id, type)}
                            onNavigateToDetail={(postId) => setSelectedPostId(postId)}
                        />
                    ))
                )}
            </View>
        </ScrollView>
    );

    const renderMainTabContent = (tab: TabName, isPreview = false) => {
        if (tab === 'blog') {
            return (
                <BlogScreen
                    onNavigateToCreatePost={() => {
                        if (isPreview) {
                            return;
                        }

                        setCreatePostDraft(null);
                        setShowCreatePost(true);
                    }}
                    onNavigateToPostDetail={(id) => {
                        if (!isPreview) {
                            setSelectedPostId(id);
                        }
                    }}
                />
            );
        }

        if (tab === 'podcast') {
            return <PodcastScreen />;
        }

        if (tab === 'live') {
            return (
                <LiveSessionsScreen
                    hideBottomNav
                    onBack={() => {
                        if (!isPreview) {
                            setActiveTab('home');
                        }
                    }}
                    onSelectSession={(sessionId) => {
                        if (!isPreview) {
                            onNavigateToLiveSession?.(sessionId);
                        }
                    }}
                    onTabPress={(tabName) => {
                        if (!isPreview) {
                            handleTabPress(tabName);
                        }
                    }}
                />
            );
        }

        if (tab === 'profile') {
            return (
                <ProfileScreen
                    hideBottomNav
                    onMainTabSwipeLockChange={isPreview ? undefined : setIsProfileMainTabSwipeLocked}
                    onNavigateToCreatePost={(draft) => {
                        if (isPreview) {
                            return;
                        }

                        setCreatePostDraft(draft || null);
                        setShowCreatePost(true);
                    }}
                    onBackToHome={(tabName = 'home') => {
                        if (isPreview) {
                            return;
                        }

                        if (tabName === 'blog' || tabName === 'podcast' || tabName === 'home' || tabName === 'live') {
                            setActiveTab(tabName);
                            return;
                        }

                        setActiveTab('home');
                    }}
                    onNavigateToForgotPassword={onNavigateToForgotPassword}
                    onNavigateToSubscription={onNavigateToSubscription}
                    onLogout={onLogout}
                />
            );
        }

        return renderHomeTabContent();
    };

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

                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={[
                                                styles.suggestionFavoriteButton,
                                                {
                                                    backgroundColor: suggestionFavoriteTrackIds.has(item.trackId)
                                                        ? 'rgba(239, 68, 68, 0.16)'
                                                        : isDarkMode
                                                            ? '#1E3A8A'
                                                            : '#DBEAFE',
                                                },
                                            ]}
                                            onPress={() => {
                                                void handleAddFavoriteSuggestion(item);
                                            }}
                                        >
                                            <Ionicons
                                                name={suggestionFavoriteTrackIds.has(item.trackId) ? 'heart' : 'heart-outline'}
                                                size={16}
                                                color={suggestionFavoriteTrackIds.has(item.trackId) ? '#EF4444' : isDarkMode ? '#BFDBFE' : '#1D4ED8'}
                                            />
                                        </TouchableOpacity>
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
                    onBack={() => {
                        setShowCreatePost(false);
                        setCreatePostDraft(null);
                    }} 
                    onPostCreated={() => {
                        setShowCreatePost(false);
                        setCreatePostDraft(null);
                    }} 
                    editingPost={createPostDraft}
                />
            ) : (
                <>
                    <View style={styles.mainTabViewport} {...mainTabSwipeResponder.panHandlers}>
                        {previousMainTab ? (
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.mainTabPage,
                                    { transform: [{ translateX: previousTabTranslateX }] },
                                ]}
                            >
                                {renderMainTabContent(previousMainTab, true)}
                            </Animated.View>
                        ) : null}

                        {nextMainTab ? (
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.mainTabPage,
                                    { transform: [{ translateX: nextTabTranslateX }] },
                                ]}
                            >
                                {renderMainTabContent(nextMainTab, true)}
                            </Animated.View>
                        ) : null}

                        <Animated.View
                            style={[
                                styles.mainTabPage,
                                { transform: [{ translateX: tabSwipeTranslateX }] },
                            ]}
                        >
                            {renderMainTabContent(activeTab)}
                        </Animated.View>
                    </View>

                    <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} onLogout={onLogout} />
                </>
            )}
        </View>
    );
}

