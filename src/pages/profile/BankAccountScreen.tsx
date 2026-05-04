import { authService } from '@/src/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface BankAccountScreenProps {
    onBack: () => void;
}

const BANK_OPTIONS = [
    { id: '970415', name: 'VietinBank' },
    { id: '970436', name: 'Vietcombank' },
    { id: '970418', name: 'BIDV' },
    { id: '970405', name: 'Agribank' },
    { id: '970403', name: 'Sacombank' },
    { id: '970407', name: 'Techcombank' },
    { id: '970422', name: 'MBBank' },
    { id: '970423', name: 'TPBank' },
    { id: '970432', name: 'VPBank' },
    { id: '970416', name: 'ACB' },
];

export default function BankAccountScreen({ onBack }: BankAccountScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();

    const [bankId, setBankId] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showBankPicker, setShowBankPicker] = useState(false);

    useEffect(() => {
        const fetchBankAccount = async () => {
            setIsLoading(true);
            try {
                const response = await authService.getBankAccount();
                if (response.success && response.data) {
                    let fetchedBankId = response.data.bankId || '';
                    
                    // Normalize in case the database stored the bank name instead of the ID
                    const matchedBank = BANK_OPTIONS.find(
                        b => b.id === fetchedBankId || b.name.toLowerCase() === fetchedBankId.toLowerCase()
                    );
                    if (matchedBank) {
                        fetchedBankId = matchedBank.id;
                    }

                    setBankId(fetchedBankId);
                    setAccountNumber(response.data.accountNumber || '');
                    setAccountName(response.data.accountName || '');
                }
            } catch (error) {
                console.log('[BankAccountScreen] Fetch error', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBankAccount();
    }, []);

    const handleSave = async () => {
        if (!bankId.trim() || !accountNumber.trim() || !accountName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.');
            return;
        }

        setIsSaving(true);
        try {
            const response = await authService.updateBankAccount({
                bankId: bankId.trim(),
                accountNumber: accountNumber.trim(),
                accountName: accountName.trim().toUpperCase(),
            });

            if (response.success) {
                Alert.alert('Thành công', 'Cập nhật tài khoản ngân hàng thành công!', [
                    { text: 'OK', onPress: onBack },
                ]);
            } else {
                Alert.alert('Lỗi', response.message || 'Không thể cập nhật thông tin.');
            }
        } catch (error) {
            console.log('[BankAccountScreen] Save error', error);
            Alert.alert('Lỗi', 'Đã xảy ra lỗi khi lưu thông tin.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: palette.surface,
                        borderBottomColor: palette.border,
                        paddingTop: insets.top + 16,
                    },
                ]}
            >
                <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color={palette.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Tài khoản ngân hàng</Text>
                <View style={styles.placeholderButton} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={palette.primary} />
                            <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
                                Đang tải thông tin...
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.formContainer}>
                            <Text style={[styles.description, { color: palette.textSecondary }]}>
                                Nhập thông tin tài khoản ngân hàng để nhận doanh thu từ việc bán Podcast của bạn.
                            </Text>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.textPrimary }]}>Tên ngân hàng</Text>
                                <TouchableOpacity
                                    style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                                    onPress={() => setShowBankPicker(true)}
                                >
                                    <Text style={{ color: bankId ? palette.textPrimary : palette.textSecondary, fontSize: 15 }}>
                                        {BANK_OPTIONS.find(b => b.id === bankId)?.name || (bankId ? bankId : 'Chọn ngân hàng...')}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={palette.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.textPrimary }]}>Số tài khoản</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                    placeholder="Nhập số tài khoản"
                                    keyboardType="number-pad"
                                    placeholderTextColor={palette.textSecondary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.textPrimary }]}>Tên chủ tài khoản</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: palette.surface, color: palette.textPrimary, borderColor: palette.border }]}
                                    value={accountName}
                                    onChangeText={(text) => setAccountName(text.toUpperCase())}
                                    placeholder="NGUYEN VAN A"
                                    autoCapitalize="characters"
                                    placeholderTextColor={palette.textSecondary}
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.saveButton,
                                    { backgroundColor: palette.primary },
                                    isSaving && { opacity: 0.7 },
                                ]}
                                onPress={handleSave}
                                disabled={isSaving}
                                activeOpacity={0.8}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Lưu thông tin</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showBankPicker} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBankPicker(false)}>
                    <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
                            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Chọn ngân hàng</Text>
                            <TouchableOpacity onPress={() => setShowBankPicker(false)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={24} color={palette.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                            {BANK_OPTIONS.map((bank) => (
                                <TouchableOpacity
                                    key={bank.id}
                                    style={[styles.bankOption, { borderBottomColor: palette.border }, bankId === bank.id && { backgroundColor: palette.primary + '1A' }]}
                                    onPress={() => {
                                        setBankId(bank.id);
                                        setShowBankPicker(false);
                                    }}
                                >
                                    <Text style={[styles.bankOptionText, { color: palette.textPrimary }, bankId === bank.id && { color: palette.primary, fontWeight: 'bold' }]}>
                                        {bank.name}
                                    </Text>
                                    {bankId === bank.id && <Ionicons name="checkmark" size={20} color={palette.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholderButton: {
        width: 40,
        height: 40,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    formContainer: {
        flex: 1,
        gap: 16,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    saveButton: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    inputGroup: {
        gap: 8,
        marginBottom: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        minHeight: 48,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { width: '100%', borderRadius: 16, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    modalTitle: { fontSize: 16, fontWeight: 'bold' },
    bankOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    bankOptionText: { fontSize: 15 },
});
