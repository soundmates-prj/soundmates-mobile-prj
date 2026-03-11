import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { showToast } from '../../../components/ui/Toast';
import { SoundMateLightColors } from '../../../constants/theme';
import { useUser } from '../../context/UserContext';
import BottomNavigation, { TabName } from '../BottomNavigation';
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

interface Post {
  id: string;
  content: string;
  images: string[];
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  time: string;
  feeling?: string;
  location?: string;
}

const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    content:
      'Hôm nay nghe lại album "Khói" của Hoàng Dũng, cảm giác như quay về những ngày mưa Sài Gòn, ngồi trong quán cà phê nhỏ và để nhạc trôi qua từng khoảnh khắc. Âm nhạc thật kỳ diệu khi có thể đưa ta về một ký ức mà ta tưởng đã quên. 🎶☕',
    images: [
      'https://images.unsplash.com/photo-1766008596001-5fbe283bed0a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBib29rJTIwY296eSUyMG1vcm5pbmd8ZW58MXx8fHwxNzczMDczNTY4fDA&ixlib=rb-4.1.0&q=80&w=600',
    ],
    likes: 48,
    comments: 12,
    shares: 5,
    isLiked: false,
    isBookmarked: false,
    time: '2 giờ trước',
    feeling: 'hoài niệm',
    location: 'Quận 1, TP.HCM',
  },
  {
    id: '2',
    content:
      'Vừa hoàn thành playlist "Đêm Không Ngủ" — 42 bài cho những đêm thức khuya sáng tạo. Từ Lofi chill đến Post-rock, ai cần thì save nhé! 🌙✨\n\n#SoundMates #NightPlaylist #LofiVibes',
    images: [],
    likes: 127,
    comments: 34,
    shares: 21,
    isLiked: true,
    isBookmarked: true,
    time: '1 ngày trước',
  },
  {
    id: '3',
    content:
      'Sunset session trên rooftop tối qua thật tuyệt vời! DJ Minh Tú đã mang đến một set nhạc house mê ly. Cảm ơn SoundMates đã tổ chức sự kiện này 🎧🌇',
    images: [
      'https://images.unsplash.com/photo-1725388327563-fd641d24422f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwc3Vuc2V0JTIwcm9vZnRvcCUyMHVyYmFufGVufDF8fHx8MTc3MzEzNzY1NHww&ixlib=rb-4.1.0&q=80&w=600',
      'https://images.unsplash.com/photo-1594328082848-b22344d4313b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW55bCUyMHJlY29yZCUyMHBsYXllciUyMHJldHJvJTIwbXVzaWN8ZW58MXx8fHwxNzczMTM3NjU0fDA&ixlib=rb-4.1.0&q=80&w=600',
    ],
    likes: 256,
    comments: 43,
    shares: 18,
    isLiked: false,
    isBookmarked: false,
    time: '3 ngày trước',
    location: 'Landmark 81, TP.HCM',
  },
];

const FEELINGS = ['vui vẻ', 'hoài niệm', 'hào hứng', 'bình yên', 'sáng tạo', 'mệt mỏi', 'hạnh phúc', 'tập trung'];

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

// ─── Sub-components ─────────────────────────────────────

