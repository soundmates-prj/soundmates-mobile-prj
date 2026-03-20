/**
 * Payment & Subscription Service
 * API calls for subscription plans, payments (VNPay), and subscription status
 */

import { ApiResponse, authApiClient } from './apiClient';
import { SUBSCRIPTION_ENDPOINTS, PAYMENT_ENDPOINTS } from './config';

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

export interface SubscriptionHistoryPaginationResponse {
    items: SubscriptionResponse[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

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
            console.error('[PaymentService] getSubscriptionPlans error:', error);
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
            console.error('[PaymentService] getSubscriptionPlanById error:', error);
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
            console.error('[PaymentService] createPayment error:', error);
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
            console.error('[PaymentService] getMySubscription error:', error);
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
            console.error('[PaymentService] getMySubscriptionHistory error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải lịch sử đăng ký',
            };
        }
    },
};

export default paymentService;
