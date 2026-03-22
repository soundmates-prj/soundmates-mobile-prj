/**
 * Spotify Service
 * API calls for Spotify proxy endpoints (via auth-query-service through API Gateway)
 */

import { ApiResponse, authApiClient } from './apiClient';
import { SPOTIFY_ENDPOINTS } from './config';

export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyExternalUrls {
  spotify?: string;
}

export interface SpotifySimpleArtist {
  id: string;
  name: string;
}

export interface SpotifySimpleAlbum {
  id: string;
  name: string;
  images?: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists?: SpotifySimpleArtist[];
  album?: SpotifySimpleAlbum;
  external_urls?: SpotifyExternalUrls;
  preview_url?: string | null;
  duration_ms?: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  external_urls?: SpotifyExternalUrls;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images?: SpotifyImage[];
  artists?: SpotifySimpleArtist[];
  release_date?: string;
  external_urls?: SpotifyExternalUrls;
}

export interface SpotifyPaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next?: string | null;
  previous?: string | null;
}

export interface SpotifySearchResult {
  tracks?: SpotifyPaginatedResult<SpotifyTrack>;
  artists?: SpotifyPaginatedResult<SpotifyArtist>;
  albums?: SpotifyPaginatedResult<SpotifyAlbum>;
}

export interface SpotifySearchParams {
  q: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export const spotifyService = {
  async search(params: SpotifySearchParams): Promise<{
    success: boolean;
    data?: SpotifySearchResult;
    message?: string;
  }> {
    try {
      const response = await authApiClient.get<ApiResponse<SpotifySearchResult>>(
        SPOTIFY_ENDPOINTS.SEARCH,
        {
          params: {
            q: params.q,
            type: params.type || 'track,artist,album',
            limit: params.limit ?? 10,
            offset: params.offset ?? 0,
          },
        },
      );

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error: any) {
      console.log('[SpotifyService] search error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Khong the tim kiem Spotify',
      };
    }
  },
};

export default spotifyService;
