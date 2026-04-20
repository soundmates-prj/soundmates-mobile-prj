import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../../constants/theme';
import {
  MusicCatalogItemResponse,
  PlaylistTrackResponse,
  PlaylistVisibility,
  uploadService,
  UserPlaylistResponse,
  userPlaylistService,
} from '../../../api';
import FormTextField from '../../../components/ui/FormTextField';
import MiniPlayer from '../../../components/player/MiniPlayer';
import { showToast } from '../../../components/ui/Toast';
import { useAudioPlayer } from '../../../context/AudioPlayerContext';
import { useTheme } from '../../../context/ThemeContext';

interface PlaylistDetailModalProps {
  visible: boolean;
  playlistId: string | null;
  initialPlaylist: UserPlaylistResponse | null;
  onClose: () => void;
  onPlaylistsChanged?: () => Promise<void> | void;
  onPlaylistDeleted?: (playlistId: string) => Promise<void> | void;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizePlaylistVisibility = (
  visibility: number | undefined,
): PlaylistVisibility => {
  if (visibility === 0 || visibility === 2) {
    return visibility;
  }

  return 1;
};

const getPlaylistVisibilityLabel = (visibility: number | undefined): string => {
  const normalized = normalizePlaylistVisibility(visibility);
  if (normalized === 0) return 'Công khai';
  if (normalized === 2) return 'Không liệt kê';
  return 'Riêng tư';
};

const formatDurationSeconds = (value?: number): string => {
  const total = Number.isFinite(value) ? Math.max(0, Math.floor(value || 0)) : 0;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
};

const isValidMediaId = (mediaId?: string): mediaId is string => {
  return !!mediaId && uuidRegex.test(mediaId);
};

export default function PlaylistDetailModal({
  visible,
  playlistId,
  initialPlaylist,
  onClose,
  onPlaylistsChanged,
  onPlaylistDeleted,
}: PlaylistDetailModalProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  const { loadTrack, activeTrack, isPlaying } = useAudioPlayer();

  const [playlistDetail, setPlaylistDetail] = useState<UserPlaylistResponse | null>(
    initialPlaylist,
  );
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrackResponse[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [showAddTracksModal, setShowAddTracksModal] = useState(false);
  const [catalogTracks, setCatalogTracks] = useState<MusicCatalogItemResponse[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogMediaIds, setSelectedCatalogMediaIds] = useState<string[]>([]);
  const [isLoadingCatalogTracks, setIsLoadingCatalogTracks] = useState(false);
  const [isSubmittingTracks, setIsSubmittingTracks] = useState(false);

  const handlePlayTrack = useCallback(async (track: PlaylistTrackResponse) => {
    try {
      let catalog = catalogTracks;
      if (catalog.length === 0) {
        showToast.info('Đang tải bài hát...', '');
        const res = await userPlaylistService.getMusicCatalog();
        if (res.success && res.data) {
          catalog = res.data;
          setCatalogTracks(res.data);
        }
      }
      
      const fileData = catalog.find((c) => c.id === track.mediaFileId);
      if (!fileData?.fileUrl) {
        showToast.warning('Lỗi', 'Không tìm thấy tệp âm thanh của bài hát này.');
        return;
      }
      
      loadTrack({
        id: track.id,
        url: fileData.fileUrl,
        title: track.title,
        artist: track.artist || 'Không rõ nghệ sĩ',
        artUrl: fileData.artworkUrl || playlistDetail?.thumbnailUrl || '',
        duration: track.durationSeconds,
        type: 'playlist'
      });
    } catch (error) {
      showToast.error('Lỗi', 'Không thể phát bài hát này.');
    }
  }, [catalogTracks, loadTrack, playlistDetail]);

  const [showPlaylistEditor, setShowPlaylistEditor] = useState(false);
  const [playlistNameInput, setPlaylistNameInput] = useState('');
  const [playlistDescriptionInput, setPlaylistDescriptionInput] = useState('');
  const [playlistThumbnailInput, setPlaylistThumbnailInput] = useState('');
  const [playlistVisibilityInput, setPlaylistVisibilityInput] =
    useState<PlaylistVisibility>(1);
  const [playlistEnabledInput, setPlaylistEnabledInput] = useState(true);
  const [isUploadingPlaylistThumbnail, setIsUploadingPlaylistThumbnail] =
    useState(false);
  const [showPlaylistThumbnailOptions, setShowPlaylistThumbnailOptions] =
    useState(false);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setPlaylistDetail(initialPlaylist);
  }, [visible, initialPlaylist]);

