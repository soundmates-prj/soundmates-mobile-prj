import { registerRootComponent } from 'expo';
import React, { useCallback, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { toastConfig } from './components/ui/Toast';
import { SoundMateColors } from './constants/theme';
import { HomeScreen, LoginScreen, OTPScreen, RegisterScreen } from './src/pages';

// Define screens enum
enum Screen {
    LOGIN = 'login',
    HOME = 'home',
    REGISTER = 'register',
    OTP = 'otp',
}

function App() {
    const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
    const [userEmail, setUserEmail] = useState<string>('');

    const handleLoginSuccess = useCallback(() => {
        setCurrentScreen(Screen.HOME);
    }, []);

    const handleRegisterSuccess = useCallback((email?: string) => {
        // After registration, go to OTP screen
        if (email) {
            setUserEmail(email);
        }
        setCurrentScreen(Screen.OTP);
    }, []);

    const handleOTPVerifySuccess = useCallback(() => {
        // After OTP verification, go to login screen
        setCurrentScreen(Screen.LOGIN);
    }, []);

    const handleNavigateToRegister = useCallback(() => {
        setCurrentScreen(Screen.REGISTER);
    }, []);

    const handleNavigateToLogin = useCallback(() => {
        setCurrentScreen(Screen.LOGIN);
    }, []);

    const handleOTPGoBack = useCallback(() => {
        setCurrentScreen(Screen.REGISTER);
    }, []);

    const renderScreen = () => {
        switch (currentScreen) {
            case Screen.LOGIN:
                return (
                    <LoginScreen
                        onLoginSuccess={handleLoginSuccess}
                        onNavigateToRegister={handleNavigateToRegister}
                    />
                );
            case Screen.HOME:
                return <HomeScreen />;
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
            default:
                return (
                    <LoginScreen
                        onLoginSuccess={handleLoginSuccess}
                        onNavigateToRegister={handleNavigateToRegister}
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
