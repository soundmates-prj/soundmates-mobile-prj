/**
 * Podcast Service
 * API calls for podcast functionality (live-session-service via API Gateway)
 */

import { authApiClient } from './apiClient';
import { PODCAST_ENDPOINTS } from './config';

// ─── Response Types ──────────────────────────────────────────────

export interface PodcastResponse {
    id: string;
    title: string;
    description: string | null;
    author: string | null;
    status: string;
    type: string | null;
    banner: string | null;
    createdAt: string;
    updatedAt: string | null;
    createdBy: string;
    episodeCount: number;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    errorCode: string | null;
}

// ─── Service ─────────────────────────────────────────────────────

export const podcastService = {
    /**
     * Get all podcasts, optionally filtered by status and/or creator.
     */
    async getAll(params?: { status?: string; createdBy?: string }): Promise<PodcastResponse[]> {
        const queryParams: Record<string, string> = {};
        if (params?.status) queryParams.status = params.status;
        if (params?.createdBy) queryParams.createdBy = params.createdBy;

        const response = await authApiClient.get<ApiResponse<PodcastResponse[]>>(
            PODCAST_ENDPOINTS.LIST,
            { params: queryParams },
        );

        return response.data.data ?? [];
    },

    /**
     * Get all published podcasts (convenience wrapper).
     */
    async getPublished(): Promise<PodcastResponse[]> {
        return this.getAll({ status: 'Published' });
    },

    /**
     * Get a single podcast by ID.
     */
    async getById(id: string): Promise<PodcastResponse> {
        const response = await authApiClient.get<ApiResponse<PodcastResponse>>(
            PODCAST_ENDPOINTS.DETAIL(id),
        );

        return response.data.data;
    },
};

export default podcastService;
