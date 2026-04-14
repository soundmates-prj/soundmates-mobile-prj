import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, Image, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { blogService } from '../../api';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
} from 'react-native-reanimated';
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface ReactionMeta {
    type: ReactionType;
    label: string;
    icon: string;         // Ionicons name
    iconFilled: string;   // Ionicons filled name
    color: string;
}

export const REACTIONS: ReactionMeta[] = [
    { type: 'like',  label: 'Thích',     icon: 'thumbs-up-outline',  iconFilled: 'thumbs-up',    color: '#1877F2' },
    { type: 'love',  label: 'Yêu thích', icon: 'heart-outline',      iconFilled: 'heart',        color: '#F33E58' },
    { type: 'haha',  label: 'Haha',      icon: 'happy-outline',      iconFilled: 'happy',        color: '#F5B301' },
    { type: 'wow',   label: 'Wow',       icon: 'sparkles-outline',   iconFilled: 'sparkles',     color: '#7C3AED' },
    { type: 'sad',   label: 'Buồn',      icon: 'sad-outline',        iconFilled: 'sad',          color: '#0EA5E9' },
    { type: 'angry', label: 'Phẫn nộ',   icon: 'flame-outline',      iconFilled: 'flame',        color: '#F97316' },
];

export const getReactionMeta = (type: ReactionType | string | null): ReactionMeta | null =>
    REACTIONS.find((r) => r.type === type?.toLowerCase()) ?? null;

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
    myReactionType?: ReactionType | null;
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
    onReaction: (reactionType: ReactionType | null) => void;
    /** @deprecated Use onReaction instead */
    onLike?: () => void;
    onNavigateToDetail?: (postId: string) => void;
    showOwnerActions?: boolean;
    onEdit?: (postId: string) => void;
    onDelete?: (postId: string) => void;
}

