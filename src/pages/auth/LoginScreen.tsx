import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
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
import { SoundMateLightColors, SoundMateDarkColors } from '../../../constants/theme';
import { authService } from '../../api';
import { useTheme } from '../../context/ThemeContext';

interface LoginScreenProps {
    navigation?: any;
    onLoginSuccess?: (response?: any) => void;
    onNavigateToRegister?: () => void;
    onUnverifiedEmail?: (email: string, password: string) => void;
    onNavigateToForgotPassword?: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function LoginScreen({
    onLoginSuccess,
    onNavigateToRegister,
    onUnverifiedEmail,
    onNavigateToForgotPassword,
}: LoginScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Animation values
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

    const dismissKeyboard = useCallback(() => {
        Keyboard.dismiss();
    }, []);

    const toggleShowPassword = useCallback(() => {
        setShowPassword(prev => !prev);
        Haptics.selectionAsync();
    }, []);

    const isUnverifiedEmailMessage = useCallback((message: string) => {
        const normalizedMessage = (message || '').toLowerCase();
        return normalizedMessage.includes('not verified')
            || normalizedMessage.includes('chưa xác thực')
            || normalizedMessage.includes('please verify')
            || normalizedMessage.includes('verification required')
            || normalizedMessage.includes('verify your email')
            || normalizedMessage.includes('verify your email address');
    }, []);

    const handleLogin = useCallback(async () => {
        if (!emailOrUsername.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập email hoặc tên đăng nhập');
            return;
        }
        if (!password.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập mật khẩu');
            return;
        }

        setIsLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const response = await authService.login({
                emailOrUsername: emailOrUsername.trim().toLowerCase(),
                password: password,
            });

            if (response.success && response.data) {
                showToast.success('Đăng nhập thành công!', `Chào mừng bạn quay trở lại!`);
                onLoginSuccess?.(response.data);
            } else {
                const errorMessage = response.message || '';
                if (isUnverifiedEmailMessage(errorMessage) && onUnverifiedEmail) {
                    showToast.warning('Email chưa xác thực', errorMessage);
                    onUnverifiedEmail(emailOrUsername.trim().toLowerCase(), password);
                } else {
                    showToast.error('Đăng nhập thất bại', 'Email hoặc mật khẩu không đúng');
                }
            }
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.message || 'Lỗi kết nối';
            if ((error?.response?.status === 403 || isUnverifiedEmailMessage(errorMessage)) && onUnverifiedEmail) {
                onUnverifiedEmail(emailOrUsername.trim().toLowerCase(), password);
            } else {
                showToast.error('Lỗi đăng nhập', errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    }, [emailOrUsername, isUnverifiedEmailMessage, onLoginSuccess, onUnverifiedEmail, password]);

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={isDarkMode ? ['#020617', '#0B1220', '#000000'] : ['#E0F7FF', '#FFFFFF', '#F0F9FF']}
                style={StyleSheet.absoluteFill}
            />

            <Pressable style={styles.content} onPress={dismissKeyboard}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.page}>
                            <View>
                                <Animated.View
                                    entering={FadeInUp.delay(200).duration(800)}
                                    style={styles.logoSection}
                                >
                                    <Image
                                        source={isDarkMode ? require('../../../assets/dark_logo.png') : require('../../../assets/light_logo.png')}
                                        style={styles.logo}
                                        resizeMode="contain"
                                    />
                                </Animated.View>

                                <Animated.View entering={FadeInDown.delay(400).duration(800)}>
                                    <Text style={[styles.title, { color: palette.textPrimary }]}>Chào mừng quay lại</Text>
                                    <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
                                        Đăng nhập để tiếp tục trải nghiệm âm nhạc cùng SoundMates
                                    </Text>
                                </Animated.View>

                                <Animated.View
                                    entering={FadeInDown.delay(600).duration(800)}
                                    style={styles.formContainer}
                                >
                                    <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { borderColor: palette.border }]}>
                                        <Ionicons name="mail-outline" size={20} color={palette.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: palette.textPrimary }]}
                                            placeholder="Email hoặc tên đăng nhập"
                                            placeholderTextColor={palette.textMuted}
                                            value={emailOrUsername}
                                            onChangeText={setEmailOrUsername}
                                            autoCapitalize="none"
                                        />
                                    </BlurView>

                                    <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { borderColor: palette.border }]}>
                                        <Ionicons name="lock-closed-outline" size={20} color={palette.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: palette.textPrimary }]}
                                            placeholder="Mật khẩu"
                                            placeholderTextColor={palette.textMuted}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
                                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={palette.textMuted} />
                                        </TouchableOpacity>
                                    </BlurView>

                                    <TouchableOpacity onPress={onNavigateToForgotPassword} style={styles.forgotPassword}>
                                        <Text style={[styles.forgotPasswordText, { color: palette.primary }]}>Quên mật khẩu?</Text>
                                    </TouchableOpacity>

                                    <AnimatedTouchableOpacity
                                        style={[styles.loginButtonWrapper, { shadowColor: palette.primary }, buttonAnimatedStyle]}
                                        onPressIn={handlePressIn}
                                        onPressOut={handlePressOut}
                                        onPress={handleLogin}
                                        disabled={isLoading}
                                        activeOpacity={1}
                                    >
                                        <LinearGradient
                                            colors={[palette.primary, palette.primaryDark]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.loginButton}
                                        >
                                            <Text style={styles.loginButtonText}>
                                                {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                                            </Text>
                                        </LinearGradient>
                                    </AnimatedTouchableOpacity>
                                </Animated.View>

                                <Animated.View
                                    entering={FadeInDown.delay(800).duration(800)}
                                    style={styles.socialSection}
                                >
                                    <View style={styles.dividerRow}>
                                        <View style={[styles.divider, { backgroundColor: palette.border + '55' }]} />
                                        <Text style={[styles.dividerText, { color: palette.textMuted }]}>Hoặc đăng nhập với</Text>
                                        <View style={[styles.divider, { backgroundColor: palette.border + '55' }]} />
                                    </View>

                                    <View style={styles.socialButtons}>
                                        <TouchableOpacity style={[styles.socialButton, { backgroundColor: palette.surface, borderColor: palette.border }]} activeOpacity={0.7}>
                                            <Ionicons name="logo-google" size={24} color="#DB4437" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.socialButton, { backgroundColor: palette.surface, borderColor: palette.border }]} activeOpacity={0.7}>
                                            <Ionicons name="logo-apple" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.socialButton, { backgroundColor: palette.surface, borderColor: palette.border }]} activeOpacity={0.7}>
                                            <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>
                            </View>

                            <Animated.View
                                entering={FadeInDown.delay(1000).duration(800)}
                                style={styles.footer}
                            >
                                <Text style={[styles.footerText, { color: palette.textSecondary }]}>Chưa có tài khoản? </Text>
                                <TouchableOpacity onPress={onNavigateToRegister}>
                                    <Text style={[styles.registerText, { color: palette.primary }]}>Đăng ký ngay</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
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
    page: {
        flexGrow: 1,
        justifyContent: 'space-between',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logo: {
        width: 180,
        height: 180,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    formContainer: {
        gap: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        borderRadius: 18,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        overflow: 'hidden',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    eyeIcon: {
        padding: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
    },
    forgotPasswordText: {
        fontWeight: '600',
        fontSize: 14,
    },
    loginButtonWrapper: {
        marginTop: 10,
        borderRadius: 18,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    loginButton: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    socialSection: {
        marginTop: 40,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 15,
        fontSize: 13,
        fontWeight: '500',
    },
    socialButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    socialButton: {
        width: 60,
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 28,
    },
    footerText: {
        fontSize: 15,
    },
    registerText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
