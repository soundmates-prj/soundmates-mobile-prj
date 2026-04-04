/**
 * Payment & Subscription Service
 * API calls for subscription plans, payments (VNPay), and subscription status
 */

import { ApiResponse, authApiClient } from './apiClient';
import { API_CONFIG, PAYMENT_ENDPOINTS, SUBSCRIPTION_ENDPOINTS, TRANSACTION_ENDPOINTS } from './config';

// =====================================================
// TYPES
// =====================================================

export interface SubscriptionPlanResponse {
    id: string;
    planName: string;
    price: number;
    durationDays: number;
    requestLimit: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    description?: string | null;
}

export interface SubscriptionResponse {
    id: string;
    userId: string;
    planId: string;
    planName: string;
    startDate: string;
    endDate: string;
    subscribeAt: string;
    status: string;
    userProfile?: unknown;
}

export interface TransactionResponse {
    id: string;
    paymentId: string;
    paymentProvider: string;
    paymentMethod: string;
    amount: number;
    paymentAt: string;
    transactionStatus: string;
    createdAt: string;
    userProfile?: unknown;
}

export interface CreatePaymentRequest {
    targetType: string;
    targetId: string;
    method: string;
    totalAmount: number;
}

export interface CreatePaymentResponse {
    paymentUrl: string;
}

export interface PaymentCallbackVerificationResponse {
    id: string;
    paymentId: string;
    paymentProvider: string;
    paymentMethod: string;
    amount: number;
    paymentAt: string;
    transactionStatus: string;
    createdAt: string;
    userProfile?: unknown;
}

