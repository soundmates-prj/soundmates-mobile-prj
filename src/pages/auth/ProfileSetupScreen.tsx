import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { SoundMateLightColors } from '../../../constants/theme';
import { authService, uploadService } from '../../api';
import DateField from '../../components/ui/DateField';
import { showToast } from '../../components/ui/Toast';

interface ProfileSetupScreenProps {
    navigation?: any;
    onSetupComplete?: () => void;
    onSkip?: () => void;
    onNavigateBack?: () => void;
}

type GenderType = 'male' | 'female' | 'other' | null;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ProfileSetupScreen({
    onSetupComplete,
    onSkip,
    onNavigateBack,
}: ProfileSetupScreenProps) {
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState<GenderType>(null);
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [tempDate, setTempDate] = useState<Date>(new Date(2000, 0, 1));
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [showAvatarOptions, setShowAvatarOptions] = useState(false);

    const buttonScale = useSharedValue(1);

    const handlePressIn = useCallback(() => {
        buttonScale.value = withSpring(0.96);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [buttonScale]);

    const handlePressOut = useCallback(() => {
        buttonScale.value = withSpring(1);
    }, [buttonScale]);

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const dismissFloatingPickers = useCallback(() => {
        setShowGenderPicker(false);
        setShowDatePicker(false);
    }, []);

    const promptOpenSettings = useCallback((message: string) => {
        Alert.alert(
            'Cần cấp quyền',
            message,
            [
                { text: 'Để sau', style: 'cancel' },
                { text: 'Mở cài đặt', onPress: () => Linking.openSettings() },
            ],
            { cancelable: true }
        );
    }, []);

    const applyAvatarAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
        const previousAvatarUrl = avatarUrl;
        setAvatarUrl(asset.uri);
        setIsUploadingAvatar(true);

        try {
            const uploadResult = await uploadService.uploadImageToCloudinary({
                uri: asset.uri,
                fileName: asset.fileName, 
                mimeType: asset.mimeType,
            });

            if (!uploadResult.success || !uploadResult.data) {
                throw new Error(uploadResult.message || 'Upload ảnh thất bại');
            }

            setAvatarUrl(uploadResult.data);
            showToast.success('Đã cập nhật ảnh', 'Ảnh đại diện đã được tải lên thành công');
        } catch (error: any) {
            setAvatarUrl(previousAvatarUrl);
            showToast.error('Không thể tải ảnh', error?.message || 'Vui lòng thử lại sau');
        } finally {
            setIsUploadingAvatar(false);
        }
    }, [avatarUrl]);

    const handlePickAvatarFromLibrary = useCallback(async () => {
        if (isUploadingAvatar) return;
        setShowAvatarOptions(false);

        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                if (!permission.canAskAgain) {
                    promptOpenSettings('Vui lòng cấp quyền thư viện ảnh trong Cài đặt để chọn ảnh đại diện.');
                    return;
                }

                showToast.warning('Chưa có quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để tiếp tục');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            if (!result.canceled && result.assets?.[0]) {
                await applyAvatarAsset(result.assets[0]);
            }
        } catch {
            showToast.error('Không thể chọn ảnh', 'Vui lòng thử lại sau');
        }
    }, [applyAvatarAsset, isUploadingAvatar, promptOpenSettings]);

    const handleTakeAvatarPhoto = useCallback(async () => {
        if (isUploadingAvatar) return;
        setShowAvatarOptions(false);

        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                if (!permission.canAskAgain) {
                    promptOpenSettings('Vui lòng cấp quyền camera trong Cài đặt để chụp ảnh đại diện.');
                    return;
                }

                showToast.warning('Chưa có quyền camera', 'Vui lòng cấp quyền camera để chụp ảnh');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            if (!result.canceled && result.assets?.[0]) {
                await applyAvatarAsset(result.assets[0]);
            }
        } catch {
            showToast.error('Không thể mở camera', 'Vui lòng thử lại sau');
        }
    }, [applyAvatarAsset, isUploadingAvatar, promptOpenSettings]);

    const handleOpenAvatarOptions = useCallback(() => {
        dismissFloatingPickers();
        Keyboard.dismiss();
        setShowAvatarOptions(true);
    }, [dismissFloatingPickers]);

    const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (event?.type === 'set' && selectedDate) {
                setDateOfBirth(selectedDate);
            }
            return;
        }

        if (selectedDate) {
            setTempDate(selectedDate);
        }
    }, []);

    const openDatePickerModal = useCallback(() => {
        setShowGenderPicker(false);
        setTempDate(dateOfBirth || new Date(2000, 0, 1));
        setShowDatePicker(true);
    }, [dateOfBirth]);

    const handleCancelDatePicker = useCallback(() => {
        setShowDatePicker(false);
    }, []);

    const handleConfirmDatePicker = useCallback(() => {
        setDateOfBirth(tempDate);
        setShowDatePicker(false);
    }, [tempDate]);

    const formatDate = (date: Date | null): string => {
        if (!date) return 'Ngày sinh';
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getGenderLabel = (g: GenderType): string => {
        switch (g) {
            case 'male': return 'Nam';
            case 'female': return 'Nữ';
            case 'other': return 'Khác';
            default: return 'Giới tính';
        }
    };

    const handleSubmit = useCallback(async () => {
        setIsLoading(true);
        try {
            const profileData: any = {};
            if (bio.trim()) profileData.bio = bio.trim();
            if (phone.trim()) profileData.phone = phone.trim();
            if (gender) profileData.gender = gender;
            if (dateOfBirth) profileData.dateOfBirth = dateOfBirth.toISOString();
            if (avatarUrl.trim()) profileData.profileImageUrl = avatarUrl.trim();

            if (Object.keys(profileData).length === 0) {
                onSkip?.();
                return;
            }

            const response = await authService.updateProfileOptions(profileData);
            if (response.success) {
                showToast.success('Cập nhật thành công!', 'Thông tin của bạn đã được lưu');
                onSetupComplete?.();
            } else {
                showToast.error('Cập nhật thất bại', response.message);
            }
        } catch (error: any) {
            showToast.error('Lỗi kết nối', 'Vui lòng thử lại sau');
        } finally {
            setIsLoading(false);
        }
    }, [avatarUrl, bio, phone, gender, dateOfBirth, onSetupComplete, onSkip]);

    const maxDate = useMemo(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 13);
        return date;
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#E0F7FF', '#FFFFFF', '#F0F9FF']} style={StyleSheet.absoluteFill} />

            <Pressable
                style={styles.content}
                onPress={() => {
                    dismissFloatingPickers();
                    Keyboard.dismiss();
                }}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
                            <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={24} color={SoundMateLightColors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.avatarContainer}
                                onPress={handleOpenAvatarOptions}
                                activeOpacity={0.85}
                                disabled={isUploadingAvatar}
                            >
                                <BlurView intensity={60} tint="light" style={styles.avatarCircle}>
                                    {avatarUrl ? (
                                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                                    ) : (
                                        <Ionicons name="camera" size={32} color={SoundMateLightColors.primary} />
                                    )}
                                    {isUploadingAvatar && (
                                        <View style={styles.avatarLoadingOverlay}>
                                            <ActivityIndicator size="small" color={SoundMateLightColors.primary} />
                                        </View>
                                    )}
                                </BlurView>
                                <View style={styles.addIconContainer}>
                                    <Ionicons name="add" size={16} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(400).duration(800)}>
                            <Text style={styles.title}>Hoàn thiện hồ sơ</Text>
                            <Text style={styles.subtitle}>Hãy để mọi người biết thêm về bạn</Text>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.formContainer}>
                            <BlurView intensity={60} tint="light" style={styles.inputWrapper}>
                                <Ionicons name="call-outline" size={20} color={SoundMateLightColors.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Số điện thoại"
                                    placeholderTextColor={SoundMateLightColors.textMuted}
                                    value={phone}
                                    onChangeText={setPhone}
                                    onFocus={dismissFloatingPickers}
                                    keyboardType="phone-pad"
                                />
                            </BlurView>

                            <View style={styles.genderDropdownContainer}>
                                <TouchableOpacity onPress={() => {
                                    setShowDatePicker(false);
                                    setShowGenderPicker(!showGenderPicker);
                                }}>
                                    <BlurView intensity={60} tint="light" style={styles.inputWrapper}>
                                        <Ionicons name="male-female-outline" size={20} color={SoundMateLightColors.primary} style={styles.inputIcon} />
                                        <Text style={[styles.input, !gender && { color: SoundMateLightColors.textMuted }]}>
                                            {getGenderLabel(gender)}
                                        </Text>
                                        <Ionicons
                                            name={showGenderPicker ? 'chevron-up' : 'chevron-down'}
                                            size={18}
                                            color={SoundMateLightColors.textMuted}
                                        />
                                    </BlurView>
                                </TouchableOpacity>

                                {showGenderPicker && (
                                    <View style={styles.genderOptions}>
                                        {(['male', 'female', 'other'] as GenderType[]).map((g) => (
                                            <TouchableOpacity
                                                key={g}
                                                onPress={() => { setGender(g); setShowGenderPicker(false); }}
                                                style={[styles.genderOption, gender === g && styles.genderOptionActive]}
                                            >
                                                <Text style={[styles.genderOptionText, gender === g && styles.genderOptionTextActive]}>
                                                    {getGenderLabel(g)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <DateField
                                containerStyle={styles.inputWrapper}
                                onPress={openDatePickerModal}
                                value={formatDate(dateOfBirth)}
                                isPlaceholder={!dateOfBirth}
                                valueTextStyle={styles.input}
                                placeholderTextStyle={{ color: SoundMateLightColors.textMuted }}
                                leftIconName="calendar-outline"
                                leftIconColor={SoundMateLightColors.primary}
                                leftIconSize={20}
                                leftIconStyle={styles.inputIcon}
                                showChevron
                                isExpanded={showDatePicker}
                                chevronColor={SoundMateLightColors.textMuted}
                            />

                            <BlurView intensity={60} tint="light" style={[styles.inputWrapper, styles.bioWrapper]}>
                                <TextInput
                                    style={[styles.input, styles.bioInput]}
                                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                                    placeholderTextColor={SoundMateLightColors.textMuted}
                                    value={bio}
                                    onChangeText={setBio}
                                    onFocus={dismissFloatingPickers}
                                    multiline
                                    maxLength={200}
                                />
                            </BlurView>

                            <AnimatedTouchableOpacity
                                style={[styles.submitButtonWrapper, buttonAnimatedStyle]}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleSubmit}
                                disabled={isLoading || isUploadingAvatar}
                                activeOpacity={1}
                            >
                                <LinearGradient
                                    colors={[SoundMateLightColors.primary, SoundMateLightColors.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.submitButton}
                                >
                                    <Text style={styles.submitButtonText}>
                                        {isUploadingAvatar ? 'Đang tải ảnh...' : isLoading ? 'Đang lưu...' : 'Hoàn tất'}
                                    </Text>
                                </LinearGradient>
                            </AnimatedTouchableOpacity>

                            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                                <Text style={styles.skipButtonText}>Bỏ qua bước này</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Pressable>

            <Modal
                visible={showDatePicker}
                transparent
                animationType="fade"
                onRequestClose={handleCancelDatePicker}
            >
                <Pressable style={styles.dateModalBackdrop} onPress={handleCancelDatePicker}>
                    <Pressable style={styles.dateModalCard} onPress={() => { }}>
                        <Text style={styles.dateModalTitle}>Chọn ngày sinh</Text>
                        <DateTimePicker
                            value={Platform.OS === 'ios' ? tempDate : (dateOfBirth || new Date(2000, 0, 1))}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleDateChange}
                            maximumDate={maxDate}
                        />

                        {Platform.OS === 'ios' && (
                            <View style={styles.dateModalActions}>
                                <TouchableOpacity style={styles.dateModalButton} onPress={handleCancelDatePicker}>
                                    <Text style={styles.dateModalButtonText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.dateModalButton} onPress={handleConfirmDatePicker}>
                                    <Text style={[styles.dateModalButtonText, styles.dateModalButtonTextPrimary]}>Xác nhận</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={showAvatarOptions}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAvatarOptions(false)}
            >
                <Pressable style={styles.avatarOptionsBackdrop} onPress={() => setShowAvatarOptions(false)}>
                    <Pressable style={styles.avatarOptionsCard} onPress={() => { }}>
                        <Text style={styles.avatarOptionsTitle}>Chọn ảnh đại diện</Text>

                        <TouchableOpacity
                            style={styles.avatarOptionButton}
                            onPress={handleTakeAvatarPhoto}
                            disabled={isUploadingAvatar}
                        >
                            <Ionicons name="camera-outline" size={20} color={SoundMateLightColors.primary} />
                            <Text style={styles.avatarOptionText}>Chụp ảnh mới</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.avatarOptionButton}
                            onPress={handlePickAvatarFromLibrary}
                            disabled={isUploadingAvatar}
                        >
                            <Ionicons name="images-outline" size={20} color={SoundMateLightColors.primary} />
                            <Text style={styles.avatarOptionText}>Chọn từ thư viện</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.avatarOptionButton, styles.avatarOptionCancelButton]}
                            onPress={() => setShowAvatarOptions(false)}
                        >
                            <Text style={styles.avatarOptionCancelText}>Hủy</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={isUploadingAvatar}
                transparent
                animationType="fade"
            >
                <View style={styles.uploadBlockingOverlay}>
                    <View style={styles.uploadBlockingCard}>
                        <ActivityIndicator size="large" color={SoundMateLightColors.primary} />
                        <Text style={styles.uploadBlockingText}>Đang tải ảnh...</Text>
                        <Text style={styles.uploadBlockingHint}>Vui lòng đợi trong giây lát...</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 30,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    backButton: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#5CC9F1',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addIconContainer: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: SoundMateLightColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    formContainer: {
        gap: 12,
    },
    genderDropdownContainer: {
        position: 'relative',
        zIndex: 30,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 18,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#5CC9F1',
        overflow: 'hidden',
    },
    bioWrapper: {
        height: 120,
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1A1A1A',
        fontWeight: '500',
    },
    bioInput: {
        height: '100%',
        textAlignVertical: 'top',
    },
    genderOptions: {
        position: 'absolute',
        top: 62,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
    },
    dateModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    dateModalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingTop: 12,
        paddingHorizontal: 8,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    dateModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 4,
    },
    dateModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    dateModalButton: {
        height: 36,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    dateModalButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
    dateModalButtonTextPrimary: {
        color: SoundMateLightColors.primary,
    },
    avatarOptionsBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'flex-end',
        padding: 20,
    },
    avatarOptionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    avatarOptionsTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
        textAlign: 'center',
    },
    avatarOptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 48,
        paddingHorizontal: 6,
    },
    avatarOptionText: {
        fontSize: 15,
        color: '#1A1A1A',
        fontWeight: '600',
    },
    avatarOptionCancelButton: {
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.08)',
        marginTop: 4,
    },
    avatarOptionCancelText: {
        textAlign: 'center',
        width: '100%',
        fontSize: 15,
        color: '#64748B',
        fontWeight: '600',
    },
    uploadBlockingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    uploadBlockingCard: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
        elevation: 10,
    },
    uploadBlockingText: {
        marginTop: 14,
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    uploadBlockingHint: {
        marginTop: 6,
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
    },
    genderOption: {
        marginHorizontal: 6,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingHorizontal: 12,
    },
    genderOptionActive: {
        borderColor: SoundMateLightColors.primary,
        backgroundColor: 'rgba(85, 197, 241, 0.1)',
    },
    genderOptionText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    genderOptionTextActive: {
        color: SoundMateLightColors.primary,
        fontWeight: '700',
    },
    submitButtonWrapper: {
        marginTop: 10,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: SoundMateLightColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    submitButton: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    skipButton: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButtonText: {
        color: '#999',
        fontSize: 15,
        fontWeight: '600',
    },
});
