/**
 * Auth Service
 * API calls for authentication-related operations
 */

import { ApiResponse, authApiClient, handleApiError } from './apiClient';
import { AUTH_ENDPOINTS, USER_ENDPOINTS } from './config';

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

export interface GoogleLoginRequest {
    idToken: string;
}

export interface LoginResponse {
    userId: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
    roleName?: string;
    isActive: boolean;
    accessToken?: string;
    refreshToken?: string;
    redirectUrl?: string;
    createdAt?: string;
}

export interface VerifyOtpRequest {
    email: string;
    otpCode: string;
}

export interface VerifyOtpResponse {
    userId: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
    roleName?: string;
    isActive: boolean;
    accessToken?: string;
    refreshToken?: string;
    createdAt?: string;
}

export interface UpdateProfileOptionsRequest {
    bio?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    profileImageUrl?: string;
    backgroundImageUrl?: string;
    location?: string;
    website?: string;
}

export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    bio?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    profileImageUrl?: string;
    backgroundImageUrl?: string;
    location?: string;
    website?: string;
}

export interface UpdateProfileOptionsResponse {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    location?: string;
    website?: string;
}

export interface UpdateProfileResponse {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    profileImageUrl?: string;
    backgroundImageUrl?: string;
    location?: string;
    website?: string;
    updatedAt?: string;
}

export interface UserProfileFullResponse {
    id?: string;
    userId?: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    profileImageUrl?: string;
    backgroundImageUrl?: string;
    location?: string;
    website?: string;
    roleId?: string;
    roleName?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
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
            console.log('url:', authApiClient.defaults.baseURL + AUTH_ENDPOINTS.LOGIN);
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
     * Login user with Google ID token
     */
    async googleLogin(data: GoogleLoginRequest): Promise<ApiResponse<LoginResponse>> {
        try {
            const response = await authApiClient.post<LoginResponse>(
                AUTH_ENDPOINTS.GOOGLE_LOGIN,
                data
            );

            return {
                success: true,
                data: response.data,
                message: 'Đăng nhập Google thành công!',
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
     * Forgot password - request password reset OTP
     */
    async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
        try {
            const response = await authApiClient.post(
                AUTH_ENDPOINTS.FORGET_PASSWORD,
                { email }
            );

            return {
                success: true,
                data: response.data,
                message: 'Đã gửi mã OTP về email của bạn!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Reset password with OTP code
     */
    async resetPassword(
        email: string,
        otpCode: string,
        newPassword: string
    ): Promise<ApiResponse<{ message: string }>> {
        try {
            const response = await authApiClient.post(
                AUTH_ENDPOINTS.RESET_PASSWORD,
                { email, otpCode, newPassword }
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

    /**
     * Update profile options (Bio, Phone, Gender, DOB, etc.)
     * Requires authentication
     */
    async updateProfileOptions(data: UpdateProfileOptionsRequest): Promise<ApiResponse<UpdateProfileOptionsResponse>> {
        try {
            const response = await authApiClient.put<UpdateProfileOptionsResponse>(
                AUTH_ENDPOINTS.PROFILE_OPTIONS,
                data
            );

            return {
                success: true,
                data: response.data,
                message: 'Cập nhật thông tin thành công!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<UpdateProfileResponse>> {
        try {
            const response = await authApiClient.put<UpdateProfileResponse>(
                AUTH_ENDPOINTS.PROFILE_UPDATE,
                data
            );

            const rawData = response.data as any;
            const payload = rawData?.data ?? rawData?.result ?? rawData?.profile ?? rawData;

            return {
                success: true,
                data: payload,
                message: rawData?.message || 'Cập nhật hồ sơ thành công!',
            };
        } catch (error: any) {
            return {
                success: false,
                message: handleApiError(error),
            };
        }
    }

    /**
     * Get current user full profile
     */
    async getMyProfileFull(): Promise<ApiResponse<UserProfileFullResponse>> {
        try {
            const response = await authApiClient.get<UserProfileFullResponse>(
                USER_ENDPOINTS.PROFILE_FULL
            );

            const rawData = response.data as any;
            const payload = rawData?.data ?? rawData?.result ?? rawData?.profile ?? rawData;

            return {
                success: true,
                data: payload,
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
