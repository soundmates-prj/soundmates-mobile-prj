import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SoundMateLightColors } from '../../../constants/theme';
import BottomNavigation, { TabName } from '../BottomNavigation';

type PlaylistItem = {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    plays?: number;
};

type PodcastItem = {
    id: string;
    title: string;
    host: string;
    image: string;
};

type ForumPostItem = {
    id: string;
    author: string;
    badge: string;
    avatar: string;
    title: string;
    likes: number;
    comments: number;
    time: string;
};

const PLAYLISTS: PlaylistItem[] = [
    {
        id: '1',
        title: 'Aethereal Flow',
        subtitle: 'Celestial Waves',
        image: 'https://images.unsplash.com/photo-1646542923878-8f478d501a16?w=400',
    },
    {
        id: '2',
        title: 'Skyward Serenade',
        subtitle: 'Celeste',
        image: 'https://images.unsplash.com/photo-1769478734130-047e0823f96c?w=400',
    },
    {
        id: '3',
        title: 'Purr-fect Beats',
        subtitle: 'Luna Paws',
        image: 'https://images.unsplash.com/photo-1593828772876-58fc75d8ad98?w=400',
    },
    {
        id: '4',
        title: 'Radio Waves',
        subtitle: 'The Vintage Sound',
        image: 'https://images.unsplash.com/photo-1772812474654-a94307e5df20?w=400',
    },
    {
        id: '5',
        title: 'Rainy Day Coffee',
        subtitle: 'Warmth & Wood',
        image: 'https://images.unsplash.com/photo-1676483489320-534657bdb0f6?w=400',
    },
];

const TOP_HIT_PLAYLISTS: PlaylistItem[] = [
    {
        id: '1',
        title: 'V-Pop Hits 2024',
        subtitle: '2.4M lượt nghe',
        image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
        plays: 2400000,
    },
    {
        id: '2',
        title: 'Bolero Vàng',
        subtitle: '1.8M lượt nghe',
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
        plays: 1800000,
    },
    {
        id: '3',
        title: 'Chill Việt Mix',
        subtitle: '1.5M lượt nghe',
        image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
        plays: 1500000,
    },
];

const PODCASTS: PodcastItem[] = [
    { id: '1', title: 'Chuyện Tình Yêu', host: 'Minh Anh', image: 'https://i.pravatar.cc/200?img=1' },
    { id: '2', title: 'Kỷ Niệm Tuổi Học Trò', host: 'Lan Anh', image: 'https://i.pravatar.cc/200?img=5' },
    { id: '3', title: 'Đời Sống Hằng Ngày', host: 'Hoàng Vy', image: 'https://i.pravatar.cc/200?img=8' },
    { id: '4', title: 'Tâm Sự Đêm Khuya', host: 'Thu Hà', image: 'https://i.pravatar.cc/200?img=9' },
];

const FORUM_POSTS: ForumPostItem[] = [
    {
        id: '1',
        author: 'Phan Minh',
        badge: 'Premium',
        avatar: 'https://i.pravatar.cc/100?img=1',
        title: 'Playlist tổng hợp các bài nhạc chill cùng team music',
        likes: 32,
        comments: 24,
        time: '10 phút',
    },
    {
        id: '2',
        author: 'Anh Tuấn Music',
        badge: 'Artist',
        avatar: 'https://i.pravatar.cc/100?img=2',
        title: 'Các anh chị ơi mình cần chọn loại tai nghe gì?',
        likes: 56,
        comments: 200,
        time: '24 giờ',
    },
    {
        id: '3',
        author: 'Nhạc Việt DJ',
        badge: 'VIP',
        avatar: 'https://i.pravatar.cc/100?img=3',
        title: 'Bài hát nào hay nhất trong playlist của bạn?',
        likes: 128,
        comments: 89,
        time: '2 ngày',
    },
];

interface HomeScreenProps {
    onLogout?: () => void;
    onNavigateToProfile?: () => void;
    onNavigateToLive?: () => void;
}

interface SectionHeaderProps {
    title: string;
    titleColor?: string;
}

function SectionHeader({ title, titleColor = '#0059C5' }: SectionHeaderProps) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
            <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
        </View>
    );
}

function PlaylistCard({ item }: { item: PlaylistItem }) {
    return (
        <TouchableOpacity style={styles.playlistCard} activeOpacity={0.9}>
            <View style={styles.playlistImageWrapper}>
                <Image source={{ uri: item.image }} style={styles.playlistImage} />
                <LinearGradient
                    colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.12)']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={styles.playlistOverlay}
                />
                <TouchableOpacity style={styles.playIconButton} activeOpacity={0.85}>
                    <Ionicons name="play" size={16} color="#FFFFFF" style={styles.playIcon} />
                </TouchableOpacity>
                <View style={styles.playlistTitleContainer}>
                    <Text style={styles.playlistTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                </View>
            </View>
            <Text style={styles.playlistSubtitle} numberOfLines={1}>
                {item.subtitle}
            </Text>
        </TouchableOpacity>
    );
}

