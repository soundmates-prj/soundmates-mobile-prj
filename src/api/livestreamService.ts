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

const STATION_UUID = '143a299c-9d19-47ac-9988-828528004771';
const AZURACAST_BASE = API_CONFIG.AZURACAST_BASE;
const STATION_ID = 1;

export const livestreamService = {
  async getNowPlaying(): Promise<NowPlayingData> {
    const response = await api.get<ApiResponse<NowPlayingData>>(
      `station/${STATION_UUID}/now-playing`,
    );
    return response.data.data;
  },

  async getRequestableSongs(): Promise<SongRequestItem[]> {
    try {
      const response = await fetch(
        `${AZURACAST_BASE}/station/${STATION_ID}/requests`,
      );
      const data = await response.json();
      return data || [];
    } catch {
      return [];
    }
  },

  async requestSong(requestId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${AZURACAST_BASE}/station/${STATION_ID}/request/${requestId}`,
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
    return listenUrl || 'http://localhost/listen/my_fav_station/radio.mp3';
  },
};

export default livestreamService;
