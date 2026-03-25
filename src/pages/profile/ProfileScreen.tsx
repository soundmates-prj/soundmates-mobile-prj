import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated as RNAnimated,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { showToast } from '../../../components/ui/Toast';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { authService, BlogPostResponse, blogService, paymentService, ReactionResponse, UpdateProfileRequest } from '../../api';
import { BlogPostCard, DisplayPost } from '../../components/blog/BlogPostCard';
import { ThemePreference, useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import BottomNavigation, { TabName } from '../BottomNavigation';
import CreatePostScreen, { EditablePostDraft } from '../blog/CreatePostScreen';
import PostDetailScreen from '../blog/PostDetailScreen';
import AccountInfoScreen from './AccountInfoScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import EditProfileScreen from './EditProfileScreen';
import SubscriptionDetailsScreen from './SubscriptionDetailsScreen';

const { width, height } = Dimensions.get('window');
const defaultAvatarUrl = 'https://i.pravatar.cc/150?img=10';

// ─── Sub-Components ──────────────────────────────────────────────

function StatItem({ label, value, palette, delay = 0 }: { label: string, value: string | number, palette: any, delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={styles.statItem}>
      <Text style={[styles.statValue, { color: palette.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

function MenuCard({ icon, label, subtitle, color, badge, onPress, palette, isDarkMode }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.menuCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={[styles.menuIconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: palette.textPrimary }]}>{label}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: palette.textSecondary }]}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={[styles.menuBadge, { backgroundColor: palette.primary }]}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={palette.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Main ProfileScreen ─────────────────────────────────

export default function ProfileScreen({ onBackToHome, onLogout }: any) {
  const { user, saveUser, refreshUser } = useUser();
  const { isDarkMode, themePreference, setThemePreference, effectiveTheme } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  const [activeTab, setActiveTab] = useState<'posts' | 'playlists'>('posts');
  const [myPosts, setMyPosts] = useState<DisplayPost[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [subscriptionPlanName, setSubscriptionPlanName] = useState('Premium');

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [100, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const fetchMyPosts = useCallback(async (refresh = false) => {
    if (!user?.userId) return;
    if (refresh) setIsRefreshing(true);
    else setIsPostsLoading(true);

    try {
      const result = await blogService.getMyPosts({ page: 1, pageSize: 20 });
      if (result.success && result.data) {
        const mapped = result.data.items.map((post: any) => ({
          ...post,
          reactionCount: 0,
          commentCount: 0,
          viewCount: 0,
          isLiked: false,
        }));
        setMyPosts(mapped);
      }
    } catch (e) {
      console.log('Fetch posts error', e);
    } finally {
      setIsPostsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: onLogout }
    ]);
  };

  const albumArt = user?.profileImageUrl || defaultAvatarUrl;

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      {/* Animated Sticky Header */}
      <RNAnimated.View style={[styles.stickyHeader, { opacity: headerOpacity, backgroundColor: palette.surface + 'E6' }]}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint={isDarkMode ? 'dark' : 'light'} />
        <View style={styles.headerContent}>
          <Text style={[styles.stickyTitle, { color: palette.textPrimary }]}>{user?.username || 'Profile'}</Text>
        </View>
      </RNAnimated.View>

      <RNAnimated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchMyPosts(true)} colors={[palette.primary]} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Animated.View entering={FadeInDown.delay(100)} style={styles.avatarWrapper}>
            <LinearGradient colors={[palette.primary, '#A78BFA']} style={styles.avatarGradient}>
              <Image source={{ uri: albumArt }} style={styles.avatar} />
            </LinearGradient>
            <TouchableOpacity
              style={[styles.editBadge, { backgroundColor: palette.primary }]}
              onPress={() => setShowEditProfile(true)}
            >
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.nameWrapper}>
            <Text style={[styles.displayName, { color: palette.textPrimary }]}>
              {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}
            </Text>
            <Text style={[styles.username, { color: palette.textSecondary }]}>@{user?.username}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.statsRow}>
            <StatItem label="Bài viết" value={myPosts.length} palette={palette} delay={350} />
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <StatItem label="Followers" value="1.2k" palette={palette} delay={400} />
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <StatItem label="Following" value="856" palette={palette} delay={450} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)} style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowEditProfile(true)}
              style={[styles.primaryActionBtn, { backgroundColor: palette.primary }]}
            >
              <Text style={styles.primaryActionText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={[styles.secondaryActionBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Ionicons name="settings-outline" size={20} color={palette.textPrimary} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Profile Content */}
        <View style={styles.contentSection}>
          <View style={styles.tabHeader}>
            <TouchableOpacity
              onPress={() => setActiveTab('posts')}
              style={[styles.tabItem, activeTab === 'posts' && { borderBottomColor: palette.primary }]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'posts' ? palette.textPrimary : palette.textSecondary }]}>Bài viết</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('playlists')}
              style={[styles.tabItem, activeTab === 'playlists' && { borderBottomColor: palette.primary }]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'playlists' ? palette.textPrimary : palette.textSecondary }]}>Playlists</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'posts' ? (
              <View style={styles.postsGrid}>
                {isPostsLoading ? (
                  <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
                ) : myPosts.length > 0 ? (
                  myPosts.map((post, idx) => (
                    <Animated.View key={post.id} entering={FadeInUp.delay(idx * 100)}>
                      <BlogPostCard post={post} onLike={() => { }} onNavigateToDetail={() => { }} />
                    </Animated.View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="newspaper-outline" size={48} color={palette.border} />
                    <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có bài viết nào</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={48} color={palette.border} />
                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có playlist nào</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Cài đặt tài khoản</Text>
          <MenuCard
            icon="person-outline"
            label="Thông tin tài khoản"
            color="#55C5F1"
            palette={palette}
            onPress={() => { }}
          />
          <MenuCard
            icon="card-outline"
            label="Gói đăng ký"
            subtitle={subscriptionPlanName}
            color="#A78BFA"
            badge="Premium"
            palette={palette}
            onPress={() => { }}
          />
          <MenuCard
            icon="moon-outline"
            label="Giao diện"
            subtitle={isDarkMode ? 'Tối' : 'Sáng'}
            color="#6366F1"
            palette={palette}
            onPress={() => setThemePreference(isDarkMode ? 'light' : 'dark')}
          />
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { borderColor: '#EF4444' }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </RNAnimated.ScrollView>

      {/* Modals */}
      <Modal visible={showEditProfile} animationType="slide" transparent>
        <EditProfileScreen onBack={() => setShowEditProfile(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  headerContent: {
    alignItems: 'center',
  },
  stickyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  nameWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 30,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 20,
    opacity: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  primaryActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  contentSection: {
    marginBottom: 30,
  },
  tabHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 30,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tabContent: {
    paddingTop: 20,
  },
  postsGrid: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  menuSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 20,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
});
