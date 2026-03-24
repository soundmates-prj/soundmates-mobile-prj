import { API_HOST } from '@env';
import authApiClient from './apiClient';
import { API_CONFIG, LIVESTREAM_ENDPOINTS } from './config';

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

  if (!MAIN_API_HOST || !url.includes('host.docker.internal')) {
    return url;
  }

  return url.replace(/host\.docker\.internal/gi, MAIN_API_HOST);
};

const normalizeTrackInfo = (track: TrackInfo): TrackInfo => ({
  ...track,
  artUrl: normalizeNetworkUrl(track.artUrl),
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
    const normalizedData: NowPlayingData = {
      ...rawData,
      listenUrl: normalizeNetworkUrl(rawData.listenUrl),
      publicPlayerUrl: normalizeNetworkUrl(rawData.publicPlayerUrl),
      currentTrack: normalizeTrackInfo(rawData.currentTrack),
      playingNext: normalizeTrackInfo(rawData.playingNext),
      songHistory: rawData.songHistory.map(normalizeTrackInfo),
    };

    if (typeof normalizedData.externalStationId === 'number') {
      cachedExternalStationId = normalizedData.externalStationId;
    }

    if (normalizedData.stationShortcode) {
      cachedStationShortcode = normalizedData.stationShortcode;
    }

    return normalizedData;
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
};

export default livestreamService;
