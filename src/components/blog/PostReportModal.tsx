import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { blogService } from '../../api/blogService';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface PostReportModalProps {
    postId: string;
    visible: boolean;
    onClose: () => void;
}

export function PostReportModal({
    postId,
    visible,
    onClose,
}: PostReportModalProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();

    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập lý do báo cáo');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await blogService.reportPost(postId, reason.trim(), description.trim());
            if (res.success) {
                Alert.alert('Thành công', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét bài viết này.', [
                    { text: 'OK', onPress: handleClose }
                ]);
            } else {
                Alert.alert('Lỗi', res.message || 'Không thể gửi báo cáo lúc này');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi gửi báo cáo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setReason('');
        setDescription('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View style={[
                    styles.modalContainer,
                    { backgroundColor: palette.background, paddingBottom: Math.max(insets.bottom, 20) }
                ]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Báo cáo bài viết</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={24} color={palette.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={[styles.label, { color: palette.textPrimary }]}>Lý do <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
                                    color: palette.textPrimary,
                                    borderColor: palette.border
                                }
                            ]}
                            placeholder="Nhập lý do báo cáo (VD: Spam, Nội dung độc hại...)"
                            placeholderTextColor={palette.textMuted}
                            value={reason}
                            onChangeText={setReason}
                            maxLength={100}
                        />

                        <Text style={[styles.label, { color: palette.textPrimary }]}>Mô tả chi tiết</Text>
                        <TextInput
                            style={[
                                styles.input,
                                styles.textArea,
                                {
                                    backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
                                    color: palette.textPrimary,
                                    borderColor: palette.border
                                }
                            ]}
                            placeholder="Cung cấp thêm thông tin để chúng tôi xem xét..."
                            placeholderTextColor={palette.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            maxLength={500}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: palette.primary, opacity: isSubmitting ? 0.7 : 1 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 10,
    },
    required: {
        color: '#EF4444',
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    submitButton: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
