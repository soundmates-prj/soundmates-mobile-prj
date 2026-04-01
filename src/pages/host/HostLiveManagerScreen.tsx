import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { livestreamService, type LiveSessionResult } from '../../api/livestreamService';
import { showToast } from '../../components/ui/Toast';

const { width } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────

interface CreateSessionForm {
  sessionName: string;
  description: string;
  genre: string;
  thumbnailUrl: string;
}

type SessionFilter = 'all' | 'live' | 'ended';

// ─── Helpers ─────────────────────────────────────────────────────

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0 phút';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
};

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case 'live':
      return { color: '#EF4444', bg: '#EF444420', label: 'Đang live', icon: 'radio' };
    case 'ended':
      return { color: '#6B7280', bg: '#6B728020', label: 'Đã kết thúc', icon: 'stop-circle' };
    case 'scheduled':
      return { color: '#F59E0B', bg: '#F59E0B20', label: 'Đã lên lịch', icon: 'time' };
    default:
      return { color: '#55C5F1', bg: '#55C5F120', label: status, icon: 'help-circle' };
  }
};

// ─── Sub-Components ───────────────────────────────────────────────

function EmptyState({ title, sub, icon = 'radio' }: { title: string; sub: string; icon?: string }) {
  return (
    <View style={emptyStyles.container}>
      <Ionicons name={icon as any} size={56} color="rgba(255,255,255,0.15)" />
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.sub}>{sub}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  title: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    textAlign: 'center',
  },
});

function SessionCard({
  session,
  onStart,
  onStop,
  onBroadcast,
  onDelete,
}: {
  session: LiveSessionResult;
  onStart: () => void;
  onStop: () => void;
  onBroadcast: () => void;
  onDelete: () => void;
}) {
  const status = getStatusConfig(session.status);
  const isLive = session.status?.toLowerCase() === 'live';

  return (
    <Animated.View entering={FadeInDown} style={styles.sessionCard}>
      {/* Header row */}
      <View style={styles.sessionCardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon as any} size={12} color={status.color} />
          <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreAction}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert('Tùy chọn', session.sessionName, [
              { text: 'Xóa', style: 'destructive', onPress: onDelete },
              { text: 'Hủy', style: 'cancel' },
            ]);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>

      {/* Session info */}
      <View style={styles.sessionInfo}>
        {session.thumbnailUrl ? (
          <Image source={{ uri: session.thumbnailUrl }} style={styles.sessionThumb} />
        ) : (
          <View style={[styles.sessionThumb, styles.sessionThumbPlaceholder]}>
            <Ionicons name="radio" size={24} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {session.sessionName}
          </Text>
          {session.stationName && (
            <Text style={styles.sessionStation} numberOfLines={1}>
              {session.stationName}
            </Text>
          )}
          {session.genre && (
            <View style={styles.genreBadge}>
              <Text style={styles.genreText}>{session.genre}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.sessionStats}>
        <View style={styles.sessionStatItem}>
          <Ionicons name="people" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={styles.sessionStatValue}>{session.listenersCount ?? 0}</Text>
          <Text style={styles.sessionStatLabel}>người</Text>
        </View>
        <View style={styles.sessionStatDivider} />
        <View style={styles.sessionStatItem}>
          <Ionicons name="time" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={styles.sessionStatValue}>{formatDuration(session.totalDuration)}</Text>
          <Text style={styles.sessionStatLabel}>phát</Text>
        </View>
        <View style={styles.sessionStatDivider} />
        <View style={styles.sessionStatItem}>
          <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={styles.sessionStatValue}>{formatDate(session.createdAt)}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.sessionActions}>
        {!isLive ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnStart]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onStart();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Bắt đầu</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnStop]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              Alert.alert('Kết thúc Live', 'Bạn có chắc muốn kết thúc phiên này?', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Kết thúc', style: 'destructive', onPress: onStop },
              ]);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="stop" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Kết thúc</Text>
          </TouchableOpacity>
        )}

        {isLive && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnBroadcast]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onBroadcast();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="radio" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Điều khiển</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

function CreateSessionModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState<CreateSessionForm>({
    sessionName: '',
    description: '',
    genre: '',
    thumbnailUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleCreate = async () => {
    if (!form.sessionName.trim()) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập tên phiên live');
      return;
    }

    setIsLoading(true);
    try {
      const session = await livestreamService.createLiveSession({
        sessionName: form.sessionName.trim(),
        description: form.description.trim() || undefined,
        genre: form.genre.trim() || undefined,
        thumbnailUrl: form.thumbnailUrl.trim() || undefined,
      });
      showToast.success('Tạo thành công!', 'Phiên live đã được tạo');
      onCreated(session.id);
      onClose();
      setForm({ sessionName: '', description: '', genre: '', thumbnailUrl: '' });
      setStep(1);
    } catch (error) {
      console.log('[CreateSession] error', error);
      showToast.error('Lỗi', 'Không thể tạo phiên live. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const genreOptions = ['Bolero', 'Nhạc Trẻ', 'Rap/VHipHop', 'US-UK', 'KPop', 'Cổ Nhạc', 'Indie', 'Podcast'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <Pressable style={modalStyles.backdropTouchable} onPress={onClose} />
        <Animated.View entering={FadeIn} style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Tạo Phiên Live Mới</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <View style={modalStyles.steps}>
            {[1, 2].map((s) => (
              <View key={s} style={[modalStyles.step, step >= s && modalStyles.stepActive]}>
                <Text style={[modalStyles.stepText, step >= s && modalStyles.stepTextActive]}>
                  {s === 1 ? 'Thông tin' : 'Hoàn tất'}
                </Text>
              </View>
            ))}
          </View>

          {step === 1 && (
            <ScrollView showsVerticalScrollIndicator={false} style={modalStyles.body}>
              <Text style={modalStyles.label}>Tên phiên live *</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="VD: Đêm nhạc bolero học"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={form.sessionName}
                onChangeText={(text) => setForm((f) => ({ ...f, sessionName: text }))}
                maxLength={80}
              />

              <Text style={modalStyles.label}>Mô tả</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textarea]}
                placeholder="Chia sẻ về phiên live của bạn..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={form.description}
                onChangeText={(text) => setForm((f) => ({ ...f, description: text }))}
                multiline
                numberOfLines={3}
                maxLength={300}
              />

              <Text style={modalStyles.label}>Thể loại</Text>
              <View style={modalStyles.genreGrid}>
                {genreOptions.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[modalStyles.genreChip, form.genre === g && modalStyles.genreChipActive]}
                    onPress={() => setForm((f) => ({ ...f, genre: f.genre === g ? '' : g }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[modalStyles.genreChipText, form.genre === g && modalStyles.genreChipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={modalStyles.nextBtn}
                onPress={() => {
                  if (!form.sessionName.trim()) {
                    showToast.error('Thiếu thông tin', 'Vui lòng nhập tên phiên live');
                    return;
                  }
                  setStep(2);
                }}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.nextBtnText}>Tiếp tục</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </ScrollView>
          )}

          {step === 2 && (
            <View style={modalStyles.body}>
              <View style={modalStyles.previewCard}>
                <View style={modalStyles.previewIcon}>
                  <Ionicons name="radio" size={36} color="#55C5F1" />
                </View>
                <Text style={modalStyles.previewName}>{form.sessionName}</Text>
                {form.description ? (
                  <Text style={modalStyles.previewDesc} numberOfLines={2}>
                    {form.description}
                  </Text>
                ) : null}
                {form.genre && (
                  <View style={modalStyles.previewGenreBadge}>
                    <Text style={modalStyles.previewGenreText}>{form.genre}</Text>
                  </View>
                )}
              </View>

              <Text style={modalStyles.confirmText}>
                Sẵn sàng tạo phiên live? Bạn có thể bắt đầu phát sóng sau khi tạo.
              </Text>

              <View style={modalStyles.btnRow}>
                <TouchableOpacity
                  style={modalStyles.backStepBtn}
                  onPress={() => setStep(1)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                  <Text style={modalStyles.backStepText}>Quay lại</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.nextBtn, modalStyles.createBtn]}
                  onPress={handleCreate}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={modalStyles.nextBtnText}>Tạo ngay</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  steps: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  step: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#55C5F1',
  },
  stepText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  body: {
    paddingHorizontal: 24,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textarea: {
    height: 90,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genreChipActive: {
    backgroundColor: '#55C5F1',
    borderColor: '#55C5F1',
  },
  genreChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  genreChipTextActive: {
    color: '#FFFFFF',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#55C5F1',
    borderRadius: 16,
    height: 52,
    marginTop: 24,
  },
  createBtn: {
    flex: 1,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(85,197,241,0.2)',
    marginBottom: 20,
  },
  previewIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(85,197,241,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  previewGenreBadge: {
    backgroundColor: 'rgba(85,197,241,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewGenreText: {
    color: '#55C5F1',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backStepText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────

export default function HostLiveManagerScreen({
  onBack,
  onNavigateToBroadcast,
}: {
  onBack: () => void;
  onNavigateToBroadcast: (sessionId: string) => void;
}) {
  const [sessions, setSessions] = useState<LiveSessionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<SessionFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const result = await livestreamService.getMyHostedSessions({ pageSize: 50 });
      setSessions(result.items || []);
    } catch (error) {
      console.log('[HostManager] Failed to fetch sessions', error);
      showToast.error('Lỗi', 'Không thể tải danh sách phiên live');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'all') return true;
    return s.status?.toLowerCase() === filter;
  });

  const liveCount = sessions.filter((s) => s.status?.toLowerCase() === 'live').length;

  const handleStart = async (session: LiveSessionResult) => {
    try {
      const updated = await livestreamService.startLiveSession(session.id);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
      showToast.success('Đã bắt đầu!', 'Live stream đã được bật');
    } catch (error) {
      console.log('[HostManager] start error', error);
      showToast.error('Lỗi', 'Không thể bắt đầu phiên live');
    }
  };

  const handleStop = async (session: LiveSessionResult) => {
    try {
      const updated = await livestreamService.stopLiveSession(session.id);
      setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
      showToast.info('Đã kết thúc', 'Live stream đã dừng');
    } catch (error) {
      console.log('[HostManager] stop error', error);
      showToast.error('Lỗi', 'Không thể kết thúc phiên live');
    }
  };

  const handleDelete = (session: LiveSessionResult) => {
    Alert.alert('Xóa phiên', `Xóa "${session.sessionName}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setSessions((prev) => prev.filter((s) => s.id !== session.id));
          showToast.info('Đã xóa', 'Phiên live đã được xóa');
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F0F23', '#1A1A2E', '#16213E']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quản lý Live</Text>
        </View>
        <TouchableOpacity
          style={styles.createHeaderBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <Animated.View entering={FadeInDown.delay(0)} style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryCardLive]}>
          <LinearGradient colors={['#EF4444', '#F97316']} style={styles.summaryCardGradient}>
            <View style={styles.summaryCardInner}>
              <Ionicons name="radio" size={22} color="#FFFFFF" />
              <Text style={styles.summaryNumber}>{liveCount}</Text>
              <Text style={styles.summaryLabel}>Đang live</Text>
            </View>
          </LinearGradient>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardTotal]}>
          <LinearGradient colors={['#55C5F1', '#2DD4BF']} style={styles.summaryCardGradient}>
            <View style={styles.summaryCardInner}>
              <Ionicons name="layers" size={22} color="#FFFFFF" />
              <Text style={styles.summaryNumber}>{sessions.length}</Text>
              <Text style={styles.summaryLabel}>Tổng phiên</Text>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Filter tabs */}
      <View style={styles.filterBar}>
        {(['all', 'live', 'ended'] as SessionFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Tất cả' : f === 'live' ? 'Đang Live' : 'Đã kết thúc'}
            </Text>
            {filter === f && <View style={styles.filterIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Session List */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#55C5F1" />
          <Text style={styles.loadingText}>Đang tải phiên live...</Text>
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={styles.listContainer}>
          <EmptyState
            title={filter === 'all' ? 'Chưa có phiên live nào' : filter === 'live' ? 'Không có phiên đang live' : 'Chưa có phiên đã kết thúc'}
            sub="Tạo phiên live mới để bắt đầu phát sóng"
            icon="radio-outline"
          />
          <TouchableOpacity
            style={styles.emptyCreateBtn}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={20} color="#55C5F1" />
            <Text style={styles.emptyCreateBtnText}>Tạo phiên live mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredSessions.map((session, idx) => (
            <Animated.View key={session.id} entering={FadeInUp.delay(idx * 60)}>
              <SessionCard
                session={session}
                onStart={() => handleStart(session)}
                onStop={() => handleStop(session)}
                onBroadcast={() => onNavigateToBroadcast(session.id)}
                onDelete={() => handleDelete(session)}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* FAB - Create new session */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.85}
      >
        <LinearGradient colors={['#55C5F1', '#2DD4BF']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Session Modal */}
      <CreateSessionModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(id) => {
          fetchSessions();
          onNavigateToBroadcast(id);
        }}
      />
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
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  createHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(85,197,241,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    height: 90,
  },
  summaryCardGradient: {
    flex: 1,
  },
  summaryCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  summaryNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(85,197,241,0.15)',
  },
  filterText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#55C5F1',
  },
  filterIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: '#55C5F1',
    borderRadius: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sessionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  moreAction: {
    padding: 4,
  },
  sessionInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  sessionThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  sessionThumbPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionMeta: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  sessionName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sessionStation: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  genreBadge: {
    backgroundColor: 'rgba(85,197,241,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  genreText: {
    color: '#55C5F1',
    fontSize: 10,
    fontWeight: '700',
  },
  sessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  sessionStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sessionStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sessionStatValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionStatLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
  },
  actionBtnStart: {
    backgroundColor: '#10B981',
  },
  actionBtnStop: {
    backgroundColor: '#EF4444',
  },
  actionBtnBroadcast: {
    backgroundColor: '#55C5F1',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#55C5F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyCreateBtnText: {
    color: '#55C5F1',
    fontSize: 14,
    fontWeight: '700',
  },
});
