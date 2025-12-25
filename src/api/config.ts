/**
 * API Configuration
 * Base configuration for all API calls in the application
 */

import { AUTH_BASE_URL as ENV_AUTH_BASE_URL } from '@env';

// Default values (fallback if env not loaded)
const DEFAULT_AUTH_BASE_URL = 'http://localhost:8001/api/v1';

// Base URLs for different services
export const API_CONFIG = {
    // Auth Service Base URL - reads from .env file
    AUTH_BASE_URL: ENV_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL,

    // Add more service URLs here as needed
    // MAIN_BASE_URL: process.env.MAIN_BASE_URL || 'http://localhost:8000/api/v1',

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
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
};

export default API_CONFIG;
