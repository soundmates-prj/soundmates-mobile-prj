import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
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
} from 'react-native';

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

const NOW_PLAYING = [
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
                    <Text style={styles.chatRequestText}>Requested "{msg.requestSong}"</Text>
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
                  <Text style={styles.chatRequestText}>Requested "{msg.requestSong}"</Text>
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

function SidebarMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
                {NOW_PLAYING.map((song) => (
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
                    <Ionicons name="volume-high" size={18} color="#6B7280" />
                    <View style={styles.sidebarVolumeTrack}>
                      <View style={styles.sidebarVolumeFill} />
                    </View>
                    <Text style={styles.sidebarVolumeText}>70%</Text>
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

function RequestSongModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [songName, setSongName] = useState('');

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
            value={songName}
            onChangeText={setSongName}
            placeholder="Tên bài hát..."
            placeholderTextColor="#9CA3AF"
            style={styles.modalInput}
          />
          <TouchableOpacity
            style={styles.modalPrimaryButton}
            onPress={() => {
              if (songName.trim()) {
                setSongName('');
                onClose();
              }
            }}
          >
            <Text style={styles.modalPrimaryText}>Gửi Request</Text>
          </TouchableOpacity>
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

export default function LivestreamScreen({ onBack }: { onBack: () => void }) {
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
  const combinedTranslateX = useMemo(
    () => Animated.add(storyTranslateX, dragX),
    [dragX, storyTranslateX]
  );

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
        onPanResponderMove: Animated.event([null, { dx: dragX }], { useNativeDriver: true }),
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
        author: 'You',
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

  const handleReaction = (label: string) => {
    console.log('Reaction:', label);
  };

  return (
    <LinearGradient colors={['#1E293B', '#334155', '#475569']} style={styles.container}>
      {/* <SafeAreaView style={styles.safeArea} edges={['top']}> */}
        <View style={styles.headerOverlay}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerStatusRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
              <View style={styles.listenerBadge}>
                <Ionicons name="people" size={14} color="#FFFFFF" />
                <Text style={styles.listenerText}>{LIVE_SESSION.listeners}</Text>
              </View>
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
          <Text style={styles.liveTitle}>{LIVE_SESSION.title}</Text>
          <View style={styles.hostRow}>
            <Image source={{ uri: LIVE_SESSION.hostAvatar }} style={styles.hostAvatar} />
            <Text style={styles.hostName}>{LIVE_SESSION.host}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{LIVE_SESSION.category}</Text>
            </View>
          </View>
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
              <TextInput
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

      <SidebarMenu isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
      <ReactionPicker isOpen={showReactions} onClose={() => setShowReactions(false)} onSelect={handleReaction} />
      <RequestSongModal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} />
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
