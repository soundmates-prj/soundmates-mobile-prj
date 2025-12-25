import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const OTP_LENGTH = 6;

interface OTPScreenProps {
    navigation?: any;
    email?: string;
    phoneNumber?: string;
    onVerifySuccess?: () => void;
    onResendOTP?: () => void;
    onGoBack?: () => void;
}

// Memoized decorative background component
const DecorativeBackground = React.memo(() => (
    <>
        <LinearGradient
            colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
            style={styles.backgroundGradient}
        />
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
    </>
));

export default function OTPScreen({
    navigation,
    email,
    phoneNumber,
    onVerifySuccess,
    onResendOTP,
    onGoBack,
}: OTPScreenProps) {
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    // Refs for OTP inputs
    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Animation values
    const buttonScale = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

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
    }, []);

    const shakeError = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    }, [shakeAnim]);

    const handleOtpChange = useCallback((value: string, index: number) => {
        // Only allow numbers
        if (value && !/^\d+$/.test(value)) return;

        const newOtp = [...otp];

        // Handle paste
        if (value.length > 1) {
            const pastedOtp = value.slice(0, OTP_LENGTH).split('');
            pastedOtp.forEach((digit, i) => {
                if (i < OTP_LENGTH) {
                    newOtp[i] = digit;
                }
            });
            setOtp(newOtp);
            // Focus last input or the input after pasted content
            const focusIndex = Math.min(pastedOtp.length, OTP_LENGTH - 1);
            inputRefs.current[focusIndex]?.focus();
            return;
        }

        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < OTP_LENGTH - 1) {
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

        if (otpCode.length !== OTP_LENGTH) {
            shakeError();
            showToast.warning('Mã OTP chưa đầy đủ', 'Vui lòng nhập đủ 6 số');
            return;
        }

        if (!email) {
            showToast.error('Lỗi', 'Không tìm thấy email để xác thực');
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
                shakeError();
                showToast.error('Xác thực thất bại', response.message || 'Mã OTP không đúng hoặc đã hết hạn');
                // Clear OTP inputs
                setOtp(Array(OTP_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
            }
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            shakeError();
            showToast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
        } finally {
            setIsLoading(false);
        }
    }, [otp, email, shakeError, onVerifySuccess]);

    const handleResendOTP = useCallback(async () => {
        if (!canResend) return;

        if (!email) {
            showToast.error('Lỗi', 'Không tìm thấy email để gửi lại mã');
            return;
        }

        setIsLoading(true);

        try {
            const response = await authService.resendOtp(email);

            if (response.success) {
                showToast.success('Đã gửi lại mã OTP', 'Vui lòng kiểm tra email của bạn');
                setCountdown(60);
                setCanResend(false);
                setOtp(Array(OTP_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
            } else {
                showToast.error('Không thể gửi lại mã', response.message || 'Vui lòng thử lại sau');
            }
        } catch (error: any) {
            console.error('Resend OTP error:', error);
            showToast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
        } finally {
            setIsLoading(false);
        }

        if (onResendOTP) {
            onResendOTP();
        }
    }, [canResend, email, onResendOTP]);

    const handleGoBack = useCallback(() => {
        if (onGoBack) {
            onGoBack();
        }
    }, [onGoBack]);

    const maskedContact = useMemo(() => {
        if (email) {
            return email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
        }
        if (phoneNumber) {
            return phoneNumber.replace(/(\d{3})(\d*)(\d{3})/, '$1****$3');
        }
        return '***';
    }, [email, phoneNumber]);

    // Memoized button transform style
    const buttonTransformStyle = useMemo(() => ({
        transform: [{ scale: buttonScale }]
    }), [buttonScale]);

    // Memoized shake transform style
    const shakeTransformStyle = useMemo(() => ({
        transform: [{ translateX: shakeAnim }]
    }), [shakeAnim]);

    return (
        <Pressable style={styles.container} onPress={dismissKeyboard}>
            {/* Background - memoized to prevent re-renders */}
            <DecorativeBackground />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <Ionicons name="arrow-back" size={24} color={SoundMateColors.textPrimary} />
                    </TouchableOpacity>

                    {/* Icon Section */}
                    <View style={styles.iconSection}>
                        <LinearGradient
                            colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                            style={styles.iconContainer}
                        >
                            <Ionicons name="shield-checkmark-outline" size={48} color="#FFFFFF" />
                        </LinearGradient>
                    </View>

                    {/* Title Section */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Xác thực OTP</Text>
                        <Text style={styles.subtitle}>
                            Chúng tôi đã gửi mã xác thực đến{'\n'}
                            <Text style={styles.contactText}>{maskedContact}</Text>
                        </Text>
                    </View>

                    {/* OTP Input Section */}
                    <Animated.View style={[styles.otpContainer, shakeTransformStyle]}>
                        {otp.map((digit, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.otpInputContainer,
                                    digit ? styles.otpInputFilled : null,
                                ]}
                            >
                                <TextInput
                                    ref={(ref) => { inputRefs.current[index] = ref; }}
                                    style={styles.otpInput}
                                    value={digit}
                                    onChangeText={(value) => handleOtpChange(value, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    autoFocus={index === 0}
                                />
                            </View>
                        ))}
                    </Animated.View>

                    {/* Verify Button */}
                    <Animated.View style={buttonTransformStyle}>
                        <TouchableOpacity
                            onPressIn={handlePressIn}
                            onPressOut={handlePressOut}
                            onPress={handleVerify}
                            disabled={isLoading}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.verifyButton}
                            >
                                {isLoading ? (
                                    <Text style={styles.verifyButtonText}>Đang xác thực...</Text>
                                ) : (
                                    <Text style={styles.verifyButtonText}>Xác thực</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Resend OTP */}
                    <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>Không nhận được mã?</Text>
                        {canResend ? (
                            <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
                                <Text style={[styles.resendButton, isLoading && styles.resendButtonDisabled]}>
                                    Gửi lại
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.countdownText}>
                                Gửi lại sau {countdown}s
                            </Text>
                        )}
                    </View>
                </ScrollView>
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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 40,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: SoundMateColors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SoundMateColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    titleSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: SoundMateColors.textPrimary,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: SoundMateColors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    contactText: {
        color: SoundMateColors.primary,
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 32,
    },
    otpInputContainer: {
        width: 50,
        height: 60,
        borderRadius: 16,
        backgroundColor: SoundMateColors.surface,
        borderWidth: 1.5,
        borderColor: SoundMateColors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpInputFilled: {
        borderColor: SoundMateColors.primary,
        backgroundColor: SoundMateColors.surfaceLight,
    },
    otpInput: {
        width: '100%',
        height: '100%',
        fontSize: 24,
        fontWeight: '700',
        color: SoundMateColors.textPrimary,
        textAlign: 'center',
    },
    verifyButton: {
        height: 58,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SoundMateColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    verifyButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    resendContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    resendText: {
        fontSize: 14,
        color: SoundMateColors.textSecondary,
        marginBottom: 8,
    },
    resendButton: {
        fontSize: 16,
        fontWeight: '700',
        color: SoundMateColors.primary,
    },
    resendButtonDisabled: {
        opacity: 0.5,
    },
    countdownText: {
        fontSize: 14,
        color: SoundMateColors.textMuted,
    },
});
