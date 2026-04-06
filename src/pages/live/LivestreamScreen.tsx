import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  livestreamService,
  type LiveSessionResult,
  type TrackInfo,
} from '../../api/livestreamService';
import FormTextField from '../../components/ui/FormTextField';
import { showToast } from '../../components/ui/Toast';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useUser } from '../../context/UserContext';

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
  {
    id: '1',
    title: 'Lần Đầu',
    artist: 'Dung Ho',
    duration: '3:45',
    isPlaying: true,
  },
  {
    id: '2',
    title: 'Yêu Xa',
    artist: 'Vũ Cát Tường',
    duration: '4:12',
    isPlaying: false,
  },
  {
    id: '3',
    title: 'Em Của Ngày Hôm Qua',
    artist: 'Sơn Tùng M-TP',
    duration: '5:20',
    isPlaying: false,
  },
];

const PODCASTS_QUEUE = [
  {
    id: '1',
    title: 'Chuyện Tình Yêu',
    host: 'Minh Anh',
    duration: '15 mins',
  },
  {
    id: '2',
    title: 'Kỷ Niệm Tuổi Học Trò',
    host: 'Lan Anh',
    duration: '12 mins',
  },
];

const STORIES: Story[] = [
  {
    id: '1',
    author: 'Dung Ho',
    avatar: 'https://i.pravatar.cc/100?img=6',
    content:
      '"Lần đầu tiên rung động của tôi... Khi nghe bài hát này, tôi nhớ lại kỷ niệm thời học sinh. Buổi chiều mưa phùn, tôi ngồi bên cửa sổ và chợt nhận ra mình đã yêu. Cảm giác đó không bao giờ quên được."',
    category: 'Giọng thật',
    timestamp: '5 phút trước',
    likes: 45,
  },
  {
    id: '2',
    author: 'Minh Anh',
    avatar: 'https://i.pravatar.cc/100?img=9',
    content:
      '"Mùa hè năm ấy, chúng tôi cùng đạp xe dọc bờ biển. Gió mát, sóng vỗ, và tiếng cười của em vang lên như một bản nhạc. Giờ nghe lại những bài hát này, tôi lại nhớ về em..."',
    category: 'Kỷ niệm',
    timestamp: '12 phút trước',
    likes: 78,
  },
  {
    id: '3',
    author: 'Lan Vy',
    avatar: 'https://i.pravatar.cc/100?img=7',
    content:
      '"Xa nhà đã lâu, mỗi lần nghe những bài hát bolero này tôi lại nghĩ đến mẹ. Mẹ hay ngân nga những giai điệu này mỗi buổi sáng. Tôi nhớ mẹ nhiều lắm..."',
    category: 'Tâm sự',
    timestamp: '25 phút trước',
    likes: 92,
  },
];

const CHAT_VISIBLE_MESSAGE_COUNT = 3;
const CHAT_ESTIMATED_ROW_HEIGHT = 60;
const CHAT_VIEWPORT_MAX_HEIGHT = CHAT_VISIBLE_MESSAGE_COUNT * CHAT_ESTIMATED_ROW_HEIGHT;

const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || seconds === null || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

function StoryCard({ story }: { story: Story }) {
  return (
    <View style={styles.storyCard}>
      <View style={styles.storyBadgeRow}>
        <Ionicons name="radio" size={12} color="#A78BFA" />
        <Text style={styles.storyBadgeText}>ON AIR: STORY TIME</Text>
      </View>

      <Text style={styles.storyContent}>{story.content}</Text>

      <View style={styles.storyFooterRow}>
        <View style={styles.storyAuthorRow}>
          <Image source={{ uri: story.avatar }} style={styles.storyAuthorAvatar} />
          <Text style={styles.storyAuthorText}>Được gửi bởi {story.author}</Text>
        </View>
        <View style={styles.storyCategoryBadge}>
          <Text style={styles.storyCategoryText}>{story.category}</Text>
        </View>
      </View>

      <View style={styles.storyLikeRow}>
        <Ionicons name="heart" size={12} color="#EF4444" />
        <Text style={styles.storyLikeText}>{story.likes} lượt thích</Text>
        <Text style={styles.storyTimestamp}>• {story.timestamp}</Text>
      </View>
    </View>
  );
}

