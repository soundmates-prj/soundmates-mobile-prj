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
import { paymentService, type SubscriptionPlanResponse } from '../../api/paymentService';

// ─── Types ───────────────────────────────────────────
export interface SelectedPlan {
    id: string;
    name: string;
    price: number;
    priceLabel: string;
    period: string;
    description: string;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    durationDays?: number;
}

interface PaymentCheckoutScreenProps {
    plan: SelectedPlan;
    onBack: () => void;
    onPaymentSuccess: () => void;
    onPaymentFailed: (reason?: string) => void;
}

// ─── Constants ───────────────────────────────────────
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

const GUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLAN_NAME_HINTS: Record<string, string[]> = {
    free: ['free', 'mien phi'],
    standard: ['standard', 'tieu chuan'],
    premium: ['premium', 'hoi vien'],
};

const normalizeText = (value: string) => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const isGuid = (value: string) => GUID_REGEX.test(value);

const resolveSubscriptionPlan = (
    selectedPlan: SelectedPlan,
    plans: SubscriptionPlanResponse[]
): SubscriptionPlanResponse | undefined => {
    const activePlans = plans.filter((plan) => plan.isActive);

    const samePricePlans = activePlans.filter((plan) => Number(plan.price) === Number(selectedPlan.price));
    if (samePricePlans.length === 1) {
        return samePricePlans[0];
    }

    const selectedSlug = normalizeText(selectedPlan.id);
    const selectedName = normalizeText(selectedPlan.name);
    const hints = new Set<string>([
        selectedSlug,
        selectedName,
        ...(PLAN_NAME_HINTS[selectedSlug] || []),
    ]);

    const planByName = activePlans.find((plan) => {
        const planName = normalizeText(plan.planName);
        return Array.from(hints).some((hint) => hint && planName.includes(hint));
    });

    if (planByName) {
        return planByName;
    }

    const paidPlans = activePlans.filter((plan) => Number(plan.price) > 0);
    if (Number(selectedPlan.price) > 0 && paidPlans.length === 1) {
        return paidPlans[0];
    }

    return undefined;
};

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

