import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
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
const OTHER_MOOD_ID = 'other';
const MOOD_OPTIONS = [...MOOD_TAGS, { id: OTHER_MOOD_ID, label: '✨ Khác', color: '#94A3B8' }];

const MIN_CROP_SIZE = 80;
const TITLE_PLACEHOLDER_HEIGHT = 52;
const CONTENT_PLACEHOLDER_HEIGHT = 80;
const TITLE_LINE_HEIGHT = 28;
const CONTENT_LINE_HEIGHT = 24;
const IMAGE_PREVIEW_MIN_HEIGHT = 220;
const IMAGE_PREVIEW_MAX_HEIGHT = 4200;

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

interface CropRect {
    originX: number;
    originY: number;
    width: number;
    height: number;
}

type ActiveTextField = 'title' | 'content' | null;

const normalizeMoodTag = (value: string) => value.trim().toLowerCase();

const parseMoodTags = (value?: string | null) => {
    if (!value) {
        return [] as string[];
    }

    return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
};

export default function CreatePostScreen({ onBack, onPostCreated, editingPost = null }: CreatePostScreenProps) {
    const { user } = useUser();
    const isEditMode = !!editingPost?.id;
    const initialTitle = editingPost?.title?.trim() || '';
    const initialContent = editingPost?.contentText?.trim() || '';
    const initialMoodTags = parseMoodTags(editingPost?.moodTag);
    const initialMoodTag = initialMoodTags.join(',');
    const initialImageUrl = editingPost?.imageUrl || '';

    const [title, setTitle] = useState(editingPost?.title || '');
    const [content, setContent] = useState(editingPost?.contentText || '');
    const [titleDisplayHeight, setTitleDisplayHeight] = useState(TITLE_PLACEHOLDER_HEIGHT);
    const [contentDisplayHeight, setContentDisplayHeight] = useState(CONTENT_PLACEHOLDER_HEIGHT);
    const [activeTextField, setActiveTextField] = useState<ActiveTextField>(null);
    const [textEditorValue, setTextEditorValue] = useState('');
    const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>(initialMoodTags);
    const [customMoodInput, setCustomMoodInput] = useState('');
    const [showCustomMoodInput, setShowCustomMoodInput] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(editingPost?.imageUrl || null);
    const [selectedImageAspectRatio, setSelectedImageAspectRatio] = useState(1);
    const [cropSourceImage, setCropSourceImage] = useState<string | null>(editingPost?.imageUrl || null);
    const [savedCropRect, setSavedCropRect] = useState<CropRect | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCropEditor, setShowCropEditor] = useState(false);
    const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
    const [cropCanvasSize, setCropCanvasSize] = useState({ width: 0, height: 0 });
    const [imageDisplayRect, setImageDisplayRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [cropFrame, setCropFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const cropFrameRef = useRef(cropFrame);
    const previewWidth = Dimensions.get('window').width - 40;

    useEffect(() => {
        setTitle(editingPost?.title || '');
        setContent(editingPost?.contentText || '');
        setTitleDisplayHeight(TITLE_PLACEHOLDER_HEIGHT);
        setContentDisplayHeight(CONTENT_PLACEHOLDER_HEIGHT);
        setActiveTextField(null);
        setTextEditorValue('');
        setSelectedMoodTags(parseMoodTags(editingPost?.moodTag));
        setCustomMoodInput('');
        setShowCustomMoodInput(false);
        setSelectedImage(editingPost?.imageUrl || null);
        setCropSourceImage(editingPost?.imageUrl || null);
        setSavedCropRect(null);
    }, [editingPost]);

    useEffect(() => {
        if (!selectedImage) {
            setSelectedImageAspectRatio(1);
            return;
        }

        Image.getSize(
            selectedImage,
            (width, height) => {
                if (width > 0 && height > 0) {
                    setSelectedImageAspectRatio(width / height);
                }
            },
            () => {
                setSelectedImageAspectRatio(1);
            },
        );
    }, [selectedImage]);

    const hasUnsavedChanges =
        title.trim() !== initialTitle ||
        content.trim() !== initialContent ||
        selectedMoodTags.join(',') !== initialMoodTag ||
        (selectedImage || '') !== initialImageUrl;

    const hasRequiredFields = title.trim().length > 0 && content.trim().length > 0;
    const isPostEnabled =
        hasRequiredFields &&
        !isSubmitting &&
        (!isEditMode || hasUnsavedChanges);
    const characterCount = content.length;
    const shouldPromptBeforeExit = isEditMode
        ? hasUnsavedChanges
        : title.trim().length > 0 || content.trim().length > 0 || selectedMoodTags.length > 0 || !!selectedImage;
    const imagePreviewHeight = Math.min(
        IMAGE_PREVIEW_MAX_HEIGHT,
        Math.max(IMAGE_PREVIEW_MIN_HEIGHT, previewWidth / Math.max(selectedImageAspectRatio, 0.01)),
    );

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
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]) {
                const pickedUri = result.assets[0].uri;
                setSelectedImage(pickedUri);
                setCropSourceImage(pickedUri);
                setSavedCropRect(null);
            }
        } catch (error) {
            console.log('[CreatePost] Image pick error:', error);
        }
    };

    const openTextEditor = (field: Exclude<ActiveTextField, null>) => {
        setActiveTextField(field);
        setTextEditorValue(field === 'title' ? title : content);
    };

    const handleDoneTextEditor = () => {
        if (!activeTextField) {
            return;
        }

        if (activeTextField === 'title') {
            setTitle(textEditorValue);
        } else {
            setContent(textEditorValue);
        }

        setActiveTextField(null);
    };

    const addMoodTag = (tagValue: string) => {
        const raw = tagValue.trim();
        if (!raw) {
            return;
        }

        const normalizedRaw = normalizeMoodTag(raw);
        setSelectedMoodTags((prev) => {
            if (prev.some((item) => normalizeMoodTag(item) === normalizedRaw)) {
                return prev;
            }
            return [...prev, raw];
        });
    };

    const handleSelectMoodTag = (tagId: string) => {
        if (tagId === OTHER_MOOD_ID) {
            setShowCustomMoodInput(true);
            return;
        }

        addMoodTag(tagId);
    };

    const handleRemoveMoodTag = (tagValue: string) => {
        const normalized = normalizeMoodTag(tagValue);
        setSelectedMoodTags((prev) => prev.filter((item) => normalizeMoodTag(item) !== normalized));
    };

    const handleAddCustomMood = () => {
        const nextValue = customMoodInput.trim();
        if (!nextValue) {
            return;
        }

        addMoodTag(nextValue);
        setCustomMoodInput('');
    };

    const handleHideCustomMoodInput = () => {
        setCustomMoodInput('');
        setShowCustomMoodInput(false);
    };

    const handleTitleTextLayout = (lineCount: number) => {
        if (!title.trim()) {
            return;
        }

        const nextHeight = Math.max(TITLE_PLACEHOLDER_HEIGHT, lineCount * TITLE_LINE_HEIGHT + 20);
        setTitleDisplayHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    const handleContentTextLayout = (lineCount: number) => {
        if (!content.trim()) {
            return;
        }

        const nextHeight = Math.max(CONTENT_PLACEHOLDER_HEIGHT, lineCount * CONTENT_LINE_HEIGHT + 24);
        setContentDisplayHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    useEffect(() => {
        if (!title.trim()) {
            setTitleDisplayHeight(TITLE_PLACEHOLDER_HEIGHT);
        }
    }, [title]);

    useEffect(() => {
        if (!content.trim()) {
            setContentDisplayHeight(CONTENT_PLACEHOLDER_HEIGHT);
        }
    }, [content]);

    const handleEditImageCrop = async () => {
        const imageToCrop = cropSourceImage || selectedImage;
        if (!imageToCrop) {
            return;
        }

        try {
            const imageSize = await new Promise<{ width: number; height: number }>((resolve, reject) => {
                Image.getSize(
                    imageToCrop,
                    (width, height) => resolve({ width, height }),
                    (error) => reject(error),
                );
            });

            setImageNaturalSize(imageSize);
            setShowCropEditor(true);
        } catch (error) {
            console.log('[CreatePost] Load image size error:', error);
            showToast.error('Không thể chỉnh sửa ảnh', 'Vui lòng thử lại');
        }
    };

    const cropPanResponder = useMemo(
        () => PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                cropFrameRef.current = cropFrame;
            },
            onPanResponderMove: (_, gesture) => {
                setCropFrame((prev) => {
                    const minX = imageDisplayRect.x;
                    const maxX = imageDisplayRect.x + imageDisplayRect.width - prev.width;
                    const minY = imageDisplayRect.y;
                    const maxY = imageDisplayRect.y + imageDisplayRect.height - prev.height;

                    const nextX = Math.min(maxX, Math.max(minX, cropFrameRef.current.x + gesture.dx));
                    const nextY = Math.min(maxY, Math.max(minY, cropFrameRef.current.y + gesture.dy));

                    return { ...prev, x: nextX, y: nextY };
                });
            },
        }),
        [cropFrame, imageDisplayRect],
    );

    const createResizePanResponder = useCallback((corner: 'tl' | 'tr' | 'bl' | 'br') => {
        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                cropFrameRef.current = cropFrame;
            },
            onPanResponderMove: (_, gesture) => {
                const base = cropFrameRef.current;
                let left = base.x;
                let top = base.y;
                let right = base.x + base.width;
                let bottom = base.y + base.height;

                if (corner === 'tl') {
                    left += gesture.dx;
                    top += gesture.dy;
                }

                if (corner === 'tr') {
                    right += gesture.dx;
                    top += gesture.dy;
                }

                if (corner === 'bl') {
                    left += gesture.dx;
                    bottom += gesture.dy;
                }

                if (corner === 'br') {
                    right += gesture.dx;
                    bottom += gesture.dy;
                }

                const minLeft = imageDisplayRect.x;
                const maxRight = imageDisplayRect.x + imageDisplayRect.width;
                const minTop = imageDisplayRect.y;
                const maxBottom = imageDisplayRect.y + imageDisplayRect.height;

                left = Math.max(minLeft, Math.min(left, maxRight - MIN_CROP_SIZE));
                top = Math.max(minTop, Math.min(top, maxBottom - MIN_CROP_SIZE));
                right = Math.min(maxRight, Math.max(right, minLeft + MIN_CROP_SIZE));
                bottom = Math.min(maxBottom, Math.max(bottom, minTop + MIN_CROP_SIZE));

                if (right - left < MIN_CROP_SIZE) {
                    if (corner === 'tl' || corner === 'bl') {
                        left = right - MIN_CROP_SIZE;
                    } else {
                        right = left + MIN_CROP_SIZE;
                    }
                }

                if (bottom - top < MIN_CROP_SIZE) {
                    if (corner === 'tl' || corner === 'tr') {
                        top = bottom - MIN_CROP_SIZE;
                    } else {
                        bottom = top + MIN_CROP_SIZE;
                    }
                }

                setCropFrame({
                    x: left,
                    y: top,
                    width: right - left,
                    height: bottom - top,
                });
            },
        });
    }, [cropFrame, imageDisplayRect]);

    const resizeTopLeftResponder = useMemo(() => createResizePanResponder('tl'), [createResizePanResponder]);
    const resizeTopRightResponder = useMemo(() => createResizePanResponder('tr'), [createResizePanResponder]);
    const resizeBottomLeftResponder = useMemo(() => createResizePanResponder('bl'), [createResizePanResponder]);
    const resizeBottomRightResponder = useMemo(() => createResizePanResponder('br'), [createResizePanResponder]);

    const handleApplyCrop = async () => {
        const imageToCrop = cropSourceImage || selectedImage;
        if (!imageToCrop || !imageDisplayRect.width || !imageDisplayRect.height || !imageNaturalSize.width || !imageNaturalSize.height) {
            return;
        }

        try {
            const scaleX = imageNaturalSize.width / imageDisplayRect.width;
            const scaleY = imageNaturalSize.height / imageDisplayRect.height;

            const originX = Math.max(0, Math.round((cropFrame.x - imageDisplayRect.x) * scaleX));
            const originY = Math.max(0, Math.round((cropFrame.y - imageDisplayRect.y) * scaleY));
            const width = Math.max(1, Math.round(cropFrame.width * scaleX));
            const height = Math.max(1, Math.round(cropFrame.height * scaleY));

            const nextCropRect: CropRect = {
                originX,
                originY,
                width,
                height,
            };

            const manipulatedImage = await ImageManipulator.manipulateAsync(
                imageToCrop,
                [
                    {
                        crop: nextCropRect,
                    },
                ],
                {
                    compress: 0.9,
                    format: ImageManipulator.SaveFormat.JPEG,
                },
            );

            setSelectedImage(manipulatedImage.uri);
            setSavedCropRect(nextCropRect);
            setShowCropEditor(false);
        } catch (error) {
            console.log('[CreatePost] Apply crop error:', error);
            showToast.error('Không thể cắt ảnh', 'Vui lòng thử lại');
        }
    };

    useEffect(() => {
        if (!showCropEditor || !cropCanvasSize.width || !cropCanvasSize.height || !imageNaturalSize.width || !imageNaturalSize.height) {
            return;
        }

        const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
        const canvasAspect = cropCanvasSize.width / cropCanvasSize.height;

        let displayWidth = cropCanvasSize.width;
        let displayHeight = cropCanvasSize.height;
        let displayX = 0;
        let displayY = 0;

        if (imageAspect > canvasAspect) {
            displayHeight = cropCanvasSize.width / imageAspect;
            displayY = (cropCanvasSize.height - displayHeight) / 2;
        } else {
            displayWidth = cropCanvasSize.height * imageAspect;
            displayX = (cropCanvasSize.width - displayWidth) / 2;
        }

        setImageDisplayRect({
            x: displayX,
            y: displayY,
            width: displayWidth,
            height: displayHeight,
        });

        if (savedCropRect) {
            const scaleDisplayX = displayWidth / imageNaturalSize.width;
            const scaleDisplayY = displayHeight / imageNaturalSize.height;
            const frameX = displayX + (savedCropRect.originX * scaleDisplayX);
            const frameY = displayY + (savedCropRect.originY * scaleDisplayY);
            const frameWidth = savedCropRect.width * scaleDisplayX;
            const frameHeight = savedCropRect.height * scaleDisplayY;

            setCropFrame({
                x: Math.max(displayX, frameX),
                y: Math.max(displayY, frameY),
                width: Math.min(displayWidth, Math.max(MIN_CROP_SIZE, frameWidth)),
                height: Math.min(displayHeight, Math.max(MIN_CROP_SIZE, frameHeight)),
            });
            return;
        }

        const frameWidth = displayWidth;
        const frameHeight = displayHeight;
        setCropFrame({
            x: displayX,
            y: displayY,
            width: frameWidth,
            height: frameHeight,
        });
    }, [showCropEditor, cropCanvasSize, imageNaturalSize, savedCropRect]);

    useEffect(() => {
        cropFrameRef.current = cropFrame;
    }, [cropFrame]);

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setCropSourceImage(null);
        setSavedCropRect(null);
    };

    const handleSubmit = async () => {
        if (!isPostEnabled) return;

        setIsSubmitting(true);
        try {
            if (isEditMode && editingPost?.id) {
                const updateResult = await blogService.updatePost(editingPost.id, {
                    title: title.trim(),
                    contentText: content.trim(),
                    moodTag: selectedMoodTags.length > 0 ? selectedMoodTags.join(',') : undefined,
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
                    moodTag: selectedMoodTags.length > 0 ? selectedMoodTags.join(',') : undefined,
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
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => openTextEditor('title')}
                            style={[styles.titleInput, { minHeight: titleDisplayHeight }]}
                            disabled={isSubmitting}
                        >
                            <Text
                                style={title.trim() ? styles.titleText : styles.titlePlaceholderText}
                                onTextLayout={(event) => handleTitleTextLayout(event.nativeEvent.lines.length)}
                            >
                                {title.trim() || 'Tiêu đề bài viết...'}
                            </Text>
                        </TouchableOpacity>
                        {/* <Text style={styles.titleCharCount}>{title.length}/150</Text> */}
                    </View>

                    {/* ── Content input ── */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => openTextEditor('content')}
                        style={[styles.contentInput, { minHeight: contentDisplayHeight }]}
                        disabled={isSubmitting}
                    >
                        <Text
                            style={content.trim() ? styles.contentText : styles.contentPlaceholderText}
                            onTextLayout={(event) => handleContentTextLayout(event.nativeEvent.lines.length)}
                        >
                            {content.trim() || 'Bạn đang nghĩ gì về âm nhạc hôm nay?'}
                        </Text>
                    </TouchableOpacity>
                    {characterCount > 0 && (
                        <Text style={styles.charCount}>{characterCount} ký tự</Text>
                    )}

                    {/* ── Mood Tags ── */}
                    <View style={styles.moodSection}>
                        <View style={styles.moodHeaderRow}>
                            <Text style={styles.moodLabel}>
                                <Ionicons name="musical-notes" size={14} color="#55C5F1" />
                                {'  '}Mood Tag
                            </Text>
                            {selectedMoodTags.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.selectedMoodTagsRow}
                                >
                                    {selectedMoodTags.map((tag) => (
                                        <TouchableOpacity
                                            key={tag}
                                            activeOpacity={0.8}
                                            onPress={() => handleRemoveMoodTag(tag)}
                                            style={styles.selectedMoodTagChip}
                                        >
                                            <Text style={styles.selectedMoodTagText}>{tag}</Text>
                                            <Ionicons name="close" size={14} color="#0EA5E9" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {showCustomMoodInput && (
                            <View style={styles.customMoodInputRow}>
                                <TextInput
                                    value={customMoodInput}
                                    onChangeText={setCustomMoodInput}
                                    placeholder="Thêm mood của bạn..."
                                    placeholderTextColor="#94A3B8"
                                    style={styles.customMoodInput}
                                    returnKeyType="done"
                                    onSubmitEditing={handleAddCustomMood}
                                />
                                <TouchableOpacity
                                    style={styles.customMoodAddButton}
                                    onPress={handleAddCustomMood}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add" size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.customMoodCloseButton}
                                    onPress={handleHideCustomMoodInput}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close" size={16} color="#0F172A" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.moodTagsScroll}
                            contentContainerStyle={styles.moodTagsRow}
                        >
                            {MOOD_OPTIONS.filter((tag) => {
                                if (tag.id === OTHER_MOOD_ID) {
                                    return true;
                                }

                                return !selectedMoodTags.some((item) => normalizeMoodTag(item) === normalizeMoodTag(tag.id));
                            }).map((tag) => {
                                const isOtherTag = tag.id === OTHER_MOOD_ID;
                                return (
                                    <TouchableOpacity
                                        key={tag.id}
                                        onPress={() => handleSelectMoodTag(tag.id)}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.moodTag,
                                            isOtherTag && showCustomMoodInput && styles.moodTagActive,
                                        ]}
                                    >
                                        <Text style={[styles.moodTagText, isOtherTag && showCustomMoodInput && styles.moodTagTextActive]}>{tag.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* ── Selected Image Preview ── */}
                    {selectedImage && (
                        <View style={styles.imagePreviewWrap}>
                            <Image
                                source={{ uri: selectedImage }}
                                style={[styles.imagePreview, { height: imagePreviewHeight }]}
                                resizeMode="cover"
                            />
                            <View style={styles.imageActionButtons}>
                                <TouchableOpacity
                                    style={styles.imageEditButton}
                                    onPress={handleEditImageCrop}
                                    activeOpacity={0.8}
                                    disabled={isSubmitting}
                                >
                                    <View style={styles.imageActionIcon}>
                                        <Ionicons name="create-outline" size={15} color="#FFFFFF" />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.imageRemoveButton}
                                    onPress={handleRemoveImage}
                                    activeOpacity={0.8}
                                    disabled={isSubmitting}
                                >
                                    <View style={styles.imageActionIcon}>
                                        <Ionicons name="close" size={16} color="#FFFFFF" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

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

            <Modal
                visible={activeTextField !== null}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setActiveTextField(null)}
            >
                <KeyboardAvoidingView
                    style={styles.textEditorScreen}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.textEditorHeader}>
                        <Text style={styles.textEditorTitle}>Thêm văn bản</Text>
                        <TouchableOpacity
                            onPress={handleDoneTextEditor}
                            activeOpacity={0.85}
                            style={styles.textEditorDoneButton}
                        >
                            <Text style={styles.textEditorDoneText}>Xong</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        value={textEditorValue}
                        onChangeText={setTextEditorValue}
                        autoFocus
                        multiline
                        style={styles.textEditorInput}
                        placeholder={activeTextField === 'title' ? 'Tiêu đề bài viết...' : 'Bạn đang nghĩ gì về âm nhạc hôm nay?'}
                        placeholderTextColor="#94A3B8"
                        textAlignVertical="top"
                        maxLength={activeTextField === 'title' ? 150 : undefined}
                    />
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={showCropEditor}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCropEditor(false)}
            >
                <View style={styles.cropModalOverlay}>
                    <View style={styles.cropModalCard}>
                        <View style={styles.cropHeader}>
                            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowCropEditor(false)}>
                                <Text style={styles.cropHeaderAction}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.cropHeaderTitle}>Cắt ảnh</Text>
                            <TouchableOpacity activeOpacity={0.8} onPress={() => void handleApplyCrop()}>
                                <Text style={styles.cropHeaderAction}>Áp dụng</Text>
                            </TouchableOpacity>
                        </View>

                        <View
                            style={styles.cropCanvas}
                            onLayout={(event) => {
                                const { width, height } = event.nativeEvent.layout;
                                setCropCanvasSize({ width, height });
                            }}
                        >
                            {cropSourceImage ? (
                                <Image
                                    source={{ uri: cropSourceImage }}
                                    style={[
                                        styles.cropImage,
                                        {
                                            left: imageDisplayRect.x,
                                            top: imageDisplayRect.y,
                                            width: imageDisplayRect.width,
                                            height: imageDisplayRect.height,
                                        },
                                    ]}
                                    resizeMode="contain"
                                />
                            ) : null}

                            <View style={[styles.cropShade, { left: imageDisplayRect.x, top: imageDisplayRect.y, width: imageDisplayRect.width, height: Math.max(0, cropFrame.y - imageDisplayRect.y) }]} />
                            <View style={[styles.cropShade, { left: imageDisplayRect.x, top: cropFrame.y + cropFrame.height, width: imageDisplayRect.width, height: Math.max(0, imageDisplayRect.y + imageDisplayRect.height - (cropFrame.y + cropFrame.height)) }]} />
                            <View style={[styles.cropShade, { left: imageDisplayRect.x, top: cropFrame.y, width: Math.max(0, cropFrame.x - imageDisplayRect.x), height: cropFrame.height }]} />
                            <View style={[styles.cropShade, { left: cropFrame.x + cropFrame.width, top: cropFrame.y, width: Math.max(0, imageDisplayRect.x + imageDisplayRect.width - (cropFrame.x + cropFrame.width)), height: cropFrame.height }]} />

                            <View
                                style={[
                                    styles.cropFrame,
                                    {
                                        left: cropFrame.x,
                                        top: cropFrame.y,
                                        width: cropFrame.width,
                                        height: cropFrame.height,
                                    },
                                ]}
                            >
                                <View {...cropPanResponder.panHandlers} style={styles.cropMoveArea} />

                                <View {...resizeTopLeftResponder.panHandlers} style={[styles.cropHandleTouch, styles.cropHandleTouchTopLeft]}>
                                    <View style={styles.cropHandle} />
                                </View>
                                <View {...resizeTopRightResponder.panHandlers} style={[styles.cropHandleTouch, styles.cropHandleTouchTopRight]}>
                                    <View style={styles.cropHandle} />
                                </View>
                                <View {...resizeBottomLeftResponder.panHandlers} style={[styles.cropHandleTouch, styles.cropHandleTouchBottomLeft]}>
                                    <View style={styles.cropHandle} />
                                </View>
                                <View {...resizeBottomRightResponder.panHandlers} style={[styles.cropHandleTouch, styles.cropHandleTouchBottomRight]}>
                                    <View style={styles.cropHandle} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
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
        minHeight: TITLE_PLACEHOLDER_HEIGHT,
        paddingVertical: 10,
        justifyContent: 'flex-start',
        borderBottomWidth: 2,
        borderBottomColor: '#F1F5F9',
    },
    titleText: {
        fontSize: 20,
        lineHeight: TITLE_LINE_HEIGHT,
        fontWeight: '700',
        color: '#1E293B',
        width: '100%',
    },
    titlePlaceholderText: {
        fontSize: 20,
        lineHeight: TITLE_LINE_HEIGHT,
        fontWeight: '700',
        color: '#CBD5E1',
        width: '100%',
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
        minHeight: CONTENT_PLACEHOLDER_HEIGHT,
        borderRadius: 14,
        // borderWidth: 1,
        // borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        justifyContent: 'flex-start',
    },
    contentText: {
        fontSize: 16,
        color: '#334155',
        lineHeight: 24,
    },
    contentPlaceholderText: {
        fontSize: 16,
        color: '#CBD5E1',
        lineHeight: 24,
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
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
    },
    imageRemoveButton: {
        marginTop: 8,
    },
    imageEditButton: {
        marginTop: 0,
    },
    imageActionButtons: {
        position: 'absolute',
        top: 10,
        right: 10,
        alignItems: 'center',
    },
    imageActionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textEditorScreen: {
        marginTop: Platform.OS === 'android' ? 0 : 30,
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    textEditorHeader: {
        height: 56,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    textEditorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    textEditorDoneButton: {
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    textEditorDoneText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0EA5E9',
    },
    textEditorInput: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        fontSize: 18,
        color: '#0F172A',
        lineHeight: 28,
    },
    cropModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    cropModalCard: {
        width: '100%',
        height: '82%',
        backgroundColor: '#0F172A',
        borderRadius: 16,
        overflow: 'hidden',
    },
    cropHeader: {
        height: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    cropHeaderTitle: {
        color: '#F8FAFC',
        fontSize: 15,
        fontWeight: '700',
    },
    cropHeaderAction: {
        color: '#55C5F1',
        fontSize: 14,
        fontWeight: '600',
    },
    cropCanvas: {
        flex: 1,
        position: 'relative',
    },
    cropImage: {
        position: 'absolute',
    },
    cropShade: {
        position: 'absolute',
        backgroundColor: 'rgba(2, 6, 23, 0.58)',
    },
    cropFrame: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        overflow: 'visible',
    },
    cropMoveArea: {
        flex: 1,
        margin: 18,
    },
    cropHandleTouch: {
        position: 'absolute',
        width: 44,
        height: 44,
        zIndex: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cropHandle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#55C5F1',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    cropHandleTouchTopLeft: {
        left: -22,
        top: -22,
    },
    cropHandleTouchTopRight: {
        right: -22,
        top: -22,
    },
    cropHandleTouchBottomLeft: {
        left: -22,
        bottom: -22,
    },
    cropHandleTouchBottomRight: {
        right: -22,
        bottom: -22,
    },

    // ── Mood Tags ──
    moodSection: {
        paddingHorizontal: 20,
        marginTop: 8,
        marginBottom: 16,
    },
    moodHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    moodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginRight: 10,
    },
    selectedMoodTagsRow: {
        alignItems: 'center',
        paddingRight: 8,
    },
    selectedMoodTagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 8,
    },
    selectedMoodTagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0369A1',
        marginRight: 4,
    },
    customMoodInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    customMoodInput: {
        flex: 1,
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 12,
        fontSize: 14,
        color: '#0F172A',
        backgroundColor: '#FFFFFF',
    },
    customMoodAddButton: {
        marginLeft: 8,
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#0EA5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    customMoodCloseButton: {
        marginLeft: 8,
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moodTagsScroll: {
        marginHorizontal: -2,
    },
    moodTagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
    },
    moodTag: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        marginRight: 8,
    },
    moodTagActive: {
        backgroundColor: '#E0F2FE',
        borderColor: '#7DD3FC',
    },
    moodTagText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    moodTagTextActive: {
        color: '#0369A1',
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
