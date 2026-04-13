import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

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
    const isDraftPost = post.status?.toLowerCase?.() === 'draft';
    const [isLikedLocal, setIsLikedLocal] = useState(post.isLiked);
    const [likeCountLocal, setLikeCountLocal] = useState(post.reactionCount);
    const [showOwnerMenu, setShowOwnerMenu] = useState(false);

    useEffect(() => {
        setIsLikedLocal(post.isLiked);
        setLikeCountLocal(post.reactionCount);
        setShowOwnerMenu(false);
    }, [post.id, post.isLiked, post.reactionCount]);

    const displayName = post.userFullName;
    const avatarUri = post.userAvatarUrl
        || `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1`;

    // Animation for like button
    const likeScale = useSharedValue(1);

    const handleLikePress = useCallback(() => {
        setShowOwnerMenu(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        likeScale.value = withSpring(1.5, {}, () => {
            likeScale.value = withSpring(1);
        });
        setIsLikedLocal(!isLikedLocal);
        setLikeCountLocal(prev => isLikedLocal ? prev - 1 : prev + 1);
        onLike();
    }, [isLikedLocal, likeScale, onLike]);

    const handleNavigateToDetail = useCallback(() => {
        setShowOwnerMenu(false);

        if (isDraftPost && onEdit) {
            onEdit(post.id);
            return;
        }

        onNavigateToDetail?.(post.id);
    }, [isDraftPost, onEdit, onNavigateToDetail, post.id]);

    const handleOwnerMenuEdit = useCallback(() => {
        setShowOwnerMenu(false);
        onEdit?.(post.id);
    }, [onEdit, post.id]);

    const handleOwnerMenuDelete = useCallback(() => {
        setShowOwnerMenu(false);
        onDelete?.(post.id);
    }, [onDelete, post.id]);

    const likeAnimationStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    return (
        <View
            style={[
                styles.card,
                isDraftPost ? styles.draftCard : null,
                {
                    backgroundColor: palette.surface,
                    borderColor: isDraftPost ? '#F59E0B' : palette.border,
                    ...palette.shadow.small,
                },
            ]}
        >
            {/* Header: Avatar & User Info */}
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatar}
                    />
                    <View>
                        <View style={styles.usernameRow}>
                            <Text style={[styles.username, { color: palette.textPrimary }]}>
                                {displayName}
                            </Text>
                            {isDraftPost && (
                                <View style={styles.draftBadge}>
                                    <Ionicons name="document-text-outline" size={12} color="#B45309" />
                                    <Text style={styles.draftBadgeText}>Nháp</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.timeAgo, { color: isDraftPost ? '#B45309' : palette.textMuted }]}>
                            {isDraftPost ? 'Chưa đăng công khai' : formatTimeAgo(post.publishedAt || post.createdAt)}
                        </Text>
                    </View>
                </View>
                {showOwnerActions ? (
                    <View style={styles.ownerActionsWrap}>
                        <TouchableOpacity
                            style={styles.moreButton}
                            onPress={() => setShowOwnerMenu((prev) => !prev)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="ellipsis-horizontal" size={20} color={palette.textMuted} />
                        </TouchableOpacity>

                        {showOwnerMenu && (
                            <View style={[styles.ownerMenu, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                                <TouchableOpacity style={styles.ownerMenuItem} activeOpacity={0.8} onPress={handleOwnerMenuEdit}>
                                    <Ionicons name="create-outline" size={16} color={palette.textPrimary} />
                                    <Text style={[styles.ownerMenuItemText, { color: palette.textPrimary }]}>Chỉnh sửa</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.ownerMenuItem} activeOpacity={0.8} onPress={handleOwnerMenuDelete}>
                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                    <Text style={[styles.ownerMenuItemText, { color: '#EF4444' }]}>Xóa</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : (
                    <TouchableOpacity style={styles.moreButton}>
                        <Ionicons name="flag-outline" size={18} color={palette.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {showOwnerMenu && (
                <Pressable style={styles.ownerMenuBackdrop} onPress={() => setShowOwnerMenu(false)} />
            )}

            {/* Content: Image or Text */}
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={handleNavigateToDetail}
                style={styles.contentContainer}
            >
                {(post.postType?.toLowerCase() === 'share-music' || post.postType?.toLowerCase() === 'sharemusic' || !!post.shareMusic) && post.shareMusic ? (
                    <View style={styles.shareMusicContainer}>
                        {!!post.title && (
                            <Text style={[styles.imagePostTitle, { color: palette.textPrimary, paddingHorizontal: 14, paddingBottom: 10 }]} numberOfLines={2}>
                                {post.title}
                            </Text>
                        )}
                        <View style={[styles.shareMusicCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}>
                            {post.shareMusic.albumImage ? (
                                <Image source={{ uri: post.shareMusic.albumImage }} style={styles.shareMusicImage} />
                            ) : (
                                <View style={[styles.shareMusicImage, { backgroundColor: palette.primary + '30', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="musical-notes" size={24} color={palette.primary} />
                                </View>
                            )}
                            <View style={styles.shareMusicInfo}>
                                <Text style={[styles.shareMusicSongTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                                    {post.shareMusic.title}
                                </Text>
                                <Text style={[styles.shareMusicArtist, { color: palette.textSecondary }]} numberOfLines={1}>
                                    {post.shareMusic.artist}
                                </Text>
                            </View>
                            <View style={[styles.shareMusicPlayBtn, { backgroundColor: palette.primary }]}>
                                <Ionicons name="play" size={18} color="#FFFFFF" />
                            </View>
                        </View>
                    </View>
                ) : (post.imageUrl || post.imgUrl) ? (
                    <>
                        <View style={styles.imagePostMeta}>
                            <Text style={[styles.imagePostTitle, { color: palette.textPrimary }]} numberOfLines={2}>
                                {post.title}
                            </Text>
                            {!!post.contentText && (
                                <Text style={[styles.imagePostContent, { color: palette.textSecondary }]} numberOfLines={3}>
                                    {post.contentText}
                                </Text>
                            )}
                            {!!post.moodTag && (
                                <View style={[styles.imagePostTag, { backgroundColor: palette.primary + '18' }]}>
                                    <Text style={[styles.imagePostTagText, { color: palette.primary }]}>#{post.moodTag}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.imageWrapper}>
                            <Image source={{ uri: post.imageUrl || post.imgUrl! }} style={styles.postImage} resizeMode="cover" />
                            {post.audioUrl && (
                                <View style={styles.audioIndicator}>
                                    <Ionicons name="musical-notes" size={14} color="#FFF" />
                                </View>
                            )}
                        </View>
                    </>
                ) : (
                    <View style={[styles.textOnlyContent, { backgroundColor: palette.primary + '05' }]}>
                        <Text style={[styles.textTitle, { color: palette.textPrimary }]}>{post.title}</Text>
                        <Text style={[styles.textContent, { color: palette.textSecondary }]} numberOfLines={4}>
                            {post.contentText}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {isDraftPost ? (
                <View style={styles.draftFooter}>
                    <View style={styles.draftHintRow}>
                        <Ionicons name="information-circle-outline" size={14} color="#B45309" />
                        <Text style={styles.draftHintText}>Bài viết đang ở trạng thái nháp và chưa hiển thị công khai.</Text>
                    </View>
                    <TouchableOpacity style={styles.draftContinueButton} onPress={handleOwnerMenuEdit} activeOpacity={0.85}>
                        <Ionicons name="create-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.draftContinueButtonText}>Tiếp tục chỉnh sửa</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Actions: Like, Comment, Share */}
                    <View style={styles.actionsBar}>
                        <View style={styles.leftActions}>
                            <TouchableOpacity onPress={handleLikePress} style={styles.actionButton}>
                                <Animated.View style={likeAnimationStyle}>
                                    <Ionicons
                                        name={isLikedLocal ? "thumbs-up" : "thumbs-up-outline"}
                                        size={26}
                                        color={isLikedLocal ? "#2563EB" : palette.textPrimary}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToDetail}>
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
                        {/* {(post.imageUrl || post.imgUrl) && (
                            <View style={styles.captionRow}>
                                <Text style={[styles.captionUsername, { color: palette.textPrimary }]}>
                                    {displayName}{' '}
                                    <Text style={[styles.captionText, { color: palette.textSecondary }]}> 
                                        {post.title}
                                    </Text>
                                </Text>
                            </View>
                        )} */}
                        {post.commentCount > 0 && (
                            <TouchableOpacity onPress={handleNavigateToDetail}>
                                <Text style={[styles.viewComments, { color: palette.textMuted }]}>
                                    Xem tất cả {post.commentCount} bình luận
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    draftCard: {
        borderStyle: 'dashed',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F3F4F6',
    },
    username: {
        fontSize: 14,
        fontWeight: '700',
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    draftBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    draftBadgeText: {
        color: '#B45309',
        fontSize: 11,
        fontWeight: '700',
    },
    timeAgo: {
        fontSize: 12,
    },
    moreButton: {
        padding: 4,
    },
    ownerActionsWrap: {
        position: 'relative',
        zIndex: 12,
    },
    ownerMenuBackdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    ownerMenu: {
        position: 'absolute',
        top: 30,
        right: 0,
        minWidth: 138,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 4,
        zIndex: 14,
        shadowColor: '#000000',
        shadowOpacity: 0.14,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    ownerMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    ownerMenuItemText: {
        fontSize: 14,
        fontWeight: '600',
    },
    draftFooter: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        gap: 10,
    },
    draftHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    draftHintText: {
        flex: 1,
        color: '#B45309',
        fontSize: 12,
        lineHeight: 17,
    },
    draftContinueButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F59E0B',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    draftContinueButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    contentContainer: {
        width: '100%',
    },
    imagePostMeta: {
        paddingHorizontal: 14,
        paddingBottom: 10,
        gap: 6,
    },
    imagePostTitle: {
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 22,
    },
    imagePostContent: {
        fontSize: 14,
        lineHeight: 20,
    },
    imagePostTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    imagePostTagText: {
        fontSize: 12,
        fontWeight: '700',
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
        padding: 18,
        minHeight: 150,
        justifyContent: 'center',
    },
    textTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 8,
    },
    textContent: {
        fontSize: 15,
        lineHeight: 23,
    },
    shareMusicContainer: {
        paddingBottom: 10,
    },
    shareMusicCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 14,
        padding: 10,
        borderRadius: 12,
        gap: 12,
    },
    shareMusicImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
    },
    shareMusicInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    shareMusicSongTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    shareMusicArtist: {
        fontSize: 14,
    },
    shareMusicPlayBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 3,
    },
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
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
        paddingBottom: 14,
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
