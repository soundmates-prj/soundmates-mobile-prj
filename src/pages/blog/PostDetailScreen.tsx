import { Ionicons } from '@expo/vector-icons';
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
    TextInput as RNTextInput,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    BlogPostResponse,
    blogService,
    CommentResponse,
    PostStatsResponse
} from '../../api';
import FormTextField from '../../components/ui/FormTextField';
import { useUser } from '../../context/UserContext';

interface PostDetailScreenProps {
    postId: string;
    onBack: () => void;
}

function formatTimeAgo(dateStr: string): string {
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

export default function PostDetailScreen({ postId, onBack }: PostDetailScreenProps) {
    const insets = useSafeAreaInsets();
    const { user } = useUser();
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [post, setPost] = useState<BlogPostResponse | null>(null);
    const [stats, setStats] = useState<PostStatsResponse | null>(null);
    const [comments, setComments] = useState<CommentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const inputRef = React.useRef<RNTextInput>(null);

    const fetchData = useCallback(async (refresh = false) => {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const [postResult, statsResult, commentsResult] = await Promise.all([
                blogService.getPublishedPostById(postId),
                blogService.getPostStats(postId),
                blogService.getPostComments(postId, { page: 1, pageSize: 50 })
            ]);

            if (postResult.success && postResult.data) {
                setPost(postResult.data);
            }
            if (statsResult.success && statsResult.data) {
                setStats(statsResult.data);
            }
            if (commentsResult.success && commentsResult.data) {
                setComments(commentsResult.data.items || []);
            }
        } catch (error) {
            console.log('[PostDetailScreen] error fetching data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onKeyboardShow = (event: KeyboardEvent) => {
            const keyboardScreenHeight = event.endCoordinates?.height || 0;
            const androidExtraOffset = Platform.OS === 'android' ? 20 : 0;
            const nextHeight = Math.max(0, keyboardScreenHeight - insets.bottom + androidExtraOffset);
            setKeyboardHeight(nextHeight);
        };

        const onKeyboardHide = () => {
            setKeyboardHeight(0);
        };

        const showSubscription = Keyboard.addListener(showEvent, onKeyboardShow);
        const hideSubscription = Keyboard.addListener(hideEvent, onKeyboardHide);

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [insets.bottom]);

    const handleComment = async () => {
        if (!commentText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            let result;
            if (editingCommentId) {
                result = await blogService.updateComment(editingCommentId, commentText.trim());
            } else if (replyingTo) {
                result = await blogService.replyComment(replyingTo.commentId, commentText.trim());
            } else {
                result = await blogService.createComment(postId, commentText.trim());
            }

            if (result.success && result.data) {
                setCommentText('');
                setReplyingTo(null);
                setEditingCommentId(null);
                fetchData(true);
            }
        } catch (error) {
            console.log('[PostDetailScreen] error commenting:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReplyPress = (commentId: string, username: string) => {
        setEditingCommentId(null);
        setReplyingTo({ commentId, username });
        inputRef.current?.focus();
    };

    const handleEditPress = (commentId: string, content: string) => {
        setReplyingTo(null);
        setEditingCommentId(commentId);
        setCommentText(content);
        inputRef.current?.focus();
    };

    const handleDeletePress = (commentId: string) => {
        Alert.alert('Xoá bình luận', 'Bạn có chắc chắn muốn xoá bình luận này?', [
            { text: 'Huỷ', style: 'cancel' },
            { 
                text: 'Xoá', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await blogService.deleteComment(commentId);
                        if (res.success) {
                            fetchData(true);
                        }
                    } catch (e) {
                        console.log('[PostDetailScreen] error deleting comment:', e);
                    }
                }
            }
        ]);
    };

    const renderComment = (comment: CommentResponse, isReply = false) => {
        return (
            <View key={comment.id}>
                <View style={[styles.commentItem, isReply && styles.replyItem]}>
                    <Image
                        source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${comment.userId}&backgroundColor=E5E7EB` }}
                        style={styles.commentAvatar}
                    />
                    <View style={styles.commentContentWrapper}>
                        <View style={styles.commentContent}>
                            <View style={styles.commentHeader}>
                                <Text style={styles.commentAuthor}>{comment.userId.substring(0, 8)}...</Text>
                                <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                            </View>
                            <Text style={styles.commentText}>{comment.content}</Text>
                        </View>
                        <View style={styles.commentActions}>
                            <TouchableOpacity onPress={() => handleReplyPress(comment.id, comment.userId.substring(0, 8))}>
                                <Text style={styles.actionText}>Phản hồi</Text>
                            </TouchableOpacity>
                            {user?.userId === comment.userId && (
                                <>
                                    <Text style={styles.actionDot}> • </Text>
                                    <TouchableOpacity onPress={() => handleEditPress(comment.id, comment.content)}>
                                        <Text style={styles.actionText}>Sửa</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.actionDot}> • </Text>
                                    <TouchableOpacity onPress={() => handleDeletePress(comment.id)}>
                                        <Text style={[styles.actionText, { color: '#EF4444' }]}>Xoá</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>
                {comment.replies && comment.replies.length > 0 && (
                    <View style={[styles.repliesList, isReply && { marginTop: 8 }]}>
                        {comment.replies.map((reply) => renderComment(reply, true))}
                    </View>
                )}
            </View>
        );
    };

    if (isLoading && !isRefreshing) {
        return (
            <View style={[styles.screen, styles.center]}>
                <ActivityIndicator size="large" color="#55C5F1" />
            </View>
        );
    }

    if (!post && !isLoading) {
        return (
            <View style={[styles.screen, styles.center]}>
                <Text style={styles.errorText}>Không tìm thấy bài viết</Text>
                <TouchableOpacity style={styles.backButtonCenter} onPress={onBack}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={styles.screen} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <View style={styles.header}>
                <TouchableOpacity activeOpacity={0.8} onPress={onBack} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Chi tiết bài viết</Text>
                <View style={styles.headerButton} /> 
            </View>

            <ScrollView 
                style={styles.scrollArea}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} colors={['#55C5F1']} />
                }
            >
                {post && (
                    <View style={styles.postContainer}>
                        <View style={styles.postAuthorRow}>
                            <Image
                                source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${post.userId}&backgroundColor=55C5F1` }}
                                style={styles.postAuthorAvatar}
                            />
                            <View style={styles.postAuthorInfo}>
                                <Text style={styles.postAuthorName} numberOfLines={1}>
                                    {post.userId.substring(0, 8)}...
                                </Text>
                                <Text style={styles.postTimeText}>
                                    {formatTimeAgo(post.publishedAt || post.createdAt)}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.postTitle}>{post.title}</Text>
                        <Text style={styles.postContent}>{post.contentText}</Text>

                        {post.imageUrl ? (
                            <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
                        ) : null}
                        
                        {post.moodTag && (
                            <View style={styles.postCategoryWrap}>
                                <Text style={styles.postCategoryText}>#{post.moodTag}</Text>
                            </View>
                        )}
                        
                        <View style={styles.statsRow}>
                            <View style={styles.statInline}>
                                <Ionicons name="heart-outline" size={18} color="#9CA3AF" />
                                <Text style={styles.statCountText}>{stats?.reactionCount || 0}</Text>
                            </View>
                            <View style={styles.statInline}>
                                <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" />
                                <Text style={styles.statCountText}>{stats?.commentCount || 0}</Text>
                            </View>
                            <View style={styles.statInline}>
                                <Ionicons name="eye-outline" size={18} color="#9CA3AF" />
                                <Text style={styles.statCountText}>{stats?.viewCount || 0}</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>Bình luận ({stats?.commentCount || 0})</Text>
                    
                    {comments.length === 0 ? (
                        <Text style={styles.emptyCommentsText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
                    ) : (
                        comments.map((comment) => renderComment(comment, false))
                    )}
                </View>
            </ScrollView>

            <View
                style={[
                    styles.bottomInputWrapper,
                    {
                        paddingBottom: Math.max(12, insets.bottom),
                        marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
                    },
                ]}
            >
                {(replyingTo || editingCommentId) && (
                    <View style={styles.replyingToContainer}>
                        <Text style={styles.replyingToText}>
                            {editingCommentId ? 'Đang chỉnh sửa bình luận' : (
                                <>Đang trả lời <Text style={styles.replyingToUsername}>{replyingTo?.username}</Text></>
                            )}
                        </Text>
                        <TouchableOpacity style={styles.cancelReplyButton} onPress={() => {
                            setReplyingTo(null);
                            setEditingCommentId(null);
                            setCommentText('');
                        }}>
                            <Ionicons name="close-circle" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputContainer}>
                <Image
                    source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=me&backgroundColor=55C5F1` }}
                    style={styles.inputAvatar}
                />
                <FormTextField
                    containerStyle={styles.inputFieldWrap}
                    ref={inputRef}
                    style={styles.inputField}
                    placeholder="Viết bình luận..."
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity 
                    style={[styles.sendButton, (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled]}
                    onPress={handleComment}
                    disabled={!commentText.trim() || isSubmitting}
                >
                    <Ionicons name="send" size={20} color={commentText.trim() ? '#55C5F1' : '#9CA3AF'} />
                </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerButton: {
        padding: 8,
        width: 40,
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
    },
    scrollArea: {
        flex: 1,
    },
    postContainer: {
        padding: 20,
        borderBottomWidth: 8,
        borderBottomColor: '#F3F4F6',
    },
    postAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    postAuthorAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#E5E7EB',
    },
    postAuthorInfo: {
        flex: 1,
    },
    postAuthorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 2,
    },
    postTimeText: {
        fontSize: 12,
        color: '#6B7280',
    },
    postTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
        lineHeight: 26,
    },
    postContent: {
        fontSize: 15,
        color: '#334155',
        lineHeight: 24,
        marginBottom: 16,
    },
    postImage: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#F3F4F6',
    },
    postCategoryWrap: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3F4F6',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 16,
    },
    postCategoryText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    statInline: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    statCountText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#6B7280',
    },
    commentsSection: {
        padding: 20,
        paddingBottom: 40,
    },
    commentsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
    },
    emptyCommentsText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 20,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    replyItem: {
        marginTop: 8,
    },
    repliesList: {
        marginLeft: 44,
        borderLeftWidth: 1,
        borderLeftColor: '#E2E8F0',
        paddingLeft: 12,
        marginBottom: 8,
    },
    commentContentWrapper: {
        flex: 1,
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    commentContent: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentAuthor: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
    },
    commentTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    commentText: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
    },
    commentActions: {
        flexDirection: 'row',
        marginTop: 4,
        marginLeft: 8,
        marginBottom: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    actionDot: {
        fontSize: 12,
        color: '#9CA3AF',
        marginHorizontal: 2,
    },
    bottomInputWrapper: {
        backgroundColor: '#FFFFFF',
    },
    replyingToContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    replyingToText: {
        fontSize: 13,
        color: '#475569',
    },
    replyingToUsername: {
        fontWeight: '700',
        color: '#0EA5E9',
    },
    cancelReplyButton: {
        padding: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    inputField: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        minHeight: 40,
        maxHeight: 100,
        fontSize: 14,
    },
    inputFieldWrap: {
        flex: 1,
    },
    sendButton: {
        padding: 8,
        marginLeft: 4,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    errorText: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 16,
    },
    backButtonCenter: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
});