function ChatOverlay({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const handleContentSizeChange = useCallback(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  return (
    <View style={styles.chatOverlayContainer} pointerEvents="box-none">
      <ScrollView
        ref={scrollRef}
        style={styles.chatOverlay}
        contentContainerStyle={[styles.chatOverlayContent, styles.chatContentBottom]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
        onLayout={() => scrollToBottom(false)}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
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
    </View>
  );
}

function ChatPanel({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const handleContentSizeChange = useCallback(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.chatPanel}
      contentContainerStyle={[styles.chatPanelContent, styles.chatContentBottom]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      onContentSizeChange={handleContentSizeChange}
      onLayout={() => scrollToBottom(false)}
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
  onToggleMute,
}: {
  isOpen: boolean;
  onClose: () => void;
  nowPlayingItems: NowPlayingItem[];
  isStreamMuted: boolean;
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
              <Ionicons name="close" size={18} color="#FFFFFF" />
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
  mediaFileId?: string;
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
  liveSessionId,
  stationId,
  songHistory,
  onRequestSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  liveSessionId?: string;
  stationId?: string;
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
    try {
      if (!stationId) {
        setCandidates(buildFallbackCandidates(songHistory));
        return;
      }

      const stationCatalog = await livestreamService.getStationMusicCatalog(stationId);

      if (stationCatalog.length > 0) {
        setCandidates(
          stationCatalog.map((song) => ({
            id: song.id,
            mediaFileId: song.id,
            title: song.title || 'Unknown',
            artist: song.artist || 'Unknown',
            album: song.album || '',
          })),
        );
        return;
      }

      setCandidates(buildFallbackCandidates(songHistory));
    } catch {
      setCandidates(buildFallbackCandidates(songHistory));
    } finally {
      setIsLoading(false);
    }
  }, [songHistory, stationId]);

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

    if (!liveSessionId) {
      showToast.warning('Không có phiên live', 'Không tìm thấy phiên live để gửi yêu cầu');
      return;
    }

    if (!candidate.mediaFileId) {
      showToast.warning('Chưa đồng bộ bài hát', 'Bài hát này chưa có trong kho nhạc của phiên live');
      return;
    }

    setIsSubmittingId(candidate.id);
    try {
      await livestreamService.createSongRequest(liveSessionId, {
        mediaFileId: candidate.mediaFileId,
      });

      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.add(candidate.id);
        return next;
      });

      onRequestSuccess(candidate.title);
      showToast.success('Đã gửi yêu cầu', `Bài "${candidate.title}" đã được gửi tới host`);
      onClose();
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message || error?.response?.data?.Message;
      const resolvedApiMessage = typeof apiMessage === 'string' ? apiMessage : undefined;
      showToast.error('Yêu cầu thất bại', resolvedApiMessage || 'Vui lòng thử lại sau');
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
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <FormTextField
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm bài hát hoặc nghệ sĩ..."
            placeholderTextColor="#9CA3AF"
            style={styles.modalInput}
          />

          <View style={styles.requestListContainer}>
            {isLoading ? (
              <View style={styles.requestEmptyState}>
                <ActivityIndicator color="#8B5CF6" />
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
                  const canRequest = Boolean(song.mediaFileId);

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
                        disabled={!canRequest || requested || !!isSubmittingId}
                        style={[
                          styles.requestItemButton,
                          (!canRequest || requested || isSubmitting) && styles.requestItemButtonDisabled,
                        ]}
                        onPress={() => handleRequestSong(song)}
                      >
                        <Text style={styles.requestItemButtonText}>
                          {requested
                            ? 'Đã gửi'
                            : isSubmitting
                              ? 'Đang gửi...'
                              : canRequest
                                ? 'Yêu cầu'
                                : 'Không hỗ trợ'}
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
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <FormTextField
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

interface FloatingEmoji {
  id: string;
  icon: string;
  color: string;
  x: number;
  animY: Animated.Value;
  animOpacity: Animated.Value;
  animScale: Animated.Value;
}

function FloatingEmojiView({ emoji, onDone }: { emoji: FloatingEmoji; onDone: (id: string) => void }) {
  const rotation = useRef(`${(Math.random() - 0.5) * 20}deg`).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(emoji.animY, {
        toValue: -280 - Math.random() * 120,
        duration: 1800 + Math.random() * 600,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(emoji.animScale, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(emoji.animScale, {
          toValue: 0.9,
          duration: 1500 + Math.random() * 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(emoji.animOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onDone(emoji.id));
  }, [emoji, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 90,
        left: emoji.x,
        transform: [
          { translateY: emoji.animY },
          { scale: emoji.animScale },
          { rotate: rotation },
        ],
        opacity: emoji.animOpacity,
      }}
    >
      <Ionicons name={emoji.icon as any} size={30} color={emoji.color} />
    </Animated.View>
  );
}

export default function LivestreamScreen({ onBack, sessionId }: { onBack: () => void; sessionId?: string }) {
  const { user } = useUser();
  const {
    loadSession,
    togglePlayback: toggleStreamPlayback,
    toggleMute: toggleStreamMute,
    isPlaying: isStreamPlaying,
    isLoading: isStreamLoading,
    isMuted: isStreamMuted,
    nowPlaying,
    displayElapsed,
    activeSession: playerSession,
  } = useAudioPlayer();
  const [activeSessions, setActiveSessions] = useState<LiveSessionResult[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionId || null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [storyDirection, setStoryDirection] = useState<1 | -1>(1);
  const [isStoryTouching, setIsStoryTouching] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const screenSwipeOpacity = useRef(new Animated.Value(1)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const storyTranslateX = useRef(new Animated.Value(0)).current;
  const storyOpacity = useRef(new Animated.Value(1)).current;
  const combinedTranslateX = useMemo(
    () => Animated.add(storyTranslateX, dragX),
    [dragX, storyTranslateX]
  );

  const currentLiveSession = useMemo(
    () => activeSessions.find((session) => session.id === selectedSessionId) || activeSessions[0] || null,
    [activeSessions, selectedSessionId],
  );

  const handleExitLive = useCallback(() => {
    onBack();
  }, [onBack]);

  const resetEdgeSwipeAnimation = useCallback(() => {
    Animated.parallel([
      Animated.spring(screenSwipeTranslateX, {
        toValue: 0,
        damping: 20,
        stiffness: 190,
        mass: 0.5,
        useNativeDriver: true,
      }),
      Animated.timing(screenSwipeOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenSwipeOpacity, screenSwipeTranslateX]);

  const animateEdgeSwipeBackAndExit = useCallback(() => {
    Animated.parallel([
      Animated.timing(screenSwipeTranslateX, {
        toValue: Math.max(screenWidth * 0.9, 240),
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(screenSwipeOpacity, {
        toValue: 0.88,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        resetEdgeSwipeAnimation();
        return;
      }

      handleExitLive();
    });
  }, [handleExitLive, resetEdgeSwipeAnimation, screenSwipeOpacity, screenSwipeTranslateX, screenWidth]);

  useEffect(() => {
    if (sessionId) {
      setSelectedSessionId(sessionId);
    }
  }, [sessionId]);

  const fetchActiveSessions = useCallback(async () => {
    try {
      const activeLiveSessions = await livestreamService.getActiveSessions();

      setActiveSessions(activeLiveSessions);
      setSelectedSessionId((prev) => {
        if (!activeLiveSessions.length) return null;

        const preferredSessionId = sessionId || prev;
        if (preferredSessionId && activeLiveSessions.some((session) => session.id === preferredSessionId)) {
          return preferredSessionId;
        }

        return activeLiveSessions[0].id;
      });
    } catch (error) {
      console.log('Failed to fetch live sessions', error);
      setActiveSessions([]);
      setSelectedSessionId(null);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveSessions]);

  useEffect(() => {
    if (!currentLiveSession) {
      return;
    }

    if (playerSession?.id === currentLiveSession.id) {
      return;
    }

    loadSession(currentLiveSession);
  }, [currentLiveSession, loadSession, playerSession?.id]);

  const liveTitle = currentLiveSession?.sessionName || nowPlaying?.stationName || LIVE_SESSION.title;
  const liveHost = nowPlaying?.streamerName || currentLiveSession?.stationName || LIVE_SESSION.host;
  const liveCategory = nowPlaying?.currentTrack?.genre || currentLiveSession?.genre || LIVE_SESSION.category;
  const liveListeners = nowPlaying?.totalListeners ?? currentLiveSession?.listenersCount ?? LIVE_SESSION.listeners;
  const currentArtUrl = nowPlaying?.currentTrack?.artUrl || null;
  const isLiveSession = activeSessions.length > 0;
  const hasLiveStream = Boolean((currentLiveSession?.streamUrl || '').trim());
  const elapsedToRender = nowPlaying?.currentTrack
    ? displayElapsed
    : 0;

  const nowPlayingItems = useMemo(() => {
    if (!nowPlaying) return NOW_PLAYING;
    const items: NowPlayingItem[] = [];

    const pushTrack = (track: TrackInfo, isPlaying: boolean, prefix: string) => {
      items.push({
        id: `${prefix}-${track.shId}`,
        title: track.title || 'Unknown',
        artist: track.artist || 'Unknown',
        duration: formatDuration(track.duration),
        isPlaying,
      });
    };

    if (nowPlaying.currentTrack) {
      pushTrack(nowPlaying.currentTrack, true, 'current');
    }

    if (nowPlaying.playingNext) {
      pushTrack(nowPlaying.playingNext, false, 'next');
    }

    if (nowPlaying.songHistory?.length) {
      nowPlaying.songHistory.slice(0, 10).forEach((track, index) => {
        pushTrack(track, false, `history-${index}`);
      });
    }

    return items.length ? items : NOW_PLAYING;
  }, [nowPlaying]);

  const currentStory = STORIES[currentStoryIndex];
  const storyDuration = useMemo(() => {
    const words = currentStory.content.split(' ').length;
    const seconds = Math.max(15, Math.min(30, (words / 200) * 60));
    return seconds * 1000;
  }, [currentStory.content]);

  const goToNextStory = useCallback(() => {
    setStoryDirection(1);
    setCurrentStoryIndex((prev) => (prev + 1) % STORIES.length);
  }, []);

  const goToPrevStory = useCallback(() => {
    setStoryDirection(-1);
    setCurrentStoryIndex((prev) => (prev - 1 + STORIES.length) % STORIES.length);
  }, []);

  useEffect(() => {
    setStoryProgress(0);
    let elapsed = 0;
    const interval = setInterval(() => {
      if (!isPaused) {
        elapsed += 100;
        const progress = Math.min((elapsed / storyDuration) * 100, 100);
        setStoryProgress(progress);

        if (elapsed >= storyDuration) {
          goToNextStory();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentStoryIndex, isPaused, storyDuration, goToNextStory]);

  useEffect(() => {
    const willShowSub = Keyboard.addListener('keyboardWillShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsInputFocused(true);
    });
    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsInputFocused(true);
    });
    const willHideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
      setIsInputFocused(false);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setIsInputFocused(false);
    });

    return () => {
      willShowSub.remove();
      showSub.remove();
      willHideSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    dragX.setValue(0);
    storyOpacity.setValue(0);
    storyTranslateX.setValue(40 * storyDirection);
    Animated.parallel([
      Animated.timing(storyOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(storyTranslateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStoryIndex, dragX, storyDirection, storyOpacity, storyTranslateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragX.setValue(0);
        },
        onPanResponderMove: (_, gesture) => {
          dragX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = 60;

          if (gesture.dx <= -threshold) {
            goToNextStory();
          } else if (gesture.dx >= threshold) {
            goToPrevStory();
          }

          Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
          setIsPaused(false);
          setIsStoryTouching(false);
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
          setIsPaused(false);
          setIsStoryTouching(false);
        },
      }),
    [dragX, goToNextStory, goToPrevStory]
  );

  const edgeBackPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.pageX <= 24,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.x0 <= 24 && gesture.dx > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderGrant: () => {
          screenSwipeTranslateX.stopAnimation();
          screenSwipeOpacity.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const clampedDx = Math.max(0, Math.min(gesture.dx, 180));
          screenSwipeTranslateX.setValue(clampedDx);
          screenSwipeOpacity.setValue(Math.max(0.88, 1 - clampedDx / 900));
        },
        onPanResponderRelease: (_, gesture) => {
          const passedDistance = gesture.dx > 86;
          const passedVelocity = gesture.vx > 0.18;
          if (passedDistance || passedVelocity) {
            animateEdgeSwipeBackAndExit();
            return;
          }

          resetEdgeSwipeAnimation();
        },
        onPanResponderTerminate: () => {
          resetEdgeSwipeAnimation();
        },
      }),
    [animateEdgeSwipeBackAndExit, resetEdgeSwipeAnimation, screenSwipeOpacity, screenSwipeTranslateX],
  );

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        author: 'Bạn',
        avatar: 'https://i.pravatar.cc/100?img=12',
        message: inputMessage.trim(),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        avatarColor: '#55C5F1',
      };
      setMessages((prev) => [...prev, newMessage]);
      setInputMessage('');
      Keyboard.dismiss();
    }
  };

  const handleRequestSuccess = useCallback((songTitle: string) => {
    const requestMessage: ChatMessage = {
      id: Date.now().toString(),
      author: 'Bạn',
      avatar: 'https://i.pravatar.cc/100?img=12',
      message: 'Mình muốn nghe bài này! 🎵',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isRequest: true,
      requestSong: songTitle,
      avatarColor: '#55C5F1',
    };

    setMessages((prev) => [...prev, requestMessage]);
  }, []);

  const REACTION_OPTIONS = useMemo(() => [
    { icon: 'heart', color: '#EF4444', label: 'Love' },
    { icon: 'thumbs-up', color: '#3B82F6', label: 'Like' },
    { icon: 'happy', color: '#F59E0B', label: 'Haha' },
    { icon: 'sparkles', color: '#10B981', label: 'Celebrate' },
  ] as const, []);

  const handleSpawnEmoji = useCallback((icon: string, color: string) => {
    const screenW = Dimensions.get('window').width;
    const newEmoji: FloatingEmoji = {
      id: `${Date.now()}-${Math.random()}`,
      icon,
      color,
      x: screenW - 50 - Math.random() * 60,
      animY: new Animated.Value(0),
      animOpacity: new Animated.Value(1),
      animScale: new Animated.Value(0.3),
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
  }, []);

  const handleRemoveEmoji = useCallback((id: string) => {
    setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleReaction = useCallback((icon: string, color: string) => {
    handleSpawnEmoji(icon, color);
  }, [handleSpawnEmoji]);

  const isInitialLiveLoading = isSessionsLoading && !currentLiveSession;

  if (isInitialLiveLoading) {
    return (
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: screenSwipeTranslateX }],
          opacity: screenSwipeOpacity,
        }}
      >
        <LinearGradient colors={['#0B0F1A', '#131B2E', '#1A1040']} style={styles.container}>
          <View style={styles.liveLoadingTopBar}>
            <TouchableOpacity onPress={handleExitLive} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.liveLoadingContainer}>
            <View style={styles.liveLoadingCard}>
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text style={styles.liveLoadingTitle}>Đang vào phòng live</Text>
              <Text style={styles.liveLoadingText}>Vui lòng đợi trong giây lát...</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateX: screenSwipeTranslateX }],
        opacity: screenSwipeOpacity,
      }}
    >
      <LinearGradient colors={['#0B0F1A', '#131B2E', '#1A1040']} style={styles.container}>
        {/* <SafeAreaView style={styles.safeArea} edges={['top']}> */}
        <View style={styles.headerOverlay}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleExitLive} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerStatusRow}>
              {isLiveSession && hasLiveStream && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
              <View style={styles.listenerBadge}>
                <Ionicons name="people" size={14} color="#FFFFFF" />
                <Text style={styles.listenerText}>{liveListeners}</Text>
              </View>
              <TouchableOpacity
                style={[styles.streamControlButton, isStreamPlaying && styles.streamControlButtonActive]}
                onPress={() => void toggleStreamPlayback()}
                disabled={isStreamLoading || !hasLiveStream}
              >
                {isStreamLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name={isStreamPlaying ? 'pause' : 'play'} size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.streamControlButton}
                onPress={() => void toggleStreamMute()}
                disabled={isStreamLoading || !hasLiveStream}
              >
                <Ionicons name={isStreamMuted ? 'volume-mute' : 'volume-high'} size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setShowSidebar(true)} style={styles.headerButton}>
              <Ionicons name="menu" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        {/* </SafeAreaView> */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isStoryTouching}
        >
          <View style={styles.titleSection}>
            <Text style={styles.liveTitle}>{liveTitle}</Text>
            <View style={styles.hostRow}>
              <Image
                source={{ uri: user?.profileImageUrl || LIVE_SESSION.hostAvatar }}
                style={styles.hostAvatar}
              />
              <Text style={styles.hostName}>{liveHost}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{liveCategory}</Text>
              </View>
            </View>

            {isSessionsLoading ? (
              <View style={styles.sessionListLoadingRow}>
                <ActivityIndicator size="small" color="#A78BFA" />
                <Text style={styles.sessionListLoadingText}>Đang tải danh sách phiên live...</Text>
              </View>
            ) : activeSessions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sessionList}
              >
                {activeSessions.map((session) => {
                  const isSelected = session.id === currentLiveSession?.id;

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[styles.sessionChip, isSelected && styles.sessionChipActive]}
                      onPress={() => setSelectedSessionId(session.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.sessionChipTitle, isSelected && styles.sessionChipTitleActive]} numberOfLines={1}>
                        {session.sessionName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {nowPlaying?.currentTrack && (
              <View style={styles.currentTrackCard}>
                <View style={styles.currentTrackBadge}>
                  <Ionicons name="radio" size={12} color="#A78BFA" />
                  <Text style={styles.currentTrackBadgeText}>Đang phát</Text>
                </View>
                <View style={styles.currentTrackRow}>
                  {currentArtUrl ? (
                    <Image source={{ uri: currentArtUrl }} style={styles.currentTrackArt} />
                  ) : (
                    <View style={[styles.currentTrackArt, styles.currentTrackArtFallback]}>
                      <Ionicons name="musical-notes" size={20} color="#A78BFA" />
                    </View>
                  )}
                  <View style={styles.currentTrackInfo}>
                    <Text style={styles.currentTrackTitle} numberOfLines={1}>
                      {nowPlaying.currentTrack.title || 'Unknown Track'}
                    </Text>
                    <Text style={styles.currentTrackArtist} numberOfLines={1}>
                      {nowPlaying.currentTrack.artist || 'Unknown Artist'}
                    </Text>
                    <View style={styles.currentTrackMetaRow}>
                      <Text style={styles.currentTrackMetaText}>
                        {formatDuration(elapsedToRender)} / {formatDuration(nowPlaying.currentTrack.duration)}
                      </Text>
                      {nowPlaying.playingNext?.title ? (
                        <Text style={[styles.currentTrackMetaText, { maxWidth: 230 }]} numberOfLines={1}>
                          Tiếp theo: {nowPlaying.playingNext.title}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {!hasLiveStream && (
              <View style={styles.noLiveCard}>
                <Ionicons name="radio-outline" size={16} color="#FBBF24" />
                <Text style={styles.noLiveText}>Phiên live hiện chưa có nguồn phát</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    void fetchActiveSessions();
                  }}
                >
                  <Text style={styles.retryButtonText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeText}>Chào mừng đến SoundMates trực tuyến</Text>
          </View>

          <View style={styles.progressRow}>
            {STORIES.map((_, index) => (
              <View key={index} style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        index === currentStoryIndex
                          ? `${storyProgress}%`
                          : index < currentStoryIndex
                            ? '100%'
                            : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {!isInputFocused && (
            <>
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.storyAnimatedWrapper,
                  {
                    opacity: storyOpacity,
                    transform: [{ translateX: combinedTranslateX }],
                  },
                ]}
              >
                <Pressable
                  onPressIn={() => {
                    setIsPaused(true);
                    setIsStoryTouching(true);
                  }}
                  onPressOut={() => {
                    setIsPaused(false);
                    setIsStoryTouching(false);
                  }}
                  delayLongPress={200}
                >
                  <StoryCard story={currentStory} />
                </Pressable>
              </Animated.View>

              <View style={styles.storyCounter}>
                <Text style={styles.storyCounterText}>
                  {currentStoryIndex + 1} / {STORIES.length}
                </Text>
              </View>
            </>
          )}

        </ScrollView>

        {!isInputFocused && <ChatOverlay messages={messages} />}

        <View style={[styles.bottomStack, { paddingBottom: keyboardHeight }]}>
          {isInputFocused && <ChatPanel messages={messages} />}

          <LinearGradient
            colors={['rgba(11,15,26,0.85)', 'rgba(11,15,26,0.5)', 'rgba(11,15,26,0)']}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.bottomBar}
          >
            <View style={styles.bottomBarRow}>
              <View style={styles.inputContainer}>
                <FormTextField
                  containerStyle={styles.chatInputFieldWrap}
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  onSubmitEditing={handleSendMessage}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="Nhập bình luận..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  returnKeyType="send"
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  style={[styles.sendButton, !inputMessage.trim() && styles.sendButtonDisabled]}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {!isInputFocused && (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={() => setShowReactions(true)}>
                    <Ionicons name="happy" size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} onPress={() => setShowRequestModal(true)}>
                    <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} onPress={() => setShowPodcastModal(true)}>
                    <Ionicons name="mic" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </LinearGradient>
        </View>

        <SidebarMenu
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          nowPlayingItems={nowPlayingItems}
          isStreamMuted={isStreamMuted}
          onToggleMute={() => void toggleStreamMute()}
        />
        <RequestSongModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          liveSessionId={currentLiveSession?.id}
          stationId={currentLiveSession?.stationId}
          songHistory={nowPlaying?.songHistory || []}
          onRequestSuccess={handleRequestSuccess}
        />
        <SendPodcastModal isOpen={showPodcastModal} onClose={() => setShowPodcastModal(false)} />

        {/* Floating emoji animations */}
        {floatingEmojis.map((emoji) => (
          <FloatingEmojiView key={emoji.id} emoji={emoji} onDone={handleRemoveEmoji} />
        ))}

        {/* Inline Reaction Bar */}
        {showReactions && (
          <View style={styles.reactionBarContainer}>
            <View style={styles.reactionPicker}>
              {REACTION_OPTIONS.map((reaction) => (
                <TouchableOpacity
                  key={reaction.label}
                  onPress={() => handleReaction(reaction.icon, reaction.color)}
                  style={[styles.reactionButton, { backgroundColor: `${reaction.color}20` }]}
                  activeOpacity={0.6}
                >
                  <Ionicons name={reaction.icon} size={26} color={reaction.color} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowReactions(false)}
                style={styles.reactionCloseBtn}
              >
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.edgeSwipeBackZone} {...edgeBackPanResponder.panHandlers} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  headerOverlay: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(11,15,26,0.5)',
  },
  liveLoadingTopBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  liveLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  liveLoadingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  liveLoadingTitle: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  liveLoadingText: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  listenerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  listenerText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  streamControlButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamControlButtonActive: {
    backgroundColor: 'rgba(99,102,241,0.6)',
    borderColor: 'rgba(139,92,246,0.5)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 160,
  },
  titleSection: {
    marginBottom: 16,
  },
  sessionListLoadingRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionListLoadingText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionList: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 2,
  },
  sessionChip: {
    minWidth: 136,
    maxWidth: 170,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 4,
  },
  sessionChipActive: {
    borderColor: 'rgba(139,92,246,0.6)',
    backgroundColor: 'rgba(99,102,241,0.18)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionChipTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionChipTitleActive: {
    color: '#FFFFFF',
  },
  sessionChipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionChipMetaText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
  },
  sessionChipMetaTextActive: {
    color: '#E0F2FE',
  },
  liveTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.6)',
    marginRight: 8,
  },
  hostName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '700',
  },
  currentTrackCard: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  noLiveCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noLiveText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  retryButton: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  retryButtonText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '700',
  },
  currentTrackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  currentTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentTrackArt: {
    width: 52,
    height: 52,
    borderRadius: 8,
    flexShrink: 0,
  },
  currentTrackArtFallback: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentTrackInfo: {
    flex: 1,
    minWidth: 0,
  },
  currentTrackBadgeText: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '700',
  },
  currentTrackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  currentTrackArtist: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  currentTrackMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  currentTrackMetaText: {
    color: '#A78BFA',
    fontSize: 11,
    flexShrink: 1,
    fontWeight: '500',
  },
  welcomeRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 14,
  },
  welcomeText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A78BFA',
    borderRadius: 999,
  },
  storyAnimatedWrapper: {
    alignSelf: 'stretch',
  },
  edgeSwipeBackZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 60,
  },
  storyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(139,92,246,0.25)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  storyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  storyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A78BFA',
    letterSpacing: 1,
  },
  storyContent: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
    marginBottom: 14,
  },
  storyFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storyAuthorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  storyAuthorText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  storyCategoryBadge: {
    backgroundColor: 'rgba(99,102,241,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  storyCategoryText: {
    fontSize: 9,
    color: '#C4B5FD',
    fontWeight: '700',
  },
  storyLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,92,246,0.15)',
    paddingTop: 10,
  },
  storyLikeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  storyTimestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  storyCounter: {
    alignItems: 'center',
    marginTop: 12,
  },
  storyCounterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  chatOverlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
    paddingHorizontal: 12,
    zIndex: 20,
  },
  chatOverlay: {
    maxHeight: CHAT_VIEWPORT_MAX_HEIGHT,
  },
  chatOverlayContent: {
    gap: 8,
    paddingBottom: 6,
  },
  chatContentBottom: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  chatAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  chatBubbleBase: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '75%',
  },
  chatBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chatBubbleHost: {
    backgroundColor: 'rgba(99,102,241,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  chatBubbleRequest: {
    backgroundColor: 'rgba(139,92,246,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  chatAuthorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A78BFA',
    marginBottom: 4,
  },
  chatRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  chatRequestText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chatMessageText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  bottomStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatPanel: {
    marginHorizontal: 12,
    // marginBottom: 10,
    borderRadius: 16,
    // borderWidth: 1,
    // borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    maxHeight: CHAT_VIEWPORT_MAX_HEIGHT,
  },
  chatPanelContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  chatInputFieldWrap: {
    flex: 1,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.3,
    shadowOpacity: 0,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    marginTop: 45,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: 340,
    backgroundColor: '#1A1F35',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 14,
  },
  modalTextarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalPrimaryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  requestListContainer: {
    maxHeight: 280,
  },
  requestList: {
    maxHeight: 280,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  requestItemMeta: {
    flex: 1,
    minWidth: 0,
  },
  requestItemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  requestItemArtist: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  requestItemButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
  },
  requestItemButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  requestItemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  requestEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  requestEmptyText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
  reactionBarContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  reactionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1F35',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  sidebarPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#131725',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(139,92,246,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 14,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sidebarCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sidebarTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sidebarTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  sidebarTabText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  sidebarTabTextActive: {
    color: '#C4B5FD',
  },
  sidebarContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sidebarSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  sidebarSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  sidebarSongRowActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: 'rgba(139,92,246,0.3)',
  },
  sidebarSongIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sidebarSongIconActive: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  sidebarSongContent: {
    flex: 1,
    minWidth: 0,
  },
  sidebarSongTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sidebarSongArtist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  sidebarSongDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  sidebarVolumeBox: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 12,
  },
  sidebarVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarVolumeIconButton: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarVolumeTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  sidebarVolumeFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  sidebarVolumeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  sidebarPodcastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  sidebarPodcastIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