// ─── Component ───────────────────────────────────────
export default function PaymentCheckoutScreen({
    plan,
    onBack,
    onPaymentSuccess,
    onPaymentFailed,
}: PaymentCheckoutScreenProps) {
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
        if (callbackHandledRef.current) {
            return;
        }

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

            await checkPaymentResult();
        } catch (error) {
            console.log('[PaymentCheckout] verify callback error:', error);
            setIsProcessing(false);
            onPaymentFailed('Không thể xác thực kết quả thanh toán. Vui lòng thử lại.');
        } finally {
            setIsVerifyingCallback(false);
        }
    };

    const tryHandleCallbackUrl = (url: string) => {
        if (!url || !isVnpayCallbackUrl(url)) {
            return false;
        }

        void verifyCallbackAndFinish(url);
        return true;
    };

    const handlePayment = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            let targetPlanId = plan.id;
            let totalAmount = plan.price;

            if (!isGuid(targetPlanId)) {
                const plansResult = await paymentService.getSubscriptionPlans();

                if (!plansResult.success || !plansResult.data?.length) {
                    setIsProcessing(false);
                    onPaymentFailed('Không thể tải danh sách gói đăng ký để thanh toán. Vui lòng thử lại.');
                    return;
                }

                const matchedPlan = resolveSubscriptionPlan(plan, plansResult.data);

                if (!matchedPlan) {
                    setIsProcessing(false);
                    onPaymentFailed('Không tìm thấy mã gói đăng ký hợp lệ. Vui lòng tải lại và thử lại.');
                    return;
                }

                targetPlanId = matchedPlan.id;
                totalAmount = Number(matchedPlan.price);
            }

            // 1. Gọi API tạo payment, nhận paymentUrl
            const result = await paymentService.createPayment({
                targetType: 'Subscription',
                targetId: targetPlanId,
                method: selectedPayment,
                totalAmount,
            });

            if (!result.success || !result.data?.paymentUrl) {
                setIsProcessing(false);
                onPaymentFailed(result.message || 'Không thể tạo thanh toán. Vui lòng thử lại.');
                return;
            }

            // 2. Mở cổng thanh toán ngay trong app để bắt callback URL và tự đóng khi hoàn tất.
            callbackHandledRef.current = false;
            setPaymentUrl(result.data.paymentUrl);
            setIsProcessing(false);
        } catch (error: any) {
            console.log('[PaymentCheckout] Payment error:', error);
            setIsProcessing(false);
            onPaymentFailed('Đã xảy ra lỗi trong quá trình thanh toán. Vui lòng thử lại.');
        }
    };

    const checkPaymentResult = async () => {
        try {
            // Delay nhỏ để BE xử lý callback
            await new Promise(resolve => setTimeout(resolve, 1500));

            const subResult = await paymentService.getMySubscription();

            if (subResult.success && subResult.data && subResult.data.status?.toLowerCase() === 'active') {
                setIsProcessing(false);
                onPaymentSuccess();
            } else {
                setIsProcessing(false);
                onPaymentFailed('Thanh toán chưa được xác nhận. Vui lòng kiểm tra lại.');
            }
        } catch {
            setIsProcessing(false);
            onPaymentFailed('Không thể xác nhận kết quả thanh toán.');
        }
    };

    const handleClosePaymentWebView = () => {
        if (isVerifyingCallback) {
            return;
        }

        setPaymentUrl(null);
        setIsProcessing(false);
        onPaymentFailed('Bạn đã đóng cổng thanh toán trước khi hoàn tất giao dịch.');
    };

    const handlePaymentWebViewError = (errorEvent: any) => {
        if (isVerifyingCallback || callbackHandledRef.current) {
            return;
        }

        const failingUrl = errorEvent?.nativeEvent?.url as string | undefined;
        if (failingUrl && tryHandleCallbackUrl(failingUrl)) {
            return;
        }

        callbackHandledRef.current = true;
        setPaymentUrl(null);
        setIsProcessing(false);
        console.log('[PaymentCheckout] WebView error:', errorEvent);
        onPaymentFailed('Bạn đã hủy hoặc thoát khỏi cổng thanh toán VNPay.');
    };

    return (
        <SafeAreaView style={[styles.container]} edges={['top', 'left', 'right', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={onBack}
                    style={styles.headerBackButton}
                    disabled={isProcessing}
                >
                    <Ionicons name="arrow-back" size={22} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thanh toán</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Order Summary ─── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>CHI TIẾT ĐƠN HÀNG</Text>
                    <View style={styles.orderCard}>
                        <LinearGradient
                            colors={[plan.gradientFrom, plan.gradientTo]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.orderCardGradient}
                        >
                            <View style={styles.orderIconWrap}>
                                <Ionicons name={plan.icon} size={24} color="white" />
                            </View>
                            <View style={styles.orderInfo}>
                                <Text style={styles.orderPlanName}>{plan.name}</Text>
                                <Text style={styles.orderPlanDesc}>{plan.description}</Text>
                            </View>
                        </LinearGradient>

                        <View style={styles.orderDetails}>
                            <View style={styles.orderRow}>
                                <Text style={styles.orderRowLabel}>Gói đăng ký</Text>
                                <Text style={styles.orderRowValue}>{plan.name}</Text>
                            </View>
                            <View style={styles.orderDivider} />
                            <View style={styles.orderRow}>
                                <Text style={styles.orderRowLabel}>Thời hạn</Text>
                                <Text style={styles.orderRowValue}>{plan.durationDays || 30} ngày</Text>
                            </View>
                            <View style={styles.orderDivider} />
                            <View style={styles.orderRow}>
                                <Text style={styles.orderRowLabel}>Đơn giá</Text>
                                <Text style={styles.orderRowValue}>{plan.priceLabel}đ</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ─── Payment Method ─── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PHƯƠNG THỨC THANH TOÁN</Text>
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
                                        <Text style={styles.methodLabel}>{method.label}</Text>
                                        <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                                    </View>
                                    <View style={[
                                        styles.methodRadio,
                                        isSelected && styles.methodRadioSelected,
                                    ]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ─── Security Notice ─── */}
                <View style={styles.securityBox}>
                    <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                    <View style={styles.securityTextWrap}>
                        <Text style={styles.securityTitle}>Thanh toán an toàn & bảo mật</Text>
                        <Text style={styles.securityDesc}>
                            Giao dịch được mã hóa SSL 256-bit qua cổng thanh toán VNPay. Thông tin của bạn được bảo vệ tuyệt đối.
                        </Text>
                    </View>
                </View>

                {/* ─── Terms ─── */}
                <View style={styles.termsBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                    <Text style={styles.termsText}>
                        Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của SoundMates.
                    </Text>
                </View>
            </ScrollView>

            {/* ─── Bottom CTA ─── */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={styles.bottomPriceWrap}>
                    <Text style={styles.bottomPriceLabel}>Tổng thanh toán</Text>
                    <View style={styles.bottomPriceRow}>
                        <Text style={styles.bottomPriceCurrency}>đ</Text>
                        <Text style={styles.bottomPriceAmount}>{formatCurrency(plan.price)}</Text>
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

            <Modal
                visible={!!paymentUrl}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={handleClosePaymentWebView}
            >
                <SafeAreaView style={styles.webViewScreen} edges={['top', 'bottom']}>
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
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },

    // Header
    header: {
        height: 52,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
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
        color: '#1E293B',
        marginLeft: 8,
    },
    headerSpacer: {
        width: 36,
    },

    // ScrollView
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
    },

    // Section
    section: {
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1,
        marginBottom: 12,
    },

    // Order Card
    orderCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
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
        color: '#6B7280',
    },
    orderRowValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    orderDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 10,
    },

    // Payment Methods
    methodList: {
        gap: 10,
    },
    methodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
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
        color: '#1E293B',
        marginBottom: 2,
    },
    methodSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    methodRadio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodRadioSelected: {
        borderColor: '#55C5F1',
        backgroundColor: '#55C5F1',
    },

    // Security
    securityBox: {
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#ECFDF5',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    securityTextWrap: {
        flex: 1,
    },
    securityTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#065F46',
        marginBottom: 4,
    },
    securityDesc: {
        fontSize: 12,
        lineHeight: 18,
        color: '#047857',
    },

    // Terms
    termsBox: {
        marginHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    termsText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 16,
        color: '#9CA3AF',
    },

    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
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
        color: '#9CA3AF',
        marginBottom: 2,
    },
    bottomPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    bottomPriceCurrency: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '600',
        marginBottom: 2,
    },
    bottomPriceAmount: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        marginLeft: 2,
        lineHeight: 26,
    },

    // Pay Button
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

    // Payment WebView
    webViewScreen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    webViewBody: {
        flex: 1,
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
    webViewLoadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#F9FAFB',
    },
    webViewLoadingText: {
        fontSize: 13,
        color: '#6B7280',
    },
    webViewVerifyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    webViewVerifyText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
});
