import api, { ApiResponse } from './apiClient';
import { API_CONFIG } from './config';

// Reusing apiClient but with MAIN_BASE_URL if needed, however authApiClient hits the same gateway.
const notificationClient = api;

export interface NotificationItem {
    id: string;
    type: string;
    referenceId: string | null;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationPage {
    items: NotificationItem[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export const notificationService = {
    /** Lấy tất cả notifications (có phân trang) */
    async getNotifications(page = 1, pageSize = 20): Promise<NotificationPage> {
        const res = await notificationClient.get<ApiResponse<NotificationPage>>(`/me/notifications`, {
            params: { page, pageSize },
            baseURL: API_CONFIG.MAIN_BASE_URL,
        });
        return res.data.data as NotificationPage;
    },

    /** Lấy notifications chưa đọc */
    async getUnreadNotifications(page = 1, pageSize = 20): Promise<NotificationPage> {
        const res = await notificationClient.get<ApiResponse<NotificationPage>>(`/me/notifications/not-read`, {
            params: { page, pageSize },
            baseURL: API_CONFIG.MAIN_BASE_URL,
        });
        return res.data.data as NotificationPage;
    },

    /** Đánh dấu một notification là đã đọc */
    async markAsRead(notificationId: string): Promise<void> {
        await notificationClient.put(`/notifications/${notificationId}/read`, undefined, {
            baseURL: API_CONFIG.MAIN_BASE_URL,
        });
    },

    /** Đánh dấu tất cả notifications là đã đọc */
    async markAllAsRead(): Promise<void> {
        await notificationClient.put(`/notifications/read-all`, undefined, {
            baseURL: API_CONFIG.MAIN_BASE_URL,
        });
    },
};
