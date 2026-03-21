import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ResultType = 'success' | 'failed';

interface PaymentResultScreenProps {
    type: ResultType;
    planName?: string;
    message?: string;
    onDone: () => void;
    onRetry?: () => void;
}

export default function PaymentResultScreen({
    type,
    planName,
    message,
    onDone,
    onRetry,
}: PaymentResultScreenProps) {
    const insets = useSafeAreaInsets();
    const fallbackTopInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
    const topInset = Math.max(insets.top, fallbackTopInset);

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const isSuccess = type === 'success';

    useEffect(() => {
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 80,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { paddingTop: topInset }]} edges={['left', 'right', 'bottom']}>
            <View style={styles.content}>
                {/* ─── Icon ─── */}
                <Animated.View
                    style={[
                        styles.iconContainer,
                        { transform: [{ scale: scaleAnim }] },
                    ]}
                >
                    {isSuccess ? (
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconCircle}
                        >
                            <View style={styles.iconInnerRing}>
                                <Ionicons name="checkmark" size={48} color="#10B981" />
                            </View>
                        </LinearGradient>
                    ) : (
                        <LinearGradient
                            colors={['#EF4444', '#DC2626']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconCircle}
                        >
                            <View style={styles.iconInnerRing}>
                                <Ionicons name="close" size={48} color="#EF4444" />
                            </View>
                        </LinearGradient>
                    )}
                </Animated.View>

                {/* ─── Text ─── */}
                <Animated.View
                    style={[
                        styles.textContent,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <Text style={styles.title}>
                        {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
                    </Text>

                    <Text style={styles.description}>
                        {isSuccess
                            ? `Bạn đã nâng cấp thành công lên gói `
                            : (message || 'Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.')}
                        {isSuccess && planName && (
                            <Text style={styles.descriptionBold}>{planName}</Text>
                        )}
                        {isSuccess && '. Hãy tận hưởng các tính năng mới!'}
                    </Text>

                    {/* {isSuccess && (
                        <View style={styles.benefitsBox}>
                            <View style={styles.benefitRow}>
                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                <Text style={styles.benefitText}>Tất cả tính năng Premium đã được kích hoạt</Text>
                            </View>
                            <View style={styles.benefitRow}>
                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                <Text style={styles.benefitText}>Request nhạc không giới hạn</Text>
                            </View>
                            <View style={styles.benefitRow}>
                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                <Text style={styles.benefitText}>Giọng đọc AI cá nhân hóa</Text>
                            </View>
                        </View>
                    )} */}
                </Animated.View>

                {/* ─── Actions ─── */}
                <Animated.View
                    style={[
                        styles.actions,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {isSuccess ? (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={onDone}
                            style={styles.primaryButton}
                        >
                            <LinearGradient
                                colors={['#55C5F1', '#3BB5E8']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryButtonGradient}
                            >
                                <Ionicons name="sparkles" size={18} color="white" />
                                <Text style={styles.primaryButtonText}>Bắt đầu trải nghiệm</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <>
                            {onRetry && (
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={onRetry}
                                    style={styles.primaryButton}
                                >
                                    <LinearGradient
                                        colors={['#55C5F1', '#3BB5E8']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.primaryButtonGradient}
                                    >
                                        <Ionicons name="refresh" size={18} color="white" />
                                        <Text style={styles.primaryButtonText}>Thử lại</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={onDone}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>Quay về</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },

    // Icon
    iconContainer: {
        marginBottom: 32,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    iconInnerRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Text
    textContent: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 24,
        textAlign: 'center',
        maxWidth: 320,
    },
    descriptionBold: {
        fontWeight: '700',
        color: '#1E293B',
    },

    // Benefits
    benefitsBox: {
        marginTop: 24,
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        gap: 12,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    benefitText: {
        fontSize: 13,
        color: '#065F46',
        flex: 1,
    },

    // Actions
    actions: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#55C5F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    secondaryButton: {
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
});
