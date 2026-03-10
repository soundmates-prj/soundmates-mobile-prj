import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SoundMateLightColors } from '../../../constants/theme';
import BottomNavigation, { TabName } from '../BottomNavigation';

const { width } = Dimensions.get('window');

// Mock data based on web version
const PLAYLISTS = [
    {
        id: '1',
        title: 'Aethereal Flow',
        subtitle: 'Celestial Waves',
        image: 'https://picsum.photos/200/200?random=1',
    },
    {
        id: '2',
        title: 'Skyward Serenade',
        subtitle: 'Celeste',
        image: 'https://picsum.photos/200/200?random=2',
    },
    {
        id: '3',
        title: 'Purr-fect Beats',
        subtitle: 'Luna Paws',
        image: 'https://picsum.photos/200/200?random=3',
    },
    {
        id: '4',
        title: 'Radio Waves',
        subtitle: 'The Vintage Sound',
        image: 'https://picsum.photos/200/200?random=4',
    },
    {
        id: '5',
        title: 'Rainy Day Coffee',
        subtitle: 'Warmth & Wood',
        image: 'https://picsum.photos/200/200?random=5',
    },
    {
        id: '6',
        title: 'Lofi Chill',
        subtitle: 'Relaxing Vibes',
        image: 'https://picsum.photos/200/200?random=6',
    },
    {
        id: '7',
        title: 'Jazz Night',
        subtitle: 'Smooth Sessions',
        image: 'https://picsum.photos/200/200?random=7',
    },
];

const PLAYLIST_TABS = ['Mới', 'Thịnh Hành', 'EDM', 'Acoustic', 'Nhạc', 'Bolê', 'Phim'];

const SCHEDULE_ITEMS = [
    {
        id: '1',
        time: '23:00',
        period: 'Đang phát',
        title: 'Đêm nhạc bolero học',
        host: '❤ Emily_vui',
        isLive: true,
    },
    {
        id: '2',
        time: '23:00',
        period: 'Sắp tới',
        title: 'KPOP Party Mix',
        host: '🎧 Minh',
        isLive: false,
    },
    {
        id: '3',
        time: '00:00',
        period: 'Sắp tới',
        title: 'Bùa biêng và em hát',
        host: '🎵 Luna_DJ',
        isLive: false,
    },
    {
        id: '4',
        time: '3:00',
        period: 'Sắp tới',
        title: 'Dawn Coffee',
        host: '☕ Lan_vy_ơi',
        isLive: false,
    },
    {
        id: '5',
        time: '21:00',
        period: 'Sắp tới',
        title: 'Late night Afterunon',
        host: '💫 Jacky_oi',
        isLive: false,
    },
];

const FORUM_POSTS = [
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
        title: 'Các anh chị ơi mình cần chọn loại Tai nghe gì?',
        likes: 56,
        comments: 200,
        time: '24 giờ',
    },
    {
        id: '3',
        author: 'Nhạc Việt DJ',
        badge: 'VIP',
        avatar: 'https://i.pravatar.cc/100?img=3',
        title: 'lài số lùi của bản bọ không hiện lên loai ho, mọi người...',
        likes: 128,
        comments: 89,
        time: '2 ngày',
    },
];

const PODCASTS = [
    {
        id: '1',
        title: 'Podcast 1',
        subtitle: 'mật thư',
        image: 'https://picsum.photos/200/200?random=8',
    },
    {
        id: '2',
        title: 'Podcast 2',
        subtitle: 'câu chuyện chúng ta',
        image: 'https://picsum.photos/200/200?random=9',
    },
    {
        id: '3',
        title: 'Podcast 3',
        subtitle: 'tâm trạng',
        image: 'https://picsum.photos/200/200?random=10',
    },
    {
        id: '4',
        title: 'Podcast 4',
        subtitle: 'tự sự',
        image: 'https://picsum.photos/200/200?random=11',
    },
    {
        id: '5',
        title: 'Podcast 5',
        subtitle: 'yêu lành',
        image: 'https://picsum.photos/200/200?random=12',
    },
    {
        id: '6',
        title: 'Podcast 6',
        subtitle: 'kể chuyện',
        image: 'https://picsum.photos/200/200?random=13',
    },
];

