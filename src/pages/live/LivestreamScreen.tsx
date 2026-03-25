import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { showToast } from '../../../components/ui/Toast';
import {
  livestreamService,
  type LiveSessionResult,
  type NowPlayingData,
  type TrackInfo,
} from '../../api/livestreamService';
import { useTheme } from '../../context/ThemeContext';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';

const { width, height } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  author: string;
  avatar: string;
  message: string;
  timestamp: string;
  isHost?: boolean;
  isRequest?: boolean;
  requestSong?: string;
  avatarColor?: string;
}

interface LiveSession {
  id: string;
  title: string;
  host: string;
  hostAvatar: string;
  category: string;
  isLive: boolean;
  listeners: number;
  likes: number;
}

interface Story {
  id: string;
  author: string;
  avatar: string;
  content: string;
  category: string;
  timestamp: string;
  likes: number;
}

interface NowPlayingItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  isPlaying: boolean;
}

// ─── Mock Data ───────────────────────────────────────────────────

const LIVE_SESSION: LiveSession = {
  id: '1',
  title: 'Đêm nhạc bolero học',
  host: '❤ Emily_vui',
  hostAvatar: 'https://i.pravatar.cc/100?img=5',
  category: 'Nhạc',
  isLive: true,
  listeners: 256,
  likes: 1234,
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    author: 'A. Minh',
    avatar: 'https://i.pravatar.cc/100?img=1',
    message: 'Bài này hay quá! 🔥',
    timestamp: '10:42 PM',
    avatarColor: '#374151',
  },
  {
    id: '2',
    author: 'Emily_vui',
    avatar: 'https://i.pravatar.cc/100?img=5',
    message: 'Cảm ơn mọi người đã theo dõi! ❤️',
    timestamp: '10:43 PM',
    isHost: true,
    avatarColor: '#67f700',
  },
];

const NOW_PLAYING: NowPlayingItem[] = [
  { id: '1', title: 'Lần Đầu', artist: 'Dung Ho', duration: '3:45', isPlaying: true },
  { id: '2', title: 'Yêu Xa', artist: 'Vũ Cát Tường', duration: '4:12', isPlaying: false },
  { id: '3', title: 'Em Của Ngày Hôm Qua', artist: 'Sơn Tùng M-TP', duration: '5:20', isPlaying: false },
];

const PODCASTS_QUEUE = [
  { id: '1', title: 'Chuyện Tình Yêu', host: 'Minh Anh', duration: '15 mins' },
  { id: '2', title: 'Kỷ Niệm Tuổi Học Trò', host: 'Lan Anh', duration: '12 mins' },
];

const STORIES: Story[] = [
  {
    id: '1',
    author: 'Dung Ho',
    avatar: 'https://i.pravatar.cc/100?img=6',
    content: '"Lần đầu tiên rung động của tôi... Khi nghe bài hát này, tôi nhớ lại kỷ niệm thời học sinh. Buổi chiều mưa phùn, tôi ngồi bên cửa sổ và chợt nhận ra mình đã yêu."',
    category: 'Giọng thật',
    timestamp: '5 phút trước',
    likes: 45,
  },
  {
    id: '2',
    author: 'Minh Anh',
    avatar: 'https://i.pravatar.cc/100?img=9',
    content: '"Mùa hè năm ấy, chúng tôi cùng đạp xe dọc bờ biển. Gió mát, sóng vỗ, và tiếng cười của em vang lên như một bản nhạc."',
    category: 'Kỷ niệm',
    timestamp: '12 phút trước',
    likes: 78,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────

const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || seconds === null || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

// ─── Sub-Components ──────────────────────────────────────────────

function LiveBadge() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.2], [1, 0.6]),
  }));

  return (
    <View style={styles.liveBadgeContainer}>
      <Animated.View style={[styles.liveBadgePulse, pulseStyle]} />
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>
    </View>
  );
}

