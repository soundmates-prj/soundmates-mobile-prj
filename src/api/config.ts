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

// Base URLs for different services
export const API_CONFIG = {
    // Auth Service Base URL - reads from .env file
    AUTH_BASE_URL: ENV_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL,

    // Main API Base URL - reads from .env file
    MAIN_BASE_URL: ENV_MAIN_BASE_URL || DEFAULT_MAIN_BASE_URL,

    // AzuraCast Base URL - reads from .env file
    AZURACAST_BASE: ENV_AZURACAST_BASE || DEFAULT_AZURACAST_BASE,

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

export default API_CONFIG;
