/**
 * API Module Export
 * Central export point for all API-related modules
 */

// Config
export { API_CONFIG, AUTH_ENDPOINTS, USER_ENDPOINTS } from './config';

// API Client
export { authApiClient, handleApiError } from './apiClient';
export type { ApiResponse } from './apiClient';

// Services
export { authService } from './authService';
export type {
    LoginRequest,
    LoginResponse, RegisterRequest,
    RegisterResponse, UpdateProfileRequest,
    UpdateProfileResponse, UserProfileFullResponse, VerifyOtpRequest,
    VerifyOtpResponse
} from './authService';

