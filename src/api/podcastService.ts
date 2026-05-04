/**
 * Podcast Service
 * API calls for podcast functionality (live-session-service via API Gateway)
 */

import { authApiClient } from './apiClient';
import { PODCAST_ENDPOINTS } from './config';

// ─── Response Types ──────────────────────────────────────────────

export interface PodcastEpisode {
    id: string;
    podcastId: string;
    title: string;
    description?: string;
    audioUrl?: string;
    thumbnailUrl?: string;
    episodeNumber?: number;
    duration?: number;
    publishDate?: string;
    createdAt?: string;
}

export interface PodcastAuthor {
    name: string;
    avatar: string;
    email: string;
    plan: string;
    userId: string;
}

export interface PodcastResponse {
    id: string;
    title: string;
    description: string | null;
    author: string | PodcastAuthor | null;
    status: string;
    type: string | null;
    banner: string | null;
    createdAt: string;
    updatedAt: string | null;
    createdBy: string;
    episodeCount: number;
    allEpisodes?: PodcastEpisode[];
    price?: number;
    isPaid?: boolean;
    isPurchased?: boolean;
}

export interface CreatePodcastRequestPayload {
    title: string;
    episodeTitle?: string;
    type?: string;
    description: string;
    bannerUrl: string;
    price: number;
    isPaid: boolean;
    targetPodcastId?: string;
}

export interface CreatePodcastEpisodeRequestPayload {
    podcastId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    audioUrl: string;
    duration: number;
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

    /**
     * Get saved podcasts for current user
     */
    async getSavedPodcasts(): Promise<PodcastResponse[]> {
        try {
            const response = await authApiClient.get<ApiResponse<PodcastResponse[]>>(
                PODCAST_ENDPOINTS.SAVED_PODCASTS
            );
            return response.data.data ?? [];
        } catch {
            return [];
        }
    },

    /**
     * Save (follow) a podcast
     */
    async savePodcast(id: string): Promise<boolean> {
        await authApiClient.post(PODCAST_ENDPOINTS.TOGGLE_SAVE(id));
        return true;
    },

    /**
     * Unsave (unfollow) a podcast
     */
    async unsavePodcast(id: string): Promise<boolean> {
        await authApiClient.delete(PODCAST_ENDPOINTS.TOGGLE_SAVE(id));
        return true;
    },

    /**
     * Get user's created podcasts
     */
    async getMyPodcasts(): Promise<PodcastResponse[]> {
        try {
            const response = await authApiClient.get<ApiResponse<PodcastResponse[]>>(
                PODCAST_ENDPOINTS.MY_PODCASTS
            );
            return response.data.data ?? [];
        } catch {
            return [];
        }
    },

    /**
     * Submit a request to create or update a podcast
     */
    async createPodcastRequest(payload: CreatePodcastRequestPayload): Promise<boolean> {
        try {
            const response = await authApiClient.post<ApiResponse<any>>(
                PODCAST_ENDPOINTS.PODCAST_REQUESTS,
                payload
            );
            return response.data.success;
        } catch (error: any) {
            console.error('[PodcastService] createPodcastRequest error:', error);
            throw new Error(error.response?.data?.message || 'Không thể tạo yêu cầu Podcast');
        }
    },

    /**
     * Submit a request to add an episode
     */
    async createPodcastEpisodeRequest(payload: CreatePodcastEpisodeRequestPayload): Promise<boolean> {
        try {
            const response = await authApiClient.post<ApiResponse<any>>(
                PODCAST_ENDPOINTS.EPISODE_REQUESTS,
                payload
            );
            return response.data.success;
        } catch (error: any) {
            console.error('[PodcastService] createPodcastEpisodeRequest error:', error);
            throw new Error(error.response?.data?.message || 'Không thể thêm tập mới');
        }
    },
};

export default podcastService;
