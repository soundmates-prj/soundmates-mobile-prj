import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
  View
} from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import {
  authService,
  BlogPostResponse,
  blogService,
  FavoriteItemResponse,
  favoriteService,
  paymentService,
  PlaylistVisibility,
  ReactionResponse,
  UpdateProfileRequest,
  uploadService,
  UserPlaylistResponse,
  userPlaylistService,
} from '../../api';
import { BlogPostCard, DisplayPost } from '../../components/blog/BlogPostCard';
import FormTextField from '../../components/ui/FormTextField';
import { showToast } from '../../components/ui/Toast';
import { ThemePreference, useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import BottomNavigation, { TabName } from '../BottomNavigation';
import CreatePostScreen, { EditablePostDraft } from '../blog/CreatePostScreen';
import PostDetailScreen from '../blog/PostDetailScreen';
import AccountInfoScreen from './AccountInfoScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import EditProfileScreen from './EditProfileScreen';
import SubscriptionDetailsScreen from './SubscriptionDetailsScreen';
import PlaylistDetailModal from './components/PlaylistDetailModal';

const { width } = Dimensions.get('window');

const defaultAvatarUrl = 'https://i.pravatar.cc/150?img=10';
const profileContentTabs = [
  { key: 'posts', label: 'Bài viết', icon: 'create-outline' },
  { key: 'playlists', label: 'Playlist', icon: 'musical-notes-outline' },
  { key: 'favorites', label: 'Yêu thích', icon: 'heart-outline' },
] as const;

const favoriteItemTypeOptions = [
  { label: 'Bài hát', value: 'track' },
  { label: 'Playlist', value: 'playlist' },
  { label: 'Podcast', value: 'podcast' },
] as const;

const favoriteSourceOptions = [
  { label: 'Spotify', value: 'spotify' },
  { label: 'Local', value: 'local' },
  { label: 'Khác', value: 'other' },
] as const;

type ProfileContentTab = typeof profileContentTabs[number]['key'];

const normalizePlaylistVisibility = (visibility: number | undefined): PlaylistVisibility => {
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

// ─── Data ───────────────────────────────────────────────

const MENU_ITEMS = [
  {
    group: 'Tài khoản',
    items: [
      { icon: 'person-outline', label: 'Thông tin tài khoản', color: '#55C5F1' },
      { icon: 'card-outline', label: 'Gói đăng ký', color: '#A78BFA', badge: 'Premium' },
    ],
  },
  {
    group: 'Cài đặt hệ thống',
    items: [
      { icon: 'moon-outline', label: 'Giao diện', color: '#6366F1', subtitle: 'Sáng' },
      { icon: 'lock-closed-outline', label: 'Đổi mật khẩu', color: '#6366F1' },
    ],
  },
];

function mapMyPostToDisplayPost(post: BlogPostResponse): DisplayPost {
  return {
    id: post.id,
    userId: post.userId,
    title: post.title,
    contentText: post.contentText,
    imageUrl: post.imageUrl,
    audioUrl: post.audioUrl,
    moodTag: post.moodTag,
    postType: post.postType || null,
    shareMusic: post.shareMusic || null,
    status: post.status,
    createdAt: post.createdAt,
    publishedAt: post.publishedAt,
    reactionCount: 0,
    commentCount: 0,
    viewCount: 0,
    isLiked: false,
  };
}

function sortPostsNewestFirst(posts: DisplayPost[]): DisplayPost[] {
  return [...posts].sort((a, b) => {
    const timeA = new Date(a.publishedAt || a.createdAt).getTime();
    const timeB = new Date(b.publishedAt || b.createdAt).getTime();
    return timeB - timeA;
  });
}

function sortPlaylistsNewestFirst(playlists: UserPlaylistResponse[]): UserPlaylistResponse[] {
  return [...playlists].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });
}

// ─── Settings Drawer ────────────────────────────────────