function StoryCard({ story }: { story: Story }) {
  const { isDarkMode } = useTheme();
  return (
    <Animated.View entering={FadeInDown} style={styles.storyCard}>
      <BlurView intensity={40} style={StyleSheet.absoluteFill} tint={isDarkMode ? 'dark' : 'light'} />
      <View style={styles.storyBadgeRow}>
        <Ionicons name="radio" size={12} color="#55C5F1" />
        <Text style={styles.storyBadgeText}>ON AIR: STORY TIME</Text>
      </View>
      <Text style={styles.storyContent} numberOfLines={3}>{story.content}</Text>
      <View style={styles.storyFooterRow}>
        <View style={styles.storyAuthorRow}>
          <Image source={{ uri: story.avatar }} style={styles.storyAuthorAvatar} />
          <Text style={styles.storyAuthorText}>Gửi bởi {story.author}</Text>
        </View>
        <View style={styles.storyCategoryBadge}>
          <Text style={styles.storyCategoryText}>{story.category}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function ChatOverlay({ messages }: { messages: ChatMessage[] }) {
  const { isDarkMode } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const handleContentSizeChange = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  return (
    <View style={styles.chatOverlayContainer} pointerEvents="box-none">
      <ScrollView
        ref={scrollRef}
        style={styles.chatOverlay}
        contentContainerStyle={styles.chatOverlayContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, idx) => (
          <Animated.View
            key={msg.id}
            entering={FadeInUp.delay(idx * 50)}
            style={styles.chatRow}
          >
            <Image source={{ uri: msg.avatar }} style={styles.chatAvatar} />
            <View style={styles.chatBubbleWrapper}>
              <BlurView intensity={25} style={styles.chatBubbleBlur} tint={isDarkMode ? 'dark' : 'light'}>
                <Text style={styles.chatAuthorText}>{msg.author}</Text>
                <Text style={styles.chatMessageText}>{msg.message}</Text>
              </BlurView>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

<<<<<<< Updated upstream
function ChatPanel({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const handleContentSizeChange = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.chatPanel}
      contentContainerStyle={styles.chatPanelContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      onContentSizeChange={handleContentSizeChange}
    >
      {messages.map((msg) => {
        const bubbleStyle = msg.isHost
          ? styles.chatBubbleHost
          : msg.isRequest
          ? styles.chatBubbleRequest
          : styles.chatBubble;

        return (
          <View key={msg.id} style={styles.chatRow}>
            <Image
              source={{ uri: msg.avatar }}
              style={[styles.chatAvatar, { borderColor: msg.avatarColor || '#374151' }]}
            />
            <View style={[styles.chatBubbleBase, bubbleStyle]}>
              <Text style={styles.chatAuthorText}>{msg.author}</Text>
              {msg.isRequest && msg.requestSong && (
                <View style={styles.chatRequestRow}>
                  <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                  <Text style={styles.chatRequestText}>{`Requested: ${msg.requestSong}`}</Text>
                </View>
              )}
              <Text style={styles.chatMessageText}>{msg.message}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function SidebarMenu({
  isOpen,
  onClose,
  nowPlayingItems,
  isStreamMuted,
  streamVolume,
  onToggleMute,
}: {
  isOpen: boolean;
  onClose: () => void;
  nowPlayingItems: NowPlayingItem[];
  isStreamMuted: boolean;
  streamVolume: number;
  onToggleMute: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'music' | 'podcast'>('music');

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdropTouchable} onPress={onClose} />
        <View style={styles.sidebarPanel}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Playlist Live</Text>
            <TouchableOpacity onPress={onClose} style={styles.sidebarCloseButton}>
              <Ionicons name="close" size={18} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarTabs}>
            <TouchableOpacity
              onPress={() => setActiveTab('music')}
              style={[styles.sidebarTab, activeTab === 'music' && styles.sidebarTabActive]}
            >
              <Text style={[styles.sidebarTabText, activeTab === 'music' && styles.sidebarTabTextActive]}>
                Nhạc phát
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('podcast')}
              style={[styles.sidebarTab, activeTab === 'podcast' && styles.sidebarTabActive]}
            >
              <Text style={[styles.sidebarTabText, activeTab === 'podcast' && styles.sidebarTabTextActive]}>
                Podcast
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'music' ? (
              <View>
                <Text style={styles.sidebarSectionTitle}>Đang phát</Text>
                {nowPlayingItems.map((song) => (
                  <View
                    key={song.id}
                    style={[styles.sidebarSongRow, song.isPlaying && styles.sidebarSongRowActive]}
                  >
                    <View style={[styles.sidebarSongIcon, song.isPlaying && styles.sidebarSongIconActive]}>
                      <Ionicons
                        name={song.isPlaying ? 'pause' : 'play'}
                        size={18}
                        color={song.isPlaying ? '#FFFFFF' : '#6B7280'}
                      />
                    </View>
                    <View style={styles.sidebarSongContent}>
                      <Text style={styles.sidebarSongTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={styles.sidebarSongArtist} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>
                    <Text style={styles.sidebarSongDuration}>{song.duration}</Text>
                  </View>
                ))}

                <View style={styles.sidebarVolumeBox}>
                  <View style={styles.sidebarVolumeRow}>
                    <TouchableOpacity onPress={onToggleMute} style={styles.sidebarVolumeIconButton}>
                      <Ionicons name={isStreamMuted ? 'volume-mute' : 'volume-high'} size={18} color="#6B7280" />
                    </TouchableOpacity>
                    <View style={styles.sidebarVolumeTrack}>
                      <View style={[styles.sidebarVolumeFill, { width: `${Math.round(streamVolume * 100)}%` }]} />
                    </View>
                    <Text style={styles.sidebarVolumeText}>
                      {isStreamMuted ? 'MUTE' : `${Math.round(streamVolume * 100)}%`}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.sidebarSectionTitle}>Podcast đang chờ</Text>
                {PODCASTS_QUEUE.map((podcast) => (
                  <View key={podcast.id} style={styles.sidebarPodcastRow}>
                    <View style={styles.sidebarPodcastIcon}>
                      <Ionicons name="mic" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.sidebarSongContent}>
                      <Text style={styles.sidebarSongTitle} numberOfLines={1}>
                        {podcast.title}
                      </Text>
                      <Text style={styles.sidebarSongArtist} numberOfLines={1}>
                        {podcast.host} • {podcast.duration}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface RequestSongCandidate {
  id: string;
  requestId: string;
  title: string;
  artist: string;
  album?: string;
}

const buildFallbackCandidates = (songHistory: TrackInfo[]): RequestSongCandidate[] => {
  const seen = new Set<string>();
  const candidates: RequestSongCandidate[] = [];

  songHistory.forEach((track) => {
    const key = `${track.title}|${track.artist}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    candidates.push({
      id: `history-${track.shId}`,
      requestId: track.shId.toString(),
      title: track.title || 'Unknown',
      artist: track.artist || 'Unknown',
      album: track.album || '',
    });
  });

  return candidates;
};

function RequestSongModal({
  isOpen,
  onClose,
  songHistory,
  onRequestSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  songHistory: TrackInfo[];
  onRequestSuccess: (songTitle: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [candidates, setCandidates] = useState<RequestSongCandidate[]>([]);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    // Live join flow no longer depends on station APIs, only keep local fallback list.
    setCandidates(buildFallbackCandidates(songHistory));
    setIsLoading(false);
  }, [songHistory]);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    loadCandidates();
  }, [isOpen, loadCandidates]);

  const filteredCandidates = useMemo(
    () =>
      candidates.filter(
        (song) =>
          song.title.toLowerCase().includes(search.toLowerCase()) ||
          song.artist.toLowerCase().includes(search.toLowerCase()),
      ),
    [candidates, search],
  );

  const handleRequestSong = async (candidate: RequestSongCandidate) => {
    if (isSubmittingId) return;

    setIsSubmittingId(candidate.id);
    try {
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.add(candidate.id);
        return next;
      });

      onRequestSuccess(candidate.title);
      showToast.success('Đã ghi nhận', `Bài "${candidate.title}" đã được ghi nhận`);
      onClose();
    } catch {
      showToast.error('Request thất bại', 'Vui lòng thử lại sau');
    } finally {
      setIsSubmittingId(null);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdropTouchable} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Bài Hát</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={18} color="#1E293B" />
            </TouchableOpacity>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm bài hát hoặc nghệ sĩ..."
            placeholderTextColor="#9CA3AF"
            style={styles.modalInput}
          />

          <View style={styles.requestListContainer}>
            {isLoading ? (
              <View style={styles.requestEmptyState}>
                <ActivityIndicator color="#55C5F1" />
                <Text style={styles.requestEmptyText}>Đang tải danh sách bài hát...</Text>
              </View>
            ) : filteredCandidates.length === 0 ? (
              <View style={styles.requestEmptyState}>
                <Ionicons name="musical-notes-outline" size={20} color="#94A3B8" />
                <Text style={styles.requestEmptyText}>Không tìm thấy bài hát phù hợp</Text>
              </View>
            ) : (
              <ScrollView style={styles.requestList} showsVerticalScrollIndicator={false}>
                {filteredCandidates.map((song) => {
                  const requested = requestedIds.has(song.id);
                  const isSubmitting = isSubmittingId === song.id;

                  return (
                    <View key={song.id} style={styles.requestItem}>
                      <View style={styles.requestItemMeta}>
                        <Text style={styles.requestItemTitle} numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text style={styles.requestItemArtist} numberOfLines={1}>
                          {song.artist}
                          {song.album ? ` • ${song.album}` : ''}
                        </Text>
                      </View>

                      <TouchableOpacity
                        disabled={requested || !!isSubmittingId}
                        style={[
                          styles.requestItemButton,
                          (requested || isSubmitting) && styles.requestItemButtonDisabled,
                        ]}
                        onPress={() => handleRequestSong(song)}
                      >
                        <Text style={styles.requestItemButtonText}>
                          {requested ? 'Đã gửi' : isSubmitting ? 'Đang gửi...' : 'Request'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SendPodcastModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [podcastContent, setPodcastContent] = useState('');

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdropTouchable} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gửi Podcast</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={18} color="#1E293B" />
            </TouchableOpacity>
          </View>
          <TextInput
            value={podcastContent}
            onChangeText={setPodcastContent}
            placeholder="Nội dung podcast của bạn..."
            placeholderTextColor="#9CA3AF"
            multiline
            style={[styles.modalInput, styles.modalTextarea]}
          />
          <TouchableOpacity
            style={styles.modalPrimaryButton}
            onPress={() => {
              if (podcastContent.trim()) {
                setPodcastContent('');
                onClose();
              }
            }}
          >
            <Text style={styles.modalPrimaryText}>Gửi Podcast</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ReactionPicker({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect: (label: string) => void }) {
  const reactions = [
    { icon: 'heart', color: '#EF4444', label: 'Love' },
    { icon: 'thumbs-up', color: '#3B82F6', label: 'Like' },
    { icon: 'happy', color: '#F59E0B', label: 'Haha' },
    { icon: 'sparkles', color: '#10B981', label: 'Celebrate' },
  ] as const;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdropTouchable} onPress={onClose} />
        <View style={styles.reactionPicker}>
          {reactions.map((reaction) => (
            <TouchableOpacity
              key={reaction.label}
              onPress={() => {
                onSelect(reaction.label);
                onClose();
              }}
              style={[styles.reactionButton, { backgroundColor: `${reaction.color}20` }]}
            >
              <Ionicons name={reaction.icon} size={24} color={reaction.color} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}
=======
// ─── Main Screen ─────────────────────────────────────────────────
>>>>>>> Stashed changes

export default function LivestreamScreen({ onBack }: { onBack: () => void }) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [activeSessions, setActiveSessions] = useState<LiveSessionResult[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreamPlaying, setIsStreamPlaying] = useState(false);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [isStreamMuted, setIsStreamMuted] = useState(false);
  const [displayElapsed, setDisplayElapsed] = useState<number>(0);
  const [streamAvailability, setStreamAvailability] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const activeStreamUrlRef = useRef('');
  const autoPlayedRef = useRef(false);

  const currentLiveSession = useMemo(
    () => activeSessions.find((session) => session.id === selectedSessionId) || activeSessions[0] || null,
    [activeSessions, selectedSessionId],
  );

  const currentStreamUrl = useMemo(
    () => livestreamService.getListenUrl(currentLiveSession?.streamUrl || undefined),
    [currentLiveSession?.streamUrl],
  );

  const fetchActiveSessions = useCallback(async () => {
    try {
      const paged = await livestreamService.getLiveSessions({ pageNumber: 1, pageSize: 50 });
      const liveSessions = (paged.items || []).filter(s => s.status?.toLowerCase() === 'live');

      const detailedSessions = await Promise.all(
        liveSessions.map(async (s) => {
          try { return await livestreamService.getLiveSession(s.id); }
          catch { return s; }
        })
      );

      setActiveSessions(detailedSessions);
      if (!selectedSessionId && detailedSessions.length > 0) {
        setSelectedSessionId(detailedSessions[0].id);
      }
    } catch (error) {
      console.log('Failed to fetch live sessions', error);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveSessions]);

<<<<<<< Updated upstream
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((error) => {
      console.log('[LivestreamScreen] setAudioMode error:', error);
    });
  }, []);

  const liveTitle = currentLiveSession?.sessionName || LIVE_SESSION.title;
  const liveHost = currentLiveSession?.stationName || LIVE_SESSION.host;
  const liveCategory = currentLiveSession?.genre || LIVE_SESSION.category;
  const liveListeners = currentLiveSession?.listenersCount ?? LIVE_SESSION.listeners;
  const isLiveSession = activeSessions.length > 0;
  const hasLiveStream = streamAvailability === 'ready';
  const currentStreamUrl = useMemo(
    () => livestreamService.normalizeStreamUrl(currentLiveSession?.streamUrl || undefined),
    [currentLiveSession?.streamUrl],
  );
  const elapsedToRender = nowPlaying?.currentTrack
    ? displayElapsed
    : 0;

  useEffect(() => {
    if (!nowPlaying?.currentTrack) {
      setDisplayElapsed(0);
      return;
    }

    const baseElapsed = Math.max(0, Math.floor(nowPlaying.currentTrack.elapsed || 0));
    const maxDuration = Math.max(0, Math.floor(nowPlaying.currentTrack.duration || 0));
    const syncedAt = Date.now();

    setDisplayElapsed(baseElapsed);

    const intervalId = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - syncedAt) / 1000);
      const nextElapsed = baseElapsed + elapsedSeconds;
      setDisplayElapsed(maxDuration > 0 ? Math.min(nextElapsed, maxDuration) : nextElapsed);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [
    nowPlaying?.currentTrack?.shId,
    nowPlaying?.currentTrack?.playedAt,
    nowPlaying?.currentTrack?.elapsed,
    nowPlaying?.currentTrack?.duration,
  ]);

=======
>>>>>>> Stashed changes
  const unloadStream = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        activeStreamUrlRef.current = '';
      } catch (e) { }
    }
    setIsStreamPlaying(false);
  }, []);

  const startStream = useCallback(async () => {
    if (!currentStreamUrl || isStreamLoading) return;

    setIsStreamLoading(true);
    try {
      await unloadStream();
      const { sound } = await Audio.Sound.createAsync(
        { uri: currentStreamUrl },
        { shouldPlay: true, isMuted: isStreamMuted, volume: 1.0 },
        (status) => {
          if (status.isLoaded) setIsStreamPlaying(status.isPlaying);
        }
      );
      soundRef.current = sound;
      activeStreamUrlRef.current = currentStreamUrl;
      setStreamAvailability('ready');
    } catch (error) {
      console.log('[Livestream] start error:', error);
      setStreamAvailability('unavailable');
    } finally {
      setIsStreamLoading(false);
    }
  }, [currentStreamUrl, isStreamLoading, isStreamMuted, unloadStream]);

  const togglePlayback = useCallback(async () => {
    if (isStreamLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!soundRef.current) {
      await startStream();
      return;
    }

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) await soundRef.current.pauseAsync();
        else await soundRef.current.playAsync();
      }
    } catch (e) {
      await startStream();
    }
  }, [isStreamLoading, startStream]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      author: 'Bạn',
      avatar: 'https://i.pravatar.cc/100?img=12',
      message: inputMessage,
      timestamp: 'Vừa xong',
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');
  };

  const albumArt = LIVE_SESSION.hostAvatar;
  const liveListeners = LIVE_SESSION.listeners;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Background Image with Blur */}
      <View style={StyleSheet.absoluteFill}>
        <Image source={{ uri: albumArt }} style={styles.bgImage} blurRadius={Platform.OS === 'ios' ? 20 : 10} />
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LiveBadge />
          <Text style={styles.headerTitle} numberOfLines={1}>{currentLiveSession?.sessionName || LIVE_SESSION.title}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Player Area */}
        <View style={styles.playerArea}>
          <Animated.View entering={FadeInDown.delay(200)} style={styles.artworkContainer}>
            <Image source={{ uri: albumArt }} style={styles.artwork} />
            {isStreamPlaying && (
              <View style={styles.playingIndicator}>
                <LinearGradient colors={['#55C5F1', '#2DD4BF']} style={styles.indicatorPulse} />
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {nowPlaying?.currentTrack?.title || 'Đang cập nhật...'}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {nowPlaying?.currentTrack?.artist || currentLiveSession?.stationName || 'SoundMate Live'}
            </Text>
          </Animated.View>

          {/* Player Controls */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.controlsRow}>
            <TouchableOpacity style={styles.sideControl}>
              <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={togglePlayback}
              style={styles.playBtn}
            >
              <BlurView intensity={30} style={styles.playBtnBlur} tint="light">
                {isStreamLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons name={isStreamPlaying ? "pause" : "play"} size={36} color="#FFFFFF" style={!isStreamPlaying && { marginLeft: 4 }} />
                )}
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideControl} onPress={() => setShowRequestModal(true)}>
              <Ionicons name="musical-notes-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Stats Bar */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statText}>{liveListeners} người nghe</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color="#EF4444" />
              <Text style={styles.statText}>{LIVE_SESSION.likes} thích</Text>
            </View>
          </Animated.View>
        </View>

        {/* Stories Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tâm sự âm nhạc</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
            {STORIES.map(s => <StoryCard key={s.id} story={s} />)}
          </ScrollView>
        </View>

        {/* Chat Area */}
        <View style={styles.chatSection}>
          <Text style={styles.sectionTitle}>Trò chuyện</Text>
          <View style={styles.chatBox}>
            <ChatOverlay messages={messages} />
          </View>
        </View>
      </ScrollView>

      {/* Message Input Footer */}
      <BlurView intensity={40} style={styles.footer} tint={isDarkMode ? 'dark' : 'light'}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Gửi lời nhắn..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={inputMessage}
            onChangeText={setInputMessage}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
          />
          <TouchableOpacity onPress={handleSendMessage} disabled={!inputMessage.trim()}>
            <Ionicons
              name="send"
              size={22}
              color={inputMessage.trim() ? '#55C5F1' : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.quickReactions}>
          {['🔥', '❤️', '👏', '🎵'].map(emoji => (
            <TouchableOpacity key={emoji} style={styles.emojiBtn} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setInputMessage(prev => prev + emoji);
            }}>
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadgePulse: {
    position: 'absolute',
    width: 45,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  liveBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: {
    paddingBottom: 160,
  },
  playerArea: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  artworkContainer: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 15,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: -15,
    alignSelf: 'center',
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  indicatorPulse: {
    width: '100%',
    height: '100%',
  },
  trackInfo: {
    alignItems: 'center',
    marginTop: 35,
    paddingHorizontal: 40,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 35,
  },
  playBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginHorizontal: 40,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  playBtnBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideControl: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 40,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  sectionContainer: {
    marginTop: 30,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  storiesScroll: {
    paddingHorizontal: 15,
  },
  storyCard: {
    width: width * 0.7,
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  storyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  storyBadgeText: {
    color: '#55C5F1',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 6,
  },
  storyContent: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  storyFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAuthorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  storyAuthorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  storyCategoryBadge: {
    backgroundColor: 'rgba(85,197,241,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  storyCategoryText: {
    color: '#55C5F1',
    fontSize: 10,
    fontWeight: '700',
  },
  chatSection: {
    marginTop: 30,
    paddingBottom: 20,
  },
  chatBox: {
    height: 250,
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  chatOverlayContainer: {
    flex: 1,
  },
  chatOverlay: {
    flex: 1,
  },
  chatOverlayContent: {
    padding: 15,
  },
  chatRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chatBubbleWrapper: {
    flex: 1,
    maxWidth: '85%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  chatBubbleBlur: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatAuthorText: {
    color: '#55C5F1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  chatMessageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 10,
  },
  quickReactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  emojiBtn: {
    paddingHorizontal: 15,
  },
  emojiText: {
    fontSize: 22,
  },
});
