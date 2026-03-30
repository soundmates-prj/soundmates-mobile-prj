import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    KeyboardEvent,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import {
    blogService,
    CommentResponse,
    PostStatsResponse,
} from '../../api';
import { formatTimeAgo } from '../../components/blog/BlogPostCard';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

interface PostDetailScreenProps {
    postId: string;
    onBack: () => void;
}

const showToast = (message: string) => {
    // Basic toast replacement using Alert for now
    // In a real app, use a proper Toast library
    console.log('[Toast]', message);
}

export default function PostDetailScreen({ postId, onBack }: PostDetailScreenProps) {
    const insets = useSafeAreaInsets();
    const { user } = useUser();
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [post, setPost] = useState<any | null>(null);
    const [stats, setStats] = useState<PostStatsResponse | null>(null);
    const [comments, setComments] = useState<CommentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const inputRef = React.useRef<TextInput>(null);

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
                setPost(postRes.data);
            }
            if (statsRes.success && statsRes.data) setStats(statsRes.data);
            if (commentsRes.success && commentsRes.data) setComments(commentsRes.data.items || []);
        } catch (error) {
            console.error('Fetch post detail error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleLike = async () => {
        if (!post) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        setStats(prev => prev ? { ...prev, reactionCount: newLikedState ? prev.reactionCount + 1 : prev.reactionCount - 1 } : null);

        try {
            await blogService.addReaction(postId, 'like');
        } catch (error) {
            // Rollback on error
            setIsLiked(!newLikedState);
            setStats(prev => prev ? { ...prev, reactionCount: !newLikedState ? prev.reactionCount + 1 : prev.reactionCount - 1 } : null);
        }
    };

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
                fetchData(true); // Refresh comments and stats
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

    const renderComment = (comment: CommentResponse, isReply = false) => {
        return (
            <Animated.View
                key={comment.id}
                entering={FadeInDown.duration(400)}
                style={[styles.commentContainer, isReply && styles.replyContainer]}
            >
                <View style={styles.commentMainRow}>
                    <Image
                        source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${comment.userId}&backgroundColor=55C5F1` }}
                        style={styles.commentAvatar}
                    />
                    <View style={styles.commentBubbleWrapper}>
                        <View style={[styles.commentBubble, { backgroundColor: isDarkMode ? '#262626' : '#F3F4F6' }]}>
                            <Text style={[styles.commentAuthor, { color: palette.textPrimary }]}>
                                {comment.userId.substring(0, 10)}
                            </Text>
                            <Text style={[styles.commentText, { color: palette.textSecondary }]}>
                                {comment.content}
                            </Text>
                        </View>
                        <View style={styles.commentMetaRow}>
                            <Text style={[styles.commentTime, { color: palette.textMuted }]}>
                                {formatTimeAgo(comment.createdAt)}
                            </Text>
                            <TouchableOpacity onPress={() => handleReplyPress(comment.id, comment.userId.substring(0, 10))}>
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
                {comment.replies && comment.replies.length > 0 && (
                    <View style={styles.repliesList}>
                        {comment.replies.map((reply) => renderComment(reply, true))}
                    </View>
                )}
            </Animated.View>
        );
    };

    if (isLoading && !isRefreshing) {
        return (
            <View style={[styles.screen, styles.center, { backgroundColor: palette.background }]}>
                <ActivityIndicator size="large" color={palette.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.screen, { backgroundColor: palette.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Immersive Header */}
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
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} tintColor={palette.primary} />
                }
            >
                {post && (
                    <Animated.View entering={FadeInUp.duration(600)}>
                        <View style={styles.authorRow}>
                            <Image
                                source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1` }}
                                style={styles.authorAvatar}
                            />
                            <View>
                                <Text style={[styles.authorName, { color: palette.textPrimary }]}>{post.userId.substring(0, 10)}</Text>
                                <Text style={[styles.postTime, { color: palette.textMuted }]}>{formatTimeAgo(post.publishedAt || post.createdAt)}</Text>
                            </View>
                        </View>

                        <Text style={[styles.postTitle, { color: palette.textPrimary }]}>{post.title}</Text>
                        <Text style={[styles.postContent, { color: palette.textSecondary }]}>{post.contentText}</Text>

                        {post.imageUrl && (
                            <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
                        )}

                        <View style={styles.statsBar}>
                            <TouchableOpacity style={styles.statItem} onPress={handleLike} activeOpacity={0.7}>
                                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#FF4B2B" : palette.textPrimary} />
                                <Text style={[styles.statText, { color: isLiked ? "#FF4B2B" : palette.textPrimary }]}>{stats?.reactionCount || 0}</Text>
                            </TouchableOpacity>
                            <View style={styles.statItem}>
                                <Ionicons name="chatbubble-outline" size={22} color={palette.textPrimary} />
                                <Text style={[styles.statText, { color: palette.textPrimary }]}>{stats?.commentCount || 0}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Ionicons name="eye-outline" size={24} color={palette.textPrimary} />
                                <Text style={[styles.statText, { color: palette.textPrimary }]}>{stats?.viewCount || 0}</Text>
                            </View>
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
                        comments.map((comment) => renderComment(comment))
                    )}
                </View>
            </ScrollView>

            {/* Modern Comment Input */}
            <BlurView
                intensity={90}
                tint={isDarkMode ? 'dark' : 'light'}
                style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 20) }]}
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
                    <TextInput
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
        </KeyboardAvoidingView>
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
    header: {
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40,
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
    statsBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        gap: 24,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 15,
        fontWeight: '600',
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
