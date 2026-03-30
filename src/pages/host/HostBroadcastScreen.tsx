import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { livestreamService, type LiveSessionResult, type NowPlayingData, type TrackInfo } from '../../api/livestreamService';
import { useTheme } from '../../context/ThemeContext';
import { showToast } from '../../../components/ui/Toast';

const { width, height } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────

type TabKey = 'control' | 'playlist' | 'chat' | 'stats';

interface HostChatMessage {
  id: string;
  author: string;
  avatar: string;
  message: string;
  timestamp: string;
  isHost?: boolean;
  isPinned?: boolean;
  isReported?: boolean;
}

interface QueueItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artUrl?: string;
  duration: number;
  isRequest?: boolean;
}

interface LiveStats {
  totalListeners: number;
  peakListeners: number;
  totalMessages: number;
  totalSongRequests: number;
  sessionDuration: number;
  startedAt: Date | null;
}

const TAB_CONFIG: { key: TabKey; icon: string; label: string }[] = [
  { key: 'control', icon: 'radio', label: 'Điều khiển' },
  { key: 'playlist', icon: 'musical-notes', label: 'Playlist' },
  { key: 'chat', icon: 'chatbubbles', label: 'Chat' },
  { key: 'stats', icon: 'stats-chart', label: 'Thống kê' },
];

// ─── Helpers ─────────────────────────────────────────────────────

const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || seconds === null || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatListenerCount = (count: number): string => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const GradientPill = ({
  children,
  colors = ['#667EEA', '#764BA2'],
  style,
}: {
  children: React.ReactNode;
  colors?: string[];
  style?: any;
}) => (
  <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.gradientPill, style]}>
    {children}
  </LinearGradient>
);

// ─── Sub-Components ──────────────────────────────────────────────

// Animated Live Badge
function LiveIndicator({ isLive }: { isLive: boolean }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isLive) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true
      );
    }
  }, [isLive]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: isLive ? 1 : 0.4,
  }));

  return (
    <Animated.View style={[styles.liveDotWrapper, pulseStyle]}>
      <View style={[styles.liveDot, isLive && styles.liveDotActive]} />
    </Animated.View>
  );
}

// ─── Tab: CONTROL ─────────────────────────────────────────────────

