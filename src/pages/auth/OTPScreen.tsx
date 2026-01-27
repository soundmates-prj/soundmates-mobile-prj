import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface OTPScreenProps {
    navigation?: any;
    email?: string;
    password?: string;
    onVerifySuccess?: () => void;
    onNavigateBack?: () => void;
}

export default function OTPScreen({
    navigation,
    email = '',
    password = '',
    onVerifySuccess,
    onNavigateBack
}: OTPScreenProps) {
    // OTP states - 6 digits
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    // Input refs for auto-focus
    const inputRefs = useRef<Array<TextInput | null>>([]);

    // Animation values
    const buttonScale = useRef(new Animated.Value(1)).current;
    const shakeAnimation = useRef(new Animated.Value(0)).current;

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    // Mask email for display
    const maskedEmail = useMemo(() => {
        if (!email) return 'tr****@gmail.com';
        const [name, domain] = email.split('@');
        if (name.length <= 2) return email;
        return `${name.substring(0, 2)}****@${domain}`;
    }, [email]);

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
    }, []);

    const shakeInputs = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    }, [shakeAnimation]);

    const handleOtpChange = useCallback((value: string, index: number) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
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
            shakeInputs();
            return;
        }

        setIsLoading(true);

        try {
            const response = await authService.verifyOtp({
                email: email,
                otpCode: otpCode,
            });

            if (response.success) {
                showToast.success('Xác thực thành công!', 'Tài khoản của bạn đã được kích hoạt');
                if (onVerifySuccess) {
                    onVerifySuccess();
                }
            } else {
                showToast.error('Xác thực thất bại', response.message || 'Mã OTP không đúng');
                shakeInputs();
                // Clear OTP inputs
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            showToast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
            shakeInputs();
        } finally {
            setIsLoading(false);
        }
    }, [otp, email, onVerifySuccess, shakeInputs]);

    const handleResendOtp = useCallback(async () => {
        if (!canResend) return;

        try {
            const response = await authService.resendOtp(email);

            if (response.success) {
                showToast.success('Đã gửi lại mã', 'Vui lòng kiểm tra email của bạn');
                setCountdown(60);
                setCanResend(false);
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } else {
                showToast.error('Gửi mã thất bại', response.message || 'Không thể gửi lại mã OTP');
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            showToast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
        }
    }, [canResend, email]);

    const handleNavigateBack = useCallback(() => {
        if (onNavigateBack) {
            onNavigateBack();
        }
    }, [onNavigateBack]);

    // Memoized button transform style
    const buttonTransformStyle = useMemo(() => ({
        transform: [{ scale: buttonScale }]
    }), [buttonScale]);

    // Memoized shake transform style
    const shakeTransformStyle = useMemo(() => ({
        transform: [{ translateX: shakeAnimation }]
    }), [shakeAnimation]);

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
                    {/* Shield Icon */}
                    <View style={styles.iconSection}>
                        <LinearGradient
                            colors={[SoundMateLightColors.primaryLight, SoundMateLightColors.primary]}
                            style={styles.iconCircle}
                        >
                            <Ionicons name="shield-checkmark-outline" size={60} color="#FFFFFF" />
                        </LinearGradient>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Xác thực OTP</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitle}>
                        Chúng tôi đã gửi mã xác thực đến{'\n'}
                        <Text style={styles.emailText}>{maskedEmail}</Text>
                    </Text>

                    {/* OTP Inputs */}
                    <Animated.View style={[styles.otpContainer, shakeTransformStyle]}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputRefs.current[index] = ref; }}
                                style={[
                                    styles.otpInput,
                                    digit ? styles.otpInputFilled : null
                                ]}
                                value={digit}
                                onChangeText={(value) => handleOtpChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                selectTextOnFocus
                                autoFocus={index === 0}
                            />
                        ))}
                    </Animated.View>

                    {/* Verify Button */}
                    <Animated.View style={[styles.verifyButtonWrapper, buttonTransformStyle]}>
                        <TouchableOpacity
                            onPressIn={handlePressIn}
                            onPressOut={handlePressOut}
                            onPress={handleVerify}
                            disabled={isLoading}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={[SoundMateLightColors.primaryLight, SoundMateLightColors.primary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.verifyButton}
                            >
                                <Text style={styles.verifyButtonText}>
                                    {isLoading ? 'Đang xác thực...' : 'Xác thực'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Resend OTP */}
                    <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>Không nhận được mã ?</Text>
                        <TouchableOpacity
                            onPress={handleResendOtp}
                            disabled={!canResend}
                        >
                            <Text style={[
                                styles.resendLink,
                                !canResend && styles.resendLinkDisabled
                            ]}>
                                {canResend ? 'Gửi lại mã' : `Gửi lại sau ${countdown}s`}
                            </Text>
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
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
    },
    iconSection: {
        marginTop: 40,
        marginBottom: 32,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SoundMateLightColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: SoundMateLightColors.primary,
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: SoundMateLightColors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    emailText: {
        color: SoundMateLightColors.primary,
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 32,
        width: '100%',
    },
    otpInput: {
        width: 48,
        height: 56,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: SoundMateLightColors.border,
        backgroundColor: SoundMateLightColors.surface,
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        color: SoundMateLightColors.textPrimary,
    },
    otpInputFilled: {
        borderColor: SoundMateLightColors.primary,
    },
    verifyButtonWrapper: {
        width: '100%',
        marginBottom: 32,
    },
    verifyButton: {
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
    verifyButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    resendContainer: {
        alignItems: 'center',
    },
    resendText: {
        fontSize: 15,
        color: SoundMateLightColors.textSecondary,
        marginBottom: 8,
    },
    resendLink: {
        fontSize: 15,
        color: SoundMateLightColors.primary,
        fontWeight: '500',
    },
    resendLinkDisabled: {
        color: SoundMateLightColors.textMuted,
    },
});
