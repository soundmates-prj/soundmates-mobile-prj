import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { showToast, toastConfig } from './components/ui/Toast';
import { SoundMateDarkColors, SoundMateLightColors } from './constants/theme';
import { authService, livestreamService, registerUnauthorizedHandler } from './src/api';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { UserProvider, useUser } from './src/context/UserContext';
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';
import {
    ForgotPasswordScreen,
    HomeScreen,
    HostBroadcastScreen,
    HostLiveManagerScreen,
    LivestreamScreen,
    LoginScreen,
    OTPScreen,
    PaymentCheckoutScreen,
    PaymentResultScreen,
    ProfileScreen,
    ProfileSetupScreen,
    RegisterScreen,
    SubscriptionScreen,
    EditProfileScreen,
} from './src/pages';
import type { TabName } from './src/pages/BottomNavigation';
import type { SelectedPlan } from './src/pages/subscription/PaymentCheckoutScreen';

// Storage keys
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_DATA: 'userData',
    PENDING_EMAIL: 'pendingEmail',
    PENDING_PASSWORD: 'pendingPassword',
};

// Define screens enum
type HomeEntryTab = Extract<TabName, 'home' | 'blog' | 'podcast'>;

type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    OTP: undefined;
    ProfileSetup: undefined;
    ForgotPassword: { prefillEmail?: string } | undefined;
    Home: undefined;
    Live: undefined;
    HostLiveManager: undefined;
    HostBroadcast: { sessionId: string };
    Profile: undefined;
    Subscription: { initialTab?: string } | undefined;
    PaymentCheckout: undefined;
    PaymentResult: undefined;
    EditProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
    const { clearUser, refreshUser, user } = useUser();
    const { isDarkMode } = useTheme();
    const navigationRef = useNavigationContainerRef<RootStackParamList>();
    const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(undefined);
    const [isAuthChecked, setIsAuthChecked] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userEmail, setUserEmail] = useState<string>('');
    const [pendingPassword, setPendingPassword] = useState<string>('');
    const [isNewRegistration, setIsNewRegistration] = useState<boolean>(false);
    const [homeEntryTab, setHomeEntryTab] = useState<HomeEntryTab>('home');
    // Payment flow state
    const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
    const [paymentResultType, setPaymentResultType] = useState<'success' | 'failed'>('success');
    const [paymentResultMessage, setPaymentResultMessage] = useState<string>('');
    const useDarkThemeShell = isDarkMode && currentRouteName !== 'Live';
    const appBackground = useDarkThemeShell ? SoundMateDarkColors.background : SoundMateLightColors.background;

    // Check for saved tokens on app start
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
                setIsAuthenticated(Boolean(token));
            } catch (error) {
                console.log('Error checking auth:', error);
                setIsAuthenticated(false);
            } finally {
                setIsAuthChecked(true);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        void livestreamService.initializeStationContext();
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
            console.log('Error saving auth tokens:', error);
        }
    }, []);

    const extractAuthPayload = useCallback((payload: any) => {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        let current = payload;
        for (let depth = 0; depth < 4; depth += 1) {
            if (!current || typeof current !== 'object') {
                break;
            }

            if (
                Object.prototype.hasOwnProperty.call(current, 'accessToken')
                || Object.prototype.hasOwnProperty.call(current, 'refreshToken')
            ) {
                return current;
            }

            if (current.data && typeof current.data === 'object') {
                current = current.data;
                continue;
            }

            if (current.result && typeof current.result === 'object') {
                current = current.result;
                continue;
            }

            break;
        }

        return null;
    }, []);

    const establishAuthenticatedSession = useCallback(async (payload: any): Promise<boolean> => {
        const authPayload = extractAuthPayload(payload);
        const accessToken = authPayload?.accessToken;
        const refreshToken = authPayload?.refreshToken;

        if (!accessToken) {
            return false;
        }

        await saveAuthTokens(accessToken, refreshToken);
        await refreshUser();
        return true;
    }, [extractAuthPayload, refreshUser, saveAuthTokens]);

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
            console.log('Error clearing auth tokens:', error);
        }
    }, [clearUser]);

    // Handle successful login
    const handleLoginSuccess = useCallback(async (response: any) => {
        console.log('[App.tsx] handleLoginSuccess called with:', response);

        const sessionReady = await establishAuthenticatedSession(response);
        if (!sessionReady) {
            await clearAuthTokens();
            showToast.error('Đăng nhập thất bại', 'Không nhận được token đăng nhập. Vui lòng thử lại.');
            return;
        }

        setIsAuthenticated(true);
    }, [clearAuthTokens, establishAuthenticatedSession]);

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
            console.log('Error storing pending credentials:', error);
        }

        // Navigate immediately so user can input OTP right away
        navigationRef.navigate('OTP');

        // Send verification OTP
        showToast.info('Xác thực email', 'Đang gửi mã xác thực đến email của bạn...');
        void (async () => {
            try {
                const resendResult = await authService.resendOtp(email);
                if (resendResult.success) {
                    showToast.success('Đã gửi mã OTP', 'Vui lòng kiểm tra email để lấy mã xác thực');
                } else {
                    showToast.warning('Lưu ý', 'Không thể gửi lại mã OTP. Vui lòng thử gửi lại mã trong màn hình xác thực.');
                }
            } catch (error) {
                console.log('Resend OTP after unverified login failed:', error);
                showToast.warning('Lưu ý', 'Không thể gửi lại mã OTP. Vui lòng thử gửi lại mã trong màn hình xác thực.');
            }
        })();
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
                console.log('Error storing registration credentials:', error);
            }
        }
        setIsNewRegistration(true);
        navigationRef.navigate('OTP');
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

                    const sessionReady = await establishAuthenticatedSession(loginResponse.data);
                    if (!sessionReady) {
                        await clearAuthTokens();
                        showToast.error('Đăng nhập thất bại', 'Không nhận được token. Vui lòng đăng nhập lại.');
                        setIsAuthenticated(false);
                        return;
                    }

                    // Clear pending credentials
                    await AsyncStorage.multiRemove([
                        STORAGE_KEYS.PENDING_EMAIL,
                        STORAGE_KEYS.PENDING_PASSWORD,
                    ]);

                    // If new registration, go to profile setup; otherwise go to home
                    if (isNewRegistration) {
                        showToast.success('Xác thực thành công!', 'Hãy hoàn thiện hồ sơ của bạn');
                        navigationRef.navigate('ProfileSetup');
                    } else {
                        showToast.success('Đăng nhập thành công!', 'Chào mừng bạn quay trở lại!');
                        setIsAuthenticated(true);
                    }
                } else {
                    showToast.error('Đăng nhập thất bại', loginResponse.message || 'Vui lòng đăng nhập lại');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.log('Auto-login error:', error);
                showToast.error('Lỗi đăng nhập', 'Vui lòng đăng nhập lại');
                setIsAuthenticated(false);
            }
        } else {
            // No credentials saved, go to login
            setIsAuthenticated(false);
        }

        // Reset pending data
        setPendingPassword('');
        setIsNewRegistration(false);
    }, [
        clearAuthTokens,
        establishAuthenticatedSession,
        isNewRegistration,
        pendingPassword,
        userEmail,
    ]);

    // Handle profile setup complete
    const handleProfileSetupComplete = useCallback(() => {
        showToast.success('Hoàn tất!', 'Hồ sơ của bạn đã được cập nhật');
        setIsAuthenticated(true);
    }, []);

    // Handle profile setup skip
    const handleProfileSetupSkip = useCallback(() => {
        showToast.info('Đã bỏ qua', 'Bạn có thể cập nhật hồ sơ sau trong phần cài đặt');
        setIsAuthenticated(true);
    }, []);

    // Role-based redirect after login — fires once when user role is available
    useEffect(() => {
        if (!isAuthenticated || !isAuthChecked) return;
        if (!user?.roleName) return;

        // Prevent redirect loop — only redirect if not already on host pages
        const currentRoute = navigationRef.getCurrentRoute()?.name;
        if (currentRoute === 'HostLiveManager' || currentRoute === 'HostBroadcast') return;

        const role = user.roleName.toLowerCase();
        if (role === 'host' || role === 'admin') {
            navigationRef.navigate('HostLiveManager');
        }
        // Members and other roles go to Home (default)
    }, [isAuthenticated, isAuthChecked, user?.roleName]);

    const handleLogout = useCallback(async () => {
        await clearAuthTokens();
        setIsAuthenticated(false);
    }, [clearAuthTokens]);

    const handleBackToHome = useCallback((tab: TabName = 'home') => {
        const entryTab: HomeEntryTab = tab === 'blog' || tab === 'podcast' ? tab : 'home';
        setHomeEntryTab(entryTab);
        navigationRef.goBack();
    }, []);

    // ─── Payment flow navigation ─────────────────────
    const handleNavigateToSubscription = useCallback(() => {
        navigationRef.navigate('Subscription');
    }, []);

    const handleSubscriptionBack = useCallback(() => {
        navigationRef.goBack();
    }, []);

    const handleSelectPlan = useCallback((plan: SelectedPlan) => {
        setSelectedPlan(plan);
        navigationRef.navigate('PaymentCheckout');
    }, []);

    const handlePaymentCheckoutBack = useCallback(() => {
        navigationRef.goBack();
    }, []);

    const handlePaymentSuccess = useCallback(() => {
        setPaymentResultType('success');
        setPaymentResultMessage('');
        navigationRef.navigate('PaymentResult');
    }, []);

    const handlePaymentFailed = useCallback((reason?: string) => {
        setPaymentResultType('failed');
        setPaymentResultMessage(reason || '');
        navigationRef.navigate('PaymentResult');
    }, []);

    const handlePaymentResultDone = useCallback(() => {
        setSelectedPlan(null);
        setHomeEntryTab('home');
        navigationRef.navigate('Home');
    }, []);

    const handlePaymentRetry = useCallback(() => {
        if (selectedPlan) {
            navigationRef.navigate('PaymentCheckout');
        } else {
            navigationRef.navigate('Subscription');
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
            setIsAuthenticated(false);
            showToast.warning('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại để tiếp tục');
        });

        return () => {
            unregisterUnauthorizedHandler();
        };
    }, [clearAuthTokens]);

    useEffect(() => {
        if (!isAuthChecked) {
            return;
        }
        if (!navigationRef.isReady()) {
            return;
        }
        navigationRef.reset({
            index: 0,
            routes: [{ name: isAuthenticated ? 'Home' : 'Login' }],
        });
    }, [isAuthenticated, isAuthChecked, navigationRef]);

    return (
        <SafeAreaProvider>
            <StatusBar
                barStyle={useDarkThemeShell ? 'light-content' : 'dark-content'}
                backgroundColor={appBackground}
                translucent
            />
            <SafeAreaView style={[styles.container, { backgroundColor: appBackground }]} edges={['top']}>
                {!isAuthChecked ? (
                    <View style={styles.placeholder} />
                ) : (
                    <NavigationContainer
                        ref={navigationRef}
                        onReady={() => setCurrentRouteName(navigationRef.getCurrentRoute()?.name)}
                        onStateChange={() => setCurrentRouteName(navigationRef.getCurrentRoute()?.name)}
                    >
                        <Stack.Navigator
                            screenOptions={{
                                headerShown: false,
                                gestureEnabled: true,
                                animation: 'slide_from_right',
                                fullScreenGestureEnabled: true, // Enable full-screen swipe
                            }}
                        >
                            <Stack.Screen name="Login">
                                {(props) => (
                                    <LoginScreen
                                        onLoginSuccess={handleLoginSuccess}
                                        onNavigateToRegister={() => props.navigation.navigate('Register')}
                                        onUnverifiedEmail={handleUnverifiedEmail}
                                        onNavigateToForgotPassword={() => props.navigation.navigate('ForgotPassword', { prefillEmail: userEmail })}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="Register">
                                {(props) => (
                                    <RegisterScreen
                                        onRegisterSuccess={handleRegisterSuccess}
                                        onNavigateToLogin={() => props.navigation.goBack()}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="OTP">
                                {(props) => (
                                    <OTPScreen
                                        email={userEmail}
                                        onVerifySuccess={handleOTPVerifySuccess}
                                        onNavigateBack={() => props.navigation.goBack()}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="ProfileSetup">
                                {(props) => (
                                    <ProfileSetupScreen
                                        onSetupComplete={handleProfileSetupComplete}
                                        onSkip={handleProfileSetupSkip}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="ForgotPassword">
                                {(props) => (
                                    <ForgotPasswordScreen
                                        onBack={() => props.navigation.goBack()}
                                        prefillEmail={(props.route.params as any)?.prefillEmail || userEmail}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="Home">
                                {(props) => (
                                    <HomeScreen
                                        initialTab={homeEntryTab}
                                        onLogout={handleLogout}
                                        onNavigateToProfile={() => props.navigation.navigate('Profile')}
                                        onNavigateToLive={() => props.navigation.navigate('Live')}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="Live">
                                {(props) => <LivestreamScreen onBack={handleBackToHome} />}
                            </Stack.Screen>

                            <Stack.Screen name="HostLiveManager">
                                {(props) => (
                                    <HostLiveManagerScreen
                                        onBack={() => props.navigation.navigate('Home')}
                                        onNavigateToBroadcast={(sessionId) =>
                                            props.navigation.navigate('HostBroadcast', { sessionId })
                                        }
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="HostBroadcast">
                                {(props) => (
                                    <HostBroadcastScreen
                                        sessionId={(props.route.params as any)?.sessionId || ''}
                                        onBack={() => props.navigation.navigate('HostLiveManager')}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="Profile">
                                {(props) => (
                                    <ProfileScreen
                                        onBackToHome={handleBackToHome}
                                        onNavigateToForgotPassword={() => props.navigation.navigate('ForgotPassword', { prefillEmail: userEmail })}
                                        onNavigateToSubscription={handleNavigateToSubscription}
                                        onNavigateToEditProfile={() => props.navigation.navigate('EditProfile')}
                                        onLogout={handleLogout}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="Subscription">
                                {(props) => (
                                    <SubscriptionScreen
                                        onBack={handleSubscriptionBack}
                                        onSelectPlan={handleSelectPlan}
                                    />
                                )}
                            </Stack.Screen>

                            <Stack.Screen name="PaymentCheckout">
                                {(props) =>
                                    selectedPlan ? (
                                        <PaymentCheckoutScreen
                                            plan={selectedPlan}
                                            onBack={handlePaymentCheckoutBack}
                                            onPaymentSuccess={handlePaymentSuccess}
                                            onPaymentFailed={handlePaymentFailed}
                                        />
                                    ) : null
                                }
                            </Stack.Screen>

                            <Stack.Screen name="PaymentResult">
                                {(props) => (
                                    <PaymentResultScreen
                                        type={paymentResultType}
                                        planName={selectedPlan?.name}
                                        message={paymentResultMessage}
                                        onDone={handlePaymentResultDone}
                                        onRetry={paymentResultType === 'failed' ? handlePaymentRetry : undefined}
                                    />
                                )}
                            </Stack.Screen>
                            <Stack.Screen name="EditProfile">
                                {(props) => <EditProfileScreen onBack={() => props.navigation.goBack()} />}
                            </Stack.Screen>

                        </Stack.Navigator>
                    </NavigationContainer>
                )}
            </SafeAreaView>
            {/* Toast notification component - must be at the end */}
            <Toast config={toastConfig} />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    placeholder: {
        flex: 1,
        backgroundColor: SoundMateLightColors.background,
    },
});

// Root App component with UserProvider
function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
                <UserProvider>
                    <AudioPlayerProvider>
                        <AppContent />
                    </AudioPlayerProvider>
                </UserProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}

// Register the root component
registerRootComponent(App);

export default App;
