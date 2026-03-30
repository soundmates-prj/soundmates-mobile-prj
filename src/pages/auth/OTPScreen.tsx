import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { showToast } from '../../../components/ui/Toast';
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';
import { authService } from '../../api';
import { useTheme } from '../../context/ThemeContext';

interface OTPScreenProps {
    navigation?: any;
    email?: string;
    password?: string;
    onVerifySuccess?: () => void;
    onNavigateBack?: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function OTPScreen({
    email = '',
    onVerifySuccess,
    onNavigateBack
}: OTPScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef<Array<TextInput | null>>([]);
    const buttonScale = useSharedValue(1);
    const shakeOffset = useSharedValue(0);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const maskedEmail = useMemo(() => {
        if (!email) return 'tr****@gmail.com';
        const [name, domain] = email.split('@');
        return name.length <= 2 ? email : `${name.substring(0, 2)}****@${domain}`;
    }, [email]);

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

    const shakeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeOffset.value }],
    }));

    const triggerShake = useCallback(() => {
        shakeOffset.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, [shakeOffset]);

    const handleOtpChange = useCallback((value: string, index: number) => {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    }, [otp]);

    const handleKeyPress = useCallback((e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }, [otp]);

    const handleVerify = useCallback(async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            showToast.warning('Mã không đầy đủ', 'Vui lòng nhập đủ 6 số');
            triggerShake();
            return;
        }

        setIsLoading(true);
        try {
            const response = await authService.verifyOtp({ email, otpCode });
            if (response.success) {
                showToast.success('Xác thực thành công!', 'Tài khoản của bạn đã được kích hoạt');
                onVerifySuccess?.();
            } else {
                showToast.error('Xác thực thất bại', response.message || 'Mã OTP không đúng');
                triggerShake();
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (error: any) {
            showToast.error('Lỗi xác thực', error?.message || 'Lỗi kết nối');
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    }, [otp, email, onVerifySuccess, triggerShake]);

    const handleBack = useCallback(() => {
        onNavigateBack?.();
    }, [onNavigateBack]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDarkMode ? ['#050B18', '#0A1120', '#000000'] : ['#E0F7FF', '#FFFFFF', '#F0F9FF']}
                style={StyleSheet.absoluteFill}
            />

            <Pressable style={styles.content} onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
                            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                                <Ionicons name="chevron-back" size={24} color={palette.primary} />
                            </TouchableOpacity>
                            <View style={styles.iconCircle}>
                                <Ionicons name="shield-checkmark" size={40} color={palette.primary} />
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(400).duration(800)}>
                            <Text style={styles.title}>Xác thực OTP</Text>
                            <Text style={styles.subtitle}>
                                Chúng tôi đã gửi mã xác thực đến{'\n'}
                                <Text style={styles.emailText}>{maskedEmail}</Text>
                            </Text>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={shakeAnimatedStyle}>
                            <View style={styles.otpContainer}>
                                {otp.map((digit, index) => (
                                    <BlurView key={index} intensity={60} tint="light" style={styles.otpInputWrapper}>
                                        <TextInput
                                            ref={(ref) => { inputRefs.current[index] = ref; }}
                                            style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                                            value={digit}
                                            onChangeText={(value) => handleOtpChange(value, index)}
                                            onKeyPress={(e) => handleKeyPress(e, index)}
                                            keyboardType="number-pad"
                                            maxLength={1}
                                            selectTextOnFocus
                                            autoFocus={index === 0}
                                        />
                                    </BlurView>
                                ))}
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(800).duration(800)}>
                            <AnimatedTouchableOpacity
                                style={[styles.verifyButtonWrapper, buttonAnimatedStyle]}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleVerify}
                                disabled={isLoading}
                                activeOpacity={1}
                            >
                                <LinearGradient
                                    colors={[palette.primary, palette.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.verifyButton}
                                >
                                    <Text style={styles.verifyButtonText}>
                                        {isLoading ? 'Đang xác thực...' : 'Xác thực'}
                                    </Text>
                                </LinearGradient>
                            </AnimatedTouchableOpacity>

                            <View style={styles.resendContainer}>
                                <Text style={styles.resendText}>Không nhận được mã?</Text>
                                <TouchableOpacity onPress={() => {/* resend logic */ }} disabled={!canResend}>
                                    <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                                        {canResend ? 'Gửi lại mã' : `Gửi lại sau ${countdown}s`}
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
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
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SoundMateLightColors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
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
        marginBottom: 40,
        lineHeight: 24,
    },
    emailText: {
        color: SoundMateLightColors.primary,
        fontWeight: '700',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    otpInputWrapper: {
        width: 45,
        height: 56,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        overflow: 'hidden',
    },
    otpInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        color: '#1A1A1A',
    },
    otpInputFilled: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    verifyButtonWrapper: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: SoundMateLightColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
        marginBottom: 30,
    },
    verifyButton: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    resendText: {
        color: '#666',
        fontSize: 15,
    },
    resendLink: {
        color: SoundMateLightColors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    resendLinkDisabled: {
        color: '#AAA',
    },
});