export function BlogPostCard({ post, onReaction, onLike, onNavigateToDetail, showOwnerActions = false, onEdit, onDelete }: BlogPostCardProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
    const isDraftPost = post.status?.toLowerCase?.() === 'draft';
    const normalizeReaction = (t?: ReactionType | string | null): ReactionType | null => {
        if (!t) return null;
        const lower = t.toLowerCase() as ReactionType;
        return REACTIONS.some(r => r.type === lower) ? lower : null;
    };
    const [myReaction, setMyReaction] = useState<ReactionType | null>(normalizeReaction(post.myReactionType) ?? (post.isLiked ? 'like' : null));
    const [reactionCountLocal, setReactionCountLocal] = useState(post.reactionCount);
    const [showOwnerMenu, setShowOwnerMenu] = useState(false);
    const [topReactions, setTopReactions] = useState<ReactionType[]>([]);

    useEffect(() => {
        setMyReaction(normalizeReaction(post.myReactionType) ?? (post.isLiked ? 'like' : null));
        setReactionCountLocal(post.reactionCount);
        setShowOwnerMenu(false);
    }, [post.id, post.isLiked, post.reactionCount, post.myReactionType]);

    useEffect(() => {
        if (!isDraftPost) {
            blogService.getPostReactions(post.id).then(res => {
                if (res.success && res.data) {
                    const reactionCounts: Record<string, number> = {};
                    res.data.forEach(r => {
                        const t = (r.reactionType || 'like').toLowerCase();
                        reactionCounts[t] = (reactionCounts[t] || 0) + 1;
                    });
                    
                    const sorted = Object.entries(reactionCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 2)
                        .map(([type]) => type as ReactionType);
                        
                    setTopReactions(sorted);
                }
            }).catch(() => {});
        }
    }, [post.id, isDraftPost]);

    const displayReactions = useMemo(() => {
        let arr = [...topReactions];
        if (myReaction) {
            if (!arr.includes(myReaction)) {
                arr.unshift(myReaction);
            } else {
                arr = [myReaction, ...arr.filter(t => t !== myReaction)];
            }
        }
        return arr.slice(0, 2);
    }, [topReactions, myReaction]);

    const finalReactions = useMemo(() => {
        if (reactionCountLocal === 0) return [];
        if (displayReactions.length > 0) return displayReactions;
        return myReaction ? [myReaction] : ['like'] as ReactionType[];
    }, [reactionCountLocal, displayReactions, myReaction]);

    const displayName = post.userFullName;
    const avatarUri = post.userAvatarUrl
        || `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1`;

    const reactionScale = useSharedValue(1);
    const myReactionRef = useRef(myReaction);
    myReactionRef.current = myReaction;

    const onReactionRef = useRef(onReaction);
    onReactionRef.current = onReaction;

    const handleReactionSelect = useCallback((type: ReactionType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        reactionScale.value = withSequence(
            withSpring(1.4, { damping: 4 }),
            withSpring(1, { damping: 8 }),
        );

        let newReaction: ReactionType | null = null;
        if (myReactionRef.current === type) {
            setMyReaction(null);
            setReactionCountLocal(prev => Math.max(0, prev - 1));
            newReaction = null;
        } else {
            const wasNull = myReactionRef.current === null;
            setMyReaction(type);
            if (wasNull) {
                setReactionCountLocal(prev => prev + 1);
            }
            newReaction = type;
        }

        onReactionRef.current(newReaction);
    }, [reactionScale]);

    const handleQuickReaction = useCallback(() => {
        setShowOwnerMenu(false);
        handleReactionSelect(myReactionRef.current ?? 'like');
    }, [handleReactionSelect]);

    // PanResponder implementation for Drag-to-React
    const [hoveredReaction, _setHoveredReaction] = useState<ReactionType | null>(null);
    const hoveredReactionRef = useRef<ReactionType | null>(null);
    const setHoveredReaction = useCallback((val: ReactionType | null) => {
        if (hoveredReactionRef.current !== val) {
            hoveredReactionRef.current = val;
            _setHoveredReaction(val);
            if (val) Haptics.selectionAsync();
        }
    }, []);

    const showReactionPickerRef = useRef(false);
    const [showReactionPickerFallback, setShowReactionPickerFallback] = useState(false);
    const setPickerVisible = useCallback((val: boolean) => {
        showReactionPickerRef.current = val;
        setShowReactionPickerFallback(val);
    }, []);

    const touchStartY = useRef(0);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reactionPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt) => {
                DeviceEventEmitter.emit('GlobalScrollEnabled', false);
                touchStartY.current = evt.nativeEvent.pageY;
                longPressTimer.current = setTimeout(() => {
                    setPickerVisible(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }, 400);
            },
            onPanResponderMove: (evt, gestureState) => {
                if (showReactionPickerRef.current) {
                    const y = touchStartY.current - evt.nativeEvent.pageY;
                    const isAboveButton = y > 20 && y < 140;
                    if (isAboveButton) {
                        const pickerStartX = 10; 
                        const iconWidth = 50; 
                        const x = evt.nativeEvent.pageX - pickerStartX;
                        const index = Math.floor(x / iconWidth);
                        if (index >= 0 && index < REACTIONS.length) {
                            setHoveredReaction(REACTIONS[index].type);
                        } else {
                            setHoveredReaction(null);
                        }
                    } else {
                        setHoveredReaction(null);
                    }
                } else {
                    if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
                        if (longPressTimer.current) clearTimeout(longPressTimer.current);
                    }
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                DeviceEventEmitter.emit('GlobalScrollEnabled', true);
                const isDraggingBeforePicker = !showReactionPickerRef.current && (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10);

                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
                if (showReactionPickerRef.current) {
                    const y = touchStartY.current - evt.nativeEvent.pageY;
                    const isAboveButton = y > 20 && y < 140;
                    let selectedType: ReactionType | null = null;
                    if (isAboveButton) {
                        const pickerStartX = 10;
                        const iconWidth = 50;
                        const x = evt.nativeEvent.pageX - pickerStartX;
                        const index = Math.floor(x / iconWidth);
                        if (index >= 0 && index < REACTIONS.length) {
                            selectedType = REACTIONS[index].type;
                        }
                    }
                    
                    setPickerVisible(false);
                    setHoveredReaction(null);

                    if (selectedType) {
                        handleReactionSelect(selectedType);
                    }
                } else {
                    if (!isDraggingBeforePicker) {
                        handleQuickReaction();
                    }
                }
            },
            onPanResponderTerminate: () => {
                DeviceEventEmitter.emit('GlobalScrollEnabled', true);
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                setPickerVisible(false);
                setHoveredReaction(null);
            }
        })
    ).current;

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

    const reactionAnimationStyle = useAnimatedStyle(() => ({
        transform: [{ scale: reactionScale.value }],
    }));

    const currentReactionMeta = myReaction ? getReactionMeta(myReaction) : null;

    return (
        <View
            style={[
                styles.cardWrapper,
                isDraftPost ? styles.draftCard : null,
                {
                    shadowColor: '#000',
                    shadowOpacity: isDarkMode ? 0.3 : 0.05,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 3,
                },
            ]}
        >
            <View style={[styles.cardInner, { backgroundColor: palette.surface, borderColor: isDraftPost ? '#F59E0B' : palette.border }]}>
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
                        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
                            <Ionicons name="flag-outline" size={18} color={palette.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {showOwnerMenu && (
                    <Pressable style={styles.ownerMenuBackdrop} onPress={() => setShowOwnerMenu(false)} />
                )}

                {/* Content: ShareMusic / Image / Text */}
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
                        <View style={[styles.textOnlyContent, { backgroundColor: palette.primary + '03' }]}>
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
                        {/* Stats Summary (Facebook style) */}
                        {(reactionCountLocal > 0 || post.commentCount > 0) && (
                            <View style={styles.statsSummary}>
                                {reactionCountLocal > 0 ? (
                                    <View style={styles.reactionSummaryGroup}>
                                        {finalReactions.map((type, index) => {
                                            const meta = getReactionMeta(type);
                                            if (!meta) return null;
                                            return (
                                                <View 
                                                    key={type} 
                                                    style={[
                                                        styles.reactionSummaryIconWrap, 
                                                        { 
                                                            backgroundColor: meta.color,
                                                            marginLeft: index > 0 ? -4 : 0, 
                                                            zIndex: 10 - index
                                                        }
                                                    ]}
                                                >
                                                    <Ionicons name={meta.iconFilled as any} size={10} color="#FFF" />
                                                </View>
                                            );
                                        })}
                                        <Text style={[styles.statsSummaryText, { color: palette.textSecondary, marginLeft: 6 }]}>
                                            {formatNumber(reactionCountLocal)}
                                        </Text>
                                    </View>
                                ) : <View />}
                                {post.commentCount > 0 && (
                                    <TouchableOpacity onPress={handleNavigateToDetail}>
                                        <Text style={[styles.statsSummaryText, { color: palette.textSecondary }]}>
                                            {formatNumber(post.commentCount)} bình luận
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Actions: Reaction, Comment, Share */}
                        <View style={styles.actionsBar}>
                            <View style={styles.leftActions}>
                                {/* Reaction button — connected to custom drag-to-react PanResponder */}
                                <View 
                                    style={[
                                        styles.reactionBtn,
                                        currentReactionMeta ? { backgroundColor: currentReactionMeta.color + '15' } : null,
                                    ]}
                                    {...reactionPanResponder.panHandlers}
                                >
                                    <Animated.View style={reactionAnimationStyle} pointerEvents="none">
                                        <Ionicons
                                            name={(currentReactionMeta?.iconFilled ?? 'thumbs-up-outline') as any}
                                            size={20}
                                            color={currentReactionMeta?.color ?? palette.textSecondary}
                                        />
                                    </Animated.View>
                                    <Text style={[
                                        styles.reactionBtnLabel,
                                        { color: currentReactionMeta?.color ?? palette.textSecondary },
                                    ]} pointerEvents="none">
                                        {currentReactionMeta?.label ?? 'Thích'}
                                    </Text>
                                </View>

                                <TouchableOpacity style={styles.actionButton} onPress={handleNavigateToDetail}>
                                    <Ionicons name="chatbubble-outline" size={20} color={palette.textSecondary} />
                                    <Text style={[styles.actionBtnLabel, { color: palette.textSecondary }]}>Bình luận</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionButton}>
                                    <Ionicons name="arrow-redo-outline" size={20} color={palette.textSecondary} />
                                    <Text style={[styles.actionBtnLabel, { color: palette.textSecondary }]}>Chia sẻ</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* Reaction Picker Absolute View */}
            {showReactionPickerFallback && (
                <View style={[styles.absolutePickerContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    {REACTIONS.map((reaction) => {
                        const isHovered = hoveredReaction === reaction.type;
                        const isSelectedAndNoHover = myReaction === reaction.type && !hoveredReaction;
                        const isActive = isHovered || isSelectedAndNoHover;
                        
                        return (
                            <View
                                key={reaction.type}
                                style={[
                                    styles.pickerItem,
                                    isActive && { backgroundColor: reaction.color + '20', transform: [{ scale: 1.15 }] },
                                ]}
                            >
                                <View style={[styles.pickerIconWrap, { backgroundColor: reaction.color }]}>
                                    <Ionicons name={reaction.iconFilled as any} size={18} color="#FFF" />
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cardWrapper: {
        marginHorizontal: 16,
        marginBottom: 14,
        position: 'relative',
        zIndex: 1, // needed to establish stacking context
    },
    cardInner: {
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
    statsSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingBottom: 12,
        paddingTop: 8,
    },
    reactionSummaryGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    reactionSummaryIconWrap: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsSummaryText: {
        fontSize: 13,
        fontWeight: '500',
    },
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reactionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: 'transparent',
    },
    reactionBtnLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
    },
    actionBtnLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    absolutePickerContainer: {
        position: 'absolute',
        bottom: 54, // Sit perfectly above actions bar inside the card wrapper
        left: 10,
        flexDirection: 'row',
        borderRadius: 24,
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 8,
        gap: 6,
        shadowColor: '#000000',
        shadowOpacity: 0.18,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 6 },
        elevation: 12,
        zIndex: 999, // Render above the inner card content
    },
    pickerItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    pickerIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
