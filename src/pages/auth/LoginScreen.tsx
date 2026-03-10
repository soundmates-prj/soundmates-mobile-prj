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

interface LoginScreenProps {
    navigation?: any;
    onLoginSuccess?: (response?: any) => void;
    onNavigateToRegister?: () => void;
    onUnverifiedEmail?: (email: string, password: string) => void;
}

export default function LoginScreen({ navigation, onLoginSuccess, onNavigateToRegister, onUnverifiedEmail }: LoginScreenProps) {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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

    const handleLogin = useCallback(async () => {
        // Validation
        if (!emailOrUsername.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập email hoặc tên đăng nhập');
            return;
        }
        if (!password.trim()) {
            showToast.warning('Thiếu thông tin', 'Vui lòng nhập mật khẩu');
            return;
        }

        setIsLoading(true);

        try {
            const response = await authService.login({
                emailOrUsername: emailOrUsername.trim().toLowerCase(),
                password: password,
            });

            if (response.success && response.data) {
                showToast.success('Đăng nhập thành công!', `Chào mừng bạn quay trở lại!`);

                if (onLoginSuccess) {
                    onLoginSuccess(response.data);
                }
            } else {
                // Check if email is not verified (error code 403)
                const errorMessage = response.message || '';
                const isUnverifiedEmail = errorMessage.toLowerCase().includes('verify') ||
                    errorMessage.includes('403') ||
                    errorMessage.toLowerCase().includes('email');

                if (isUnverifiedEmail && onUnverifiedEmail) {
                    // Show error toast first before redirecting
                    showToast.warning(
                        'Email chưa xác thực', 
                        'Vui lòng xác thực email để tiếp tục. Chúng tôi sẽ gửi lại mã OTP cho bạn.'
                    );
                    
                    // Wait a bit for user to see the toast, then redirect to OTP
                    setTimeout(() => {
                        onUnverifiedEmail(emailOrUsername.trim().toLowerCase(), password);
                    }, 1500);
                } else {
                    // Show error for other login failures
                    showToast.error('Đăng nhập thất bại', response.message || 'Email hoặc mật khẩu không đúng');
                }
            }
        } catch (error: any) {
            console.error('Login error:', error);

            // Check for 403 error in axios response
            if (error?.response?.status === 403 && onUnverifiedEmail) {
                showToast.warning(
                    'Email chưa xác thực', 
                    'Vui lòng xác thực email để tiếp tục. Chúng tôi sẽ gửi lại mã OTP cho bạn.'
                );
                
                // Wait a bit for user to see the toast, then redirect to OTP
                setTimeout(() => {
                    onUnverifiedEmail(emailOrUsername.trim().toLowerCase(), password);
                }, 1500);
            } else {
                // Show error message from API or generic error
                const errorMessage = error?.response?.data?.message || 
                                   error?.message || 
                                   'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
                showToast.error('Lỗi đăng nhập', errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    }, [emailOrUsername, password, onLoginSuccess, onUnverifiedEmail]);

    const handleForgotPassword = useCallback(() => {
        showToast.info('Quên mật khẩu', 'Tính năng đang được phát triển');
    }, []);

    const handleCreateAccount = useCallback(() => {
        if (onNavigateToRegister) {
            onNavigateToRegister();
        }
    }, [onNavigateToRegister]);

    const handleGoogleLogin = useCallback(() => {
        showToast.info('Đăng nhập Google', 'Tính năng đang được phát triển');
    }, []);

    const handleFacebookLogin = useCallback(() => {
        showToast.info('Đăng nhập Facebook', 'Tính năng đang được phát triển');
    }, []);

    // Memoized button transform style
    const buttonTransformStyle = useMemo(() => ({
        transform: [{ scale: buttonScale }]
    }), [buttonScale]);

    return (
        <Pressable style={styles.container} onPress={dismissKeyboard}>
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
                    <Text style={styles.title}>Đăng nhập</Text>

                    {/* Login Form */}
                    <View style={styles.formContainer}>
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
                                placeholderTextColor={SoundMateLightColors.textPlaceholder}
                                value={emailOrUsername}
                                onChangeText={setEmailOrUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
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
                                placeholderTextColor={SoundMateLightColors.textPlaceholder}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
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

                        {/* Login Button */}
                        <Animated.View style={[styles.loginButtonWrapper, buttonTransformStyle]}>
                            <TouchableOpacity
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                onPress={handleLogin}
                                disabled={isLoading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={[SoundMateLightColors.primaryLight, SoundMateLightColors.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.loginButton}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingContainer}>
                                            <Text style={styles.loginButtonText}>Đang đăng nhập...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.loginButtonText}>Đăng nhập</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Forgot Password with dividers below */}
                        <View style={styles.forgotPasswordContainer}>
                            <TouchableOpacity onPress={handleForgotPassword}>
                                <Text style={styles.forgotPasswordText}>Quên mật khẩu ?</Text>
                            </TouchableOpacity>
                            <View style={styles.dividerRow}>
                                <View style={styles.divider} />
                                <View style={styles.dividerGap} />
                                <View style={styles.divider} />
                            </View>
                        </View>
                    </View>

                    {/* Social Login */}
                    <View style={styles.socialContainer}>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={handleGoogleLogin}
                        >
                            <Text style={styles.googleText}>G</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.socialButton}
                            onPress={handleFacebookLogin}
                        >
                            <Text style={styles.facebookText}>f</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Create Account Button */}
                    <TouchableOpacity
                        onPress={handleCreateAccount}
                        style={styles.createAccountButton}
                    >
                        <Text style={styles.createAccountText}>Tạo tài khoản mới</Text>
                    </TouchableOpacity>

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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 30,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: SoundMateLightColors.primary,
        marginBottom: 28,
        textAlign: 'center',
    },
    formContainer: {
        marginBottom: 24,
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
        height: 56,
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
    loginButtonWrapper: {
        marginTop: 8,
    },
    loginButton: {
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
    loginButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    forgotPasswordContainer: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
    },
    forgotPasswordText: {
        fontSize: 15,
        color: SoundMateLightColors.textSecondary,
        fontWeight: '500',
        marginBottom: 12,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: SoundMateLightColors.border,
    },
    dividerGap: {
        width: 60,
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 50,
        marginBottom: 28,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: SoundMateLightColors.surface,
        borderWidth: 1.5,
        borderColor: SoundMateLightColors.border,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    googleText: {
        fontSize: 24,
        fontWeight: '600',
        color: SoundMateLightColors.textPrimary,
    },
    facebookText: {
        fontSize: 28,
        fontWeight: '700',
        color: SoundMateLightColors.textPrimary,
    },
    createAccountButton: {
        height: 54,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: SoundMateLightColors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: SoundMateLightColors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    createAccountText: {
        fontSize: 16,
        fontWeight: '600',
        color: SoundMateLightColors.textPrimary,
        letterSpacing: 0.3,
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
