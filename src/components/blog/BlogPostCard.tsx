import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export interface DisplayPost {
    id: string;
    userId: string;
    title: string;
    contentText: string;
    imageUrl?: string | null;
    audioUrl?: string | null;
    moodTag?: string | null;
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
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const [showOwnerMenu, setShowOwnerMenu] = React.useState(false);

    const handleOpenOwnerMenu = () => {
        if (!showOwnerActions) return;
        setShowOwnerMenu((prev) => !prev);
    };

    const handleNavigateDetail = () => {
        setShowOwnerMenu(false);
        onNavigateToDetail?.(post.id);
    };

    const handleLikePress = () => {
        setShowOwnerMenu(false);
        onLike();
    };

    const handleEditPress = () => {
        setShowOwnerMenu(false);
        onEdit?.(post.id);
    };

    const handleDeletePress = () => {
        setShowOwnerMenu(false);
        onDelete?.(post.id);
    };

    return (
        <View style={[styles.postCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            {post.imageUrl ? (
                <View style={styles.postImageWrap}>
                    <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                    {post.moodTag && (
                        <View style={styles.postTypeTagWrap}>
                            <View style={[styles.postTypeTag, { backgroundColor: palette.primary }]}>
                                <Text style={styles.postTypeTagText}>#{post.moodTag}</Text>
                            </View>
                        </View>
                    )}
                    {post.audioUrl && (
                        <TouchableOpacity activeOpacity={0.8} style={styles.postPlayButton}>
                            <Ionicons name="play" size={18} color={palette.textPrimary} style={styles.postPlayIcon} />
                        </TouchableOpacity>
                    )}
                </View>
            ) : null}

            <View style={styles.postContent}>
                <View style={styles.postAuthorRow}>
                    <Image
                        source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1` }}
                        style={styles.postAuthorAvatar}
                    />
                    <View style={styles.postAuthorInfo}>
                        <View style={styles.postAuthorNameRow}>
                            <Text style={[styles.postAuthorName, { color: palette.textPrimary }]} numberOfLines={1}>
                                {post.userId.substring(0, 8)}...
                            </Text>
                        </View>
                    </View>

                    <View style={styles.postHeaderRight}>
                        <View style={styles.postTimeRow}>
                            <Ionicons name="time-outline" size={12} color={palette.textMuted} />
                            <Text style={styles.postTimeText}>
                                {formatTimeAgo(post.publishedAt || post.createdAt)}
                            </Text>
                        </View>

                        {showOwnerActions && (
                            <View style={styles.ownerActionWrap}>
                                <TouchableOpacity
                                    activeOpacity={0.75}
                                    onPress={handleOpenOwnerMenu}
                                    style={styles.ownerActionButton}
                                >
                                    <Ionicons name="ellipsis-horizontal" size={16} color={palette.textSecondary} />
                                </TouchableOpacity>

                                {showOwnerMenu && (
                                    <View style={[styles.ownerActionMenu, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                                        <TouchableOpacity style={styles.ownerActionMenuItem} activeOpacity={0.75} onPress={handleEditPress}>
                                            <Ionicons name="create-outline" size={14} color={palette.textPrimary} />
                                            <Text style={[styles.ownerActionMenuText, { color: palette.textPrimary }]}>Cập nhật</Text>
                                        </TouchableOpacity>
                                        <View style={styles.ownerActionDivider} />
                                        <TouchableOpacity style={styles.ownerActionMenuItem} activeOpacity={0.75} onPress={handleDeletePress}>
                                            <Ionicons name="trash-outline" size={14} color="#DC2626" />
                                            <Text style={[styles.ownerActionMenuText, styles.ownerActionMenuTextDanger]}>Xóa</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={handleNavigateDetail}>
                    <Text style={[styles.postTitle, { color: palette.textPrimary }]} numberOfLines={2}>
                        {post.title}
                    </Text>

                    <Text style={[styles.postExcerpt, { color: palette.textSecondary }]} numberOfLines={2}>
                        {post.contentText}
                    </Text>
                </TouchableOpacity>

                {post.moodTag && !post.imageUrl && (
                    <View style={[styles.postCategoryWrap, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}>
                        <Text style={[styles.postCategoryText, { color: palette.textSecondary }]}>#{post.moodTag}</Text>
                    </View>
                )}

                <View style={[styles.postActionsRow, { borderTopColor: palette.border }]}> 
                    <View style={styles.postStatsRow}>
                        <TouchableOpacity onPress={handleLikePress} activeOpacity={0.8} style={styles.statButton}>
                            <Ionicons
                                name={post.isLiked ? 'heart' : 'heart-outline'}
                                size={16}
                                color={post.isLiked ? '#EF4444' : '#9CA3AF'}
                            />
                            <Text style={[styles.statCountText, { color: palette.textSecondary }, post.isLiked && styles.statCountTextLiked]}>
                                {formatNumber(post.reactionCount)}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity activeOpacity={0.8} onPress={handleNavigateDetail} style={styles.statInline}>
                            <Ionicons name="chatbubble-ellipses-outline" size={16} color={palette.textMuted} />
                            <Text style={[styles.statCountText, { color: palette.textSecondary }]}>{formatNumber(post.commentCount)}</Text>
                        </TouchableOpacity>

                        <View style={styles.statInline}>
                            <Ionicons name="eye-outline" size={16} color={palette.textMuted} />
                            <Text style={[styles.statCountText, { color: palette.textSecondary }]}>{formatNumber(post.viewCount)}</Text>
                        </View>
                    </View>

                    <TouchableOpacity activeOpacity={0.8} style={styles.shareButton}>
                        <Ionicons name="share-social-outline" size={16} color={palette.primary} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    postCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    postImageWrap: {
        position: 'relative',
    },
    postImage: {
        width: '100%',
        height: 180,
    },
    postTypeTagWrap: {
        position: 'absolute',
        top: 12,
        left: 12,
    },
    postTypeTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    postTypeTagText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    postPlayButton: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    postPlayIcon: {
        marginLeft: 1,
    },
    postContent: {
        padding: 16,
    },
    postAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    postAuthorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        backgroundColor: '#E5E7EB',
    },
    postAuthorInfo: {
        flex: 1,
    },
    postAuthorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postAuthorName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
        marginRight: 6,
        maxWidth: '70%',
    },
    postTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    postTimeText: {
        marginLeft: 4,
        fontSize: 11,
        color: '#9CA3AF',
    },
    ownerActionButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    ownerActionWrap: {
        position: 'relative',
    },
    ownerActionMenu: {
        position: 'absolute',
        top: 28,
        right: 0,
        minWidth: 120,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        zIndex: 30,
        overflow: 'hidden',
    },
    ownerActionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    ownerActionMenuText: {
        marginLeft: 6,
        fontSize: 12,
        color: '#0F172A',
        fontWeight: '600',
    },
    ownerActionMenuTextDanger: {
        color: '#DC2626',
    },
    ownerActionDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    postTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        lineHeight: 21,
        marginBottom: 8,
    },
    postExcerpt: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 19,
        marginBottom: 12,
    },
    postCategoryWrap: {
        marginBottom: 12,
        alignSelf: 'flex-start',
        backgroundColor: '#F3F4F6',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    postCategoryText: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '500',
    },
    postActionsRow: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    postStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    statInline: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    statCountText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#6B7280',
    },
    statCountTextLiked: {
        color: '#EF4444',
        fontWeight: '600',
    },
    shareButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