function SettingsDrawer({ isOpen, onClose, onOpenChangePassword, onOpenAccountInfo, onOpenSubscription, onOpenThemeSettings, themeLabel, subscriptionPlanLabel, onLogout, palette, isDarkMode }: {
  isOpen: boolean; 
  onClose: () => void; 
  onOpenChangePassword?: () => void;
  onOpenAccountInfo?: () => void;
  onOpenSubscription?: () => void;
  onOpenThemeSettings?: () => void;
  themeLabel?: string;
  subscriptionPlanLabel?: string;
  onLogout?: () => void;
  palette: typeof SoundMateLightColors | typeof SoundMateColors;
  isDarkMode: boolean;
}) {
  const openAfterClose = (callback?: () => void) => {
    onClose();
    if (callback) {
      setTimeout(callback, 220);
    }
  };

  const handleMenuItemPress = (label: string) => {
    if (label === 'Đổi mật khẩu' && onOpenChangePassword) {
      openAfterClose(onOpenChangePassword);
    } else if (label === 'Thông tin tài khoản' && onOpenAccountInfo) {
      openAfterClose(onOpenAccountInfo);
    } else if (label === 'Gói đăng ký' && onOpenSubscription) {
      openAfterClose(onOpenSubscription);
    } else if (label === 'Giao diện' && onOpenThemeSettings) {
      openAfterClose(onOpenThemeSettings);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.settingsBackdrop}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.settingsBackdropTouchable} />
        <View style={[styles.settingsDrawer, { backgroundColor: palette.surface }]}> 
          {/* Handle */}
          <View style={styles.settingsHandle}>
            <View style={[styles.settingsHandleBar, { backgroundColor: palette.border }]} />
          </View>

          {/* Header */}
          <View style={[styles.settingsHeader, { borderBottomColor: palette.border }]}> 
            <Text style={[styles.settingsTitle, { color: palette.textPrimary }]}>Cài đặt & Tùy chỉnh</Text>
            <TouchableOpacity onPress={onClose} style={[styles.settingsCloseButton, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}> 
              <Ionicons name="close" size={16} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Menu sections */}
            {MENU_ITEMS.map((section) => (
              <View key={section.group} style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: palette.textMuted }]}>{section.group}</Text>
                {section.items.map((item) => (
                  (() => {
                    const itemBadge = item.label === 'Gói đăng ký'
                      ? subscriptionPlanLabel
                      : ('badge' in item ? item.badge : undefined);

                    return (
                  <TouchableOpacity 
                    key={item.label} 
                    style={[styles.settingsMenuItem, { borderBottomColor: palette.border }]}
                    onPress={() => handleMenuItemPress(item.label)}
                  >
                    <View style={[styles.settingsMenuIcon, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <Text style={[styles.settingsMenuLabel, { color: palette.textPrimary }]}>{item.label}</Text>
                    {item.label === 'Giao diện' ? (
                      <Text style={[styles.settingsMenuSubtitle, { color: palette.textSecondary }]}>{themeLabel || 'Sáng'}</Text>
                    ) : ('subtitle' in item && item.subtitle ? (
                      <Text style={[styles.settingsMenuSubtitle, { color: palette.textSecondary }]}>{item.subtitle}</Text>
                    ) : null)}
                    {!!itemBadge && (
                      <View style={styles.settingsMenuBadge}>
                        <Text style={styles.settingsMenuBadgeText}>{itemBadge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                  </TouchableOpacity>
                    );
                  })()
                ))}
              </View>
            ))}

            {/* Logout */}
            <View style={[styles.settingsLogoutContainer, { borderTopColor: palette.border }]}> 
              <TouchableOpacity 
                style={[styles.settingsLogoutButton, { borderColor: isDarkMode ? '#DC2626' : '#EF4444' }]}
                onPress={() => {
                  Alert.alert(
                    'Đăng xuất',
                    'Bạn có chắc chắn muốn đăng xuất khỏi SoundMates?',
                    [
                      {
                        text: 'Hủy',
                        style: 'cancel',
                      },
                      {
                        text: 'Đăng xuất',
                        style: 'destructive',
                        onPress: () => {
                          onClose();
                          showToast.success('Đã đăng xuất', 'Hẹn gặp lại bạn!');
                          if (onLogout) {
                            setTimeout(() => onLogout(), 300);
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.settingsLogoutText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>

            {/* App version */}
            <Text style={[styles.settingsVersion, { color: palette.textMuted }]}>SoundMates v2.1.0</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main ProfileScreen ─────────────────────────────────

interface ProfileScreenProps {
  onBackToHome?: (tab?: TabName) => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToSubscription?: () => void;
  onLogout?: () => void;
  hideBottomNav?: boolean;
}

export default function ProfileScreen({ onBackToHome, onNavigateToForgotPassword, onNavigateToSubscription, onLogout, hideBottomNav = false }: ProfileScreenProps) {
  const { user, refreshUser, saveUser } = useUser();
  const { themePreference, effectiveTheme, isDarkMode, setThemePreference } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  console.log('[ProfileScreen] Current user:', user);
  const joinedDateLabel = (() => {
    if (!user?.createdAt) return '';
    const parsed = new Date(user.createdAt);
    if (Number.isNaN(parsed.getTime())) return '';

    const day = `${parsed.getDate()}`.padStart(2, '0');
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const year = parsed.getFullYear();
    return `Tham gia từ ${day}/${month}/${year}`;
  })();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<EditablePostDraft | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<TabName>('profile');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<DisplayPost[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isPostsRefreshing, setIsPostsRefreshing] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [totalMyPosts, setTotalMyPosts] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(user?.profileImageUrl || defaultAvatarUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(user?.backgroundImageUrl || '');
  const [showImageOptionsPopup, setShowImageOptionsPopup] = useState(false);
  const [activeImageTarget, setActiveImageTarget] = useState<'avatar' | 'cover'>('avatar');
  const [isUpdatingProfileImage, setIsUpdatingProfileImage] = useState(false);
  const [profileImageLoadingText, setProfileImageLoadingText] = useState('Đang xử lý ảnh...');
  const [showImagePreviewPopup, setShowImagePreviewPopup] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewImageTarget, setPreviewImageTarget] = useState<'avatar' | 'cover'>('avatar');
  const [showThemePickerPopup, setShowThemePickerPopup] = useState(false);
  const [subscriptionPlanName, setSubscriptionPlanName] = useState('Premium');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileContentTab>('posts');
  const [favoriteItemTypeFilter, setFavoriteItemTypeFilter] = useState<string>('track');
  const [favoriteSourceFilter, setFavoriteSourceFilter] = useState<string>('spotify');
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItemResponse[]>([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [isFavoritesRefreshing, setIsFavoritesRefreshing] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylistResponse[]>([]);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);
  const [isPlaylistsRefreshing, setIsPlaylistsRefreshing] = useState(false);
  const [showPlaylistEditor, setShowPlaylistEditor] = useState(false);
  const [playlistEditorTarget, setPlaylistEditorTarget] = useState<UserPlaylistResponse | null>(null);
  const [playlistNameInput, setPlaylistNameInput] = useState('');
  const [playlistDescriptionInput, setPlaylistDescriptionInput] = useState('');
  const [playlistThumbnailInput, setPlaylistThumbnailInput] = useState('');
  const [playlistVisibilityInput, setPlaylistVisibilityInput] = useState<PlaylistVisibility>(1);
  const [playlistEnabledInput, setPlaylistEnabledInput] = useState(true);
  const [isUploadingPlaylistThumbnail, setIsUploadingPlaylistThumbnail] = useState(false);
  const [showPlaylistThumbnailOptions, setShowPlaylistThumbnailOptions] = useState(false);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistPreview, setSelectedPlaylistPreview] = useState<UserPlaylistResponse | null>(null);

  const themeLabel = themePreference === 'system'
    ? `Tự động (${effectiveTheme === 'dark' ? 'Tối' : 'Sáng'})`
    : themePreference === 'dark'
      ? 'Tối'
      : 'Sáng';

  const handleOpenThemeSettings = useCallback(() => {
    setShowThemePickerPopup(true);
  }, []);

  const handleApplyThemePreference = useCallback(async (nextPreference: ThemePreference) => {
    setShowThemePickerPopup(false);
    await setThemePreference(nextPreference);
    showToast.success(
      'Đã cập nhật giao diện',
      `Chế độ ${nextPreference === 'system' ? 'Tự động' : nextPreference === 'dark' ? 'Tối' : 'Sáng'}`,
    );
  }, [setThemePreference]);

  // Debug: Log user changes
  useEffect(() => {
    console.log('[ProfileScreen] User data changed:', user);
  }, [user]);

  useEffect(() => {
    setAvatarUrl(user?.profileImageUrl || defaultAvatarUrl);
    setCoverImageUrl(user?.backgroundImageUrl || '');
  }, [user?.backgroundImageUrl, user?.profileImageUrl]);

  useEffect(() => {
    let isMounted = true;

    const fetchMySubscription = async () => {
      try {
        const result = await paymentService.getMySubscription();
        if (!isMounted) return;

        const planName = result.data?.planName?.trim();
        const endDate = result.data?.endDate || null;
        setSubscriptionEndDate(endDate);

        if (planName) {
          setSubscriptionPlanName(planName);
          return;
        }

        setSubscriptionPlanName(user?.roleName || 'Premium');
      } catch (error) {
        if (isMounted) {
          setSubscriptionPlanName(user?.roleName || 'Premium');
          setSubscriptionEndDate(null);
        }
        console.log('[ProfileScreen] fetchMySubscription error:', error);
      }
    };

    void fetchMySubscription();

    return () => {
      isMounted = false;
    };
  }, [user?.roleName]);

  const handleTabPress = (tab: TabName) => {
    setActiveBottomTab(tab);

    if ((tab === 'home' || tab === 'blog' || tab === 'podcast') && onBackToHome) {
      onBackToHome(tab);
    }
  };

  const openImageOptionsPopup = (target: 'avatar' | 'cover') => {
    setActiveImageTarget(target);
    setShowImageOptionsPopup(true);
  };

  const promptOpenSettings = (message: string) => {
    Alert.alert(
      'Cần cấp quyền',
      message,
      [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Mở cài đặt', onPress: () => Linking.openSettings() },
      ],
      { cancelable: true }
    );
  };

  const updateProfileImageField = async (target: 'avatar' | 'cover', value: string) => {
    const requestedAt = new Date().toISOString();
    const payload: UpdateProfileRequest = target === 'avatar'
      ? { profileImageUrl: value }
      : { backgroundImageUrl: value };

    const result = await authService.updateProfile(payload);
    if (!result.success) {
      throw new Error(result.message || 'Không thể cập nhật ảnh');
    }

    if (user) {
      const nextUser = {
        ...user,
        profileImageUrl: target === 'avatar' ? (value || undefined) : user.profileImageUrl,
        backgroundImageUrl: target === 'cover' ? (value || undefined) : user.backgroundImageUrl,
        updatedAt: result.data?.updatedAt || user.updatedAt,
      };
      await saveUser(nextUser);
    }

    await refreshUser({
      expectedUpdatedAt: result.data?.updatedAt || requestedAt,
      expectedProfileImageUrl: target === 'avatar' ? value : undefined,
      expectedBackgroundImageUrl: target === 'cover' ? value : undefined,
      maxAttempts: 12,
      delayMs: 250,
    });
  };

  const applySelectedAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const target = activeImageTarget;
    const previousAvatarUrl = avatarUrl;
    const previousCoverUrl = coverImageUrl;

    if (target === 'avatar') {
      setAvatarUrl(asset.uri);
    } else {
      setCoverImageUrl(asset.uri);
    }

    setProfileImageLoadingText('Đang tải ảnh...');
    setIsUpdatingProfileImage(true);
    try {
      const uploadResult = await uploadService.uploadImageToCloudinary({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.message || 'Upload ảnh thất bại');
      }

      const uploadedUrl = uploadResult.data;

      if (target === 'avatar') {
        setAvatarUrl(uploadedUrl);
      } else {
        setCoverImageUrl(uploadedUrl);
      }

      setProfileImageLoadingText('Đang cập nhật thông tin hồ sơ...');
      await updateProfileImageField(target, uploadedUrl);
      showToast.success('Cập nhật thành công', target === 'avatar' ? 'Đã đổi ảnh đại diện' : 'Đã đổi ảnh bìa');
    } catch (error: any) {
      setAvatarUrl(previousAvatarUrl);
      setCoverImageUrl(previousCoverUrl);
      showToast.error('Cập nhật thất bại', error?.message || 'Vui lòng thử lại sau');
    } finally {
      setIsUpdatingProfileImage(false);
      setProfileImageLoadingText('Đang xử lý ảnh...');
    }
  };

  const pickImageFromLibrary = async () => {
    if (isUpdatingProfileImage) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          promptOpenSettings('Vui lòng cấp quyền thư viện ảnh trong Cài đặt để chọn ảnh.');
          return;
        }

        showToast.warning('Chưa có quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để tiếp tục');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: activeImageTarget === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        await applySelectedAsset(result.assets[0]);
      }
    } catch {
      showToast.error('Không thể chọn ảnh', 'Vui lòng thử lại sau');
    }
  };

  const takePhoto = async () => {
    if (isUpdatingProfileImage) return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          promptOpenSettings('Vui lòng cấp quyền camera trong Cài đặt để chụp ảnh mới.');
          return;
        }

        showToast.warning('Chưa có quyền camera', 'Vui lòng cấp quyền camera để chụp ảnh');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: activeImageTarget === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        await applySelectedAsset(result.assets[0]);
      }
    } catch {
      showToast.error('Không thể mở camera', 'Vui lòng thử lại sau');
    }
  };

  const handlePickImageFromLibrary = async () => {
    setShowImageOptionsPopup(false);
    await pickImageFromLibrary();
  };

  const handleTakePhoto = async () => {
    setShowImageOptionsPopup(false);
    await takePhoto();
  };

  const handleViewImage = () => {
    const imageUrl = activeImageTarget === 'avatar' ? avatarUrl : coverImageUrl;
    if (!imageUrl) {
      showToast.warning('Chưa có ảnh', 'Vui lòng thêm ảnh trước khi xem');
      return;
    }

    setShowImageOptionsPopup(false);
    setPreviewImageTarget(activeImageTarget);
    setPreviewImageUrl(imageUrl);
    setShowImagePreviewPopup(true);
  };

  const handleRemoveImage = async () => {
    if (isUpdatingProfileImage) return;

    setShowImageOptionsPopup(false);
    const target = activeImageTarget;
    const previousAvatarUrl = avatarUrl;
    const previousCoverUrl = coverImageUrl;

    if (target === 'avatar') {
      setAvatarUrl(defaultAvatarUrl);
    } else {
      setCoverImageUrl('');
    }

    setProfileImageLoadingText('Đang cập nhật thông tin hồ sơ...');
    setIsUpdatingProfileImage(true);
    try {
      await updateProfileImageField(target, '');
      showToast.success('Đã xóa ảnh', target === 'avatar' ? 'Đã xóa ảnh đại diện' : 'Đã xóa ảnh bìa');
    } catch (error: any) {
      setAvatarUrl(previousAvatarUrl);
      setCoverImageUrl(previousCoverUrl);
      showToast.error('Xóa ảnh thất bại', error?.message || 'Vui lòng thử lại sau');
    } finally {
      setIsUpdatingProfileImage(false);
      setProfileImageLoadingText('Đang xử lý ảnh...');
    }
  };

  const resetPlaylistEditor = useCallback(() => {
    setPlaylistEditorTarget(null);
    setPlaylistNameInput('');
    setPlaylistDescriptionInput('');
    setPlaylistThumbnailInput('');
    setPlaylistVisibilityInput(1);
    setPlaylistEnabledInput(true);
    setShowPlaylistThumbnailOptions(false);
  }, []);

  const openCreatePlaylistEditor = useCallback(() => {
    resetPlaylistEditor();
    setShowPlaylistEditor(true);
  }, [resetPlaylistEditor]);

  const closePlaylistEditor = useCallback(() => {
    if (isSavingPlaylist || isUploadingPlaylistThumbnail) return;
    setShowPlaylistEditor(false);
    resetPlaylistEditor();
  }, [isSavingPlaylist, isUploadingPlaylistThumbnail, resetPlaylistEditor]);

  const handlePlaylistEditorRequestClose = useCallback(() => {
    if (showPlaylistThumbnailOptions) {
      setShowPlaylistThumbnailOptions(false);
      return;
    }

    closePlaylistEditor();
  }, [closePlaylistEditor, showPlaylistThumbnailOptions]);

  const openPlaylistThumbnailOptions = useCallback(() => {
    if (isUploadingPlaylistThumbnail) return;
    setShowPlaylistThumbnailOptions(true);
  }, [isUploadingPlaylistThumbnail]);

  const closePlaylistThumbnailOptions = useCallback(() => {
    setShowPlaylistThumbnailOptions(false);
  }, []);

  const uploadPlaylistThumbnailAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
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
      showToast.success('Tải ảnh thành công', 'Thumbnail playlist đã được cập nhật');
    } catch (error: any) {
      showToast.error('Không thể tải ảnh', error?.message || 'Vui lòng thử lại sau');
    } finally {
      setIsUploadingPlaylistThumbnail(false);
    }
  }, []);

  const handlePickPlaylistThumbnailFromLibrary = useCallback(async () => {
    if (isUploadingPlaylistThumbnail) return;
    setShowPlaylistThumbnailOptions(false);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          promptOpenSettings('Vui lòng cấp quyền thư viện ảnh trong Cài đặt để chọn thumbnail playlist.');
          return;
        }

        showToast.warning('Chưa có quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để tiếp tục');
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
  }, [isUploadingPlaylistThumbnail, uploadPlaylistThumbnailAsset]);

  const handleTakePlaylistThumbnailPhoto = useCallback(async () => {
    if (isUploadingPlaylistThumbnail) return;
    setShowPlaylistThumbnailOptions(false);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) {
          promptOpenSettings('Vui lòng cấp quyền camera trong Cài đặt để chụp thumbnail playlist.');
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
  }, [isUploadingPlaylistThumbnail, uploadPlaylistThumbnailAsset]);

  const handleRemovePlaylistThumbnail = useCallback(() => {
    if (isUploadingPlaylistThumbnail) return;
    setPlaylistThumbnailInput('');
    setShowPlaylistThumbnailOptions(false);
  }, [isUploadingPlaylistThumbnail]);

  const openPlaylistDetail = useCallback((playlist: UserPlaylistResponse) => {
    setSelectedPlaylistId(playlist.id);
    setSelectedPlaylistPreview(playlist);
  }, []);

  const closePlaylistDetail = useCallback(() => {
    setSelectedPlaylistId(null);
    setSelectedPlaylistPreview(null);
  }, []);

  const fetchFavoriteItems = useCallback(async (refresh = false) => {
    if (!user?.userId) {
      setFavoriteItems([]);
      setIsFavoritesLoading(false);
      setIsFavoritesRefreshing(false);
      return;
    }

    if (refresh) {
      setIsFavoritesRefreshing(true);
    } else {
      setIsFavoritesLoading(true);
    }

    try {
      const result = await favoriteService.getFavorites({
        itemType: favoriteItemTypeFilter,
        source: favoriteSourceFilter,
      });

      if (result.success) {
        setFavoriteItems(result.data);
      } else {
        setFavoriteItems([]);
      }
    } catch (error) {
      console.log('[ProfileScreen] fetchFavoriteItems error:', error);
      setFavoriteItems([]);
    } finally {
      setIsFavoritesLoading(false);
      setIsFavoritesRefreshing(false);
    }
  }, [favoriteItemTypeFilter, favoriteSourceFilter, user?.userId]);

  const fetchUserPlaylists = useCallback(async (refresh = false) => {
    if (!user?.userId) {
      setUserPlaylists([]);
      setIsPlaylistsLoading(false);
      setIsPlaylistsRefreshing(false);
      return;
    }

    if (refresh) {
      setIsPlaylistsRefreshing(true);
    } else {
      setIsPlaylistsLoading(true);
    }

    try {
      const result = await userPlaylistService.getMyPlaylists();
      if (result.success) {
        setUserPlaylists(sortPlaylistsNewestFirst(result.data));
      } else {
        setUserPlaylists([]);
        showToast.warning('Không thể tải playlist', result.message || 'Vui lòng thử lại sau');
      }
    } catch (error) {
      console.log('[ProfileScreen] fetchUserPlaylists error:', error);
      setUserPlaylists([]);
    } finally {
      setIsPlaylistsLoading(false);
      setIsPlaylistsRefreshing(false);
    }
  }, [user?.userId]);

  const handleSavePlaylist = useCallback(async () => {
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
      if (playlistEditorTarget) {
        const result = await userPlaylistService.updateUserPlaylist(playlistEditorTarget.id, {
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
      } else {
        const result = await userPlaylistService.createUserPlaylist({
          playlistName,
          description: playlistDescriptionInput.trim() || undefined,
          thumbnailUrl: playlistThumbnailUrl || undefined,
          visibility: playlistVisibilityInput,
          isEnabled: playlistEnabledInput,
        });

        if (!result.success) {
          throw new Error(result.message || 'Không thể tạo playlist');
        }

        showToast.success('Tạo playlist thành công', 'Playlist mới đã được thêm vào thư viện');
      }

      setShowPlaylistEditor(false);
      resetPlaylistEditor();
      await fetchUserPlaylists(true);
    } catch (error: any) {
      showToast.error('Lưu playlist thất bại', error?.message || 'Vui lòng thử lại sau');
    } finally {
      setIsSavingPlaylist(false);
    }
  }, [
    fetchUserPlaylists,
    playlistDescriptionInput,
    playlistEditorTarget,
    playlistEnabledInput,
    isUploadingPlaylistThumbnail,
    playlistNameInput,
    playlistThumbnailInput,
    playlistVisibilityInput,
    resetPlaylistEditor,
  ]);

  const handlePlaylistDeleted = useCallback(async () => {
    closePlaylistDetail();
    await fetchUserPlaylists(true);
  }, [closePlaylistDetail, fetchUserPlaylists]);

  const handleFavoritesRefresh = useCallback(() => {
    fetchFavoriteItems(true);
  }, [fetchFavoriteItems]);

  const handlePlaylistsRefresh = useCallback(() => {
    fetchUserPlaylists(true);
  }, [fetchUserPlaylists]);

  useEffect(() => {
    if (activeProfileTab === 'playlists') {
      fetchUserPlaylists();
    }
  }, [activeProfileTab, fetchUserPlaylists]);

  useEffect(() => {
    if (activeProfileTab === 'favorites') {
      fetchFavoriteItems();
    }
  }, [activeProfileTab, favoriteItemTypeFilter, favoriteSourceFilter, fetchFavoriteItems]);

  const fetchMyPosts = useCallback(async (pageNum = 1, refresh = false) => {
    if (!user?.userId) {
      if (pageNum === 1) {
        setMyPosts([]);
        setTotalMyPosts(0);
        setPostsPage(1);
        setPostsTotalPages(1);
      }
      setIsPostsLoading(false);
      setIsPostsRefreshing(false);
      return;
    }

    if (refresh) {
      setIsPostsRefreshing(true);
    } else if (pageNum === 1) {
      setIsPostsLoading(true);
    }

    try {
      const result = await blogService.getMyPosts({ page: pageNum, pageSize: 10 });

      if (result.success && result.data) {
        setTotalMyPosts(result.data.totalCount);
        setPostsTotalPages(result.data.totalPages || 1);

        const mappedPosts = result.data.items.map(mapMyPostToDisplayPost);
        const enhancedPosts = await Promise.all(
          mappedPosts.map(async (post) => {
            try {
              const [statsResult, reactionsResult] = await Promise.all([
                blogService.getPostStats(post.id),
                blogService.getPostReactions(post.id),
              ]);

              const stats = statsResult.success && statsResult.data ? statsResult.data : null;
              const reactions = reactionsResult.success && reactionsResult.data ? reactionsResult.data : [];
              const isLiked = !!user && reactions.some((reaction: ReactionResponse) => reaction.userId === user.userId);

              return {
                ...post,
                reactionCount: stats?.reactionCount ?? post.reactionCount,
                commentCount: stats?.commentCount ?? post.commentCount,
                viewCount: stats?.viewCount ?? post.viewCount,
                isLiked,
              };
            } catch {
              return post;
            }
          }),
        );

        if (pageNum === 1) {
          setMyPosts(sortPostsNewestFirst(enhancedPosts));
        } else {
          setMyPosts((prev) => sortPostsNewestFirst([...prev, ...enhancedPosts]));
        }

        setPostsPage(pageNum);
      } else {
        if (pageNum === 1) {
          setMyPosts([]);
          setTotalMyPosts(0);
        }
        setPostsPage(pageNum);
        setPostsTotalPages(1);
      }
    } catch (error) {
      console.log('[ProfileScreen] fetchMyPosts error:', error);
      if (pageNum === 1) {
        setMyPosts([]);
        setTotalMyPosts(0);
      }
    } finally {
      setIsPostsLoading(false);
      setIsPostsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.userId) {
      fetchMyPosts(1);
    } else {
      setMyPosts([]);
      setTotalMyPosts(0);
      setPostsPage(1);
      setPostsTotalPages(1);
    }
  }, [fetchMyPosts, user?.userId]);

  const handlePostsRefresh = useCallback(() => {
    fetchMyPosts(1, true);
  }, [fetchMyPosts]);

  const handleScreenRefresh = useCallback(() => {
    if (activeProfileTab === 'playlists') {
      handlePlaylistsRefresh();
      return;
    }

    if (activeProfileTab === 'favorites') {
      handleFavoritesRefresh();
      return;
    }

    handlePostsRefresh();
  }, [activeProfileTab, handleFavoritesRefresh, handlePlaylistsRefresh, handlePostsRefresh]);

  const handleLikePost = useCallback(async (postId: string) => {
    const targetPost = myPosts.find((post) => post.id === postId);
    if (!targetPost) return;

    setMyPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              reactionCount: post.isLiked ? post.reactionCount - 1 : post.reactionCount + 1,
            }
          : post,
      ),
    );

    try {
      const result = targetPost.isLiked
        ? await blogService.removeReaction(postId)
        : await blogService.addReaction(postId, 'like');

      if (!result.success) {
        throw new Error(result.message || 'Like request failed');
      }
    } catch (error) {
      setMyPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: targetPost.isLiked,
                reactionCount: targetPost.reactionCount,
              }
            : post,
        ),
      );
      console.log('[ProfileScreen] handleLikePost error:', error);
    }
  }, [myPosts]);

  const handleOpenCreatePost = useCallback(() => {
    setEditingPost(null);
    setShowCreatePost(true);
  }, []);

  const handleEditPost = useCallback((post: DisplayPost) => {
    setEditingPost({
      id: post.id,
      title: post.title,
      contentText: post.contentText,
      moodTag: post.moodTag,
      imageUrl: post.imageUrl,
    });
    setShowCreatePost(true);
  }, []);

  const handleDeletePost = useCallback((postId: string) => {
    Alert.alert(
      'Xóa bài viết',
      'Bạn có chắc chắn muốn xóa bài viết này không?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await blogService.deletePost(postId);
              if (result.success) {
                showToast.success('Đã xóa bài viết', 'Bài viết đã được xóa khỏi trang cá nhân');
                fetchMyPosts(1, true);
              } else {
                showToast.error('Xóa thất bại', result.message || 'Vui lòng thử lại sau');
              }
            } catch (error) {
              console.log('[ProfileScreen] handleDeletePost error:', error);
              showToast.error('Xóa thất bại', 'Vui lòng thử lại sau');
            }
          },
        },
      ],
    );
  }, [fetchMyPosts]);

  const handlePostCreated = useCallback(() => {
    setShowCreatePost(false);
    setEditingPost(null);
    fetchMyPosts(1, true);
  }, [fetchMyPosts]);

  if (showCreatePost) {
    return (
      <View style={styles.container}>
        <CreatePostScreen
          onBack={() => {
            setShowCreatePost(false);
            setEditingPost(null);
          }}
          onPostCreated={handlePostCreated}
          editingPost={editingPost}
        />
      </View>
    );
  }

  if (selectedPostId) {
    return (
      <View style={styles.container}>
        <PostDetailScreen postId={selectedPostId} onBack={() => setSelectedPostId(null)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={activeProfileTab === 'posts' ? isPostsRefreshing : activeProfileTab === 'playlists' ? isPlaylistsRefreshing : isFavoritesRefreshing}
            onRefresh={handleScreenRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCardContainer}>
          <View style={[styles.profileCard, { backgroundColor: palette.surface }]}> 
            {/* ── Header ── */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Trang cá nhân</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => setShowEditProfile(true)} style={[styles.headerButton, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.35)' }]}>
                  <Ionicons name="create-outline" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSettings(true)} style={[styles.headerButton, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.35)' }]}>
                  <Ionicons name="ellipsis-vertical" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.profileCoverContainer, { backgroundColor: isDarkMode ? '#111827' : '#E2E8F0' }]}> 
              <TouchableOpacity
                disabled={isUpdatingProfileImage}
                onPress={() => openImageOptionsPopup('cover')}
                activeOpacity={0.92}
                style={styles.coverPressable}
              >
                {coverImageUrl ? (
                  <Image source={{ uri: coverImageUrl }} style={styles.profileCoverImage} />
                ) : (
                  <LinearGradient
                    colors={['#55C5F1', '#A78BFA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileCoverFallback}
                  >
                    <View style={[styles.decorCircle, styles.decorCircle1]} />
                    <View style={[styles.decorCircle, styles.decorCircle2]} />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  disabled={isUpdatingProfileImage}
                  onPress={() => openImageOptionsPopup('avatar')}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: palette.surface }]} />
                </TouchableOpacity>
                <View style={styles.onlineIndicator} />
              </View>
              <View style={styles.profileDetails}>
                <View style={styles.profileNameRow}>
                  <Text style={[styles.profileName, { color: palette.textPrimary }]}>
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.username || 'User'}
                  </Text>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>{subscriptionPlanName}</Text>
                  </View>
                </View>
                <Text style={[styles.profileUsername, { color: palette.textSecondary }]}>{user?.username || 'username'}</Text>
              </View>
            </View>

            <View style={styles.profileMetaSection}>
              {user?.bio && user.bio.length > 0 && (
                <Text style={[styles.profileBio, { color: palette.textSecondary }]}>{user.bio}</Text>
              )}
              {!!joinedDateLabel && (
                <View style={styles.joinedDateRow}>
                  <Ionicons name="calendar-outline" size={13} color={palette.textSecondary} />
                  <Text style={[styles.joinedDateText, { color: palette.textSecondary }]}>{joinedDateLabel}</Text>
                </View>
              )}
            </View>
            <View style={[styles.profileStats, { backgroundColor: palette.surface }]}>
              <View style={styles.profileStatItem}>
                <Text style={[styles.profileStatValue, { color: palette.primary }]}>{totalMyPosts}</Text>
                <Text style={[styles.profileStatLabel, { color: palette.textSecondary }]}>Bài viết</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.tabsContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          {profileContentTabs.map((tab) => {
            const isActive = activeProfileTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.85}
                style={[
                  styles.tabButton,
                  isActive ? [styles.tabButtonActive, { backgroundColor: palette.primary }] : null,
                ]}
                onPress={() => setActiveProfileTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : palette.textSecondary}
                  style={styles.tabButtonIcon}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: palette.textSecondary },
                    isActive ? styles.tabButtonTextActive : null,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeProfileTab === 'posts' && (
          <>
            <View style={styles.composerContainer}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.composerCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={handleOpenCreatePost}
              >
                <View style={styles.composerCollapsed}>
                  <Image source={{ uri: avatarUrl }} style={styles.composerAvatar} />
                  <View style={[styles.composerPlaceholder, { backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9' }]}> 
                    <Text style={[styles.composerPlaceholderText, { color: palette.textSecondary }]}>
                      {`Bạn đang nghĩ gì${user?.firstName ? `, ${user.firstName}` : ''}?`}
                    </Text>
                  </View>
                  <View style={[styles.composerQuickIcon, { backgroundColor: palette.primary + '1A' }]}> 
                    <Ionicons name="create-outline" size={18} color={palette.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {isPostsLoading ? (
              <View style={styles.postsLoadingContainer}>
                <ActivityIndicator size="large" color={palette.primary} />
                <Text style={[styles.postsLoadingText, { color: palette.textSecondary }]}>Đang tải bài viết...</Text>
              </View>
            ) : myPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyStateIcon, { backgroundColor: palette.primary + '1A' }]}>
                  <Ionicons name="create-outline" size={28} color={palette.primary} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: palette.textPrimary }]}>Bạn chưa có bài viết nào</Text>
                <Text style={[styles.emptyStateSubtitle, { color: palette.textSecondary }]}>Hãy đăng bài đầu tiên để chia sẻ với cộng đồng!</Text>
              </View>
            ) : (
              <>
                {myPosts.map((post) => (
                  <BlogPostCard
                    key={post.id}
                    post={post}
                    onLike={() => handleLikePost(post.id)}
                    onNavigateToDetail={(postId) => setSelectedPostId(postId)}
                    showOwnerActions
                    onEdit={() => handleEditPost(post)}
                    onDelete={() => handleDeletePost(post.id)}
                  />
                ))}

                {!isPostsLoading && postsPage < postsTotalPages && myPosts.length > 0 && (
                  <TouchableOpacity
                    style={[styles.loadMoreButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    activeOpacity={0.8}
                    onPress={() => fetchMyPosts(postsPage + 1)}
                  >
                    <Text style={[styles.loadMoreText, { color: palette.primary }]}>Tải thêm bài viết</Text>
                    <Ionicons name="chevron-down" size={16} color={palette.primary} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        {activeProfileTab === 'playlists' && (
          <View style={styles.tabSectionWrap}>
            <View style={styles.tabSectionHeader}>
              <Text style={[styles.tabSectionTitle, { color: palette.textPrimary }]}>Playlist của bạn ({userPlaylists.length})</Text>
              <TouchableOpacity
                style={[styles.smallActionButton, { backgroundColor: palette.primary }]}
                activeOpacity={0.85}
                onPress={openCreatePlaylistEditor}
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
                    onPress={() => openPlaylistDetail(playlist)}
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
        )}

        {activeProfileTab === 'favorites' && (
          <View style={styles.tabSectionWrap}>
            <View style={[styles.filterSectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.filterSectionLabel, { color: palette.textPrimary }]}>Loại nội dung</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
                {favoriteItemTypeOptions.map((option) => {
                  const isSelected = favoriteItemTypeFilter === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setFavoriteItemTypeFilter(option.value)}
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
        )}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {showImageOptionsPopup && (
        <View style={styles.popupOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowImageOptionsPopup(false)} />

          <View style={[styles.popupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.popupHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.popupTitle, { color: palette.textPrimary }]}>
                Cập nhật {activeImageTarget === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'}
              </Text>
              <TouchableOpacity onPress={() => setShowImageOptionsPopup(false)}>
                <Ionicons name="close" size={18} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            {((activeImageTarget === 'avatar' && !!avatarUrl) ||
              (activeImageTarget === 'cover' && !!coverImageUrl)) && (
              <TouchableOpacity disabled={isUpdatingProfileImage} style={[styles.popupOption, { borderBottomColor: palette.border }]} onPress={handleViewImage}>
                <Ionicons name="eye-outline" size={18} color="#0EA5E9" />
                <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Xem ảnh hiện tại</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity disabled={isUpdatingProfileImage} style={[styles.popupOption, { borderBottomColor: palette.border }]} onPress={handlePickImageFromLibrary}>
              <Ionicons name="images-outline" size={18} color="#55C5F1" />
              <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Chọn từ album / thư viện</Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={isUpdatingProfileImage} style={[styles.popupOption, { borderBottomColor: palette.border }]} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={18} color="#A78BFA" />
              <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Chụp ảnh mới</Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={isUpdatingProfileImage} style={[styles.popupOption, { borderBottomColor: palette.border }]} onPress={handleRemoveImage}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.popupOptionText, styles.popupOptionDangerText]}>
                Xóa {activeImageTarget === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showThemePickerPopup && (
        <View style={styles.popupOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowThemePickerPopup(false)} />

          <View style={[styles.popupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.popupHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.popupTitle, { color: palette.textPrimary }]}>Chọn giao diện</Text>
              <TouchableOpacity onPress={() => setShowThemePickerPopup(false)}>
                <Ionicons name="close" size={18} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.popupOption, { borderBottomColor: palette.border }]} onPress={() => void handleApplyThemePreference('light')}>
              <Ionicons name="sunny-outline" size={18} color="#F59E0B" />
              <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Sáng</Text>
              {themePreference === 'light' && <Ionicons name="checkmark" size={18} color="#10B981" />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.popupOption, { borderBottomColor: palette.border }]} onPress={() => void handleApplyThemePreference('dark')}>
              <Ionicons name="moon-outline" size={18} color="#6366F1" />
              <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Tối</Text>
              {themePreference === 'dark' && <Ionicons name="checkmark" size={18} color="#10B981" />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.popupOption, { borderBottomColor: palette.border }]} onPress={() => void handleApplyThemePreference('system')}>
              <Ionicons name="phone-portrait-outline" size={18} color="#3B82F6" />
              <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Tự động theo hệ thống</Text>
              {themePreference === 'system' && <Ionicons name="checkmark" size={18} color="#10B981" />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={showImagePreviewPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePreviewPopup(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowImagePreviewPopup(false)} />

          <View style={styles.imageViewerCard}>
            <View style={styles.imageViewerHeader}>
              <Text style={styles.imageViewerTitle}>
                {previewImageTarget === 'avatar' ? 'Ảnh đại diện' : 'Ảnh bìa'}
              </Text>
              <TouchableOpacity onPress={() => setShowImagePreviewPopup(false)}>
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <Image source={{ uri: previewImageUrl }} style={styles.imageViewerImage} resizeMode="contain" />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isUpdatingProfileImage}
        transparent
        animationType="fade"
      >
        <View style={styles.uploadBlockingOverlay}>
          <View style={styles.uploadBlockingCard}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={[styles.uploadBlockingText, { color: palette.textPrimary }]}>{profileImageLoadingText}</Text>
            <Text style={[styles.uploadBlockingHint, { color: palette.textSecondary }]}>Vui lòng đợi trong giây lát...</Text>
          </View>
        </View>
      </Modal>

      <PlaylistDetailModal
        visible={!!selectedPlaylistId}
        playlistId={selectedPlaylistId}
        initialPlaylist={selectedPlaylistPreview}
        onClose={closePlaylistDetail}
        onPlaylistsChanged={() => fetchUserPlaylists(true)}
        onPlaylistDeleted={handlePlaylistDeleted}
      />

      <Modal
        visible={showPlaylistEditor}
        transparent
        animationType="slide"
        onRequestClose={handlePlaylistEditorRequestClose}
      >
        <View style={styles.playlistSheetOverlay}>
          <Pressable style={styles.playlistSheetBackdrop} onPress={closePlaylistEditor} />

          <KeyboardAvoidingView
            style={styles.playlistSheetKeyboardWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.playlistSheetCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              <View style={styles.playlistSheetHandle}>
                <View style={[styles.playlistSheetHandleBar, { backgroundColor: palette.border }]} />
              </View>

              <View style={[styles.popupHeader, { borderBottomColor: palette.border }]}> 
                <Text style={[styles.popupTitle, { color: palette.textPrimary }]}>
                  {playlistEditorTarget ? 'Chỉnh sửa playlist' : 'Tạo playlist mới'}
                </Text>
                <TouchableOpacity onPress={closePlaylistEditor} disabled={isSavingPlaylist || isUploadingPlaylistThumbnail}>
                  <Ionicons name="close" size={18} color={palette.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.playlistSheetScroll}
                contentContainerStyle={styles.playlistSheetScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.playlistEditorBody}>
                  <Text style={[styles.playlistEditorLabel, { color: palette.textSecondary }]}>Tên playlist</Text>
                  <FormTextField
                    value={playlistNameInput}
                    onChangeText={setPlaylistNameInput}
                    placeholder="Nhập tên playlist"
                    placeholderTextColor={palette.textMuted}
                    inputContainerStyle={[
                      styles.playlistEditorInput,
                      { borderColor: palette.border, backgroundColor: palette.background },
                    ]}
                    style={[styles.playlistEditorInputText, { color: palette.textPrimary }]}
                  />

                  <Text style={[styles.playlistEditorLabel, styles.playlistEditorSectionGap, { color: palette.textSecondary }]}>Mô tả</Text>
                  <FormTextField
                    value={playlistDescriptionInput}
                    onChangeText={setPlaylistDescriptionInput}
                    placeholder="Mô tả ngắn cho playlist (không bắt buộc)"
                    placeholderTextColor={palette.textMuted}
                    multiline
                    numberOfLines={3}
                    inputContainerStyle={[
                      styles.playlistEditorInput,
                      styles.playlistEditorInputMultiline,
                      { borderColor: palette.border, backgroundColor: palette.background },
                    ]}
                    style={[styles.playlistEditorInputText, styles.playlistEditorInputTextMultiline, { color: palette.textPrimary }]}
                  />

                  <Text style={[styles.playlistEditorLabel, styles.playlistEditorSectionGap, { color: palette.textSecondary }]}>Ảnh bìa playlist</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={openPlaylistThumbnailOptions}
                    disabled={isUploadingPlaylistThumbnail}
                    style={[styles.playlistThumbnailPreview, { borderColor: palette.border, backgroundColor: palette.background }]}
                  >
                    {playlistThumbnailInput ? (
                      <Image source={{ uri: playlistThumbnailInput }} style={styles.playlistThumbnailImage} />
                    ) : (
                      <View style={styles.playlistThumbnailEmpty}>
                        <Ionicons name="image-outline" size={24} color={palette.textMuted} />
                        <Text style={[styles.playlistThumbnailEmptyText, { color: palette.textMuted }]}>Nhấn để chọn ảnh bìa</Text>
                      </View>
                    )}

                    <View style={styles.playlistThumbnailEditBadge}>
                      <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                    </View>

                    {isUploadingPlaylistThumbnail && (
                      <View style={styles.playlistThumbnailLoadingOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.playlistVisibilityInlineRow}>
                    <Text style={[styles.playlistVisibilityPromptText, { color: palette.textSecondary }]}>hãy công khai playlist này</Text>
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

              <View style={[styles.playlistEditorFooter, { borderTopColor: palette.border }]}> 
                <TouchableOpacity
                  style={[styles.playlistEditorFooterButton, styles.playlistEditorCancelButton, { borderColor: palette.border }]}
                  onPress={closePlaylistEditor}
                  disabled={isSavingPlaylist || isUploadingPlaylistThumbnail}
                >
                  <Text style={[styles.playlistEditorCancelText, { color: palette.textSecondary }]}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.playlistEditorFooterButton, styles.playlistEditorSaveButton, { backgroundColor: palette.primary }]}
                  onPress={handleSavePlaylist}
                  disabled={isSavingPlaylist || isUploadingPlaylistThumbnail}
                >
                  {isSavingPlaylist || isUploadingPlaylistThumbnail ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.playlistEditorSaveText}>{playlistEditorTarget ? 'Lưu thay đổi' : 'Tạo playlist'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>

          {showPlaylistThumbnailOptions && (
            <View style={styles.popupOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closePlaylistThumbnailOptions} />

              <View style={[styles.popupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
                <View style={[styles.popupHeader, { borderBottomColor: palette.border }]}> 
                  <Text style={[styles.popupTitle, { color: palette.textPrimary }]}>Ảnh bìa playlist</Text>
                  <TouchableOpacity onPress={closePlaylistThumbnailOptions}>
                    <Ionicons name="close" size={18} color={palette.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.popupOption, { borderBottomColor: palette.border }]}
                  onPress={() => void handlePickPlaylistThumbnailFromLibrary()}
                  disabled={isUploadingPlaylistThumbnail}
                >
                  <Ionicons name="images-outline" size={18} color="#55C5F1" />
                  <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Chọn ảnh từ thư viện</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.popupOption, { borderBottomColor: palette.border }]}
                  onPress={() => void handleTakePlaylistThumbnailPhoto()}
                  disabled={isUploadingPlaylistThumbnail}
                >
                  <Ionicons name="camera-outline" size={18} color="#A78BFA" />
                  <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>Chụp ảnh mới</Text>
                </TouchableOpacity>

                {!!playlistThumbnailInput && (
                  <TouchableOpacity
                    style={[styles.popupOption, { borderBottomColor: palette.border }]}
                    onPress={handleRemovePlaylistThumbnail}
                    disabled={isUploadingPlaylistThumbnail}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[styles.popupOptionText, styles.popupOptionDangerText]}>Xóa ảnh bìa</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Bottom Navigation */}
      {!hideBottomNav && <BottomNavigation activeTab={activeBottomTab} onTabPress={handleTabPress} />}

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <EditProfileScreen onBack={() => setShowEditProfile(false)} />
      </Modal>

      {/* ── Settings Drawer ── */}
      <SettingsDrawer 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onOpenChangePassword={() => {
          setShowChangePassword(true);
        }}
        onOpenAccountInfo={() => {
          setShowAccountInfo(true);
        }}
        onOpenSubscription={() => {
          if (onNavigateToSubscription) {
            onNavigateToSubscription();
          }
        }}
        onOpenThemeSettings={handleOpenThemeSettings}
        themeLabel={themeLabel}
        subscriptionPlanLabel={subscriptionPlanName}
        onLogout={onLogout}
        palette={palette}
        isDarkMode={isDarkMode}
      />

      {/* ── Change Password Modal ── */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <ChangePasswordScreen 
          onBack={() => setShowChangePassword(false)} 
          onNavigateToForgotPassword={() => {
            setShowChangePassword(false);
            if (onNavigateToForgotPassword) {
              onNavigateToForgotPassword();
            }
          }}
          onLogout={() => {
            setShowChangePassword(false);
            if (onLogout) {
              onLogout();
            }
          }}
        />
      </Modal>

      {/* ── Account Info Modal ── */}
      <Modal
        visible={showAccountInfo}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAccountInfo(false)}
      >
        <AccountInfoScreen
          onBack={() => setShowAccountInfo(false)}
          subscriptionPlanName={subscriptionPlanName}
          subscriptionEndDate={subscriptionEndDate}
          onOpenSubscription={() => {
            setShowAccountInfo(false);
            setTimeout(() => setShowSubscriptionDetails(true), 220);
          }}
        />
      </Modal>

      {/* ── Subscription Details Modal ── */}
      <Modal
        visible={showSubscriptionDetails}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowSubscriptionDetails(false)}
      >
        <SubscriptionDetailsScreen onBack={() => setShowSubscriptionDetails(false)} />
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SoundMateLightColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    height: 60,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Card
  profileCardContainer: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  profileCoverContainer: {
    height: 220,
    backgroundColor: '#E2E8F0',
  },
  coverPressable: {
    flex: 1,
  },
  profileCoverImage: {
    width: '100%',
    height: '100%',
  },
  profileCoverFallback: {
    flex: 1,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 100,
    height: 100,
    top: -20,
    right: -20,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    bottom: -30,
    left: -10,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginTop: -50,
    position: 'relative',
    zIndex: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: 'white',
    backgroundColor: '#E5E7EB',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileDetails: {
    marginLeft: 14,
    flex: 1,
    paddingBottom: 2,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  profileName: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#111827',
  },
  premiumBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6D28D9',
  },
  profileUsername: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  profileMetaSection: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    marginTop: 4,
  },
  profileBio: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  joinedDateRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinedDateText: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Image popup
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
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  popupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  popupOptionText: {
    fontSize: 14,
    color: '#1E293B',
  },
  popupOptionDangerText: {
    color: '#EF4444',
    fontWeight: '600',
  },

  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  imageViewerCard: {
    width: '100%',
    height: '72%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  imageViewerHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
  },
  imageViewerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  imageViewerImage: {
    flex: 1,
    width: '100%',
  },

  profileStats: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingVertical: 14,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Stats Cards
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 130,
    alignItems: 'center',
    marginRight: 12,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statsLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 5,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonIcon: {
    marginTop: 1,
  },
  tabButtonActive: {
    backgroundColor: '#55C5F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: 'white',
  },
  tabActionBar: {
    marginHorizontal: 20,
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  tabActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
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
  playlistItemActions: {
    gap: 8,
  },
  playlistItemActionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistDetailContainer: {
    flex: 1,
  },
  playlistDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  playlistDetailHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  playlistDetailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playlistDetailHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistDetailLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  playlistDetailLoadingText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  playlistDetailScroll: {
    flex: 1,
  },
  playlistDetailScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  playlistHeroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistHeroThumb: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistHeroThumbImage: {
    width: '100%',
    height: '100%',
  },
  playlistHeroContent: {
    flex: 1,
    marginLeft: 12,
  },
  playlistHeroTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  playlistHeroDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  playlistHeroMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  playlistHeroBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  playlistHeroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  playlistTracksSection: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  playlistTracksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  playlistTracksTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  playlistTracksAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  playlistTracksAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  playlistTracksLoadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  playlistTracksLoadingText: {
    marginTop: 8,
    fontSize: 13,
  },
  playlistTracksEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  playlistTracksEmptyText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  playlistTracksEmptyHint: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  playlistTracksList: {
    gap: 2,
  },
  playlistTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  playlistTrackItemLast: {
    borderBottomWidth: 0,
  },
  playlistTrackIndexBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  playlistTrackIndexText: {
    fontSize: 11,
    fontWeight: '700',
  },
  playlistTrackInfo: {
    flex: 1,
  },
  playlistTrackTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  playlistTrackSub: {
    marginTop: 2,
    fontSize: 11,
  },
  playlistTrackDuration: {
    fontSize: 11,
    marginLeft: 8,
    minWidth: 34,
    textAlign: 'right',
  },
  playlistTrackRemoveButton: {
    marginLeft: 8,
    padding: 2,
  },
  addTrackModalBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  addTrackList: {
    marginTop: 8,
  },
  addTrackListContent: {
    paddingBottom: 10,
  },
  addTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  addTrackArtworkWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addTrackArtworkImage: {
    width: '100%',
    height: '100%',
  },
  addTrackInfo: {
    flex: 1,
  },
  addTrackTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  addTrackSub: {
    marginTop: 2,
    fontSize: 11,
  },
  addTrackDuration: {
    fontSize: 11,
    marginRight: 8,
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
  filterSectionLabelSpaced: {
    marginTop: 14,
  },
  filterChipsRow: {
    paddingTop: 8,
    paddingRight: 4,
    gap: 8,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
  playlistSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  playlistSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistSheetKeyboardWrap: {
    justifyContent: 'flex-end',
  },
  playlistSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '96%',
    overflow: 'hidden',
  },
  playlistSheetHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  playlistSheetHandleBar: {
    width: 46,
    height: 4,
    borderRadius: 999,
  },
  playlistSheetScroll: {
    flexGrow: 0,
  },
  playlistSheetScrollContent: {
    paddingBottom: 16,
  },
  playlistEditorBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  playlistEditorLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  playlistEditorSectionGap: {
    marginTop: 10,
  },
  playlistEditorInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  playlistEditorInputMultiline: {
    alignItems: 'flex-start',
    minHeight: 88,
    paddingTop: 10,
  },
  playlistEditorInputText: {
    fontSize: 14,
    paddingVertical: 10,
  },
  playlistEditorInputTextMultiline: {
    textAlignVertical: 'top',
    minHeight: 66,
  },
  playlistThumbnailPreview: {
    borderWidth: 1,
    borderRadius: 12,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playlistThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playlistThumbnailEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistThumbnailEmptyText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  playlistThumbnailEditBadge: {
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
  playlistThumbnailLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistVisibilityInlineRow: {
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
  playlistVisibilityPromptText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  playlistVisibilityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playlistVisibilityOption: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  playlistVisibilityOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playlistEditorFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },
  playlistEditorFooterButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistEditorCancelButton: {
    borderWidth: 1,
  },
  playlistEditorSaveButton: {
    borderWidth: 0,
  },
  playlistEditorCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  playlistEditorSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    color: '#9CA3AF',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#55C5F1',
    marginRight: 6,
  },

  // Post Composer
  composerContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  composerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  composerCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  composerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  composerPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  composerQuickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  composerQuickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareMusicSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  shareMusicSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareMusicSectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  shareMusicSectionInfo: {
    flex: 1,
  },
  shareMusicSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  shareMusicSectionDesc: {
    marginTop: 2,
    fontSize: 12,
  },
  shareMusicOpenButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareMusicOpenButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  shareMusicModalCard: {
    width: '92%',
    maxHeight: '75%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shareMusicLoadingWrap: {
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareMusicEmptyWrap: {
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareMusicHintText: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  shareMusicList: {
    width: '100%',
  },
  shareMusicListContent: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  shareMusicItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  shareMusicItemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  shareMusicItemFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareMusicItemInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  shareMusicItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  shareMusicItemArtist: {
    marginTop: 2,
    fontSize: 12,
  },
  shareMusicItemButton: {
    minWidth: 78,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  shareMusicItemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  composerExpanded: {
    padding: 16,
  },
  composerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  composerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  composerUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  composerFeeling: {
    fontSize: 12,
    color: '#6B7280',
  },
  composerFeelingText: {
    color: '#55C5F1',
    fontWeight: '500',
  },
  composerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerTextInput: {
    fontSize: 15,
    color: '#1E293B',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  composerFeelingsContainer: {
    marginBottom: 12,
  },
  composerFeelingsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  composerFeelingChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  composerFeelingChipActive: {
    backgroundColor: '#55C5F1',
    borderColor: '#55C5F1',
  },
  composerFeelingChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  composerFeelingChipTextActive: {
    color: 'white',
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  composerActionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  composerActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#55C5F1',
  },
  composerPostButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  composerPostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  composerPostButtonTextDisabled: {
    color: '#D1D5DB',
  },

  // Post Card
  postCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postUserName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postUserNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  postFeeling: {
    fontSize: 12,
    color: '#6B7280',
  },
  postFeelingText: {
    color: '#55C5F1',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postMetaSeparator: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  postLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  postLocationText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postMenuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    width: 180,
  },
  postMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  postMenuItemText: {
    fontSize: 13,
    color: '#1E293B',
  },
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  postContentText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 22,
  },
  postImageSingle: {
    width: '100%',
  },
  postImageSingleImg: {
    width: '100%',
    height: 300,
  },
  postImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postImageGridImg: {
    width: '50%',
    height: 180,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  postStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postLikeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#55C5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postStatsRight: {
    flexDirection: 'row',
    gap: 12,
  },
  postStatsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  postActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#55C5F1' + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Playlist Grid
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  playlistCard: {
    width: (width - 52) / 2,
    aspectRatio: 4 / 5,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  playlistImage: {
    width: '100%',
    height: '100%',
  },
  playlistGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  playlistTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playlistSongs: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  playlistPlayButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#55C5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Settings Drawer
  settingsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  settingsBackdropTouchable: {
    flex: 1,
  },
  settingsDrawer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  settingsHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  settingsHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  settingsCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSection: {
    paddingVertical: 12,
  },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  settingsMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsMenuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  settingsMenuSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginRight: 8,
  },
  settingsMenuBadge: {
    backgroundColor: '#A78BFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  settingsMenuBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  settingsLogoutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  settingsLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  settingsLogoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  settingsVersion: {
    textAlign: 'center',
    fontSize: 12,
    color: '#D1D5DB',
    paddingBottom: 24,
  },

  uploadBlockingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  uploadBlockingCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  uploadBlockingText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  uploadBlockingHint: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 20,
  },

});

