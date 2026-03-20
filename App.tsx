import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { showToast, toastConfig } from './components/ui/Toast';
import { SoundMateLightColors } from './constants/theme';
import { authService, registerUnauthorizedHandler } from './src/api';
import { UserProvider, useUser } from './src/context/UserContext';
import {
    ForgotPasswordScreen,
    HomeScreen,
    LivestreamScreen,
    LoginScreen,
    OTPScreen,
    PaymentCheckoutScreen,
    PaymentResultScreen,
    ProfileScreen,
    ProfileSetupScreen,
    RegisterScreen,
    SubscriptionScreen,
} from './src/pages';
import type { SelectedPlan } from './src/pages/subscription/PaymentCheckoutScreen';
import type { TabName } from './src/pages/BottomNavigation';

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
    LIVE = 'live',
    REGISTER = 'register',
    OTP = 'otp',
    PROFILE_SETUP = 'profile_setup',
    PROFILE = 'profile',
    FORGOT_PASSWORD = 'forgot_password',
    SUBSCRIPTION = 'subscription',
    PAYMENT_CHECKOUT = 'payment_checkout',
    PAYMENT_RESULT = 'payment_result',
}

type HomeEntryTab = Extract<TabName, 'home' | 'blog' | 'podcast'>;

function AppContent() {
    const { clearUser, refreshUser } = useUser();
    const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
    const [userEmail, setUserEmail] = useState<string>('');
    const [pendingPassword, setPendingPassword] = useState<string>('');
    const [isNewRegistration, setIsNewRegistration] = useState<boolean>(false);
    const [homeEntryTab, setHomeEntryTab] = useState<HomeEntryTab>('home');
    // Payment flow state
    const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
    const [paymentResultType, setPaymentResultType] = useState<'success' | 'failed'>('success');
    const [paymentResultMessage, setPaymentResultMessage] = useState<string>('');

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

    // Save authentication tokens only
    const saveAuthTokens = useCallback(async (accessToken?: string, refreshToken?: string) => {
        try {
            console.log('[App.tsx] saveAuthTokens called');
            if (accessToken) {
                await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            }
            if (refreshToken) {
                await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
            }
        } catch (error) {
            console.error('Error saving auth tokens:', error);
        }
    }, []);

    // Clear authentication tokens and user data
    const clearAuthTokens = useCallback(async () => {
        try {
            await clearUser();
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.ACCESS_TOKEN,
                STORAGE_KEYS.REFRESH_TOKEN,
                STORAGE_KEYS.PENDING_EMAIL,
                STORAGE_KEYS.PENDING_PASSWORD,
            ]);
        } catch (error) {
            console.error('Error clearing auth tokens:', error);
        }
    }, [clearUser]);

    // Handle successful login
    const handleLoginSuccess = useCallback(async (response: any) => {
        console.log('[App.tsx] handleLoginSuccess called with:', response);
        
        // Handle case where response might be wrapped or unwrapped
        let userData = response;
        
        // If response has 'data' property, it's wrapped
        if (response?.data) {
            userData = response.data;
            console.log('[App.tsx] Unwrapped response.data:', userData);
        }
        
        if (userData?.accessToken) {
            const { accessToken, refreshToken } = userData;
            await saveAuthTokens(accessToken, refreshToken);
            await refreshUser();
        }
        setCurrentScreen(Screen.HOME);
    }, [refreshUser, saveAuthTokens]);

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
                    console.log('[App.tsx] OTP auto-login success, data:', loginResponse.data);
                    
                    const { accessToken, refreshToken } = loginResponse.data;

                    // Save tokens only, then refresh user profile via API
                    if (accessToken) {
                        await saveAuthTokens(accessToken, refreshToken);
                        await refreshUser();
                    }

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
    }, [userEmail, pendingPassword, isNewRegistration, refreshUser, saveAuthTokens]);

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

    const handleNavigateToProfile = useCallback(() => {
        setCurrentScreen(Screen.PROFILE);
    }, []);

    const handleBackToHome = useCallback((tab: HomeEntryTab = 'home') => {
        setHomeEntryTab(tab);
        setCurrentScreen(Screen.HOME);
    }, []);

    const handleNavigateToLive = useCallback(() => {
        setCurrentScreen(Screen.LIVE);
    }, []);

    const handleNavigateToForgotPassword = useCallback(() => {
        setCurrentScreen(Screen.FORGOT_PASSWORD);
    }, []);

    const handleForgotPasswordBack = useCallback(() => {
        setCurrentScreen(Screen.LOGIN);
    }, []);

    // ─── Payment flow navigation ─────────────────────
    const handleNavigateToSubscription = useCallback(() => {
        setCurrentScreen(Screen.SUBSCRIPTION);
    }, []);

    const handleSubscriptionBack = useCallback(() => {
        setCurrentScreen(Screen.PROFILE);
    }, []);

    const handleSelectPlan = useCallback((plan: SelectedPlan) => {
        setSelectedPlan(plan);
        setCurrentScreen(Screen.PAYMENT_CHECKOUT);
    }, []);

    const handlePaymentCheckoutBack = useCallback(() => {
        setCurrentScreen(Screen.SUBSCRIPTION);
    }, []);

    const handlePaymentSuccess = useCallback(() => {
        setPaymentResultType('success');
        setPaymentResultMessage('');
        setCurrentScreen(Screen.PAYMENT_RESULT);
    }, []);

    const handlePaymentFailed = useCallback((reason?: string) => {
        setPaymentResultType('failed');
        setPaymentResultMessage(reason || '');
        setCurrentScreen(Screen.PAYMENT_RESULT);
    }, []);

    const handlePaymentResultDone = useCallback(() => {
        setSelectedPlan(null);
        setHomeEntryTab('home');
        setCurrentScreen(Screen.HOME);
    }, []);

    const handlePaymentRetry = useCallback(() => {
        if (selectedPlan) {
            setCurrentScreen(Screen.PAYMENT_CHECKOUT);
        } else {
            setCurrentScreen(Screen.SUBSCRIPTION);
        }
    }, [selectedPlan]);

    useEffect(() => {
        const unregisterUnauthorizedHandler = registerUnauthorizedHandler(async () => {
            const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            if (!accessToken) {
                return;
            }

            await clearAuthTokens();
            setPendingPassword('');
            setIsNewRegistration(false);
            setCurrentScreen(Screen.LOGIN);
            showToast.warning('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại để tiếp tục');
        });

        return () => {
            unregisterUnauthorizedHandler();
        };
    }, [clearAuthTokens]);

    const renderScreen = () => {
        switch (currentScreen) {
            case Screen.LOGIN:
                return (
                    <LoginScreen
                        onLoginSuccess={handleLoginSuccess}
                        onNavigateToRegister={handleNavigateToRegister}
                        onUnverifiedEmail={handleUnverifiedEmail}
                        onNavigateToForgotPassword={handleNavigateToForgotPassword}
                    />
                );
            case Screen.HOME:
                return (
                    <HomeScreen
                        initialTab={homeEntryTab}
                        onLogout={handleLogout}
                        onNavigateToProfile={handleNavigateToProfile}
                        onNavigateToLive={handleNavigateToLive}
                    />
                );
            case Screen.LIVE:
                return <LivestreamScreen onBack={handleBackToHome} />;
            case Screen.PROFILE:
                return (
                    <ProfileScreen 
                        onBackToHome={handleBackToHome} 
                        onNavigateToForgotPassword={handleNavigateToForgotPassword}
                        onNavigateToSubscription={handleNavigateToSubscription}
                        onLogout={handleLogout}
                    />
                );
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
                        onNavigateBack={handleOTPGoBack}
                    />
                );
            case Screen.PROFILE_SETUP:
                return (
                    <ProfileSetupScreen
                        onSetupComplete={handleProfileSetupComplete}
                        onSkip={handleProfileSetupSkip}
                    />
                );
            case Screen.FORGOT_PASSWORD:
                return (
                    <ForgotPasswordScreen
                        onBack={handleForgotPasswordBack}
                        prefillEmail={userEmail}
                    />
                );
            case Screen.SUBSCRIPTION:
                return (
                    <SubscriptionScreen
                        onBack={handleSubscriptionBack}
                        onSelectPlan={handleSelectPlan}
                    />
                );
            case Screen.PAYMENT_CHECKOUT:
                return selectedPlan ? (
                    <PaymentCheckoutScreen
                        plan={selectedPlan}
                        onBack={handlePaymentCheckoutBack}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentFailed={handlePaymentFailed}
                    />
                ) : null;
            case Screen.PAYMENT_RESULT:
                return (
                    <PaymentResultScreen
                        type={paymentResultType}
                        planName={selectedPlan?.name}
                        message={paymentResultMessage}
                        onDone={handlePaymentResultDone}
                        onRetry={paymentResultType === 'failed' ? handlePaymentRetry : undefined}
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
                barStyle="dark-content"
                backgroundColor={SoundMateLightColors.background}
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
        backgroundColor: SoundMateLightColors.background,
    },
    placeholder: {
        flex: 1,
        backgroundColor: SoundMateLightColors.background,
    },
});

// Root App component with UserProvider
function App() {
    return (
        <UserProvider>
            <AppContent />
        </UserProvider>
    );
}

// Register the root component
registerRootComponent(App);

export default App;
