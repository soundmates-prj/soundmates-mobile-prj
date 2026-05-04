import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { authService, PodcastResponse, podcastService, UserPlaylistResponse, userPlaylistService, UserProfileFullResponse } from '../../api';
import { useTheme } from '../../context/ThemeContext';

interface PublicProfileScreenProps {
    userId: string;
    onBack: () => void;
    onNavigateToPodcast?: (podcastId: string) => void;
    onNavigateToPlaylist?: (playlist: UserPlaylistResponse) => void;
    onNavigateToPost?: (postId: string) => void;
}

type TabName = 'Podcasts' | 'Playlists';

export default function PublicProfileScreen({
    userId,
    onBack,
    onNavigateToPodcast,
    onNavigateToPlaylist,
    onNavigateToPost,
}: PublicProfileScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();

    const [profile, setProfile] = useState<UserProfileFullResponse | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [activeTab, setActiveTab] = useState<TabName>('Podcasts');

    const [podcasts, setPodcasts] = useState<PodcastResponse[]>([]);
    const [playlists, setPlaylists] = useState<UserPlaylistResponse[]>([]);
    const [isLoadingContent, setIsLoadingContent] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoadingProfile(true);
        setIsLoadingContent(true);
        try {
            // Load Profile
            const profileRes = await authService.getUserPublicProfile(userId);
            if (profileRes.success && profileRes.data) {
                setProfile(profileRes.data);
            }

            // Load Content
            const [podsRes, listsRes] = await Promise.all([
                podcastService.getAll({ createdBy: userId, status: 'Published' }),
                userPlaylistService.getPlaylistsByUserId(userId, true) // isPublicOnly = true
            ]);
            setPodcasts(podsRes || []);
            setPlaylists(listsRes || []);
        } catch (error) {
            console.log('[PublicProfileScreen] Error loading data:', error);
        } finally {
            setIsLoadingProfile(false);
            setIsLoadingContent(false);
        }
    }, [userId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoadingProfile) {
        return (
            <View style={[styles.container, { backgroundColor: palette.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={palette.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { backgroundColor: palette.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color={palette.textPrimary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="person-outline" size={64} color={palette.textMuted} />
                    <Text style={[styles.errorText, { color: palette.textSecondary }]}>Không tìm thấy người dùng này.</Text>
                </View>
            </View>
        );
    }

    const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || 'Người dùng';

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color={palette.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{profile.username}</Text>
                <View style={styles.iconButton} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* ── Cover & Avatar ── */}
                <View style={styles.coverContainer}>
                    {profile.backgroundImageUrl ? (
                        <Image source={{ uri: profile.backgroundImageUrl }} style={styles.coverImage} />
                    ) : (
                        <View style={[styles.coverImage, { backgroundColor: palette.primary + '20' }]} />
                    )}
                    <View style={styles.avatarContainer}>
                        {profile.profileImageUrl ? (
                            <Image source={{ uri: profile.profileImageUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' }]}>
                                <Ionicons name="person" size={40} color={palette.textMuted} />
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Profile Info ── */}
                <View style={styles.infoContainer}>
                    <Text style={[styles.nameText, { color: palette.textPrimary }]}>{displayName}</Text>
                    <Text style={[styles.usernameText, { color: palette.textSecondary }]}>@{profile.username} {profile.roleName ? `• ${profile.roleName}` : ''}</Text>
                    {profile.bio ? (
                        <Text style={[styles.bioText, { color: palette.textPrimary }]}>{profile.bio}</Text>
                    ) : null}
                </View>

                {/* ── Tabs ── */}
                <View style={[styles.tabBar, { borderBottomColor: palette.border }]}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'Podcasts' && { borderBottomColor: palette.primary }]}
                        onPress={() => setActiveTab('Podcasts')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'Podcasts' ? palette.primary : palette.textSecondary }]}>
                            Podcasts
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'Playlists' && { borderBottomColor: palette.primary }]}
                        onPress={() => setActiveTab('Playlists')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'Playlists' ? palette.primary : palette.textSecondary }]}>
                            Playlists
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Content ── */}
                <View style={styles.contentContainer}>
                    {isLoadingContent ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="small" color={palette.primary} />
                        </View>
                    ) : activeTab === 'Podcasts' ? (
                        podcasts.length > 0 ? (
                            podcasts.map((pod) => (
                                <TouchableOpacity
                                    key={pod.id}
                                    style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                                    onPress={() => onNavigateToPodcast?.(pod.id)}
                                >
                                    <Image source={{ uri: pod.banner || 'https://i.pravatar.cc/100' }} style={styles.cardImage} />
                                    <View style={styles.cardInfo}>
                                        <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.textPrimary }]}>{pod.title}</Text>
                                        <Text numberOfLines={1} style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
                                            {pod.episodeCount} tập • {pod.isPaid ? (pod.price ? `${pod.price.toLocaleString('vi-VN')}đ` : 'Trả phí') : 'Miễn phí'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.centerContainer}>
                                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có podcast nào.</Text>
                            </View>
                        )
                    ) : playlists.length > 0 ? (
                        playlists.map((pl) => (
                            <TouchableOpacity
                                key={pl.id}
                                style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
                                onPress={() => onNavigateToPlaylist?.(pl)}
                            >
                                <Image source={{ uri: pl.thumbnailUrl || 'https://i.pravatar.cc/100' }} style={styles.cardImage} />
                                <View style={styles.cardInfo}>
                                    <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.textPrimary }]}>{pl.playlistName}</Text>
                                    <Text numberOfLines={1} style={[styles.cardSubtitle, { color: palette.textSecondary }]}>{pl.totalTracks} bài hát</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.centerContainer}>
                            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có playlist công khai.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
    },
    coverContainer: {
        height: 180,
        position: 'relative',
        marginBottom: 60,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    avatarContainer: {
        position: 'absolute',
        bottom: -50,
        left: 20,
        padding: 4,
        backgroundColor: '#fff',
        borderRadius: 50,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    infoContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    usernameText: {
        fontSize: 15,
        marginBottom: 12,
    },
    bioText: {
        fontSize: 14,
        lineHeight: 20,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    centerContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
    },
    card: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        alignItems: 'center',
    },
    cardImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#e2e8f0',
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
    },
});
