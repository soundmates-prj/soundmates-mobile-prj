import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  Clipboard,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '../../../components/ui/Toast';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const mapServerGenderToLabel = (value?: string): string => {
  const normalized = (value || '').trim().toLowerCase();

  if (normalized === 'male' || normalized === 'nam') return 'Nam';
  if (normalized === 'female' || normalized === 'nu' || normalized === 'nữ') return 'Nữ';
  if (normalized === 'other' || normalized === 'khac' || normalized === 'khác') return 'Khác';

  return 'Chưa cập nhật';
};

interface AccountInfoScreenProps {
  onBack: () => void;
  onOpenSubscription?: () => void;
  subscriptionPlanName?: string;
  subscriptionEndDate?: string | null;
}

// ─── Data ───────────────────────────────────────────────

const LOGIN_SESSIONS = [
  {
    id: '1',
    device: 'iPhone 15 Pro Max',
    icon: 'phone-portrait-outline',
    os: 'iOS 18.2',
    location: 'TP.HCM, Việt Nam',
    lastActive: 'Đang hoạt động',
    isCurrent: true,
  },
  {
    id: '2',
    device: 'MacBook Pro 14"',
    icon: 'desktop-outline',
    os: 'macOS Sequoia',
    location: 'TP.HCM, Việt Nam',
    lastActive: '2 giờ trước',
    isCurrent: false,
  },
  {
    id: '3',
    device: 'Chrome — Windows',
    icon: 'globe-outline',
    os: 'Windows 11',
    location: 'Hà Nội, Việt Nam',
    lastActive: '3 ngày trước',
    isCurrent: false,
  },
];

const STORAGE_DATA = {
  used: 2.4,
  total: 10,
  breakdown: [
    { label: 'Nhạc đã tải', size: '1.2 GB', percent: 50, color: '#55C5F1' },
    { label: 'Podcast', size: '0.6 GB', percent: 25, color: '#A78BFA' },
    { label: 'Bộ nhớ đệm', size: '0.4 GB', percent: 17, color: '#F59E0B' },
    { label: 'Khác', size: '0.2 GB', percent: 8, color: '#9CA3AF' },
  ],
};

const LISTENING_STATS = {
  totalHours: 234,
  totalSongs: 3847,
  totalArtists: 412,
  topGenre: 'Acoustic',
  streak: 28,
};

// ─── Sub-components ─────────────────────────────────────

interface InfoRowProps {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  subtext?: string;
  badge?: string;
  badgeColor?: string;
  copyable?: boolean;
  verified?: boolean;
  onPress?: () => void;
  palette: typeof SoundMateLightColors | typeof SoundMateColors;
  isDarkMode: boolean;
}

