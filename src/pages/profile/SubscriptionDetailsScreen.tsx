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
    SubscriptionResponse,
    TransactionResponse,
} from '../../api';
import { useTheme } from '../../context/ThemeContext';

type TabKey = 'current' | 'history';

interface SubscriptionDetailsScreenProps {
  onBack: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('vi-VN');
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

export default function SubscriptionDetailsScreen({ onBack }: SubscriptionDetailsScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const insets = useSafeAreaInsets();
  const fallbackTopInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const topInset = Math.max(insets.top, fallbackTopInset);

  const [activeTab, setActiveTab] = useState<TabKey>('current');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionResponse | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
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
      const [currentResult, historyResult, transactionResult] = await Promise.all([
        paymentService.getMySubscription(),
        paymentService.getMySubscriptionHistory({ page: 1, pageSize: 20 }),
        paymentService.getMyTransactionHistory({ page: 1, pageSize: 50 }),
      ]);

      const historyItems = historyResult.data?.items || [];

      if (currentResult.success) {
        setCurrentSubscription(currentResult.data || null);
      } else {
        const fallbackCurrent = historyItems.find((item) => (item.status || '').toLowerCase() === 'active') || null;
        setCurrentSubscription(fallbackCurrent);
      }

      if (historyResult.success) {
        setSubscriptionHistory(historyItems);
        setSubscriptionError(null);
      } else {
        setSubscriptionHistory([]);
        setSubscriptionError(historyResult.message || 'Không thể tải lịch sử gói đăng ký');
      }

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

  const latestTransaction = useMemo(() => {
    if (!transactions.length) return null;
    return transactions[0];
  }, [transactions]);

  const renderMetaRow = (label: string, value: string, valueColor?: string) => (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: valueColor || palette.textPrimary }]}>{value}</Text>
    </View>
  );

  const renderSubscriptionCard = (subscription: SubscriptionResponse, showHeader = false) => (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
      {showHeader && <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Thông tin gói</Text>}
      {renderMetaRow('Tên gói', subscription.planName || 'N/A')}
      {renderMetaRow('Trạng thái', formatStatusLabel(subscription.status), getStatusColor(subscription.status))}
      {renderMetaRow('Ngày bắt đầu', formatDate(subscription.startDate))}
      {renderMetaRow('Ngày hết hạn', formatDate(subscription.endDate))}
      {renderMetaRow('Ngày đăng ký', formatDate(subscription.subscribeAt))}
    </View>
  );

  const renderTransactionCard = (tx: TransactionResponse, showHeader = false) => (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
      {showHeader && <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Thông tin giao dịch</Text>}
      {renderMetaRow('Mã giao dịch', tx.id || 'N/A')}
      {renderMetaRow('Mã payment', tx.paymentId || 'N/A')}
      {renderMetaRow('Nhà cung cấp', tx.paymentProvider || 'N/A')}
      {renderMetaRow('Phương thức', tx.paymentMethod || 'N/A')}
      {renderMetaRow('Số tiền', formatCurrency(tx.amount))}
      {renderMetaRow('Trạng thái', formatStatusLabel(tx.transactionStatus), getStatusColor(tx.transactionStatus))}
      {renderMetaRow('Ngày thanh toán', formatDate(tx.paymentAt))}
    </View>
  );

  const renderCurrentTab = () => {
    if (!currentSubscription) {
      return (
        <View style={[styles.emptyBox, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <Ionicons name="card-outline" size={22} color={palette.textMuted} />
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Không có gói đăng ký hiện tại.</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabBody}>
        {renderSubscriptionCard(currentSubscription, true)}

        {latestTransaction ? (
          renderTransactionCard(latestTransaction, true)
        ) : (
          <View style={[styles.emptyBox, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Ionicons name="receipt-outline" size={22} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Không có thông tin giao dịch cho gói hiện tại.</Text>
          </View>
        )}
      </View>
    );
  };

  const renderHistoryTab = () => {
    return (
      <View style={styles.tabBody}>
        {subscriptionError && (
          <View style={[styles.noticeBox, { backgroundColor: isDarkMode ? '#3F1D1D' : '#FEF2F2', borderColor: '#FCA5A5' }]}> 
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={[styles.noticeText, { color: '#DC2626' }]}>{subscriptionError}</Text>
          </View>
        )}

        {!!subscriptionHistory.length && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Lịch sử gói đăng ký</Text>
            {subscriptionHistory.map((item) => (
              <View key={item.id}>{renderSubscriptionCard(item)}</View>
            ))}
          </View>
        )}

        {!subscriptionHistory.length && !subscriptionError && (
          <View style={[styles.emptyBox, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Ionicons name="albums-outline" size={22} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có lịch sử gói đăng ký.</Text>
          </View>
        )}

        {transactionError && (
          <View style={[styles.noticeBox, { backgroundColor: isDarkMode ? '#3F1D1D' : '#FEF2F2', borderColor: '#FCA5A5' }]}> 
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={[styles.noticeText, { color: '#DC2626' }]}>{transactionError}</Text>
          </View>
        )}

        {!!transactions.length && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Lịch sử giao dịch</Text>
            {transactions.map((tx) => (
              <View key={tx.id}>{renderTransactionCard(tx)}</View>
            ))}
          </View>
        )}

        {!transactions.length && !transactionError && (
          <View style={[styles.emptyBox, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <Ionicons name="receipt-outline" size={22} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có lịch sử giao dịch.</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topInset, backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}> 
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Chi tiết gói đăng ký</Text>
        <TouchableOpacity onPress={() => void loadData(true)} style={styles.headerButton}>
          <Ionicons name="refresh" size={18} color={palette.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'current' && { backgroundColor: '#55C5F1' + '1A', borderColor: '#55C5F1' },
          ]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'current' ? '#55C5F1' : palette.textSecondary }]}>Gói hiện tại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'history' && { backgroundColor: '#55C5F1' + '1A', borderColor: '#55C5F1' },
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#55C5F1' : palette.textSecondary }]}>Lịch sử gói</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#55C5F1" />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải dữ liệu đăng ký...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'current' ? renderCurrentTab() : renderHistoryTab()}
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
  tabContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  tabBody: {
    gap: 12,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  metaLabel: {
    fontSize: 12,
    flex: 1,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
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
    fontSize: 12,
    flex: 1,
  },
});
