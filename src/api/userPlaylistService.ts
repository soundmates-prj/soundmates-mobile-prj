import { ApiResponse, authApiClient } from './apiClient';
import { MUSIC_CATALOG_ENDPOINTS, USER_PLAYLIST_ENDPOINTS } from './config';

// Backend enum: Public = 0, Private = 1, Unlisted = 2
export type PlaylistVisibility = 0 | 1 | 2;

export interface UserPlaylistResponse {
  id: string;
  userId: string;
  playlistName: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  visibility: PlaylistVisibility;
  isEnabled: boolean;
  totalTracks: number;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateUserPlaylistRequest {
  playlistName: string;
  description?: string;
  thumbnailUrl?: string;
  visibility?: PlaylistVisibility;
  isEnabled?: boolean;
}

export interface UpdateUserPlaylistRequest {
  playlistName?: string;
  description?: string;
  thumbnailUrl?: string;
  visibility?: PlaylistVisibility;
  isEnabled?: boolean;
}

export interface PlaylistTrackResponse {
  id: string;
  playlistId: string;
  mediaFileId: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  durationSeconds: number;
  addedAt: string;
}

export interface MusicCatalogItemResponse {
  id: string;
  sourceType: string;
  title: string;
  artist: string;
  album?: string | null;
  artworkUrl?: string | null;
  duration: number;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

const extractList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const candidates = [root.items, root.data, root.result];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }

    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.items)) {
        return nested.items as T[];
      }
    }
  }

  return [];
};

const extractPlaylists = (payload: unknown): UserPlaylistResponse[] => extractList<UserPlaylistResponse>(payload);

const extractPlaylist = (payload: unknown): UserPlaylistResponse | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const candidates = [root.data, root.result, payload];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      continue;
    }

    const item = candidate as Record<string, unknown>;
    if (typeof item.id === 'string') {
      return item as unknown as UserPlaylistResponse;
    }
  }

  return null;
};

const extractTracks = (payload: unknown): PlaylistTrackResponse[] => extractList<PlaylistTrackResponse>(payload);

const extractMusicCatalog = (payload: unknown): MusicCatalogItemResponse[] => extractList<MusicCatalogItemResponse>(payload);

export const userPlaylistService = {
  async getMyPlaylists(): Promise<{
    success: boolean;
    data: UserPlaylistResponse[];
    message?: string;
  }> {
    try {
      const response = await authApiClient.get<ApiResponse<unknown>>(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST,
      );

      return {
        success: response.data.success,
        data: extractPlaylists(response.data.data),
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Không thể tải playlist',
      };
    }
  },

  async getPublicPlaylists(): Promise<{
    success: boolean;
    data: UserPlaylistResponse[];
    message?: string;
  }> {
    try {
      const response = await authApiClient.get<ApiResponse<unknown>>(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST_PUBLIC,
      );

      return {
        success: response.data.success,
        data: extractPlaylists(response.data.data),
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Không thể tải playlist công khai',
      };
    }
  },

  async getPlaylistsByUserId(userId: string, isPublicOnly: boolean = false): Promise<UserPlaylistResponse[]> {
    try {
      const response = await authApiClient.get<ApiResponse<unknown>>(
        `/userplaylist/user/${userId}`
      );
      
      let playlists = extractPlaylists(response.data.data);
      if (isPublicOnly) {
        // visibility 0 = Public
        playlists = playlists.filter(p => p.visibility === 0);
      }
      return playlists;
    } catch (error: any) {
      console.log('[userPlaylistService] getPlaylistsByUserId error:', error);
      return [];
    }
  },

  async createUserPlaylist(payload: CreateUserPlaylistRequest): Promise<{
    success: boolean;
    data?: UserPlaylistResponse;
    message?: string;
  }> {
    try {
      const response = await authApiClient.post<ApiResponse<unknown>>(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST,
        payload,
      );

      return {
        success: response.data.success,
        data: extractPlaylist(response.data.data) || undefined,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể tạo playlist',
      };
    }
  },

  async updateUserPlaylist(
    playlistId: string,
    payload: UpdateUserPlaylistRequest,
  ): Promise<{
    success: boolean;
    data?: UserPlaylistResponse;
    message?: string;
  }> {
    try {
      const response = await authApiClient.put<ApiResponse<unknown>>(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST_DETAIL(playlistId),
        payload,
      );

      return {
        success: response.data.success,
        data: extractPlaylist(response.data.data) || undefined,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể cập nhật playlist',
      };
    }
  },

  async getPlaylistById(playlistId: string): Promise<{
    success: boolean;
    data?: UserPlaylistResponse;
    message?: string;
  }> {
    try {
      const response = await authApiClient.get<ApiResponse<unknown>>(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST_DETAIL(playlistId),
      );

      return {
        success: response.data.success,
        data: extractPlaylist(response.data.data) || undefined,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể tải chi tiết playlist',
      };
    }
  },

  async getPlaylistTracks(playlistId: string): Promise<{
    success: boolean;
    data: PlaylistTrackResponse[];
    message?: string;
  }> {
    try {
      const response = await authApiClient.get<ApiResponse<unknown>>(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST_TRACKS(playlistId),
      );

      return {
        success: response.data.success,
        data: extractTracks(response.data.data),
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Không thể tải danh sách bài hát trong playlist',
      };
    }
  },

  async addTracksToPlaylist(playlistId: string, mediaIds: string[]): Promise<{
    success: boolean;
    data: PlaylistTrackResponse[];
    message?: string;
  }> {
    try {
      const response = await authApiClient.post<ApiResponse<unknown>>(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST_TRACKS(playlistId),
        { mediaIds },
      );

      return {
        success: response.data.success,
        data: extractTracks(response.data.data),
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Không thể thêm bài hát vào playlist',
      };
    }
  },

  async removeTracksFromPlaylist(playlistId: string, mediaIds: string[]): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      await authApiClient.delete(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST_TRACKS(playlistId),
        {
          data: { mediaIds },
        },
      );

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể xóa bài hát khỏi playlist',
      };
    }
  },

  async getMusicCatalog(): Promise<{
    success: boolean;
    data: MusicCatalogItemResponse[];
    message?: string;
  }> {
    try {
      const response = await authApiClient.get<ApiResponse<unknown>>(
        MUSIC_CATALOG_ENDPOINTS.LIST,
      );

      return {
        success: response.data.success,
        data: extractMusicCatalog(response.data.data),
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Không thể tải kho nhạc',
      };
    }
  },

  async deleteUserPlaylist(playlistId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      await authApiClient.delete(
        USER_PLAYLIST_ENDPOINTS.USER_PLAYLIST_DETAIL(playlistId),
      );

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể xóa playlist',
      };
    }
  },
};

export default userPlaylistService;
