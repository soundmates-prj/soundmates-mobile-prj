/**
 * API Module Export
 * Central export point for all API-related modules
 */

// Config
export { API_CONFIG, AUTH_ENDPOINTS, BLOG_ENDPOINTS, PAYMENT_ENDPOINTS, SUBSCRIPTION_ENDPOINTS, USER_ENDPOINTS } from './config';

// API Client
export { authApiClient, handleApiError, registerUnauthorizedHandler } from './apiClient';
export type { ApiResponse, UnauthorizedErrorInfo, UnauthorizedHandler } from './apiClient';

// Services
export { authService } from './authService';
export type {
    LoginRequest,
    LoginResponse, RegisterRequest,
    RegisterResponse, UpdateProfileRequest,
    UpdateProfileResponse, UserProfileFullResponse, VerifyOtpRequest,
    VerifyOtpResponse
} from './authService';
export { blogService } from './blogService';
export type {
    BlogPostResponse, CommentResponse, CreatePostRequest, PaginationParams, PaginationResponse, PopularPostResponse,
    PostStatsResponse, ReactionResponse, TrendingPostResponse, UpdatePostRequest
} from './blogService';
export { livestreamService } from './livestreamService';
export type { NowPlayingData, SongRequestItem, TrackInfo } from './livestreamService';
export { paymentService } from './paymentService';
export type {
    CreatePaymentRequest, CreatePaymentResponse,
    SubscriptionHistoryPaginationResponse, SubscriptionPlanResponse,
    SubscriptionResponse
} from './paymentService';

