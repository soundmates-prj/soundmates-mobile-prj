import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { PlaylistItem, PodcastItem } from './HomeScreen.data';
import styles from './HomeScreen.styles';

type AppPalette = typeof SoundMateLightColors | typeof SoundMateColors;

interface SectionHeaderProps {
    title: string;
    titleColor?: string;
    onPressSeeAll?: () => void;
}

export function SectionHeader({ title, titleColor, onPressSeeAll }: SectionHeaderProps) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: titleColor ?? '#55C5F1' }]}>{title}</Text>
            {onPressSeeAll ? (
                <TouchableOpacity activeOpacity={0.7} onPress={onPressSeeAll}>
                    <Text style={styles.seeAllText}>Xem tất cả</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

function formatCompactPlays(value?: number): string {
    if (!value) return '--';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return `${value}`;
}

export function TopHitPlaylistCard({ item, rank }: { item: PlaylistItem; rank: number }) {
    return (
        <TouchableOpacity style={styles.topHitCard} activeOpacity={0.9}>
            <Image source={{ uri: item.image }} style={styles.topHitCardImage} />

            <LinearGradient
                colors={['rgba(2,6,23,0.85)', 'rgba(2,6,23,0.15)']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={styles.topHitCardOverlay}
            />

            <View style={styles.topHitRankBadge}>
                <Text style={styles.topHitRankText}>#{rank}</Text>
            </View>

            <TouchableOpacity style={styles.topHitPlayButton} activeOpacity={0.85}>
                <Ionicons name="play" size={16} color="#FFFFFF" style={styles.playIcon} />
            </TouchableOpacity>

            <View style={styles.topHitMetaWrap}>
                <Text numberOfLines={1} style={styles.topHitTitle}>{item.title}</Text>
                <View style={styles.topHitStatsRow}>
                    <Ionicons name="headset" size={12} color="rgba(255,255,255,0.95)" />
                    <Text style={styles.topHitStatsText}>{formatCompactPlays(item.plays)} listens</Text>
                    <View style={styles.topHitDot} />
                    <Text style={styles.topHitCategoryText}>{item.category}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export function MyPlaylistCard({
    item,
    isDarkMode,
    palette,
}: {
    item: PlaylistItem;
    isDarkMode: boolean;
    palette: AppPalette;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.myPlaylistCard,
                {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                },
            ]}
            activeOpacity={0.9}
        >
            <View style={styles.myPlaylistImageWrap}>
                <Image source={{ uri: item.image }} style={styles.myPlaylistImage} />
                <LinearGradient
                    colors={['rgba(2,6,23,0.7)', 'rgba(2,6,23,0.12)']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={styles.myPlaylistOverlay}
                />

                <View style={styles.myPlaylistCategoryBadge}>
                    <Text style={styles.myPlaylistCategoryText}>{item.category}</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.myPlaylistPlayButton,
                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(37,99,235,0.92)' },
                    ]}
                    activeOpacity={0.85}
                >
                    <Ionicons name="play" size={14} color="#FFFFFF" style={styles.playIcon} />
                </TouchableOpacity>
            </View>

            <View style={styles.myPlaylistMeta}>
                <Text style={[styles.myPlaylistTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={[styles.myPlaylistSubtitle, { color: palette.textSecondary }]} numberOfLines={1}>
                    {item.subtitle}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export function PodcastHotCard({
    item,
    palette,
    isDarkMode,
}: {
    item: PodcastItem;
    palette: AppPalette;
    isDarkMode: boolean;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.podcastHotCard,
                {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                },
            ]}
            activeOpacity={0.9}
        >
            <View style={styles.podcastHotImageWrap}>
                <Image source={{ uri: item.image }} style={styles.podcastHotImage} />
                <LinearGradient
                    colors={['rgba(2,6,23,0.72)', 'rgba(2,6,23,0.08)']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={styles.podcastHotOverlay}
                />

                <TouchableOpacity
                    style={[
                        styles.podcastHotPlayButton,
                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(14,116,144,0.95)' },
                    ]}
                    activeOpacity={0.85}
                >
                    <Ionicons name="play" size={14} color="#FFFFFF" style={styles.playIcon} />
                </TouchableOpacity>
            </View>

            <View style={styles.podcastHotMeta}>
                <Text numberOfLines={1} style={[styles.podcastHotTitle, { color: palette.textPrimary }]}>{item.title}</Text>
                <Text numberOfLines={1} style={[styles.podcastHotHost, { color: palette.textSecondary }]}>{item.host}</Text>
            </View>
        </TouchableOpacity>
    );
}
