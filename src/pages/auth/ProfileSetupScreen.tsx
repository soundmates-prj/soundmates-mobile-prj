import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
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
import { SoundMateColors } from '../../../constants/theme';
import { authService } from '../../api';

const { height } = Dimensions.get('window');

interface ProfileSetupScreenProps {
    navigation?: any;
    onSetupComplete?: () => void;
    onSkip?: () => void;
}

type GenderType = 'male' | 'female' | 'other' | null;

// Memoized decorative background component
const DecorativeBackground = React.memo(() => (
    <>
        <LinearGradient
            colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
            style={styles.backgroundGradient}
        />
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
    </>
));

const GenderOption = React.memo(({
    label,
    value,
    icon,
    selected,
    onSelect
}: {
    label: string;
    value: GenderType;
    icon: keyof typeof Ionicons.glyphMap;
    selected: boolean;
    onSelect: (value: GenderType) => void;
}) => (
    <TouchableOpacity
        style={[styles.genderOption, selected && styles.genderOptionSelected]}
        onPress={() => onSelect(value)}
        activeOpacity={0.7}
    >
        <Ionicons
            name={icon}
            size={24}
            color={selected ? SoundMateColors.primary : SoundMateColors.textMuted}
        />
        <Text style={[styles.genderText, selected && styles.genderTextSelected]}>
            {label}
        </Text>
    </TouchableOpacity>
));

