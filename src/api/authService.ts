/**
 * Auth Service
 * API calls for authentication-related operations
 */

import { ApiResponse, authApiClient, handleApiError } from './apiClient';
import { AUTH_ENDPOINTS } from './config';

// Types for Auth operations
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface RegisterResponse {
    userId?: string;
    email?: string;
    message?: string;
    requiresOtp?: boolean;
}

export interface LoginRequest {
    emailOrUsername: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    };
}

export interface VerifyOtpRequest {
    email: string;
    otpCode: string;
}

export interface VerifyOtpResponse {
    verified: boolean;
    message?: string;
}

// Auth Service class
class AuthService {
    /**
     * Register a new user
     */
    async register(data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
        try {
            const response = await authApiClient.post<RegisterResponse>(
                AUTH_ENDPOINTS.REGISTER,
                data
            );

            return {
                success: true,
                data: response.data,
                message: 'Đăng ký thành công!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Login user
     */
    async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
        try {
            const response = await authApiClient.post<LoginResponse>(
                AUTH_ENDPOINTS.LOGIN,
                data
            );

            return {
                success: true,
                data: response.data,
                message: 'Đăng nhập thành công!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Verify OTP code
     */
    async verifyOtp(data: VerifyOtpRequest): Promise<ApiResponse<VerifyOtpResponse>> {
        try {
            const response = await authApiClient.post<VerifyOtpResponse>(
                AUTH_ENDPOINTS.VERIFY_OTP,
                data
            );

            return {
                success: true,
                data: response.data,
                message: 'Xác thực thành công!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Resend OTP code
     */
    async resendOtp(email: string): Promise<ApiResponse<{ message: string }>> {
        try {
            const response = await authApiClient.post(
                AUTH_ENDPOINTS.RESEND_OTP,
                { email }
            );

            return {
                success: true,
                data: response.data,
                message: 'Đã gửi lại mã OTP!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Forgot password - request password reset
     */
    async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
        try {
            const response = await authApiClient.post(
                AUTH_ENDPOINTS.FORGOT_PASSWORD,
                { email }
            );

            return {
                success: true,
                data: response.data,
                message: 'Đã gửi email đặt lại mật khẩu!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(
        token: string,
        newPassword: string
    ): Promise<ApiResponse<{ message: string }>> {
        try {
            const response = await authApiClient.post(
                AUTH_ENDPOINTS.RESET_PASSWORD,
                { token, newPassword }
            );

            return {
                success: true,
                data: response.data,
                message: 'Đặt lại mật khẩu thành công!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
        try {
            const response = await authApiClient.post(
                AUTH_ENDPOINTS.REFRESH_TOKEN,
                { refreshToken }
            );

            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Logout user
     */
    async logout(): Promise<ApiResponse<void>> {
        try {
            await authApiClient.post(AUTH_ENDPOINTS.LOGOUT);

            return {
                success: true,
                message: 'Đăng xuất thành công!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
