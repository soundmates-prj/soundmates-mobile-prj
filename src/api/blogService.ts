/**
 * Blog Service
 * API calls for blog posts, comments, and reactions
 */

import { ApiResponse, authApiClient } from './apiClient';
import { BLOG_ENDPOINTS } from './config';

// =====================================================
// TYPES
// =====================================================

export interface BlogPostResponse {
    id: string;
    userId: string;
    userFullName?: string;
    userAvatarUrl?: string;
    title: string;
    contentText: string;
    audioUrl?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    privacyScope?: string | null;
    moodTag?: string | null;
    postType?: string | null;
    shareMusic?: SharedMusicResponse | null;
    status: string; // 'Draft' | 'Published' | 'Archived'
    isGenerated: boolean;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
}

export interface TrendingPostResponse {
    id: string;
    userId: string;
    userFullName?: string;
    userAvatarUrl?: string;
    title: string;
    contentText: string;
    audioUrl?: string | null;
    imgUrl?: string | null;
    privacyScope?: string | null;
    moodTag?: string | null;
    postType?: string | null;
    shareMusic?: SharedMusicResponse | null;
    status: string;
    isGenerated: boolean;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
    reactionCount: number;
    commentCount: number;
}

export interface PopularPostResponse {
    id: string;
    userId: string;
    userFullName?: string;
    userAvatarUrl?: string;
    title: string;
    contentText: string;
    audioUrl?: string | null;
    imgUrl?: string | null;
    privacyScope?: string | null;
    moodTag?: string | null;
    postType?: string | null;
    shareMusic?: SharedMusicResponse | null;
    status: string;
    isGenerated: boolean;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
    reactionCount: number;
    commentCount: number;
}

export interface PostStatsResponse {
    postId: string;
    reactionCount: number;
    commentCount: number;
    viewCount: number;
    publishedAt?: string | null;
}

export interface SharedMusicResponse {
    trackId: string;
    title: string;
    artist: string;
    albumImage?: string | null;
    previewUrl?: string | null;
    template?: string | null;
}

export interface CommentResponse {
    id: string;
    postId: string;
    parentCommentId: string;
    userId: string;
    userFullName: string;
    userAvatarUrl?: string;
    content: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    replies: CommentResponse[];
}

export interface ReactionResponse {
    id: string;
    postId: string;
    userId: string;
    reactionType: string;
    createdAt: string;
}

export interface PaginationResponse<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export interface CreatePostRequest {
    title: string;
    contentText: string;
    audioUrl?: string;
    imageUrl?: string;
    privacyScope?: string;
    moodTag?: string;
}

export interface UpdatePostRequest {
    title?: string;
    contentText?: string;
    audioUrl?: string;
    imageUrl?: string;
    privacyScope?: string;
    moodTag?: string;
}

export interface ShareMusicPostRequest {
    trackId: string;
    title: string;
    artist: string;
    albumImage: string;
    previewUrl: string;
    template: string;
}

export interface PaginationParams {
    page?: number;
    pageSize?: number;
    status?: string;
    moodTag?: string;
    authorName?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
}

// =====================================================
// SERVICE
// =====================================================

