import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SoundMateColors } from '../../../constants/theme';
import BottomNavigation, { TabName } from '../BottomNavigation';

const { width } = Dimensions.get('window');

// Mock data for demo
const LIVE_SESSIONS = [
    {
        id: '1',
        title: 'Tâm sự đêm khuya',
        host: 'DJ Tâm An',
        listeners: 234,
        mood: 'Chill',
        isLive: true,
        avatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
        id: '2',
        title: 'Những bản tình ca',
        host: 'MC Thanh Tùng',
        listeners: 156,
        mood: 'Romantic',
        isLive: true,
        avatar: 'https://i.pravatar.cc/150?img=2',
    },
    {
        id: '3',
        title: 'Healing Session',
        host: 'Mindful Luna',
        listeners: 89,
        mood: 'Peaceful',
        isLive: true,
        avatar: 'https://i.pravatar.cc/150?img=3',
    },
];

const PODCAST_LETTERS = [
    {
        id: '1',
        title: 'Gửi người tôi từng yêu',
        author: 'Anonymous',
        duration: '5:32',
        likes: 1234,
        mood: 'Melancholy',
        cover: 'https://picsum.photos/200/200?random=1',
    },
    {
        id: '2',
        title: 'Lá thư gửi bản thân 10 năm sau',
        author: 'Minh Anh',
        duration: '8:15',
        likes: 892,
        mood: 'Hopeful',
        cover: 'https://picsum.photos/200/200?random=2',
    },
    {
        id: '3',
        title: 'Khi cô đơn gõ cửa',
        author: 'Người lạ',
        duration: '6:45',
        likes: 567,
        mood: 'Lonely',
        cover: 'https://picsum.photos/200/200?random=3',
    },
];

const MOOD_PLAYLISTS = [
    { id: '1', name: 'Chill', emoji: '😌', color: '#4ECDC4' },
    { id: '2', name: 'Happy', emoji: '😊', color: '#FFE66D' },
    { id: '3', name: 'Sad', emoji: '😢', color: '#6C5CE7' },
    { id: '4', name: 'Romantic', emoji: '💕', color: '#FD79A8' },
    { id: '5', name: 'Energetic', emoji: '⚡', color: '#FF6B35' },
    { id: '6', name: 'Peaceful', emoji: '🧘', color: '#00B894' },
];

const TRENDING_CONTENT = [
    {
        id: '1',
        type: 'podcast',
        title: 'Câu chuyện của những người xa quê',
        plays: '12.5K',
        cover: 'https://picsum.photos/300/200?random=4',
    },
    {
        id: '2',
        type: 'playlist',
        title: 'Những bản nhạc ru ngủ',
        plays: '8.2K',
        cover: 'https://picsum.photos/300/200?random=5',
    },
    {
        id: '3',
        type: 'podcast',
        title: 'Tình yêu thời công nghệ',
        plays: '6.8K',
        cover: 'https://picsum.photos/300/200?random=6',
    },
];

interface HomeScreenProps {
    navigation?: any;
    onLogout?: () => void;
}