  const loadDetail = useCallback(async () => {
    if (!playlistId) return;

    setIsLoadingDetail(true);
    try {
      const [playlistResult, trackResult] = await Promise.all([
        userPlaylistService.getPlaylistById(playlistId),
        userPlaylistService.getPlaylistTracks(playlistId),
      ]);

      if (!playlistResult.success || !playlistResult.data) {
        showToast.warning(
          'Không thể tải playlist',
          playlistResult.message || 'Vui lòng thử lại sau',
        );
        return;
      }

      setPlaylistDetail(playlistResult.data);

      if (trackResult.success) {
        setPlaylistTracks(trackResult.data);
      } else {
        setPlaylistTracks([]);
        showToast.warning(
          'Không thể tải danh sách bài hát',
          trackResult.message || 'Vui lòng thử lại sau',
        );
      }
    } catch (error) {
      console.log('[PlaylistDetailModal] loadDetail error:', error);
      showToast.error('Không thể tải playlist', 'Vui lòng thử lại sau');
    } finally {
      setIsLoadingDetail(false);
    }
  }, [playlistId]);

  useEffect(() => {
    if (!visible || !playlistId) {
      return;
    }

    void loadDetail();
  }, [loadDetail, playlistId, visible]);

  const resetEditorForm = useCallback(() => {
    setPlaylistNameInput('');
    setPlaylistDescriptionInput('');
    setPlaylistThumbnailInput('');
    setPlaylistVisibilityInput(1);
    setPlaylistEnabledInput(true);
    setShowPlaylistThumbnailOptions(false);
  }, []);

  const openEditor = useCallback(() => {
    if (!playlistDetail) {
      return;
    }

    setPlaylistNameInput(playlistDetail.playlistName || '');
    setPlaylistDescriptionInput(playlistDetail.description || '');
    setPlaylistThumbnailInput(playlistDetail.thumbnailUrl || '');
    setPlaylistVisibilityInput(normalizePlaylistVisibility(playlistDetail.visibility));
    setPlaylistEnabledInput(playlistDetail.isEnabled);
    setShowPlaylistEditor(true);
  }, [playlistDetail]);

  const closeEditor = useCallback(() => {
    if (isSavingPlaylist || isUploadingPlaylistThumbnail) return;
    setShowPlaylistEditor(false);
    resetEditorForm();
  }, [isSavingPlaylist, isUploadingPlaylistThumbnail, resetEditorForm]);

  const promptOpenSettings = useCallback((message: string) => {
    Alert.alert(
      'Cần cấp quyền',
      message,
      [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Mở cài đặt', onPress: () => Linking.openSettings() },
      ],
      { cancelable: true },
    );
  }, []);

  const uploadPlaylistThumbnailAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      setIsUploadingPlaylistThumbnail(true);
      try {
        const uploadResult = await uploadService.uploadImageToCloudinary({
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        });

        if (!uploadResult.success || !uploadResult.data) {
          throw new Error(uploadResult.message || 'Upload ảnh thất bại');
        }

        setPlaylistThumbnailInput(uploadResult.data);
        showToast.success('Tải ảnh thành công', 'Ảnh bìa playlist đã được cập nhật');
      } catch (error: any) {
        showToast.error('Không thể tải ảnh', error?.message || 'Vui lòng thử lại sau');
      } finally {
        setIsUploadingPlaylistThumbnail(false);
      }
    },
    [],
  );

  const pickPlaylistThumbnailFromLibrary = useCallback(async () => {
    if (isUploadingPlaylistThumbnail) return;
    setShowPlaylistThumbnailOptions(false);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          promptOpenSettings(
            'Vui lòng cấp quyền thư viện ảnh trong Cài đặt để chọn ảnh bìa playlist.',
          );
          return;
        }

        showToast.warning(
          'Chưa có quyền truy cập',
          'Vui lòng cấp quyền thư viện ảnh để tiếp tục',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]) {
        await uploadPlaylistThumbnailAsset(result.assets[0]);
      }
    } catch {
      showToast.error('Không thể chọn ảnh', 'Vui lòng thử lại sau');
    }
  }, [isUploadingPlaylistThumbnail, promptOpenSettings, uploadPlaylistThumbnailAsset]);

  const takePlaylistThumbnailPhoto = useCallback(async () => {
    if (isUploadingPlaylistThumbnail) return;
    setShowPlaylistThumbnailOptions(false);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          promptOpenSettings(
            'Vui lòng cấp quyền camera trong Cài đặt để chụp ảnh bìa playlist.',
          );
          return;
        }

        showToast.warning('Chưa có quyền camera', 'Vui lòng cấp quyền camera để chụp ảnh');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]) {
        await uploadPlaylistThumbnailAsset(result.assets[0]);
      }
    } catch {
      showToast.error('Không thể mở camera', 'Vui lòng thử lại sau');
    }
  }, [isUploadingPlaylistThumbnail, promptOpenSettings, uploadPlaylistThumbnailAsset]);

  const removePlaylistThumbnail = useCallback(() => {
    if (isUploadingPlaylistThumbnail) return;
    setPlaylistThumbnailInput('');
    setShowPlaylistThumbnailOptions(false);
  }, [isUploadingPlaylistThumbnail]);

  const handleSavePlaylist = useCallback(async () => {
    if (!playlistId || !playlistDetail) {
      return;
    }

    const playlistName = playlistNameInput.trim();
    const playlistThumbnailUrl = playlistThumbnailInput.trim();

    if (isUploadingPlaylistThumbnail) {
      showToast.warning('Ảnh đang được tải lên', 'Vui lòng đợi tải ảnh thumbnail hoàn tất');
      return;
    }

    if (playlistName.length < 2) {
      showToast.warning('Tên playlist chưa hợp lệ', 'Tên playlist phải có ít nhất 2 ký tự');
      return;
    }

    setIsSavingPlaylist(true);
    try {
      const result = await userPlaylistService.updateUserPlaylist(playlistId, {
        playlistName,
        description: playlistDescriptionInput.trim() || undefined,
        thumbnailUrl: playlistThumbnailUrl || undefined,
        visibility: playlistVisibilityInput,
        isEnabled: playlistEnabledInput,
      });

      if (!result.success) {
        throw new Error(result.message || 'Không thể cập nhật playlist');
      }

      showToast.success('Đã cập nhật playlist', 'Thông tin playlist đã được lưu');
      setShowPlaylistEditor(false);
      resetEditorForm();
      await Promise.all([loadDetail(), onPlaylistsChanged?.()]);
    } catch (error: any) {
      showToast.error('Lưu playlist thất bại', error?.message || 'Vui lòng thử lại sau');
    } finally {
      setIsSavingPlaylist(false);
    }
  }, [
    isUploadingPlaylistThumbnail,
    loadDetail,
    onPlaylistsChanged,
    playlistDescriptionInput,
    playlistDetail,
    playlistEnabledInput,
    playlistId,
    playlistNameInput,
    playlistThumbnailInput,
    playlistVisibilityInput,
    resetEditorForm,
  ]);

  const handleDeletePlaylist = useCallback(() => {
    if (!playlistId || !playlistDetail) {
      return;
    }

    Alert.alert(
      'Xóa playlist',
      `Bạn có chắc chắn muốn xóa playlist "${playlistDetail.playlistName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const result = await userPlaylistService.deleteUserPlaylist(playlistId);
            if (!result.success) {
              showToast.error(
                'Xóa playlist thất bại',
                result.message || 'Vui lòng thử lại sau',
              );
              return;
            }

            showToast.success('Đã xóa playlist', 'Playlist đã được xóa khỏi thư viện của bạn');
            await Promise.all([onPlaylistDeleted?.(playlistId), onPlaylistsChanged?.()]);
            onClose();
          },
        },
      ],
    );
  }, [onClose, onPlaylistDeleted, onPlaylistsChanged, playlistDetail, playlistId]);

  const loadMusicCatalogTracks = useCallback(async () => {
    setIsLoadingCatalogTracks(true);
    try {
      const result = await userPlaylistService.getMusicCatalog();

      if (!result.success) {
        showToast.warning(
          'Không thể tải kho nhạc hệ thống',
          result.message || 'Vui lòng thử lại sau',
        );
        setCatalogTracks([]);
        return;
      }

      setCatalogTracks(result.data);
    } catch (error) {
      console.log('[PlaylistDetailModal] loadMusicCatalogTracks error:', error);
      setCatalogTracks([]);
      showToast.error('Không thể tải kho nhạc hệ thống', 'Vui lòng thử lại sau');
    } finally {
      setIsLoadingCatalogTracks(false);
    }
  }, []);

  const openAddTrackModal = useCallback(async () => {
    setShowAddTracksModal(true);
    setCatalogSearch('');
    setSelectedCatalogMediaIds([]);
    await loadMusicCatalogTracks();
  }, [loadMusicCatalogTracks]);

  const playlistTrackMediaIds = useMemo(() => {
    return new Set(playlistTracks.map((track) => track.mediaFileId));
  }, [playlistTracks]);

  const filteredCatalogTracks = useMemo(() => {
    const keyword = catalogSearch.trim().toLowerCase();

    return catalogTracks.filter((track) => {
      const mediaId = track.id;
      if (isValidMediaId(mediaId) && playlistTrackMediaIds.has(mediaId)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = `${track.title || ''} ${track.artist || ''} ${track.album || ''}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [catalogSearch, catalogTracks, playlistTrackMediaIds]);

  const toggleCatalogSelection = useCallback((catalogItem: MusicCatalogItemResponse) => {
    if (!isValidMediaId(catalogItem.id)) {
      return;
    }

    const mediaId = catalogItem.id;
    if (playlistTrackMediaIds.has(mediaId)) {
      return;
    }

    setSelectedCatalogMediaIds((prev) => {
      if (prev.includes(mediaId)) {
        return prev.filter((id) => id !== mediaId);
      }

      return [...prev, mediaId];
    });
  }, [playlistTrackMediaIds]);

  const handleAddCatalogTracksToPlaylist = useCallback(async () => {
    if (!playlistId || selectedCatalogMediaIds.length === 0) {
      return;
    }

    setIsSubmittingTracks(true);
    try {
      const result = await userPlaylistService.addTracksToPlaylist(
        playlistId,
        selectedCatalogMediaIds,
      );
      if (!result.success) {
        throw new Error(result.message || 'Không thể thêm bài hát vào playlist');
      }

      showToast.success(
        'Đã thêm bài hát',
        `Đã thêm ${selectedCatalogMediaIds.length} bài hát vào playlist`,
      );

      setShowAddTracksModal(false);
      setSelectedCatalogMediaIds([]);
      await Promise.all([loadDetail(), onPlaylistsChanged?.()]);
    } catch (error: any) {
      showToast.error('Thêm bài hát thất bại', error?.message || 'Vui lòng thử lại sau');
    } finally {
      setIsSubmittingTracks(false);
    }
  }, [loadDetail, onPlaylistsChanged, playlistId, selectedCatalogMediaIds]);

  const handleRemoveTrack = useCallback((track: PlaylistTrackResponse) => {
    if (!playlistId) {
      return;
    }

    Alert.alert(
      'Xóa bài hát',
      `Bạn có muốn xóa "${track.title}" khỏi playlist không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const result = await userPlaylistService.removeTracksFromPlaylist(playlistId, [
              track.mediaFileId,
            ]);

            if (!result.success) {
              showToast.error(
                'Xóa bài hát thất bại',
                result.message || 'Vui lòng thử lại sau',
              );
              return;
            }

            showToast.success('Đã xóa bài hát', 'Bài hát đã được gỡ khỏi playlist');
            await Promise.all([loadDetail(), onPlaylistsChanged?.()]);
          },
        },
      ],
    );
  }, [loadDetail, onPlaylistsChanged, playlistId]);

  const handleRequestClose = useCallback(() => {
    if (showPlaylistThumbnailOptions) {
      setShowPlaylistThumbnailOptions(false);
      return;
    }

    if (showPlaylistEditor) {
      closeEditor();
      return;
    }

    if (showAddTracksModal) {
      if (!isSubmittingTracks) {
        setShowAddTracksModal(false);
      }
      return;
    }

    onClose();
  }, [
    closeEditor,
    isSubmittingTracks,
    onClose,
    showAddTracksModal,
    showPlaylistEditor,
    showPlaylistThumbnailOptions,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleRequestClose}
      >
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: palette.background }]}
              onPress={onClose}
            >
              <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Chi tiết playlist</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: palette.background }]}
                onPress={openEditor}
                disabled={!playlistDetail}
              >
                <Ionicons name="create-outline" size={18} color={palette.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: '#FEE2E2' }]}
                onPress={handleDeletePlaylist}
                disabled={!playlistDetail}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>

          {!playlistDetail && isLoadingDetail ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải playlist...</Text>
            </View>
          ) : !playlistDetail ? (
            <View style={styles.loadingWrap}>
              <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Không tìm thấy playlist</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isLoadingDetail}
                  onRefresh={() => void loadDetail()}
                  colors={[palette.primary]}
                  tintColor={palette.primary}
                />
              }
            >
              <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[styles.heroThumb, { backgroundColor: palette.primary + '1A' }]}>
                  {playlistDetail.thumbnailUrl ? (
                    <Image source={{ uri: playlistDetail.thumbnailUrl }} style={styles.heroThumbImage} />
                  ) : (
                    <Ionicons name="musical-notes" size={32} color={palette.primary} />
                  )}
                </View>

                <View style={styles.heroContent}>
                  <Text style={[styles.heroTitle, { color: palette.textPrimary }]} numberOfLines={2}>
                    {playlistDetail.playlistName}
                  </Text>
                  <Text style={[styles.heroDesc, { color: palette.textSecondary }]} numberOfLines={3}>
                    {playlistDetail.description?.trim() || 'Chưa có mô tả cho playlist này'}
                  </Text>

                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: palette.primary + '18' }]}>
                      <Text style={[styles.badgeText, { color: palette.primary }]}>
                        {playlistDetail.totalTracks} bài hát
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#E2E8F0' }]}>
                      <Text style={[styles.badgeText, { color: '#475569' }]}>
                        {getPlaylistVisibilityLabel(playlistDetail.visibility)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: playlistDetail.isEnabled ? '#DCFCE7' : '#FEF3C7' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: playlistDetail.isEnabled ? '#15803D' : '#B45309' },
                        ]}
                      >
                        {playlistDetail.isEnabled ? 'Đang bật' : 'Đang tắt'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Danh sách bài hát</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {playlistTracks.length > 0 && (
                      <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: palette.primary, paddingHorizontal: 12 }]}
                        onPress={() => void handlePlayTrack(playlistTracks[0])}
                      >
                        <Ionicons name="play" size={14} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>Phát</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: palette.primary, paddingHorizontal: 12 }]}
                      onPress={() => void openAddTrackModal()}
                    >
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                      <Text style={styles.addButtonText}>Thêm nhạc</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isLoadingDetail && playlistTracks.length === 0 ? (
                  <View style={styles.centerWrap}>
                    <ActivityIndicator size="small" color={palette.primary} />
                    <Text style={[styles.centerText, { color: palette.textSecondary }]}>Đang tải bài hát...</Text>
                  </View>
                ) : playlistTracks.length === 0 ? (
                  <View style={styles.centerWrap}>
                    <Ionicons name="musical-note-outline" size={24} color={palette.textMuted} />
                    <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>Playlist chưa có bài hát nào.</Text>
                    <Text style={[styles.emptyHint, { color: palette.textMuted }]}>Nhấn "Thêm nhạc" để thêm bài hát từ kho nhạc hệ thống.</Text>
                  </View>
                ) : (
                  <View style={styles.trackList}>
                    {playlistTracks.map((track, index) => {
                      const isThisTrack = activeTrack?.id === track.id;
                      return (
                      <TouchableOpacity
                        key={track.id}
                        activeOpacity={0.8}
                        onPress={() => void handlePlayTrack(track)}
                        style={[
                          styles.trackItem,
                          { borderBottomColor: palette.border },
                          index === playlistTracks.length - 1 ? styles.trackItemLast : null,
                        ]}
                      >
                        <View style={[styles.trackIndexBubble, { backgroundColor: isThisTrack ? palette.primary : palette.primary + '1A' }]}>
                          {isThisTrack && isPlaying ? (
                            <Ionicons name="stats-chart" size={12} color="#FFFFFF" />
                          ) : isThisTrack && !isPlaying ? (
                            <Ionicons name="pause" size={12} color="#FFFFFF" />
                          ) : (
                            <Ionicons name="play" size={12} color={palette.primary} style={{ marginLeft: 2 }} />
                          )}
                        </View>

                        <View style={styles.trackInfo}>
                          <Text style={[styles.trackTitle, { color: isThisTrack ? palette.primary : palette.textPrimary }]} numberOfLines={1}>
                            {track.title}
                          </Text>
                          <Text style={[styles.trackSub, { color: palette.textSecondary }]} numberOfLines={1}>
                            {track.artist?.trim() || 'Không rõ nghệ sĩ'}
                            {/* {track.album ? ` • ${track.album}` : ''} */}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.trackRemoveButton}
                          onPress={() => handleRemoveTrack(track)}
                        >
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {showAddTracksModal && (
            <View style={styles.sheetOverlay}>
              <Pressable
                style={styles.sheetBackdrop}
                onPress={() => {
                  if (!isSubmittingTracks) {
                    setShowAddTracksModal(false);
                  }
                }}
              />

              <View style={[styles.sheetCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.sheetHandle}>
                  <View style={[styles.sheetHandleBar, { backgroundColor: palette.border }]} />
                </View>

                <View style={[styles.sheetHeader, { borderBottomColor: palette.border }]}>
                  <Text style={[styles.sheetTitle, { color: palette.textPrimary }]}>Thêm nhạc từ kho hệ thống</Text>
                  <TouchableOpacity
                    onPress={() => setShowAddTracksModal(false)}
                    disabled={isSubmittingTracks}
                  >
                    <Ionicons name="close" size={18} color={palette.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.sheetBody}>
                  <FormTextField
                    value={catalogSearch}
                    onChangeText={setCatalogSearch}
                    placeholder="Tìm theo tên bài hát, nghệ sĩ, album"
                    placeholderTextColor={palette.textMuted}
                    inputContainerStyle={[
                      styles.input,
                      { borderColor: palette.border, backgroundColor: palette.background },
                    ]}
                    style={[styles.inputText, { color: palette.textPrimary }]}
                  />

                  {isLoadingCatalogTracks ? (
                    <View style={styles.centerWrap}>
                      <ActivityIndicator size="small" color={palette.primary} />
                      <Text style={[styles.centerText, { color: palette.textSecondary }]}>Đang tải kho nhạc hệ thống...</Text>
                    </View>
                  ) : filteredCatalogTracks.length === 0 ? (
                    <View style={styles.centerWrap}>
                      <Ionicons name="search-outline" size={22} color={palette.textMuted} />
                      <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>Không có bài hát phù hợp</Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.addList} contentContainerStyle={styles.addListContent}>
                      {filteredCatalogTracks.map((track) => {
                        const mediaId = track.id;
                        const canAdd = isValidMediaId(mediaId);
                        const alreadyAdded = canAdd && playlistTrackMediaIds.has(mediaId);
                        const selected = canAdd && selectedCatalogMediaIds.includes(mediaId);

                        return (
                          <TouchableOpacity
                            key={track.id}
                            activeOpacity={0.85}
                            style={[styles.addItem, { borderBottomColor: palette.border }]}
                            onPress={() => toggleCatalogSelection(track)}
                            disabled={!canAdd || alreadyAdded}
                          >
                            <View style={[styles.addThumbWrap, { backgroundColor: palette.primary + '1A' }]}>
                              {track.artworkUrl ? (
                                <Image source={{ uri: track.artworkUrl }} style={styles.addThumbImage} />
                              ) : (
                                <Ionicons name="musical-note-outline" size={16} color={palette.primary} />
                              )}
                            </View>

                            <View style={styles.addInfo}>
                              <Text style={[styles.addTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                                {track.title?.trim() || track.id}
                              </Text>
                              <Text style={[styles.addSub, { color: palette.textSecondary }]} numberOfLines={1}>
                                {track.artist?.trim() || 'Không rõ nghệ sĩ'}
                                {track.album ? ` • ${track.album}` : ''}
                              </Text>
                              <Text style={[styles.addHint, { color: canAdd ? '#16A34A' : '#DC2626' }]}>
                                {alreadyAdded
                                  ? 'Đã có trong playlist'
                                  : canAdd
                                    ? 'Sẵn sàng thêm vào playlist'
                                    : 'Không hỗ trợ thêm (ID không phải UUID)'}
                              </Text>
                            </View>

                            <Ionicons
                              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                              size={20}
                              color={selected ? '#10B981' : palette.textMuted}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                <View style={[styles.sheetFooter, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
                  <TouchableOpacity
                    style={[styles.footerButton, styles.cancelButton, { borderColor: palette.border }]}
                    onPress={() => setShowAddTracksModal(false)}
                    disabled={isSubmittingTracks}
                  >
                    <Text style={[styles.cancelButtonText, { color: palette.textSecondary }]}>Đóng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.footerButton,
                      styles.saveButton,
                      {
                        backgroundColor:
                          selectedCatalogMediaIds.length > 0 ? palette.primary : palette.border,
                      },
                    ]}
                    onPress={handleAddCatalogTracksToPlaylist}
                    disabled={isSubmittingTracks || selectedCatalogMediaIds.length === 0}
                  >
                    {isSubmittingTracks ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        Thêm {selectedCatalogMediaIds.length > 0 ? `(${selectedCatalogMediaIds.length})` : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {showPlaylistEditor && (
            <View style={styles.sheetOverlay}>
              <Pressable style={styles.sheetBackdrop} onPress={closeEditor} />

              <KeyboardAvoidingView
                style={styles.sheetKeyboardWrap}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
              >
                <View style={[styles.sheetCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={styles.sheetHandle}>
                    <View style={[styles.sheetHandleBar, { backgroundColor: palette.border }]} />
                  </View>

                  <View style={[styles.sheetHeader, { borderBottomColor: palette.border }]}>
                    <Text style={[styles.sheetTitle, { color: palette.textPrimary }]}>Chỉnh sửa playlist</Text>
                    <TouchableOpacity onPress={closeEditor} disabled={isSavingPlaylist || isUploadingPlaylistThumbnail}>
                      <Ionicons name="close" size={18} color={palette.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.sheetScroll}
                    contentContainerStyle={styles.sheetScrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.editorBody}>
                      <Text style={[styles.editorLabel, { color: palette.textSecondary }]}>Tên playlist</Text>
                      <FormTextField
                        value={playlistNameInput}
                        onChangeText={setPlaylistNameInput}
                        placeholder="Nhập tên playlist"
                        placeholderTextColor={palette.textMuted}
                        inputContainerStyle={[
                          styles.input,
                          { borderColor: palette.border, backgroundColor: palette.background },
                        ]}
                        style={[styles.inputText, { color: palette.textPrimary }]}
                      />

                      <Text style={[styles.editorLabel, styles.sectionGap, { color: palette.textSecondary }]}>Mô tả</Text>
                      <FormTextField
                        value={playlistDescriptionInput}
                        onChangeText={setPlaylistDescriptionInput}
                        placeholder="Mô tả ngắn cho playlist (không bắt buộc)"
                        placeholderTextColor={palette.textMuted}
                        multiline
                        numberOfLines={3}
                        inputContainerStyle={[
                          styles.input,
                          styles.inputMultiline,
                          { borderColor: palette.border, backgroundColor: palette.background },
                        ]}
                        style={[styles.inputText, styles.inputTextMultiline, { color: palette.textPrimary }]}
                      />

                      <Text style={[styles.editorLabel, styles.sectionGap, { color: palette.textSecondary }]}>Ảnh bìa playlist</Text>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setShowPlaylistThumbnailOptions(true)}
                        disabled={isUploadingPlaylistThumbnail}
                        style={[styles.thumbnailPreview, { borderColor: palette.border, backgroundColor: palette.background }]}
                      >
                        {playlistThumbnailInput ? (
                          <Image source={{ uri: playlistThumbnailInput }} style={styles.thumbnailImage} />
                        ) : (
                          <View style={styles.thumbnailEmpty}>
                            <Ionicons name="image-outline" size={24} color={palette.textMuted} />
                            <Text style={[styles.thumbnailEmptyText, { color: palette.textMuted }]}>Nhấn để chọn ảnh bìa</Text>
                          </View>
                        )}

                        <View style={styles.thumbnailEditBadge}>
                          <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                        </View>

                        {isUploadingPlaylistThumbnail && (
                          <View style={styles.thumbnailLoadingOverlay}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>

                      <View style={styles.visibilityRow}>
                        <Text style={[styles.visibilityText, { color: palette.textSecondary }]}>Hãy công khai playlist này</Text>
                        <Switch
                          value={playlistVisibilityInput === 0}
                          onValueChange={(nextValue) => setPlaylistVisibilityInput(nextValue ? 0 : 1)}
                          thumbColor={playlistVisibilityInput === 0 ? '#FFFFFF' : '#F3F4F6'}
                          trackColor={{ false: '#F59E0B66', true: '#10B98199' }}
                          ios_backgroundColor="#F59E0B66"
                        />
                      </View>
                    </View>
                  </ScrollView>

                  <View style={[styles.sheetFooter, { borderTopColor: palette.border }]}>
                    <TouchableOpacity
                      style={[styles.footerButton, styles.cancelButton, { borderColor: palette.border }]}
                      onPress={closeEditor}
                      disabled={isSavingPlaylist || isUploadingPlaylistThumbnail}
                    >
                      <Text style={[styles.cancelButtonText, { color: palette.textSecondary }]}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.footerButton, styles.saveButton, { backgroundColor: palette.primary }]}
                      onPress={handleSavePlaylist}
                      disabled={isSavingPlaylist || isUploadingPlaylistThumbnail}
                    >
                      {isSavingPlaylist || isUploadingPlaylistThumbnail ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          )}

          {showPlaylistThumbnailOptions && (
            <View style={styles.popupOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowPlaylistThumbnailOptions(false)}
              />

              <View style={[styles.popupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[styles.sheetHeader, { borderBottomColor: palette.border }]}>
                  <Text style={[styles.sheetTitle, { color: palette.textPrimary }]}>Ảnh bìa playlist</Text>
                  <TouchableOpacity onPress={() => setShowPlaylistThumbnailOptions(false)}>
                    <Ionicons name="close" size={18} color={palette.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.popupOption, { borderBottomColor: palette.border }]}
                  onPress={() => void pickPlaylistThumbnailFromLibrary()}
                  disabled={isUploadingPlaylistThumbnail}
                >
                  <Ionicons name="images-outline" size={18} color="#55C5F1" />
                  <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Chọn ảnh từ thư viện</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.popupOption, { borderBottomColor: palette.border }]}
                  onPress={() => void takePlaylistThumbnailPhoto()}
                  disabled={isUploadingPlaylistThumbnail}
                >
                  <Ionicons name="camera-outline" size={18} color="#A78BFA" />
                  <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Chụp ảnh mới</Text>
                </TouchableOpacity>

                {!!playlistThumbnailInput && (
                  <TouchableOpacity
                    style={[styles.popupOption, { borderBottomColor: palette.border }]}
                    onPress={removePlaylistThumbnail}
                    disabled={isUploadingPlaylistThumbnail}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[styles.popupOptionText, styles.popupOptionDangerText]}>Xóa ảnh bìa</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <MiniPlayer />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroThumb: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroThumbImage: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    flex: 1,
    marginLeft: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  heroDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  badgeRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  centerText: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  trackList: {
    gap: 2,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  trackItemLast: {
    borderBottomWidth: 0,
  },
  trackIndexBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  trackIndexText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  trackSub: {
    marginTop: 2,
    fontSize: 11,
  },
  trackDuration: {
    fontSize: 11,
    marginLeft: 8,
    minWidth: 34,
    textAlign: 'right',
  },
  trackRemoveButton: {
    marginLeft: 8,
    padding: 2,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    zIndex: 40,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetKeyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  sheetHandleBar: {
    width: 46,
    height: 4,
    borderRadius: 999,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingBottom: 16,
  },
  editorBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  editorLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionGap: {
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  inputText: {
    fontSize: 14,
    paddingVertical: 10,
  },
  inputMultiline: {
    alignItems: 'flex-start',
    minHeight: 88,
    paddingTop: 10,
  },
  inputTextMultiline: {
    textAlignVertical: 'top',
    minHeight: 66,
  },
  thumbnailPreview: {
    borderWidth: 1,
    borderRadius: 12,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailEmptyText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailEditBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityRow: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visibilityText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  addList: {
    marginTop: 10,
    marginBottom: 57,
    maxHeight: 600,
  },
  addListContent: {
    paddingBottom: 10,
  },
  addItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  addThumbWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addThumbImage: {
    width: '100%',
    height: '100%',
  },
  addInfo: {
    flex: 1,
  },
  addTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  addSub: {
    marginTop: 2,
    fontSize: 11,
  },
  addHint: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
  },
  sheetFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    borderWidth: 0,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 60,
  },
  popupCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  popupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  popupOptionText: {
    fontSize: 14,
  },
  popupOptionDangerText: {
    color: '#EF4444',
    fontWeight: '600',
  },
});
