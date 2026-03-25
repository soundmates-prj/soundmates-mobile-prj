import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { blogService } from '../../api';
import { showToast } from '../../components/ui/Toast';
import { useUser } from '../../context/UserContext';

// ─────────────────────────────────────────────────────
// MOOD TAG CHIPS
// ─────────────────────────────────────────────────────

const MOOD_TAGS = [
    { id: 'chill', label: '🎵 Chill', color: '#8B5CF6' },
    { id: 'study', label: '📚 Study', color: '#3B82F6' },
    { id: 'workout', label: '💪 Workout', color: '#EF4444' },
    { id: 'party', label: '🎉 Party', color: '#F59E0B' },
    { id: 'relax', label: '🧘 Relax', color: '#10B981' },
    { id: 'acoustic', label: '🎸 Acoustic', color: '#F97316' },
    { id: 'edm', label: '🎧 EDM', color: '#EC4899' },
    { id: 'hiphop', label: '🎤 Hip-Hop', color: '#6366F1' },
    { id: 'indie', label: '🌙 Indie', color: '#14B8A6' },
    { id: 'kpop', label: '🇰🇷 K-Pop', color: '#E879F9' },
];

// ─────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────

interface CreatePostScreenProps {
    onBack: () => void;
    onPostCreated: () => void;
    editingPost?: EditablePostDraft | null;
}

export interface EditablePostDraft {
    id: string;
    title: string;
    contentText: string;
    moodTag?: string | null;
    imageUrl?: string | null;
}

