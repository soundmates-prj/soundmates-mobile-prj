import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../api';
import FormTextField from '../../components/ui/FormTextField';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface BankAccountScreenProps {
    onBack: () => void;
}

export default function BankAccountScreen({ onBack }: BankAccountScreenProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();

    const [bankId, setBankId] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchBankAccount = async () => {
            setIsLoading(true);
            try {
                const response = await authService.getBankAccount();
                if (response.success && response.data) {
                    setBankId(response.data.bankId || '');
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

                            <FormTextField
                                label="Tên ngân hàng (Bank Name)"
                                value={bankId}
                                onChangeText={setBankId}
                                placeholder="Ví dụ: Vietcombank, MBBank..."
                            />

                            <FormTextField
                                label="Số tài khoản"
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                placeholder="Nhập số tài khoản"
                                keyboardType="number-pad"
                            />

                            <FormTextField
                                label="Tên chủ tài khoản"
                                value={accountName}
                                onChangeText={(text) => setAccountName(text.toUpperCase())}
                                placeholder="NGUYEN VAN A"
                                autoCapitalize="characters"
                            />

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
});