function InfoRow({
  icon,
  iconColor,
  label,
  value,
  subtext,
  badge,
  badgeColor,
  copyable,
  verified,
  onPress,
  palette,
  isDarkMode,
}: InfoRowProps) {
  const handleCopy = () => {
    Clipboard.setString(value);
    showToast.success('Đã sao chép', value);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={styles.infoRow}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.infoIcon, { backgroundColor: iconColor + '12' }]}>
        <Ionicons name={icon as any} size={17} color={iconColor} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: palette.textMuted }]}>{label}</Text>
        <View style={styles.infoValueRow}>
          <Text style={[styles.infoValue, { color: palette.textPrimary }]} numberOfLines={1}>
            {value}
          </Text>
          {verified !== undefined && (
            <Ionicons
              name={verified ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={verified ? '#10B981' : '#F59E0B'}
              style={styles.verifiedIcon}
            />
          )}
        </View>
        {!!subtext && (
          <Text style={[styles.infoSubtext, { color: palette.textSecondary }]} numberOfLines={1}>
            {subtext}
          </Text>
        )}
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: (badgeColor || '#55C5F1') + '15' }]}>
          <Text style={[styles.badgeText, { color: badgeColor || '#55C5F1' }]}>{badge}</Text>
        </View>
      )}
      {copyable && (
        <TouchableOpacity onPress={handleCopy} style={[styles.copyButton, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}> 
          <Ionicons name="copy-outline" size={14} color={palette.textMuted} />
        </TouchableOpacity>
      )}
      {onPress && <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, palette }: { title: string; palette: typeof SoundMateLightColors | typeof SoundMateColors }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>{title}</Text>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function AccountInfoScreen({ onBack, onOpenSubscription, subscriptionPlanName, subscriptionEndDate }: AccountInfoScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  console.log('User data in AccountInfoScreen:', user);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const fallbackTopInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const topInset = Math.max(insets.top, fallbackTopInset);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  // Use real user data or fallback to sample data
  const displayName =
    user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username || 'User';
  const username = user?.username || 'username';
  const coverImageUrl = user?.backgroundImageUrl || null;
  const avatarUrl = user?.profileImageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=55C5F1&color=fff';
  const email = user?.email || 'user@soundmates.vn';
  const accountId = user?.userId || 'SM-2024-00128';
  const joinDate = formatDate(user?.createdAt) || '12/01/2024';
  const accountType = subscriptionPlanName?.trim() || user?.roleName || 'Premium';
  const isVerified = user?.isActive ?? true;
  const subscriptionEndDateLabel = subscriptionEndDate ? formatDate(subscriptionEndDate) : null;

  const phone = user?.phone?.trim() || 'Chưa cập nhật';
  const location = 'Hồ Chí Minh, Việt Nam';
  const birthday = user?.dateOfBirth ? formatDate(user.dateOfBirth) : 'Chưa cập nhật';
  const gender = mapServerGenderToLabel(user?.gender);
  const bio = 'Yêu nhạc, yêu cuộc sống 🎵';
  const website = user?.website?.trim() || 'Chưa cập nhật';
  const favoriteGenre = 'Acoustic, Lofi, Ballad';
  const isEmailVerified = true;
  const isPhoneVerified = !!user?.phone;
  const twoFactorEnabled = false;

  const handleClearCache = () => {
    Alert.alert(
      'Xóa bộ nhớ đệm',
      'Bạn có chắc chắn muốn xóa bộ nhớ đệm? Việc này sẽ giải phóng dung lượng nhưng có thể làm chậm ứng dụng khi tải lại dữ liệu.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            showToast.success('Đã xóa', 'Bộ nhớ đệm đã được xóa thành công');
          },
        },
      ]
    );
  };

  const handleEnable2FA = () => {
    showToast.info('Đang phát triển', 'Tính năng xác thực 2 lớp sẽ sớm được ra mắt');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topInset, backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Thông tin tài khoản</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header Card ── */}
        <View style={styles.profileCardContainer}>
          <View style={[styles.profileCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.coverContainer}>
              {coverImageUrl ? (
                <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
              ) : (
                <LinearGradient
                  colors={['#55C5F1', '#A78BFA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coverGradient}
                >
                  <View style={[styles.decorCircle, styles.decorCircle1]} />
                  <View style={[styles.decorCircle, styles.decorCircle2]} />
                </LinearGradient>
              )}
            </View>

            <View style={styles.profileContent}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarWrapper}>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  </View>
                  {isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark" size={12} color="white" />
                    </View>
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <View style={styles.profileNameRow}>
                    <Text style={[styles.profileName, { color: palette.textPrimary }]}>{displayName}</Text>
                    <View style={styles.premiumBadge}>
                      <Ionicons name="star" size={10} color="white" />
                      <Text style={styles.premiumText}>{accountType}</Text>
                    </View>
                  </View>
                  <Text style={[styles.profileUsername, { color: palette.textSecondary }]}>@{username}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Account Details ── */}
        <SectionHeader title="Chi tiết tài khoản" palette={palette} />
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <InfoRow
            icon="finger-print-outline"
            iconColor="#6366F1"
            label="Mã tài khoản"
            value={accountId}
            copyable
            palette={palette}
            isDarkMode={isDarkMode}
          />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow icon="at" iconColor="#55C5F1" label="Tên người dùng" value={`@${username}`} copyable palette={palette} isDarkMode={isDarkMode} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow icon="calendar-outline" iconColor="#10B981" label="Ngày tham gia" value={joinDate} palette={palette} isDarkMode={isDarkMode} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow
            icon="star-outline"
            iconColor="#A78BFA"
            label="Gói đăng ký"
            value={accountType}
            subtext={subscriptionEndDateLabel ? `Đến ngày ${subscriptionEndDateLabel}` : 'Đang hoạt động'}
            badge="Đang hoạt động"
            badgeColor="#10B981"
            onPress={onOpenSubscription}
            palette={palette}
            isDarkMode={isDarkMode}
          />
        </View>

        {/* ── Contact Information ── */}
        <SectionHeader title="Thông tin liên hệ" palette={palette} />
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <InfoRow
            icon="mail-outline"
            iconColor="#EF4444"
            label="Email"
            value={email}
            verified={isEmailVerified}
            copyable
            palette={palette}
            isDarkMode={isDarkMode}
          />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow
            icon="call-outline"
            iconColor="#3B82F6"
            label="Số điện thoại"
            value={phone}
            verified={isPhoneVerified}
            palette={palette}
            isDarkMode={isDarkMode}
          />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow
            icon="globe-outline"
            iconColor="#55C5F1"
            label="Website"
            value={website}
            copyable={website !== 'Chưa cập nhật'}
            palette={palette}
            isDarkMode={isDarkMode}
          />
        </View>

        {/* ── Personal Information ── */}
        <SectionHeader title="Thông tin cá nhân" palette={palette} />
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <InfoRow icon="person-outline" iconColor="#55C5F1" label="Họ và tên" value={displayName} palette={palette} isDarkMode={isDarkMode} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow icon="calendar-outline" iconColor="#F59E0B" label="Ngày sinh" value={birthday} palette={palette} isDarkMode={isDarkMode} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow icon="person-outline" iconColor="#A78BFA" label="Giới tính" value={gender} palette={palette} isDarkMode={isDarkMode} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow icon="location-outline" iconColor="#EF4444" label="Vị trí" value={location} palette={palette} isDarkMode={isDarkMode} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <InfoRow
            icon="musical-notes-outline"
            iconColor="#10B981"
            label="Thể loại yêu thích"
            value={favoriteGenre}
            palette={palette}
            isDarkMode={isDarkMode}
          />
        </View>

        {/* ── Listening Stats ── */}
        <SectionHeader title="Thống kê nghe nhạc" palette={palette} />
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#55C5F1' + '12' }]}>
              <Ionicons name="headset-outline" size={18} color="#55C5F1" />
            </View>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>{LISTENING_STATS.totalHours}h</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Tổng giờ nghe</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#A78BFA' + '12' }]}>
              <Ionicons name="musical-notes-outline" size={18} color="#A78BFA" />
            </View>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>{LISTENING_STATS.totalSongs.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Bài hát</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#EF4444' + '12' }]}>
              <Ionicons name="heart-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>{LISTENING_STATS.totalArtists.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>Nghệ sĩ</Text>
          </View>
        </View>

        {/* Streak + Top Genre */}
        <View style={styles.highlightCardsRow}>
          <LinearGradient
            colors={['#F59E0B', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.highlightCard}
          >
            <View style={styles.highlightIcon}>
              <Ionicons name="flash" size={22} color="white" />
            </View>
            <View>
              <Text style={styles.highlightValue}>{LISTENING_STATS.streak} ngày</Text>
              <Text style={styles.highlightLabel}>Chuỗi nghe liên tiếp</Text>
            </View>
          </LinearGradient>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.highlightCard}
          >
            <View style={styles.highlightIcon}>
              <Ionicons name="musical-notes" size={22} color="white" />
            </View>
            <View>
              <Text style={styles.highlightValue}>{LISTENING_STATS.topGenre}</Text>
              <Text style={styles.highlightLabel}>Thể loại nghe nhiều nhất</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Security ── */}
        <SectionHeader title="Bảo mật" palette={palette} />
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#10B981' + '10' }]}>
              <Ionicons name="shield-checkmark-outline" size={17} color="#10B981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: palette.textMuted }]}>Xác minh tài khoản</Text>
              <Text style={[styles.infoValue, { color: palette.textPrimary }]}>Đã xác minh</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#10B981' + '10' }]}>
              <Ionicons name="checkmark-circle" size={10} color="#10B981" style={{ marginRight: 2 }} />
              <Text style={[styles.badgeText, { color: '#10B981' }]}>Verified</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#F59E0B' + '10' }]}>
              <Ionicons name="finger-print-outline" size={17} color="#F59E0B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: palette.textMuted }]}>Xác thực 2 lớp</Text>
              <Text style={[styles.infoValue, { color: palette.textPrimary }]}>Chưa bật</Text>
            </View>
            <TouchableOpacity style={styles.enable2FAButton} onPress={handleEnable2FA}>
              <Text style={styles.enable2FAText}>Bật ngay</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2FA Warning */}
        {!twoFactorEnabled && (
          <View style={[styles.warningCard, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.08)', borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.38)' : 'rgba(245, 158, 11, 0.2)' }]}>
            <Ionicons name="warning-outline" size={18} color="#F59E0B" style={styles.warningIcon} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: isDarkMode ? '#FCD34D' : '#92400E' }]}>Tăng cường bảo mật</Text>
              <Text style={[styles.warningText, { color: isDarkMode ? '#FDE68A' : '#A16207' }]}> 
                Bật xác thực 2 lớp để bảo vệ tài khoản khỏi truy cập trái phép. Bạn sẽ cần xác nhận đăng nhập
                qua điện thoại.
              </Text>
            </View>
          </View>
        )}

        {/* ── Login Sessions ── */}
        <SectionHeader title="Phiên đăng nhập" palette={palette} />
        <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {(showAllSessions ? LOGIN_SESSIONS : LOGIN_SESSIONS.slice(0, 2)).map((session, index) => (
            <View key={session.id}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: palette.border }]} />}
              <View style={styles.sessionRow}>
                <View style={[styles.sessionIcon, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}>
                  <Ionicons name={session.icon as any} size={18} color={palette.textSecondary} />
                </View>
                <View style={styles.sessionContent}>
                  <View style={styles.sessionHeader}>
                    <Text style={[styles.sessionDevice, { color: palette.textPrimary }]} numberOfLines={1}>
                      {session.device}
                    </Text>
                    {session.isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Hiện tại</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.sessionInfo, { color: palette.textSecondary }]}>
                    {session.os} · {session.location}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.sessionTime,
                    { color: palette.textSecondary },
                    session.isCurrent && { color: '#10B981', fontWeight: '500' },
                  ]}
                >
                  {session.lastActive}
                </Text>
              </View>
            </View>
          ))}

          {LOGIN_SESSIONS.length > 2 && (
            <>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
              <TouchableOpacity
                style={styles.showAllButton}
                onPress={() => setShowAllSessions(!showAllSessions)}
              >
                <Text style={styles.showAllText}>
                  {showAllSessions ? 'Thu gọn' : `Xem tất cả (${LOGIN_SESSIONS.length})`}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Storage Usage ── */}
        <SectionHeader title="Dung lượng & Lưu trữ" palette={palette} />
        <View style={[styles.section, styles.storageSection, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {/* Total usage */}
          <View style={styles.storageHeader}>
            <View style={styles.storageHeaderLeft}>
              <Ionicons name="server-outline" size={16} color={palette.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.storageHeaderText, { color: palette.textPrimary }]}>Đã sử dụng</Text>
            </View>
            <Text style={styles.storageHeaderValue}>
              {STORAGE_DATA.used} GB{' '}
              <Text style={styles.storageHeaderTotal}>/ {STORAGE_DATA.total} GB</Text>
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6' }]}> 
            {STORAGE_DATA.breakdown.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.progressSegment,
                  {
                    width: `${(item.percent / 100) * (STORAGE_DATA.used / STORAGE_DATA.total) * 100}%`,
                    backgroundColor: item.color,
                    borderTopLeftRadius: index === 0 ? 99 : 0,
                    borderBottomLeftRadius: index === 0 ? 99 : 0,
                    borderTopRightRadius: index === STORAGE_DATA.breakdown.length - 1 ? 99 : 0,
                    borderBottomRightRadius: index === STORAGE_DATA.breakdown.length - 1 ? 99 : 0,
                  },
                ]}
              />
            ))}
          </View>

          {/* Breakdown */}
          <View style={styles.storageBreakdown}>
            {STORAGE_DATA.breakdown.map((item) => (
              <View key={item.label} style={styles.storageItem}>
                <View style={styles.storageItemLeft}>
                  <View style={[styles.storageItemDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.storageItemLabel, { color: palette.textSecondary }]}>{item.label}</Text>
                </View>
                <Text style={[styles.storageItemSize, { color: palette.textPrimary }]}>{item.size}</Text>
              </View>
            ))}
          </View>

          {/* Clear cache button */}
          <TouchableOpacity style={[styles.clearCacheButton, { borderColor: palette.border }]} onPress={handleClearCache}>
            <Text style={[styles.clearCacheText, { color: palette.textSecondary }]}>Xóa bộ nhớ đệm</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer Info ── */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Ionicons name="information-circle-outline" size={12} color={palette.textMuted} />
            <Text style={[styles.footerText, { color: palette.textMuted }]}>Thông tin được cập nhật lần cuối: Hôm nay, 14:30</Text>
          </View>
          <Text style={[styles.footerText, { color: palette.textMuted }]}>Mã tài khoản: {accountId}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 52,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Profile Card
  profileCardContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  coverContainer: {
    height: 100,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  coverGradient: {
    flex: 1,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  profileGradient: {
    height: 80,
    position: 'relative',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle1: {
    width: 70,
    height: 70,
    top: -15,
    right: -15,
  },
  decorCircle2: {
    width: 50,
    height: 50,
    bottom: -20,
    left: 10,
  },
  profileContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: -40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -20,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#55C5F1',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    // paddingBottom: 8,
    position: 'relative',
    top: 10,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A78BFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  premiumText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileUsername: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Section
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoValue: {
    fontSize: 15,
    color: '#1E293B',
  },
  infoSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedIcon: {
    flexShrink: 0,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
  },

  // Stats
  statsGrid: {
    marginHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },

  // Highlight Cards
  highlightCardsRow: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  highlightCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  highlightLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Security
  enable2FAButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  enable2FAText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Warning
  warningCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  warningIcon: {
    flexShrink: 0,
    marginTop: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#A16207',
    lineHeight: 18,
  },

  // Sessions
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sessionContent: {
    flex: 1,
    minWidth: 0,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sessionDevice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  currentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10B981',
  },
  sessionInfo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sessionTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  showAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#55C5F1',
  },

  // Storage
  storageSection: {
    padding: 20,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  storageHeaderValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#55C5F1',
  },
  storageHeaderTotal: {
    color: '#9CA3AF',
    fontWeight: 'normal',
  },
  progressBar: {
    flexDirection: 'row',
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressSegment: {
    height: '100%',
  },
  storageBreakdown: {
    gap: 10,
    marginBottom: 16,
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storageItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storageItemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  storageItemLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  storageItemSize: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  clearCacheButton: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  clearCacheText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Footer
  footer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: '#D1D5DB',
  },
});
