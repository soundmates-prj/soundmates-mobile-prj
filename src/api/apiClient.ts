/**
 * API Client
 * Axios instance configuration with interceptors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';

export interface UnauthorizedErrorInfo {
    status: number;
    errorCode?: number;
    message?: string;
    data?: unknown;
    url?: string;
    method?: string;
}

export type UnauthorizedHandler = (error: UnauthorizedErrorInfo) => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let isHandlingUnauthorized = false;
let lastUnauthorizedHandledAt = 0;

export const registerUnauthorizedHandler = (handler: UnauthorizedHandler) => {
    unauthorizedHandler = handler;

    return () => {
        if (unauthorizedHandler === handler) {
            unauthorizedHandler = null;
        }
    };
};

const parseErrorCode = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return undefined;
};

const normalizeUnauthorizedError = (error: AxiosError): UnauthorizedErrorInfo => {
    const data = error.response?.data as Record<string, unknown> | undefined;
    const messageValue = data?.Message ?? data?.message;
    const message = typeof messageValue === 'string' ? messageValue : undefined;
    const errorCode = parseErrorCode(data?.ErrorCode ?? data?.errorCode);

    return {
        status: error.response?.status ?? 0,
        errorCode,
        message,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
    };
};

const isTokenMissingOrInvalid = (errorInfo: UnauthorizedErrorInfo): boolean => {
    if (errorInfo.status !== 401) {
        return false;
    }

    if (errorInfo.errorCode === 40101) {
        return true;
    }

    const normalizedMessage = (errorInfo.message || '').toLowerCase();
    if (!normalizedMessage) {
        return false;
    }

    return normalizedMessage.includes('token missing/invalid')
        || normalizedMessage.includes('token missing')
        || normalizedMessage.includes('token invalid')
        || normalizedMessage.includes('invalid token');
};

const notifyUnauthorized = async (errorInfo: UnauthorizedErrorInfo): Promise<void> => {
    if (!unauthorizedHandler) {
        return;
    }

    const now = Date.now();
    if (isHandlingUnauthorized || now - lastUnauthorizedHandledAt < 2000) {
        return;
    }

    isHandlingUnauthorized = true;
    lastUnauthorizedHandledAt = now;

    try {
        await unauthorizedHandler(errorInfo);
    } catch (handlerError) {
        console.log('[Unauthorized Handler Error]', handlerError);
    } finally {
        isHandlingUnauthorized = false;
    }
};

// Create axios instance for Auth Service
export const authApiClient: AxiosInstance = axios.create({
    baseURL: API_CONFIG.AUTH_BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: API_CONFIG.HEADERS,
});

// Request interceptor
authApiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Add authorization token if available
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
    },
    (error: AxiosError) => {
        console.log('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// Response interceptor
authApiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log(`[API Response] ${response.status}`, response.data);
        return response;
    },
    async (error: AxiosError) => {
        const statusCode = error.response?.status;
        if (statusCode && statusCode < 500) {
            // Expected client-side API failures (401/403/404/...) should not surface as red runtime errors in app UI.
            console.log('[API Response Error]', statusCode, error.response?.data);
        } else {
            console.log('[API Response Error]', statusCode, error.response?.data);
        }

        // Handle common error cases
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    {
                        const unauthorizedInfo = normalizeUnauthorizedError(error);
                        if (isTokenMissingOrInvalid(unauthorizedInfo)) {
                            await notifyUnauthorized(unauthorizedInfo);
                        }
                    }

                    console.log('Unauthorized - Token might be expired');
                    break;
                case 403:
                    console.log('Forbidden - Access denied');
                    break;
                case 404:
                    console.log('Not Found');
                    break;
                case 500:
                    console.log('Server Error');
                    break;
                default:
                    break;
            }
        } else if (error.request) {
            // Request was made but no response received
            console.log('Network Error - No response received');
        } else {
            // Something happened in setting up the request
            console.log('Request Setup Error');
        }

        return Promise.reject(error);
    }
);

// Generic API response interface
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: string[];
}

// Error handler helper
export const handleApiError = (error: AxiosError): string => {
    if (error.response?.data) {
        const data = error.response.data as any;
        if (data.message) return data.message;
        if (data.errors && Array.isArray(data.errors)) return data.errors[0];
        if (typeof data === 'string') return data;
    }

    if (error.message === 'Network Error') {
        return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }

    if (error.code === 'ECONNABORTED') {
        return 'Yêu cầu quá thời gian. Vui lòng thử lại.';
    }

    return 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
};

export default authApiClient;
