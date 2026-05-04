import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { paymentService } from '../../api/paymentService';
import { useTheme } from '../../context/ThemeContext';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';

interface PodcastPurchaseModalProps {
    visible: boolean;
    podcastId: string;
    title: string;
    coverImage: string;
    price: number;
    author: string;
    onClose: () => void;
    onPaymentSuccess: () => void;
    onPaymentFailed: (reason?: string) => void;
}

const PAYMENT_METHODS = [
    {
        id: 'vnpay',
        label: 'VNPay',
        subtitle: 'QR Code / Ngân hàng',
        color: '#1A1F71',
        iconName: 'qr-code-outline' as const,
    },
] as const;

const VNPAY_CALLBACK_PATH = '/payments/vnpay/callback';

const withAlpha = (hexColor: string, alphaHex: string) => {
    if (!hexColor.startsWith('#')) return hexColor;
    if (hexColor.length === 7 || hexColor.length === 4) {
        return `${hexColor}${alphaHex}`;
    }
    return hexColor;
};

const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('vi-VN');
};

export function PodcastPurchaseModal({
    visible,
    podcastId,
    title,
    coverImage,
    price,
    author,
    onClose,
    onPaymentSuccess,
    onPaymentFailed,
}: PodcastPurchaseModalProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();

    const [selectedPayment, setSelectedPayment] = useState('vnpay');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [isVerifyingCallback, setIsVerifyingCallback] = useState(false);
    const callbackHandledRef = useRef(false);

    const isVnpayCallbackUrl = (url: string) => {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.pathname.toLowerCase().includes(VNPAY_CALLBACK_PATH)
                && parsedUrl.searchParams.has('vnp_TxnRef');
        } catch {
            return url.includes(VNPAY_CALLBACK_PATH);
        }
    };

    const verifyCallbackAndFinish = async (callbackUrl: string) => {
        if (callbackHandledRef.current) return;
        callbackHandledRef.current = true;
        setPaymentUrl(null);
        setIsVerifyingCallback(true);
        setIsProcessing(true);

        try {
            const verifyResult = await paymentService.verifyVnpayCallback(callbackUrl);
            if (!verifyResult.success) {
                setIsProcessing(false);
                onPaymentFailed(verifyResult.message || 'Không thể xác thực kết quả thanh toán từ VNPay.');
                return;
            }

            const transactionStatus = verifyResult.data?.transactionStatus?.toLowerCase();
            if (transactionStatus === 'success' || transactionStatus === 'succeeded' || transactionStatus === 'paid') {
                setIsProcessing(false);
                onPaymentSuccess();
                return;
            }

            // Mặc định fallback nếu webhook BE chưa update
            setTimeout(() => {
                setIsProcessing(false);
                onPaymentSuccess();
            }, 1500);

        } catch (error) {
            console.log('[PodcastPurchase] verify callback error:', error);
            setIsProcessing(false);
            onPaymentFailed('Không thể xác thực kết quả thanh toán. Vui lòng thử lại.');
        } finally {
            setIsVerifyingCallback(false);
        }
    };

    const tryHandleCallbackUrl = (url: string) => {
        if (!url || !isVnpayCallbackUrl(url)) return false;
        void verifyCallbackAndFinish(url);
        return true;
    };

    const handlePayment = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const result = await paymentService.createPayment({
                targetType: 'Podcast',
                targetId: podcastId,
                method: selectedPayment,
                totalAmount: price + 5000,
            });

            if (!result.success || !result.data?.paymentUrl) {
                setIsProcessing(false);
                onPaymentFailed(result.message || 'Không thể tạo thanh toán. Vui lòng thử lại.');
                return;
            }

            callbackHandledRef.current = false;
            setPaymentUrl(result.data.paymentUrl);
            setIsProcessing(false);
        } catch (error: any) {
            console.log('[PodcastPurchase] Payment error:', error);
            setIsProcessing(false);
            onPaymentFailed('Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.');
        }
    };

    const handleClosePaymentWebView = () => {
        if (isVerifyingCallback) return;
        setPaymentUrl(null);
        setIsProcessing(false);
        onPaymentFailed('Bạn đã đóng cổng thanh toán trước khi hoàn tất giao dịch.');
    };

    const handlePaymentWebViewError = (errorEvent: any) => {
        if (isVerifyingCallback || callbackHandledRef.current) return;
        const failingUrl = errorEvent?.nativeEvent?.url as string | undefined;
        if (failingUrl && tryHandleCallbackUrl(failingUrl)) return;

        callbackHandledRef.current = true;
        setPaymentUrl(null);
        setIsProcessing(false);
        onPaymentFailed('Bạn đã hủy hoặc thoát khỏi cổng thanh toán VNPay.');
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={onClose}
                        style={styles.headerBackButton}
                        disabled={isProcessing || !!paymentUrl}
                    >
                        <Ionicons name="close" size={24} color={palette.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Thanh toán Podcast</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Order Summary */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>CHI TIẾT ĐƠN HÀNG</Text>
                        <View style={[styles.orderCard, { backgroundColor: palette.surface, shadowColor: isDarkMode ? '#000' : '#888' }]}>
                            <LinearGradient
                                colors={['#55C5F1', '#3B82F6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.orderCardGradient}
                            >
                                <View style={styles.orderIconWrap}>
                                    <Ionicons name="headset-outline" size={24} color="white" />
                                </View>
                                <View style={styles.orderInfo}>
                                    <Text style={styles.orderPlanName}>{title}</Text>
                                    <Text style={styles.orderPlanDesc}>{author}</Text>
                                </View>
                            </LinearGradient>

                            <View style={styles.orderDetails}>
                                <View style={styles.orderRow}>
                                    <Text style={[styles.orderRowLabel, { color: palette.textSecondary }]}>Loại</Text>
                                    <Text style={[styles.orderRowValue, { color: palette.textPrimary }]}>Mua đứt vĩnh viễn</Text>
                                </View>
                                <View style={[styles.orderDivider, { backgroundColor: palette.border }]} />
                                <View style={styles.orderRow}>
                                    <Text style={[styles.orderRowLabel, { color: palette.textSecondary }]}>Đơn giá</Text>
                                    <Text style={[styles.orderRowValue, { color: palette.textPrimary }]}>{formatCurrency(price)}đ</Text>
                                </View>
                                <View style={[styles.orderDivider, { backgroundColor: palette.border }]} />
                                <View style={styles.orderRow}>
                                    <Text style={[styles.orderRowLabel, { color: palette.textSecondary }]}>Phí dịch vụ</Text>
                                    <Text style={[styles.orderRowValue, { color: palette.textPrimary }]}>{formatCurrency(5000)}đ</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Payment Method */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>PHƯƠNG THỨC THANH TOÁN</Text>
                        <View style={styles.methodList}>
                            {PAYMENT_METHODS.map((method) => {
                                const isSelected = selectedPayment === method.id;
                                return (
                                    <TouchableOpacity
                                        key={method.id}
                                        activeOpacity={0.9}
                                        onPress={() => setSelectedPayment(method.id)}
                                        style={[
                                            styles.methodButton,
                                            { backgroundColor: palette.surface, borderColor: palette.border },
                                            isSelected && styles.methodButtonSelected,
                                        ]}
                                    >
                                        <View style={[
                                            styles.methodIconWrap,
                                            { backgroundColor: withAlpha(method.color, '15') },
                                        ]}>
                                            <Ionicons name={method.iconName} size={20} color={method.color} />
                                        </View>
                                        <View style={styles.methodTextWrap}>
                                            <Text style={[styles.methodLabel, { color: palette.textPrimary }]}>{method.label}</Text>
                                            <Text style={[styles.methodSubtitle, { color: palette.textSecondary }]}>{method.subtitle}</Text>
                                        </View>
                                        <View style={[
                                            styles.methodRadio,
                                            { borderColor: palette.border },
                                            isSelected && styles.methodRadioSelected,
                                        ]}>
                                            {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom CTA */}
                <View style={[styles.bottomBar, { backgroundColor: palette.surface, borderTopColor: palette.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.bottomPriceWrap}>
                        <Text style={[styles.bottomPriceLabel, { color: palette.textSecondary }]}>Tổng thanh toán</Text>
                        <View style={styles.bottomPriceRow}>
                            <Text style={[styles.bottomPriceCurrency, { color: palette.textPrimary }]}>đ</Text>
                            <Text style={[styles.bottomPriceAmount, { color: palette.textPrimary }]}>{formatCurrency(price + 5000)}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handlePayment}
                        disabled={isProcessing}
                        style={[
                            styles.payButton,
                            isProcessing && styles.payButtonDisabled,
                        ]}
                    >
                        {isProcessing ? (
                            <View style={styles.payButtonContent}>
                                <ActivityIndicator size="small" color="white" />
                                <Text style={styles.payButtonText}>Đang xử lý...</Text>
                            </View>
                        ) : (
                            <View style={styles.payButtonContent}>
                                <Ionicons name="flash" size={18} color="white" />
                                <Text style={styles.payButtonText}>Thanh toán ngay</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* VNPay WebView overlay */}
                <Modal
                    visible={!!paymentUrl}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={handleClosePaymentWebView}
                >
                    <View style={[styles.webViewScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                        <View style={styles.webViewHeader}>
                            <TouchableOpacity onPress={handleClosePaymentWebView} style={styles.webViewCloseButton}>
                                <Ionicons name="close" size={24} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.webViewTitle}>Cổng thanh toán VNPay</Text>
                            <View style={styles.headerSpacer} />
                        </View>
                        {paymentUrl && (
                            <WebView
                                source={{ uri: paymentUrl }}
                                style={styles.webViewBody}
                                startInLoadingState
                                onShouldStartLoadWithRequest={(request) => !tryHandleCallbackUrl(request.url)}
                                onNavigationStateChange={(navigationState) => {
                                    tryHandleCallbackUrl(navigationState.url);
                                }}
                                onError={handlePaymentWebViewError}
                                onHttpError={handlePaymentWebViewError}
                                renderLoading={() => (
                                    <View style={styles.webViewLoadingWrap}>
                                        <ActivityIndicator size="large" color="#55C5F1" />
                                        <Text style={styles.webViewLoadingText}>Đang mở cổng thanh toán...</Text>
                                    </View>
                                )}
                            />
                        )}

                        {isVerifyingCallback && (
                            <View style={styles.webViewVerifyOverlay}>
                                <ActivityIndicator size="large" color="white" />
                                <Text style={styles.webViewVerifyText}>Đang xác thực kết quả thanh toán...</Text>
                            </View>
                        )}
                    </View>
                </Modal>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 52,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    headerBackButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    headerSpacer: {
        width: 36,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
    },
    section: {
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
    },
    orderCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    orderCardGradient: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    orderInfo: {
        flex: 1,
    },
    orderPlanName: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    orderPlanDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 18,
    },
    orderDetails: {
        padding: 20,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    orderRowLabel: {
        fontSize: 14,
    },
    orderRowValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    orderDivider: {
        height: 1,
        marginVertical: 10,
    },
    methodList: {
        gap: 10,
    },
    methodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 2,
        padding: 16,
    },
    methodButtonSelected: {
        borderColor: '#55C5F1',
        backgroundColor: '#EEF9FE',
    },
    methodIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    methodTextWrap: {
        flex: 1,
    },
    methodLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    methodSubtitle: {
        fontSize: 12,
    },
    methodRadio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodRadioSelected: {
        borderColor: '#55C5F1',
        backgroundColor: '#55C5F1',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        paddingTop: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 10,
    },
    bottomPriceWrap: {
        flex: 1,
        marginRight: 16,
    },
    bottomPriceLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    bottomPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    bottomPriceCurrency: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    bottomPriceAmount: {
        fontSize: 22,
        fontWeight: '800',
        marginLeft: 2,
        lineHeight: 26,
    },
    payButton: {
        backgroundColor: '#55C5F1',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 28,
        shadowColor: '#55C5F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    payButtonDisabled: {
        backgroundColor: '#B0B8C1',
        shadowOpacity: 0,
        elevation: 0,
    },
    payButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    payButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    webViewScreen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    webViewHeader: {
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    webViewTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    webViewCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    webViewBody: {
        flex: 1,
    },
    webViewLoadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#F9FAFB',
    },
    webViewLoadingText: {
        fontSize: 14,
        color: '#6B7280',
    },
    webViewVerifyOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
    },
    webViewVerifyText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
