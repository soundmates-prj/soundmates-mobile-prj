import { ApiResponse, authApiClient } from './apiClient';
import { FAVORITE_ENDPOINTS } from './config';

export interface AddFavoriteRequest {
  itemType: string;
  itemId: string;
  source: string;
  name?: string;
  artistName?: string;
  albumName?: string;
  imgUrl?: string;
  previewUrl?: string;
  rawJson?: string;
}

export interface FavoriteItemResponse {
  id: string;
  itemType: string;
  itemId: string;
  source: string;
  name?: string;
  artistName?: string;
  albumName?: string;
  imgUrl?: string;
  previewUrl?: string;
  rawJson?: string;
}

export interface FavoriteListQuery {
  itemType?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}

const extractFavoriteItems = (payload: unknown): FavoriteItemResponse[] => {
  if (Array.isArray(payload)) {
    return payload as FavoriteItemResponse[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const candidates = [root.items, root.data, root.result];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as FavoriteItemResponse[];
    }

    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.items)) {
        return nested.items as FavoriteItemResponse[];
      }
    }
  }

  return [];
};

export const favoriteService = {
  async addFavorite(payload: AddFavoriteRequest): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await authApiClient.post<ApiResponse<unknown>>(
      FAVORITE_ENDPOINTS.ME_FAVORITES,
      payload,
    );

    return {
      success: response.data.success,
      message: response.data.message || 'Da them vao muc ua thich',
    };
  },

  async getFavorites(query?: FavoriteListQuery): Promise<{
    success: boolean;
    data: FavoriteItemResponse[];
    message?: string;
  }> {
    try {
      const response = await authApiClient.get<ApiResponse<unknown>>(
        FAVORITE_ENDPOINTS.ME_FAVORITES,
        { params: query },
      );

      return {
        success: response.data.success,
        data: extractFavoriteItems(response.data.data),
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Không thể tải danh sách yêu thích',
      };
    }
  },
};

export default favoriteService;
