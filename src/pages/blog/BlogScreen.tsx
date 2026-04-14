import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    FlatList,
    KeyboardAvoidingView,
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
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';
import { blogService } from '../../api';
import { BlogPostCard, DisplayPost, ReactionType } from '../../components/blog/BlogPostCard';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

// ─── Mood filter options (matching web) ───
const MOOD_OPTIONS: { value: string; label: string; icon: string; color: string }[] = [
    { value: 'all', label: 'Tất cả', icon: 'apps', color: '#64748B' },
    { value: 'happy', label: 'Vui vẻ', icon: 'happy', color: '#F59E0B' },
    { value: 'sad', label: 'Buồn', icon: 'sad', color: '#3B82F6' },
    { value: 'chill', label: 'Chill', icon: 'cafe', color: '#10B981' },
    { value: 'hype', label: 'Hype', icon: 'flame', color: '#EF4444' },
    { value: 'energetic', label: 'Năng động', icon: 'flash', color: '#F97316' },
    { value: 'romantic', label: 'Lãng mạn', icon: 'heart', color: '#EC4899' },
    { value: 'focus', label: 'Tập trung', icon: 'headset', color: '#8B5CF6' },
];

const PAGE_SIZE = 10;

/** Normalize shareMusic from API response */
function normalizeShareMusic(post: any) {
    let candidateShareMusic = post.shareMusic || post.share_music || post.sharedMusic;
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
            } catch (e) { }
        }
    }

    let normalizedShareMusic = null;
    if (candidateShareMusic) {
        if (typeof candidateShareMusic === 'string') {
            try {
                normalizedShareMusic = JSON.parse(candidateShareMusic);
            } catch (e) {
                normalizedShareMusic = null;
            }
        } else if (typeof candidateShareMusic === 'object') {
            normalizedShareMusic = candidateShareMusic;
        }
    }

    return { normalizedShareMusic, inferredPostType };
}

interface BlogScreenProps {
    onNavigateToCreatePost?: () => void;
    onNavigateToPostDetail?: (postId: string) => void;
    paddingTop?: number;
    paddingBottom?: number;
    hideStickyHeader?: boolean;
    onScroll?: any;
}

