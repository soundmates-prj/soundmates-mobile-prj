import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  View
} from 'react-native';
import EmojiPicker from 'rn-emoji-keyboard';
import authApiClient from '../../api/apiClient';
import {
  TrackInfo,
  livestreamService,
  type LiveSessionResult,
} from '../../api/livestreamService';
import FormTextField from '../../components/ui/FormTextField';
import { showToast } from '../../components/ui/Toast';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useUser } from '../../context/UserContext';
import { HubChatMessage, liveHubService } from '../../services/liveHubService';
import { getLiveListenersCount } from '../../utils/listenerUtils';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  userId?: string;
  author: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isHost?: boolean;
  isRequest?: boolean;
  requestSong?: string;
  avatarColor?: string;
  isDeleted?: boolean;
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

interface ThemeTokens {
  borderRadius?: string;
  boxShadow?: string;
  iconStyle?: string;
  backgroundImage?: string;
  [key: string]: string | undefined;
}

interface ThemeResult {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor: string;
  textColor: string;
  gradientBackground?: string;
  configJson?: ThemeTokens;
}

interface RequestSongCandidate {
  id: string;
  mediaFileId?: string;
  title: string;
  artist: string;
  album?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DEFAULT_BG_COLORS: [string, string, string] = ['#0B0F1A', '#131B2E', '#1A1040'];

// ── Helper functions ──────────────────────────────────────────────────────

const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || seconds === null || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

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

const parseLyricLines = (lyrics: string | null): string[] => {
  if (!lyrics) return [];
  // Remove LRC timestamps like [00:12.34]
  const cleaned = lyrics.replace(/\[\d{2}:\d{2}(?:\.\d+)?\]/g, '').trim();
  return cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
};

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// ── FloatingEmojiView ──────────────────────────────────────────────────────

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
        Animated.timing(emoji.animScale, { toValue: 1.3, duration: 300, useNativeDriver: true }),
        Animated.timing(emoji.animScale, { toValue: 0.9, duration: 1500, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(emoji.animOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
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
        transform: [{ translateY: emoji.animY }, { scale: emoji.animScale }, { rotate: rotation }],
        opacity: emoji.animOpacity,
      }}
    >
      <Ionicons name={emoji.icon as any} size={30} color={emoji.color} />
    </Animated.View>
  );
}

// ── FloatingLyricsBar ──────────────────────────────────────────────────────
// Shows 3 lines of lyric (current line highlighted, prev & next dimmed)

function FloatingLyricsBar({
  lyrics,
  elapsed,
  duration,
}: {
  lyrics: string | null;
  elapsed: number;
  duration: number;
}) {
  const lines = useMemo(() => parseLyricLines(lyrics), [lyrics]);

  const currentLineIndex = useMemo(() => {
    if (!lines.length || !duration) return 0;
    const pct = elapsed / duration;
    const idx = Math.floor(pct * lines.length);
    return Math.max(0, Math.min(idx, lines.length - 1));
  }, [lines, elapsed, duration]);

  if (!lines.length) return null;

  const prev = currentLineIndex > 0 ? lines[currentLineIndex - 1] : null;
  const curr = lines[currentLineIndex];
  const next = currentLineIndex < lines.length - 1 ? lines[currentLineIndex + 1] : null;

  return (
    <View style={styles.floatingLyricsBar}>
      {prev && (
        <Text style={styles.lyricLineDim} numberOfLines={1}>{prev}</Text>
      )}
      <Text style={styles.lyricLineCurrent} numberOfLines={1}>{curr}</Text>
      {next && (
        <Text style={styles.lyricLineDim} numberOfLines={1}>{next}</Text>
      )}
    </View>
  );
}

// ── SidebarMenu (music only, no podcast) ──────────────────────────────────

