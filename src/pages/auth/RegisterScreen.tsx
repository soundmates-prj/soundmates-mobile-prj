import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
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
import { showToast } from '../../../components/ui/Toast';
import { SoundMateLightColors } from '../../../constants/theme';
import { authService } from '../../api';

interface RegisterScreenProps {
    navigation?: any;
    onRegisterSuccess?: (email?: string, password?: string) => void;
    onNavigateToLogin?: () => void;
}

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

    const toggleShowPassword = useCallback(() => {
        setShowPassword(prev => !prev);
    }, []);

    const toggleShowConfirmPassword = useCallback(() => {
        setShowConfirmPassword(prev => !prev);
    }, []);

    const handleRegister = useCallback(async () => {
        // Validation
        if (!firstName.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập họ của bạn');
            return;
        }
        if (!lastName.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập tên của bạn');
            return;
        }
        if (!username.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập tên người dùng');
            return;
        }
        // Username validation - no spaces, alphanumeric and underscore only
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username.trim())) {
            showToast.error('Tên người dùng không hợp lệ', 'Tên người dùng phải từ 3-20 ký tự, chỉ bao gồm chữ, số và dấu gạch dưới');
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
            console.log('Register error:', error);
            const errorMessage = error?.response?.data?.message ||
                error?.message ||
                'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
            showToast.error('Lỗi đăng ký', errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [username, email, password, confirmPassword, firstName, lastName, onRegisterSuccess]);

    const handleNavigateToLogin = useCallback(() => {
        if (onNavigateToLogin) {
            onNavigateToLogin();
        }
    }, [onNavigateToLogin]);

    // Memoized button transform style
    const buttonTransformStyle = useMemo(() => ({
        transform: [{ scale: buttonScale }]
    }), [buttonScale]);

    return (
        <Pressable style={styles.container} onPress={dismissKeyboard}>
            {/* Back Button */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={handleNavigateToLogin}
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
                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <Image
                            source={require('../../../assets/light_logo.png')}
                            style={{ width: 60, height: 60 }}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Đăng ký</Text>

                    {/* Register Form */}
                    <View style={styles.formContainer}>
                        {/* Name Row - Họ và Tên */}
                        <View style={styles.nameRow}>
                            {/* Họ Input */}
                            <View style={styles.inputContainerHalf}>
                                <Ionicons
                                    name="people-outline"
                                    size={22}
                                    color={SoundMateLightColors.textPrimary}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.inputHalf}
                                    placeholder="Họ"
                                    placeholderTextColor={SoundMateLightColors.textPrimary}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                />
                            </View>

                            {/* Tên Input */}
                            <View style={styles.inputContainerHalf}>
                                <Ionicons
                                    name="people-outline"
                                    size={22}
                                    color={SoundMateLightColors.textPrimary}
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.inputHalf}
                                    placeholder="Tên"
                                    placeholderTextColor={SoundMateLightColors.textPrimary}
                                    value={lastName}
                                    onChangeText={setLastName}
                                    autoCapitalize="words"
                                    returnKeyType="next"
                                />
                            </View>
                        </View>

                        {/* Username Input */}
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="people-outline"
                                size={22}
                                color={SoundMateLightColors.textPrimary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Tên người dùng"
                                placeholderTextColor={SoundMateLightColors.textPrimary}
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
                                size={22}
                                color={SoundMateLightColors.textPrimary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor={SoundMateLightColors.textPrimary}
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
                                size={22}
                                color={SoundMateLightColors.textPrimary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Mật khẩu"
                                placeholderTextColor={SoundMateLightColors.textPrimary}
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
                                    size={22}
                                    color={SoundMateLightColors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={22}
                                color={SoundMateLightColors.textPrimary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Xác nhận mật khẩu"
                                placeholderTextColor={SoundMateLightColors.textPrimary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                returnKeyType="done"
                                onSubmitEditing={handleRegister}
                            />
                            <TouchableOpacity
                                onPress={toggleShowConfirmPassword}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                                    size={22}
                                    color={SoundMateLightColors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Register Button */}
                        <Animated.View style={[styles.registerButtonWrapper, buttonTransformStyle]}>
                            <TouchableOpacity
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleRegister}
                                disabled={isLoading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={[SoundMateLightColors.primaryLight, SoundMateLightColors.primary]}
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
                        <Text style={styles.loginLinkText}>Đã có tài khoản !</Text>
                        <TouchableOpacity onPress={handleNavigateToLogin}>
                            <Text style={styles.loginLinkButton}>Đăng nhập</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <Text style={styles.footerText}>
                        Bằng việc đăng ký, bạn đồng ý với{' '}
                        <Text style={styles.linkText}>Điều khoản dịch vụ</Text>
                        {' '}và{' '}
                        <Text style={styles.linkText}>Chính{'\n'}sách bảo mật</Text>
                        {' '}của chúng tôi
                    </Text>
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
    logoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: SoundMateLightColors.primary,
        marginBottom: 24,
        textAlign: 'center',
    },
    formContainer: {
        marginBottom: 16,
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
        backgroundColor: SoundMateLightColors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SoundMateLightColors.border,
        paddingHorizontal: 14,
        height: 54,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    inputHalf: {
        flex: 1,
        fontSize: 16,
        color: SoundMateLightColors.textPrimary,
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
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: SoundMateLightColors.textPrimary,
    },
    eyeIcon: {
        padding: 4,
    },
    registerButtonWrapper: {
        marginTop: 8,
    },
    registerButton: {
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SoundMateLightColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    registerButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginLinkContainer: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 32,
    },
    loginLinkText: {
        fontSize: 15,
        color: SoundMateLightColors.textSecondary,
        marginBottom: 6,
    },
    loginLinkButton: {
        fontSize: 17,
        fontWeight: '600',
        color: SoundMateLightColors.primary,
        textDecorationLine: 'underline',
    },
    footerText: {
        fontSize: 12,
        color: SoundMateLightColors.textPrimary,
        textAlign: 'center',
        lineHeight: 20,
    },
    linkText: {
        color: SoundMateLightColors.primary,
        fontWeight: '500',
    },
});