function PostComposer({ onPost }: { onPost: (content: string, feeling?: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const handlePost = () => {
    if (!text.trim()) return;
    onPost(text.trim(), selectedFeeling || undefined);
    setText('');
    setSelectedFeeling(null);
    setIsExpanded(false);
    setShowFeelings(false);
  };

  return (
    <View style={styles.composerContainer}>
      <View style={styles.composerCard}>
        {/* Collapsed view */}
        {!isExpanded ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setIsExpanded(true);
              setTimeout(() => textInputRef.current?.focus(), 100);
            }}
            style={styles.composerCollapsed}
          >
            <Image
              source={{ uri: 'https://i.pravatar.cc/150?img=10' }}
              style={styles.composerAvatar}
            />
            <View style={styles.composerPlaceholder}>
              <Text style={styles.composerPlaceholderText}>Bạn đang nghĩ gì?</Text>
            </View>
            <View style={styles.composerQuickActions}>
              <View style={[styles.composerQuickIcon, { backgroundColor: '#10B981' + '1A' }]}>
                <Ionicons name="image-outline" size={18} color="#10B981" />
              </View>
              <View style={[styles.composerQuickIcon, { backgroundColor: '#55C5F1' + '1A' }]}>
                <Ionicons name="musical-notes-outline" size={18} color="#55C5F1" />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          /* Expanded composer */
          <View style={styles.composerExpanded}>
            {/* Top row */}
            <View style={styles.composerHeader}>
              <View style={styles.composerUserInfo}>
                <Image
                  source={{ uri: 'https://i.pravatar.cc/150?img=10' }}
                  style={styles.composerAvatar}
                />
                <View>
                  <Text style={styles.composerUserName}>Minh Anh</Text>
                  {selectedFeeling && (
                    <Text style={styles.composerFeeling}>
                      đang cảm thấy <Text style={styles.composerFeelingText}>{selectedFeeling}</Text>
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsExpanded(false);
                  setText('');
                  setSelectedFeeling(null);
                  setShowFeelings(false);
                }}
                style={styles.composerCloseButton}
              >
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* TextInput */}
            <TextInput
              ref={textInputRef}
              value={text}
              onChangeText={setText}
              placeholder="Chia sẻ suy nghĩ của bạn..."
              placeholderTextColor="#D1D5DB"
              multiline
              numberOfLines={4}
              style={styles.composerTextInput}
            />

            {/* Feeling chips */}
            {showFeelings && (
              <View style={styles.composerFeelingsContainer}>
                <View style={styles.composerFeelingsChips}>
                  {FEELINGS.map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => {
                        setSelectedFeeling(selectedFeeling === f ? null : f);
                      }}
                      style={[
                        styles.composerFeelingChip,
                        selectedFeeling === f && styles.composerFeelingChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.composerFeelingChipText,
                          selectedFeeling === f && styles.composerFeelingChipTextActive,
                        ]}
                      >
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Action bar */}
            <View style={styles.composerActions}>
              <View style={styles.composerActionButtons}>
                <TouchableOpacity style={[styles.composerActionIcon, { backgroundColor: '#10B981' + '1A' }]}>
                  <Ionicons name="image-outline" size={18} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.composerActionIcon, { backgroundColor: '#55C5F1' + '1A' }]}>
                  <Ionicons name="musical-notes-outline" size={18} color="#55C5F1" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowFeelings(!showFeelings)}
                  style={[
                    styles.composerActionIcon,
                    { backgroundColor: showFeelings ? '#F59E0B' + '33' : '#F59E0B' + '1A' },
                  ]}
                >
                  <Ionicons name="happy-outline" size={18} color="#F59E0B" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.composerActionIcon, { backgroundColor: '#EF4444' + '1A' }]}>
                  <Ionicons name="location-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handlePost}
                disabled={!text.trim()}
                style={[styles.composerPostButton, !text.trim() && styles.composerPostButtonDisabled]}
              >
                <Ionicons name="send" size={14} color={text.trim() ? 'white' : '#D1D5DB'} />
                <Text style={[styles.composerPostButtonText, !text.trim() && styles.composerPostButtonTextDisabled]}>
                  Đăng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function PostCard({
  post,
  onLike,
  onBookmark,
  onDelete,
}: {
  post: Post;
  onLike: () => void;
  onBookmark: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <View style={styles.postCard}>
      {/* Post header */}
      <View style={styles.postHeader}>
        <View style={styles.postUserInfo}>
          <Image source={{ uri: 'https://i.pravatar.cc/150?img=10' }} style={styles.postAvatar} />
          <View>
            <View style={styles.postUserName}>
              <Text style={styles.postUserNameText}>Minh Anh</Text>
              {post.feeling && (
                <Text style={styles.postFeeling}>
                  — cảm thấy <Text style={styles.postFeelingText}>{post.feeling}</Text>
                </Text>
              )}
            </View>
            <View style={styles.postMeta}>
              <Text style={styles.postTime}>{post.time}</Text>
              {post.location && (
                <>
                  <Text style={styles.postMetaSeparator}>·</Text>
                  <View style={styles.postLocation}>
                    <Ionicons name="location-outline" size={10} color="#9CA3AF" />
                    <Text style={styles.postLocationText}>{post.location}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
        <View>
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.postMenuButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowMenu(false)}
              style={styles.modalBackdrop}
            >
              <View style={styles.postMenu}>
                <TouchableOpacity
                  onPress={() => {
                    onBookmark();
                    setShowMenu(false);
                  }}
                  style={styles.postMenuItem}
                >
                  <Ionicons name="bookmark-outline" size={15} color="#55C5F1" />
                  <Text style={styles.postMenuItemText}>{post.isBookmarked ? 'Bỏ lưu' : 'Lưu bài viết'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowMenu(false);
                  }}
                  style={styles.postMenuItem}
                >
                  <Ionicons name="create-outline" size={15} color="#F59E0B" />
                  <Text style={styles.postMenuItemText}>Chỉnh sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  style={styles.postMenuItem}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={[styles.postMenuItemText, { color: '#EF4444' }]}>Xóa bài viết</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>

      {/* Content */}
      <View style={styles.postContent}>
        <Text style={styles.postContentText}>{post.content}</Text>
      </View>

      {/* Images */}
      {post.images.length > 0 && (
        <View style={post.images.length === 1 ? styles.postImageSingle : styles.postImageGrid}>
          {post.images.map((img, i) => (
            <Image
              key={i}
              source={{ uri: img }}
              style={post.images.length === 1 ? styles.postImageSingleImg : styles.postImageGridImg}
            />
          ))}
        </View>
      )}

      {/* Stats row */}
      <View style={styles.postStats}>
        <View style={styles.postStatsLeft}>
          <View style={styles.postLikeIcon}>
            <Ionicons name="thumbs-up" size={10} color="white" />
          </View>
          <Text style={styles.postStatsText}>{post.likes}</Text>
        </View>
        <View style={styles.postStatsRight}>
          <Text style={styles.postStatsText}>{post.comments} bình luận</Text>
          <Text style={styles.postStatsText}>{post.shares} chia sẻ</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.postActions}>
        <TouchableOpacity onPress={onLike} style={styles.postActionButton}>
          <Ionicons
            name={post.isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={18}
            color={post.isLiked ? '#55C5F1' : '#6B7280'}
          />
          <Text style={[styles.postActionText, post.isLiked && { color: '#55C5F1' }]}>Thích</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postActionButton}>
          <Ionicons name="chatbubble-outline" size={18} color="#6B7280" />
          <Text style={styles.postActionText}>Bình luận</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postActionButton}>
          <Ionicons name="share-social-outline" size={18} color="#6B7280" />
          <Text style={styles.postActionText}>Chia sẻ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Settings Drawer ────────────────────────────────────

