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
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';
import { authService } from '../../api';
import { useTheme } from '../../context/ThemeContext';

interface RegisterScreenProps {
    navigation?: any;
    onRegisterSuccess?: (email?: string, password?: string) => void;
    onNavigateToLogin?: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function RegisterScreen({
    onRegisterSuccess,
    onNavigateToLogin
}: RegisterScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

    const handleRegister = useCallback(async () => {
        if (!firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !password.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng điền đầy đủ tất cả các trường');
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username.trim())) {
            showToast.error('Tên người dùng không hợp lệ', 'Tên người dùng phải từ 3-20 ký tự');
            return;
        }

        if (password !== confirmPassword) {
            showToast.error('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp');
            return;
        }

        setIsLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const response = await authService.register({
                username: username.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
                password: password,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
            });

            if (response.success) {
                showToast.success('Đăng ký thành công!', 'Vui lòng kiểm tra email để xác thực');
                onRegisterSuccess?.(email.trim().toLowerCase(), password);
            } else {
                showToast.error('Đăng ký thất bại', response.message);
            }
        } catch (error: any) {
            showToast.error('Lỗi đăng ký', error?.message || 'Lỗi kết nối');
        } finally {
            setIsLoading(false);
        }
    }, [username, email, password, confirmPassword, firstName, lastName, onRegisterSuccess]);

    const handleBack = useCallback(() => {
        onNavigateToLogin?.();
    }, [onNavigateToLogin]);

    return (
        <Animated.View style={styles.container}>
            <LinearGradient
                colors={isDarkMode ? ['#020617', '#0B1220', '#000000'] : ['#E0F7FF', '#FFFFFF', '#F0F9FF']}
                style={StyleSheet.absoluteFill}
            />

            <Pressable style={styles.content} onPress={dismissKeyboard}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.page}>
                            <View>
                                <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
                                    <TouchableOpacity onPress={handleBack} style={[styles.backButton, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                                        <Ionicons name="chevron-back" size={24} color={palette.primary} />
                                    </TouchableOpacity>
                                </Animated.View>

                                <Animated.View entering={FadeInUp.delay(260).duration(800)} style={styles.logoSection}>
                                    <Image source={isDarkMode ? require('../../../assets/dark_logo.png') : require('../../../assets/light_logo.png')} style={styles.logo} resizeMode="contain" />
                                </Animated.View>

                                <Animated.View entering={FadeInDown.delay(400).duration(800)}>
                                    <Text style={[styles.title, { color: palette.textPrimary }]}>Tạo tài khoản</Text>
                                    <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Bắt đầu hành trình âm nhạc của bạn ngay hôm nay</Text>
                                </Animated.View>

                                <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.formContainer}>
                                    <View style={styles.nameRow}>
                                        <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { flex: 1, borderColor: palette.border }]}>
                                            <TextInput
                                                style={[styles.input, { color: palette.textPrimary }]}
                                                placeholder="Họ"
                                                placeholderTextColor={palette.textMuted}
                                                value={firstName}
                                                onChangeText={setFirstName}
                                            />
                                        </BlurView>
                                        <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { flex: 1, borderColor: palette.border }]}>
                                            <TextInput
                                                style={[styles.input, { color: palette.textPrimary }]}
                                                placeholder="Tên"
                                                placeholderTextColor={palette.textMuted}
                                                value={lastName}
                                                onChangeText={setLastName}
                                            />
                                        </BlurView>
                                    </View>

                                    <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { borderColor: palette.border }]}>
                                        <Ionicons name="person-outline" size={20} color={palette.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: palette.textPrimary }]}
                                            placeholder="Tên người dùng"
                                            placeholderTextColor={palette.textMuted}
                                            value={username}
                                            onChangeText={setUsername}
                                            autoCapitalize="none"
                                        />
                                    </BlurView>

                                    <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { borderColor: palette.border }]}>
                                        <Ionicons name="mail-outline" size={20} color={palette.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: palette.textPrimary }]}
                                            placeholder="Email"
                                            placeholderTextColor={palette.textMuted}
                                            value={email}
                                            onChangeText={setEmail}
                                            keyboardType="email-address"
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
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={palette.textMuted} />
                                        </TouchableOpacity>
                                    </BlurView>

                                    <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { borderColor: palette.border }]}>
                                        <Ionicons name="shield-checkmark-outline" size={20} color={palette.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: palette.textPrimary }]}
                                            placeholder="Xác nhận mật khẩu"
                                            placeholderTextColor={palette.textMuted}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showConfirmPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color={palette.textMuted} />
                                        </TouchableOpacity>
                                    </BlurView>

                                    <AnimatedTouchableOpacity
                                        style={[styles.registerButtonWrapper, { shadowColor: palette.primary }, buttonAnimatedStyle]}
                                        onPressIn={handlePressIn}
                                        onPressOut={handlePressOut}
                                        onPress={handleRegister}
                                        disabled={isLoading}
                                        activeOpacity={1}
                                    >
                                        <LinearGradient
                                            colors={[palette.primary, palette.primaryDark]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.registerButton}
                                        >
                                            <Text style={styles.registerButtonText}>
                                                {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
                                            </Text>
                                        </LinearGradient>
                                    </AnimatedTouchableOpacity>
                                </Animated.View>
                            </View>

                            <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.footer}>
                                <Text style={[styles.footerText, { color: palette.textSecondary }]}>Đã có tài khoản? </Text>
                                <TouchableOpacity onPress={handleBack}>
                                    <Text style={[styles.loginText, { color: palette.primary }]}>Đăng nhập</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Pressable>
        </Animated.View>
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
    page: {
        flexGrow: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 30,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 18,
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
        marginBottom: 30,
        lineHeight: 22,
    },
    formContainer: {
        gap: 12,
    },
    nameRow: {
        flexDirection: 'row',
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
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    registerButtonWrapper: {
        marginTop: 10,
        borderRadius: 18,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    registerButton: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 24,
    },
    footerText: {
        fontSize: 15,
    },
    loginText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
