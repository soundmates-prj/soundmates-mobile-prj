import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { podcastService, PodcastResponse, PodcastEpisode } from '../../api';
import { uploadService } from '../../api/uploadService';
import { useTheme } from '../../context/ThemeContext';

interface Props {
    visible: boolean;
    podcastId: string;
    onClose: () => void;
    onRefreshList: () => void;
}

export default function MyPodcastDetailModal({ visible, podcastId, onClose, onRefreshList }: Props) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

    const [loading, setLoading] = useState(true);
    const [podcast, setPodcast] = useState<PodcastResponse | null>(null);

    // Episode form
    const [isCreateEpisodeVisible, setIsCreateEpisodeVisible] = useState(false);
    const [epTitle, setEpTitle] = useState('');
    const [epDesc, setEpDesc] = useState('');
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [audioFileName, setAudioFileName] = useState('');
    const [audioMimeType, setAudioMimeType] = useState('audio/mpeg');
    const [isSubmittingEp, setIsSubmittingEp] = useState(false);
    const [uploadingAudio, setUploadingAudio] = useState(false);

    const loadDetail = useCallback(async () => {
        setLoading(true);
        try {
            const data = await podcastService.getById(podcastId);
            setPodcast(data);
        } catch (err) {
            Alert.alert('Lỗi', 'Không thể tải chi tiết podcast.');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [podcastId, onClose]);

    useEffect(() => {
        if (visible && podcastId) {
            loadDetail();
        }
    }, [visible, podcastId, loadDetail]);

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handlePickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                if (file.size && file.size > 100 * 1024 * 1024) {
                    Alert.alert('Lỗi', 'File âm thanh quá lớn (tối đa 100MB).');
                    return;
                }
                setAudioUri(file.uri);
                setAudioFileName(file.name);
                setAudioMimeType(file.mimeType || 'audio/mpeg');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi chọn file âm thanh.');
        }
    };

    const handleSubmitEpisode = async () => {
        if (!epTitle.trim() || !audioUri) {
            Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề và chọn file âm thanh.');
            return;
        }

        setIsSubmittingEp(true);
        setUploadingAudio(true);

        try {
            // Upload audio to Cloudinary
            const uploadRes = await uploadService.uploadAudioToCloudinary({
                uri: audioUri,
                fileName: audioFileName,
                mimeType: audioMimeType,
            });

            setUploadingAudio(false);

            if (!uploadRes.success) {
                throw new Error(uploadRes.message || 'Lỗi khi tải file âm thanh lên.');
            }

            const secureAudioUrl = uploadRes.data || '';

            // Mock duration to 120s if not available from picker
            const duration = 120; 

            const success = await podcastService.createPodcastEpisodeRequest({
                podcastId,
                title: epTitle.trim(),
                description: epDesc.trim(),
                audioUrl: secureAudioUrl,
                duration,
            });

            if (success) {
                Alert.alert('Thành công', 'Đã gửi yêu cầu thêm tập mới. Vui lòng chờ admin duyệt.');
                setIsCreateEpisodeVisible(false);
                setEpTitle('');
                setEpDesc('');
                setAudioUri(null);
                setAudioFileName('');
                // Refresh list
                loadDetail();
                onRefreshList();
            } else {
                throw new Error('Lỗi khi gửi yêu cầu thêm tập mới.');
            }
        } catch (error: any) {
            setUploadingAudio(false);
            Alert.alert('Lỗi', error.message || 'Đã xảy ra lỗi.');
        } finally {
            setIsSubmittingEp(false);
        }
    };

    const renderEpisode = ({ item, index }: { item: PodcastEpisode, index: number }) => (
        <View style={[styles.epCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
            <View style={[styles.epNumWrap, { backgroundColor: palette.surface }]}>
                <Text style={[styles.epNum, { color: palette.textSecondary }]}>{item.episodeNumber ?? index + 1}</Text>
            </View>
            <View style={styles.epInfo}>
                <Text style={[styles.epTitle, { color: palette.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                {item.description ? (
                    <Text style={[styles.epDesc, { color: palette.textSecondary }]} numberOfLines={1}>{item.description}</Text>
                ) : null}
                <View style={styles.epMeta}>
                    <Ionicons name="time-outline" size={12} color={palette.textMuted} />
                    <Text style={[styles.epDuration, { color: palette.textMuted }]}>{formatDuration(item.duration)}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
                <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={palette.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Chi tiết Podcast</Text>
                    <View style={styles.headerBtn} />
                </View>

                {loading || !podcast ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#55C5F1" />
                        <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Đang tải chi tiết...</Text>
                    </View>
                ) : (
                    <>
                        <View style={[styles.bannerWrap, { borderBottomColor: palette.border }]}>
                            <Image source={{ uri: podcast.banner || 'https://via.placeholder.com/400x200' }} style={styles.banner} />
                            <View style={[styles.bannerOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                                <Text style={styles.bannerTitle} numberOfLines={2}>{podcast.title}</Text>
                                <Text style={styles.bannerDesc} numberOfLines={2}>{podcast.description}</Text>
                                <View style={styles.bannerMetaRow}>
                                    <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                                        <Text style={styles.badgeText}>Đã xuất bản</Text>
                                    </View>
                                    {podcast.isPaid ? (
                                        <View style={[styles.badge, { backgroundColor: '#8B5CF6' }]}>
                                            <Text style={styles.badgeText}>{podcast.price?.toLocaleString('vi-VN')}đ</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.badge, { backgroundColor: '#3B82F6' }]}>
                                            <Text style={styles.badgeText}>Miễn phí</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={[styles.epsHeader, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
                            <Text style={[styles.epsTitle, { color: palette.textPrimary }]}>
                                Danh sách tập ({podcast.allEpisodes?.length || 0})
                            </Text>
                            <TouchableOpacity style={[styles.addEpBtn, { backgroundColor: '#55C5F1' }]} onPress={() => setIsCreateEpisodeVisible(true)}>
                                <Ionicons name="add" size={16} color="white" />
                                <Text style={styles.addEpBtnText}>Thêm tập</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={podcast.allEpisodes || []}
                            keyExtractor={(item, index) => item.id || `ep-${index}`}
                            renderItem={renderEpisode}
                            contentContainerStyle={styles.epsList}
                            ListEmptyComponent={
                                <View style={styles.emptyWrap}>
                                    <Ionicons name="musical-notes-outline" size={40} color={palette.textMuted} />
                                    <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Chưa có tập nào.</Text>
                                </View>
                            }
                        />
                    </>
                )}

                {/* Create Episode Modal inside */}
                <Modal visible={isCreateEpisodeVisible} animationType="slide" presentationStyle="formSheet">
                    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
                        <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
                            <TouchableOpacity onPress={() => setIsCreateEpisodeVisible(false)} style={styles.headerBtn}>
                                <Ionicons name="close" size={24} color={palette.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Thêm Tập Mới</Text>
                            <TouchableOpacity onPress={handleSubmitEpisode} disabled={isSubmittingEp} style={styles.headerBtn}>
                                {isSubmittingEp ? (
                                    <ActivityIndicator size="small" color="#55C5F1" />
                                ) : (
                                    <Text style={[styles.saveText, { color: '#55C5F1' }]}>Lưu</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalContent}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.textPrimary }]}>Tiêu đề tập <Text style={{color: 'red'}}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
                                    value={epTitle}
                                    onChangeText={setEpTitle}
                                    placeholder="Nhập tiêu đề..."
                                    placeholderTextColor={palette.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.textPrimary }]}>Mô tả</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
                                    value={epDesc}
                                    onChangeText={setEpDesc}
                                    placeholder="Mô tả nội dung tập này..."
                                    placeholderTextColor={palette.textMuted}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.textPrimary }]}>File Âm Thanh <Text style={{color: 'red'}}>*</Text></Text>
                                <TouchableOpacity style={[styles.uploadButton, { borderColor: palette.border, backgroundColor: palette.surface }]} onPress={handlePickAudio} disabled={isSubmittingEp}>
                                    <Ionicons name="musical-notes-outline" size={24} color={palette.textMuted} />
                                    <View style={{flex: 1, marginLeft: 8}}>
                                        {audioFileName ? (
                                            <Text style={[styles.uploadText, { color: palette.textPrimary }]} numberOfLines={1}>{audioFileName}</Text>
                                        ) : (
                                            <Text style={[styles.uploadText, { color: palette.textMuted }]}>Chọn file âm thanh (.mp3, .wav,...)</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                                {uploadingAudio && (
                                    <Text style={[styles.helperText, { color: '#55C5F1' }]}>Đang tải file âm thanh lên server...</Text>
                                )}
                            </View>

                            <View style={[styles.warningBox, { backgroundColor: isDarkMode ? '#3F2C1D' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                                <Ionicons name="information-circle" size={20} color="#D97706" />
                                <Text style={[styles.warningText, { color: '#B45309' }]}>
                                    Tập mới sẽ được thêm vào hệ thống dưới dạng yêu cầu và cần Admin duyệt trước khi hiển thị.
                                </Text>
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { height: 56, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingText: { fontSize: 13 },
    
    // Banner
    bannerWrap: { height: 180, position: 'relative', borderBottomWidth: 1 },
    banner: { width: '100%', height: '100%' },
    bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingTop: 32 },
    bannerTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 4 },
    bannerDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 8 },
    bannerMetaRow: { flexDirection: 'row', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: 'white', fontSize: 11, fontWeight: '600' },

    // Eps
    epsHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    epsTitle: { fontSize: 15, fontWeight: '600' },
    addEpBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
    addEpBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },
    epsList: { padding: 16, gap: 12, paddingBottom: 40 },
    epCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
    epNumWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    epNum: { fontSize: 13, fontWeight: '600' },
    epInfo: { flex: 1, gap: 4 },
    epTitle: { fontSize: 14, fontWeight: '600' },
    epDesc: { fontSize: 12 },
    epMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    epDuration: { fontSize: 11 },
    emptyWrap: { padding: 40, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 14 },

    // Form
    saveText: { fontSize: 16, fontWeight: '600' },
    modalBody: { flex: 1 },
    modalContent: { padding: 20, gap: 20, paddingBottom: 60 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600' },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
    textArea: { height: 100, paddingTop: 12 },
    uploadButton: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', flexDirection: 'row' },
    uploadText: { fontSize: 14 },
    helperText: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 8 },
    warningText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
