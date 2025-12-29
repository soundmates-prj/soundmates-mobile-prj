import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { showToast, toastConfig } from './components/ui/Toast';
import { SoundMateColors } from './constants/theme';
import { authService } from './src/api';
import { HomeScreen, LoginScreen, OTPScreen, ProfileSetupScreen, RegisterScreen } from './src/pages';

// Storage keys
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_DATA: 'userData',
    PENDING_EMAIL: 'pendingEmail',
    PENDING_PASSWORD: 'pendingPassword',
};

// Define screens enum
enum Screen {
    LOGIN = 'login',
    HOME = 'home',
    REGISTER = 'register',
    OTP = 'otp',
    PROFILE_SETUP = 'profile_setup',
}

function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
    const [userEmail, setUserEmail] = useState<string>('');
    const [pendingPassword, setPendingPassword] = useState<string>('');
    const [isNewRegistration, setIsNewRegistration] = useState<boolean>(false);

    // Check for saved tokens on app start
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
                if (token) {
                    // User has a valid token, go to home
                    setCurrentScreen(Screen.HOME);
                }
            } catch (error) {
                console.error('Error checking auth:', error);
            }
        };
        checkAuth();
    }, []);

    // Save authentication tokens
    const saveAuthTokens = useCallback(async (accessToken: string, refreshToken: string, userData?: any) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
            if (userData) {
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
            }
        } catch (error) {
            console.error('Error saving auth tokens:', error);
        }
    }, []);

    // Clear authentication tokens
    const clearAuthTokens = useCallback(async () => {
        try {
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.ACCESS_TOKEN,
                STORAGE_KEYS.REFRESH_TOKEN,
                STORAGE_KEYS.USER_DATA,
                STORAGE_KEYS.PENDING_EMAIL,
                STORAGE_KEYS.PENDING_PASSWORD,
            ]);
        } catch (error) {
            console.error('Error clearing auth tokens:', error);
        }
    }, []);

    // Handle successful login
    const handleLoginSuccess = useCallback(async (response: any) => {
        if (response?.accessToken && response?.refreshToken) {
            await saveAuthTokens(response.accessToken, response.refreshToken, response.user);
        }
        setCurrentScreen(Screen.HOME);
    }, [saveAuthTokens]);

    // Handle login attempt with unverified email (error 403)
    const handleUnverifiedEmail = useCallback(async (email: string, password: string) => {
        // Save credentials for auto-login after OTP verification
        setUserEmail(email);
        setPendingPassword(password);
        setIsNewRegistration(false);

        // Store temporarily for OTP flow
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.PENDING_EMAIL, email);
            await AsyncStorage.setItem(STORAGE_KEYS.PENDING_PASSWORD, password);
        } catch (error) {
            console.error('Error storing pending credentials:', error);
        }

        // Send verification OTP
        showToast.info('Xác thực email', 'Đang gửi mã xác thực đến email của bạn...');
        const resendResult = await authService.resendOtp(email);
        if (resendResult.success) {
            showToast.success('Đã gửi mã OTP', 'Vui lòng kiểm tra email để lấy mã xác thực');
        } else {
            showToast.warning('Lưu ý', 'Không thể gửi lại mã OTP. Vui lòng thử gửi lại mã trong màn hình xác thực.');
        }

        // Navigate to OTP screen
        setCurrentScreen(Screen.OTP);
    }, []);

    // Handle registration success - go to OTP
    const handleRegisterSuccess = useCallback(async (email?: string, password?: string) => {
        if (email) {
            setUserEmail(email);
        }
        if (password) {
            setPendingPassword(password);
            try {
                await AsyncStorage.setItem(STORAGE_KEYS.PENDING_EMAIL, email || '');
                await AsyncStorage.setItem(STORAGE_KEYS.PENDING_PASSWORD, password);
            } catch (error) {
                console.error('Error storing registration credentials:', error);
            }
        }
        setIsNewRegistration(true);
        setCurrentScreen(Screen.OTP);
    }, []);

    // Handle OTP verification success
    const handleOTPVerifySuccess = useCallback(async () => {
        // Auto-login after successful OTP verification
        if (userEmail && pendingPassword) {
            showToast.info('Đang đăng nhập...', 'Tự động đăng nhập với tài khoản của bạn');

            try {
                const loginResponse = await authService.login({
                    emailOrUsername: userEmail,
                    password: pendingPassword,
                });

                if (loginResponse.success && loginResponse.data) {
                    // Save tokens
                    await saveAuthTokens(
                        loginResponse.data.accessToken,
                        loginResponse.data.refreshToken,
                        loginResponse.data.user
                    );

                    // Clear pending credentials
                    await AsyncStorage.multiRemove([
                        STORAGE_KEYS.PENDING_EMAIL,
                        STORAGE_KEYS.PENDING_PASSWORD,
                    ]);

                    // If new registration, go to profile setup; otherwise go to home
                    if (isNewRegistration) {
                        showToast.success('Xác thực thành công!', 'Hãy hoàn thiện hồ sơ của bạn');
                        setCurrentScreen(Screen.PROFILE_SETUP);
                    } else {
                        showToast.success('Đăng nhập thành công!', 'Chào mừng bạn quay trở lại!');
                        setCurrentScreen(Screen.HOME);
                    }
                } else {
                    showToast.error('Đăng nhập thất bại', loginResponse.message || 'Vui lòng đăng nhập lại');
                    setCurrentScreen(Screen.LOGIN);
                }
            } catch (error) {
                console.error('Auto-login error:', error);
                showToast.error('Lỗi đăng nhập', 'Vui lòng đăng nhập lại');
                setCurrentScreen(Screen.LOGIN);
            }
        } else {
            // No credentials saved, go to login
            setCurrentScreen(Screen.LOGIN);
        }

        // Reset pending data
        setPendingPassword('');
        setIsNewRegistration(false);
    }, [userEmail, pendingPassword, isNewRegistration, saveAuthTokens]);

    // Handle profile setup complete
    const handleProfileSetupComplete = useCallback(() => {
        showToast.success('Hoàn tất!', 'Hồ sơ của bạn đã được cập nhật');
        setCurrentScreen(Screen.HOME);
    }, []);

    // Handle profile setup skip
    const handleProfileSetupSkip = useCallback(() => {
        showToast.info('Đã bỏ qua', 'Bạn có thể cập nhật hồ sơ sau trong phần cài đặt');
        setCurrentScreen(Screen.HOME);
    }, []);

    const handleNavigateToRegister = useCallback(() => {
        setCurrentScreen(Screen.REGISTER);
    }, []);

    const handleNavigateToLogin = useCallback(() => {
        setCurrentScreen(Screen.LOGIN);
    }, []);

    const handleOTPGoBack = useCallback(() => {
        if (isNewRegistration) {
            setCurrentScreen(Screen.REGISTER);
        } else {
            setCurrentScreen(Screen.LOGIN);
        }
    }, [isNewRegistration]);

    const handleLogout = useCallback(async () => {
        await clearAuthTokens();
        setCurrentScreen(Screen.LOGIN);
    }, [clearAuthTokens]);

    const renderScreen = () => {
        switch (currentScreen) {
            case Screen.LOGIN:
                return (
                    <LoginScreen
                        onLoginSuccess={handleLoginSuccess}
                        onNavigateToRegister={handleNavigateToRegister}
                        onUnverifiedEmail={handleUnverifiedEmail}
                    />
                );
            case Screen.HOME:
                return <HomeScreen onLogout={handleLogout} />;
            case Screen.REGISTER:
                return (
                    <RegisterScreen
                        onRegisterSuccess={handleRegisterSuccess}
                        onNavigateToLogin={handleNavigateToLogin}
                    />
                );
            case Screen.OTP:
                return (
                    <OTPScreen
                        email={userEmail}
                        onVerifySuccess={handleOTPVerifySuccess}
                        onGoBack={handleOTPGoBack}
                    />
                );
            case Screen.PROFILE_SETUP:
                return (
                    <ProfileSetupScreen
                        onSetupComplete={handleProfileSetupComplete}
                        onSkip={handleProfileSetupSkip}
                    />
                );
            default:
                return (
                    <LoginScreen
                        onLoginSuccess={handleLoginSuccess}
                        onNavigateToRegister={handleNavigateToRegister}
                        onUnverifiedEmail={handleUnverifiedEmail}
                    />
                );
        }
    };

    return (
        <SafeAreaProvider>
            <StatusBar
                barStyle="light-content"
                backgroundColor={SoundMateColors.background}
                translucent
            />
            <SafeAreaView style={styles.container} edges={['top']}>
                {renderScreen()}
            </SafeAreaView>
            {/* Toast notification component - must be at the end */}
            <Toast config={toastConfig} />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SoundMateColors.background,
    },
    placeholder: {
        flex: 1,
        backgroundColor: SoundMateColors.background,
    },
});

// Register the root component
registerRootComponent(App);

export default App;
