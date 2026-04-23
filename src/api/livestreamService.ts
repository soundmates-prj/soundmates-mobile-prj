import { API_HOST } from '@env';
import authApiClient from './apiClient';
import { API_CONFIG, LIVESTREAM_ENDPOINTS, MUSIC_CATALOG_ENDPOINTS } from './config';

export interface TrackInfo {
  shId: number;
  text: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  artUrl: string;
  lyrics: string | null;
  playedAt: number;
  duration: number;
  elapsed: number;
  remaining: number;
  isRequest: boolean;
}

export interface NowPlayingData {
  externalStationId: number;
  stationName: string;
  stationShortcode: string;
  listenUrl: string;
  publicPlayerUrl: string;
  isOnline: boolean;
  isLive: boolean;
  streamerName: string | null;
  totalListeners: number;
  uniqueListeners: number;
  currentTrack: TrackInfo;
  playingNext: TrackInfo;
  songHistory: TrackInfo[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

interface StationSummary {
  id: string;
  externalStationId?: number;
  stationShortcode?: string;
  streamUrl?: string;
  isEnabled?: boolean;
}

export interface SongRequestItem {
  song_id: string;
  title: string;
  artist: string;
  album: string;
  art: string;
}

export interface MusicCatalogItem {
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

export interface SongRequestResult {
  id: string;
  liveSessionId: string;
  mediaFileId: string;
  requestedByUserId: string;
  status: string;
  reviewedByUserId?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
  message?: string | null;
  rejectReason?: string | null;
  songTitle: string;
  songArtist?: string | null;
  songAlbum?: string | null;
}

interface ApiGatewayResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface LiveSessionResult {
  id: string;
  userId: string;
  stationId: string;
  stationName: string | null;
  sessionName: string;
  description: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  totalListeners: number;
  peakListeners: number;
  totalDuration: number;
  createdAt: string;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  genre: string | null;
  listenersCount: number;
}

export interface LiveScheduleStation {
  id: string;
  externalStationId?: number;
  stationName?: string | null;
  stationShortcode?: string;
  description?: string | null;
  streamUrl?: string;
  publicPlayerUrl?: string;
}

export interface LiveScheduleSession {
  id: string;
  sessionName?: string;
  description?: string | null;
  status?: string;
  hostUserId?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  genre?: string | null;
  thumbnailUrl?: string | null;
  station?: LiveScheduleStation | null;
}

export interface LiveSessionQueueResult {
  sessionId: string;
  externalStationId: number;
  queue: TrackInfo[];
}

export interface LiveScheduleResult {
  id: string;
  liveSessionId: string;
  startTime: string;
  endTime: string;
  title?: string;
  status?: string;
  isRecurring: boolean;
  daysOfWeek?: number;
  startDate: string;
  endDate?: string | null;
  createdBy?: string;
  updatedBy?: string | null;
  createdAt?: string;
  liveSession?: LiveScheduleSession | null;
}

const api = authApiClient;

const FALLBACK_STATION_UUID = 'e1cd49c9-c82f-4eec-8e9b-67b80a5ba0dc';
const DEFAULT_STATION_SHORTCODE = 'duc_phan';
const DEFAULT_STATION_ID = 1;

const normalizeAzuraCastBase = (rawBase: string): string => {
  const trimmed = (rawBase || '').trim().replace(/\/+$/, '');
  if (!trimmed) return `http://${API_HOST}:5000/api`;
  if (/\/apis$/i.test(trimmed)) {
    return trimmed.replace(/\/apis$/i, '/api');
  }
  if (/\/api$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/api`;
};

const AZURACAST_BASE = normalizeAzuraCastBase(API_CONFIG.AZURACAST_BASE);
const MAIN_API_HOST = (() => {
  try {
    return new URL(API_CONFIG.MAIN_BASE_URL).hostname;
  } catch {
    return '';
  }
})();

let cachedStationUuid: string | null = null;
let cachedExternalStationId: number | null = null;
let cachedStationShortcode: string | null = null;
let stationBootstrapPromise: Promise<void> | null = null;

const normalizeNetworkUrl = (url?: string): string => {
  if (!url) return '';

  let result = url;

  // Replace Docker-internal hostname with actual LAN host
  if (MAIN_API_HOST) {
    result = result.replace(/host\.docker\.internal/gi, MAIN_API_HOST);
    // Also replace bare localhost with LAN host (unreachable from physical device)
    result = result.replace(/\blocalhost\b/gi, MAIN_API_HOST);
  } else if (API_HOST) {
    result = result.replace(/host\.docker\.internal/gi, API_HOST);
    result = result.replace(/\blocalhost\b/gi, API_HOST);
  }

  return result;
};

const normalizeTrackInfo = (track: TrackInfo): TrackInfo => ({
  ...track,
  artUrl: normalizeNetworkUrl(track.artUrl),
});

const normalizeNowPlayingData = (rawData: NowPlayingData): NowPlayingData => ({
  ...rawData,
  listenUrl: normalizeNetworkUrl(rawData.listenUrl),
  publicPlayerUrl: normalizeNetworkUrl(rawData.publicPlayerUrl),
  currentTrack: normalizeTrackInfo(rawData.currentTrack),
  playingNext: normalizeTrackInfo(rawData.playingNext),
  songHistory: rawData.songHistory.map(normalizeTrackInfo),
});

const extractShortcodeFromStreamUrl = (streamUrl?: string): string | null => {
  if (!streamUrl) return null;
  const match = streamUrl.match(/\/listen\/([^/]+)\/radio\./i);
  return match?.[1] || null;
};

const applyStationSummary = (station: StationSummary): void => {
  cachedStationUuid = station.id;

  if (typeof station.externalStationId === 'number') {
    cachedExternalStationId = station.externalStationId;
  }

  const shortcode = station.stationShortcode || extractShortcodeFromStreamUrl(station.streamUrl);
  if (shortcode) {
    cachedStationShortcode = shortcode;
  }
};

const bootstrapStationContext = async (): Promise<void> => {
  if (cachedStationUuid && cachedStationShortcode) {
    return;
  }

  if (stationBootstrapPromise) {
    return stationBootstrapPromise;
  }

  stationBootstrapPromise = (async () => {
    try {
      const response = await api.get<ApiResponse<StationSummary[]>>('station');
      const stations = response.data.data || [];
      const activeStation = stations.find((station) => station.isEnabled) || stations[0];

      if (activeStation?.id) {
        applyStationSummary(activeStation);
        return;
      }
    } catch {
      // Keep legacy fallback values if station discovery fails.
    }

    if (!cachedStationUuid) {
      cachedStationUuid = FALLBACK_STATION_UUID;
    }

    if (!cachedStationShortcode) {
      cachedStationShortcode = DEFAULT_STATION_SHORTCODE;
    }
  })();

  try {
    await stationBootstrapPromise;
  } finally {
    stationBootstrapPromise = null;
  }
};

const resolveStationUuid = async (): Promise<string> => {
  await bootstrapStationContext();
  if (!cachedStationUuid) {
    cachedStationUuid = FALLBACK_STATION_UUID;
  }
  return cachedStationUuid;
};

const resolveStationId = (): number => cachedExternalStationId || DEFAULT_STATION_ID;
const resolveStationShortcode = (): string => cachedStationShortcode || DEFAULT_STATION_SHORTCODE;

export const livestreamService = {
  async initializeStationContext(): Promise<void> {
    await bootstrapStationContext();
  },

  async getLiveSessions(params?: {
    userId?: string;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PagedResult<LiveSessionResult>> {
    const response = await api.get<ApiGatewayResponse<PagedResult<LiveSessionResult>>>(
      LIVESTREAM_ENDPOINTS.LIVE_SESSIONS,
      { params },
    );
    return response.data.data;
  },

  async getActiveSessions(): Promise<LiveSessionResult[]> {
    const response = await api.get<ApiGatewayResponse<LiveSessionResult[]>>(
      LIVESTREAM_ENDPOINTS.ACTIVE_SESSIONS,
    );
    return response.data.data || [];
  },

  async getSchedules(): Promise<LiveScheduleResult[]> {
    const response = await api.get<ApiGatewayResponse<LiveScheduleResult[]>>(
      LIVESTREAM_ENDPOINTS.SCHEDULES,
    );
    return response.data.data || [];
  },

  async searchSchedules(params: { q: string; page?: number; pageSize?: number }): Promise<LiveScheduleResult[]> {
    try {
      const response = await api.get<ApiGatewayResponse<any>>(
        LIVESTREAM_ENDPOINTS.SCHEDULE_SEARCH,
        {
          params: {
            q: params.q,
            page: params.page || 1,
            pageSize: params.pageSize || 10
          }
        }
      );
      // Spring Data page response
      return response.data.data?.content || [];
    } catch (error) {
      console.log('[LivestreamService] searchSchedules error:', error);
      return [];
    }
  },

  async getLiveSession(sessionId: string): Promise<LiveSessionResult> {
    const response = await api.get<ApiGatewayResponse<LiveSessionResult>>(
      LIVESTREAM_ENDPOINTS.LIVE_SESSION_DETAIL(sessionId),
    );
    return response.data.data;
  },

  async getNowPlaying(stationUuid?: string): Promise<NowPlayingData> {
    const resolvedStationUuid = stationUuid || await resolveStationUuid();
    const response = await api.get<ApiGatewayResponse<NowPlayingData>>(
      `station/${resolvedStationUuid}/now-playing`,
    );

    const rawData = response.data.data;
    const normalizedData = normalizeNowPlayingData(rawData);

    if (typeof normalizedData.externalStationId === 'number') {
      cachedExternalStationId = normalizedData.externalStationId;
    }

    if (normalizedData.stationShortcode) {
      cachedStationShortcode = normalizedData.stationShortcode;
    }

    return normalizedData;
  },

  async getNowPlayingBySession(sessionId: string): Promise<NowPlayingData> {
    const response = await api.get<ApiGatewayResponse<NowPlayingData>>(
      LIVESTREAM_ENDPOINTS.NOW_PLAYING_BY_SESSION(sessionId),
    );

    const rawData = response.data.data;
    const normalizedData = normalizeNowPlayingData(rawData);

    if (typeof normalizedData.externalStationId === 'number') {
      cachedExternalStationId = normalizedData.externalStationId;
    }

    if (normalizedData.stationShortcode) {
      cachedStationShortcode = normalizedData.stationShortcode;
    }

    return normalizedData;
  },

  async getQueueBySession(sessionId: string): Promise<LiveSessionQueueResult> {
    const response = await api.get<ApiGatewayResponse<LiveSessionQueueResult>>(
      LIVESTREAM_ENDPOINTS.QUEUE_BY_SESSION(sessionId)
    );
    // You could normalize the tracks if needed
    const rawData = response.data.data;
    return {
      ...rawData,
      queue: (rawData.queue || []).map(normalizeTrackInfo)
    };
  },

  async getStationMusicCatalog(stationId: string): Promise<MusicCatalogItem[]> {
    if (!stationId?.trim()) {
      return [];
    }

    const response = await api.get<ApiGatewayResponse<MusicCatalogItem[]>>(
      MUSIC_CATALOG_ENDPOINTS.STATION(stationId),
    );

    return response.data.data || [];
  },

  async createSongRequest(
    sessionId: string,
    payload: { mediaFileId: string; message?: string },
  ): Promise<SongRequestResult> {
    const response = await api.post<ApiGatewayResponse<SongRequestResult>>(
      LIVESTREAM_ENDPOINTS.SONG_REQUESTS_BY_SESSION(sessionId),
      payload,
    );
    return response.data.data;
  },

  async getMySongRequestLimits(): Promise<{ limit: number; usedToday: number; remaining: number }> {
    const response = await api.get<ApiGatewayResponse<{ limit: number; usedToday: number; remaining: number }>>(
      LIVESTREAM_ENDPOINTS.MY_SONG_REQUEST_LIMITS
    );
    return response.data.data;
  },

  async getRequestableSongs(): Promise<SongRequestItem[]> {
    const stationId = resolveStationId();

    try {
      const response = await fetch(
        `${AZURACAST_BASE}/station/${stationId}/requests`,
      );
      const data = await response.json();
      return data || [];
    } catch {
      return [];
    }
  },

  async requestSong(requestId: string): Promise<boolean> {
    const stationId = resolveStationId();

    try {
      const response = await fetch(
        `${AZURACAST_BASE}/station/${stationId}/request/${encodeURIComponent(requestId)}`,
        {
          method: 'POST',
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  getListenUrl(listenUrl?: string): string {
    const fallbackUrl = normalizeNetworkUrl(
      `http://${API_HOST}:5000/listen/${resolveStationShortcode()}/radio.mp3`,
    );
    return normalizeNetworkUrl(listenUrl) || fallbackUrl;
  },

  // Live session stream URLs can contain host.docker.internal in dev environments.
  normalizeStreamUrl(streamUrl?: string): string {
    return normalizeNetworkUrl(streamUrl);
  },

  // ── Host APIs ─────────────────────────────────────────────────

  async createLiveSession(data: {
    sessionName: string;
    description?: string;
    genre?: string;
    thumbnailUrl?: string;
  }): Promise<LiveSessionResult> {
    const response = await api.post<ApiGatewayResponse<LiveSessionResult>>(
      LIVESTREAM_ENDPOINTS.CREATE_LIVE_SESSION,
      data,
    );
    return response.data.data;
  },

  async startLiveSession(sessionId: string): Promise<LiveSessionResult> {
    const response = await api.post<ApiGatewayResponse<LiveSessionResult>>(
      LIVESTREAM_ENDPOINTS.START_LIVE_SESSION(sessionId),
    );
    return response.data.data;
  },

  async stopLiveSession(sessionId: string): Promise<LiveSessionResult> {
    const response = await api.post<ApiGatewayResponse<LiveSessionResult>>(
      LIVESTREAM_ENDPOINTS.STOP_LIVE_SESSION(sessionId),
    );
    return response.data.data;
  },

  async updateLiveSession(
    sessionId: string,
    data: Partial<{
      sessionName: string;
      description: string;
      genre: string;
      thumbnailUrl: string;
    }>,
  ): Promise<LiveSessionResult> {
    const response = await api.put<ApiGatewayResponse<LiveSessionResult>>(
      LIVESTREAM_ENDPOINTS.UPDATE_LIVE_SESSION(sessionId),
      data,
    );
    return response.data.data;
  },

  async getMyHostedSessions(params?: {
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PagedResult<LiveSessionResult>> {
    const response = await api.get<ApiGatewayResponse<PagedResult<LiveSessionResult>>>(
      LIVESTREAM_ENDPOINTS.MY_HOSTED_SESSIONS,
      { params },
    );
    return response.data.data;
  },
};

export default livestreamService;