export default function HomeScreen({ navigation, onLogout }: HomeScreenProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabName>('home');
    const scrollY = useRef(new Animated.Value(0)).current;

    const handleTabPress = (tab: TabName) => {
        setActiveTab(tab);
        // Handle navigation based on tab
        console.log('Tab pressed:', tab);
    };

    const renderLiveSessionCard = ({ item }: { item: typeof LIVE_SESSIONS[0] }) => (
        <TouchableOpacity style={styles.liveSessionCard} activeOpacity={0.8}>
            <LinearGradient
                colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                style={styles.liveSessionGradient}
            >
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
                <View style={styles.liveSessionContent}>
                    <Image source={{ uri: item.avatar }} style={styles.hostAvatar} />
                    <Text style={styles.liveSessionTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.liveSessionHost}>{item.host}</Text>
                    <View style={styles.listenersContainer}>
                        <Ionicons name="headset" size={14} color="#FFFFFF" />
                        <Text style={styles.listenersText}>{item.listeners}</Text>
                    </View>
                </View>
                <View style={styles.moodTag}>
                    <Text style={styles.moodTagText}>{item.mood}</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderPodcastLetterCard = ({ item }: { item: typeof PODCAST_LETTERS[0] }) => (
        <TouchableOpacity style={styles.podcastCard} activeOpacity={0.8}>
            <Image source={{ uri: item.cover }} style={styles.podcastCover} />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.podcastOverlay}
            >
                <Text style={styles.podcastTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.podcastAuthor}>{item.author}</Text>
                <View style={styles.podcastMeta}>
                    <View style={styles.podcastDuration}>
                        <Ionicons name="time-outline" size={12} color="#FFFFFF" />
                        <Text style={styles.podcastMetaText}>{item.duration}</Text>
                    </View>
                    <View style={styles.podcastLikes}>
                        <Ionicons name="heart" size={12} color={SoundMateColors.primary} />
                        <Text style={styles.podcastMetaText}>{item.likes}</Text>
                    </View>
                </View>
            </LinearGradient>
            <TouchableOpacity style={styles.playButton}>
                <Ionicons name="play" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderMoodPlaylist = ({ item }: { item: typeof MOOD_PLAYLISTS[0] }) => (
        <TouchableOpacity style={styles.moodCard} activeOpacity={0.8}>
            <View style={[styles.moodGradient, { backgroundColor: item.color }]}>
                <Text style={styles.moodEmoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.moodName}>{item.name}</Text>
        </TouchableOpacity>
    );

    const renderTrendingCard = ({ item }: { item: typeof TRENDING_CONTENT[0] }) => (
        <TouchableOpacity style={styles.trendingCard} activeOpacity={0.8}>
            <Image source={{ uri: item.cover }} style={styles.trendingCover} />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.trendingOverlay}
            >
                <View style={styles.trendingType}>
                    <Ionicons
                        name={item.type === 'podcast' ? 'mic' : 'musical-notes'}
                        size={12}
                        color="#FFFFFF"
                    />
                    <Text style={styles.trendingTypeText}>
                        {item.type === 'podcast' ? 'Podcast' : 'Playlist'}
                    </Text>
                </View>
                <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.trendingPlays}>{item.plays} lượt nghe</Text>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
                style={styles.backgroundGradient}
            />

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity style={styles.avatarContainer}>
                            <Image
                                source={{ uri: 'https://i.pravatar.cc/150?img=10' }}
                                style={styles.userAvatar}
                            />
                            <View style={styles.onlineIndicator} />
                        </TouchableOpacity>
                        <View style={styles.greeting}>
                            <Text style={styles.greetingText}>Xin chào,</Text>
                            <Text style={styles.userName}>User 👋</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerButton}>
                            <Ionicons name="notifications-outline" size={24} color={SoundMateColors.textPrimary} />
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationCount}>3</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={SoundMateColors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm podcast, bài hát, phiên live..."
                        placeholderTextColor={SoundMateColors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity>
                        <Ionicons name="options-outline" size={20} color={SoundMateColors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Live Sessions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <View style={styles.liveDotLarge} />
                            <Text style={styles.sectionTitle}>Phiên Live đang diễn ra</Text>
                        </View>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={LIVE_SESSIONS}
                        renderItem={renderLiveSessionCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    />
                </View>

                {/* Mood Playlists */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Tâm trạng hôm nay</Text>
                    </View>
                    <FlatList
                        data={MOOD_PLAYLISTS}
                        renderItem={renderMoodPlaylist}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    />
                </View>

                {/* Podcast Letters */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Thư Podcast nổi bật</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={PODCAST_LETTERS}
                        renderItem={renderPodcastLetterCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    />
                </View>

                {/* Trending */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🔥 Xu hướng</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={TRENDING_CONTENT}
                        renderItem={renderTrendingCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    />
                </View>

                {/* Create Content CTA */}
                <TouchableOpacity style={styles.createCTA} activeOpacity={0.9}>
                    <LinearGradient
                        colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.createCTAGradient}
                    >
                        <View style={styles.createCTAContent}>
                            <Ionicons name="mic" size={32} color="#FFFFFF" />
                            <View style={styles.createCTAText}>
                                <Text style={styles.createCTATitle}>Viết thư Podcast của bạn</Text>
                                <Text style={styles.createCTASubtitle}>Chia sẻ cảm xúc, kết nối yêu thương</Text>
                            </View>
                        </View>
                        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Spacer for bottom nav */}
                <View style={{ height: 100 }} />
            </Animated.ScrollView>

            {/* Bottom Navigation */}
            <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} onLogout={onLogout} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SoundMateColors.background,
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: SoundMateColors.primary,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: SoundMateColors.background,
    },
    greeting: {
        marginLeft: 12,
    },
    greetingText: {
        fontSize: 14,
        color: SoundMateColors.textSecondary,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: SoundMateColors.textPrimary,
    },
    headerRight: {
        flexDirection: 'row',
    },
    headerButton: {
        position: 'relative',
        padding: 8,
    },
    notificationBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: SoundMateColors.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationCount: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SoundMateColors.surface,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        borderWidth: 1,
        borderColor: SoundMateColors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: SoundMateColors.textPrimary,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: SoundMateColors.textPrimary,
    },
    liveDotLarge: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
        marginRight: 8,
    },
    seeAll: {
        fontSize: 14,
        color: SoundMateColors.primary,
        fontWeight: '600',
    },
    horizontalList: {
        paddingHorizontal: 20,
    },
    // Live Session Card
    liveSessionCard: {
        width: 180,
        height: 200,
        marginRight: 16,
        borderRadius: 20,
        overflow: 'hidden',
    },
    liveSessionGradient: {
        flex: 1,
        padding: 16,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
        marginRight: 4,
    },
    liveText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    liveSessionContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    hostAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    liveSessionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    liveSessionHost: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    listenersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listenersText: {
        fontSize: 12,
        color: '#FFFFFF',
        marginLeft: 4,
    },
    moodTag: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    moodTagText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    // Podcast Card
    podcastCard: {
        width: 160,
        height: 200,
        marginRight: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: SoundMateColors.surface,
    },
    podcastCover: {
        width: '100%',
        height: '100%',
    },
    podcastOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 12,
    },
    podcastTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    podcastAuthor: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    podcastMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    podcastDuration: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    podcastLikes: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    podcastMetaText: {
        fontSize: 11,
        color: '#FFFFFF',
        marginLeft: 4,
    },
    playButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SoundMateColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Mood Card
    moodCard: {
        alignItems: 'center',
        marginRight: 20,
    },
    moodGradient: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    moodEmoji: {
        fontSize: 28,
    },
    moodName: {
        fontSize: 12,
        color: SoundMateColors.textSecondary,
        fontWeight: '600',
    },
    // Trending Card
    trendingCard: {
        width: 240,
        height: 140,
        marginRight: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    trendingCover: {
        width: '100%',
        height: '100%',
    },
    trendingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 16,
    },
    trendingType: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,107,53,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    trendingTypeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 4,
    },
    trendingTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    trendingPlays: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    // Create CTA
    createCTA: {
        marginHorizontal: 20,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 8,
    },
    createCTAGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
    },
    createCTAContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    createCTAText: {
        marginLeft: 16,
        flex: 1,
    },
    createCTATitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    createCTASubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
});
