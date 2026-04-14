import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
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
  authApiClient,
  authService,
  BlogPostResponse,
  blogService,
  FavoriteItemResponse,
  favoriteService,
  paymentService,
  PlaylistVisibility,
  podcastService,
  ReactionResponse,
  UpdateProfileRequest,
  uploadService,
  UserPlaylistResponse,
  userPlaylistService,
} from '../../api';
import { DisplayPost, ReactionType } from '../../components/blog/BlogPostCard';
import FormTextField from '../../components/ui/FormTextField';
import { showToast } from '../../components/ui/Toast';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import BottomNavigation, { TabName } from '../BottomNavigation';
import CreatePostScreen, { EditablePostDraft } from '../blog/CreatePostScreen';
import PostDetailScreen from '../blog/PostDetailScreen';
import AccountInfoScreen from './AccountInfoScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import EditProfileScreen from './EditProfileScreen';
import styles from './ProfileScreen.styles';
import SubscriptionDetailsScreen from './SubscriptionDetailsScreen';
import PlaylistDetailModal from './components/PlaylistDetailModal';
import ProfileFavoritesTab from './components/ProfileFavoritesTab';
import ProfilePlaylistsTab from './components/ProfilePlaylistsTab';
import ProfilePostsTab from './components/ProfilePostsTab';

export interface ApiTheme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  gradientBackground?: string;
}

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
  const candidateShareMusic = post.shareMusic || (post as any).share_music || (post as any).sharedMusic;
  let normalizedShareMusic = null;
  if (candidateShareMusic) {
    if (typeof candidateShareMusic === 'string') {
      try {
        normalizedShareMusic = JSON.parse(candidateShareMusic);
      } catch (e) {
        normalizedShareMusic = null;
      }
    } else if (typeof candidateShareMusic === 'object') {
      normalizedShareMusic = candidateShareMusic;
    }
  }

  return {
    id: post.id,
    userId: post.userId,
    userFullName: post.userFullName,
    userAvatarUrl: post.userAvatarUrl,
    title: post.title,
    contentText: post.contentText,
    imageUrl: post.imageUrl,
    audioUrl: post.audioUrl,
    moodTag: post.moodTag,
    postType: post.postType || null,
    shareMusic: normalizedShareMusic,
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
  onNavigateToEditProfile?: () => void;
  onNavigateToCreatePost?: (draft?: EditablePostDraft | null) => void;
  onLogout?: () => void;
  hideBottomNav?: boolean;
  onMainTabSwipeLockChange?: (locked: boolean) => void;
}

