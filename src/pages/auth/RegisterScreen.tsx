import { Ionicons } from '@expo/vector-icons';
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

interface RegisterScreenProps {
    navigation?: any;
    onRegisterSuccess?: (email?: string, password?: string) => void;
    onNavigateToLogin?: () => void;
}

// Memoized decorative background component to prevent re-renders
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

export default function RegisterScreen({
    navigation,
    onRegisterSuccess,
    onNavigateToLogin
}: RegisterScreenProps) {
    // Form states
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // UI states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Animation values
    const buttonScale = useRef(new Animated.Value(1)).current;
    const logoScale = useRef(new Animated.Value(1)).current;

    // Logo pulse animation
    React.useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(logoScale, {
                    toValue: 1.05,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(logoScale, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [logoScale]);

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

    const toggleShowPassword = useCallback(() => {
        setShowPassword(prev => !prev);
    }, []);

    const toggleShowConfirmPassword = useCallback(() => {
        setShowConfirmPassword(prev => !prev);
    }, []);

    const handleRegister = useCallback(async () => {
        // Validation
        if (!username.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập tên đăng nhập');
            return;
        }
        // Username validation - no spaces, alphanumeric and underscore only
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username.trim())) {
            showToast.error('Tên đăng nhập không hợp lệ', 'Tên đăng nhập phải từ 3-20 ký tự, chỉ bao gồm chữ, số và dấu gạch dưới');
            return;
        }
        if (!email.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập email của bạn');
            return;
        }
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast.error('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email');
            return;
        }
        if (!password.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập mật khẩu');
            return;
        }
        if (password.length < 6) {
            showToast.error('Mật khẩu yếu', 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        if (!confirmPassword.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng xác nhận mật khẩu');
            return;
        }
        if (password !== confirmPassword) {
            showToast.error('Mật khẩu không khớp', 'Mật khẩu và xác nhận mật khẩu phải giống nhau');
            return;
        }
        if (!firstName.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập họ của bạn');
            return;
        }
        if (!lastName.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập tên của bạn');
            return;
        }

        setIsLoading(true);

        try {
            const response = await authService.register({
                username: username.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
                password: password,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
            });

            if (response.success) {
                showToast.success('Đăng ký thành công!', 'Vui lòng kiểm tra email để xác thực tài khoản');
                if (onRegisterSuccess) {
                    // Pass both email and password for auto-login after OTP verification
                    onRegisterSuccess(email.trim().toLowerCase(), password);
                }
            } else {
                showToast.error('Đăng ký thất bại', response.message || 'Có lỗi xảy ra, vui lòng thử lại');
            }
        } catch (error: any) {
            console.error('Register error:', error);
            showToast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
        } finally {
            setIsLoading(false);
        }
    }, [username, email, password, confirmPassword, firstName, lastName, onRegisterSuccess]);

    const handleNavigateToLogin = useCallback(() => {
        if (onNavigateToLogin) {
            onNavigateToLogin();
        }
    }, [onNavigateToLogin]);

    // Memoized logo transform style
    const logoTransformStyle = useMemo(() => ({
        transform: [{ scale: logoScale }]
    }), [logoScale]);

    // Memoized button transform style
    const buttonTransformStyle = useMemo(() => ({
        transform: [{ scale: buttonScale }]
    }), [buttonScale]);

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
                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <Animated.View style={[styles.logoContainer, logoTransformStyle]}>
                            <LinearGradient
                                colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                                style={styles.logoGradient}
                            >
                                <Ionicons name="musical-notes" size={40} color="#FFFFFF" />
                            </LinearGradient>
                            <View style={styles.logoGlow} />
                        </Animated.View>
                        <Text style={styles.appName}>SoundMate</Text>
                    </View>

                    {/* Register Form */}
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>Đăng ký</Text>

                        {/* Name Row - Họ và Tên */}
                        <View style={styles.nameRow}>
                            {/* Họ Input */}
                            <View style={styles.inputContainerHalf}>
                                <TextInput
                                    style={styles.inputHalf}
                                    placeholder="Họ"
                                    placeholderTextColor={SoundMateColors.textMuted}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                />
                            </View>

                            {/* Tên Input */}
                            <View style={styles.inputContainerHalf}>
                                <TextInput
                                    style={styles.inputHalf}
                                    placeholder="Tên"
                                    placeholderTextColor={SoundMateColors.textMuted}
                                    value={lastName}
                                    onChangeText={setLastName}
                                    autoCapitalize="words"
                                    returnKeyType="done"
                                    onSubmitEditing={handleRegister}
                                />
                            </View>
                        </View>

                        {/* Username Input */}
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="person-outline"
                                size={20}
                                color={SoundMateColors.textMuted}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Tên đăng nhập"
                                placeholderTextColor={SoundMateColors.textMuted}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                            />
                        </View>

                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="mail-outline"
                                size={20}
                                color={SoundMateColors.textMuted}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor={SoundMateColors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                            />
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={20}
                                color={SoundMateColors.textMuted}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Mật khẩu"
                                placeholderTextColor={SoundMateColors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                returnKeyType="next"
                            />
                            <TouchableOpacity
                                onPress={toggleShowPassword}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color={SoundMateColors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={20}
                                color={SoundMateColors.textMuted}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Xác nhận mật khẩu"
                                placeholderTextColor={SoundMateColors.textMuted}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                returnKeyType="next"
                            />
                            <TouchableOpacity
                                onPress={toggleShowConfirmPassword}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color={SoundMateColors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Register Button */}
                        <Animated.View style={buttonTransformStyle}>
                            <TouchableOpacity
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleRegister}
                                disabled={isLoading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.registerButton}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingContainer}>
                                            <Text style={styles.registerButtonText}>Đang đăng ký...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.registerButtonText}>Đăng ký</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Navigate to Login */}
                    <View style={styles.loginLinkContainer}>
                        <Text style={styles.loginLinkText}>Đã có tài khoản!</Text>
                        <TouchableOpacity onPress={handleNavigateToLogin}>
                            <Text style={styles.loginLinkButton}>Đăng nhập</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <Text style={styles.footerText}>
                        Bằng việc đăng ký, bạn đồng ý với{' '}
                        <Text style={styles.linkText}>Điều khoản dịch vụ</Text>
                        {' '}và{' '}
                        <Text style={styles.linkText}>Chính sách bảo mật</Text>
                    </Text>
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
    decorativeCircle3: {
        position: 'absolute',
        top: height * 0.5,
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 40,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    logoContainer: {
        marginBottom: 8,
        position: 'relative',
    },
    logoGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SoundMateColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    logoGlow: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        borderRadius: 48,
        backgroundColor: SoundMateColors.primary,
        opacity: 0.15,
        zIndex: -1,
    },
    appName: {
        fontSize: 24,
        fontWeight: '800',
        color: SoundMateColors.textPrimary,
        letterSpacing: 2,
    },
    formContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: SoundMateColors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    inputContainerHalf: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SoundMateColors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: SoundMateColors.border,
        paddingHorizontal: 14,
        height: 52,
    },
    inputHalf: {
        flex: 1,
        fontSize: 15,
        color: SoundMateColors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SoundMateColors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: SoundMateColors.border,
        paddingHorizontal: 14,
        marginBottom: 14,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: SoundMateColors.textPrimary,
    },
    eyeIcon: {
        padding: 4,
    },
    registerButton: {
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SoundMateColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    registerButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginLinkContainer: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    loginLinkText: {
        fontSize: 15,
        color: SoundMateColors.textSecondary,
        marginBottom: 6,
    },
    loginLinkButton: {
        fontSize: 17,
        fontWeight: '700',
        color: SoundMateColors.primary,
    },
    footerText: {
        fontSize: 11,
        color: SoundMateColors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
    linkText: {
        color: SoundMateColors.primary,
        fontWeight: '600',
    },
});
