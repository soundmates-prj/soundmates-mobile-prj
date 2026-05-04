import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    PanResponder,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import {
    paymentService,
    TransactionResponse,
} from '../../api';
import { useTheme } from '../../context/ThemeContext';

interface TransactionHistoryScreenProps {
    onBack: () => void;
}

const formatDate = (value?: string) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
    return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

const formatStatusLabel = (value?: string) => {
    const normalized = (value || '').trim().toLowerCase();
    if (!normalized) return 'N/A';
    if (normalized === 'active') return 'Đang hoạt động';
    if (normalized === 'expired') return 'Đã hết hạn';
    if (normalized === 'cancelled' || normalized === 'canceled') return 'Đã hủy';
    if (normalized === 'success') return 'Thành công';
    if (normalized === 'pending') return 'Đang xử lý';
    if (normalized === 'failed') return 'Thất bại';
    return value || 'N/A';
};

const getStatusColor = (value?: string) => {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'active' || normalized === 'success') return '#10B981';
    if (normalized === 'pending') return '#F59E0B';
    if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'failed' || normalized === 'expired') return '#EF4444';
    return '#6B7280';
};

export default function TransactionHistoryScreen({ onBack }: TransactionHistoryScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();
    const fallbackTopInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
    const topInset = Math.max(insets.top, fallbackTopInset);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
    const [transactionError, setTransactionError] = useState<string | null>(null);

    const edgeBackPanResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: (event) => event.nativeEvent.pageX <= 24,
                onMoveShouldSetPanResponder: (_, gesture) =>
                    gesture.dx > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
                onPanResponderRelease: (_, gesture) => {
                    if (gesture.dx > 90 && Math.abs(gesture.vx) > 0.15) {
                        onBack();
                    }
                },
            }),
        [onBack],
    );

    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const transactionResult = await paymentService.getMyTransactionHistory({ page: 1, pageSize: 100 });

            if (transactionResult.success) {
                const sortedTransactions = [...(transactionResult.data?.items || [])].sort((a, b) => {
                    const timeA = new Date(a.paymentAt || a.createdAt).getTime();
                    const timeB = new Date(b.paymentAt || b.createdAt).getTime();
                    return timeB - timeA;
                });
                setTransactions(sortedTransactions);
                setTransactionError(null);
            } else {
                setTransactions([]);
                setTransactionError(transactionResult.message || 'Không thể tải lịch sử giao dịch');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadData(false);
    }, [loadData]);

    const renderMetaRow = (label: string, value: string, valueColor?: string) => (
        <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: palette.textMuted }]}>{label}</Text>
            <Text style={[styles.metaValue, { color: valueColor || palette.textPrimary }]}>{value}</Text>
        </View>
    );

    const renderTransactionCard = (tx: TransactionResponse) => {
        // Tùy theo việc tx là mua Podcast, mua gói hay tiền nhận được.
        // Ở API của backend, payout (doanh thu) vẫn là 1 transaction lưu cho người bán với số tiền âm hoặc dương. 
        // Tuỳ theo business logic, ta chỉ hiện amount. 
        const isRevenue = tx.amount > 0; // Giả sử nếu họ là creator và nhận tiền thì nó lưu dương. Nếu họ trả tiền thì cũng dương.
        // Nhưng backend trả về cho người bán thông báo doanh thu, ta cứ show tx ra.
        return (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconWrap, { backgroundColor: '#55C5F11A' }]}>
                        <Ionicons name="receipt-outline" size={18} color="#55C5F1" />
                    </View>
                    <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{tx.paymentProvider || 'Giao dịch'}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[styles.amount, { color: isRevenue ? '#10B981' : palette.textPrimary }]}>
                        {formatCurrency(tx.amount)}
                    </Text>
                </View>

                {renderMetaRow('Mã giao dịch', tx.id || 'N/A')}
                {renderMetaRow('Mã payment', tx.paymentId || 'N/A')}
                {renderMetaRow('Phương thức', tx.paymentMethod || 'N/A')}
                {renderMetaRow('Trạng thái', formatStatusLabel(tx.transactionStatus), getStatusColor(tx.transactionStatus))}
                {renderMetaRow('Ngày thanh toán', formatDate(tx.paymentAt))}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { paddingTop: topInset, backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
            <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Lịch sử giao dịch</Text>
                <TouchableOpacity onPress={() => void loadData(true)} style={styles.headerButton}>
                    <Ionicons name="refresh" size={18} color={palette.textPrimary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#55C5F1" />
                    <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải dữ liệu giao dịch...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
                    showsVerticalScrollIndicator={false}
                >
                    {transactionError && (
                        <View style={[styles.noticeBox, { backgroundColor: isDarkMode ? '#3F1D1D' : '#FEF2F2', borderColor: '#FCA5A5' }]}>
                            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
                            <Text style={[styles.noticeText, { color: '#DC2626' }]}>{transactionError}</Text>
                        </View>
                    )}

                    {!!transactions.length && (
                        <View style={styles.sectionWrap}>
                            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Giao dịch gần đây</Text>
                            {transactions.map((tx) => (
                                <View key={tx.id}>{renderTransactionCard(tx)}</View>
                            ))}
                        </View>
                    )}

                    {!transactions.length && !transactionError && (
                        <View style={[styles.emptyBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                            <Ionicons name="receipt-outline" size={32} color={palette.textMuted} />
                            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Bạn chưa có giao dịch nào.</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            <View style={styles.edgeSwipeBackZone} {...edgeBackPanResponder.panHandlers} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    edgeSwipeBackZone: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 24,
        zIndex: 20,
    },
    header: {
        height: 56,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
    },
    content: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 30,
        gap: 16,
    },
    sectionWrap: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    card: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    amount: {
        fontSize: 16,
        fontWeight: '800',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
    },
    metaLabel: {
        fontSize: 13,
        flex: 1,
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '600',
        flex: 2,
        textAlign: 'right',
    },
    emptyBox: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 40,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    noticeBox: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    noticeText: {
        fontSize: 13,
        flex: 1,
    },
});