export interface SubscriptionHistoryPaginationResponse {
    items: SubscriptionResponse[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export interface TransactionHistoryPaginationResponse {
    items: TransactionResponse[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const resolveApiHost = () => {
    try {
        return new URL(API_CONFIG.AUTH_BASE_URL).hostname;
    } catch {
        return '';
    }
};

const replaceLocalhostWithApiHost = (rawUrl: string): string => {
    const apiHost = resolveApiHost();
    if (!rawUrl || !apiHost) {
        return rawUrl;
    }

    try {
        const parsedUrl = new URL(rawUrl);
        if (LOCAL_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
            parsedUrl.hostname = apiHost;
        }
        return parsedUrl.toString();
    } catch {
        return rawUrl
            .replace('://localhost', `://${apiHost}`)
            .replace('://127.0.0.1', `://${apiHost}`);
    }
};

const inferVnpSecureHashType = (secureHash?: string | null): string | undefined => {
    if (!secureHash) {
        return undefined;
    }

    const normalized = secureHash.trim();
    if (normalized.length === 128) {
        return 'SHA512';
    }

    if (normalized.length === 64) {
        return 'SHA256';
    }

    return undefined;
};

const ensureVnpSecureHashType = (rawUrl: string): string => {
    if (!rawUrl) {
        return rawUrl;
    }

    try {
        const parsedUrl = new URL(rawUrl);
        const existingType = parsedUrl.searchParams.get('vnp_SecureHashType');

        if (existingType) {
            return parsedUrl.toString();
        }

        const inferredType = inferVnpSecureHashType(parsedUrl.searchParams.get('vnp_SecureHash'));
        if (!inferredType) {
            return parsedUrl.toString();
        }

        parsedUrl.searchParams.set('vnp_SecureHashType', inferredType);
        return parsedUrl.toString();
    } catch {
        return rawUrl;
    }
};

// =====================================================
// SERVICE
// =====================================================

export const paymentService = {
    // ─────────────────────────────────────
    // SUBSCRIPTION PLANS
    // ─────────────────────────────────────

    /**
     * Get all available subscription plans
     */
    async getSubscriptionPlans(): Promise<{
        success: boolean;
        data?: SubscriptionPlanResponse[];
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<SubscriptionPlanResponse[]>>(
                SUBSCRIPTION_ENDPOINTS.PLANS
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[PaymentService] getSubscriptionPlans error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải danh sách gói đăng ký',
            };
        }
    },

    /**
     * Get subscription plan detail by ID
     */
    async getSubscriptionPlanById(planId: string): Promise<{
        success: boolean;
        data?: SubscriptionPlanResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<SubscriptionPlanResponse>>(
                `${SUBSCRIPTION_ENDPOINTS.PLANS}/${planId}`
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[PaymentService] getSubscriptionPlanById error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không tìm thấy gói đăng ký',
            };
        }
    },

    // ─────────────────────────────────────
    // PAYMENTS
    // ─────────────────────────────────────

    /**
     * Create a payment request and get the VNPay payment URL
     */
    async createPayment(request: CreatePaymentRequest): Promise<{
        success: boolean;
        data?: CreatePaymentResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.post<CreatePaymentResponse>(
                PAYMENT_ENDPOINTS.CREATE,
                request
            );
            return {
                success: true,
                data: response.data,
                message: 'Payment URL created successfully',
            };
        } catch (error: any) {
            console.log('[PaymentService] createPayment error:', error);
            const errorMsg = error.response?.data?.message
                || error.response?.data?.Message
                || (typeof error.response?.data === 'string' ? error.response.data : null)
                || 'Không thể tạo thanh toán';
            return {
                success: false,
                message: errorMsg,
            };
        }
    },

    /**
     * Verify VNPay callback URL and return transaction result.
        * Callback from VNPay may contain localhost host; this rewrites it to the env-configured API host.
     */
    async verifyVnpayCallback(callbackUrl: string): Promise<{
        success: boolean;
        data?: PaymentCallbackVerificationResponse;
        message?: string;
        callbackUrl?: string;
    }> {
        const resolvedCallbackUrl = ensureVnpSecureHashType(
            replaceLocalhostWithApiHost(callbackUrl)
        );

        try {
            const response = await authApiClient.get<ApiResponse<PaymentCallbackVerificationResponse>>(
                resolvedCallbackUrl
            );

            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
                callbackUrl: resolvedCallbackUrl,
            };
        } catch (error: any) {
            console.log('[PaymentService] verifyVnpayCallback direct URL error:', error);

            // Fallback: call callback endpoint via gateway base URL using the same query params.
            try {
                const parsedUrl = new URL(resolvedCallbackUrl);
                const params = Object.fromEntries(parsedUrl.searchParams.entries());

                if (!params.vnp_SecureHashType) {
                    const inferredType = inferVnpSecureHashType(params.vnp_SecureHash);
                    if (inferredType) {
                        params.vnp_SecureHashType = inferredType;
                    }
                }

                const fallbackResponse = await authApiClient.get<ApiResponse<PaymentCallbackVerificationResponse>>(
                    PAYMENT_ENDPOINTS.VNPAY_CALLBACK,
                    { params }
                );

                return {
                    success: fallbackResponse.data.success,
                    data: fallbackResponse.data.data,
                    message: fallbackResponse.data.message,
                    callbackUrl: resolvedCallbackUrl,
                };
            } catch (fallbackError: any) {
                console.log('[PaymentService] verifyVnpayCallback fallback error:', fallbackError);
                return {
                    success: false,
                    message: fallbackError.response?.data?.message
                        || fallbackError.response?.data?.Message
                        || 'Không thể xác thực kết quả thanh toán từ VNPay',
                    callbackUrl: resolvedCallbackUrl,
                };
            }
        }
    },

    // ─────────────────────────────────────
    // SUBSCRIPTIONS (CURRENT USER)
    // ─────────────────────────────────────

    /**
     * Get current user's active subscription
     */
    async getMySubscription(): Promise<{
        success: boolean;
        data?: SubscriptionResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<SubscriptionResponse>>(
                SUBSCRIPTION_ENDPOINTS.MY_SUBSCRIPTION
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[PaymentService] getMySubscription error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không tìm thấy subscription',
            };
        }
    },

    /**
     * Get current user's subscription history (paginated)
     */
    async getMySubscriptionHistory(params?: { page?: number; pageSize?: number }): Promise<{
        success: boolean;
        data?: SubscriptionHistoryPaginationResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<SubscriptionHistoryPaginationResponse>>(
                SUBSCRIPTION_ENDPOINTS.MY_SUBSCRIPTION_HISTORY,
                { params }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[PaymentService] getMySubscriptionHistory error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải lịch sử đăng ký',
            };
        }
    },

    /**
     * Get current user's transaction history (paginated)
     */
    async getMyTransactionHistory(params?: { page?: number; pageSize?: number }): Promise<{
        success: boolean;
        data?: TransactionHistoryPaginationResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<TransactionHistoryPaginationResponse>>(
                TRANSACTION_ENDPOINTS.MY_TRANSACTION_HISTORY,
                { params }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[PaymentService] getMyTransactionHistory error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải lịch sử giao dịch',
            };
        }
    },
};

export default paymentService;
