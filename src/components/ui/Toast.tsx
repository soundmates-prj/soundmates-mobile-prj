/**
 * Toast Notification Component
 * Custom toast component using react-native-toast-message
 * Provides unified notification style across the entire application
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { SoundMateColors } from '../../../constants/theme';

const { width } = Dimensions.get('window');

// Custom toast types
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface CustomToastProps {
    type: ToastType;
    text1?: string;
    text2?: string;
}

// Icon configuration for each toast type
const TOAST_CONFIG = {
    success: {
        icon: 'checkmark-circle' as const,
        colors: ['#10B981', '#059669'] as [string, string],
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    error: {
        icon: 'close-circle' as const,
        colors: ['#EF4444', '#DC2626'] as [string, string],
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    info: {
        icon: 'information-circle' as const,
        colors: [SoundMateColors.primary, SoundMateColors.primaryDark] as [string, string],
        backgroundColor: `rgba(255, 107, 0, 0.15)`,
        borderColor: `rgba(255, 107, 0, 0.3)`,
    },
    warning: {
        icon: 'warning' as const,
        colors: ['#F59E0B', '#D97706'] as [string, string],
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
};

// Custom toast component
const CustomToastComponent: React.FC<ToastConfigParams<any> & { type: ToastType }> = ({
    type,
    text1,
    text2,
    hide,
}) => {
    const config = TOAST_CONFIG[type];

    return (
        <View style={[styles.toastContainer, {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
        }]}>
            {/* Icon with gradient background */}
            <LinearGradient
                colors={config.colors}
                style={styles.iconContainer}
            >
                <Ionicons
                    name={config.icon}
                    size={24}
                    color="#FFFFFF"
                />
            </LinearGradient>

            {/* Text content */}
            <View style={styles.textContainer}>
                {text1 && (
                    <Text style={styles.title} numberOfLines={1}>
                        {text1}
                    </Text>
                )}
                {text2 && (
                    <Text style={styles.message} numberOfLines={2}>
                        {text2}
                    </Text>
                )}
            </View>

            {/* Close button */}
            <View style={styles.closeButton}>
                <Ionicons
                    name="close"
                    size={18}
                    color={SoundMateColors.textMuted}
                />
            </View>
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
            topOffset: 60,
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
            topOffset: 60,
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
            topOffset: 60,
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
            topOffset: 60,
        });
    },
};

// Hide current toast
export const hideToast = () => {
    Toast.hide();
};

const styles = StyleSheet.create({
    toastContainer: {
        width: width - 32,
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginHorizontal: 16,
        // Glass effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        // Shadow for icon
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: SoundMateColors.textPrimary,
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        color: SoundMateColors.textSecondary,
        lineHeight: 18,
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});

// Export the Toast component from react-native-toast-message for use in App
export { Toast };
export default Toast;
