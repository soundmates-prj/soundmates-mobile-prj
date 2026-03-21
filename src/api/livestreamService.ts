import { API_HOST } from '@env';
import axios from 'axios';
import { API_CONFIG } from './config';

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
  isEnabled?: boolean;
}

export interface SongRequestItem {
  song_id: string;
  title: string;
  artist: string;
  album: string;
  art: string;
}

const api = axios.create({
  baseURL: API_CONFIG.MAIN_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

const FALLBACK_STATION_UUID = 'e1cd49c9-c82f-4eec-8e9b-67b80a5ba0dc';
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

const resolveStationUuid = async (): Promise<string> => {
  if (cachedStationUuid) {
    return cachedStationUuid;
  }

  try {
    const response = await api.get<ApiResponse<StationSummary[]>>('station');
    const stations = response.data.data || [];
    const activeStation = stations.find((station) => station.isEnabled) || stations[0];

    if (activeStation?.id) {
      cachedStationUuid = activeStation.id;
      if (typeof activeStation.externalStationId === 'number') {
        cachedExternalStationId = activeStation.externalStationId;
      }
      return cachedStationUuid;
    }
  } catch {
    // Fallback to known station UUID if station discovery fails.
  }

  cachedStationUuid = FALLBACK_STATION_UUID;
  return cachedStationUuid;
};

const resolveStationId = (): number => cachedExternalStationId || DEFAULT_STATION_ID;

export const livestreamService = {
  async getNowPlaying(): Promise<NowPlayingData> {
    const stationUuid = await resolveStationUuid();
    const response = await api.get<ApiResponse<NowPlayingData>>(
      `station/${stationUuid}/now-playing`,
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
    const fallbackUrl = normalizeNetworkUrl(`http://${API_HOST}:5000/listen/duc_phan/radio.mp3`);
    return normalizeNetworkUrl(listenUrl) || fallbackUrl;
  },
};

export default livestreamService;
