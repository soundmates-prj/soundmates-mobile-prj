import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { LiveScheduleResult, LiveSessionResult, livestreamService } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import BottomNavigation, { TabName } from '../BottomNavigation';

interface LiveSessionsScreenProps {
  onBack: () => void;
  onSelectSession: (sessionId: string) => void;
  onTabPress: (tab: TabName) => void;
}

interface DayScheduleItem extends LiveScheduleResult {
  occurrenceAt: Date;
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_CHIP_WIDTH = 72;
const DAY_CHIP_GAP = 8;

const formatStartedAt = (iso?: string | null): string => {
  if (!iso) return 'Đang phát trực tiếp';

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Đang phát trực tiếp';

  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');
  return `Bắt đầu lúc ${hours}:${minutes}`;
};

const formatClock = (rawTime?: string | null): string => {
  if (!rawTime) return '--:--';
  const [hour = '00', minute = '00'] = rawTime.split(':');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

const parseTimeParts = (rawTime?: string | null): { hour: number; minute: number } => {
  if (!rawTime) return { hour: 0, minute: 0 };
  const [hourText = '0', minuteText = '0'] = rawTime.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  return {
    hour: Number.isNaN(hour) ? 0 : hour,
    minute: Number.isNaN(minute) ? 0 : minute,
  };
};

const parseDateOnly = (rawDate?: string | null): Date | null => {
  if (!rawDate) return null;
  const parsed = new Date(`${rawDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isDateAllowedByMask = (date: Date, mask?: number): boolean => {
  if (!mask || mask <= 0) return true;
  const flag = 1 << date.getDay();
  return (mask & flag) !== 0;
};

const isSameDate = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDateShort = (date: Date): string =>
  `${`${date.getDate()}`.padStart(2, '0')}/${`${date.getMonth() + 1}`.padStart(2, '0')}`;

const toDateKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const formatDateLong = (date: Date): string =>
  date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });

const formatDateWithTime = (date: Date): string =>
  date.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const getOccurrenceOnDate = (schedule: LiveScheduleResult, targetDate: Date): Date | null => {
  const startBoundary = parseDateOnly(schedule.startDate);
  if (!startBoundary) return null;

  const endBoundary = parseDateOnly(schedule.endDate);
  if (endBoundary) {
    endBoundary.setHours(23, 59, 59, 999);
  }

  const normalizedTarget = new Date(targetDate);
  normalizedTarget.setHours(0, 0, 0, 0);

  if (normalizedTarget < startBoundary) {
    return null;
  }

  if (endBoundary && normalizedTarget > endBoundary) {
    return null;
  }

  const { hour, minute } = parseTimeParts(schedule.startTime);

  if (!schedule.isRecurring) {
    if (!isSameDate(normalizedTarget, startBoundary)) {
      return null;
    }

    const oneTime = new Date(normalizedTarget);
    oneTime.setHours(hour, minute, 0, 0);
    return oneTime;
  }

  if (!isDateAllowedByMask(normalizedTarget, schedule.daysOfWeek)) {
    return null;
  }

  const recurringDate = new Date(normalizedTarget);
  recurringDate.setHours(hour, minute, 0, 0);
  return recurringDate;
};

const getNextOccurrenceAt = (schedule: LiveScheduleResult, now: Date): Date | null => {
  const startBoundary = parseDateOnly(schedule.startDate);
  if (!startBoundary) return null;

  const endBoundary = parseDateOnly(schedule.endDate);
  if (endBoundary) {
    endBoundary.setHours(23, 59, 59, 999);
  }

  const { hour, minute } = parseTimeParts(schedule.startTime);

  if (!schedule.isRecurring) {
    const oneTime = new Date(startBoundary);
    oneTime.setHours(hour, minute, 0, 0);
    return oneTime;
  }

  for (let offset = 0; offset <= 60; offset += 1) {
    const candidateDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    candidateDate.setHours(0, 0, 0, 0);

    if (candidateDate < startBoundary) {
      continue;
    }

    if (endBoundary && candidateDate > endBoundary) {
      continue;
    }

    if (!isDateAllowedByMask(candidateDate, schedule.daysOfWeek)) {
      continue;
    }

    const candidateDateTime = new Date(candidateDate);
    candidateDateTime.setHours(hour, minute, 0, 0);

    if (candidateDateTime >= now) {
      return candidateDateTime;
    }
  }

  return null;
};

const formatTimeUntil = (date: Date): string => {
  const diffMs = date.getTime() - Date.now();

  if (diffMs <= -1000 * 60) {
    return `Đã bắt đầu lúc ${formatClock(`${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`)}`;
  }

  if (diffMs <= 0) return 'Sắp bắt đầu';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  if (totalMinutes < 60) {
    return `Trong ${Math.max(totalMinutes, 1)} phút`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) {
    return minutes > 0 ? `Trong ${totalHours} giờ ${minutes} phút` : `Trong ${totalHours} giờ`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `Trong ${days} ngày ${hours} giờ` : `Trong ${days} ngày`;
};

const getRecurringSummary = (schedule: LiveScheduleResult): string => {
  if (!schedule.isRecurring) return 'Phát 1 lần theo lịch';

  const mask = schedule.daysOfWeek || 0;
  if (mask === 127) return 'Lặp lại mỗi ngày';

  const days = DAY_LABELS.filter((_, index) => (mask & (1 << index)) !== 0);
  if (days.length === 0) return 'Lặp lại theo lịch định kỳ';

  return `Lặp lại: ${days.join(', ')}`;
};

export default function LiveSessionsScreen({ onBack, onSelectSession, onTabPress }: LiveSessionsScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const weekScrollRef = useRef<ScrollView | null>(null);

  const [activeSessions, setActiveSessions] = useState<LiveSessionResult[]>([]);
  const [scheduledSessions, setScheduledSessions] = useState<LiveScheduleResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const initial = new Date();
    initial.setHours(0, 0, 0, 0);
    return initial;
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() + index);

      return {
        weekDayIndex: date.getDay(),
        date,
        shortDate: formatDateShort(date),
      };
    });
  }, [todayDate]);

  const scrollToDateChip = useCallback((date: Date, animated: boolean) => {
    const chipIndex = weekDays.findIndex((item) => isSameDate(item.date, date));
    if (chipIndex < 0) return;

    const offsetX = Math.max(0, chipIndex * (DAY_CHIP_WIDTH + DAY_CHIP_GAP) - 12);
    weekScrollRef.current?.scrollTo({ x: offsetX, y: 0, animated });
  }, [weekDays]);

  const fetchLiveData = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [activeResult, schedulesResult] = await Promise.allSettled([
        livestreamService.getActiveSessions(),
        livestreamService.getSchedules(),
      ]);

      if (activeResult.status === 'fulfilled') {
        const sortedActive = [...(activeResult.value || [])].sort((a, b) => {
          const timeA = new Date(a.startedAt || a.createdAt).getTime();
          const timeB = new Date(b.startedAt || b.createdAt).getTime();
          return timeB - timeA;
        });
        setActiveSessions(sortedActive);
      } else {
        setActiveSessions([]);
      }

      if (schedulesResult.status === 'fulfilled') {
        const scheduled = (schedulesResult.value || [])
          .filter((schedule) => {
            const normalizedStatus = (schedule.liveSession?.status || schedule.status || '').toLowerCase();
            return normalizedStatus === 'scheduled' || normalizedStatus === 'live';
          })
          .sort((a, b) => {
            const nextA = getNextOccurrenceAt(a, new Date())?.getTime() || Number.MAX_SAFE_INTEGER;
            const nextB = getNextOccurrenceAt(b, new Date())?.getTime() || Number.MAX_SAFE_INTEGER;
            return nextA - nextB;
          });

        setScheduledSessions(scheduled);
      } else {
        setScheduledSessions([]);
      }
    } catch (error) {
      console.log('[LiveSessionsScreen] fetchLiveData error:', error);
      setActiveSessions([]);
      setScheduledSessions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveData();
  }, [fetchLiveData]);

  useEffect(() => {
    scrollToDateChip(todayDate, false);
  }, [scrollToDateChip, todayDate]);

  useEffect(() => {
    scrollToDateChip(selectedDate, true);
  }, [scrollToDateChip, selectedDate]);

  const activeTitle = useMemo(() => `Đang live (${activeSessions.length})`, [activeSessions.length]);

  const dayCounts = useMemo(() => {
    const result: Record<string, number> = {};

    weekDays.forEach(({ date }) => {
      const key = toDateKey(date);
      const count = scheduledSessions.reduce((acc, schedule) => {
        const matched = getOccurrenceOnDate(schedule, date);
        return matched ? acc + 1 : acc;
      }, 0);

      result[key] = count;
    });

    return result;
  }, [scheduledSessions, weekDays]);

  const selectedDaySchedules = useMemo(() => {
    const mapped = scheduledSessions
      .map((schedule) => {
        const occurrenceAt = getOccurrenceOnDate(schedule, selectedDate);
        if (!occurrenceAt) return null;
        return { ...schedule, occurrenceAt };
      })
      .filter((schedule): schedule is DayScheduleItem => Boolean(schedule))
      .sort((a, b) => a.occurrenceAt.getTime() - b.occurrenceAt.getTime());

    return mapped;
  }, [scheduledSessions, selectedDate]);

  const upcomingTitle = useMemo(
    () => `Lịch ${formatDateLong(selectedDate)} (${selectedDaySchedules.length})`,
    [selectedDate, selectedDaySchedules.length],
  );

  const handleBottomTabPress = useCallback((tab: TabName) => {
    if (tab === 'live') return;
    onTabPress(tab);
  }, [onTabPress]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <View style={[styles.header, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}> 
        <TouchableOpacity style={styles.headerButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Phiên Live</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => void fetchLiveData(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color={palette.textPrimary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải dữ liệu phiên live...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void fetchLiveData(true)}
              colors={[palette.primary]}
              tintColor={palette.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          
          <View style={styles.sectionHeader}>
            <Ionicons name="radio" size={16} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{activeTitle}</Text>
          </View>

          {activeSessions.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              <Ionicons name="radio-outline" size={26} color={palette.textMuted} />
              <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Hiện chưa có phiên live active</Text>
              <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>Danh sách sẽ tự cập nhật khi có host bắt đầu live.</Text>
            </View>
          ) : (
            activeSessions.map((session) => {
              const listeners = session.listenersCount || session.totalListeners || 0;
              return (
                <TouchableOpacity
                  key={session.id}
                  activeOpacity={0.9}
                  style={[styles.sessionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={() => onSelectSession(session.id)}
                >
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>

                  <View style={styles.sessionBody}>
                    <View style={[styles.thumbnailWrap, { backgroundColor: palette.primary + '22' }]}>
                      {session.thumbnailUrl ? (
                        <Image source={{ uri: session.thumbnailUrl }} style={styles.thumbnailImage} />
                      ) : (
                        <Ionicons name="radio" size={20} color={palette.primary} />
                      )}
                    </View>

                    <View style={styles.mainContent}>
                      <Text style={[styles.sessionName, { color: palette.textPrimary }]} numberOfLines={1}>
                        {session.sessionName}
                      </Text>
                      <Text style={[styles.sessionHost, { color: palette.textSecondary }]} numberOfLines={1}>
                        {session.stationName || 'Unknown Host'}
                      </Text>
                      <View style={styles.metaRow}>
                        <View style={styles.metaBadge}>
                          <Ionicons name="people" size={11} color={palette.textSecondary} />
                          <Text style={[styles.metaText, { color: palette.textSecondary }]}>{listeners} đang nghe</Text>
                        </View>
                        {!!session.genre && (
                          <View style={[styles.genreBadge, { backgroundColor: palette.primary + '1C' }]}>
                            <Text style={[styles.genreText, { color: palette.primary }]} numberOfLines={1}>{session.genre}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.startedAt, { color: palette.textMuted }]}>{formatStartedAt(session.startedAt)}</Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={[styles.sectionHeader, styles.upcomingSectionHeader]}>
            <Ionicons name="calendar-outline" size={16} color={palette.primary} />
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{upcomingTitle}</Text>
          </View>

          <View style={[styles.weekSelectorWrap, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <ScrollView
              ref={weekScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekSelectorContent}
            >
              {weekDays.map((item) => {
                const isSelected = isSameDate(item.date, selectedDate);
                const isToday = isSameDate(item.date, todayDate);
                const count = dayCounts[toDateKey(item.date)] || 0;

                return (
                  <TouchableOpacity
                    key={toDateKey(item.date)}
                    activeOpacity={0.9}
                    onPress={() => setSelectedDate(item.date)}
                    style={[
                      styles.dayChip,
                      isToday && styles.dayChipToday,
                      {
                        backgroundColor: isSelected
                          ? palette.primary
                          : isToday
                            ? palette.primary + '14'
                            : palette.background,
                        borderColor: isSelected
                          ? palette.primary
                          : isToday
                            ? palette.primary
                            : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipLabel,
                        isToday && !isSelected ? styles.dayChipLabelToday : undefined,
                        { color: isSelected ? '#FFFFFF' : isToday ? palette.primary : palette.textSecondary },
                      ]}
                    >
                      {DAY_LABELS[item.weekDayIndex]}
                    </Text>
                    <Text
                      style={[
                        styles.dayChipDate,
                        { color: isSelected ? '#FFFFFF' : isToday ? palette.primary : palette.textPrimary },
                      ]}
                    >
                      {item.shortDate}
                    </Text>
                    {isToday && (
                      <Text style={[styles.todayBadgeText, { color: isSelected ? '#FFFFFF' : palette.primary }]}>Hôm nay</Text>
                    )}
                    <View
                      style={[
                        styles.dayChipCount,
                        { backgroundColor: isSelected ? '#FFFFFF30' : palette.primary + '20' },
                      ]}
                    >
                      <Text style={[styles.dayChipCountText, { color: isSelected ? '#FFFFFF' : palette.primary }]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {selectedDaySchedules.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              <Ionicons name="time-outline" size={26} color={palette.textMuted} />
              <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Ngày này chưa có lịch live</Text>
              <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>Hãy chọn ngày khác trong tuần để xem thêm phiên đã lên lịch.</Text>
            </View>
          ) : (
            selectedDaySchedules.map((schedule) => {
              const stationName = schedule.liveSession?.station?.stationName || 'Kênh phát chưa cập nhật';
              const title = schedule.title || schedule.liveSession?.sessionName || 'Phiên live sắp diễn ra';
              const status = (schedule.liveSession?.status || schedule.status || '').toLowerCase();
              const isLiveStatus = status === 'live';
              const countdown = isLiveStatus ? 'Đang live' : formatTimeUntil(schedule.occurrenceAt);
              const range = `${formatClock(schedule.startTime)} - ${formatClock(schedule.endTime)}`;
              const startTimeText = formatClock(schedule.startTime);
              const startDateText = formatDateWithTime(schedule.occurrenceAt);

              return (
                <View
                  key={schedule.id}
                  style={[styles.upcomingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <View style={styles.upcomingTopRow}>
                    <View style={[styles.scheduledBadge, isLiveStatus && styles.liveScheduleBadge]}>
                      <Ionicons name={isLiveStatus ? 'radio' : 'time'} size={12} color={isLiveStatus ? '#EF4444' : '#F59E0B'} />
                      <Text style={[styles.scheduledBadgeText, isLiveStatus && styles.liveScheduleBadgeText]}>{isLiveStatus ? 'LIVE' : 'SCHEDULED'}</Text>
                    </View>
                    <Text style={[styles.countdownText, { color: isLiveStatus ? '#EF4444' : palette.primary }]}>{countdown}</Text>
                  </View>

                  <View style={[styles.startTimeHighlight, { borderColor: palette.primary + '55', backgroundColor: palette.primary + '12' }]}> 
                    <Text style={[styles.startTimeCaption, { color: palette.primary }]}>THỜI GIAN BẮT ĐẦU</Text>
                    <Text style={[styles.startTimeValue, { color: palette.textPrimary }]}>{startTimeText}</Text>
                    <Text style={[styles.startTimeDateText, { color: palette.textSecondary }]}>{startDateText}</Text>
                  </View>

                  <Text style={[styles.upcomingTitle, { color: palette.textPrimary }]} numberOfLines={2}>{title}</Text>
                  <Text style={[styles.upcomingHost, { color: palette.textSecondary }]} numberOfLines={1}>{stationName}</Text>

                  <View style={styles.timeInfoWrap}>
                    <View style={styles.timeInfoRow}>
                      <Ionicons name="time-outline" size={14} color={palette.primary} />
                      <Text style={[styles.timeInfoText, { color: palette.textPrimary }]}>Khung giờ: {range}</Text>
                    </View>
                    <View style={styles.timeInfoRow}>
                      <Ionicons name="repeat-outline" size={14} color={palette.primary} />
                      <Text style={[styles.timeInfoText, { color: palette.textPrimary }]}>{getRecurringSummary(schedule)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <BottomNavigation activeTab="live" onTabPress={handleBottomTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
  },
  summaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  upcomingSectionHeader: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EF444420',
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  liveBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sessionBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailWrap: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  mainContent: {
    flex: 1,
    marginHorizontal: 10,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionHost: {
    marginTop: 2,
    fontSize: 12,
  },
  metaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  genreBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 140,
  },
  genreText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  startedAt: {
    marginTop: 6,
    fontSize: 11,
  },
  upcomingCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  weekSelectorWrap: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 12,
  },
  weekSelectorContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  dayChip: {
    width: 72,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayChipToday: {
    borderWidth: 2,
  },
  dayChipLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayChipLabelToday: {
    letterSpacing: 0.3,
  },
  dayChipDate: {
    fontSize: 13,
    fontWeight: '800',
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayChipCount: {
    marginTop: 2,
    borderRadius: 999,
    minWidth: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  dayChipCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduledBadge: {
    borderRadius: 999,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduledBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  liveScheduleBadge: {
    backgroundColor: '#EF444420',
  },
  liveScheduleBadgeText: {
    color: '#EF4444',
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
  },
  startTimeHighlight: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  startTimeCaption: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  startTimeValue: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  startTimeDateText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  upcomingTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  upcomingHost: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  timeInfoWrap: {
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(148,163,184,0.08)',
    gap: 6,
  },
  timeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  timeInfoText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