interface HomeScreenProps {
    navigation?: any;
    onLogout?: () => void;
    onNavigateToProfile?: () => void;
}

// Animated Subscription Button Component
const AnimatedSubscriptionButton = () => {
    const bounceAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(bounceAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(bounceAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(bounceAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <TouchableOpacity 
                style={styles.subscriptionButton}
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <Text style={styles.subscriptionButtonText}>Đăng Ký Ngay</Text>
                <Ionicons name="arrow-forward" size={18} color="#55C5F1" />
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function HomeScreen({ navigation, onLogout, onNavigateToProfile }: HomeScreenProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabName>('home');
    const [activePlaylistTab, setActivePlaylistTab] = useState('Mới');
    const scrollY = useRef(new Animated.Value(0)).current;

    // Animation values
    const heroFadeAnim = useRef(new Animated.Value(0)).current;
    const heroSlideAnim = useRef(new Animated.Value(50)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const waveAnims = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    // Initialize animations on mount
    useEffect(() => {
        // Hero section fade in and slide up
        Animated.parallel([
            Animated.timing(heroFadeAnim, {
                toValue: 1,
                duration: 800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(heroSlideAnim, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for live badge
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Wave animation for music bars
        const waveAnimations = waveAnims.map((anim, index) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 300 + index * 100,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 300 + index * 100,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ])
            )
        );

        Animated.stagger(100, waveAnimations).start();
    }, []);

    const handleTabPress = (tab: TabName) => {
        setActiveTab(tab);
        console.log('Tab pressed:', tab);
        
        // Navigate to profile screen when profile tab is pressed
        if (tab === 'profile' && onNavigateToProfile) {
            onNavigateToProfile();
        }
    };

    // Animated Playlist Card with scale effect
    const renderPlaylistCard = ({ item, index }: { item: typeof PLAYLISTS[0], index: number }) => (
        <TouchableOpacity style={styles.playlistCard} activeOpacity={0.7}>
            <Image source={{ uri: item.image }} style={styles.playlistImage} />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.playlistOverlay}
            >
                <Text style={styles.playlistTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.playlistSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </LinearGradient>
            <TouchableOpacity style={styles.playButton}>
                <Ionicons name="play" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    // Render Schedule Item with animated wave
    const renderScheduleItem = ({ item, index }: { item: typeof SCHEDULE_ITEMS[0], index: number }) => (
        <TouchableOpacity style={styles.scheduleItem} activeOpacity={0.8}>
            <View style={styles.scheduleTime}>
                <Text style={styles.scheduleTimeValue}>{item.time}</Text>
                <Text style={styles.scheduleTimePeriod}>{item.period}</Text>
            </View>
            <View style={styles.musicWave}>
                {waveAnims.map((anim, i) => {
                    const baseHeight = [12, 8, 16, 10, 14][i];
                    const animatedHeight = anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [baseHeight * 0.5, baseHeight],
                    });

                    return (
                        <Animated.View 
                            key={i}
                            style={[
                                styles.musicBar, 
                                { height: item.isLive ? animatedHeight : baseHeight }
                            ]} 
                        />
                    );
                })}
            </View>
            <View style={styles.scheduleContent}>
                <Text style={styles.scheduleTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.scheduleHost} numberOfLines={1}>{item.host}</Text>
            </View>
            <View style={[styles.scheduleAction, item.isLive && styles.scheduleActionLive]}>
                <Text style={styles.scheduleActionText}>
                    {item.isLive ? 'Đang Phát' : 'Thông báo'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // Render Forum Post
    const renderForumPost = ({ item, index }: { item: typeof FORUM_POSTS[0], index: number }) => (
        <TouchableOpacity style={styles.forumItem} activeOpacity={0.8}>
            <Image source={{ uri: item.avatar }} style={styles.forumAvatar} />
            <View style={styles.forumContent}>
                <View style={styles.forumHeader}>
                    <Text style={styles.forumAuthor}>{item.author}</Text>
                    <View style={styles.forumBadge}>
                        <Text style={styles.forumBadgeText}>{item.badge}</Text>
                    </View>
                </View>
                <Text style={styles.forumTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.forumMeta}>
                    <View style={styles.forumMetaItem}>
                        <Ionicons name="heart" size={14} color={SoundMateLightColors.textSecondary} />
                        <Text style={styles.forumMetaText}>{item.likes}</Text>
                    </View>
                    <View style={styles.forumMetaItem}>
                        <Ionicons name="chatbubble" size={14} color={SoundMateLightColors.textSecondary} />
                        <Text style={styles.forumMetaText}>{item.comments}</Text>
                    </View>
                    <View style={styles.forumMetaItem}>
                        <Ionicons name="time" size={14} color={SoundMateLightColors.textSecondary} />
                        <Text style={styles.forumMetaText}>{item.time}</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity style={styles.forumAction}>
                <Text style={styles.forumActionText}>Xem</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    // Render Podcast Card
    const renderPodcastCard = ({ item, index }: { item: typeof PODCASTS[0], index: number }) => (
        <TouchableOpacity style={styles.podcastCard} activeOpacity={0.7}>
            <Image source={{ uri: item.image }} style={styles.podcastImage} />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.podcastOverlay}
            >
                <Text style={styles.podcastTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.podcastSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            </LinearGradient>
            <TouchableOpacity style={styles.playButton}>
                <Ionicons name="play" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>

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
                        <Image
                            source={require('../../../assets/logo_notext.png')}
                            style={{ width: 70, height: 70 }}
                            resizeMode="contain"
                        />
                        <Image
                            source={require('../../../assets/logo_text.png')}
                            style={{ width: 100, height: 100, position: 'relative', bottom: 5, right: 20 }}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerButton}>
                            <Ionicons name="search" size={24} color={SoundMateLightColors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButton}>
                            <Ionicons name="notifications-outline" size={24} color={SoundMateLightColors.textPrimary} />
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationCount}>3</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Hero Section */}
                <Animated.View
                    style={{
                        opacity: heroFadeAnim,
                        transform: [{ translateY: heroSlideAnim }]
                    }}
                >
                    <LinearGradient
                        colors={['rgba(85, 197, 241, 0.15)', 'transparent']}
                        style={styles.heroSection}
                    >
                        <Text style={styles.heroTitle}>Listen</Text>
                        <LinearGradient
                            colors={['#55C5F1', '#A78BFA']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientText}
                        >
                            <Text style={styles.heroTitleGradient}>Together</Text>
                        </LinearGradient>
                        <Text style={styles.heroSubtitle}>Chia sẻ âm nhạc của bạn</Text>
                        <TouchableOpacity style={styles.heroCTA}>
                            <LinearGradient
                                colors={['#55C5F1', '#3AA8D4']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.heroCTAGradient}
                            >
                                <Ionicons name="play" size={18} color="#FFFFFF" />
                                <Text style={styles.heroCTAText}>Bắt Đầu</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animated.View>

                {/* Playlist Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Playlist đề cử</Text>
                    </View>
                    
                    {/* Playlist Tabs */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContainer}
                    >
                        {PLAYLIST_TABS.map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tab,
                                    activePlaylistTab === tab && styles.tabActive
                                ]}
                                onPress={() => setActivePlaylistTab(tab)}
                            >
                                <Text style={[
                                    styles.tabText,
                                    activePlaylistTab === tab && styles.tabTextActive
                                ]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <FlatList
                        data={PLAYLISTS}
                        renderItem={renderPlaylistCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    />
                </View>

                {/* Live Room Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Phòng Đang Phát</Text>
                        {/* <TouchableOpacity>
                            <Text style={styles.seeAll}>Xem thêm</Text>
                        </TouchableOpacity> */}
                    </View>
                    
                    <TouchableOpacity style={styles.liveRoomCard} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#D6F2FC', '#fce7f3']}
                            style={styles.liveRoomGradient}
                        >
                            <Animated.View 
                                style={[
                                    styles.liveBadge,
                                    { transform: [{ scale: pulseAnim }] }
                                ]}
                            >
                                <Animated.View style={[
                                    styles.liveDot,
                                    { opacity: pulseAnim }
                                ]} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </Animated.View>
                            <View style={styles.liveRoomContent}>
                                <Text style={styles.liveRoomTitle}>Đêm nhạc cổ điển êm dịu</Text>
                                <View style={styles.liveRoomMeta}>
                                    <View style={styles.liveRoomMetaItem}>
                                        <Ionicons name="people" size={16} color="#55C5F1" />
                                        <Text style={styles.liveRoomMetaText}>33 Kết nối</Text>
                                    </View>
                                    <View style={styles.liveRoomMetaItem}>
                                        <Ionicons name="heart" size={16} color="#55C5F1" />
                                        <Text style={styles.liveRoomMetaText}>156 lượt thích</Text>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.liveRoomJoinButton}>
                                <Ionicons name="headset" size={18} color="#FFFFFF" />
                                <Text style={styles.liveRoomJoinText}>Tham Gia</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Schedule Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Lịch phát sóng</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={SCHEDULE_ITEMS}
                        renderItem={renderScheduleItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                        contentContainerStyle={styles.scheduleList}
                    />
                </View>

                {/* Forum Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Diễn đàn SoundMates</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={FORUM_POSTS}
                        renderItem={renderForumPost}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                        contentContainerStyle={styles.forumList}
                    />
                </View>

                {/* Podcast Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Các thư Podcast yêu thích</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={PODCASTS}
                        renderItem={renderPodcastCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    />
                </View>

                {/* Subscription CTA */}
                <View style={styles.subscriptionSection}>
                    <LinearGradient
                        colors={['#55C5F1', '#A78BFA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.subscriptionGradient}
                    >
                        <View style={styles.subscriptionBadge}>
                            <Text style={styles.subscriptionBadgeText}>Subscription</Text>
                        </View>
                        <Text style={styles.subscriptionTitle}>Trở thành Hội Viên SoundMates</Text>
                        <Text style={styles.subscriptionDescription}>
                            Chỉ với <Text style={styles.subscriptionPrice}>159.000đ / tháng</Text>, bạn mở khóa toàn bộ đặc quyền dành riêng cho những người thật sự sống cuồng nhiệt cùng âm nhạc.
                        </Text>
                        <AnimatedSubscriptionButton />
                    </LinearGradient>
                </View>

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
        backgroundColor: SoundMateLightColors.background,
    },
    backgroundGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        maxHeight: 50,
        // paddingTop: 10,
        // paddingBottom: 16,
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
        borderColor: SoundMateLightColors.primary,
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
        borderColor: SoundMateLightColors.background,
    },
    greeting: {
        marginLeft: 12,
    },
    greetingText: {
        fontSize: 14,
        color: SoundMateLightColors.textSecondary,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: SoundMateLightColors.textPrimary,
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
        backgroundColor: SoundMateLightColors.primary,
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
        backgroundColor: SoundMateLightColors.surface,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        borderWidth: 1,
        borderColor: SoundMateLightColors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: SoundMateLightColors.textPrimary,
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
        color: SoundMateLightColors.textPrimary,
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
        color: SoundMateLightColors.primary,
        fontWeight: '600',
    },
    horizontalList: {
        paddingHorizontal: 20,
    },
    // Live Badge
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
    // Hero Section
    heroSection: {
        paddingHorizontal: 20,
        paddingVertical: 40,
        alignItems: 'center',
        marginBottom: 20,
    },
    heroTitle: {
        fontSize: 52,
        fontWeight: '700',
        color: SoundMateLightColors.textPrimary,
        fontFamily: 'System',
    },
    gradientText: {
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    heroTitleGradient: {
        fontSize: 52,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'System',
    },
    heroSubtitle: {
        fontSize: 16,
        color: SoundMateLightColors.textSecondary,
        marginTop: 8,
        marginBottom: 24,
    },
    heroCTA: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    heroCTAGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        gap: 8,
    },
    heroCTAText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    // Tabs
    tabsContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 12,
        borderRadius: 20,
        backgroundColor: SoundMateLightColors.surface,
        borderWidth: 1,
        borderColor: SoundMateLightColors.border,
    },
    tabActive: {
        backgroundColor: '#55C5F1',
        borderColor: '#55C5F1',
    },
    tabText: {
        fontSize: 14,
        color: SoundMateLightColors.textSecondary,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    // Playlist Card
    playlistCard: {
        width: 160,
        height: 200,
        marginRight: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: SoundMateLightColors.surface,
    },
    playlistImage: {
        width: '100%',
        height: '100%',
    },
    playlistOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        padding: 12,
    },
    playlistTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    playlistSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    playButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#55C5F1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Live Room Card
    liveRoomCard: {
        marginHorizontal: 20,
        borderRadius: 20,
        overflow: 'hidden',
    },
    liveRoomGradient: {
        padding: 20,
    },
    liveRoomContent: {
        marginTop: 12,
        marginBottom: 16,
    },
    liveRoomTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 12,
    },
    liveRoomMeta: {
        flexDirection: 'row',
        gap: 20,
    },
    liveRoomMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveRoomMetaText: {
        fontSize: 14,
        color: '#000000',
    },
    liveRoomJoinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#55C5F1',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 8,
    },
    liveRoomJoinText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Schedule Item
    scheduleList: {
        paddingHorizontal: 20,
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SoundMateLightColors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: SoundMateLightColors.border,
    },
    scheduleTime: {
        marginRight: 10,
        alignItems: 'center',
        width: 52,
    },
    scheduleTimeValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#55C5F1',
    },
    scheduleTimePeriod: {
        fontSize: 10,
        color: SoundMateLightColors.textSecondary,
        marginTop: 2,
    },
    musicWave: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginRight: 12,
    },
    musicBar: {
        width: 3,
        backgroundColor: '#55C5F1',
        borderRadius: 2,
    },
    scheduleContent: {
        flex: 1,
    },
    scheduleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: SoundMateLightColors.textPrimary,
        marginBottom: 4,
    },
    scheduleHost: {
        fontSize: 12,
        color: SoundMateLightColors.textSecondary,
    },
    scheduleAction: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: SoundMateLightColors.surfaceLight,
        borderWidth: 1,
        borderColor: SoundMateLightColors.border,
    },
    scheduleActionLive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    scheduleActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: SoundMateLightColors.textPrimary,
    },
    // Forum Item
    forumList: {
        paddingHorizontal: 20,
    },
    forumItem: {
        flexDirection: 'row',
        backgroundColor: SoundMateLightColors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: SoundMateLightColors.border,
    },
    forumAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    forumContent: {
        flex: 1,
    },
    forumHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    forumAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: SoundMateLightColors.textPrimary,
        marginRight: 8,
    },
    forumBadge: {
        backgroundColor: '#55C5F1',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    forumBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    forumTitle: {
        fontSize: 14,
        color: SoundMateLightColors.textPrimary,
        marginBottom: 8,
        lineHeight: 20,
    },
    forumMeta: {
        flexDirection: 'row',
        gap: 16,
    },
    forumMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    forumMetaText: {
        fontSize: 12,
        color: SoundMateLightColors.textSecondary,
    },
    forumAction: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#55C5F1',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    forumActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    // Podcast Card
    podcastCard: {
        width: 160,
        height: 200,
        marginRight: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: SoundMateLightColors.surface,
    },
    podcastImage: {
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
    podcastSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    // Subscription Section
    subscriptionSection: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    subscriptionGradient: {
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
    },
    subscriptionBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 16,
    },
    subscriptionBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    subscriptionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 12,
    },
    subscriptionDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    subscriptionPrice: {
        fontWeight: '700',
        fontSize: 16,
    },
    subscriptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    subscriptionButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#55C5F1',
    },
});