export default function ProfileSetupScreen({
    navigation,
    onSetupComplete,
    onSkip,
}: ProfileSetupScreenProps) {
    // Form states
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState<GenderType>(null);
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [location, setLocation] = useState('');
    const [website, setWebsite] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Animation values
    const buttonScale = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Fade in animation on mount
    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handlePressIn = useCallback(() => {
        Animated.spring(buttonScale, {
            toValue: 0.95,
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
        if (!date) return '';
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
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
                location?: string;
                website?: string;
            } = {};

            if (bio.trim()) profileData.bio = bio.trim();
            if (phone.trim()) profileData.phone = phone.trim();
            if (gender) profileData.gender = gender;
            if (dateOfBirth) profileData.dateOfBirth = dateOfBirth.toISOString();
            if (location.trim()) profileData.location = location.trim();
            if (website.trim()) profileData.website = website.trim();

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
            console.error('Profile update error:', error);
            showToast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
        } finally {
            setIsLoading(false);
        }
    }, [bio, phone, gender, dateOfBirth, location, website, onSetupComplete, onSkip]);

    const handleSkip = useCallback(() => {
        if (onSkip) {
            onSkip();
        }
    }, [onSkip]);

    // Memoized button transform style
    const buttonTransformStyle = useMemo(() => ({
        transform: [{ scale: buttonScale }]
    }), [buttonScale]);

    // Memoized fade style
    const fadeStyle = useMemo(() => ({
        opacity: fadeAnim
    }), [fadeAnim]);

    // Max date for DOB (must be at least 13 years old)
    const maxDate = useMemo(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 13);
        return date;
    }, []);

    return (
        <Pressable style={styles.container} onPress={dismissKeyboard}>
            {/* Background */}
            <DecorativeBackground />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <Animated.View style={[styles.animatedContainer, fadeStyle]}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <LinearGradient
                                colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                                style={styles.iconContainer}
                            >
                                <Ionicons name="person-add-outline" size={40} color="#FFFFFF" />
                            </LinearGradient>
                            <Text style={styles.title}>Hoàn thiện hồ sơ</Text>
                            <Text style={styles.subtitle}>
                                Thêm thông tin cá nhân để kết nối với những người có cùng
                                sở thích âm nhạc
                            </Text>
                        </View>

                        {/* Form Section */}
                        <View style={styles.formContainer}>
                            {/* Bio Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Giới thiệu bản thân</Text>
                                <View style={[styles.inputContainer, styles.textareaContainer]}>
                                    <TextInput
                                        style={[styles.input, styles.textarea]}
                                        placeholder="Viết vài dòng về bản thân và sở thích âm nhạc của bạn..."
                                        placeholderTextColor={SoundMateColors.textMuted}
                                        value={bio}
                                        onChangeText={setBio}
                                        multiline
                                        numberOfLines={4}
                                        maxLength={500}
                                        textAlignVertical="top"
                                    />
                                </View>
                                <Text style={styles.charCount}>{bio.length}/500</Text>
                            </View>

                            {/* Phone Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Số điện thoại</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons
                                        name="call-outline"
                                        size={20}
                                        color={SoundMateColors.textMuted}
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ví dụ: 0909123456"
                                        placeholderTextColor={SoundMateColors.textMuted}
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                        maxLength={20}
                                    />
                                </View>
                            </View>

                            {/* Gender Selection */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Giới tính</Text>
                                <View style={styles.genderContainer}>
                                    <GenderOption
                                        label="Nam"
                                        value="male"
                                        icon="male"
                                        selected={gender === 'male'}
                                        onSelect={setGender}
                                    />
                                    <GenderOption
                                        label="Nữ"
                                        value="female"
                                        icon="female"
                                        selected={gender === 'female'}
                                        onSelect={setGender}
                                    />
                                    <GenderOption
                                        label="Khác"
                                        value="other"
                                        icon="transgender"
                                        selected={gender === 'other'}
                                        onSelect={setGender}
                                    />
                                </View>
                            </View>

                            {/* Date of Birth */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Ngày sinh</Text>
                                <TouchableOpacity
                                    style={styles.inputContainer}
                                    onPress={() => setShowDatePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={20}
                                        color={SoundMateColors.textMuted}
                                        style={styles.inputIcon}
                                    />
                                    <Text
                                        style={[
                                            styles.input,
                                            styles.dateText,
                                            !dateOfBirth && styles.placeholderText,
                                        ]}
                                    >
                                        {dateOfBirth ? formatDate(dateOfBirth) : 'Chọn ngày sinh'}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={20}
                                        color={SoundMateColors.textMuted}
                                    />
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
                            </View>

                            {/* Location Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Địa điểm</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons
                                        name="location-outline"
                                        size={20}
                                        color={SoundMateColors.textMuted}
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ví dụ: Hồ Chí Minh, Việt Nam"
                                        placeholderTextColor={SoundMateColors.textMuted}
                                        value={location}
                                        onChangeText={setLocation}
                                        maxLength={200}
                                    />
                                </View>
                            </View>

                            {/* Website Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Website / Social Media</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons
                                        name="globe-outline"
                                        size={20}
                                        color={SoundMateColors.textMuted}
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ví dụ: instagram.com/username"
                                        placeholderTextColor={SoundMateColors.textMuted}
                                        value={website}
                                        onChangeText={setWebsite}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="url"
                                        maxLength={200}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionContainer}>
                            {/* Submit Button */}
                            <Animated.View style={buttonTransformStyle}>
                                <TouchableOpacity
                                    onPressIn={handlePressIn}
                                    onPressOut={handlePressOut}
                                    onPress={handleSubmit}
                                    disabled={isLoading}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.submitButton}
                                    >
                                        {isLoading ? (
                                            <Text style={styles.submitButtonText}>Đang lưu...</Text>
                                        ) : (
                                            <>
                                                <Text style={styles.submitButtonText}>Hoàn thành</Text>
                                                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Skip Button */}
                            <TouchableOpacity
                                onPress={handleSkip}
                                style={styles.skipButton}
                                disabled={isLoading}
                            >
                                <Text style={styles.skipButtonText}>Bỏ qua, làm sau</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SoundMateColors.background,
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    decorativeCircle1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: SoundMateColors.primary,
        opacity: 0.1,
    },
    decorativeCircle2: {
        position: 'absolute',
        bottom: -150,
        left: -100,
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: SoundMateColors.accent,
        opacity: 0.08,
    },
    decorativeCircle3: {
        position: 'absolute',
        top: height * 0.4,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: SoundMateColors.primaryLight,
        opacity: 0.05,
    },
    keyboardView: {
        flex: 1,
    },
    animatedContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: SoundMateColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: SoundMateColors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: SoundMateColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 16,
    },
    formContainer: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: SoundMateColors.textSecondary,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SoundMateColors.surface,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: SoundMateColors.border,
        paddingHorizontal: 16,
        height: 58,
    },
    textareaContainer: {
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
        color: SoundMateColors.textPrimary,
    },
    textarea: {
        height: '100%',
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: SoundMateColors.textMuted,
        textAlign: 'right',
        marginTop: 4,
        marginRight: 4,
    },
    dateText: {
        flex: 1,
    },
    placeholderText: {
        color: SoundMateColors.textMuted,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    genderOption: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SoundMateColors.surface,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: SoundMateColors.border,
        paddingVertical: 16,
        paddingHorizontal: 12,
        gap: 8,
    },
    genderOptionSelected: {
        borderColor: SoundMateColors.primary,
        backgroundColor: SoundMateColors.surfaceLight,
    },
    genderText: {
        fontSize: 14,
        fontWeight: '500',
        color: SoundMateColors.textMuted,
    },
    genderTextSelected: {
        color: SoundMateColors.primary,
        fontWeight: '600',
    },
    actionContainer: {
        gap: 16,
    },
    submitButton: {
        height: 58,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: SoundMateColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    skipButton: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: SoundMateColors.textMuted,
    },
});
