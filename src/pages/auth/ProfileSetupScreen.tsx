import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { showToast } from '../../../components/ui/Toast';
import { SoundMateLightColors } from '../../../constants/theme';
import { authService } from '../../api';

interface ProfileSetupScreenProps {
    navigation?: any;
    onSetupComplete?: () => void;
    onSkip?: () => void;
    onNavigateBack?: () => void;
}

type GenderType = 'male' | 'female' | 'other' | null;

export default function ProfileSetupScreen({
    navigation,
    onSetupComplete,
    onSkip,
    onNavigateBack,
}: ProfileSetupScreenProps) {
    // Form states
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState<GenderType>(null);
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);

    // Animation values
    const buttonScale = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(buttonScale, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    }, [buttonScale]);

    const handlePressOut = useCallback(() => {
        Animated.spring(buttonScale, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, [buttonScale]);

    const dismissKeyboard = useCallback(() => {
        Keyboard.dismiss();
        setShowDatePicker(false);
        setShowGenderPicker(false);
    }, []);

    const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDateOfBirth(selectedDate);
        }
    }, []);

    const formatDate = useCallback((date: Date | null): string => {
        if (!date) return 'dd/MM/YYYY';
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }, []);

    const getGenderLabel = useCallback((g: GenderType): string => {
        switch (g) {
            case 'male': return 'Nam';
            case 'female': return 'Nữ';
            case 'other': return 'Khác';
            default: return 'Giới tính';
        }
    }, []);

    const handleGenderSelect = useCallback((value: GenderType) => {
        setGender(value);
        setShowGenderPicker(false);
    }, []);

    const handleSubmit = useCallback(async () => {
        setIsLoading(true);

        try {
            // Prepare data - only send non-empty values
            const profileData: {
                bio?: string;
                phone?: string;
                gender?: string;
                dateOfBirth?: string;
            } = {};

            if (bio.trim()) profileData.bio = bio.trim();
            if (phone.trim()) profileData.phone = phone.trim();
            if (gender) profileData.gender = gender;
            if (dateOfBirth) profileData.dateOfBirth = dateOfBirth.toISOString();

            // Check if any data to update
            if (Object.keys(profileData).length === 0) {
                showToast.info('Không có thay đổi', 'Bạn có thể bỏ qua bước này');
                if (onSkip) {
                    onSkip();
                }
                return;
            }

            const response = await authService.updateProfileOptions(profileData);

            if (response.success) {
                showToast.success('Cập nhật thành công!', 'Thông tin cá nhân của bạn đã được lưu');
                if (onSetupComplete) {
                    onSetupComplete();
                }
            } else {
                showToast.error('Cập nhật thất bại', response.message || 'Vui lòng thử lại sau');
            }
        } catch (error: any) {
            console.log('Profile update error:', error);
            showToast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
        } finally {
            setIsLoading(false);
        }
    }, [bio, phone, gender, dateOfBirth, onSetupComplete, onSkip]);

    const handleSkip = useCallback(() => {
        if (onSkip) {
            onSkip();
        }
    }, [onSkip]);

    const handleNavigateBack = useCallback(() => {
        if (onNavigateBack) {
            onNavigateBack();
        }
    }, [onNavigateBack]);

    // Memoized button transform style
    const buttonTransformStyle = useMemo(() => ({
        transform: [{ scale: buttonScale }]
    }), [buttonScale]);

    // Max date for DOB (must be at least 13 years old)
    const maxDate = useMemo(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 13);
        return date;
    }, []);

    return (
        <Pressable style={styles.container} onPress={dismissKeyboard}>
            {/* Back Button */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={handleNavigateBack}
            >
                <Ionicons name="chevron-back" size={28} color={SoundMateLightColors.primary} />
            </TouchableOpacity>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarContainer}>
                            <View style={styles.avatarCircle}>
                                <Ionicons name="camera-outline" size={40} color={SoundMateLightColors.textPrimary} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Thông tin cá nhân</Text>

                    {/* Form Section */}
                    <View style={styles.formContainer}>
                        {/* Phone Input */}
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="call-outline"
                                size={22}
                                color={SoundMateLightColors.textPrimary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Số điện thoại"
                                placeholderTextColor={SoundMateLightColors.textPrimary}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                maxLength={20}
                            />
                        </View>

                        {/* Gender Picker */}
                        <TouchableOpacity
                            style={styles.inputContainer}
                            onPress={() => setShowGenderPicker(!showGenderPicker)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="male-female-outline"
                                size={22}
                                color={SoundMateLightColors.textPrimary}
                                style={styles.inputIcon}
                            />
                            <Text
                                style={[
                                    styles.input,
                                    styles.pickerText,
                                    !gender && styles.placeholderText,
                                ]}
                            >
                                {getGenderLabel(gender)}
                            </Text>
                        </TouchableOpacity>

                        {/* Gender Options */}
                        {showGenderPicker && (
                            <View style={styles.genderOptionsContainer}>
                                <TouchableOpacity
                                    style={[styles.genderOption, gender === 'male' && styles.genderOptionSelected]}
                                    onPress={() => handleGenderSelect('male')}
                                >
                                    <Text style={[styles.genderOptionText, gender === 'male' && styles.genderOptionTextSelected]}>Nam</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.genderOption, gender === 'female' && styles.genderOptionSelected]}
                                    onPress={() => handleGenderSelect('female')}
                                >
                                    <Text style={[styles.genderOptionText, gender === 'female' && styles.genderOptionTextSelected]}>Nữ</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.genderOption, gender === 'other' && styles.genderOptionSelected]}
                                    onPress={() => handleGenderSelect('other')}
                                >
                                    <Text style={[styles.genderOptionText, gender === 'other' && styles.genderOptionTextSelected]}>Khác</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Date of Birth Picker */}
                        <TouchableOpacity
                            style={styles.inputContainer}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={22}
                                color={SoundMateLightColors.textPrimary}
                                style={styles.inputIcon}
                            />
                            <Text
                                style={[
                                    styles.input,
                                    styles.pickerText,
                                    !dateOfBirth && styles.placeholderText,
                                ]}
                            >
                                {formatDate(dateOfBirth)}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={dateOfBirth || new Date(2000, 0, 1)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                maximumDate={maxDate}
                                minimumDate={new Date(1920, 0, 1)}
                            />
                        )}

                        {/* Bio Input */}
                        <View style={[styles.inputContainer, styles.bioContainer]}>
                            <TextInput
                                style={[styles.input, styles.bioInput]}
                                placeholder="Tiểu sử"
                                placeholderTextColor={SoundMateLightColors.textPrimary}
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={4}
                                maxLength={500}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionContainer}>
                        {/* Submit Button */}
                        <Animated.View style={[styles.submitButtonWrapper, buttonTransformStyle]}>
                            <TouchableOpacity
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleSubmit}
                                disabled={isLoading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={[SoundMateLightColors.primaryLight, SoundMateLightColors.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitButton}
                                >
                                    <Text style={styles.submitButtonText}>
                                        {isLoading ? 'Đang lưu...' : 'Tiếp tục'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Skip Button */}
                        <TouchableOpacity
                            onPress={handleSkip}
                            style={styles.skipButton}
                            disabled={isLoading}
                        >
                            <Text style={styles.skipButtonText}>Bỏ qua</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SoundMateLightColors.background,
    },
    backButton: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: SoundMateLightColors.surface,
        borderWidth: 2,
        borderColor: SoundMateLightColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: SoundMateLightColors.primary,
        marginBottom: 28,
        textAlign: 'center',
    },
    formContainer: {
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SoundMateLightColors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SoundMateLightColors.border,
        paddingHorizontal: 16,
        marginBottom: 16,
        height: 54,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    bioContainer: {
        height: 100,
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: SoundMateLightColors.textPrimary,
    },
    bioInput: {
        height: '100%',
        textAlignVertical: 'top',
    },
    pickerText: {
        flex: 1,
        fontSize: 16,
    },
    placeholderText: {
        color: SoundMateLightColors.textPrimary,
    },
    genderOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
        marginTop: -8,
    },
    genderOption: {
        flex: 1,
        backgroundColor: SoundMateLightColors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SoundMateLightColors.border,
        paddingVertical: 12,
        alignItems: 'center',
    },
    genderOptionSelected: {
        borderColor: SoundMateLightColors.primary,
        backgroundColor: SoundMateLightColors.surfaceLight,
    },
    genderOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: SoundMateLightColors.textSecondary,
    },
    genderOptionTextSelected: {
        color: SoundMateLightColors.primary,
        fontWeight: '600',
    },
    actionContainer: {
        gap: 16,
    },
    submitButtonWrapper: {
        width: '100%',
    },
    submitButton: {
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SoundMateLightColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    skipButton: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: SoundMateLightColors.textSecondary,
    },
});
