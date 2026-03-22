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
};

export default favoriteService;