function PodcastCard({ item }: { item: PodcastItem }) {
    return (
        <TouchableOpacity style={styles.podcastCard} activeOpacity={0.9}>
            <View style={styles.podcastImageFrame}>
                <Image source={{ uri: item.image }} style={styles.podcastImage} />
            </View>
            <Text style={styles.podcastTitle} numberOfLines={1}>
                {item.title}
            </Text>
            <Text style={styles.podcastHost} numberOfLines={1}>
                {item.host}
            </Text>
        </TouchableOpacity>
    );
}

function ForumPost({ post }: { post: ForumPostItem }) {
    return (
        <View style={styles.forumCard}>
            <View style={styles.forumAuthorRow}>
                <Image source={{ uri: post.avatar }} style={styles.forumAvatar} />
                <View style={styles.forumAuthorInfo}>
                    <View style={styles.forumAuthorNameRow}>
                        <Text style={styles.forumAuthorName} numberOfLines={1}>
                            {post.author}
                        </Text>
                        <LinearGradient
                            colors={[SoundMateLightColors.primary, SoundMateLightColors.primaryDark]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.forumBadge}
                        >
                            <Text style={styles.forumBadgeText}>{post.badge}</Text>
                        </LinearGradient>
                    </View>
                    <Text style={styles.forumTime}>{post.time} trước</Text>
                </View>
            </View>

            <Text style={styles.forumPostTitle} numberOfLines={2}>
                {post.title}
            </Text>

            <View style={styles.forumActionRow}>
                <TouchableOpacity style={styles.forumActionButton} activeOpacity={0.8}>
                    <Ionicons name="thumbs-up-outline" size={14} color={SoundMateLightColors.textSecondary} />
                    <Text style={styles.forumActionText}>{post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.forumActionButton} activeOpacity={0.8}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={SoundMateLightColors.textSecondary} />
                    <Text style={styles.forumActionText}>{post.comments}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function HomeScreen({ onLogout, onNavigateToProfile, onNavigateToLive }: HomeScreenProps) {
    const [activeTab, setActiveTab] = useState<TabName>('home');
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 850,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 850,
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();

        return () => {
            loop.stop();
        };
    }, [pulseAnim]);

    const handleTabPress = (tab: TabName) => {
        setActiveTab(tab);

        if (tab === 'profile') {
            onNavigateToProfile?.();
            return;
        }

        if (tab === 'live') {
            onNavigateToLive?.();
        }
    };

    const handleProfilePress = () => {
        setActiveTab('profile');
        onNavigateToProfile?.();
    };

    const handleLivePress = () => {
        setActiveTab('live');
        onNavigateToLive?.();
    };

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <LinearGradient
                    colors={['#3C5F99', '#2D4A7A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.topBar}>
                        <View style={styles.brandWrapper}>
                            <Image
                                source={require('../../../assets/logo_notext.png')}
                                style={styles.brandLogoIcon}
                            />
                            <Image
                                source={require('../../../assets/logo_text.png')}
                                style={styles.brandLogoText}
                            />
                        </View>

                        <View style={styles.headerIcons}>
                            <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8}>
                                <Ionicons name="search" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8}>
                                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>

                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={handleLivePress}
                    style={styles.liveBannerContainer}
                >
                    <LinearGradient
                        colors={['#667EEA', '#764BA2', '#F093FB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.liveBanner}
                    >
                        <Animated.View style={[styles.livePill, { transform: [{ scale: pulseAnim }] }]}>
                            <View style={styles.livePillDot} />
                            <Text style={styles.livePillText}>ĐANG LIVE</Text>
                        </Animated.View>

                        <Text style={styles.liveBannerTitle}>Đêm nhạc bolero học</Text>
                        <Text style={styles.liveBannerHost}>Emily_vui</Text>

                        <View style={styles.liveBannerMeta}>
                            <Ionicons name="radio" size={14} color="rgba(255,255,255,0.92)" />
                            <Text style={styles.liveBannerMetaText}>256 người</Text>
                        </View>

                        <View style={styles.liveBannerOverlay} />
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.sectionBlock}>
                    <SectionHeader title="Top Hit Playlist Live" />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollContent}
                    >
                        {TOP_HIT_PLAYLISTS.map((item) => (
                            <PlaylistCard key={item.id} item={item} />
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.sectionBlock}>
                    <SectionHeader title="Playlist của bạn" />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollContent}
                    >
                        {PLAYLISTS.map((item) => (
                            <PlaylistCard key={item.id} item={item} />
                        ))}
                    </ScrollView>
                </View>

                <LinearGradient
                    colors={['#E0F2FE', '#FAFAFA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.podcastSection}
                >
                    <SectionHeader title="Podcast Hot" titleColor="#0E7490" />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollContent}
                    >
                        {PODCASTS.map((item) => (
                            <PodcastCard key={item.id} item={item} />
                        ))}
                    </ScrollView>
                </LinearGradient>

                <View style={styles.communitySection}>
                    <SectionHeader title="Cộng đồng" titleColor="#1D4ED8" />
                    {FORUM_POSTS.map((post) => (
                        <ForumPost key={post.id} post={post} />
                    ))}
                </View>
            </ScrollView>

            <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} onLogout={onLogout} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SoundMateLightColors.background,
    },
    scrollContent: {
        paddingBottom: 114,
    },
    header: {
        paddingHorizontal: 16,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
        top: 4,
    },
    brandLogoIcon: {
        width: 60,
        height: 60,
    },
    brandLogoText: {
        position: 'relative',
        bottom: 4,
        right: 10,
        width: 104,
        height: 34,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginLeft: 8,
    },
    liveBannerContainer: {
        marginTop: 16,
        marginBottom: 14,
        marginHorizontal: 16,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
        elevation: 8,
    },
    liveBanner: {
        height: 182,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        position: 'relative',
    },
    livePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        marginBottom: 12,
        zIndex: 2,
    },
    livePillDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        marginRight: 7,
    },
    livePillText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    liveBannerTitle: {
        zIndex: 2,
        fontSize: 21,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 4,
    },
    liveBannerHost: {
        zIndex: 2,
        fontSize: 13,
        color: 'rgba(255,255,255,0.95)',
        marginBottom: 10,
    },
    liveBannerMeta: {
        zIndex: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    liveBannerMetaText: {
        marginLeft: 4,
        color: 'rgba(255,255,255,0.92)',
        fontSize: 11,
        fontWeight: '500',
    },
    liveBannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.18)',
    },
    sectionBlock: {
        paddingTop: 10,
        paddingBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: SoundMateLightColors.primary,
    },
    horizontalScrollContent: {
        paddingHorizontal: 20,
    },
    playlistCard: {
        width: 140,
        marginRight: 12,
    },
    playlistImageWrapper: {
        width: 140,
        height: 140,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#D1D5DB',
        marginBottom: 8,
    },
    playlistImage: {
        width: '100%',
        height: '100%',
    },
    playlistOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    playIconButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: SoundMateLightColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: SoundMateLightColors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.32,
        shadowRadius: 8,
        elevation: 5,
    },
    playIcon: {
        marginLeft: 1,
    },
    playlistTitleContainer: {
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 8,
    },
    playlistTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    playlistSubtitle: {
        fontSize: 11,
        color: SoundMateLightColors.textSecondary,
        textAlign: 'center',
    },
    podcastSection: {
        marginTop: 10,
        paddingTop: 8,
        paddingBottom: 12,
    },
    podcastCard: {
        width: 140,
        marginRight: 12,
        alignItems: 'center',
    },
    podcastImageFrame: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        backgroundColor: '#D1D5DB',
        overflow: 'hidden',
        marginBottom: 10,
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    podcastImage: {
        width: '100%',
        height: '100%',
    },
    podcastTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: SoundMateLightColors.textPrimary,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    podcastHost: {
        marginTop: 2,
        fontSize: 11,
        color: SoundMateLightColors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    communitySection: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    forumCard: {
        backgroundColor: SoundMateLightColors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        marginBottom: 12,
    },
    forumAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    forumAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: SoundMateLightColors.primary,
        marginRight: 10,
    },
    forumAuthorInfo: {
        flex: 1,
    },
    forumAuthorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    forumAuthorName: {
        maxWidth: '60%',
        fontSize: 13,
        fontWeight: '700',
        color: SoundMateLightColors.textPrimary,
        marginRight: 8,
    },
    forumBadge: {
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    forumBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
    },
    forumTime: {
        fontSize: 10,
        color: SoundMateLightColors.textMuted,
    },
    forumPostTitle: {
        fontSize: 13,
        color: SoundMateLightColors.textPrimary,
        lineHeight: 19,
        marginBottom: 10,
    },
    forumActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    forumActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 8,
    },
    forumActionText: {
        marginLeft: 5,
        fontSize: 12,
        fontWeight: '600',
        color: SoundMateLightColors.textPrimary,
    },
});