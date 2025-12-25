/**
 * API Client
 * Axios instance configuration with interceptors
 */

import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';

// Create axios instance for Auth Service
export const authApiClient: AxiosInstance = axios.create({
    baseURL: API_CONFIG.AUTH_BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: API_CONFIG.HEADERS,
});

// Request interceptor
authApiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Add authorization token if available
        // const token = await AsyncStorage.getItem('accessToken');
        // if (token) {
        //     config.headers.Authorization = `Bearer ${token}`;
        // }

        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
    },
    (error: AxiosError) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// Response interceptor
authApiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log(`[API Response] ${response.status}`, response.data);
        return response;
    },
    (error: AxiosError) => {
        console.error('[API Response Error]', error.response?.status, error.response?.data);

        // Handle common error cases
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    // Handle unauthorized - redirect to login
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
