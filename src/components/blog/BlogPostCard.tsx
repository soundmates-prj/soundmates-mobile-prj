import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { blogService } from '../../api';

export interface SharedMusic {
    trackId: string;
    title: string;
    artist: string;
    albumImage?: string | null;
    previewUrl?: string | null;
    template?: string | null;
}

export interface DisplayPost {
    id: string;
    userId: string;
    userFullName?: string;
    userAvatarUrl?: string;
    title: string;
    contentText: string;
    /** API may return 'imageUrl' or 'imgUrl' */
    imageUrl?: string | null;
    imgUrl?: string | null;
    audioUrl?: string | null;
    moodTag?: string | null;
    postType?: string | null;
    shareMusic?: SharedMusic | null;
    status: string;
    createdAt: string;
    publishedAt?: string | null;
    reactionCount: number;
    commentCount: number;
    viewCount: number;
    isLiked: boolean;
}

export function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;

    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} giờ trước`;

    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `${diffWeeks} tuần trước`;

    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} tháng trước`;
}

export function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

export interface BlogPostCardProps {
    post: DisplayPost;
    onLike: () => void;
    onNavigateToDetail?: (postId: string) => void;
    showOwnerActions?: boolean;
    onEdit?: (postId: string) => void;
    onDelete?: (postId: string) => void;
}

export function BlogPostCard({ post, onLike, onNavigateToDetail, showOwnerActions = false, onEdit, onDelete }: BlogPostCardProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
    const [isLikedLocal, setIsLikedLocal] = useState(post.isLiked);
    const [likeCountLocal, setLikeCountLocal] = useState(post.reactionCount);

    const displayName = post.userFullName || post.userId.substring(0, 10);
    const avatarUri = post.userAvatarUrl
        || `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1`;

    // Animation for like button
    const likeScale = useSharedValue(1);

    const handleLikePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        likeScale.value = withSpring(1.5, {}, () => {
            likeScale.value = withSpring(1);
        });
        setIsLikedLocal(!isLikedLocal);
        setLikeCountLocal(prev => isLikedLocal ? prev - 1 : prev + 1);
        onLike();
    }, [isLikedLocal, likeScale, onLike]);

    const likeAnimationStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    return (
        <View style={[styles.card, { backgroundColor: palette.surface, ...palette.shadow.small }]}>
            {/* Header: Avatar & User Info */}
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatar}
                    />
                    <View>
                        <Text style={[styles.username, { color: palette.textPrimary }]}>
                            {displayName}
                        </Text>
                        <Text style={[styles.timeAgo, { color: palette.textMuted }]}>
                            {formatTimeAgo(post.publishedAt || post.createdAt)}
                        </Text>
                    </View>
                </View>
                {showOwnerActions ? (
                    <TouchableOpacity style={styles.moreButton} onPress={() => onEdit?.(post.id)}>
                        <Ionicons name="ellipsis-horizontal" size={20} color={palette.textMuted} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.moreButton}>
                        <Ionicons name="flag-outline" size={18} color={palette.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content: Image or Text */}
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => onNavigateToDetail?.(post.id)}
                style={styles.contentContainer}
            >
                {(post.imageUrl || post.imgUrl) ? (
                    <View style={styles.imageWrapper}>
                        <Image source={{ uri: post.imageUrl || post.imgUrl! }} style={styles.postImage} resizeMode="cover" />
                        {post.moodTag && (
                            <BlurView intensity={60} tint="dark" style={styles.tagBadge}>
                                <Text style={styles.tagText}>#{post.moodTag}</Text>
                            </BlurView>
                        )}
                        {post.audioUrl && (
                            <View style={styles.audioIndicator}>
                                <Ionicons name="musical-notes" size={14} color="#FFF" />
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={[styles.textOnlyContent, { backgroundColor: palette.primary + '05' }]}>
                        <Text style={[styles.textTitle, { color: palette.textPrimary }]}>{post.title}</Text>
                        <Text style={[styles.textContent, { color: palette.textSecondary }]} numberOfLines={4}>
                            {post.contentText}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Actions: Like, Comment, Share */}
            <View style={styles.actionsBar}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={handleLikePress} style={styles.actionButton}>
                        <Animated.View style={likeAnimationStyle}>
                            <Ionicons
                                name={isLikedLocal ? "heart" : "heart-outline"}
                                size={26}
                                color={isLikedLocal ? "#FF3B30" : palette.textPrimary}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => onNavigateToDetail?.(post.id)}>
                        <Ionicons name="chatbubble-outline" size={24} color={palette.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="paper-plane-outline" size={24} color={palette.textPrimary} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="bookmark-outline" size={24} color={palette.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Bottom Info: Likes & Caption */}
            <View style={styles.cardFooter}>
                <Text style={[styles.likesCount, { color: palette.textPrimary }]}>
                    {formatNumber(likeCountLocal)} lượt thích
                </Text>
                {(post.imageUrl || post.imgUrl) && (
                    <View style={styles.captionRow}>
                        <Text style={[styles.captionUsername, { color: palette.textPrimary }]}>
                            {displayName}{' '}
                            <Text style={[styles.captionText, { color: palette.textSecondary }]}>
                                {post.title}
                            </Text>
                        </Text>
                    </View>
                )}
                {post.commentCount > 0 && (
                    <TouchableOpacity onPress={() => onNavigateToDetail?.(post.id)}>
                        <Text style={[styles.viewComments, { color: palette.textMuted }]}>
                            Xem tất cả {post.commentCount} bình luận
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 10,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
    },
    username: {
        fontSize: 14,
        fontWeight: '700',
    },
    timeAgo: {
        fontSize: 11,
    },
    moreButton: {
        padding: 4,
    },
    contentContainer: {
        width: '100%',
    },
    imageWrapper: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#F3F4F6',
        position: 'relative',
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    tagBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        overflow: 'hidden',
    },
    tagText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    audioIndicator: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textOnlyContent: {
        padding: 20,
        minHeight: 150,
        justifyContent: 'center',
    },
    textTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    textContent: {
        fontSize: 15,
        lineHeight: 22,
    },
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
    },
    cardFooter: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    likesCount: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
    },
    captionRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    captionUsername: {
        fontSize: 14,
        fontWeight: '700',
    },
    captionText: {
        fontWeight: '400',
    },
    viewComments: {
        fontSize: 14,
        marginTop: 4,
    },
});