function ControlTab({
  session,
  nowPlaying,
  isStreamPlaying,
  isLoading,
  onToggleStream,
  onStopSession,
}: {
  session: LiveSessionResult | null;
  nowPlaying: NowPlayingData | null;
  isStreamPlaying: boolean;
  isLoading: boolean;
  onToggleStream: () => void;
  onStopSession: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const isLive = session?.status?.toLowerCase() === 'live';

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Session Status Card */}
      <Animated.View entering={FadeInDown.delay(0)} style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusLeft}>
            <LiveIndicator isLive={isLive} />
            <Text style={styles.statusLabel}>{isLive ? 'ĐANG PHÁT SÓNG' : 'ĐÃ DỪNG'}</Text>
          </View>
          <View style={[styles.statusBadge, isLive ? styles.statusBadgeLive : styles.statusBadgeOffline]}>
            <Text style={styles.statusBadgeText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>

        <Text style={styles.sessionNameText}>{session?.sessionName || 'Live Session'}</Text>
        {session?.stationName && (
          <Text style={styles.stationNameText}>{session.stationName}</Text>
        )}
      </Animated.View>

      {/* Listener Count Card */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.controlCard}>
        <View style={styles.controlCardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: '#EF444420' }]}>
            <Ionicons name="people" size={22} color="#EF4444" />
          </View>
          <Text style={styles.controlCardTitle}>Người nghe</Text>
        </View>
        <View style={styles.listenerStatsRow}>
          <View style={styles.listenerStat}>
            <Text style={styles.listenerNumber}>{formatListenerCount(nowPlaying?.totalListeners ?? 0)}</Text>
            <Text style={styles.listenerLabel}>Hiện tại</Text>
          </View>
          <View style={styles.listenerDivider} />
          <View style={styles.listenerStat}>
            <Text style={styles.listenerNumber}>{formatListenerCount(session?.peakListeners ?? 0)}</Text>
            <Text style={styles.listenerLabel}>Đỉnh cao</Text>
          </View>
          <View style={styles.listenerDivider} />
          <View style={styles.listenerStat}>
            <Text style={styles.listenerNumber}>{formatListenerCount(session?.totalListeners ?? 0)}</Text>
            <Text style={styles.listenerLabel}>Tổng</Text>
          </View>
        </View>
      </Animated.View>

      {/* Now Playing Card */}
      <Animated.View entering={FadeInDown.delay(150)} style={styles.controlCard}>
        <View style={styles.controlCardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: '#55C5F120' }]}>
            <Ionicons name="musical-note" size={22} color="#55C5F1" />
          </View>
          <Text style={styles.controlCardTitle}>Đang phát</Text>
        </View>
        {nowPlaying?.currentTrack ? (
          <View style={styles.nowPlayingRow}>
            <Image
              source={{ uri: nowPlaying.currentTrack.artUrl }}
              style={styles.miniArt}
            />
            <View style={styles.miniTrackInfo}>
              <Text style={styles.miniTrackTitle} numberOfLines={1}>
                {nowPlaying.currentTrack.title}
              </Text>
              <Text style={styles.miniTrackArtist} numberOfLines={1}>
                {nowPlaying.currentTrack.artist}
              </Text>
              {nowPlaying.currentTrack.album && (
                <Text style={styles.miniTrackAlbum} numberOfLines={1}>
                  {nowPlaying.currentTrack.album}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.noTrackText}>Chưa có thông tin bài hát</Text>
        )}

        {nowPlaying?.playingNext && (
          <View style={styles.playingNextRow}>
            <Ionicons name="play-forward" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.playingNextText} numberOfLines={1}>
              Tiếp theo: {nowPlaying.playingNext.title} — {nowPlaying.playingNext.artist}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Stream Controls */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.streamControlsCard}>
        <Text style={styles.controlCardTitle}>Điều khiển Stream</Text>

        <View style={styles.streamButtonsRow}>
          {/* Play/Pause */}
          <TouchableOpacity
            style={[styles.streamBtn, isStreamPlaying ? styles.streamBtnActive : styles.streamBtnPause]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onToggleStream();
            }}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons
                name={isStreamPlaying ? 'pause' : 'play'}
                size={32}
                color="#FFFFFF"
              />
            )}
            <Text style={styles.streamBtnLabel}>{isStreamPlaying ? 'Tạm dừng' : 'Phát'}</Text>
          </TouchableOpacity>

          {/* Mute */}
          <TouchableOpacity
            style={[styles.streamBtn, isMuted ? styles.streamBtnActive : styles.streamBtnSecondary]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsMuted(!isMuted);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={28}
              color="#FFFFFF"
            />
            <Text style={styles.streamBtnLabel}>{isMuted ? 'Bật tiếng' : 'Tắt tiếng'}</Text>
          </TouchableOpacity>

          {/* Stop */}
          <TouchableOpacity
            style={[styles.streamBtn, styles.streamBtnStop]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              Alert.alert(
                'Kết thúc Live',
                'Bạn có chắc muốn kết thúc phiên live này không?',
                [
                  { text: 'Hủy', style: 'cancel' },
                  { text: 'Kết thúc', style: 'destructive', onPress: onStopSession },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="stop" size={28} color="#FFFFFF" />
            <Text style={styles.streamBtnLabel}>Kết thúc</Text>
          </TouchableOpacity>
        </View>

        {/* Volume Slider */}
        <View style={styles.volumeRow}>
          <Ionicons name="volume-low" size={18} color="rgba(255,255,255,0.6)" />
          <View style={styles.volumeTrack}>
            <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
          </View>
          <Ionicons name="volume-high" size={18} color="rgba(255,255,255,0.6)" />
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(250)} style={styles.quickActionsCard}>
        <Text style={styles.controlCardTitle}>Thao tác nhanh</Text>
        <View style={styles.quickActionsGrid}>
          {[
            { icon: 'camera', label: 'Đổi cover', color: '#8B5CF6' },
            { icon: 'mic', label: 'Voice mode', color: '#10B981' },
            { icon: 'flag', label: 'Báo cáo', color: '#F59E0B' },
            { icon: 'settings', label: 'Cài đặt', color: '#6366F1' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickActionBtn}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}25` }]}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Tab: PLAYLIST ─────────────────────────────────────────────────

function PlaylistTab({ nowPlaying, songHistory }: { nowPlaying: NowPlayingData | null; songHistory: TrackInfo[] }) {
  const [searchText, setSearchText] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const allTracks = useMemo(() => {
    const tracks: TrackInfo[] = [];
    if (nowPlaying?.playingNext) tracks.push(nowPlaying.playingNext);
    if (songHistory.length > 0) tracks.push(...songHistory);
    return tracks;
  }, [nowPlaying, songHistory]);

  const filtered = useMemo(
    () =>
      allTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchText.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchText.toLowerCase())
      ),
    [allTracks, searchText]
  );

  const isCurrent = (track: TrackInfo) =>
    nowPlaying?.currentTrack?.shId === track.shId;

  return (
    <View style={styles.tabContent}>
      {/* Search */}
      <View style={styles.playlistSearchWrap}>
        <View style={styles.playlistSearchBox}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.playlistSearchInput}
            placeholder="Tìm bài hát trong queue..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Queue info */}
      <View style={styles.queueInfoBar}>
        <Text style={styles.queueInfoText}>
          {filtered.length} bài trong queue
        </Text>
        <TouchableOpacity style={styles.addQueueBtn}>
          <Ionicons name="add" size={18} color="#55C5F1" />
          <Text style={styles.addQueueText}>Thêm bài</Text>
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyPlaylistState}>
          <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyPlaylistTitle}>Queue trống</Text>
          <Text style={styles.emptyPlaylistSub}>Thêm bài hát vào queue để phát</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.shId.toString()}
          contentContainerStyle={styles.playlistFlatContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 30)}>
              <TouchableOpacity
                style={[styles.queueItem, isCurrent(item) && styles.queueItemCurrent]}
                onPress={() => setSelectedTrack(selectedTrack === item.shId.toString() ? null : item.shId.toString())}
                activeOpacity={0.8}
              >
                <View style={styles.queueItemLeft}>
                  <View style={[styles.queueItemIndex, isCurrent(item) && styles.queueItemIndexActive]}>
                    {isCurrent(item) ? (
                      <Ionicons name="pause" size={14} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.queueItemIndexText}>{index + 1}</Text>
                    )}
                  </View>
                  <Image source={{ uri: item.artUrl }} style={styles.queueArt} />
                  <View style={styles.queueTrackInfo}>
                    <Text
                      style={[styles.queueTrackTitle, isCurrent(item) && styles.queueTrackTitleActive]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.queueTrackArtist} numberOfLines={1}>
                      {item.artist}
                    </Text>
                  </View>
                </View>
                <View style={styles.queueItemRight}>
                  <Text style={styles.queueDuration}>{formatDuration(item.duration)}</Text>
                  <View style={styles.queueItemActions}>
                    {item.isRequest && (
                      <View style={styles.requestBadge}>
                        <Ionicons name="sparkles" size={10} color="#F59E0B" />
                      </View>
                    )}
                    <TouchableOpacity style={styles.queueItemActionBtn}>
                      <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

// ─── Tab: CHAT ─────────────────────────────────────────────────

function ChatTab({ messages, onPin, onDelete }: { messages: HostChatMessage[]; onPin: (id: string) => void; onDelete: (id: string) => void }) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const pinnedMessages = messages.filter((m) => m.isPinned);

  const handleSend = () => {
    if (!inputText.trim()) return;
    setInputText('');
    // In real implementation, this would send via WebSocket
  };

  return (
    <View style={styles.tabContent}>
      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <View style={styles.pinnedSection}>
          <View style={styles.pinnedHeader}>
            <Ionicons name="push" size={12} color="#F59E0B" />
            <Text style={styles.pinnedLabel}>Đã ghim</Text>
          </View>
          {pinnedMessages.map((msg) => (
            <View key={msg.id} style={styles.pinnedMessage}>
              <Image source={{ uri: msg.avatar }} style={styles.pinnedAvatar} />
              <View style={styles.pinnedContent}>
                <Text style={styles.pinnedAuthor}>{msg.author}</Text>
                <Text style={styles.pinnedText}>{msg.message}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Message List */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChatState}>
            <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyChatTitle}>Chưa có tin nhắn</Text>
          </View>
        ) : (
          messages.map((msg, idx) => (
            <Animated.View key={msg.id} entering={FadeInUp.delay(idx * 20)}>
              <TouchableOpacity
                style={styles.chatMessageRow}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert(msg.author, 'Chọn thao tác', [
                    { text: 'Ghim', onPress: () => onPin(msg.id) },
                    { text: 'Xóa', onPress: () => onDelete(msg.id), style: 'destructive' },
                    { text: 'Hủy', style: 'cancel' },
                  ]);
                }}
              >
                <Image source={{ uri: msg.avatar }} style={styles.chatAvatar} />
                <View style={styles.chatBubble}>
                  <View style={styles.chatBubbleHeader}>
                    <Text style={[styles.chatAuthor, msg.isHost && styles.chatAuthorHost]}>
                      {msg.author}
                    </Text>
                    {msg.isHost && (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>HOST</Text>
                      </View>
                    )}
                    <Text style={styles.chatTime}>{msg.timestamp}</Text>
                  </View>
                  <Text style={styles.chatText}>{msg.message}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.hostChatInput}>
        <TouchableOpacity style={styles.hostChatActionBtn}>
          <Ionicons name="image" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <TextInput
          style={styles.hostChatTextInput}
          placeholder="Nhắn tin tới người nghe..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.hostChatSendBtn, inputText.trim() && styles.hostChatSendBtnActive]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={18} color={inputText.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.3)'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Tab: STATS ─────────────────────────────────────────────────

function StatsTab({ session, nowPlaying, stats }: { session: LiveSessionResult | null; nowPlaying: NowPlayingData | null; stats: LiveStats }) {
  const elapsedSeconds = useMemo(() => {
    if (!stats.startedAt) return 0;
    return Math.floor((Date.now() - stats.startedAt.getTime()) / 1000);
  }, [stats.startedAt]);

  const [elapsed, setElapsed] = useState(elapsedSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stats.startedAt) {
        setElapsed(Math.floor((Date.now() - stats.startedAt.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stats.startedAt]);

  const statCards = [
    {
      label: 'Người nghe hiện tại',
      value: formatListenerCount(stats.totalListeners),
      icon: 'people',
      color: '#EF4444',
      gradient: ['#EF4444', '#F97316'] as [string, string],
    },
    {
      label: 'Đỉnh người nghe',
      value: formatListenerCount(session?.peakListeners ?? 0),
      icon: 'trending-up',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#EF4444'] as [string, string],
    },
    {
      label: 'Thời lượng',
      value: formatDuration(elapsed),
      icon: 'time',
      color: '#55C5F1',
      gradient: ['#55C5F1', '#2DD4BF'] as [string, string],
    },
    {
      label: 'Tin nhắn',
      value: stats.totalMessages.toString(),
      icon: 'chatbubbles',
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#A855F7'] as [string, string],
    },
    {
      label: 'Yêu cầu bài hát',
      value: stats.totalSongRequests.toString(),
      icon: 'musical-notes',
      color: '#10B981',
      gradient: ['#10B981', '#34D399'] as [string, string],
    },
    {
      label: 'Tổng người nghe',
      value: formatListenerCount(session?.totalListeners ?? 0),
      icon: 'radio',
      color: '#6366F1',
      gradient: ['#6366F1', '#8B5CF6'] as [string, string],
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Performance overview */}
      <Animated.View entering={FadeInDown.delay(0)} style={styles.statsOverview}>
        <Text style={styles.statsOverviewLabel}>Hiệu suất phiên live</Text>
        <View style={styles.statsOverviewRow}>
          <Text style={styles.statsOverviewNumber}>{formatListenerCount(stats.totalListeners)}</Text>
          <Text style={styles.statsOverviewUnit}>người nghe trực tiếp</Text>
        </View>
      </Animated.View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {statCards.map((card, idx) => (
          <Animated.View
            key={card.label}
            entering={FadeInDown.delay(idx * 60)}
            style={styles.statCard}
          >
            <LinearGradient colors={card.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCardGradient}>
              <View style={styles.statCardInner}>
                <Ionicons name={card.icon as any} size={24} color="#FFFFFF" />
                <Text style={styles.statCardValue}>{card.value}</Text>
                <Text style={styles.statCardLabel}>{card.label}</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        ))}
      </View>

      {/* Audience Chart (placeholder bars) */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.audienceChartCard}>
        <Text style={styles.chartTitle}>Người nghe theo thời gian</Text>
        <View style={styles.chartBars}>
          {[40, 55, 70, 85, 60, 90, 75, 100, 80, 95, 70, 85].map((h, i) => (
            <View key={i} style={[styles.chartBar, { height: `${h}%` }]} />
          ))}
        </View>
        <View style={styles.chartLabels}>
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
            <Text key={h} style={styles.chartLabel}>{h}h</Text>
          ))}
        </View>
      </Animated.View>

      {/* Top Songs */}
      {nowPlaying?.songHistory && nowPlaying.songHistory.length > 0 && (
        <Animated.View entering={FadeInDown.delay(450)} style={styles.topSongsCard}>
          <Text style={styles.chartTitle}>Top bài hát được yêu cầu</Text>
          {nowPlaying.songHistory.slice(0, 5).map((track, idx) => (
            <View key={track.shId} style={styles.topSongRow}>
              <Text style={styles.topSongRank}>#{idx + 1}</Text>
              <Image source={{ uri: track.artUrl }} style={styles.topSongArt} />
              <View style={styles.topSongInfo}>
                <Text style={styles.topSongTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.topSongArtist} numberOfLines={1}>{track.artist}</Text>
              </View>
              {track.isRequest && (
                <View style={styles.requestDot} />
              )}
            </View>
          ))}
        </Animated.View>
      )}
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────

export default function HostBroadcastScreen({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('control');
  const [session, setSession] = useState<LiveSessionResult | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isStreamPlaying, setIsStreamPlaying] = useState(true);
  const [chatMessages, setChatMessages] = useState<HostChatMessage[]>([
    {
      id: '1',
      author: 'Minh Anh',
      avatar: 'https://i.pravatar.cc/100?img=3',
      message: 'Live stream tuyệt vời quá! 🔥',
      timestamp: '10:42',
      isPinned: true,
    },
    {
      id: '2',
      author: 'Lan Chi',
      avatar: 'https://i.pravatar.cc/100?img=8',
      message: 'Bài này hay quá, yêu cầu phát thêm bài bolero đi ạ',
      timestamp: '10:43',
    },
    {
      id: '3',
      author: 'Hoàng Nam',
      avatar: 'https://i.pravatar.cc/100?img=12',
      message: 'Admin ơi cho mình xin bài Đêm qua một giấc mơ',
      timestamp: '10:44',
      isPinned: false,
    },
  ]);
  const [stats, setStats] = useState<LiveStats>({
    totalListeners: 0,
    peakListeners: 0,
    totalMessages: 47,
    totalSongRequests: 12,
    sessionDuration: 0,
    startedAt: new Date(),
  });

  // ── Fetch data ──────────────────────────────────────────────
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await livestreamService.getLiveSession(sessionId);
      setSession(data);
      setStats((prev) => ({
        ...prev,
        totalListeners: data.listenersCount ?? 0,
        peakListeners: data.peakListeners ?? 0,
      }));
    } catch (error) {
      console.log('[HostBroadcast] Failed to fetch session', error);
    }
  }, [sessionId]);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const data = await livestreamService.getNowPlaying();
      setNowPlaying(data);
      setStats((prev) => ({
        ...prev,
        totalListeners: data.totalListeners ?? prev.totalListeners,
        peakListeners: Math.max(prev.peakListeners, data.totalListeners ?? 0),
      }));
    } catch (error) {
      console.log('[HostBroadcast] Failed to fetch nowPlaying', error);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    fetchNowPlaying();

    const sessionInterval = setInterval(fetchSession, 15000);
    const nowPlayingInterval = setInterval(fetchNowPlaying, 10000);

    return () => {
      clearInterval(sessionInterval);
      clearInterval(nowPlayingInterval);
    };
  }, [fetchSession, fetchNowPlaying]);

  // ── Actions ─────────────────────────────────────────────────
  const handleToggleStream = useCallback(async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isStreamPlaying) {
        // Pause — UI only (backend doesn't have pause)
        setIsStreamPlaying(false);
        showToast.info('Đã tạm dừng', 'Stream đang được tạm dừng');
      } else {
        setIsStreamPlaying(true);
        showToast.success('Tiếp tục phát', 'Stream đã tiếp tục');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isStreamPlaying]);

  const handleStopSession = useCallback(async () => {
    setIsStopping(true);
    try {
      await livestreamService.stopLiveSession(sessionId);
      showToast.success('Đã kết thúc', 'Phiên live đã được kết thúc');
      onBack();
    } catch (error) {
      console.log('[HostBroadcast] Failed to stop session', error);
      showToast.error('Lỗi', 'Không thể kết thúc phiên live');
    } finally {
      setIsStopping(false);
    }
  }, [sessionId, onBack]);

  const handlePinMessage = useCallback((id: string) => {
    setChatMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isPinned: !m.isPinned } : m))
    );
    showToast.success('Đã ghim', 'Tin nhắn đã được ghim');
  }, []);

  const handleDeleteMessage = useCallback((id: string) => {
    setChatMessages((prev) => prev.filter((m) => m.id !== id));
    showToast.info('Đã xóa', 'Tin nhắn đã được xóa');
  }, []);

  const songHistory = useMemo(() => nowPlaying?.songHistory || [], [nowPlaying]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0F0F23', '#1A1A2E', '#16213E']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LiveIndicator isLive={session?.status?.toLowerCase() === 'live'} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {session?.sessionName || 'Host Broadcast'}
          </Text>
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TAB_CONFIG.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab.key);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? '#55C5F1' : 'rgba(255,255,255,0.5)'}
            />
            <Text
              style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentWrapper}>
        {activeTab === 'control' && (
          <ControlTab
            session={session}
            nowPlaying={nowPlaying}
            isStreamPlaying={isStreamPlaying}
            isLoading={isLoading}
            onToggleStream={handleToggleStream}
            onStopSession={handleStopSession}
          />
        )}
        {activeTab === 'playlist' && (
          <PlaylistTab nowPlaying={nowPlaying} songHistory={songHistory} />
        )}
        {activeTab === 'chat' && (
          <ChatTab
            messages={chatMessages}
            onPin={handlePinMessage}
            onDelete={handleDeleteMessage}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab session={session} nowPlaying={nowPlaying} stats={stats} />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotWrapper: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
  },
  liveDotActive: {
    backgroundColor: '#EF4444',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
    gap: 4,
  },
  tabBtnActive: {},
  tabLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#55C5F1',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: '#55C5F1',
    borderRadius: 1,
  },
  tabContentWrapper: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Control Tab
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeLive: {
    backgroundColor: '#EF4444',
  },
  statusBadgeOffline: {
    backgroundColor: '#6B7280',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sessionNameText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  stationNameText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  controlCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  controlCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  controlCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listenerStat: {
    flex: 1,
    alignItems: 'center',
  },
  listenerDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  listenerNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  listenerLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniArt: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  miniTrackInfo: {
    flex: 1,
  },
  miniTrackTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  miniTrackArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  miniTrackAlbum: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  noTrackText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 10,
  },
  playingNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  playingNextText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    flex: 1,
  },
  streamControlsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  streamButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  streamBtn: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  streamBtnActive: {
    backgroundColor: '#10B981',
  },
  streamBtnPause: {
    backgroundColor: '#6366F1',
  },
  streamBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  streamBtnStop: {
    backgroundColor: '#EF4444',
  },
  streamBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#55C5F1',
    borderRadius: 2,
  },
  quickActionsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  quickActionBtn: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Playlist Tab
  playlistSearchWrap: {
    marginBottom: 12,
  },
  playlistSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playlistSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  queueInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  queueInfoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  addQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addQueueText: {
    color: '#55C5F1',
    fontSize: 13,
    fontWeight: '600',
  },
  playlistFlatContent: {
    paddingBottom: 20,
  },
  emptyPlaylistState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyPlaylistTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyPlaylistSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  queueItemCurrent: {
    backgroundColor: 'rgba(85,197,241,0.12)',
    borderColor: 'rgba(85,197,241,0.3)',
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  queueItemIndex: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  queueItemIndexActive: {
    backgroundColor: '#55C5F1',
  },
  queueItemIndexText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },
  queueArt: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  queueTrackInfo: {
    flex: 1,
  },
  queueTrackTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  queueTrackTitleActive: {
    color: '#55C5F1',
  },
  queueTrackArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  queueItemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  queueDuration: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  queueItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueItemActionBtn: {
    padding: 4,
  },
  // Chat Tab
  pinnedSection: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pinnedLabel: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  pinnedMessage: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  pinnedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  pinnedContent: {
    flex: 1,
  },
  pinnedAuthor: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  pinnedText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 2,
  },
  chatList: {
    flex: 1,
    maxHeight: height * 0.5,
  },
  chatListContent: {
    paddingBottom: 10,
  },
  emptyChatState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyChatTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  chatMessageRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  chatBubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  chatAuthor: {
    color: '#55C5F1',
    fontSize: 12,
    fontWeight: '700',
  },
  chatAuthorHost: {
    color: '#10B981',
  },
  hostBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  hostBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  chatTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginLeft: 'auto',
  },
  chatText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
  },
  hostChatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 10,
  },
  hostChatActionBtn: {
    padding: 4,
  },
  hostChatTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  hostChatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostChatSendBtnActive: {
    backgroundColor: '#55C5F1',
  },
  // Stats Tab
  statsOverview: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  statsOverviewLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statsOverviewRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statsOverviewNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  statsOverviewUnit: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 42) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 2,
  },
  statCardGradient: {
    padding: 16,
    minHeight: 100,
  },
  statCardInner: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statCardValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginVertical: 6,
  },
  statCardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  audienceChartCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 4,
  },
  chartBar: {
    flex: 1,
    backgroundColor: '#55C5F1',
    borderRadius: 3,
    opacity: 0.6,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  chartLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
  },
  topSongsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  topSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  topSongRank: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
    width: 24,
  },
  topSongArt: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  topSongInfo: {
    flex: 1,
  },
  topSongTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  topSongArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  requestDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  // Shared
  gradientPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
});
