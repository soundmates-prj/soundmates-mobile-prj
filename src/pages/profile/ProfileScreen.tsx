import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { showToast } from '../../../components/ui/Toast';
import { SoundMateLightColors } from '../../../constants/theme';
import { BlogPostResponse, blogService, ReactionResponse } from '../../api';
import { BlogPostCard, DisplayPost } from '../../components/blog/BlogPostCard';
import { useUser } from '../../context/UserContext';
import BottomNavigation, { TabName } from '../BottomNavigation';
import CreatePostScreen, { EditablePostDraft } from '../blog/CreatePostScreen';
import PostDetailScreen from '../blog/PostDetailScreen';
import AccountInfoScreen from './AccountInfoScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import EditProfileScreen from './EditProfileScreen';

const { width } = Dimensions.get('window');

// ─── Data ───────────────────────────────────────────────

const FAVORITE_PLAYLISTS = [
  {
    id: '1',
    title: 'Chill Vibes',
    songs: 24,
    image:
      'https://images.unsplash.com/photo-1735748917428-be035e873f97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBuaWdodCUyMGxpZ2h0c3xlbnwxfHx8fDE3NzMxMTQ3NDN8MA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: '2',
    title: 'Acoustic Morning',
    songs: 18,
    image:
      'https://images.unsplash.com/photo-1758610605872-3195caed0bdd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxndWl0YXIlMjBhY291c3RpYyUyMHdvb2RlbiUyMHdhcm18ZW58MXx8fHwxNzczMTM0ODgxfDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: '3',
    title: 'EDM Party',
    songs: 42,
    image:
      'https://images.unsplash.com/photo-1616709309768-cdb92831d728?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBkaiUyMG5lb258ZW58MXx8fHwxNzczMDI1MjQyfDA&ixlib=rb-4.1.0&q=80&w=400',
  },
];

