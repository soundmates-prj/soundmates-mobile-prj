export type PlaylistItem = {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    category: 'Mới' | 'Thịnh Hành' | 'EDM' | 'Acoustic' | 'Bolero';
    plays?: number;
};

export type PlaylistTab = 'Mới' | 'Thịnh Hành' | 'EDM' | 'Acoustic' | 'Bolero';

export type PodcastItem = {
    id: string;
    title: string;
    host: string;
    image: string;
};

export type ScheduleItem = {
    id: string;
    sessionId?: string;
    time: string;
    period: string;
    title: string;
    host: string;
    isLive: boolean;
};

export interface SearchSuggestionItem {
    id: string;
    source: 'spotify';
    category: 'track';
    trackId: string;
    title: string;
    subtitle: string;
    artistName?: string;
    albumName?: string;
    imageUrl?: string;
    previewUrl?: string;
}

export const SEARCH_MIN_CHARS = 2;
