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
    title: string;
    subtitle: string;
    imageUrl?: string;
}

export const SEARCH_MIN_CHARS = 2;

export const PLAYLISTS: PlaylistItem[] = [
    {
        id: '1',
        title: 'Aethereal Flow',
        subtitle: 'Celestial Waves',
        image: 'https://images.unsplash.com/photo-1646542923878-8f478d501a16?w=400',
        category: 'Mới',
    },
    {
        id: '2',
        title: 'Skyward Serenade',
        subtitle: 'Celeste',
        image: 'https://images.unsplash.com/photo-1769478734130-047e0823f96c?w=400',
        category: 'Acoustic',
    },
    {
        id: '3',
        title: 'Purr-fect Beats',
        subtitle: 'Luna Paws',
        image: 'https://images.unsplash.com/photo-1593828772876-58fc75d8ad98?w=400',
        category: 'EDM',
    },
    {
        id: '4',
        title: 'Radio Waves',
        subtitle: 'The Vintage Sound',
        image: 'https://images.unsplash.com/photo-1772812474654-a94307e5df20?w=400',
        category: 'Thịnh Hành',
    },
    {
        id: '5',
        title: 'Rainy Day Coffee',
        subtitle: 'Warmth & Wood',
        image: 'https://images.unsplash.com/photo-1676483489320-534657bdb0f6?w=400',
        category: 'Bolero',
    },
];

export const PLAYLIST_TABS: PlaylistTab[] = ['Mới', 'Thịnh Hành', 'EDM', 'Acoustic', 'Bolero'];

export const TOP_HIT_PLAYLISTS: PlaylistItem[] = [
    {
        id: '1',
        title: 'V-Pop Hits 2024',
        subtitle: '2.4M lượt nghe',
        image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
        category: 'Thịnh Hành',
        plays: 2400000,
    },
    {
        id: '2',
        title: 'Bolero Vàng',
        subtitle: '1.8M lượt nghe',
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
        category: 'Bolero',
        plays: 1800000,
    },
    {
        id: '3',
        title: 'Chill Việt Mix',
        subtitle: '1.5M lượt nghe',
        image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
        category: 'EDM',
        plays: 1500000,
    },
];

export const SCHEDULE_ITEMS: ScheduleItem[] = [
    { id: '1', time: '23:00', period: 'Đang phát', title: 'Đêm nhạc bolero học', host: 'Emily_vui', isLive: true },
    { id: '2', time: '00:30', period: 'Sắp tới', title: 'KPOP Party Mix', host: 'DJ Minh', isLive: false },
    { id: '3', time: '06:00', period: 'Sắp tới', title: 'Dawn Coffee Session', host: 'Lan Vy', isLive: false },
];

export const PODCASTS: PodcastItem[] = [
    { id: '1', title: 'Chuyện Tình Yêu', host: 'Minh Anh', image: 'https://i.pravatar.cc/200?img=1' },
    { id: '2', title: 'Kỷ Niệm Tuổi Học Trò', host: 'Lan Anh', image: 'https://i.pravatar.cc/200?img=5' },
    { id: '3', title: 'Đời Sống Hằng Ngày', host: 'Hoàng Vy', image: 'https://i.pravatar.cc/200?img=8' },
    { id: '4', title: 'Tâm Sự Đêm Khuya', host: 'Thu Hà', image: 'https://i.pravatar.cc/200?img=9' },
];
