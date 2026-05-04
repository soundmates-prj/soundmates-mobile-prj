import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    PanResponder,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { podcastService, PodcastResponse, authApiClient } from '../../api';
import { uploadService } from '../../api/uploadService';
import { useTheme } from '../../context/ThemeContext';
import MyPodcastDetailModal from './MyPodcastDetailModal';

interface MyPodcastsScreenProps {
    onBack: () => void;
}

export default function MyPodcastsScreen({ onBack }: MyPodcastsScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();
    const fallbackTopInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
    const topInset = Math.max(insets.top, fallbackTopInset);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [podcasts, setPodcasts] = useState<PodcastResponse[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [price, setPrice] = useState('0');

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
            const data = await podcastService.getMyPodcasts();
            setPodcasts(data);
            setError(null);
        } catch (err: any) {
            setPodcasts([]);
            setError(err.message || 'Không thể tải danh sách podcast');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadData(false);
    }, [loadData]);

    const openCreateModal = async () => {
        try {
            const bankRes = await authApiClient.get('/users/bank-account');
            const bankData = bankRes.data?.data;
            if (!bankData || !bankData.bankId || !bankData.accountNumber || !bankData.accountName) {
                Alert.alert(
                    'Cập nhật thông tin thanh toán',
                    'Bạn cần cập nhật Tài khoản ngân hàng trong mục Hồ sơ để nhận doanh thu Podcast.',
                    [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Cập nhật', onPress: () => onBack() }
                    ]
                );
                return;
            }
        } catch (error) {
            Alert.alert(
                'Cập nhật thông tin thanh toán',
                'Bạn cần cập nhật Tài khoản ngân hàng trong mục Hồ sơ để nhận doanh thu Podcast.',
                [{ text: 'Đóng', style: 'cancel', onPress: () => onBack() }]
            );
            return;
        }

        setTitle('');
        setDescription('');
        setBannerUrl('');
        setIsPaid(false);
        setPrice('0');
        setIsCreateModalVisible(true);
    };

    const handleSave = async () => {
        if (!title || !description || !bannerUrl) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các thông tin: Tiêu đề, Mô tả, Ảnh bìa.');
            return;
        }

        const priceNum = parseInt(price.replace(/,/g, ''), 10);
        if (isPaid && (isNaN(priceNum) || priceNum <= 0)) {
            Alert.alert('Lỗi', 'Giá bán phải lớn hơn 0.');
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await podcastService.createPodcastRequest({
                title,
                description,
                bannerUrl,
                isPaid,
                price: isPaid ? priceNum : 0,
                type: 'Story',
            });

            if (success) {
                Alert.alert('Thành công', 'Đã gửi yêu cầu tạo Podcast mới. Vui lòng chờ admin duyệt.');
                setIsCreateModalVisible(false);
                void loadData(true);
            } else {
                Alert.alert('Lỗi', 'Không thể tạo yêu cầu Podcast.');
            }
        } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Đã xảy ra lỗi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePickBanner = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setIsUploadingBanner(true);
                const uploadResult = await uploadService.uploadImageToCloudinary({
                    uri: result.assets[0].uri,
                    mimeType: result.assets[0].mimeType,
                    fileName: result.assets[0].fileName,
                });

                if (uploadResult.success) {
                    setBannerUrl(uploadResult.data || '');
                } else {
                    Alert.alert('Lỗi', uploadResult.message || 'Không thể tải ảnh lên');
                }
                setIsUploadingBanner(false);
            }
        } catch (err) {
            setIsUploadingBanner(false);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi chọn ảnh');
        }
    };

    const renderPodcastCard = ({ item }: { item: PodcastResponse }) => {
        const statusStr = (item.status || '').toLowerCase();
        const isApproved = statusStr === 'published' || statusStr === 'approved';

        return (
            <TouchableOpacity onPress={() => setSelectedPodcastId(item.id)} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Image source={{ uri: item.banner || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: palette.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.cardDesc, { color: palette.textSecondary }]} numberOfLines={2}>{item.description}</Text>
                    
                    <View style={styles.cardMeta}>
                        <View style={[styles.statusBadge, { backgroundColor: isApproved ? '#10B9811A' : '#F59E0B1A' }]}>
                            <Text style={[styles.statusText, { color: isApproved ? '#10B981' : '#F59E0B' }]}>
                                {isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                            </Text>
                        </View>
                        
                        {item.isPaid ? (
                            <View style={[styles.priceBadge, { backgroundColor: '#8B5CF61A' }]}>
                                <Ionicons name="lock-closed" size={12} color="#8B5CF6" />
                                <Text style={[styles.priceText, { color: '#8B5CF6' }]}>{item.price?.toLocaleString('vi-VN')}đ</Text>
                            </View>
                        ) : (
                            <View style={[styles.priceBadge, { backgroundColor: '#3B82F61A' }]}>
                                <Text style={[styles.priceText, { color: '#3B82F6' }]}>Miễn phí</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { paddingTop: topInset, backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
            <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Quản lý Podcast</Text>
                <TouchableOpacity onPress={openCreateModal} style={styles.headerButton}>
                    <Ionicons name="add" size={22} color={palette.textPrimary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#55C5F1" />
                    <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải Podcast...</Text>
                </View>
            ) : (
                <FlatList
                    data={podcasts}
                    keyExtractor={item => item.id}
                    renderItem={renderPodcastCard}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
                    ListEmptyComponent={
                        <View style={[styles.emptyBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                            <Ionicons name="mic-outline" size={32} color={palette.textMuted} />
                            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Bạn chưa có Podcast nào.</Text>
                            <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#55C5F1' }]} onPress={openCreateModal}>
                                <Text style={styles.createBtnText}>Tạo Podcast ngay</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            <View style={styles.edgeSwipeBackZone} {...edgeBackPanResponder.panHandlers} />

            {/* Modal Tạo/Sửa Podcast */}
            <Modal visible={isCreateModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCreateModalVisible(false)}>
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
                    <View style={[styles.modalHeader, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
                        <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={styles.headerButton}>
                            <Ionicons name="close" size={24} color={palette.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Yêu cầu tạo Podcast</Text>
                        <TouchableOpacity onPress={handleSave} disabled={isSubmitting} style={styles.headerButton}>
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#55C5F1" />
                            ) : (
                                <Text style={[styles.saveText, { color: '#55C5F1' }]}>Lưu</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: palette.textPrimary }]}>Tiêu đề</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Nhập tiêu đề Podcast"
                                placeholderTextColor={palette.textMuted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: palette.textPrimary }]}>Mô tả</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Mô tả nội dung Podcast..."
                                placeholderTextColor={palette.textMuted}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: palette.textPrimary }]}>Ảnh Bìa</Text>
                            <TouchableOpacity style={[styles.uploadButton, { borderColor: palette.border, backgroundColor: palette.surface }]} onPress={handlePickBanner} disabled={isUploadingBanner}>
                                {isUploadingBanner ? (
                                    <ActivityIndicator size="small" color="#55C5F1" />
                                ) : (
                                    <>
                                        <Ionicons name="image-outline" size={24} color={palette.textMuted} />
                                        <Text style={[styles.uploadText, { color: palette.textMuted }]}>Chọn ảnh từ thư viện</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            {!!bannerUrl && (
                                <Image source={{ uri: bannerUrl }} style={styles.previewImage} />
                            )}
                        </View>

                        <View style={[styles.switchGroup, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                            <View style={styles.switchInfo}>
                                <Text style={[styles.switchTitle, { color: palette.textPrimary }]}>Podcast trả phí</Text>
                                <Text style={[styles.switchDesc, { color: palette.textSecondary }]}>Người nghe phải mua để mở khóa</Text>
                            </View>
                            <Switch value={isPaid} onValueChange={setIsPaid} trackColor={{ false: palette.border, true: '#55C5F1' }} />
                        </View>

                        {isPaid && (
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.textPrimary }]}>Giá bán (VND)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
                                    value={price}
                                    onChangeText={setPrice}
                                    placeholder="Ví dụ: 50000"
                                    placeholderTextColor={palette.textMuted}
                                    keyboardType="numeric"
                                />
                                <Text style={[styles.helperText, { color: palette.textSecondary }]}>Lưu ý: Hệ thống sẽ giữ lại 20% phí nền tảng khi có giao dịch.</Text>
                            </View>
                        )}
                        
                        <View style={[styles.warningBox, { backgroundColor: isDarkMode ? '#3F2C1D' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                            <Ionicons name="information-circle" size={20} color="#D97706" />
                            <Text style={[styles.warningText, { color: '#B45309' }]}>
                                Thay đổi thông tin Podcast sẽ được Admin kiểm duyệt trước khi hiển thị cho người dùng.
                            </Text>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Detail & Episodes Modal */}
            <MyPodcastDetailModal
                visible={!!selectedPodcastId}
                podcastId={selectedPodcastId!}
                onClose={() => setSelectedPodcastId(null)}
                onRefreshList={() => loadData(true)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    edgeSwipeBackZone: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, zIndex: 20 },
    header: { height: 56, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText: { fontSize: 13 },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    card: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', borderWidth: 1, height: 110 },
    cardImage: { width: 110, height: '100%' },
    cardContent: { flex: 1, padding: 12, justifyContent: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '600' },
    priceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    priceText: { fontSize: 11, fontWeight: '700' },
    editButton: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    emptyBox: { borderWidth: 1, borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40 },
    emptyText: { fontSize: 14, textAlign: 'center' },
    createBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 10 },
    createBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
    
    // Modal
    modalContainer: { flex: 1 },
    modalHeader: { height: 56, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    saveText: { fontSize: 16, fontWeight: '600' },
    modalBody: { flex: 1 },
    modalContent: { padding: 20, gap: 20, paddingBottom: 60 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600' },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
    textArea: { height: 100, paddingTop: 12 },
    previewImage: { width: '100%', height: 160, borderRadius: 12, marginTop: 8, backgroundColor: '#E5E7EB' },
    switchGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderRadius: 16 },
    switchInfo: { flex: 1, marginRight: 16 },
    switchTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
    switchDesc: { fontSize: 13 },
    helperText: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 8 },
    warningText: { flex: 1, fontSize: 13, lineHeight: 20 },
    uploadButton: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, height: 80, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row' },
    uploadText: { fontSize: 14 },
});
