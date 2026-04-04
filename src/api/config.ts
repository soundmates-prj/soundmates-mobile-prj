/**
 * API Configuration
 * Base configuration for all API calls in the application
 */

import {
    AUTH_BASE_URL as ENV_AUTH_BASE_URL,
    AZURACAST_BASE as ENV_AZURACAST_BASE,
    MAIN_BASE_URL as ENV_MAIN_BASE_URL,
} from '@env';

// Default values (fallback if env not loaded)
const DEFAULT_AUTH_BASE_URL = 'http://localhost:8080/api/v1';
const DEFAULT_MAIN_BASE_URL = 'http://localhost:8080/api/v1';
const DEFAULT_AZURACAST_BASE = 'http://localhost:5000/api';

const resolveBaseUrl = (
    primary?: string,
    fallback?: string,
    defaultValue?: string,
): string => {
    const primaryValue = primary?.trim();
    if (primaryValue) {
        return primaryValue;
    }

    const fallbackValue = fallback?.trim();
    if (fallbackValue) {
        return fallbackValue;
    }

    return defaultValue || '';
};

// Base URLs for different services
export const API_CONFIG = {
    // Auth Service Base URL - reads from .env file
    AUTH_BASE_URL: resolveBaseUrl(ENV_AUTH_BASE_URL, undefined, DEFAULT_AUTH_BASE_URL),

    // Main API Base URL - fallback to AUTH_BASE_URL when MAIN_BASE_URL is not set
    MAIN_BASE_URL: resolveBaseUrl(ENV_MAIN_BASE_URL, ENV_AUTH_BASE_URL, DEFAULT_MAIN_BASE_URL),

    // AzuraCast Base URL - reads from .env file
    AZURACAST_BASE: resolveBaseUrl(ENV_AZURACAST_BASE, undefined, DEFAULT_AZURACAST_BASE),

    // Add more service URLs here as needed
    // MAIN_BASE_URL: process.env.MAIN_BASE_URL || 'http://localhost:8080/api/v1',

    // Request timeout in milliseconds
    TIMEOUT: 30000,

    // Common headers
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
};

// API Endpoints
export const AUTH_ENDPOINTS = {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/verify-email',
    RESEND_OTP: '/auth/resend-otp',
    FORGET_PASSWORD: '/auth/forget-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    PROFILE_UPDATE: '/auth/profile',
    PROFILE_OPTIONS: '/auth/profile/options', // Update optional profile info (bio, phone, gender, dob, etc.)
};

export const USER_ENDPOINTS = {
    PROFILE_FULL: '/users/me/profile/full',
};

// Blog / Content Endpoints
export const BLOG_ENDPOINTS = {
    // Posts
    POSTS: '/posts',
    POSTS_SHARE_MUSIC: '/posts/share-music',
    POSTS_PUBLISHED: '/posts/published',
    POSTS_TRENDING: '/posts/trending',
    POSTS_POPULAR: '/posts/popular',
    POSTS_STATS: '/posts/stats',
    // Comments
    COMMENTS: '/comments',
    // Reactions
    REACTIONS: '/reactions',
    // Me (current user)
    MY_POSTS: '/me/posts',
    MY_COMMENTS: '/me/comments',
    MY_REACTIONS: '/me/reactions',
    // Moderation
    REPORTS: '/reports',
};

// Subscription Endpoints
export const SUBSCRIPTION_ENDPOINTS = {
    PLANS: '/subscription-plans',
    MY_SUBSCRIPTION: '/me/subscriptions',
    MY_SUBSCRIPTION_HISTORY: '/me/subscriptions/history',
};

export const TRANSACTION_ENDPOINTS = {
    MY_TRANSACTION_HISTORY: '/me/transaction/history',
};

// Payment Endpoints
export const PAYMENT_ENDPOINTS = {
    CREATE: '/payments',
    VNPAY_CALLBACK: '/payments/vnpay/callback',
};

// Podcast Endpoints (routed through API Gateway → live-session-service)
export const PODCAST_ENDPOINTS = {
    LIST: '/podcast',
    DETAIL: (id: string) => `/podcast/${id}`,
};

// Livestream / Live Session Endpoints
export const LIVESTREAM_ENDPOINTS = {
    LIVE_SESSIONS: '/livesession',
    ACTIVE_SESSIONS: '/livesession/active',
    SCHEDULES: '/schedule',
    LIVE_SESSION_DETAIL: (sessionId: string) => `/livesession/${sessionId}`,
    NOW_PLAYING_BY_SESSION: (sessionId: string) => `/livesession/${sessionId}/now-playing`,
    CREATE_LIVE_SESSION: '/livesession',
    UPDATE_LIVE_SESSION: (sessionId: string) => `/livesession/${sessionId}`,
    START_LIVE_SESSION: (sessionId: string) => `/livesession/${sessionId}/start`,
    STOP_LIVE_SESSION: (sessionId: string) => `/livesession/${sessionId}/stop`,
    MY_HOSTED_SESSIONS: '/livesession/my',
};

export const SPOTIFY_ENDPOINTS = {
    SEARCH: '/spotify/search',
};

export const FAVORITE_ENDPOINTS = {
    ME_FAVORITES: '/me/favorites',
};

export const USER_PLAYLIST_ENDPOINTS = {
    USER_PLAYLIST: '/userplaylist',
    USER_PLAYLIST_DETAIL: (playlistId: string) => `/userplaylist/${playlistId}`,
    USER_PLAYLIST_TRACKS: (playlistId: string) => `/userplaylist/${playlistId}/tracks`,
};

export const MUSIC_CATALOG_ENDPOINTS = {
    LIST: '/musiccatalog',
};

export default API_CONFIG;
