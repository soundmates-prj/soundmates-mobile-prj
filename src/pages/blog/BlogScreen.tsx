import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
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
import {
    blogService,
    BlogPostResponse,
    TrendingPostResponse,
    PopularPostResponse,
    PostStatsResponse,
} from '../../api';
import { useUser } from '../../context/UserContext';

import { BlogPostCard, DisplayPost } from '../../components/blog/BlogPostCard';

type BlogTab = 'all' | 'trending' | 'popular';

interface BlogTabItem {
    id: BlogTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap | null;
}

const TABS: BlogTabItem[] = [
    { id: 'all', label: 'Tất cả', icon: null },
    { id: 'trending', label: 'Thịnh hành', icon: 'trending-up' },
    { id: 'popular', label: 'Phổ biến', icon: 'flame' },
];

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

// ─────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────

interface BlogScreenProps {
    onNavigateToCreatePost?: () => void;
    onNavigateToPostDetail?: (postId: string) => void;
}

// ─────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────

export default function BlogScreen({ onNavigateToCreatePost, onNavigateToPostDetail }: BlogScreenProps) {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<BlogTab>('all');
    const [posts, setPosts] = useState<DisplayPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // ───── Fetch data ─────

    const fetchPosts = useCallback(async (tab: BlogTab, pageNum: number = 1, refresh: boolean = false) => {
        if (refresh) setIsRefreshing(true);
        else if (pageNum === 1) setIsLoading(true);

        try {
            let displayPosts: DisplayPost[] = [];

            if (tab === 'trending') {
                const result = await blogService.getTrendingPosts({ page: pageNum, pageSize: 10 });
                if (result.success && result.data) {
                    displayPosts = result.data.items.map((p: TrendingPostResponse) => ({
                        id: p.id,
                        userId: p.userId,
                        title: p.title,
                        contentText: p.contentText,
                        imageUrl: p.imgUrl,
                        audioUrl: p.audioUrl,
                        moodTag: p.moodTag,
                        status: p.status,
                        createdAt: p.createdAt,
                        publishedAt: p.publishedAt,
                        reactionCount: p.reactionCount,
                        commentCount: p.commentCount,
                        viewCount: 0,
                        isLiked: false,
                    }));
                    setTotalPages(result.data.totalPages);
                }
            } else if (tab === 'popular') {
                const result = await blogService.getPopularPosts({ page: pageNum, pageSize: 10 });
                if (result.success && result.data) {
                    displayPosts = result.data.items.map((p: PopularPostResponse) => ({
                        id: p.id,
                        userId: p.userId,
                        title: p.title,
                        contentText: p.contentText,
                        imageUrl: p.imgUrl,
                        audioUrl: p.audioUrl,
                        moodTag: p.moodTag,
                        status: p.status,
                        createdAt: p.createdAt,
                        publishedAt: p.publishedAt,
                        reactionCount: p.reactionCount,
                        commentCount: p.commentCount,
                        viewCount: 0,
                        isLiked: false,
                    }));
                    setTotalPages(result.data.totalPages);
                }
            } else {
                // 'all' => published posts
                const result = await blogService.getPublishedPosts({ page: pageNum, pageSize: 10 });
                if (result.success && result.data) {
                    displayPosts = result.data.items.map((p: BlogPostResponse) => ({
                        id: p.id,
                        userId: p.userId,
                        title: p.title,
                        contentText: p.contentText,
                        imageUrl: p.imageUrl,
                        audioUrl: p.audioUrl,
                        moodTag: p.moodTag,
                        status: p.status,
                        createdAt: p.createdAt,
                        publishedAt: p.publishedAt,
                        reactionCount: 0,
                        commentCount: 0,
                        viewCount: 0,
                        isLiked: false,
                    }));
                    setTotalPages(result.data.totalPages);
                }
            }

            // Fetch stats and/or reactions for each post in parallel
            if (displayPosts.length > 0) {
                const enhancePromises = displayPosts.map(async (dp) => {
                    try {
                        const promises: any[] = [blogService.getPostReactions(dp.id)];
                        // 'all' tab also needs stats
                        if (tab === 'all') {
                            promises.push(blogService.getPostStats(dp.id));
                        }
                        
                        const results = await Promise.all(promises);
                        const reactionsResult = results[0];
                        const statResult = results.length > 1 ? results[1] : null;
                        
                        return { 
                            id: dp.id, 
                            stats: statResult?.success ? statResult.data : null,
                            reactions: reactionsResult.success ? reactionsResult.data : []
                        };
                    } catch { /* ignore */ }
                    return null;
                });
                
                const enhanceResults = await Promise.all(enhancePromises);
                enhanceResults.forEach((res) => {
                    if (res) {
                        const idx = displayPosts.findIndex((dp) => dp.id === res.id);
                        if (idx !== -1) {
                            if (res.stats) {
                                displayPosts[idx].reactionCount = res.stats.reactionCount;
                                displayPosts[idx].commentCount = res.stats.commentCount;
                                displayPosts[idx].viewCount = res.stats.viewCount;
                            }
                            if (res.reactions && user) {
                                displayPosts[idx].isLiked = res.reactions.some((r: any) => r.userId === user.userId);
                            }
                        }
                    }
                });
            }

            if (pageNum === 1) {
                setPosts(displayPosts);
            } else {
                setPosts((prev) => [...prev, ...displayPosts]);
            }
            setPage(pageNum);
        } catch (error) {
            console.error('[BlogScreen] fetchPosts error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user]);

    // Initial load + refetch on tab change
    useEffect(() => {
        setPosts([]);
        setPage(1);
        setTotalPages(1);
        fetchPosts(activeTab, 1);
    }, [activeTab, fetchPosts]);

    // Refresh handler
    const handleRefresh = useCallback(() => {
        fetchPosts(activeTab, 1, true);
    }, [activeTab, fetchPosts]);

    // Like handler
    const handleLike = useCallback(async (postId: string) => {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        // Optimistic update
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                        ...p,
                        isLiked: !p.isLiked,
                        reactionCount: p.isLiked ? p.reactionCount - 1 : p.reactionCount + 1,
                    }
                    : p,
            ),
        );

        try {
            let success = false;
            let result;
            if (post.isLiked) {
                result = await blogService.removeReaction(postId);
                success = result.success;
            } else {
                result = await blogService.addReaction(postId, 'like');
                success = result.success;
            }

            if (!success) {
                throw new Error(result?.message || 'Action failed');
            }
        } catch (error) {
            // Revert optimistic update on error
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId
                        ? {
                            ...p,
                            isLiked: post.isLiked,
                            reactionCount: post.reactionCount,
                        }
                        : p,
                ),
            );
            console.error('[BlogScreen] handleLike error:', error);
        }
    }, [posts]);

    // Post created handler
    const handlePostCreated = useCallback(() => {
        fetchPosts(activeTab, 1);
    }, [activeTab, fetchPosts]);

    // ───── Render ─────

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Diễn đàn SoundMates</Text>
                <TouchableOpacity activeOpacity={0.8} style={styles.headerSearchButton}>
                    <Ionicons name="search" size={20} color="#1E293B" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#55C5F1']} />
                }
            >
                {/* Featured banner */}
                <LinearGradient
                    colors={['#55C5F1', '#A78BFA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featuredBanner}
                >
                    <View style={styles.featuredBlob} />
                    <View style={styles.featuredBadgeRow}>
                        <Ionicons name="flame" size={18} color="#FFFFFF" />
                        <Text style={styles.featuredBadgeText}>NỔI BẬT</Text>
                    </View>
                    <Text style={styles.featuredTitle}>Khám phá những bài viết hot nhất tuần này</Text>
                    <Text style={styles.featuredSubtitle}>
                        Cùng cộng đồng SoundMates chia sẻ đam mê âm nhạc qua các bài viết, podcast và playlist
                        độc đáo.
                    </Text>
                </LinearGradient>

                {/* Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContainer}
                    style={styles.tabsScroll}
                >
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id)}
                                activeOpacity={0.85}
                                style={[styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonInactive]}
                            >
                                {tab.icon && (
                                    <Ionicons
                                        name={tab.icon}
                                        size={14}
                                        color={isActive ? '#FFFFFF' : '#6B7280'}
                                        style={styles.tabIcon}
                                    />
                                )}
                                <Text
                                    style={[
                                        styles.tabButtonText,
                                        isActive ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Loading state */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#55C5F1" />
                        <Text style={styles.loadingText}>Đang tải bài viết...</Text>
                    </View>
                )}

                {!isLoading &&
                    posts.map((post) => (
                        <BlogPostCard 
                            key={post.id} 
                            post={post} 
                            onLike={() => handleLike(post.id)} 
                            onNavigateToDetail={onNavigateToPostDetail}
                        />
                    ))}

                {/* Load more */}
                {!isLoading && page < totalPages && posts.length > 0 && (
                    <TouchableOpacity
                        style={styles.loadMoreButton}
                        activeOpacity={0.8}
                        onPress={() => fetchPosts(activeTab, page + 1)}
                    >
                        <Text style={styles.loadMoreText}>Tải thêm bài viết</Text>
                        <Ionicons name="chevron-down" size={16} color="#55C5F1" />
                    </TouchableOpacity>
                )}

                {/* Empty state */}
                {!isLoading && posts.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="newspaper-outline" size={32} color="#D1D5DB" />
                        </View>
                        <Text style={styles.emptyTitle}>Chưa có bài viết</Text>
                        <Text style={styles.emptyDescription}>
                            Chưa có bài viết nào trong danh mục này. Hãy là người đầu tiên chia sẻ!
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onNavigateToCreatePost}
                style={styles.fabButtonWrap}
            >
                <LinearGradient
                    colors={['#55C5F1', '#3BB5E8']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.fabButton}
                >
                    <Ionicons name="add" size={26} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        position: 'relative',
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
        backgroundColor: 'transparent',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    featuredBanner: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        padding: 20,
        position: 'relative',
    },
    featuredBlob: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.10)',
    },
    featuredBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    featuredBadgeText: {
        marginLeft: 8,
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    featuredTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 24,
        marginBottom: 8,
    },
    featuredSubtitle: {
        color: 'rgba(255,255,255,0.90)',
        fontSize: 13,
        lineHeight: 20,
    },
    tabsScroll: {
        marginBottom: 20,
    },
    tabsContainer: {
        paddingHorizontal: 20,
    },
    tabButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    tabButtonActive: {
        backgroundColor: '#55C5F1',
        borderColor: '#55C5F1',
    },
    tabButtonInactive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#1E293B',
    },
    tabIcon: {
        marginRight: 6,
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    tabButtonTextActive: {
        color: '#FFFFFF',
    },
    tabButtonTextInactive: {
        color: '#6B7280',
    },
    // ─ Loading ─
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#9CA3AF',
    },
    // ─ Load more ─
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    loadMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#55C5F1',
        marginRight: 6,
    },
    // ─ Empty ─
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
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
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 8,
    },
    emptyDescription: {
        textAlign: 'center',
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 19,
    },
    // ─ FAB ─
    fabButtonWrap: {
        position: 'absolute',
        right: 28,
        bottom: 96,
        borderRadius: 28,
        shadowColor: '#55C5F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 8,
    },
    fabButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