function SidebarMenu({
  isOpen,
  onClose,
  nowPlayingItems,
  isStreamMuted,
  onToggleMute,
}: {
  isOpen: boolean;
  onClose: () => void;
  nowPlayingItems: Array<{ id: string; title: string; artist: string; duration: string; isPlaying: boolean }>;
  isStreamMuted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sidebarPanel}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Playlist Live</Text>
            <TouchableOpacity onPress={onClose} style={styles.sidebarCloseButton}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.sidebarSongTitle} numberOfLines={1}>{song.title}</Text>
                  <Text style={styles.sidebarSongArtist} numberOfLines={1}>{song.artist}</Text>
                </View>
                <Text style={styles.sidebarSongDuration}>{song.duration}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── RequestSongModal ───────────────────────────────────────────────────────

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
  const [requestMessage, setRequestMessage] = useState('');
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
    setRequestMessage('');
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        message: requestMessage.trim() || undefined,
      });
      setRequestedIds((prev) => {
        const next = new Set(prev);
        next.add(candidate.id);
        return next;
      });
      onRequestSuccess(candidate.title);
      setRequestMessage('');
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
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎵 Request Bài Hát</Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
              <FormTextField
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm bài hát hoặc nghệ sĩ..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.searchInput}
                containerStyle={{ flex: 1 }}
              />
            </View>

            {/* Message to host */}
            <View style={styles.requestMessageWrap}>
              <FormTextField
                value={requestMessage}
                onChangeText={(text: string) => setRequestMessage(text.slice(0, 300))}
                placeholder="Nhắn host (tuỳ chọn): ví dụ 'Cho mình nghe bài này tặng bạn A'"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.requestMessageInput}
                containerStyle={{ flex: 1 }}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.requestMessageCount}>{requestMessage.length}/300</Text>
            </View>

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
                <ScrollView style={styles.requestList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {filteredCandidates.map((song) => {
                    const requested = requestedIds.has(song.id);
                    const isSubmitting = isSubmittingId === song.id;
                    const canRequest = Boolean(song.mediaFileId);
                    return (
                      <View key={song.id} style={styles.requestItem}>
                        <View style={styles.requestItemMeta}>
                          <Text style={styles.requestItemTitle} numberOfLines={1}>{song.title}</Text>
                          <Text style={styles.requestItemArtist} numberOfLines={1}>
                            {song.artist}{song.album ? ` • ${song.album}` : ''}
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
                            {requested ? 'Đã gửi' : isSubmitting ? 'Đang gửi...' : canRequest ? 'Request' : 'Không hỗ trợ'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

// ── LyricScreen (slide 2) ──────────────────────────────────────────────────

function LyricScreen({
  nowPlaying,
  elapsed,
}: {
  nowPlaying: any;
  elapsed: number;
}) {
  const track = nowPlaying?.currentTrack;
  const lyricLines = useMemo(() => parseLyricLines(track?.lyrics ?? null), [track?.lyrics]);

  const currentLineIndex = useMemo(() => {
    if (!lyricLines.length || !track?.duration) return 0;
    const pct = elapsed / track.duration;
    const idx = Math.floor(pct * lyricLines.length);
    return Math.max(0, Math.min(idx, lyricLines.length - 1));
  }, [lyricLines, elapsed, track?.duration]);

  const scrollRef = useRef<ScrollView>(null);
  const lineHeightRef = useRef(24);

  useEffect(() => {
    if (!lyricLines.length) return;
    const offset = Math.max(0, (currentLineIndex - 2) * (lineHeightRef.current + 10));
    scrollRef.current?.scrollTo({ y: offset, animated: true });
  }, [currentLineIndex, lyricLines.length]);

  if (!track) {
    return (
      <View style={styles.lyricScreenEmpty}>
        <Ionicons name="musical-notes-outline" size={40} color="rgba(255,255,255,0.3)" />
        <Text style={styles.lyricScreenEmptyText}>Chưa có bài hát đang phát</Text>
      </View>
    );
  }

  return (
    <View style={styles.lyricScreenContainer}>
      {/* Track info */}
      <View style={styles.lyricTrackInfo}>
        {track.artUrl ? (
          <Image source={{ uri: track.artUrl }} style={styles.lyricAlbumArt} />
        ) : (
          <View style={[styles.lyricAlbumArt, styles.lyricAlbumArtFallback]}>
            <Ionicons name="musical-notes" size={28} color="#A78BFA" />
          </View>
        )}
        <View style={styles.lyricTrackText}>
          <Text style={styles.lyricTrackTitle} numberOfLines={1}>{track.title || 'Unknown Track'}</Text>
          <Text style={styles.lyricTrackArtist} numberOfLines={1}>{track.artist || 'Unknown Artist'}</Text>
          {track.album ? (
            <Text style={styles.lyricTrackAlbum} numberOfLines={1}>{track.album}</Text>
          ) : null}
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.lyricProgressWrap}>
        <View style={styles.lyricProgressTrack}>
          <View
            style={[
              styles.lyricProgressFill,
              {
                width: track.duration > 0
                  ? `${Math.min((elapsed / track.duration) * 100, 100)}%`
                  : '0%',
              } as any,
            ]}
          />
        </View>
        <View style={styles.lyricProgressTimes}>
          <Text style={styles.lyricProgressTime}>{formatDuration(elapsed)}</Text>
          <Text style={styles.lyricProgressTime}>{formatDuration(track.duration)}</Text>
        </View>
      </View>

      {/* Lyric scroll */}
      {lyricLines.length > 0 ? (
        <ScrollView
          ref={scrollRef}
          style={styles.lyricScrollView}
          contentContainerStyle={styles.lyricScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {lyricLines.map((line, idx) => (
            <Text
              key={idx}
              onLayout={(e) => {
                lineHeightRef.current = e.nativeEvent.layout.height;
              }}
              style={[
                styles.lyricLine,
                idx === currentLineIndex && styles.lyricLineActive,
                Math.abs(idx - currentLineIndex) === 1 && styles.lyricLineNear,
              ]}
            >
              {line}
            </Text>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.lyricEmptyBox}>
          <Ionicons name="document-text-outline" size={28} color="rgba(255,255,255,0.25)" />
          <Text style={styles.lyricEmptyText}>Bài hát này chưa có lời</Text>
        </View>
      )}
    </View>
  );
}

// ── ChatActionModal ────────────────────────────────────────────────────────

function ChatActionModal({
  visible,
  message,
  onClose,
  onRevoke,
}: {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onRevoke: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.chatActionBackdrop} onPress={onClose}>
        <View style={styles.chatActionSheet}>
          {/* Handle bar */}
          <View style={styles.chatActionHandle} />

          {/* Author info */}
          {message && (
            <View style={styles.chatActionHeader}>
              <View style={[styles.chatAvatarCircle, { backgroundColor: message.avatarColor || '#374151', width: 32, height: 32, borderRadius: 16 }]}>
                {message.avatar ? (
                  <Image source={{ uri: message.avatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                ) : (
                  <Text style={[styles.chatAvatarText, { fontSize: 13 }]}>
                    {(message.author || '?').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatActionAuthor} numberOfLines={1}>{message.author}</Text>
                <Text style={styles.chatActionPreview} numberOfLines={1}>
                  {message.isDeleted ? 'Tin nhắn đã bị thu hồi' : message.message}
                </Text>
              </View>
            </View>
          )}

          {/* Revoke button */}
          <TouchableOpacity
            style={styles.chatActionRevokeBtn}
            onPress={() => {
              onClose();
              // Small delay so modal closes first
              setTimeout(() => onRevoke(), 200);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.chatActionRevokeBtnText}>Thu hồi tin nhắn</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={styles.chatActionCancelBtn} onPress={onClose}>
            <Text style={styles.chatActionCancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── DotMenuPopover ────────────────────────────────────────────────────────
// Small popover anchored to the 3-dot button

const DOT_POPOVER_H = 44; // approximate popover height

function DotMenuPopover({
  visible,
  pageX,
  pageY,
  themeColor,
  onClose,
  onRevoke,
}: {
  visible: boolean;
  pageX: number;
  pageY: number;
  themeColor?: string;
  onClose: () => void;
  onRevoke: () => void;
}) {
  // Anchor the RIGHT edge of popover to the X position of the 3-dot button (+4 pad)
  const rightOffset = SCREEN_W - pageX - 130;
  // Show ABOVE the button when near bottom, otherwise BELOW
  const showAbove = SCREEN_H - pageY < DOT_POPOVER_H + 60;
  const top = showAbove ? pageY - DOT_POPOVER_H - 4 : pageY;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <View
          pointerEvents="box-none"
          style={[styles.dotPopover, { top, right: rightOffset, backgroundColor: themeColor || '#252235' }]}
        >
          <TouchableOpacity
            style={styles.dotPopoverItem}
            onPress={() => {
              onClose();
              setTimeout(() => onRevoke(), 150);
            }}
          >
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
            <Text style={styles.dotPopoverItemText}>Thu hồi</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── ChatSection ────────────────────────────────────────────────────────────

function ChatSection({
  messages,
  onShowActions,
  onShowDotMenu,
  currentUserId,
}: {
  messages: ChatMessage[];
  onShowActions?: (msg: ChatMessage) => void;
  onShowDotMenu?: (msg: ChatMessage, pageX: number, pageY: number) => void;
  currentUserId?: string;
}) {
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.chatScrollView}
      contentContainerStyle={styles.chatScrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      onContentSizeChange={() => scrollToBottom(false)}
      onLayout={() => scrollToBottom(false)}
      keyboardShouldPersistTaps="handled"
    >
      {messages.map((msg) => {
        const bubbleStyle = msg.isHost
          ? styles.chatBubbleHost
          : msg.isRequest
            ? styles.chatBubbleRequest
            : styles.chatBubble;
        return (
          <TouchableOpacity
            key={msg.id}
            style={styles.chatRow}
            onLongPress={() => onShowActions && onShowActions(msg)}
            activeOpacity={0.85}
          >
            {msg.avatar ? (
              <Image source={{ uri: msg.avatar }} style={[styles.chatAvatarCircle, { backgroundColor: '#374151' }]} />
            ) : (
              <View style={[styles.chatAvatarCircle, { backgroundColor: msg.avatarColor || '#374151' }]}>
                <Text style={styles.chatAvatarText}>
                  {(msg.author || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.chatBubbleBase, bubbleStyle]}>
              <Text style={[styles.chatAuthorText, msg.isHost && styles.chatAuthorHost]}>
                {msg.author}{msg.isHost ? ' (Host)' : ''}
              </Text>
              {msg.isRequest && msg.requestSong && (
                <View style={styles.chatRequestRow}>
                  <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                  <Text style={styles.chatRequestText}>{`Requested: ${msg.requestSong}`}</Text>
                </View>
              )}
              {msg.isDeleted ? (
                <Text style={[styles.chatMessageText, { fontStyle: 'italic', color: '#9CA3AF' }]}>Tin nhắn đã bị thu hồi/xoá.</Text>
              ) : (
                <Text style={styles.chatMessageText}>{msg.message}</Text>
              )}
              <Text style={styles.chatTimestamp}>{msg.timestamp}</Text>
            </View>
            {/* 3-dot menu button – only for own non-deleted messages */}
            {onShowDotMenu && !msg.isDeleted && currentUserId && (msg.userId === currentUserId || msg.avatarColor === '#55C5F1') && (
              <TouchableOpacity
                style={styles.chatMenuDotBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                onPress={(e) => onShowDotMenu(msg, e.nativeEvent.pageX, e.nativeEvent.pageY)}
              >
                <Ionicons name="ellipsis-vertical" size={14} color="rgba(255,255,255,0.45)" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function LivestreamScreen({
  onBack,
  sessionId,
}: {
  onBack: () => void;
  sessionId?: string;
}) {
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

  // ── State ────────────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<LiveSessionResult | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [bgColors, setBgColors] = useState<[string, string, string]>(DEFAULT_BG_COLORS);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0 = main, 1 = lyrics
  const [chatActionTarget, setChatActionTarget] = useState<ChatMessage | null>(null);
  const [isEmojiKeyboardOpen, setIsEmojiKeyboardOpen] = useState(false);
  // Separate open/data to avoid jump-to-top when closing (data persists through fade animation)
  const [dotMenuOpen, setDotMenuOpen] = useState(false);
  const [dotMenuData, setDotMenuData] = useState<{ msg: ChatMessage; pageX: number; pageY: number }>(
    { msg: {} as ChatMessage, pageX: 0, pageY: 0 }
  );
  const pageScrollRef = useRef<ScrollView>(null);

  // ── Theme loading ────────────────────────────────────────────────
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const res = await authApiClient.get<{
          success: boolean;
          data: { items: ThemeResult[] };
        }>('/themes/active');
        const themes: ThemeResult[] = res.data?.data?.items || [];

        let activeTheme = themes[0];
        const savedId = await AsyncStorage.getItem('profilescreen_active_theme_id');
        if (savedId) {
          const found = themes.find(t => t.id === savedId);
          if (found) activeTheme = found;
        }

        if (activeTheme?.configJson?.backgroundImage) {
          setBgImageUrl(activeTheme.configJson.backgroundImage);
        }

        if (activeTheme?.gradientBackground) {
          const regex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/gi;
          const matches = activeTheme.gradientBackground.match(regex);
          if (matches && matches.length >= 2) {
            setBgColors([
              matches[0],
              matches[1],
              matches[2] || matches[1],
            ]);
            return;
          }
        }

        if (activeTheme?.backgroundColor) {
          setBgColors([
            activeTheme.backgroundColor,
            activeTheme.backgroundColor,
            activeTheme.primaryColor || DEFAULT_BG_COLORS[2],
          ]);
        }
      } catch {
        // Keep default colors
      }
    };
    void loadTheme();
  }, []);

  // ── Keyboard listener ────────────────────────────────────────────
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Session loading ──────────────────────────────────────────────
  const fetchAndValidateSession = useCallback(async () => {
    setIsSessionsLoading(true);
    setErrorMessage(null);
    try {
      const activeSessions = await livestreamService.getActiveSessions();

      // Find the target session
      const target = sessionId
        ? activeSessions.find((s) => s.id === sessionId)
        : activeSessions.find((s) => s.status?.toLowerCase() === 'live') || activeSessions[0];

      if (!target) {
        setErrorMessage('Không tìm thấy phiên live đang hoạt động.');
        setActiveSession(null);
        return;
      }

      if (target.status?.toLowerCase() !== 'live') {
        setErrorMessage(
          `Phiên live này hiện không hoạt động (trạng thái: ${target.status || 'unknown'}). Vui lòng quay lại sau.`,
        );
        setActiveSession(null);
        return;
      }

      setActiveSession(target);

      // Add welcome message
      setMessages([
        {
          id: 'system-welcome',
          author: 'Hệ thống',
          message: 'Chào mừng đến SoundMates trực tuyến 🎵',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          avatarColor: '#5F6EE0',
        },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể kết nối phiên live';
      setErrorMessage(msg);
      setActiveSession(null);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchAndValidateSession();
  }, [fetchAndValidateSession]);

  // ── SignalR: join session & listen for chat ──────────────────────
  useEffect(() => {
    if (!activeSession) return;

    const userId = user?.userId || null;
    const myDisplayName = user?.firstName || user?.username || 'Bạn';
    let unsubChat: (() => void) | null = null;
    let unsubChatHistory: (() => void) | null = null;
    let unsubChatDeleted: (() => void) | null = null;

    const connectHub = async () => {
      try {
        let latestHistoryRef: ChatMessage[] = [];

        unsubChatHistory = liveHubService.onChatHistory((chats) => {
          const history = chats.map((chat) => ({
            id: chat.id || `hub-${Date.now()}-${Math.random()}`,
            userId: chat.userId,
            author: chat.userName || `User ${chat.userId?.slice(0, 6) || '??'}`,
            message: chat.message,
            avatar: chat.avatarUrl || (chat as any).AvatarUrl,
            timestamp: chat.createdAt
              ? new Date(chat.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            avatarColor: chat.userId === userId ? '#55C5F1' : '#A78BFA',
            isHost: chat.userId === activeSession.userId,
          }));
          latestHistoryRef = history;
          setMessages(history);
        });

        unsubChatDeleted = liveHubService.onChatDeleted((chatId) => {
          setMessages((prev) => prev.map(m => m.id === chatId ? { ...m, isDeleted: true } : m));
        });

        // Listen for incoming chat messages
        unsubChat = liveHubService.onReceiveChat((chat: HubChatMessage) => {
          const incoming: ChatMessage = {
            id: chat.id || `hub-${Date.now()}-${Math.random()}`,
            userId: chat.userId,
            author: chat.userName || `User ${chat.userId?.slice(0, 6) || '??'}`,
            message: chat.message,
            avatar: chat.avatarUrl || (chat as any).AvatarUrl,
            timestamp: chat.createdAt
              ? new Date(chat.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            avatarColor: chat.userId === userId ? '#55C5F1' : '#A78BFA',
            isHost: chat.userId === activeSession.userId
          };
          setMessages((prev) => [...prev, incoming]);
        });

        await liveHubService.start();
        await liveHubService.joinSession(activeSession.id, userId);
        console.log('[LivestreamScreen] SignalR joined session', activeSession.id);

      } catch (err) {
        console.warn('[LivestreamScreen] SignalR connection error:', err);
      }
    };

    void connectHub();

    return () => {
      if (unsubChat) unsubChat();
      if (unsubChatHistory) unsubChatHistory();
      if (unsubChatDeleted) unsubChatDeleted();
      void liveHubService.leaveSession(activeSession.id, userId).catch(() => { });
    };
  }, [activeSession, user]);

  // ── Load audio when session found ───────────────────────────────
  useEffect(() => {
    if (!activeSession) return;
    if (playerSession?.id === activeSession.id) return;
    loadSession(activeSession);
  }, [activeSession, loadSession, playerSession?.id]);

  const [queue, setQueue] = useState<TrackInfo[]>([]);

  useEffect(() => {
    if (!activeSession) return;
    const fetchQueue = () => {
      livestreamService.getQueueBySession(activeSession.id)
        .then(res => setQueue(res.queue || []))
        .catch(() => { });
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // ── Derived data ─────────────────────────────────────────────────
  const liveTitle = activeSession?.sessionName || nowPlaying?.stationName || 'Live Session';
  const liveHost = nowPlaying?.streamerName || activeSession?.stationName || '';
  const liveCategory = nowPlaying?.currentTrack?.genre || activeSession?.genre || '';
  const liveListeners = getLiveListenersCount(activeSession, nowPlaying);
  const currentArtUrl = nowPlaying?.currentTrack?.artUrl || null;
  const hasStream = Boolean((activeSession?.streamUrl || '').trim());
  const elapsed = nowPlaying?.currentTrack ? displayElapsed : 0;

  const nowPlayingItems = useMemo(() => {
    if (!nowPlaying) return [];
    const items: Array<{ id: string; title: string; artist: string; duration: string; isPlaying: boolean }> = [];
    if (nowPlaying.currentTrack) {
      items.push({
        id: `current-${nowPlaying.currentTrack.shId}`,
        title: nowPlaying.currentTrack.title || 'Unknown',
        artist: nowPlaying.currentTrack.artist || 'Unknown',
        duration: formatDuration(nowPlaying.currentTrack.duration),
        isPlaying: true,
      });
    }
    queue.slice(0, 15).forEach((t, i) => {
      items.push({
        id: `queue-${i}-${t.shId || Date.now()}`,
        title: t.title || 'Unknown',
        artist: t.artist || 'Unknown',
        duration: formatDuration(t.duration),
        isPlaying: false,
      });
    });
    return items;
  }, [nowPlaying, queue]);

  // ── Reactions ────────────────────────────────────────────────────
  const REACTION_OPTIONS = useMemo(() => [
    { icon: 'heart', color: '#EF4444', label: 'Love' },
    { icon: 'thumbs-up', color: '#3B82F6', label: 'Like' },
    { icon: 'happy', color: '#F59E0B', label: 'Haha' },
    { icon: 'sparkles', color: '#10B981', label: 'Celebrate' },
  ] as const, []);

  const handleSpawnEmoji = useCallback((icon: string, color: string) => {
    const x = SCREEN_W - 60 - Math.random() * 60;
    const newEmoji: FloatingEmoji = {
      id: `${Date.now()}-${Math.random()}`,
      icon,
      color,
      x,
      animY: new Animated.Value(0),
      animOpacity: new Animated.Value(1),
      animScale: new Animated.Value(0.3),
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
  }, []);

  const handleRemoveEmoji = useCallback((id: string) => {
    setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Chat ─────────────────────────────────────────────────────────

  const isTypingMode = isInputFocused || inputMessage.trim().length > 0;

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isTypingMode]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;
    const userId = user?.userId;
    if (!activeSession || !userId) {
      // Fallback: local-only message if no hub connection
      const msg: ChatMessage = {
        id: Date.now().toString(),
        author: user?.firstName || user?.username || 'Bạn',
        message: inputMessage.trim(),
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        avatarColor: '#55C5F1',
      };
      setMessages((prev) => [...prev, msg]);
      setInputMessage('');
      Keyboard.dismiss();
      return;
    }

    const text = inputMessage.trim();
    setInputMessage('');
    Keyboard.dismiss();

    try {
      const displayName = user?.firstName || user?.username || 'Bạn';
      const userAvatar = user?.profileImageUrl || ''; // Get user avatar if exists
      await liveHubService.sendChat(activeSession.id, userId, text, displayName, userAvatar);
      // The ReceiveChat event will add the message to the list
    } catch (err) {
      console.warn('[LivestreamScreen] sendChat failed:', err);
      // Fallback: show locally if send fails
      const msg: ChatMessage = {
        id: Date.now().toString(),
        author: user?.firstName || user?.username || 'Bạn',
        message: text,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        avatarColor: '#55C5F1',
      };
      setMessages((prev) => [...prev, msg]);
      showToast.warning('Tin nhắn offline', 'Tin nhắn chỉ hiển thị ở thiết bị này.');
    }
  }, [inputMessage, user, activeSession]);

  const handleRequestSuccess = useCallback((songTitle: string) => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      author: user?.firstName || user?.username || 'Bạn',
      message: 'Mình muốn nghe bài này! 🎵',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isRequest: true,
      requestSong: songTitle,
      avatarColor: '#55C5F1',
    };
    setMessages((prev) => [...prev, msg]);
  }, [user]);

  // Opens the action modal (3-dot or long-press)
  const handleShowChatActions = useCallback((msg: ChatMessage) => {
    if (!activeSession || !user) return;
    const userId = user.userId;
    const role = user.roleName || 'User';
    const isStaffOrHost = role === 'Host' || role === 'Staff' || role === 'Admin' || activeSession.userId === userId;
    const isOwner = msg.userId === userId || msg.id.includes(userId) || msg.author.includes('Bạn') || msg.avatarColor === '#55C5F1';
    // Only show action menu if user has permission
    if (!isStaffOrHost && !isOwner) return;
    setChatActionTarget(msg);
  }, [activeSession, user]);

  // Called after user confirms revoke from modal
  const handleDeleteChat = useCallback((msg: ChatMessage) => {
    if (!activeSession || !user) return;
    const userId = user.userId;
    const role = user.roleName || 'User';
    Alert.alert(
      'Thu hồi tin nhắn',
      'Bạn có chắc chắn muốn thu hồi tin nhắn này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: async () => {
            try {
              await liveHubService.deleteChat(activeSession.id, msg.id, userId, role);
            } catch (err) {
              console.warn('Failed to delete chat:', err);
            }
          }
        }
      ]
    );
  }, [activeSession, user]);

  // ── Page swipe (left ↔ right, no right-swipe = back) ─────────────
  const handleMomentumScrollEnd = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newPage = Math.round(offsetX / SCREEN_W);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  }, [currentPage]);

  // ── Loading state ────────────────────────────────────────────────
  if (isSessionsLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} >
          {bgImageUrl && <Image source={{ uri: bgImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />}
          <View style={styles.headerOverlay}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>
          </View>
          <View style={styles.centerContent}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text style={styles.loadingTitle}>Đang vào phòng live</Text>
              <Text style={styles.loadingText}>Vui lòng đợi trong giây lát...</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────
  if (errorMessage || !activeSession) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} >
          {bgImageUrl && <Image source={{ uri: bgImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />}
          <View style={styles.headerOverlay}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>
          </View>
          <View style={styles.centerContent}>
            <View style={styles.errorCard}>
              <Ionicons name="radio-outline" size={40} color="#EF4444" />
              <Text style={styles.errorTitle}>Không thể truy cập phiên live</Text>
              <Text style={styles.errorMessage}>{errorMessage || 'Không tìm thấy phiên live đang hoạt động.'}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => void fetchAndValidateSession()}
              >
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>Quay về</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />
      {bgImageUrl && <Image source={{ uri: bgImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />}

      {/* ── Overlay Modal Content Below ── */}
      {/* ── Header ── */}
      <View style={styles.headerOverlay}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerStatusRow}>
            {hasStream && (
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
              disabled={isStreamLoading || !hasStream}
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
              disabled={isStreamLoading || !hasStream}
            >
              <Ionicons name={isStreamMuted ? 'volume-mute' : 'volume-high'} size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setShowSidebar(true)} style={styles.headerButton}>
            <Ionicons name="menu" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Page indicators */}
        <View style={styles.pageIndicatorRow}>
          {[0, 1].map((i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setCurrentPage(i);
                pageScrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true });
              }}
            >
              <View style={[styles.pageIndicator, currentPage === i && styles.pageIndicatorActive]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Horizontal pager (ScrollView) ── */}
      <ScrollView
        ref={pageScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={{ flex: 1 }}
        contentContainerStyle={{ width: SCREEN_W * 2 }}
      >
        {/* ══ PAGE 1: Main Info + Chat ══ */}
        <View style={{ width: SCREEN_W, flex: 1 }}>
          {/* Title / session info */}
          <View style={styles.titleSection}>
            <Text style={styles.liveTitle} numberOfLines={2}>{liveTitle}</Text>
            <View style={styles.hostRow}>
              {user?.profileImageUrl ? (
                <Image source={{ uri: user.profileImageUrl }} style={styles.hostAvatar} />
              ) : (
                <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                  <Ionicons name="person" size={14} color="#A78BFA" />
                </View>
              )}
              <Text style={styles.hostName}>{liveHost}</Text>
              {!!liveCategory && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{liveCategory}</Text>
                </View>
              )}
            </View>

            {/* Current track card */}
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
                        {formatDuration(elapsed)} / {formatDuration(nowPlaying.currentTrack.duration)}
                      </Text>
                      {nowPlaying.playingNext?.title ? (
                        <Text style={[styles.currentTrackMetaText, { maxWidth: 200 }]} numberOfLines={1}>
                          Tiếp: {nowPlaying.playingNext.title}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Lyrics bar (3 lines) */}
                <FloatingLyricsBar
                  lyrics={nowPlaying.currentTrack.lyrics ?? null}
                  elapsed={elapsed}
                  duration={nowPlaying.currentTrack.duration || 0}
                />
              </View>
            )}

            {!hasStream && (
              <View style={styles.noLiveCard}>
                <Ionicons name="radio-outline" size={16} color="#FBBF24" />
                <Text style={styles.noLiveText}>Phiên live hiện chưa có nguồn phát</Text>
              </View>
            )}
          </View>

          {/* Swipe hint */}
          <View style={styles.swipeHint}>
            <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.3)" />
            <Text style={styles.swipeHintText}>Vuốt trái để xem lời bài hát</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
          </View>

          {/* Chat section */}
          <View style={[styles.chatContainer, { marginBottom: keyboardHeight > 0 ? keyboardHeight + 60 : 60 }]}>
            <View style={styles.chatHeader}>
              <Ionicons name="chatbubbles" size={14} color="#A78BFA" />
              <Text style={styles.chatHeaderText}>Chat trực tiếp</Text>
            </View>
            <ChatSection
              messages={messages}
              onShowActions={handleShowChatActions}
              onShowDotMenu={(msg, pageX, pageY) => {
                setDotMenuData({ msg, pageX, pageY });
                setDotMenuOpen(true);
              }}
              currentUserId={user?.userId}
            />
          </View>

          {/* Bottom bar: input + actions */}
          <View style={[styles.bottomStack, { paddingBottom: Math.max(keyboardHeight, 12) }]}>
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)']}
              style={styles.bottomBar}
            >
              <View style={styles.bottomBarRow}>
                <View style={styles.bottomAvatarWrap}>
                  {user?.profileImageUrl ? (
                    <Image source={{ uri: user.profileImageUrl }} style={styles.bottomAvatar} />
                  ) : (
                    <Text style={styles.bottomAvatarText}>{(user?.username || 'B').charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <FormTextField
                    containerStyle={{ flex: 1 }}
                    value={inputMessage}
                    onChangeText={setInputMessage}
                    onSubmitEditing={() => void handleSendMessage()}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="Nhập bình luận..."
                    placeholderTextColor="#888"
                    returnKeyType="send"
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => setIsEmojiKeyboardOpen(true)}
                  >
                    <Ionicons name="happy-outline" size={24} color="gray" />
                  </TouchableOpacity>
                </View>

                {isTypingMode ? (
                  <TouchableOpacity
                    onPress={() => void handleSendMessage()}
                    disabled={!inputMessage.trim()}
                    style={styles.sendButtonOutside}
                  >
                    <Ionicons
                      name="send-outline"
                      size={24}
                      color={inputMessage.trim() ? "#000" : "rgba(0,0,0,0.3)"}
                      style={{ transform: [{ rotate: '-45deg' }, { translateX: 2 }] }}
                    />
                  </TouchableOpacity>
                ) : (
                  <>
                    {/* <TouchableOpacity style={styles.actionButton} onPress={() => setShowReactions(true)}>
                      <Ionicons name="happy" size={20} color="#FFFFFF" />
                    </TouchableOpacity> */}
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowRequestModal(true)}>
                      <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </LinearGradient>
          </View>
          <EmojiPicker
            onEmojiSelected={(e) => setInputMessage(prev => prev + e.emoji)}
            open={isEmojiKeyboardOpen}
            onClose={() => setIsEmojiKeyboardOpen(false)}
            disableSafeArea={true}
          />
        </View>

        {/* ══ PAGE 2: Lyric View ══ */}
        <View style={{ width: SCREEN_W, flex: 1 }}>
          <View style={styles.lyricPageWrapper}>
            <LyricScreen
              nowPlaying={nowPlaying}
              elapsed={elapsed}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── Floating emojis ── */}
      {floatingEmojis.map((emoji) => (
        <FloatingEmojiView key={emoji.id} emoji={emoji} onDone={handleRemoveEmoji} />
      ))}

      {/* ── Reaction picker ── */}
      {showReactions && (
        <View style={styles.reactionBarContainer}>
          <View style={styles.reactionPicker}>
            {REACTION_OPTIONS.map((reaction) => (
              <TouchableOpacity
                key={reaction.label}
                onPress={() => handleSpawnEmoji(reaction.icon, reaction.color)}
                style={[styles.reactionButton, { backgroundColor: `${reaction.color}20` }]}
                activeOpacity={0.6}
              >
                <Ionicons name={reaction.icon} size={26} color={reaction.color} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowReactions(false)} style={styles.reactionCloseBtn}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Sidebar ── */}
      <SidebarMenu
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        nowPlayingItems={nowPlayingItems}
        isStreamMuted={isStreamMuted}
        onToggleMute={() => void toggleStreamMute()}
      />

      {/* ── Request Modal ── */}
      <RequestSongModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        liveSessionId={activeSession?.id}
        stationId={activeSession?.stationId}
        songHistory={nowPlaying?.songHistory || []}
        onRequestSuccess={handleRequestSuccess}
      />

      {/* ── Chat action bottom sheet (long-press) ── */}
      <ChatActionModal
        visible={chatActionTarget !== null}
        message={chatActionTarget}
        onClose={() => setChatActionTarget(null)}
        onRevoke={() => {
          if (chatActionTarget) handleDeleteChat(chatActionTarget);
          setChatActionTarget(null);
        }}
      />

      {/* ── 3-dot inline popover ── */}
      <DotMenuPopover
        visible={dotMenuOpen}
        pageX={dotMenuData.pageX}
        pageY={dotMenuData.pageY}
        themeColor={bgColors[0]}
        onClose={() => setDotMenuOpen(false)}
        onRevoke={() => {
          handleDeleteChat(dotMenuData.msg);
          setDotMenuOpen(false);
        }}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerOverlay: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 5,
  },
  liveBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  listenerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  listenerText: { color: '#FFFFFF', fontSize: 12 },
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
  },

  // Page indicators
  pageIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  pageIndicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  pageIndicatorActive: {
    backgroundColor: '#A78BFA',
    width: 32,
  },

  // Loading / Error
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingCard: {
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
  loadingTitle: { marginTop: 12, color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loadingText: { marginTop: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' },
  errorCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    gap: 12,
  },
  errorTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  errorMessage: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backButtonText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  // Title section
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  liveTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: 0.2 },
  hostRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  hostAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(139,92,246,0.6)', marginRight: 7 },
  hostAvatarFallback: { backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', justifyContent: 'center' },
  hostName: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', marginRight: 8 },
  categoryBadge: {
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: { color: '#C4B5FD', fontSize: 10, fontWeight: '700' },

  // Current track
  currentTrackCard: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currentTrackBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  currentTrackBadgeText: { color: '#C4B5FD', fontSize: 11, fontWeight: '700' },
  currentTrackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  currentTrackArt: { width: 52, height: 52, borderRadius: 8 },
  currentTrackArtFallback: { backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  currentTrackInfo: { flex: 1, minWidth: 0 },
  currentTrackTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  currentTrackArtist: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  currentTrackMetaRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  currentTrackMetaText: { color: '#A78BFA', fontSize: 11, flexShrink: 1 },

  noLiveCard: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noLiveText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },

  // Floating lyrics
  floatingLyricsBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(167,139,250,0.2)',
    paddingTop: 8,
    gap: 2,
  },
  lyricLineDim: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  lyricLineCurrent: {
    fontSize: 13.5,
    color: '#C4B5FD',
    fontWeight: '700',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Swipe hint
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 6,
  },
  swipeHintText: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },

  // Chat container
  chatContainer: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 60, // space for bottom bar
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  chatHeaderText: { color: '#A78BFA', fontSize: 12, fontWeight: '700' },
  chatScrollView: { flex: 1 },
  chatScrollContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatAvatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  chatBubbleBase: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    maxWidth: '74%',
    flexShrink: 1,
  },
  chatBubble: { backgroundColor: 'rgba(255,255,255,0.06)' },
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
  chatAuthorText: { fontSize: 11, fontWeight: '700', color: '#A78BFA', marginBottom: 2 },
  chatAuthorHost: { color: '#55C5F1' },
  chatRequestRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  chatRequestText: { fontSize: 10, color: '#FFFFFF', fontWeight: '600' },
  chatMessageText: { fontSize: 13, color: '#FFFFFF', lineHeight: 18 },
  chatTimestamp: { fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3, alignSelf: 'flex-end' },
  // 3-dot menu button beside chat bubble
  chatMenuDotBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 2,
  },
  // Chat action bottom-sheet modal
  chatActionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  chatActionSheet: {
    backgroundColor: '#1E1B2E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    borderBottomWidth: 0,
  },
  chatActionHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  chatActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 16,
  },
  chatActionAuthor: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  chatActionPreview: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  chatActionRevokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 14,
    marginBottom: 10,
  },
  chatActionRevokeBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  chatActionCancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
  },
  chatActionCancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  // Small inline dot-menu popover (3-dot button)
  dotPopover: {
    position: 'absolute',
    backgroundColor: '#252235',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  dotPopoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  dotPopoverItemText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom bar
  bottomStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -15,
    zIndex: 30,
  },
  bottomBar: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  bottomBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bottomAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1a9fd4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bottomAvatar: { width: '100%', height: '100%' },
  bottomAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 4,
    gap: 6,
  },
  input: { flex: 1, color: '#000', fontSize: 14, minHeight: 36 },
  sendButtonOutside: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  sendButtonDisabled: { opacity: 0.3 },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Reactions
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
  },
  reactionButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  reactionCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sidebar
  modalBackdrop: {
    marginTop: 45,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sidebarPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#131725',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(139,92,246,0.15)',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sidebarTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  sidebarCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarContent: { paddingHorizontal: 18, paddingVertical: 14 },
  sidebarSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  sidebarSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 11,
    borderRadius: 12,
    marginBottom: 7,
  },
  sidebarSongRowActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: 'rgba(139,92,246,0.3)',
  },
  sidebarSongIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sidebarSongIconActive: { backgroundColor: '#8B5CF6' },
  sidebarSongContent: { flex: 1, minWidth: 0 },
  sidebarSongTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  sidebarSongArtist: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  sidebarSongDuration: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },

  // Modal (request)
  modalCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1F35',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    maxHeight: SCREEN_H * 0.75,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  requestMessageWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    marginBottom: 14,
  },
  requestMessageInput: { fontSize: 13, color: '#FFFFFF', minHeight: 40, textAlignVertical: 'top' },
  requestMessageCount: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'right', marginTop: 4 },
  requestListContainer: { maxHeight: 320 },
  requestList: { maxHeight: 320 },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  requestItemMeta: { flex: 1, minWidth: 0 },
  requestItemTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  requestItemArtist: { marginTop: 2, color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  requestItemButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
  },
  requestItemButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
  requestItemButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  requestEmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 10 },
  requestEmptyText: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },

  // Lyric page
  lyricPageWrapper: { flex: 1, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 20 },
  lyricScreenContainer: { flex: 1 },
  lyricScreenEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  lyricScreenEmptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  lyricTrackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    marginBottom: 12,
  },
  lyricAlbumArt: { width: 60, height: 60, borderRadius: 10 },
  lyricAlbumArtFallback: { backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  lyricTrackText: { flex: 1, minWidth: 0 },
  lyricTrackTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  lyricTrackArtist: { color: '#A78BFA', fontSize: 13, fontWeight: '600', marginTop: 2 },
  lyricTrackAlbum: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 },
  lyricProgressWrap: { marginBottom: 14 },
  lyricProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  lyricProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#8B5CF6',
  },
  lyricProgressTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  lyricProgressTime: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  lyricScrollView: { flex: 1 },
  lyricScrollContent: { paddingBottom: 30, paddingTop: 10, gap: 10, alignItems: 'center' },
  lyricLine: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  lyricLineNear: { color: 'rgba(255,255,255,0.65)', fontSize: 15.5 },
  lyricLineActive: {
    color: '#C4B5FD',
    fontSize: 17,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  lyricEmptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    opacity: 0.6,
  },
  lyricEmptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});