export default function CreatePostScreen({ onBack, onPostCreated, editingPost = null }: CreatePostScreenProps) {
    const { user } = useUser();
    const isEditMode = !!editingPost?.id;
    const initialTitle = editingPost?.title?.trim() || '';
    const initialContent = editingPost?.contentText?.trim() || '';
    const initialMoodTag = editingPost?.moodTag || '';
    const initialImageUrl = editingPost?.imageUrl || '';

    const [title, setTitle] = useState(editingPost?.title || '');
    const [content, setContent] = useState(editingPost?.contentText || '');
    const [selectedMoodTag, setSelectedMoodTag] = useState<string | null>(editingPost?.moodTag || null);
    const [selectedImage, setSelectedImage] = useState<string | null>(editingPost?.imageUrl || null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setTitle(editingPost?.title || '');
        setContent(editingPost?.contentText || '');
        setSelectedMoodTag(editingPost?.moodTag || null);
        setSelectedImage(editingPost?.imageUrl || null);
    }, [editingPost]);

    const hasUnsavedChanges =
        title.trim() !== initialTitle ||
        content.trim() !== initialContent ||
        (selectedMoodTag || '') !== initialMoodTag ||
        (selectedImage || '') !== initialImageUrl;

    const hasRequiredFields = title.trim().length > 0 && content.trim().length > 0;
    const isPostEnabled =
        hasRequiredFields &&
        !isSubmitting &&
        (!isEditMode || hasUnsavedChanges);
    const characterCount = content.length;
    const shouldPromptBeforeExit = isEditMode
        ? hasUnsavedChanges
        : title.trim().length > 0 || content.trim().length > 0 || !!selectedMoodTag || !!selectedImage;

    // Get display name
    const displayName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.username || 'Bạn';
    const avatarUrl = user?.profileImageUrl || `https://api.dicebear.com/7.x/initials/png?seed=${displayName}&backgroundColor=55C5F1`;

    // ───── Handlers ─────

    const handlePickImage = async () => {
        try {
            const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permResult.granted) {
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.log('[CreatePost] Image pick error:', error);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
    };

    const handleSubmit = async () => {
        if (!isPostEnabled) return;

        setIsSubmitting(true);
        try {
            if (isEditMode && editingPost?.id) {
                const updateResult = await blogService.updatePost(editingPost.id, {
                    title: title.trim(),
                    contentText: content.trim(),
                    moodTag: selectedMoodTag || undefined,
                    imageUrl: selectedImage || undefined,
                    privacyScope: 'Public',
                });

                if (updateResult.success) {
                    showToast.success('Cập nhật thành công', 'Bài viết đã được cập nhật');
                    onPostCreated();
                } else {
                    showToast.error('Cập nhật thất bại', updateResult.message || 'Vui lòng thử lại');
                }
            } else {
                const result = await blogService.createPost({
                    title: title.trim(),
                    contentText: content.trim(),
                    moodTag: selectedMoodTag || undefined,
                    imageUrl: selectedImage || undefined,
                    privacyScope: 'Public',
                });

                if (result.success && result.data?.id) {
                    // Backend may automatically publish the post. Only publish if it's not already 'Published'
                    if (result.data.status !== 'Published') {
                        await blogService.publishPost(result.data.id);
                    }
                    showToast.success('Đăng bài thành công', 'Bài viết đã được đăng');
                    onPostCreated();
                } else {
                    showToast.error('Đăng bài thất bại', result.message || 'Vui lòng thử lại');
                }
            }
        } catch (error) {
            console.log('[CreatePost] Error:', error);
            showToast.error(isEditMode ? 'Cập nhật thất bại' : 'Đăng bài thất bại', 'Vui lòng thử lại sau');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExitRequest = useCallback(() => {
        if (isSubmitting) {
            return;
        }

        if (!shouldPromptBeforeExit) {
            onBack();
            return;
        }

        Alert.alert(
            isEditMode ? 'Bỏ thay đổi?' : 'Bỏ bài viết?',
            isEditMode
                ? 'Các thay đổi chưa được lưu. Bạn muốn bỏ thay đổi hay tiếp tục chỉnh sửa?'
                : 'Bài viết đang soạn chưa được đăng. Bạn muốn bỏ bài viết hay tiếp tục viết?',
            [
                {
                    text: 'Tiếp tục viết',
                    style: 'cancel',
                },
                {
                    text: isEditMode ? 'Bỏ thay đổi' : 'Bỏ bài viết',
                    style: 'destructive',
                    onPress: onBack,
                },
            ],
        );
    }, [isEditMode, isSubmitting, onBack, shouldPromptBeforeExit]);

    useEffect(() => {
        const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
            handleExitRequest();
            return true;
        });

        return () => {
            backSubscription.remove();
        };
    }, [handleExitRequest]);

    // ───── Render ─────

    return (
        <View style={styles.screen}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleExitRequest}
                    activeOpacity={0.7}
                    style={styles.headerBackButton}
                    disabled={isSubmitting}
                >
                    <Ionicons name="close" size={24} color="#1E293B" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{isEditMode ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}</Text>

                <TouchableOpacity
                    onPress={handleSubmit}
                    activeOpacity={0.8}
                    disabled={!isPostEnabled}
                    style={styles.headerPostButtonWrap}
                >
                    <LinearGradient
                        colors={isPostEnabled ? ['#55C5F1', '#3BB5E8'] : ['#E5E7EB', '#E5E7EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.headerPostButton}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={[styles.headerPostText, !isPostEnabled && styles.headerPostTextDisabled]}>
                                {isEditMode ? 'Cập nhật' : 'Đăng bài'}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.body}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Author info ── */}
                    <View style={styles.authorSection}>
                        <Image source={{ uri: avatarUrl }} style={styles.authorAvatar} />
                        <View style={styles.authorInfo}>
                            <Text style={styles.authorName}>{displayName}</Text>
                            <TouchableOpacity style={styles.privacyBadge} activeOpacity={0.7}>
                                <Ionicons name="earth" size={12} color="#55C5F1" />
                                <Text style={styles.privacyText}>Công khai</Text>
                                <Ionicons name="chevron-down" size={12} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Title input ── */}
                    <View style={styles.titleSection}>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Tiêu đề bài viết..."
                            placeholderTextColor="#CBD5E1"
                            style={styles.titleInput}
                            maxLength={150}
                            editable={!isSubmitting}
                        />
                        <Text style={styles.titleCharCount}>{title.length}/150</Text>
                    </View>

                    {/* ── Content input ── */}
                    <TextInput
                        value={content}
                        onChangeText={setContent}
                        placeholder="Bạn đang nghĩ gì về âm nhạc hôm nay?"
                        placeholderTextColor="#CBD5E1"
                        multiline
                        textAlignVertical="top"
                        style={styles.contentInput}
                        editable={!isSubmitting}
                    />
                    {characterCount > 0 && (
                        <Text style={styles.charCount}>{characterCount} ký tự</Text>
                    )}

                    {/* ── Selected Image Preview ── */}
                    {selectedImage && (
                        <View style={styles.imagePreviewWrap}>
                            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                            <TouchableOpacity
                                style={styles.imageRemoveButton}
                                onPress={handleRemoveImage}
                                activeOpacity={0.8}
                            >
                                <View style={styles.imageRemoveIcon}>
                                    <Ionicons name="close" size={16} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Mood Tags ── */}
                    <View style={styles.moodSection}>
                        <Text style={styles.moodLabel}>
                            <Ionicons name="musical-notes" size={14} color="#55C5F1" />
                            {'  '}Mood Tag
                        </Text>
                        <View style={styles.moodTagsWrap}>
                            {MOOD_TAGS.map((tag) => {
                                const isSelected = selectedMoodTag === tag.id;
                                return (
                                    <TouchableOpacity
                                        key={tag.id}
                                        onPress={() => setSelectedMoodTag(isSelected ? null : tag.id)}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.moodTag,
                                            isSelected && { backgroundColor: tag.color, borderColor: tag.color },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.moodTagText,
                                                isSelected && styles.moodTagTextSelected,
                                            ]}
                                        >
                                            {tag.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                {/* ── Bottom attachment bar ── */}
                <View style={styles.attachmentBar}>
                    <Text style={styles.attachmentLabel}>Thêm vào bài viết</Text>
                    <View style={styles.attachmentActions}>
                        <TouchableOpacity
                            style={styles.attachmentButton}
                            activeOpacity={0.7}
                            onPress={handlePickImage}
                            disabled={isSubmitting}
                        >
                            <Ionicons name="image" size={22} color="#10B981" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.attachmentButton} activeOpacity={0.7} disabled={isSubmitting}>
                            <Ionicons name="musical-note" size={22} color="#A78BFA" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.attachmentButton} activeOpacity={0.7} disabled={isSubmitting}>
                            <Ionicons name="link" size={22} color="#3B82F6" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.attachmentButton} activeOpacity={0.7} disabled={isSubmitting}>
                            <Ionicons name="location" size={22} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // ── Header ──
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
    },
    headerPostButtonWrap: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    headerPostButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
    },
    headerPostText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerPostTextDisabled: {
        color: '#9CA3AF',
    },

    // ── Body ──
    body: {
        flex: 1,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },

    // ── Author ──
    authorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
    },
    authorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
        borderWidth: 2,
        borderColor: '#55C5F1',
    },
    authorInfo: {
        marginLeft: 12,
        flex: 1,
    },
    authorName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    privacyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    privacyText: {
        fontSize: 12,
        color: '#55C5F1',
        fontWeight: '600',
        marginHorizontal: 4,
    },

    // ── Title ──
    titleSection: {
        paddingHorizontal: 20,
        marginBottom: 4,
    },
    titleInput: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        paddingVertical: 8,
        paddingHorizontal: 0,
        borderBottomWidth: 2,
        borderBottomColor: '#F1F5F9',
    },
    titleCharCount: {
        textAlign: 'right',
        fontSize: 11,
        color: '#CBD5E1',
        marginTop: 4,
    },

    // ── Content ──
    contentInput: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 16,
        color: '#334155',
        lineHeight: 24,
        minHeight: 160,
    },
    charCount: {
        textAlign: 'right',
        fontSize: 11,
        color: '#CBD5E1',
        paddingHorizontal: 20,
        marginBottom: 8,
    },

    // ── Image Preview ──
    imagePreviewWrap: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 16,
    },
    imageRemoveButton: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    imageRemoveIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Mood Tags ──
    moodSection: {
        paddingHorizontal: 20,
        marginTop: 8,
        marginBottom: 16,
    },
    moodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 12,
    },
    moodTagsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    moodTag: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        marginRight: 8,
        marginBottom: 8,
    },
    moodTagText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    moodTagTextSelected: {
        color: '#FFFFFF',
    },

    // ── Attachment bar ──
    attachmentBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    attachmentLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
    },
    attachmentActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    attachmentButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
});
