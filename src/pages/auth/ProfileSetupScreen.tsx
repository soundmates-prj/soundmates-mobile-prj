import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Image,
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
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
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
    const [isLoading, setIsLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showGenderPicker, setShowGenderPicker] = useState(false);

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

    const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setDateOfBirth(selectedDate);
    }, []);

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
    }, [bio, phone, gender, dateOfBirth, onSetupComplete, onSkip]);

    const maxDate = useMemo(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 13);
        return date;
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#E0F7FF', '#FFFFFF', '#F0F9FF']} style={StyleSheet.absoluteFill} />
            
            <Pressable style={styles.content} onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        
                        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
                            <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={24} color={SoundMateLightColors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.avatarContainer}>
                                <BlurView intensity={60} tint="light" style={styles.avatarCircle}>
                                    <Ionicons name="camera" size={32} color={SoundMateLightColors.primary} />
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
                                    keyboardType="phone-pad"
                                />
                            </BlurView>

                            <TouchableOpacity onPress={() => setShowGenderPicker(!showGenderPicker)}>
                                <BlurView intensity={60} tint="light" style={styles.inputWrapper}>
                                    <Ionicons name="male-female-outline" size={20} color={SoundMateLightColors.primary} style={styles.inputIcon} />
                                    <Text style={[styles.input, !gender && { color: SoundMateLightColors.textMuted }]}>
                                        {getGenderLabel(gender)}
                                    </Text>
                                    <Ionicons name="chevron-down" size={18} color={SoundMateLightColors.textMuted} />
                                </BlurView>
                            </TouchableOpacity>

                            {showGenderPicker && (
                                <View style={styles.genderOptions}>
                                    {['male', 'female', 'other'].map((g: any) => (
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

                            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                <BlurView intensity={60} tint="light" style={styles.inputWrapper}>
                                    <Ionicons name="calendar-outline" size={20} color={SoundMateLightColors.primary} style={styles.inputIcon} />
                                    <Text style={[styles.input, !dateOfBirth && { color: SoundMateLightColors.textMuted }]}>
                                        {formatDate(dateOfBirth)}
                                    </Text>
                                </BlurView>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={dateOfBirth || new Date(2000, 0, 1)}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleDateChange}
                                    maximumDate={maxDate}
                                />
                            )}

                            <BlurView intensity={60} tint="light" style={[styles.inputWrapper, styles.bioWrapper]}>
                                <TextInput
                                    style={[styles.input, styles.bioInput]}
                                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                                    placeholderTextColor={SoundMateLightColors.textMuted}
                                    value={bio}
                                    onChangeText={setBio}
                                    multiline
                                    maxLength={200}
                                />
                            </BlurView>

                            <AnimatedTouchableOpacity
                                style={[styles.submitButtonWrapper, buttonAnimatedStyle]}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleSubmit}
                                disabled={isLoading}
                                activeOpacity={1}
                            >
                                <LinearGradient
                                    colors={[SoundMateLightColors.primary, SoundMateLightColors.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.submitButton}
                                >
                                    <Text style={styles.submitButtonText}>
                                        {isLoading ? 'Đang lưu...' : 'Hoàn tất'}
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
        borderColor: 'rgba(255, 255, 255, 0.5)',
        overflow: 'hidden',
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
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 18,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
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
        flexDirection: 'row',
        gap: 10,
        marginBottom: 5,
    },
    genderOption: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
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
