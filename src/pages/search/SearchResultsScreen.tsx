import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { SpotifyTrack } from '../../api';
import { useTheme } from '../../context/ThemeContext';

export interface SearchResultBundle {
  tracks: SpotifyTrack[];
}

interface SearchResultsScreenProps {
  query: string;
  data: SearchResultBundle | null;
  isLoading: boolean;
  onBackToSuggestions: () => void;
  onOpenSpotifyLink: (url: string) => void;
  onAddFavoriteTrack: (track: SpotifyTrack) => void;
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function SearchResultsScreen({
  query,
  data,
  isLoading,
  onBackToSuggestions,
  onOpenSpotifyLink,
  onAddFavoriteTrack,
}: SearchResultsScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const tracks = data?.tracks || [];

  const totals = useMemo(() => {
    return {
      all: tracks.length,
    };
  }, [tracks.length]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <View style={[styles.metaHeader, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}> 
        <View style={styles.metaTitleWrap}>
          <Text style={[styles.metaTitle, { color: palette.textPrimary }]}>Ket qua cho "{query}"</Text>
          <Text style={[styles.metaSubtitle, { color: palette.textSecondary }]}>{totals.all} ket qua</Text>
        </View>
        {/* <TouchableOpacity activeOpacity={0.8} onPress={onBackToSuggestions}>
          <Text style={[styles.backText, { color: palette.primary }]}>Sua tu khoa</Text>
        </TouchableOpacity> */}
      </View>

      {isLoading ? (
        <View style={styles.centerBlock}>
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Dang tai ket qua...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.bodyContent}>
          {tracks.length > 0 && (
            <>
              <SectionTitle title="Bai hat" />
              {tracks.map((track) => (
                <View
                  key={`track-${track.id}`}
                  style={[styles.mediaRow, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => {
                      if (track.external_urls?.spotify) {
                        onOpenSpotifyLink(track.external_urls.spotify);
                      }
                    }}
                    style={styles.trackMainPressable}
                  >
                    <Image source={{ uri: track.album?.images?.[0]?.url || 'https://i.pravatar.cc/100?img=12' }} style={styles.mediaImage} />
                    <View style={styles.mediaInfo}>
                      <Text numberOfLines={1} style={[styles.mediaTitle, { color: palette.textPrimary }]}>{track.name}</Text>
                      <Text numberOfLines={1} style={[styles.mediaSubtitle, { color: palette.textSecondary }]}>
                        {track.artists?.map((artist) => artist.name).join(', ') || 'Spotify track'}
                      </Text>
                    </View>
                    <Ionicons name="musical-notes-outline" size={18} color={palette.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => onAddFavoriteTrack(track)}
                    style={[styles.addFavoriteButton, { backgroundColor: palette.primary }]}
                  >
                    <Ionicons name="heart" size={14} color="#FFFFFF" />
                    <Text style={styles.addFavoriteText}>Them vao ua thich</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {totals.all === 0 && (
            <View style={styles.emptyStateWrap}>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Khong co ket qua bai hat phu hop.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  metaHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  metaTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  metaSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bodyContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3B82F6',
    marginBottom: 8,
    marginTop: 8,
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  trackMainPressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  mediaInfo: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  mediaSubtitle: {
    fontSize: 12,
  },
  addFavoriteButton: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  addFavoriteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
