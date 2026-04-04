import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FavoriteItemResponse } from '../../../api';

type Palette = {
  primary: string;
  surface: string;
  border: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
};

interface FavoriteItemTypeOption {
  label: string;
  value: string;
}

interface ProfileFavoritesTabProps {
  palette: Palette;
  favoriteItemTypeOptions: readonly FavoriteItemTypeOption[];
  favoriteItemTypeFilter: string;
  onChangeFavoriteItemTypeFilter: (value: string) => void;
  isFavoritesLoading: boolean;
  favoriteItems: FavoriteItemResponse[];
}

export default function ProfileFavoritesTab({
  palette,
  favoriteItemTypeOptions,
  favoriteItemTypeFilter,
  onChangeFavoriteItemTypeFilter,
  isFavoritesLoading,
  favoriteItems,
}: ProfileFavoritesTabProps) {
  return (
    <View style={styles.tabSectionWrap}>
      <View style={[styles.filterSectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.filterSectionLabel, { color: palette.textPrimary }]}>Loại nội dung</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {favoriteItemTypeOptions.map((option) => {
            const isSelected = favoriteItemTypeFilter === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => onChangeFavoriteItemTypeFilter(option.value)}
                style={[
                  styles.filterChip,
                  { borderColor: palette.border, backgroundColor: palette.background },
                  isSelected ? { backgroundColor: palette.primary, borderColor: palette.primary } : null,
                ]}
              >
                <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : palette.textSecondary }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isFavoritesLoading ? (
        <View style={styles.postsLoadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.postsLoadingText, { color: palette.textSecondary }]}>Đang tải nhạc yêu thích...</Text>
        </View>
      ) : favoriteItems.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyStateIcon, { backgroundColor: palette.primary + '1A' }]}>
            <Ionicons name="heart-outline" size={28} color={palette.primary} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: palette.textPrimary }]}>Chưa có mục yêu thích</Text>
          <Text style={[styles.emptyStateSubtitle, { color: palette.textSecondary }]}>Thử đổi bộ lọc hoặc thêm nhạc vào danh sách yêu thích.</Text>
        </View>
      ) : (
        <View style={styles.favoriteListWrap}>
          {favoriteItems.map((item) => (
            <View
              key={item.id}
              style={[styles.favoriteItemCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={[styles.favoriteThumbWrap, { backgroundColor: palette.primary + '1A' }]}>
                {item.imgUrl ? (
                  <Image source={{ uri: item.imgUrl }} style={styles.favoriteThumbImage} />
                ) : (
                  <Ionicons name="musical-note-outline" size={18} color={palette.primary} />
                )}
              </View>

              <View style={styles.favoriteItemMain}>
                <Text style={[styles.favoriteItemName, { color: palette.textPrimary }]} numberOfLines={1}>
                  {item.name?.trim() || item.itemId}
                </Text>
                <Text style={[styles.favoriteItemSub, { color: palette.textSecondary }]} numberOfLines={1}>
                  {item.artistName?.trim() || item.albumName?.trim() || 'Không có thông tin nghệ sĩ'}
                </Text>
                <View style={styles.favoriteMetaRow}>
                  <View style={[styles.favoriteMetaBadge, { backgroundColor: palette.primary + '1F' }]}>
                    <Text style={[styles.favoriteMetaBadgeText, { color: palette.primary }]}>{item.itemType}</Text>
                  </View>
                  <View style={[styles.favoriteMetaBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.favoriteMetaBadgeText, { color: '#16A34A' }]}>{item.source}</Text>
                  </View>
                </View>
              </View>
            </View>
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
  filterSectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipsRow: {
    paddingTop: 8,
    paddingRight: 4,
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
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
  favoriteListWrap: {
    gap: 10,
  },
  favoriteItemCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteThumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  favoriteThumbImage: {
    width: '100%',
    height: '100%',
  },
  favoriteItemMain: {
    flex: 1,
    marginLeft: 10,
  },
  favoriteItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  favoriteItemSub: {
    marginTop: 3,
    fontSize: 12,
  },
  favoriteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  favoriteMetaBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  favoriteMetaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
