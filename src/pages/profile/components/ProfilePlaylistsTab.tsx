import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserPlaylistResponse } from '../../../api';

type Palette = {
  primary: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
};

interface ProfilePlaylistsTabProps {
  palette: Palette;
  userPlaylists: UserPlaylistResponse[];
  isPlaylistsLoading: boolean;
  onOpenCreatePlaylistEditor: () => void;
  onOpenPlaylistDetail: (playlist: UserPlaylistResponse) => void;
  getPlaylistVisibilityLabel: (visibility: number | undefined) => string;
}

export default function ProfilePlaylistsTab({
  palette,
  userPlaylists,
  isPlaylistsLoading,
  onOpenCreatePlaylistEditor,
  onOpenPlaylistDetail,
  getPlaylistVisibilityLabel,
}: ProfilePlaylistsTabProps) {
  return (
    <View style={styles.tabSectionWrap}>
      <View style={styles.tabSectionHeader}>
        <Text style={[styles.tabSectionTitle, { color: palette.textPrimary }]}>Playlist của bạn ({userPlaylists.length})</Text>
        <TouchableOpacity
          style={[styles.smallActionButton, { backgroundColor: palette.primary }]}
          activeOpacity={0.85}
          onPress={onOpenCreatePlaylistEditor}
        >
          <Ionicons name="add" size={15} color="#FFFFFF" />
          <Text style={styles.smallActionButtonText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {isPlaylistsLoading ? (
        <View style={styles.postsLoadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.postsLoadingText, { color: palette.textSecondary }]}>Đang tải playlist...</Text>
        </View>
      ) : userPlaylists.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyStateIcon, { backgroundColor: palette.primary + '1A' }]}>
            <Ionicons name="musical-notes-outline" size={28} color={palette.primary} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: palette.textPrimary }]}>Chưa có playlist nào</Text>
          <Text style={[styles.emptyStateSubtitle, { color: palette.textSecondary }]}>Tạo playlist đầu tiên để lưu danh sách nhạc của bạn.</Text>
        </View>
      ) : (
        <View style={styles.playlistListWrap}>
          {userPlaylists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              activeOpacity={0.9}
              onPress={() => onOpenPlaylistDetail(playlist)}
              style={[styles.playlistItemCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={[styles.playlistThumbWrap, { backgroundColor: palette.primary + '1A' }]}>
                {playlist.thumbnailUrl ? (
                  <Image source={{ uri: playlist.thumbnailUrl }} style={styles.playlistThumbImage} />
                ) : (
                  <Ionicons name="musical-notes" size={18} color={palette.primary} />
                )}
              </View>

              <View style={styles.playlistItemMain}>
                <Text style={[styles.playlistItemName, { color: palette.textPrimary }]} numberOfLines={1}>
                  {playlist.playlistName}
                </Text>
                <Text style={[styles.playlistItemDescription, { color: palette.textSecondary }]} numberOfLines={2}>
                  {playlist.description?.trim() || 'Chưa có mô tả cho playlist này'}
                </Text>
                <View style={styles.playlistItemMetaRow}>
                  <Text style={[styles.playlistItemMetaText, { color: palette.textSecondary }]}>{playlist.totalTracks} bài hát</Text>
                  <Text style={[styles.playlistItemMetaText, { color: palette.textSecondary }]}>•</Text>
                  <Text style={[styles.playlistItemMetaText, { color: palette.textSecondary }]}>
                    {getPlaylistVisibilityLabel(playlist.visibility)}
                  </Text>
                  <Text style={[styles.playlistItemMetaText, { color: playlist.isEnabled ? '#10B981' : '#F59E0B' }]}>
                    {playlist.isEnabled ? 'Đang bật' : 'Đang tắt'}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabSectionWrap: {
    paddingHorizontal: 20,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tabSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  smallActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallActionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  postsLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postsLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  playlistListWrap: {
    gap: 10,
  },
  playlistItemCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playlistThumbImage: {
    width: '100%',
    height: '100%',
  },
  playlistItemMain: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  playlistItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  playlistItemDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
  },
  playlistItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  playlistItemMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
