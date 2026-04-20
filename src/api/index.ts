/**
 * API Module Export
 * Central export point for all API-related modules
 */

// Config
export { API_CONFIG, AUTH_ENDPOINTS, BLOG_ENDPOINTS, FAVORITE_ENDPOINTS, LIVESTREAM_ENDPOINTS, MUSIC_CATALOG_ENDPOINTS, PAYMENT_ENDPOINTS, PODCAST_ENDPOINTS, SPOTIFY_ENDPOINTS, SUBSCRIPTION_ENDPOINTS, TRANSACTION_ENDPOINTS, USER_ENDPOINTS, USER_PLAYLIST_ENDPOINTS } from './config';

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
    PostStatsResponse, ReactionResponse, ShareMusicPostRequest, TrendingPostResponse, UpdatePostRequest
} from './blogService';
export { favoriteService } from './favoriteService';
export type { AddFavoriteRequest, FavoriteItemResponse, FavoriteListQuery } from './favoriteService';
export { livestreamService } from './livestreamService';
export type { LiveScheduleResult, LiveSessionResult, NowPlayingData, SongRequestItem, TrackInfo } from './livestreamService';
export { paymentService } from './paymentService';
export type {
    CreatePaymentRequest, CreatePaymentResponse, PaymentCallbackVerificationResponse,
    SubscriptionHistoryPaginationResponse, SubscriptionPlanResponse, SubscriptionResponse, TransactionHistoryPaginationResponse, TransactionResponse
} from './paymentService';
export { podcastService } from './podcastService';
export type { PodcastResponse, PodcastEpisode } from './podcastService';
export { spotifyService } from './spotifyService';
export type { SpotifyAlbum, SpotifyArtist, SpotifySearchResult, SpotifyTrack } from './spotifyService';
export { uploadService } from './uploadService';
export type { UploadImagePayload } from './uploadService';
export { userPlaylistService } from './userPlaylistService';
export type {
    CreateUserPlaylistRequest,
    MusicCatalogItemResponse,
    PlaylistTrackResponse,
    PlaylistVisibility,
    UpdateUserPlaylistRequest,
    UserPlaylistResponse
} from './userPlaylistService';
export { notificationService } from './notificationService';
export type { NotificationItem, NotificationPage } from './notificationService';
export { notificationHubService } from './notificationHubService';
export type { RealtimeNotification, BroadcastNotification } from './notificationHubService';

