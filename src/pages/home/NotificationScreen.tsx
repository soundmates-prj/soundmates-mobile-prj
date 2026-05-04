import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { NotificationItem, notificationService } from '../../api/notificationService';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationScreenProps {
    onBack: () => void;
}

const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
};

export default function NotificationScreen({ onBack }: NotificationScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const insets = useSafeAreaInsets();

    const fetchNotifications = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const page = await notificationService.getNotifications(1, 40);
            // Sort by newest first
            const sorted = page.items.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setNotifications(sorted);
        } catch (error) {
            console.log('[NotificationScreen] fetch error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarkAsRead = async (id: string, isRead: boolean) => {
        if (isRead) return;

        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );

        try {
            await notificationService.markAsRead(id);
        } catch {
            // Revert changes if needed or ignore on fail
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadCount = notifications.filter(n => !n.isRead).length;
        if (unreadCount === 0 || isMarkingAll) return;

        setIsMarkingAll(true);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

        try {
            await notificationService.markAllAsRead();
            Alert.alert('Thành công', 'Đã đánh dấu tất cả là đã đọc.');
        } catch {
            Alert.alert('Lỗi', 'Không thể đánh dấu đã đọc tất cả.');
        } finally {
            setIsMarkingAll(false);
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <Animated.View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]} entering={FadeInUp} exiting={FadeOutDown}>
            <View style={[styles.header, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}>
                <TouchableOpacity onPress={onBack} style={styles.iconButton} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={24} color={palette.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Thông báo</Text>
                {unreadCount > 0 ? (
                    <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton} activeOpacity={0.8} disabled={isMarkingAll}>
                        {isMarkingAll ? (
                            <ActivityIndicator size="small" color={palette.primary} />
                        ) : (
                            <Ionicons name="checkmark-done-outline" size={24} color={palette.primary} />
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.iconButton} />
                )}
            </View>

            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={palette.primary} />
                    <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải thông báo...</Text>
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="notifications-off-outline" size={64} color={palette.textMuted} />
                    <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Không có thông báo nào.</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => fetchNotifications(true)}
                            tintColor={palette.primary}
                            colors={[palette.primary]}
                        />
                    }
                >
                    {notifications.map((notif) => (
                        <TouchableOpacity
                            key={notif.id}
                            style={[
                                styles.notificationItem,
                                {
                                    backgroundColor: notif.isRead ? palette.surface : isDarkMode ? '#1E293B' : '#EFF6FF',
                                    borderBottomColor: palette.border,
                                },
                            ]}
                            activeOpacity={notif.isRead ? 1 : 0.7}
                            onPress={() => handleMarkAsRead(notif.id, notif.isRead)}
                        >
                            {!notif.isRead && <View style={[styles.unreadDot, { backgroundColor: palette.primary }]} />}
                            <View style={styles.notificationContent}>
                                <Text
                                    style={[
                                        styles.notificationMessage,
                                        { color: palette.textPrimary, fontWeight: notif.isRead ? '400' : '600' },
                                    ]}
                                >
                                    {notif.message}
                                </Text>
                                <Text style={[styles.notificationTime, { color: palette.textSecondary }]}>
                                    {timeAgo(notif.createdAt)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        // paddingTop: 48,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    markAllButton: {
        width: 40,
        height: 40,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 15,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 40,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'flex-start',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationMessage: {
        fontSize: 14,
        lineHeight: 20,
    },
    notificationTime: {
        fontSize: 12,
        marginTop: 6,
    },
});
