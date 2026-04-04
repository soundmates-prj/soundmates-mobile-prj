import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Text,
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
import { BlogPostCard } from '../../components/blog/BlogPostCard';
import { useTheme } from '../../context/ThemeContext';

type TabType = 'trending' | 'newest' | 'following';

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
    onScroll
}: BlogScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
    const [activeTab, setActiveTab] = useState<TabType>('trending');
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
        }
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: scrollY.value > 50 ? 1 : 0,
        };
    });

    const fetchPosts = useCallback(async (refresh = false) => {
        if (!refresh) setIsLoading(true);
        try {
            const response = activeTab === 'trending'
                ? await blogService.getPopularPosts({ page: 1, pageSize: 20 })
                : await blogService.getPublishedPosts({ page: 1, pageSize: 20 });

            if (response.success) {
                setPosts(response.data?.items || []);
            }
        } catch (error) {
            console.error('Fetch posts error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchPosts(true);
    };

    const handleTabChange = (tab: TabType) => {
        Haptics.selectionAsync();
        setActiveTab(tab);
    };

    const handleLike = async (postId: string) => {
        try {
            await blogService.addReaction(postId, 'like');
        } catch (error) {
            console.error('Like post error:', error);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            {!hideStickyHeader && (
                <Animated.View style={[styles.stickyHeader, headerAnimatedStyle]}>
                    <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <Text style={[styles.stickyTitle, { color: palette.textPrimary }]}>Cộng đồng</Text>
                </Animated.View>
            )}

            <Animated.FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                onScroll={onScroll || scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={() => (
                    <View style={[styles.listHeader, { paddingTop: 10 + paddingTop }]}>
                        <View style={styles.featuredSection}>
                            <Text style={[styles.screenTitle, { color: palette.textPrimary }]}>Cộng đồng</Text>
                            <Text style={[styles.screenSubtitle, { color: palette.textMuted }]}>Khám phá âm nhạc & câu chuyện mới</Text>
                        </View>

                        <View style={styles.tabsWrapper}>
                            {(['trending', 'newest', 'following'] as TabType[]).map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => handleTabChange(tab)}
                                    style={[
                                        styles.tabItem,
                                        activeTab === tab && { backgroundColor: palette.primary }
                                    ]}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        { color: activeTab === tab ? '#FFF' : palette.textMuted }
                                    ]}>
                                        {tab === 'trending' ? 'Thịnh hành' : tab === 'newest' ? 'Mới nhất' : 'Đang theo dõi'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
                renderItem={({ item }) => (
                    <BlogPostCard
                        post={item}
                        onLike={() => handleLike(item.id)}
                        onNavigateToDetail={onNavigateToPostDetail}
                    />
                )}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 + paddingBottom }]}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={palette.primary} />
                }
                ListEmptyComponent={
                    isLoading ? (
                        <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 50 }} />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="newspaper-outline" size={64} color={palette.textMuted} />
                            <Text style={[styles.emptyText, { color: palette.textMuted }]}>Chưa có bài viết nào</Text>
                        </View>
                    )
                }
            />

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
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    featuredSection: {
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
    },
    tabsWrapper: {
        flexDirection: 'row',
        gap: 10,
    },
    tabItem: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        gap: 15,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
    },
    fabGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