export default function BlogScreen({
    onNavigateToCreatePost,
    onNavigateToPostDetail,
    paddingTop = 0,
    paddingBottom = 0,
    hideStickyHeader = false,
    onScroll,
}: BlogScreenProps) {
    const { isDarkMode } = useTheme();
    const { user } = useUser();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;

    // ─── State ───
    const [allPosts, setAllPosts] = useState<DisplayPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [activeMood, setActiveMood] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            if (onScroll) {
                onScroll.onScroll(event);
            }
            scrollY.value = event.contentOffset.y;
        },
        onBeginDrag: (event) => {
            if (onScroll?.onBeginDrag) {
                onScroll.onBeginDrag(event);
            }
        },
    });

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: scrollY.value > 50 ? 1 : 0,
    }));

    // ─── Local search filtering (by author name, matching web) ───
    const filteredPosts = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return allPosts;
        return allPosts.filter((p) =>
            (p.userFullName ?? '').toLowerCase().includes(query),
        );
    }, [searchText, allPosts]);

    // ─── Fetch posts ───
    const [globalScrollEnabled, setGlobalScrollEnabled] = useState(true);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('GlobalScrollEnabled', (enabled: boolean) => {
            setGlobalScrollEnabled(enabled);
        });

        const reactSub = DeviceEventEmitter.addListener('PostReactionUpdated', ({ postId, newReaction }) => {
            // Update the display optimistically from other screens
            setAllPosts((prevPosts) =>
                prevPosts.map((post) => {
                    if (post.id !== postId) return post;
                    const currentReaction = post.myReactionType ?? (post.isLiked ? 'like' : null);
                    if (currentReaction === newReaction) return post; // No change needed

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

    const fetchPosts = useCallback(async (targetPage: number, refresh = false) => {
        if (!refresh) setIsLoading(true);
        try {
            const params: any = { page: targetPage, pageSize: PAGE_SIZE };
            if (activeMood !== 'all') {
                params.moodTag = activeMood;
            }

            const response = await blogService.getPublishedPosts(params);

            if (response.success && response.data) {
                const normalizedPosts: DisplayPost[] = (response.data.items || []).map((post: any) => {
                    const { normalizedShareMusic, inferredPostType } = normalizeShareMusic(post);

                    return {
                        ...post,
                        postType: inferredPostType || post.postType || null,
                        imageUrl: post.imageUrl ?? post.imgUrl ?? null,
                        shareMusic: normalizedShareMusic,
                        reactionCount: Number.isFinite(post.reactionCount) ? post.reactionCount : 0,
                        commentCount: Number.isFinite(post.commentCount) ? post.commentCount : 0,
                        viewCount: Number.isFinite(post.viewCount) ? post.viewCount : 0,
                        isLiked: false,
                    };
                });

                setPage(response.data.page || targetPage);
                setTotalPages(response.data.totalPages || 1);
                setTotalCount(response.data.totalCount || 0);

                if (user?.userId) {
                    const enrichedPosts = await Promise.all(
                        normalizedPosts.map(async (post) => {
                            try {
                                const [statsResult, reactionsResult] = await Promise.all([
                                    blogService.getPostStats(post.id),
                                    blogService.getPostReactions(post.id)
                                ]);
                                
                                const stats = statsResult.success && statsResult.data ? statsResult.data : null;
                                const reactions = reactionsResult.success && reactionsResult.data ? reactionsResult.data : [];

                                const userReaction = reactions.find((reaction) => reaction.userId === user.userId);
                                const isLiked = !!userReaction;
                                const myReactionType = userReaction ? (userReaction.reactionType?.toLowerCase() as ReactionType) : null;
                                
                                return { 
                                    ...post, 
                                    reactionCount: stats?.reactionCount ?? post.reactionCount,
                                    commentCount: stats?.commentCount ?? post.commentCount,
                                    viewCount: stats?.viewCount ?? post.viewCount,
                                    isLiked, 
                                    myReactionType 
                                };
                            } catch {
                                return post;
                            }
                        }),
                    );
                    setAllPosts(enrichedPosts);
                } else {
                    setAllPosts(normalizedPosts);
                }
            } else {
                setAllPosts([]);
                setTotalCount(0);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('[BlogScreen] Fetch posts error:', error);
            setAllPosts([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [activeMood, user?.userId]);

    useEffect(() => {
        setPage(1);
        fetchPosts(1);
    }, [activeMood]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchPosts(page, true);
    }, [fetchPosts, page]);

    const handleMoodChange = useCallback((mood: string) => {
        Haptics.selectionAsync();
        setActiveMood(mood);
        setSearchText('');
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;
        Haptics.selectionAsync();
        setPage(newPage);
        fetchPosts(newPage);
    }, [fetchPosts, totalPages]);

    const handleReaction = useCallback(async (postId: string, newReaction: ReactionType | null) => {
        const targetPost = allPosts.find((post) => post.id === postId);
        if (!targetPost) return;

        const currentReaction = targetPost.myReactionType ?? (targetPost.isLiked ? 'like' as ReactionType : null);
        const isRemoving = newReaction === null;

        // Optimistic update
        setAllPosts((prevPosts) =>
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
                await blogService.addReaction(postId, newReaction);
            }
        } catch (error) {
            console.error('[BlogScreen] Reaction error:', error);
            setAllPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post.id === postId
                        ? { ...post, isLiked: targetPost.isLiked, myReactionType: targetPost.myReactionType, reactionCount: targetPost.reactionCount }
                        : post,
                ),
            );
        }
    }, [allPosts]);

    // ─── Render helpers ───
    const activeMoodOption = MOOD_OPTIONS.find((m) => m.value === activeMood);

    const renderMoodFilters = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodFilterScroll}
            style={styles.moodFilterContainer}
        >
            {MOOD_OPTIONS.map((mood) => {
                const isActive = activeMood === mood.value;
                return (
                    <TouchableOpacity
                        key={mood.value}
                        onPress={() => handleMoodChange(mood.value)}
                        style={[
                            styles.moodChip,
                            {
                                backgroundColor: isActive
                                    ? mood.color + '20'
                                    : isDarkMode ? '#1F2937' : '#F3F4F6',
                                borderColor: isActive ? mood.color + '50' : 'transparent',
                            },
                        ]}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={mood.icon as any}
                            size={14}
                            color={isActive ? mood.color : palette.textMuted}
                        />
                        <Text
                            style={[
                                styles.moodChipText,
                                { color: isActive ? mood.color : palette.textMuted },
                            ]}
                        >
                            {mood.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <View style={styles.paginationContainer}>
                <TouchableOpacity
                    style={[
                        styles.pageButton,
                        {
                            backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
                            opacity: page <= 1 ? 0.4 : 1,
                        },
                    ]}
                    onPress={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={16} color={palette.textPrimary} />
                </TouchableOpacity>

                {generatePageNumbers(page, totalPages).map((item, idx) =>
                    item === '...' ? (
                        <Text key={`ellipsis-${idx}`} style={[styles.pageEllipsis, { color: palette.textMuted }]}>…</Text>
                    ) : (
                        <TouchableOpacity
                            key={`page-${item}`}
                            style={[
                                styles.pageButton,
                                {
                                    backgroundColor: page === item ? palette.primary : (isDarkMode ? '#1F2937' : '#F3F4F6'),
                                },
                            ]}
                            onPress={() => handlePageChange(item as number)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.pageButtonText,
                                    { color: page === item ? '#FFFFFF' : palette.textPrimary },
                                ]}
                            >
                                {item}
                            </Text>
                        </TouchableOpacity>
                    ),
                )}

                <TouchableOpacity
                    style={[
                        styles.pageButton,
                        {
                            backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
                            opacity: page >= totalPages ? 0.4 : 1,
                        },
                    ]}
                    onPress={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-forward" size={16} color={palette.textPrimary} />
                </TouchableOpacity>
            </View>
        );
    };

    const renderSkeletons = () => (
        <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.skeletonCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}>
                    <View style={styles.skeletonHeader}>
                        <View style={[styles.skeletonAvatar, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]} />
                        <View style={styles.skeletonLines}>
                            <View style={[styles.skeletonLine, styles.skeletonNameLine, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]} />
                            <View style={[styles.skeletonLine, styles.skeletonTimeLine, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]} />
                        </View>
                    </View>
                    <View style={styles.skeletonBody}>
                        <View style={[styles.skeletonLine, styles.skeletonTitleLine, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]} />
                        <View style={[styles.skeletonLine, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]} />
                        <View style={[styles.skeletonLine, styles.skeletonShortLine, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]} />
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            {!hideStickyHeader && (
                <Animated.View style={[styles.stickyHeader, headerAnimatedStyle]}>
                    <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <Text style={[styles.stickyTitle, { color: palette.textPrimary }]}>Cộng đồng</Text>
                </Animated.View>
            )}

            <Animated.FlatList
                data={filteredPosts}
                keyExtractor={(item) => item.id}
                onScroll={onScroll || scrollHandler}
                scrollEventThrottle={16}
                scrollEnabled={globalScrollEnabled}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => (
                    <View style={[styles.listHeader, { paddingTop: 10 + paddingTop }]}>
                        {/* Title */}
                        <View style={styles.titleSection}>
                            <Text style={[styles.screenTitle, { color: palette.textPrimary }]}>Cộng đồng</Text>
                            <Text style={[styles.screenSubtitle, { color: palette.textMuted }]}>
                                Khám phá những bài viết mới nhất từ cộng đồng SoundMates
                            </Text>
                        </View>

                        {/* Search bar */}
                        <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6', borderColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
                            <Ionicons name="search" size={16} color={palette.textMuted} />
                            <TextInput
                                style={[styles.searchInput, { color: palette.textPrimary }]}
                                placeholder="Tìm kiếm theo tên tác giả..."
                                placeholderTextColor={palette.textMuted}
                                value={searchText}
                                onChangeText={setSearchText}
                                returnKeyType="search"
                            />
                            {searchText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="close-circle" size={18} color={palette.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Stats bar */}
                        {totalCount > 0 && (
                            <View style={styles.statsBar}>
                                <Ionicons name="musical-notes" size={13} color={palette.primary} />
                                <Text style={[styles.statsText, { color: palette.textSecondary }]}>
                                    {totalCount} bài viết
                                </Text>
                                <View style={[styles.statsDot, { backgroundColor: palette.textMuted }]} />
                                <Text style={[styles.statsText, { color: palette.textSecondary }]}>
                                    Cộng đồng SoundMates
                                </Text>
                            </View>
                        )}

                        {/* Mood Filters */}
                        {renderMoodFilters()}

                        {/* Toolbar */}
                        <View style={styles.toolbar}>
                            <Text style={[styles.toolbarInfo, { color: palette.textMuted }]}>
                                {isLoading
                                    ? 'Đang tải...'
                                    : `${totalCount} bài viết${activeMood !== 'all' ? ` · ${activeMoodOption?.label || activeMood}` : ''}${searchText ? ` · "${searchText}"` : ''}`}
                            </Text>
                            <TouchableOpacity
                                style={[styles.refreshButton, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}
                                onPress={handleRefresh}
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="refresh" size={16} color={palette.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                renderItem={({ item }) => (
                    <BlogPostCard
                        post={item}
                        onReaction={(type) => handleReaction(item.id, type)}
                        onNavigateToDetail={onNavigateToPostDetail}
                    />
                )}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 + paddingBottom }]}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={palette.primary} />
                }
                ListFooterComponent={
                    !isLoading && filteredPosts.length > 0 ? renderPagination() : null
                }
                ListEmptyComponent={
                    isLoading ? (
                        renderSkeletons()
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconWrapper, { backgroundColor: palette.primary + '15' }]}>
                                <Ionicons name="musical-notes" size={40} color={palette.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Không tìm thấy bài viết</Text>
                            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                                Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm
                            </Text>
                        </View>
                    )
                }
            />

            {/* FAB - Create Post */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: palette.primary, bottom: 100 + paddingBottom }]}
                onPress={onNavigateToCreatePost}
            >
                <LinearGradient
                    colors={[palette.primary, palette.primaryDark]}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

/** Generate page numbers with ellipsis */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
    const pages: (number | '...')[] = [];
    const allPages = Array.from({ length: total }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === total || Math.abs(p - current) <= 1);

    for (let i = 0; i < allPages.length; i++) {
        if (i > 0 && allPages[i] - allPages[i - 1] > 1) {
            pages.push('...');
        }
        pages.push(allPages[i]);
    }

    return pages;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        zIndex: 10,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 15,
    },
    stickyTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    listContent: {
        paddingBottom: 100,
    },
    listHeader: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    titleSection: {
        marginBottom: 16,
    },
    screenTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
    },
    screenSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
        lineHeight: 20,
    },
    // ─── Search ───
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        padding: 0,
    },
    // ─── Stats bar ───
    statsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 14,
    },
    statsText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statsDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
    },
    // ─── Mood filter ───
    moodFilterContainer: {
        marginBottom: 12,
    },
    moodFilterScroll: {
        gap: 8,
        paddingRight: 8,
    },
    moodChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
    },
    moodChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    // ─── Toolbar ───
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    toolbarInfo: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    refreshButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ─── Pagination ───
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    pageButton: {
        minWidth: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    pageButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    pageEllipsis: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 4,
    },
    // ─── Skeleton loading ───
    skeletonContainer: {
        paddingHorizontal: 16,
        gap: 14,
    },
    skeletonCard: {
        borderRadius: 16,
        padding: 16,
        gap: 14,
    },
    skeletonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    skeletonAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    skeletonLines: {
        flex: 1,
        gap: 6,
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
        width: '100%',
    },
    skeletonNameLine: {
        width: '40%',
    },
    skeletonTimeLine: {
        width: '25%',
        height: 10,
    },
    skeletonBody: {
        gap: 8,
    },
    skeletonTitleLine: {
        width: '70%',
        height: 14,
    },
    skeletonShortLine: {
        width: '50%',
    },
    // ─── Empty state ───
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 12,
        paddingHorizontal: 40,
    },
    emptyIconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 20,
    },
    // ─── FAB ───
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
