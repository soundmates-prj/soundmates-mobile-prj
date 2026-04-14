import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    Dimensions,
    Image,
    Keyboard,
    PanResponder,
    Platform,
    RefreshControl,
    Animated as RNAnimated,
    TextInput as RNTextInput,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import {
    blogService,
    CommentResponse,
    PostStatsResponse,
} from '../../api';
import { formatNumber, formatTimeAgo, getReactionMeta, REACTIONS, ReactionType } from '../../components/blog/BlogPostCard';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

interface PostDetailScreenProps {
    postId: string;
    onBack: () => void;
}

const showToast = (message: string) => {
    console.log('[Toast]', message);
}

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

export default function PostDetailScreen({ postId, onBack }: PostDetailScreenProps) {
    const insets = useSafeAreaInsets();
    const { user } = useUser();
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

    const [post, setPost] = useState<any | null>(null);
    const [stats, setStats] = useState<PostStatsResponse | null>(null);
    const [comments, setComments] = useState<CommentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

    // Multi-reaction state
    const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
    const [likeCountLocal, setLikeCountLocal] = useState(0);
    const [topReactions, setTopReactions] = useState<ReactionType[]>([]);

    const [globalScrollEnabled, setGlobalScrollEnabled] = useState(true);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('GlobalScrollEnabled', (enabled: boolean) => {
            setGlobalScrollEnabled(enabled);
        });
        return () => sub.remove();
    }, []);

    const reactionScale = useSharedValue(1);

    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const inputRef = React.useRef<RNTextInput>(null);
    const screenWidth = Dimensions.get('window').width;
    const screenSwipeTranslateX = React.useRef(new RNAnimated.Value(0)).current;
    const screenSwipeOpacity = React.useRef(new RNAnimated.Value(1)).current;

    const resetEdgeSwipeAnimation = useCallback(() => {
        RNAnimated.parallel([
            RNAnimated.spring(screenSwipeTranslateX, {
                toValue: 0,
                damping: 20,
                stiffness: 190,
                mass: 0.5,
                useNativeDriver: true,
            }),
            RNAnimated.timing(screenSwipeOpacity, {
                toValue: 1,
                duration: 170,
                useNativeDriver: true,
            }),
        ]).start();
    }, [screenSwipeOpacity, screenSwipeTranslateX]);

    const animateEdgeSwipeBackAndExit = useCallback(() => {
        RNAnimated.parallel([
            RNAnimated.timing(screenSwipeTranslateX, {
                toValue: Math.max(screenWidth * 0.9, 240),
                duration: 180,
                useNativeDriver: true,
            }),
            RNAnimated.timing(screenSwipeOpacity, {
                toValue: 0.88,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (!finished) {
                resetEdgeSwipeAnimation();
                return;
            }
            onBack();
        });
    }, [onBack, resetEdgeSwipeAnimation, screenSwipeOpacity, screenSwipeTranslateX, screenWidth]);

    const edgeBackPanResponder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: (event) => event.nativeEvent.pageX <= 24,
                onMoveShouldSetPanResponder: (_, gesture) =>
                    gesture.dx > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
                onPanResponderGrant: () => {
                    screenSwipeTranslateX.stopAnimation();
                    screenSwipeOpacity.stopAnimation();
                },
                onPanResponderMove: (_, gesture) => {
                    const clampedDx = Math.max(0, Math.min(gesture.dx, 180));
                    screenSwipeTranslateX.setValue(clampedDx);
                    screenSwipeOpacity.setValue(Math.max(0.88, 1 - clampedDx / 900));
                },
                onPanResponderRelease: (_, gesture) => {
                    const passedDistance = gesture.dx > 86;
                    const passedVelocity = gesture.vx > 0.18;
                    if (passedDistance || passedVelocity) {
                        animateEdgeSwipeBackAndExit();
                        return;
                    }
                    resetEdgeSwipeAnimation();
                },
                onPanResponderTerminate: () => {
                    resetEdgeSwipeAnimation();
                },
            }),
        [animateEdgeSwipeBackAndExit, resetEdgeSwipeAnimation, screenSwipeOpacity, screenSwipeTranslateX],
    );

    const fetchData = useCallback(async (refresh = false) => {
        if (!postId) return;
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const [postRes, statsRes, commentsRes] = await Promise.all([
                blogService.getPostById(postId),
                blogService.getPostStats(postId),
                blogService.getPostComments(postId)
            ]);

            if (postRes.success && postRes.data) {
                const rawPost = postRes.data;
                const { normalizedShareMusic, inferredPostType } = normalizeShareMusic(rawPost);
                setPost({
                    ...rawPost,
                    postType: inferredPostType || rawPost.postType || null,
                    shareMusic: normalizedShareMusic,
                });
            }
            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
                setLikeCountLocal(statsRes.data.reactionCount || 0);
            }
            if (commentsRes.success && commentsRes.data) setComments(commentsRes.data.items || []);

            try {
                const reactionsRes = await blogService.getPostReactions(postId);
                if (reactionsRes.success && reactionsRes.data) {
                    // Compute top 2 reactions
                    const reactionCounts: Record<string, number> = {};
                    reactionsRes.data.forEach(r => {
                        const t = r.reactionType || 'like';
                        reactionCounts[t] = (reactionCounts[t] || 0) + 1;
                    });

                    const sorted = Object.entries(reactionCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 2)
                        .map(([type]) => type as ReactionType);

                    setTopReactions(sorted);

                    // User reaction
                    if (user?.userId) {
                        const userReactionList = reactionsRes.data.filter((r) => r.userId === user.userId);
                        if (userReactionList && userReactionList.length > 0) {
                            setMyReaction(userReactionList[0].reactionType as ReactionType);
                        } else {
                            setMyReaction(null);
                        }
                    } else {
                        setMyReaction(null);
                    }
                } else {
                    setTopReactions([]);
                    setMyReaction(null);
                }
            } catch {
                setTopReactions([]);
                setMyReaction(null);
            }
        } catch (error) {
            console.error('Fetch post detail error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [postId, user?.userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSubscription = Keyboard.addListener(showEvent, (event) => {
            const keyboardHeight = event.endCoordinates?.height || 0;
            setKeyboardOffset(Math.max(keyboardHeight - insets.bottom, 0));
        });

        const hideSubscription = Keyboard.addListener(hideEvent, () => {
            setKeyboardOffset(0);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [insets.bottom]);

    const myReactionRef = useRef(myReaction);
    myReactionRef.current = myReaction;

    const handleReactionSelect = useCallback(async (type: ReactionType) => {
        if (!post) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        reactionScale.value = withSequence(
            withSpring(1.4, { damping: 4 }),
            withSpring(1, { damping: 8 }),
        );

        const currentReaction = myReactionRef.current;
        const isRemoving = currentReaction === type;

        // Optimistic
        if (isRemoving) {
            setMyReaction(null);
            setLikeCountLocal(prev => Math.max(0, prev - 1));
            DeviceEventEmitter.emit('PostReactionUpdated', { postId, newReaction: null });
        } else {
            const wasNull = currentReaction === null;
            setMyReaction(type);
            if (wasNull) {
                setLikeCountLocal(prev => prev + 1);
            }
            DeviceEventEmitter.emit('PostReactionUpdated', { postId, newReaction: type });
        }

        try {
            if (isRemoving) {
                await blogService.removeReaction(postId);
            } else {
                if (currentReaction) {
                    await blogService.removeReaction(postId);
                }
                const result = await blogService.addReaction(postId, type);
                if (!result.success) throw new Error(result.message);
            }
        } catch (error) {
            // Revert
            setMyReaction(currentReaction);
            if (isRemoving) {
                setLikeCountLocal(prev => prev + 1);
            } else if (currentReaction === null) {
                setLikeCountLocal(prev => Math.max(0, prev - 1));
            }
            DeviceEventEmitter.emit('PostReactionUpdated', { postId, newReaction: currentReaction });
        }
    }, [post, postId, reactionScale]);

    const handleReactionSelectRef = useRef(handleReactionSelect);
    handleReactionSelectRef.current = handleReactionSelect;

    const handleQuickReaction = useCallback(() => {
        handleReactionSelectRef.current(myReactionRef.current ?? 'like');
    }, []);

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
                        handleReactionSelectRef.current(selectedType);
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

    const reactionAnimationStyle = useAnimatedStyle(() => ({
        transform: [{ scale: reactionScale.value }],
    }));

    const handleReport = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const reportReasons = [
            'Nội dung nhạy cảm / NSFW',
            'Spam / Quảng cáo',
            'Quấy rối / Đe dọa',
            'Thông tin sai lệch',
            'Khác'
        ];

        Alert.alert(
            'Báo cáo bài viết',
            'Tại sao bạn muốn báo cáo bài viết này?',
            [
                ...reportReasons.map(reason => ({
                    text: reason,
                    onPress: async () => {
                        try {
                            const res = await blogService.reportPost(postId, reason);
                            if (res.success) {
                                Alert.alert('Thành công', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét nội dung này sớm nhất.');
                            } else {
                                Alert.alert('Lỗi', res.message);
                            }
                        } catch (err) {
                            Alert.alert('Lỗi', 'Không thể gửi báo cáo lúc này.');
                        }
                    }
                })),
                { text: 'Hủy', style: 'cancel' }
            ]
        );
    }, [postId]);

    const handleComment = async () => {
        if (!commentText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            let res;
            if (editingCommentId) {
                res = await blogService.updateComment(editingCommentId, commentText);
            } else if (replyingTo) {
                res = await blogService.replyComment(replyingTo.commentId, commentText);
            } else {
                res = await blogService.createComment(postId, commentText);
            }

            if (res.success) {
                setCommentText('');
                setReplyingTo(null);
                setEditingCommentId(null);
                Keyboard.dismiss();
                fetchData(true);
                showToast(editingCommentId ? 'Đã cập nhật bình luận' : 'Đã đăng bình luận');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể gửi bình luận. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReplyPress = (commentId: string, username: string) => {
        setReplyingTo({ commentId, username });
        setEditingCommentId(null);
        setCommentText('');
        inputRef.current?.focus();
    };

    const handleEditPress = (commentId: string, content: string) => {
        setEditingCommentId(commentId);
        setReplyingTo(null);
        setCommentText(content);
        inputRef.current?.focus();
    };

    const handleDeleteComment = async (commentId: string) => {
        Alert.alert('Xóa bình luận', 'Bạn có chắc chắn muốn xóa bình luận này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await blogService.deleteComment(commentId);
                        if (res.success) {
                            fetchData(true);
                            showToast('Đã xóa bình luận');
                        }
                    } catch (error) {
                        showToast('Không thể xóa bình luận');
                    }
                }
            }
        ]);
    };

    type FlatReply = CommentResponse & { replyingToUsername?: string };

    const flattenReplies = (replies: CommentResponse[], parentUsername: string, isLevel1: boolean = true): FlatReply[] => {
        return replies.reduce((acc: FlatReply[], reply) => {
            acc.push({
                ...reply,
                replyingToUsername: isLevel1 ? undefined : parentUsername
            });
            if (reply.replies && reply.replies.length > 0) {
                acc = acc.concat(flattenReplies(reply.replies, reply.userFullName, false));
            }
            return acc;
        }, []);
    };

    const renderCommentNode = (comment: CommentResponse | FlatReply, isReply = false) => {
        const replyingToUsername = (comment as FlatReply).replyingToUsername;

        return (
            <Animated.View
                key={comment.id}
                entering={FadeInDown.duration(400)}
                style={[styles.commentContainer, isReply && { marginTop: -4 }]}
            >
                <View style={[styles.commentMainRow, isReply && { paddingLeft: 44 }]}>
                    <Image
                        source={{ uri: comment.userAvatarUrl || `https://api.dicebear.com/7.x/initials/png?seed=${comment.userId}&backgroundColor=55C5F1` }}
                        style={[styles.commentAvatar, isReply && { width: 28, height: 28, borderRadius: 14 }]}
                    />
                    <View style={styles.commentBubbleWrapper}>
                        <View style={[styles.commentBubble, { backgroundColor: isDarkMode ? '#262626' : '#F3F4F6' }]}>
                            <Text style={[styles.commentAuthor, { color: palette.textPrimary }]}>
                                {comment.userFullName}
                            </Text>
                            <Text style={[styles.commentText, { color: palette.textSecondary }]}>
                                {replyingToUsername && (
                                    <Text style={{ fontWeight: '700', color: palette.textPrimary }}>
                                        @{replyingToUsername}{' '}
                                    </Text>
                                )}
                                {comment.content}
                            </Text>
                        </View>
                        <View style={styles.commentMetaRow}>
                            <Text style={[styles.commentTime, { color: palette.textMuted }]}>
                                {formatTimeAgo(comment.createdAt)}
                            </Text>
                            <TouchableOpacity onPress={() => handleReplyPress(comment.id, comment.userFullName)}>
                                <Text style={[styles.commentActionText, { color: palette.textMuted }]}>Phản hồi</Text>
                            </TouchableOpacity>
                            {user?.userId === comment.userId && (
                                <>
                                    <TouchableOpacity onPress={() => handleEditPress(comment.id, comment.content)}>
                                        <Text style={[styles.commentActionText, { color: palette.textMuted }]}>Sửa</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                                        <Text style={[styles.commentActionText, { color: '#FF4B2B' }]}>Xóa</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    };

    const renderRootComment = (comment: CommentResponse) => {
        const flatReplies = flattenReplies(comment.replies || [], comment.userFullName, true);

        return (
            <View key={comment.id}>
                {renderCommentNode(comment, false)}
                {flatReplies.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                        {flatReplies.map((reply) => renderCommentNode(reply, true))}
                    </View>
                )}
            </View>
        );
    };

    const displayReactions = React.useMemo(() => {
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

    const finalReactions = React.useMemo(() => {
        if (likeCountLocal === 0) return [];
        if (displayReactions.length > 0) return displayReactions;
        return myReaction ? [myReaction] : ['like'] as ReactionType[];
    }, [likeCountLocal, displayReactions, myReaction]);

    if (isLoading && !isRefreshing) {
        return (
            <View style={[styles.screen, styles.center, { backgroundColor: palette.background }]}>
                <ActivityIndicator size="large" color={palette.primary} />
            </View>
        );
    }

    const isShareMusicPost = (post?.postType?.toLowerCase() === 'share-music' || post?.postType?.toLowerCase() === 'sharemusic' || !!post?.shareMusic) && post?.shareMusic;
    const currentReactionMeta = myReaction ? getReactionMeta(myReaction) : null;

    return (
        <RNAnimated.View
            style={[
                styles.screen,
                { backgroundColor: palette.background },
                {
                    transform: [{ translateX: screenSwipeTranslateX }],
                    opacity: screenSwipeOpacity,
                },
            ]}
        >
            <View style={styles.header}>
                <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={palette.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Bài viết</Text>
                <TouchableOpacity style={styles.moreButton} onPress={handleReport}>
                    <Ionicons name="flag-outline" size={22} color={palette.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={{ paddingBottom: 100 }}
                scrollEnabled={globalScrollEnabled}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={palette.primary} />
                }
            >
                {post && (
                    <Animated.View entering={FadeInUp.duration(600)}>
                        <View style={styles.authorRow}>
                            <Image
                                source={{ uri: post.userAvatarUrl || `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1` }}
                                style={styles.authorAvatar}
                            />
                            <View>
                                <Text style={[styles.authorName, { color: palette.textPrimary }]}>{post.userFullName || post.userId.substring(0, 10)}</Text>
                                <Text style={[styles.postTime, { color: palette.textMuted }]}>{formatTimeAgo(post.publishedAt || post.createdAt)}</Text>
                            </View>
                        </View>

                        {!!post.title && (
                            <Text style={[styles.postTitle, { color: palette.textPrimary }]}>{post.title}</Text>
                        )}

                        {isShareMusicPost ? (
                            <View style={styles.shareMusicContainer}>
                                <View style={[styles.shareMusicCard, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}>
                                    {post.shareMusic.albumImage ? (
                                        <Image source={{ uri: post.shareMusic.albumImage }} style={styles.shareMusicImage} />
                                    ) : (
                                        <View style={[styles.shareMusicImage, { backgroundColor: palette.primary + '30', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Ionicons name="musical-notes" size={24} color={palette.primary} />
                                        </View>
                                    )}
                                    <View style={styles.shareMusicInfo}>
                                        <Text style={[styles.shareMusicSongTitle, { color: palette.textPrimary }]} numberOfLines={2}>
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
                        ) : (
                            <>
                                {!!post.contentText && (
                                    <Text style={[styles.postContent, { color: palette.textSecondary }]}>{post.contentText}</Text>
                                )}
                                {(post.imageUrl || post.imgUrl) && (
                                    <Image source={{ uri: post.imageUrl || post.imgUrl }} style={styles.postImage} resizeMode="cover" />
                                )}
                            </>
                        )}

                        {/* Stats Summary Area */}
                        {(likeCountLocal > 0 || (stats?.commentCount && stats.commentCount > 0)) && (
                            <View style={styles.statsSummary}>
                                {likeCountLocal > 0 ? (
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
                                            {formatNumber(likeCountLocal)}
                                        </Text>
                                    </View>
                                ) : <View />}
                                {stats?.commentCount ? (
                                    <Text style={[styles.statsSummaryText, { color: palette.textSecondary }]}>
                                        {formatNumber(stats.commentCount)} bình luận
                                    </Text>
                                ) : null}
                            </View>
                        )}

                        {/* Actions Line inside PostDetailScreen */}
                        <View style={styles.actionsBarWrapper}>
                            <View style={styles.actionsBar}>
                                <View style={styles.leftActions}>
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

                                    <TouchableOpacity style={styles.actionButton} onPress={() => inputRef.current?.focus()}>
                                        <Ionicons name="chatbubble-outline" size={20} color={palette.textSecondary} />
                                        <Text style={[styles.actionBtnLabel, { color: palette.textSecondary }]}>Bình luận</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="arrow-redo-outline" size={20} color={palette.textSecondary} />
                                        <Text style={[styles.actionBtnLabel, { color: palette.textSecondary }]}>Chia sẻ</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Relative Container for Absolute Picker Array */}
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
                    </Animated.View>
                )}

                <View style={styles.commentsSection}>
                    <Text style={[styles.commentsHeader, { color: palette.textPrimary }]}>Bình luận</Text>
                    {comments.length === 0 ? (
                        <View style={styles.emptyComments}>
                            <Ionicons name="chatbubbles-outline" size={48} color={palette.textMuted} />
                            <Text style={[styles.emptyText, { color: palette.textMuted }]}>Chưa có bình luận nào</Text>
                        </View>
                    ) : (
                        comments.map((comment) => renderRootComment(comment))
                    )}
                </View>
            </ScrollView>

            <BlurView
                intensity={90}
                tint={isDarkMode ? 'dark' : 'light'}
                style={[
                    styles.inputWrapper,
                    {
                        bottom: keyboardOffset,
                        paddingBottom: keyboardOffset > 0 ? 45 : Math.max(insets.bottom, 20)
                    }
                ]}
            >
                {(replyingTo || editingCommentId) && (
                    <View style={styles.replyPreview}>
                        <Text style={[styles.replyText, { color: palette.textSecondary }]}>
                            {editingCommentId ? 'Sửa bình luận...' : `Đang trả lời ${replyingTo?.username}`}
                        </Text>
                        <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingCommentId(null); setCommentText(''); }}>
                            <Ionicons name="close-circle" size={20} color={palette.textMuted} />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputRow}>
                    <Image
                        source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=me&backgroundColor=55C5F1` }}
                        style={styles.inputAvatar}
                    />
                    <RNTextInput
                        ref={inputRef}
                        style={[styles.textInput, { color: palette.textPrimary, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        placeholder="Thêm bình luận..."
                        placeholderTextColor={palette.textMuted}
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={handleComment}
                        disabled={!commentText.trim() || isSubmitting}
                        style={[styles.sendButton, commentText.trim() && { opacity: 1 }]}
                    >
                        <Ionicons name="send" size={24} color={palette.primary} />
                    </TouchableOpacity>
                </View>
            </BlurView>

            <View style={styles.edgeSwipeBackZone} {...edgeBackPanResponder.panHandlers} />
        </RNAnimated.View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    edgeSwipeBackZone: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 24,
        zIndex: 20,
    },
    header: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    moreButton: {
        padding: 4,
    },
    scrollArea: {
        flex: 1,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    authorAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    authorName: {
        fontSize: 15,
        fontWeight: '700',
    },
    postTime: {
        fontSize: 12,
    },
    postTitle: {
        fontSize: 24,
        fontWeight: '800',
        paddingHorizontal: 16,
        marginBottom: 12,
        lineHeight: 32,
    },
    postContent: {
        fontSize: 16,
        lineHeight: 24,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    postImage: {
        width: '100%',
        aspectRatio: 1,
        marginBottom: 20,
    },
    // ─── Share Music styles ───
    shareMusicContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    shareMusicCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        gap: 14,
    },
    shareMusicImage: {
        width: 64,
        height: 64,
        borderRadius: 10,
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
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 3,
    },
    statsSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
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
    actionsBarWrapper: {
        position: 'relative',
        zIndex: 100, // must be > 10 to beat reaction stats icons
    },
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.06)',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.06)',
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
        bottom: 54, // Sit above the action bar
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
        zIndex: 999,
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
    commentsSection: {
        paddingTop: 20,
    },
    commentsHeader: {
        fontSize: 18,
        fontWeight: '800',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    commentContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    replyContainer: {
        marginLeft: 44,
        marginTop: 8,
    },
    commentMainRow: {
        flexDirection: 'row',
        gap: 12,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    commentBubbleWrapper: {
        flex: 1,
    },
    commentBubble: {
        padding: 12,
        borderRadius: 18,
        borderTopLeftRadius: 2,
    },
    commentAuthor: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        lineHeight: 20,
    },
    commentMetaRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 6,
        paddingLeft: 4,
    },
    commentTime: {
        fontSize: 12,
    },
    commentActionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    repliesList: {
        marginLeft: 44,
        marginTop: 12,
    },
    emptyComments: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
    inputWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    replyPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
    },
    replyText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    inputAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    textInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxHeight: 100,
        fontSize: 15,
    },
    sendButton: {
        opacity: 0.3,
    },
});