function SettingsDrawer({ isOpen, onClose, onOpenChangePassword, onOpenAccountInfo, onLogout }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onOpenChangePassword?: () => void;
  onOpenAccountInfo?: () => void;
  onLogout?: () => void;
}) {
  const handleMenuItemPress = (label: string) => {
    if (label === 'Đổi mật khẩu' && onOpenChangePassword) {
      onOpenChangePassword();
    } else if (label === 'Thông tin tài khoản' && onOpenAccountInfo) {
      onOpenAccountInfo();
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
  onBackToHome?: () => void;
  onNavigateToForgotPassword?: () => void;
  onLogout?: () => void;
}

export default function ProfileScreen({ onBackToHome, onNavigateToForgotPassword, onLogout }: ProfileScreenProps) {
  const { user } = useUser();
  console.log('[ProfileScreen] Current user:', user);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<'posts' | 'playlists'>('posts');
  const [activeBottomTab, setActiveBottomTab] = useState<TabName>('profile');

  // Debug: Log user changes
  useEffect(() => {
    console.log('[ProfileScreen] User data changed:', user);
  }, [user]);

  const handleTabPress = (tab: TabName) => {
    setActiveBottomTab(tab);
    
    // Navigate to home screen when home tab is pressed
    if (tab === 'home' && onBackToHome) {
      onBackToHome();
    }
  };

  const handleNewPost = (content: string, feeling?: string) => {
    const newPost: Post = {
      id: Date.now().toString(),
      content,
      images: [],
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      isBookmarked: false,
      time: 'Vừa xong',
      feeling,
    };
    setPosts([newPost, ...posts]);
  };

  const handleLike = (id: string) => {
    setPosts(
      posts.map((p) =>
        p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p,
      ),
    );
  };

  const handleBookmark = (id: string) => {
    setPosts(posts.map((p) => (p.id === id ? { ...p, isBookmarked: !p.isBookmarked } : p)));
  };

  const handleDelete = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trang cá nhân</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowEditProfile(true)} style={styles.headerButton}>
              <Ionicons name="create-outline" size={20} color="#1E293B" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCardContainer}>
          <LinearGradient
            colors={['#55C5F1', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            {/* Decorative circles */}
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />

            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: 'https://i.pravatar.cc/150?img=10' }} style={styles.avatar} />
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
                <Text style={styles.profileUsername}>@{user?.username || 'username'}</Text>
                <Text style={styles.profileBio}>Yêu nhạc, yêu cuộc sống 🎵</Text>
              </View>
            </View>

            <View style={styles.profileStats}>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatValue}>{posts.length}</Text>
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
          </LinearGradient>
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
            {/* Post Composer */}
            <PostComposer onPost={handleNewPost} />

            {/* Posts feed */}
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="create-outline" size={28} color="#55C5F1" />
                </View>
                <Text style={styles.emptyStateTitle}>Chưa có bài viết nào</Text>
                <Text style={styles.emptyStateSubtitle}>Hãy chia sẻ suy nghĩ đầu tiên của bạn!</Text>
              </View>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => handleLike(post.id)}
                  onBookmark={() => handleBookmark(post.id)}
                  onDelete={() => handleDelete(post.id)}
                />
              ))
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
          setShowSettings(false);
          setShowChangePassword(true);
        }}
        onOpenAccountInfo={() => {
          setShowSettings(false);
          setShowAccountInfo(true);
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
        <AccountInfoScreen onBack={() => setShowAccountInfo(false)} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 52,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile Card
  profileCardContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileCard: {
    padding: 24,
    position: 'relative',
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
    position: 'relative',
    zIndex: 10,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  premiumBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  profileUsername: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
    zIndex: 10,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  profileStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
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

