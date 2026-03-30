import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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
    type NowPlayingData,
    type TrackInfo,
} from '../../api/livestreamService';
import FormTextField from '../../components/ui/FormTextField';
import { showToast } from '../../components/ui/Toast';

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
        <Ionicons name="radio" size={12} color="#a5b4fc" />
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
  const handleContentSizeChange = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
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

export default function LivestreamScreen({ onBack }: { onBack: () => void }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [activeSessions, setActiveSessions] = useState<LiveSessionResult[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [storyDirection, setStoryDirection] = useState<1 | -1>(1);
  const dragX = useRef(new Animated.Value(0)).current;
  const storyTranslateX = useRef(new Animated.Value(0)).current;
  const storyOpacity = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const activeStreamUrlRef = useRef('');
  const autoPlayedRef = useRef(false);
  const [isStreamPlaying, setIsStreamPlaying] = useState(false);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [streamAvailability, setStreamAvailability] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const [retryProbeTick, setRetryProbeTick] = useState(0);
  const [isStreamMuted, setIsStreamMuted] = useState(false);
  const [displayElapsed, setDisplayElapsed] = useState<number>(0);
  const [streamVolume] = useState(0.8);
  const combinedTranslateX = useMemo(
    () => Animated.add(storyTranslateX, dragX),
    [dragX, storyTranslateX]
  );

  const currentLiveSession = useMemo(
    () => activeSessions.find((session) => session.id === selectedSessionId) || activeSessions[0] || null,
    [activeSessions, selectedSessionId],
  );

  const fetchActiveSessions = useCallback(async () => {
    try {
      const allSessions: LiveSessionResult[] = [];
      let pageNumber = 1;
      let totalPages = 1;

      do {
        const paged = await livestreamService.getLiveSessions({
          pageNumber,
          pageSize: 50,
        });

        allSessions.push(...(paged.items || []));
        totalPages = paged.totalPages || 1;
        pageNumber += 1;
      } while (pageNumber <= totalPages);

      const liveSessions = allSessions.filter(
        (session) => session.status?.toLowerCase() === 'live',
      );

      const detailedLiveSessions = await Promise.all(
        liveSessions.map(async (session) => {
          try {
            return await livestreamService.getLiveSession(session.id);
          } catch {
            return session;
          }
        }),
      );

      setActiveSessions(detailedLiveSessions);
      setSelectedSessionId((prev) => {
        if (!detailedLiveSessions.length) return null;
        if (prev && detailedLiveSessions.some((session) => session.id === prev)) return prev;
        return detailedLiveSessions[0].id;
      });
      setNowPlaying(null);
    } catch (error) {
      console.log('Failed to fetch live sessions', error);
      setActiveSessions([]);
      setSelectedSessionId(null);
      setNowPlaying(null);
    } finally {
      setIsSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveSessions]);

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

  const unloadStream = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    activeStreamUrlRef.current = '';

    if (sound) {
      try {
        sound.setOnPlaybackStatusUpdate(null);
        await sound.unloadAsync();
      } catch {
        // Ignore cleanup errors.
      }
    }

    setIsStreamPlaying(false);
  }, []);

  const startStream = useCallback(async () => {
    if (!currentStreamUrl || isStreamLoading || !hasLiveStream) {
      if (!currentStreamUrl) {
        showToast.warning('Chưa có nguồn phát', 'Vui lòng đợi dữ liệu livestream cập nhật');
      } else if (!hasLiveStream) {
        showToast.info('Không có phiên live', 'Hiện đang không có phiên live nào');
      }
      return;
    }

    setIsStreamLoading(true);
    try {
      await unloadStream();
      console.log('[LivestreamScreen] Starting stream with URL:', currentStreamUrl);
      const { sound } = await Audio.Sound.createAsync(
        { uri: currentStreamUrl },
        {
          shouldPlay: true,
          isMuted: isStreamMuted,
          volume: streamVolume,
          progressUpdateIntervalMillis: 500,
        },
        (status) => {
          if (!status.isLoaded) {
            if (status.error) {
              console.log('[LivestreamScreen] playback error:', status.error);
            }
            setIsStreamPlaying(false);
            return;
          }

          setIsStreamPlaying(status.isPlaying);
        },
      );

      soundRef.current = sound;
      activeStreamUrlRef.current = currentStreamUrl;
      setIsStreamPlaying(true);
      setStreamAvailability('ready');
    } catch (error) {
      console.log('[LivestreamScreen] startStream error:', error);
      showToast.error('Không thể phát livestream', 'Kiểm tra kết nối mạng hoặc URL stream');
      setIsStreamPlaying(false);
      setStreamAvailability('unavailable');
    } finally {
      setIsStreamLoading(false);
    }
  }, [currentStreamUrl, hasLiveStream, isStreamLoading, isStreamMuted, streamVolume, unloadStream]);

  const toggleStreamPlayback = useCallback(async () => {
    if (isStreamLoading) return;

    const sound = soundRef.current;
    const isDifferentStream = activeStreamUrlRef.current !== currentStreamUrl;

    if (!sound || isDifferentStream) {
      await startStream();
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        await startStream();
        return;
      }

      if (status.isPlaying) {
        await sound.pauseAsync();
        setIsStreamPlaying(false);
      } else {
        await sound.playAsync();
        setIsStreamPlaying(true);
      }
    } catch (error) {
      console.log('[LivestreamScreen] toggleStreamPlayback error:', error);
      await startStream();
    }
  }, [currentStreamUrl, isStreamLoading, startStream]);

  const toggleStreamMute = useCallback(async () => {
    const nextMuted = !isStreamMuted;
    setIsStreamMuted(nextMuted);

    if (soundRef.current) {
      try {
        await soundRef.current.setIsMutedAsync(nextMuted);
      } catch (error) {
        console.log('[LivestreamScreen] toggleStreamMute error:', error);
      }
    }
  }, [isStreamMuted]);

  useEffect(() => {
    return () => {
      void unloadStream();
    };
  }, [unloadStream]);

  useEffect(() => {
    let isCancelled = false;

    const probeStream = async () => {
      if (!currentStreamUrl) {
        setStreamAvailability('unavailable');
        return;
      }

      setStreamAvailability('checking');

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: currentStreamUrl },
          {
            shouldPlay: false,
            isMuted: true,
            volume: 0,
          },
        );

        await sound.unloadAsync();

        if (!isCancelled) {
          setStreamAvailability('ready');
        }
      } catch (error) {
        console.log('[LivestreamScreen] probeStream error:', error);
        if (!isCancelled) {
          setStreamAvailability('unavailable');
          setIsStreamPlaying(false);
        }
      }
    };

    void probeStream();

    return () => {
      isCancelled = true;
    };
  }, [currentStreamUrl, retryProbeTick]);

  useEffect(() => {
    if (!currentStreamUrl || autoPlayedRef.current || streamAvailability !== 'ready') return;
    autoPlayedRef.current = true;
    void startStream();
  }, [currentStreamUrl, startStream, streamAvailability]);

  useEffect(() => {
    if (!currentStreamUrl || !soundRef.current || !isStreamPlaying || streamAvailability !== 'ready') return;
    if (activeStreamUrlRef.current === currentStreamUrl) return;
    void startStream();
  }, [currentStreamUrl, isStreamPlaying, startStream, streamAvailability]);

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
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          setIsPaused(true);
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
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
          setIsPaused(false);
        },
      }),
    [dragX, goToNextStory, goToPrevStory]
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

  const handleReaction = (label: string) => {
    showToast.info('Đã gửi cảm xúc', label);
  };

  const isInitialLiveLoading = isSessionsLoading && !currentLiveSession;

  if (isInitialLiveLoading) {
    return (
      <LinearGradient colors={['#1E293B', '#334155', '#475569']} style={styles.container}>
        <View style={styles.liveLoadingTopBar}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.liveLoadingContainer}>
          <View style={styles.liveLoadingCard}>
            <ActivityIndicator size="large" color="#7DD3FC" />
            <Text style={styles.liveLoadingTitle}>Đang vào phòng live</Text>
            <Text style={styles.liveLoadingText}>Vui lòng đợi trong giây lát...</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1E293B', '#334155', '#475569']} style={styles.container}>
      {/* <SafeAreaView style={styles.safeArea} edges={['top']}> */}
        <View style={styles.headerOverlay}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.headerButton}>
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
      >
        <View style={styles.titleSection}>
          <Text style={styles.liveTitle}>{liveTitle}</Text>
          <View style={styles.hostRow}>
            <Image source={{ uri: LIVE_SESSION.hostAvatar }} style={styles.hostAvatar} />
            <Text style={styles.hostName}>{liveHost}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{liveCategory}</Text>
            </View>
          </View>

          {isSessionsLoading ? (
            <View style={styles.sessionListLoadingRow}>
              <ActivityIndicator size="small" color="#7DD3FC" />
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
                    <View style={styles.sessionChipMeta}>
                      <Ionicons
                        name="people"
                        size={11}
                        color={isSelected ? '#E0F2FE' : 'rgba(255,255,255,0.72)'}
                      />
                      <Text style={[styles.sessionChipMetaText, isSelected && styles.sessionChipMetaTextActive]}>
                        {session.listenersCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {nowPlaying?.currentTrack && (
            <View style={styles.currentTrackCard}>
              <View style={styles.currentTrackBadge}>
                <Ionicons name="radio" size={12} color="#55C5F1" />
                <Text style={styles.currentTrackBadgeText}>Đang phát</Text>
              </View>
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
                  <Text style={styles.currentTrackMetaText} numberOfLines={1}>
                    Tiếp theo: {nowPlaying.playingNext.title}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {streamAvailability === 'unavailable' && (
            <View style={styles.noLiveCard}>
              <Ionicons name="radio-outline" size={16} color="#FBBF24" />
              <Text style={styles.noLiveText}>Hiện đang không có phiên live nào</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  void fetchActiveSessions();
                  setRetryProbeTick((prev) => prev + 1);
                }}
              >
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          {streamAvailability === 'checking' && (
            <View style={styles.noLiveCard}>
              <ActivityIndicator size="small" color="#7DD3FC" />
              <Text style={styles.noLiveText}>Đang kiểm tra phiên live...</Text>
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
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              onTouchCancel={() => setIsPaused(false)}
              style={[
                styles.storyAnimatedWrapper,
                {
                  opacity: storyOpacity,
                  transform: [{ translateX: combinedTranslateX }],
                },
              ]}
            >
              <StoryCard story={currentStory} />
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
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
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
        streamVolume={streamVolume}
        onToggleMute={() => void toggleStreamMute()}
      />
      <ReactionPicker isOpen={showReactions} onClose={() => setShowReactions(false)} onSelect={handleReaction} />
      <RequestSongModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        songHistory={nowPlaying?.songHistory || []}
        onRequestSuccess={handleRequestSuccess}
      />
      <SendPodcastModal isOpen={showPodcastModal} onClose={() => setShowPodcastModal(false)} />
    </LinearGradient>
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
    paddingTop: 8,
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
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.35)',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamControlButtonActive: {
    backgroundColor: '#55C5F1',
    borderColor: '#7DD3FC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 15,
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  titleSection: {
    marginBottom: 12,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
    backgroundColor: 'rgba(15,23,42,0.42)',
    gap: 4,
  },
  sessionChipActive: {
    borderColor: 'rgba(125,211,252,0.9)',
    backgroundColor: 'rgba(85,197,241,0.28)',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginRight: 8,
  },
  hostName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    color: '#55C5F1',
    fontSize: 10,
    fontWeight: '600',
  },
  currentTrackCard: {
    marginTop: 10,
    backgroundColor: 'rgba(15,23,42,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(85,197,241,0.35)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  noLiveCard: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noLiveText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  retryButton: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(85,197,241,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.7)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  retryButtonText: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '700',
  },
  currentTrackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  currentTrackBadgeText: {
    color: '#BAE6FD',
    fontSize: 11,
    fontWeight: '700',
  },
  currentTrackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  currentTrackArtist: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
  },
  currentTrackMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  currentTrackMetaText: {
    color: '#BFDBFE',
    fontSize: 11,
    flexShrink: 1,
  },
  welcomeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#55C5F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  storyAnimatedWrapper: {
    alignSelf: 'stretch',
  },
  storyCard: {
    backgroundColor: 'rgba(17,24,39,0.6)',
    borderColor: 'rgba(99,102,241,0.3)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  storyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  storyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a5b4fc',
  },
  storyContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#E5E7EB',
    fontStyle: 'italic',
    marginBottom: 12,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  storyAuthorText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  storyCategoryBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  storyCategoryText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  storyLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,102,241,0.2)',
    paddingTop: 8,
  },
  storyLikeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  storyTimestamp: {
    fontSize: 11,
    color: '#6B7280',
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
    maxHeight: 320,
  },
  chatOverlayContent: {
    gap: 8,
    paddingBottom: 6,
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
    // backgroundColor: 'rgba(0,0,0,0.6)',
  },
  chatBubbleHost: {
    backgroundColor: 'rgba(60,95,153,0.85)',
  },
  chatBubbleRequest: {
    backgroundColor: 'rgba(85,197,241,0.85)',
  },
  chatAuthorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1D5DB',
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
    maxHeight: 240,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
    backgroundColor: '#55C5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 12,
  },
  modalTextarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalPrimaryButton: {
    backgroundColor: '#55C5F1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
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
    borderBottomColor: '#F1F5F9',
  },
  requestItemMeta: {
    flex: 1,
    minWidth: 0,
  },
  requestItemTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  requestItemArtist: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
  },
  requestItemButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#55C5F1',
  },
  requestItemButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  requestItemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  requestEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  requestEmptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  reactionPicker: {
    position: 'absolute',
    bottom: 90,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sidebarCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sidebarTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sidebarTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#55C5F1',
  },
  sidebarTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  sidebarTabTextActive: {
    color: '#55C5F1',
  },
  sidebarContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sidebarSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  sidebarSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sidebarSongRowActive: {
    backgroundColor: '#E0F2FE',
  },
  sidebarSongIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sidebarSongIconActive: {
    backgroundColor: '#55C5F1',
  },
  sidebarSongContent: {
    flex: 1,
    minWidth: 0,
  },
  sidebarSongTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  sidebarSongArtist: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sidebarSongDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sidebarVolumeBox: {
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
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
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sidebarVolumeFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#55C5F1',
  },
  sidebarVolumeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  sidebarPodcastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  sidebarPodcastIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#55C5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
