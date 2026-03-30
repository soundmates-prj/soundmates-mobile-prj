/**
 * Toast Notification Component
 * Custom toast component using react-native-toast-message
 * Provides unified notification style across the entire application
 */

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { SoundMateColors, SoundMateDarkColors, SoundMateLightColors } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Custom toast types
type ToastType = 'success' | 'error' | 'info' | 'warning';

// Icon configuration for each toast type
const TOAST_CONFIG = {
    success: {
        icon: 'checkmark-circle' as const,
        colors: ['#10B981', '#059669'] as [string, string],
        tint: '#10B981',
    },
    error: {
        icon: 'close-circle' as const,
        colors: ['#EF4444', '#DC2626'] as [string, string],
        tint: '#EF4444',
    },
    info: {
        icon: 'information-circle' as const,
        colors: ['#3B82F6', '#2563EB'] as [string, string],
        tint: '#3B82F6',
    },
    warning: {
        icon: 'warning' as const,
        colors: ['#F59E0B', '#D97706'] as [string, string],
        tint: '#F59E0B',
    },
};

// Custom toast component
const CustomToastComponent: React.FC<ToastConfigParams<any> & { type: ToastType }> = ({
    type,
    text1,
    text2,
}) => {
    const config = TOAST_CONFIG[type];
    
    return (
        <View style={styles.outerContainer}>
            <BlurView
                intensity={90}
                tint="dark"
                style={styles.toastContainer}
            >
                <View style={styles.contentRow}>
                    <LinearGradient
                        colors={config.colors}
                        style={styles.iconContainer}
                    >
                        <Ionicons
                            name={config.icon}
                            size={18}
                            color="#FFFFFF"
                        />
                    </LinearGradient>

                    <View style={styles.textContainer}>
                        {text1 && (
                            <Text style={styles.title} numberOfLines={1}>
                                {text1}
                            </Text>
                        )}
                        {text2 && (
                            <Text style={styles.message} numberOfLines={1}>
                                {text2}
                            </Text>
                        )}
                    </View>
                </View>
            </BlurView>
        </View>
    );
};

// Toast configuration
export const toastConfig: ToastConfig = {
    success: (props) => <CustomToastComponent {...props} type="success" />,
    error: (props) => <CustomToastComponent {...props} type="error" />,
    info: (props) => <CustomToastComponent {...props} type="info" />,
    warning: (props) => <CustomToastComponent {...props} type="warning" />,
};

// Toast helper functions
export const showToast = {
    success: (title: string, message?: string) => {
        Toast.show({
            type: 'success',
            text1: title,
            text2: message,
            position: 'top',
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
        });
    },

    error: (title: string, message?: string) => {
        Toast.show({
            type: 'error',
            text1: title,
            text2: message,
            position: 'top',
            visibilityTime: 4000,
            autoHide: true,
            topOffset: 50,
        });
    },

    info: (title: string, message?: string) => {
        Toast.show({
            type: 'info',
            text1: title,
            text2: message,
            position: 'top',
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
        });
    },

    warning: (title: string, message?: string) => {
        Toast.show({
            type: 'warning',
            text1: title,
            text2: message,
            position: 'top',
            visibilityTime: 3500,
            autoHide: true,
            topOffset: 50,
        });
    },
};

// Hide current toast
export const hideToast = () => {
    Toast.hide();
};

const styles = StyleSheet.create({
    outerContainer: {
        alignSelf: 'center',
        marginTop: 10,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    toastContainer: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        minWidth: 200,
        maxWidth: width - 80,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    textContainer: {
        justifyContent: 'center',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    message: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
});

// Export the Toast component from react-native-toast-message for use in App
export { Toast };
export default Toast;