export default function ProfileScreen({
  onBackToHome,
  onNavigateToForgotPassword,
  onNavigateToSubscription,
  onNavigateToEditProfile,
  onNavigateToCreatePost,
  onLogout,
  hideBottomNav = false,
  onMainTabSwipeLockChange,
}: ProfileScreenProps) {
  const { user, refreshUser, saveUser } = useUser();
  const { themePreference, effectiveTheme, isDarkMode, setThemePreference } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
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
  const [availableThemes, setAvailableThemes] = useState<ApiTheme[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [appliedTheme, setAppliedTheme] = useState<ApiTheme | null>(null);

  const [globalScrollEnabled, setGlobalScrollEnabled] = useState(true);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('GlobalScrollEnabled', (enabled: boolean) => {
      setGlobalScrollEnabled(enabled);
    });

    const reactSub = DeviceEventEmitter.addListener('PostReactionUpdated', ({ postId, newReaction }) => {
      setMyPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id !== postId) return post;
          const currentReaction = post.myReactionType ?? (post.isLiked ? 'like' : null);
          if (currentReaction === newReaction) return post;

          const isRemoving = newReaction === null;
          if (isRemoving) {
            return { ...post, isLiked: false, myReactionType: null, reactionCount: Math.max(0, post.reactionCount - 1) };
          } else {
            const countDelta = currentReaction ? 0 : 1;
            return { ...post, isLiked: true, myReactionType: newReaction, reactionCount: post.reactionCount + countDelta };
          }
        })
      );
    });

    return () => {
      sub.remove();
      reactSub.remove();
    };
  }, []);

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedId = await AsyncStorage.getItem('profilescreen_active_theme_id');
        if (savedId) {
          const res = await authApiClient.get('/themes/active');
          if (res.data?.success && res.data?.data?.items) {
            const items = res.data.data.items as ApiTheme[];
            const theme = items.find(t => t.id === savedId);
            if (theme) {
              setAvailableThemes(items);
              setAppliedTheme(theme);
              setPreviewThemeId(theme.id);
            }
          }
        }
      } catch (e) { }
    }
    loadSavedTheme();
  }, []);
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

  const shouldLockMainTabSwipe =
    showEditProfile
    || showChangePassword
    || showAccountInfo
    || showSubscriptionDetails
    || showCreatePost
    || !!selectedPostId;

  useEffect(() => {
    if (!onMainTabSwipeLockChange) {
      return;
    }

    onMainTabSwipeLockChange(shouldLockMainTabSwipe);

    return () => {
      onMainTabSwipeLockChange(false);
    };
  }, [onMainTabSwipeLockChange, shouldLockMainTabSwipe]);

  const themeLabel = themePreference === 'system'
    ? `Tự động (${effectiveTheme === 'dark' ? 'Tối' : 'Sáng'})`
    : themePreference === 'dark'
      ? 'Tối'
      : 'Sáng';

  const handleOpenThemeSettings = useCallback(async () => {
    setShowThemePickerPopup(true);
    // If not loaded yet, fetch themes
    if (availableThemes.length === 0) {
      setIsLoadingThemes(true);
      try {
        const res = await authApiClient.get('/themes/active');
        if (res.data?.success && res.data?.data?.items) {
          setAvailableThemes(res.data.data.items as ApiTheme[]);
        }
      } catch (e) {
        console.log('Error fetching themes:', e);
      } finally {
        setIsLoadingThemes(false);
      }
    }
    setPreviewThemeId(appliedTheme?.id || null);
  }, [availableThemes.length, appliedTheme]);

  const handlePreviewApiTheme = useCallback((themeId: string) => {
    setPreviewThemeId(themeId);
  }, []);

  const handleConfirmApiTheme = useCallback(async () => {
    setShowThemePickerPopup(false);
    if (!previewThemeId) return;

    const selectedTheme = availableThemes.find(t => t.id === previewThemeId);
    if (selectedTheme) {
      setAppliedTheme(selectedTheme);
      await setThemePreference(selectedTheme.mode === 'dark' ? 'dark' : 'light');
      try {
        await AsyncStorage.setItem('profilescreen_active_theme_id', selectedTheme.id);
      } catch (e) { }

      showToast.success('Đã cập nhật giao diện', `Áp dụng chủ đề: ${selectedTheme.name}`);
    }
  }, [previewThemeId, availableThemes, setThemePreference]);

  const handleCancelThemePicker = useCallback(() => {
    setShowThemePickerPopup(false);
    setPreviewThemeId(appliedTheme?.id || null);
  }, [appliedTheme]);

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
      if (favoriteItemTypeFilter === 'podcast') {
        const podcasts = await podcastService.getSavedPodcasts();
        const mapped: FavoriteItemResponse[] = podcasts.map(p => ({
          id: p.id,
          itemId: p.id,
          itemType: 'podcast',
          source: 'soundmates',
          name: p.title,
          artistName: p.author || 'Podcast',
          imgUrl: p.banner || undefined,
        }));
        setFavoriteItems(mapped);
      } else {
        const result = await favoriteService.getFavorites({
          itemType: favoriteItemTypeFilter,
          source: favoriteSourceFilter,
        });

        if (result.success) {
          setFavoriteItems(result.data);
        } else {
          setFavoriteItems([]);
        }
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
              const userReaction = user ? reactions.find((reaction: ReactionResponse) => reaction.userId === user.userId) : null;
              const isLiked = !!userReaction;
              const myReactionType = userReaction ? (userReaction.reactionType?.toLowerCase() as ReactionType) : null;

              return {
                ...post,
                reactionCount: stats?.reactionCount ?? post.reactionCount,
                commentCount: stats?.commentCount ?? post.commentCount,
                viewCount: stats?.viewCount ?? post.viewCount,
                isLiked,
                myReactionType,
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

  const handleReactPost = useCallback(async (postId: string, newReaction: ReactionType | null) => {
    const targetPost = myPosts.find((post) => post.id === postId);
    if (!targetPost) return;

    const currentReaction = targetPost.myReactionType ?? (targetPost.isLiked ? 'like' as ReactionType : null);
    const isRemoving = newReaction === null;

    setMyPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        if (isRemoving) {
          return { ...post, isLiked: false, myReactionType: null, reactionCount: Math.max(0, post.reactionCount - 1) };
        } else {
          const countDelta = currentReaction ? 0 : 1;
          return { ...post, isLiked: true, myReactionType: newReaction, reactionCount: post.reactionCount + countDelta };
        }
      }),
    );

    try {
      if (isRemoving) {
        await blogService.removeReaction(postId);
      } else {
        if (currentReaction) {
          await blogService.removeReaction(postId);
        }
        await blogService.addReaction(postId, newReaction);
      }
    } catch (error) {
      setMyPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
              ...post,
              isLiked: targetPost.isLiked,
              myReactionType: targetPost.myReactionType,
              reactionCount: targetPost.reactionCount,
            }
            : post,
        ),
      );
      console.log('[ProfileScreen] handleReactPost error:', error);
    }
  }, [myPosts]);

  const handleOpenCreatePost = useCallback(() => {
    if (onNavigateToCreatePost) {
      onNavigateToCreatePost();
      return;
    }

    setEditingPost(null);
    setShowCreatePost(true);
  }, [onNavigateToCreatePost]);

  const handleEditPost = useCallback((post: DisplayPost) => {
    const draft: EditablePostDraft = {
      id: post.id,
      title: post.title,
      contentText: post.contentText,
      moodTag: post.moodTag,
      imageUrl: post.imageUrl,
    };

    if (onNavigateToCreatePost) {
      onNavigateToCreatePost(draft);
      return;
    }

    setEditingPost(draft);
    setShowCreatePost(true);
  }, [onNavigateToCreatePost]);

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
        scrollEnabled={globalScrollEnabled}
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
                <TouchableOpacity onPress={() => onNavigateToEditProfile ? onNavigateToEditProfile() : setShowEditProfile(true)} style={[styles.headerButton, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.35)' }]}>
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
                      ? `${user.lastName} ${user.firstName}`
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
          <ProfilePostsTab
            palette={palette}
            isDarkMode={isDarkMode}
            avatarUrl={avatarUrl}
            firstName={user?.firstName}
            isPostsLoading={isPostsLoading}
            myPosts={myPosts}
            postsPage={postsPage}
            postsTotalPages={postsTotalPages}
            onOpenCreatePost={handleOpenCreatePost}
            onReactPost={handleReactPost}
            onOpenPostDetail={setSelectedPostId}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onLoadMore={(page) => {
              void fetchMyPosts(page);
            }}
          />
        )}

        {activeProfileTab === 'playlists' && (
          <ProfilePlaylistsTab
            palette={palette}
            userPlaylists={userPlaylists}
            isPlaylistsLoading={isPlaylistsLoading}
            onOpenCreatePlaylistEditor={openCreatePlaylistEditor}
            onOpenPlaylistDetail={openPlaylistDetail}
            getPlaylistVisibilityLabel={getPlaylistVisibilityLabel}
          />
        )}

        {activeProfileTab === 'favorites' && (
          <ProfileFavoritesTab
            palette={palette}
            favoriteItemTypeOptions={favoriteItemTypeOptions}
            favoriteItemTypeFilter={favoriteItemTypeFilter}
            onChangeFavoriteItemTypeFilter={setFavoriteItemTypeFilter}
            isFavoritesLoading={isFavoritesLoading}
            favoriteItems={favoriteItems}
          />
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
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancelThemePicker} />

          <View style={[styles.popupCard, { backgroundColor: palette.surface, borderColor: palette.border, maxHeight: '80%' }]}>
            <View style={[styles.popupHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.popupTitle, { color: palette.textPrimary }]}>Giao diện thư viện</Text>
              <TouchableOpacity onPress={handleCancelThemePicker}>
                <Ionicons name="close" size={18} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {isLoadingThemes ? (
                <ActivityIndicator style={{ padding: 20 }} color={palette.primary} />
              ) : availableThemes.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 20, color: palette.textSecondary }}>Đang trống.</Text>
              ) : (
                availableThemes.map(theme => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[styles.popupOption, { borderBottomColor: palette.border, paddingVertical: 12 }]}
                    onPress={() => handlePreviewApiTheme(theme.id)}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: theme.primaryColor, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.popupOptionText, { color: palette.textPrimary }]}>{theme.name}</Text>
                      <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 2 }}>{theme.mode === 'dark' ? 'Giao diện tối' : 'Giao diện sáng'}</Text>
                    </View>
                    {previewThemeId === theme.id && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 16, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: palette.border }}>
              <TouchableOpacity onPress={handleCancelThemePicker} style={{ marginRight: 16, paddingVertical: 8, paddingHorizontal: 16 }}>
                <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmApiTheme} style={{ paddingVertical: 8, paddingHorizontal: 16, backgroundColor: palette.primary, borderRadius: 6 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
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


