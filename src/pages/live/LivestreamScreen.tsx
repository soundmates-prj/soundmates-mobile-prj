import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { showToast } from '../../../components/ui/Toast';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import {
  livestreamService,
  type LiveSessionResult,
  type NowPlayingData,
  type TrackInfo,
} from '../../api/livestreamService';

const { width } = Dimensions.get('window');

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

// ─── Mock Data ───────────────────────────────────────────────────

const LIVE_SESSION_FALLBACK: LiveSession = {
  id: '1',
  title: 'Đêm nhạc bolero học',
  host: 'Emily_vui',
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
  return (
    <Animated.View entering={FadeInDown} style={styles.storyCard}>
      <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
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
              <BlurView intensity={25} style={styles.chatBubbleBlur} tint="dark">
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
            <Text style={styles.modalTitle}>Yêu Cầu Bài Hát</Text>
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
                          {requested ? 'Đã gửi' : isSubmitting ? 'Đang gửi...' : 'Yêu cầu'}
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

function ReactionPicker({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (label: string) => void;
}) {
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

// ─── Main Screen ─────────────────────────────────────────────────

export default function LivestreamScreen({ onBack }: { onBack: () => void }) {
  // ── Audio from context ─────────────────────────────────────────
  const {
    isPlaying: isStreamPlaying,
    isLoading: isStreamLoading,
    isMuted: isStreamMuted,
    nowPlaying,
    displayElapsed,
    loadSession: contextLoadSession,
    togglePlayback,
    toggleMute: handleMuteToggle,
  } = useAudioPlayer();

  // ── State ──────────────────────────────────────────────────────
  const [activeSessions, setActiveSessions] = useState<LiveSessionResult[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived data ───────────────────────────────────────────────
  const currentLiveSession = useMemo(
    () =>
      activeSessions.find((s) => s.id === selectedSessionId) ||
      activeSessions[0] ||
      null,
    [activeSessions, selectedSessionId]
  );

  const currentStreamUrl = useMemo(
    () =>
      livestreamService.getListenUrl(currentLiveSession?.streamUrl || undefined),
    [currentLiveSession?.streamUrl]
  );

  // Real album art from nowPlaying, fallback to session thumbnail, then mock
  const albumArt = useMemo(() => {
    if (nowPlaying?.currentTrack?.artUrl) return nowPlaying.currentTrack.artUrl;
    if (currentLiveSession?.thumbnailUrl) return currentLiveSession.thumbnailUrl;
    return LIVE_SESSION_FALLBACK.hostAvatar;
  }, [nowPlaying, currentLiveSession]);

  // Real listener count
  const liveListeners = useMemo(() => {
    if (nowPlaying?.totalListeners !== undefined) return nowPlaying.totalListeners;
    if (currentLiveSession?.listenersCount !== undefined) return currentLiveSession.listenersCount;
    return LIVE_SESSION_FALLBACK.listeners;
  }, [nowPlaying, currentLiveSession]);

  // Session title
  const sessionTitle = useMemo(() => {
    if (currentLiveSession?.sessionName) return currentLiveSession.sessionName;
    return LIVE_SESSION_FALLBACK.title;
  }, [currentLiveSession]);

  // Session host name
  const sessionHost = useMemo(() => {
    if (currentLiveSession?.stationName) return currentLiveSession.stationName;
    if (nowPlaying?.streamerName) return nowPlaying.streamerName;
    return LIVE_SESSION_FALLBACK.host;
  }, [currentLiveSession, nowPlaying]);

  // Song history for request modal
  const songHistory = useMemo(() => nowPlaying?.songHistory || [], [nowPlaying]);

  // ── Fetch active sessions ──────────────────────────────────────
  const fetchActiveSessions = useCallback(async () => {
    try {
      const paged = await livestreamService.getLiveSessions({ pageNumber: 1, pageSize: 50 });
      const liveOnes = (paged.items || []).filter(
        (s) => s.status?.toLowerCase() === 'live'
      );

      const detailedSessions = await Promise.all(
        liveOnes.map(async (s) => {
          try {
            return await livestreamService.getLiveSession(s.id);
          } catch {
            return s;
          }
        })
      );

      setActiveSessions(detailedSessions);
      if (!selectedSessionId && detailedSessions.length > 0) {
        setSelectedSessionId(detailedSessions[0].id);
      }
    } catch (error) {
      console.log('[Livestream] Failed to fetch live sessions', error);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [selectedSessionId, contextLoadSession]);

  // ── Boot effects ───────────────────────────────────────────────
  useEffect(() => {
    fetchActiveSessions();

    // Refresh sessions every 15s
    const sessionInterval = setInterval(fetchActiveSessions, 15000);

    return () => {
      clearInterval(sessionInterval);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [fetchActiveSessions]);

  // ── Session loading effect ─────────────────────────────────────
  const lastLoadedSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedSessionId) return;
    
    // Only load if it's a different session than what we last triggered
    if (selectedSessionId === lastLoadedSessionIdRef.current) return;
    
    const session = activeSessions.find((s) => s.id === selectedSessionId);
    if (session) {
      lastLoadedSessionIdRef.current = selectedSessionId;
      contextLoadSession(session);
    }
  }, [selectedSessionId, activeSessions, contextLoadSession]);

  // ── Stream controls ─────────────────────────────────────────────
  // Delegated to context: togglePlayback, handleMuteToggle

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      author: 'Bạn',
      avatar: 'https://i.pravatar.cc/100?img=12',
      message: inputMessage,
      timestamp: 'Vừa xong',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');
  }, [inputMessage]);

  const handleReaction = useCallback((label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        author: 'Bạn',
        avatar: 'https://i.pravatar.cc/100?img=12',
        message: `reacted ${label} ${label === 'Love' ? '❤️' : label === 'Like' ? '👍' : label === 'Haha' ? '😂' : '🎉'}`,
        timestamp: 'Vừa xong',
      },
    ]);
  }, []);

  const handleRequestSuccess = useCallback((songTitle: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        author: 'Bạn',
        avatar: 'https://i.pravatar.cc/100?img=12',
        message: `Yêu cầu bài hát: ${songTitle} 🎵`,
        timestamp: 'Vừa xong',
        isRequest: true,
        requestSong: songTitle,
      },
    ]);
  }, []);

  const isLive = currentLiveSession?.status?.toLowerCase() === 'live';

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
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {isLive && <LiveBadge />}
          <Text style={styles.headerTitle} numberOfLines={1}>{sessionTitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowReactionPicker(true)}
        >
          <Ionicons name="happy-outline" size={24} color="#FFFFFF" />
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

          {/* Track info from real nowPlaying */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {nowPlaying?.currentTrack?.title || 'Đang cập nhật...'}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {nowPlaying?.currentTrack?.artist || sessionHost}
            </Text>
            {nowPlaying?.currentTrack && (
              <Text style={styles.trackElapsed}>
                {formatDuration(displayElapsed)} / {formatDuration(nowPlaying.currentTrack.duration)}
              </Text>
            )}
          </Animated.View>

          {/* Player Controls */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.controlsRow}>
            <TouchableOpacity style={styles.sideControl} onPress={handleMuteToggle}>
              <Ionicons
                name={isStreamMuted ? 'volume-mute' : 'volume-high'}
                size={22}
                color="#FFFFFF"
              />
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
                  <Ionicons
                    name={isStreamPlaying ? 'pause' : 'play'}
                    size={36}
                    color="#FFFFFF"
                    style={!isStreamPlaying && { marginLeft: 4 }}
                  />
                )}
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideControl}
              onPress={() => setShowRequestModal(true)}
            >
              <Ionicons name="musical-notes-outline" size={22} color="#FFFFFF" />
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
              <Text style={styles.statText}>{LIVE_SESSION_FALLBACK.likes} thích</Text>
            </View>
            {nowPlaying?.playingNext && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="play-forward" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.statText} numberOfLines={1}>
                    Tiếp: {nowPlaying.playingNext.title}
                  </Text>
                </View>
              </>
            )}
          </Animated.View>
        </View>

        {/* Now Playing mini-player */}
        {nowPlaying?.currentTrack && (
          <Animated.View entering={FadeInDown.delay(600)} style={styles.nowPlayingCard}>
            <Text style={styles.nowPlayingLabel}>ĐANG PHÁT</Text>
            <View style={styles.nowPlayingRow}>
              <Image
                source={{ uri: nowPlaying.currentTrack.artUrl }}
                style={styles.nowPlayingArt}
              />
              <View style={styles.nowPlayingInfo}>
                <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                  {nowPlaying.currentTrack.title}
                </Text>
                <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                  {nowPlaying.currentTrack.artist}
                </Text>
                {nowPlaying.currentTrack.album && (
                  <Text style={styles.nowPlayingAlbum} numberOfLines={1}>
                    Album: {nowPlaying.currentTrack.album}
                  </Text>
                )}
              </View>
              <View style={styles.nowPlayingProgressWrap}>
                <View
                  style={[
                    styles.nowPlayingProgress,
                    {
                      width: `${
                        nowPlaying.currentTrack.duration > 0
                          ? Math.min(
                              (displayElapsed / nowPlaying.currentTrack.duration) * 100,
                              100
                            )
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Stories Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tâm sự âm nhạc</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
            {STORIES.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
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
      <BlurView intensity={40} style={styles.footer} tint="dark">
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Gửi lời nhắn..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={inputMessage}
            onChangeText={setInputMessage}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!inputMessage.trim()}
          >
            <Ionicons
              name="send"
              size={22}
              color={inputMessage.trim() ? '#55C5F1' : 'rgba(255,255,255,0.3)'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.quickReactions}>
          {['🔥', '❤️', '👏', '🎵'].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setInputMessage((prev) => prev + emoji);
              }}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>

      {/* Modals */}
      <RequestSongModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        songHistory={songHistory}
        onRequestSuccess={handleRequestSuccess}
      />

      <ReactionPicker
        isOpen={showReactionPicker}
        onClose={() => setShowReactionPicker(false)}
        onSelect={handleReaction}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

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
  sessionChipTextActive: {
    color: '#FFFFFF',
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
  trackElapsed: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
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
    maxWidth: '90%',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  nowPlayingCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nowPlayingLabel: {
    color: '#55C5F1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowPlayingArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  nowPlayingArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  nowPlayingAlbum: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  nowPlayingProgressWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  nowPlayingProgress: {
    height: '100%',
    backgroundColor: '#55C5F1',
    borderRadius: 2,
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
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouchable: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  requestListContainer: {
    marginTop: 12,
    flex: 1,
  },
  requestList: {
    maxHeight: 350,
  },
  requestEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  requestEmptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  requestItemMeta: {
    flex: 1,
    marginRight: 10,
  },
  requestItemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  requestItemArtist: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  requestItemButton: {
    backgroundColor: '#55C5F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  requestItemButtonDisabled: {
    backgroundColor: 'rgba(85,197,241,0.4)',
  },
  requestItemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reactionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  reactionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