const MENU_ITEMS = [
  {
    group: 'Tài khoản',
    items: [
      { icon: 'person-outline', label: 'Thông tin tài khoản', color: '#55C5F1' },
      { icon: 'card-outline', label: 'Gói đăng ký', color: '#A78BFA', badge: 'Premium' },
      { icon: 'bookmark-outline', label: 'Bài viết đã lưu', color: '#10B981' },
      { icon: 'lock-closed-outline', label: 'Đổi mật khẩu', color: '#6366F1' },
    ],
  },
  {
    group: 'Cài đặt hệ thống',
    items: [
      { icon: 'notifications-outline', label: 'Thông báo', color: '#F59E0B' },
      { icon: 'globe-outline', label: 'Ngôn ngữ', color: '#3B82F6', subtitle: 'Tiếng Việt' },
      { icon: 'moon-outline', label: 'Giao diện', color: '#6366F1', subtitle: 'Sáng' },
      { icon: 'shield-checkmark-outline', label: 'Bảo mật & Quyền riêng tư', color: '#EF4444' },
    ],
  },
  {
    group: 'Khác',
    items: [
      { icon: 'help-circle-outline', label: 'Trợ giúp & Hỗ trợ', color: '#55C5F1' },
      { icon: 'star-outline', label: 'Đánh giá ứng dụng', color: '#F59E0B' },
      { icon: 'share-social-outline', label: 'Chia sẻ ứng dụng', color: '#10B981' },
      { icon: 'flag-outline', label: 'Báo cáo sự cố', color: '#9CA3AF' },
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
    status: post.status,
    createdAt: post.createdAt,
    publishedAt: post.publishedAt,
    reactionCount: 0,
    commentCount: 0,
    viewCount: 0,
    isLiked: false,
  };
}

function PostComposer({ onPress, avatarUrl }: { onPress: () => void; avatarUrl?: string }) {
  return (
    <View style={styles.composerContainer}>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.composerCard}>
        <View style={styles.composerCollapsed}>
          <Image
            source={{ uri: avatarUrl || 'https://i.pravatar.cc/150?img=10' }}
            style={styles.composerAvatar}
          />
          <View style={styles.composerPlaceholder}>
            <Text style={styles.composerPlaceholderText}>Bạn đang nghĩ gì?</Text>
          </View>
          <View style={styles.composerQuickActions}>
            <View style={[styles.composerQuickIcon, { backgroundColor: '#10B9811A' }]}>
              <Ionicons name="image-outline" size={18} color="#10B981" />
            </View>
            <View style={[styles.composerQuickIcon, { backgroundColor: '#55C5F11A' }]}>
              <Ionicons name="musical-notes-outline" size={18} color="#55C5F1" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Settings Drawer ────────────────────────────────────

function SettingsDrawer({ isOpen, onClose, onOpenChangePassword, onOpenAccountInfo, onOpenSubscription, onLogout }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onOpenChangePassword?: () => void;
  onOpenAccountInfo?: () => void;
  onOpenSubscription?: () => void;
  onLogout?: () => void;
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
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.settingsBackdrop}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.settingsBackdropTouchable} />
        <View style={styles.settingsDrawer}>
          {/* Handle */}
          <View style={styles.settingsHandle}>
            <View style={styles.settingsHandleBar} />
          </View>

          {/* Header */}
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Cài đặt & Tùy chỉnh</Text>
            <TouchableOpacity onPress={onClose} style={styles.settingsCloseButton}>
              <Ionicons name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Menu sections */}
            {MENU_ITEMS.map((section) => (
              <View key={section.group} style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{section.group}</Text>
                {section.items.map((item) => (
                  <TouchableOpacity 
                    key={item.label} 
                    style={styles.settingsMenuItem}
                    onPress={() => handleMenuItemPress(item.label)}
                  >
                    <View style={[styles.settingsMenuIcon, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <Text style={styles.settingsMenuLabel}>{item.label}</Text>
                    {'subtitle' in item && item.subtitle && (
                      <Text style={styles.settingsMenuSubtitle}>{item.subtitle}</Text>
                    )}
                    {'badge' in item && item.badge && (
                      <View style={styles.settingsMenuBadge}>
                        <Text style={styles.settingsMenuBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Logout */}
            <View style={styles.settingsLogoutContainer}>
              <TouchableOpacity 
                style={styles.settingsLogoutButton}
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
            <Text style={styles.settingsVersion}>SoundMates v2.1.0</Text>
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
}

export default function ProfileScreen({ onBackToHome, onNavigateToForgotPassword, onNavigateToSubscription, onLogout }: ProfileScreenProps) {
  const { user } = useUser();
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
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<EditablePostDraft | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'playlists'>('posts');
  const [activeBottomTab, setActiveBottomTab] = useState<TabName>('profile');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<DisplayPost[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isPostsRefreshing, setIsPostsRefreshing] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [totalMyPosts, setTotalMyPosts] = useState(0);

  // Debug: Log user changes
  useEffect(() => {
    console.log('[ProfileScreen] User data changed:', user);
  }, [user]);

  const handleTabPress = (tab: TabName) => {
    setActiveBottomTab(tab);

    if ((tab === 'home' || tab === 'blog' || tab === 'podcast') && onBackToHome) {
      onBackToHome(tab);
    }
  };

  const fetchMyPosts = useCallback(async (pageNum = 1, refresh = false) => {
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
          setMyPosts(enhancedPosts);
        } else {
          setMyPosts((prev) => [...prev, ...enhancedPosts]);
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
      console.error('[ProfileScreen] fetchMyPosts error:', error);
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
    if (activeTab === 'posts') {
      fetchMyPosts(1);
    }
  }, [activeTab, fetchMyPosts]);

  const handlePostsRefresh = useCallback(() => {
    fetchMyPosts(1, true);
  }, [fetchMyPosts]);

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
      console.error('[ProfileScreen] handleLikePost error:', error);
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
              console.error('[ProfileScreen] handleDeletePost error:', error);
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
    setActiveTab('posts');
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          activeTab === 'posts'
            ? <RefreshControl refreshing={isPostsRefreshing} onRefresh={handlePostsRefresh} colors={['#55C5F1']} />
            : undefined
        }
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCardContainer}>
          <View style={styles.profileCard}>
            <View style={styles.profileCoverContainer}>
              {user?.backgroundImageUrl ? (
                <Image source={{ uri: user.backgroundImageUrl }} style={styles.profileCoverImage} />
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
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=10' }} style={styles.avatar} />
                <View style={styles.onlineIndicator} />
              </View>
              <View style={styles.profileDetails}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileName}>
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.username || 'User'}
                  </Text>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                </View>
                <Text style={styles.profileUsername}>{user?.username || 'username'}</Text>
              </View>
            </View>

            <View style={styles.profileMetaSection}>
              {user?.bio && user.bio.length > 0 && (
                <Text style={styles.profileBio}>{user.bio}</Text>
              )}
              {!!joinedDateLabel && (
                <View style={styles.joinedDateRow}>
                  <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                  <Text style={styles.joinedDateText}>{joinedDateLabel}</Text>
                </View>
              )}
            </View>
            <View style={styles.profileStats}>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatValue}>{totalMyPosts}</Text>
                <Text style={styles.profileStatLabel}>Bài viết</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatValue}>128</Text>
                <Text style={styles.profileStatLabel}>Playlist</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatValue}>1.2K</Text>
                <Text style={styles.profileStatLabel}>Người theo dõi</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatValue}>856</Text>
                <Text style={styles.profileStatLabel}>Đang theo dõi</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Quick Stats Cards ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={[styles.statsIcon, { backgroundColor: '#55C5F1' + '1A' }]}>
              <Ionicons name="headset-outline" size={20} color="#55C5F1" />
            </View>
            <Text style={styles.statsValue}>234</Text>
            <Text style={styles.statsLabel}>Giờ nghe</Text>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIcon, { backgroundColor: '#10B981' + '1A' }]}>
              <Ionicons name="people-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.statsValue}>56</Text>
            <Text style={styles.statsLabel}>Phòng live</Text>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIcon, { backgroundColor: '#F59E0B' + '1A' }]}>
              <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statsValue}>12</Text>
            <Text style={styles.statsLabel}>Huy hiệu</Text>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIcon, { backgroundColor: '#A78BFA' + '1A' }]}>
              <Ionicons name="heart-outline" size={20} color="#A78BFA" />
            </View>
            <Text style={styles.statsValue}>3.4K</Text>
            <Text style={styles.statsLabel}>Lượt thích</Text>
          </View>
        </ScrollView>

        {/* ── Tabs: Bài viết / Playlist yêu thích ── */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            style={[styles.tabButton, activeTab === 'posts' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === 'posts' && styles.tabButtonTextActive]}>
              Bài viết
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('playlists')}
            style={[styles.tabButton, activeTab === 'playlists' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === 'playlists' && styles.tabButtonTextActive]}>
              Playlist yêu thích
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab Content ── */}
        {activeTab === 'posts' ? (
          <>
            <PostComposer onPress={handleOpenCreatePost} avatarUrl={user?.profileImageUrl} />

            {isPostsLoading ? (
              <View style={styles.postsLoadingContainer}>
                <ActivityIndicator size="large" color="#55C5F1" />
                <Text style={styles.postsLoadingText}>Đang tải bài viết của bạn...</Text>
              </View>
            ) : myPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="create-outline" size={28} color="#55C5F1" />
                </View>
                <Text style={styles.emptyStateTitle}>Bạn chưa có bài viết nào</Text>
                <Text style={styles.emptyStateSubtitle}>Hãy đăng bài đầu tiên để chia sẻ với cộng đồng!</Text>
              </View>
            ) : (
              myPosts.map((post) => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  onLike={() => handleLikePost(post.id)}
                  onNavigateToDetail={(postId) => setSelectedPostId(postId)}
                  showOwnerActions
                  onEdit={() => handleEditPost(post)}
                  onDelete={() => handleDeletePost(post.id)}
                />
              ))
            )}

            {!isPostsLoading && postsPage < postsTotalPages && myPosts.length > 0 && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                activeOpacity={0.8}
                onPress={() => fetchMyPosts(postsPage + 1)}
              >
                <Text style={styles.loadMoreText}>Tải thêm bài viết</Text>
                <Ionicons name="chevron-down" size={16} color="#55C5F1" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* Playlist grid */
          <View style={styles.playlistGrid}>
            {FAVORITE_PLAYLISTS.map((item) => (
              <View key={item.id} style={styles.playlistCard}>
                <Image source={{ uri: item.image }} style={styles.playlistImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.playlistGradient}
                >
                  <Text style={styles.playlistTitle}>{item.title}</Text>
                  <Text style={styles.playlistSongs}>{item.songs} bài hát</Text>
                </LinearGradient>
                <TouchableOpacity style={styles.playlistPlayButton}>
                  <Ionicons name="play" size={18} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trang cá nhân</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowEditProfile(true)} style={styles.headerButton}>
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeBottomTab} onTabPress={handleTabPress} />

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
        onLogout={onLogout}
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
          onOpenSubscription={() => {
            setShowAccountInfo(false);
            if (onNavigateToSubscription) {
              setTimeout(() => onNavigateToSubscription(), 220);
            }
          }}
        />
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
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
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

  // Bottom Spacer
  bottomSpacer: {
    height: 20,
  },

});