export const blogService = {
    // ─────────────────────────────────────
    // POSTS
    // ─────────────────────────────────────

    /**
     * Get all published blog posts (paginated + filterable)
     */
    async getPublishedPosts(params?: PaginationParams): Promise<{
        success: boolean;
        data?: PaginationResponse<BlogPostResponse>;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<PaginationResponse<BlogPostResponse>>>(
                BLOG_ENDPOINTS.POSTS_PUBLISHED,
                { params }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getPublishedPosts error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải bài viết',
            };
        }
    },

    /**
     * Get trending blog posts
     */
    async getTrendingPosts(params?: PaginationParams): Promise<{
        success: boolean;
        data?: PaginationResponse<TrendingPostResponse>;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<PaginationResponse<TrendingPostResponse>>>(
                BLOG_ENDPOINTS.POSTS_TRENDING,
                { params }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getTrendingPosts error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải bài viết thịnh hành',
            };
        }
    },

    /**
     * Get popular blog posts
     */
    async getPopularPosts(params?: PaginationParams): Promise<{
        success: boolean;
        data?: PaginationResponse<PopularPostResponse>;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<PaginationResponse<PopularPostResponse>>>(
                BLOG_ENDPOINTS.POSTS_POPULAR,
                { params }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getPopularPosts error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải bài viết phổ biến',
            };
        }
    },

    /**
     * Get a published post by ID
     */
    async getPublishedPostById(postId: string): Promise<{
        success: boolean;
        data?: BlogPostResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<BlogPostResponse>>(
                `${BLOG_ENDPOINTS.POSTS_PUBLISHED}/${postId}`
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getPublishedPostById error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không tìm thấy bài viết',
            };
        }
    },

    /**
     * Get post by ID (any status)
     */
    async getPostById(postId: string): Promise<{
        success: boolean;
        data?: BlogPostResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<BlogPostResponse>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}`
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getPostById error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không tìm thấy bài viết',
            };
        }
    },

    /**
     * Get stats for a specific post
     */
    async getPostStats(postId: string): Promise<{
        success: boolean;
        data?: PostStatsResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<PostStatsResponse>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}/stats`
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getPostStats error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải thống kê',
            };
        }
    },

    /**
     * Get current user's posts
     */
    async getMyPosts(params?: { page?: number; pageSize?: number }): Promise<{
        success: boolean;
        data?: PaginationResponse<BlogPostResponse>;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<PaginationResponse<BlogPostResponse>>>(
                BLOG_ENDPOINTS.MY_POSTS,
                { params }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getMyPosts error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải bài viết của bạn',
            };
        }
    },

    /**
     * Create a new blog post
     */
    async createPost(request: CreatePostRequest): Promise<{
        success: boolean;
        data?: BlogPostResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.post<ApiResponse<BlogPostResponse>>(
                BLOG_ENDPOINTS.POSTS,
                request
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] createPost error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tạo bài viết',
            };
        }
    },

    /**
     * Share a music track as a post
     */
    async shareMusicPost(request: ShareMusicPostRequest): Promise<{
        success: boolean;
        data?: BlogPostResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.post<ApiResponse<BlogPostResponse>>(
                BLOG_ENDPOINTS.POSTS_SHARE_MUSIC,
                request,
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] shareMusicPost error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể chia sẻ bài nhạc',
            };
        }
    },

    /**
     * Update a blog post
     */
    async updatePost(postId: string, request: UpdatePostRequest): Promise<{
        success: boolean;
        data?: BlogPostResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.put<ApiResponse<BlogPostResponse>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}`,
                request
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] updatePost error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể cập nhật bài viết',
            };
        }
    },

    /**
     * Delete a blog post
     */
    async deletePost(postId: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await authApiClient.delete<ApiResponse<boolean>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}`
            );
            return {
                success: response.data.success,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] deletePost error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể xóa bài viết',
            };
        }
    },

    /**
     * Publish a blog post
     */
    async publishPost(postId: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await authApiClient.patch<ApiResponse<boolean>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}/publish`
            );
            return {
                success: response.data.success,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] publishPost error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể publish bài viết',
            };
        }
    },

    /**
     * Move a post to Draft status
     */
    async savePostAsDraft(postId: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await authApiClient.post<ApiResponse<boolean>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}/draft`
            );
            return {
                success: response.data.success,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] savePostAsDraft error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể lưu bài viết về nháp',
            };
        }
    },

    // ─────────────────────────────────────
    // COMMENTS
    // ─────────────────────────────────────

    /**
     * Get comments of a post
     */
    async getPostComments(postId: string, params?: { page?: number; pageSize?: number }): Promise<{
        success: boolean;
        data?: PaginationResponse<CommentResponse>;
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<PaginationResponse<CommentResponse>>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}/comments`,
                { params }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getPostComments error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải bình luận',
            };
        }
    },

    /**
     * Create a comment on a post
     */
    async createComment(postId: string, content: string): Promise<{
        success: boolean;
        data?: CommentResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.post<ApiResponse<CommentResponse>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}/comments`,
                { content }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] createComment error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể gửi bình luận',
            };
        }
    },

    /**
     * Reply to a comment
     */
    async replyComment(commentId: string, content: string): Promise<{
        success: boolean;
        data?: CommentResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.post<ApiResponse<CommentResponse>>(
                `${BLOG_ENDPOINTS.COMMENTS}/${commentId}/reply`,
                { content }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] replyComment error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể phản hồi bình luận',
            };
        }
    },

    /**
     * Update a comment
     */
    async updateComment(commentId: string, content: string): Promise<{
        success: boolean;
        data?: CommentResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.put<ApiResponse<CommentResponse>>(
                `${BLOG_ENDPOINTS.COMMENTS}/${commentId}`,
                { content }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] updateComment error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể cập nhật bình luận',
            };
        }
    },

    /**
     * Delete a comment
     */
    async deleteComment(commentId: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await authApiClient.delete<ApiResponse<boolean>>(
                `${BLOG_ENDPOINTS.COMMENTS}/${commentId}`
            );
            return {
                success: response.data.success,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] deleteComment error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể xóa bình luận',
            };
        }
    },

    // ─────────────────────────────────────
    // REACTIONS
    // ─────────────────────────────────────

    /**
     * Add reaction to a post
     */
    async addReaction(postId: string, reactionType: string = 'like'): Promise<{
        success: boolean;
        data?: ReactionResponse;
        message?: string;
    }> {
        try {
            const response = await authApiClient.post<ApiResponse<ReactionResponse>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}/reactions`,
                { reactionType }
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] addReaction error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể thêm phản ứng',
            };
        }
    },

    /**
     * Remove reaction from a post
     */
    async removeReaction(postId: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await authApiClient.delete<ApiResponse<boolean>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}/reactions`
            );
            return {
                success: response.data.success,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] removeReaction error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể bỏ phản ứng',
            };
        }
    },

    /**
     * Get reactions of a post (list of users who reacted)
     */
    async getPostReactions(postId: string): Promise<{
        success: boolean;
        data?: ReactionResponse[];
        message?: string;
    }> {
        try {
            const response = await authApiClient.get<ApiResponse<ReactionResponse[]>>(
                `${BLOG_ENDPOINTS.POSTS}/${postId}/reactions/users`
            );
            return {
                success: response.data.success,
                data: response.data.data,
                message: response.data.message,
            };
        } catch (error: any) {
            console.log('[BlogService] getPostReactions error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể tải phản ứng',
            };
        }
    },

    /**
     * Report a post for moderation
     */
    async reportPost(postId: string, reason: string, description?: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await authApiClient.post<ApiResponse<any>>(
                `${BLOG_ENDPOINTS.REPORTS}`,
                { 
                    targetType: 'Post', 
                    targetId: postId, 
                    reason, 
                    description 
                }
            );
            return {
                success: response.data.success,
                message: response.data.message || 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét nội dung này.',
            };
        } catch (error: any) {
            console.log('[BlogService] reportPost error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Không thể gửi báo cáo lúc này',
            };
        }
    },
};

export default blogService;
