import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { authService, UpdateProfileRequest } from '../../api';
import DateField from '../../components/ui/DateField';
import FormTextField from '../../components/ui/FormTextField';
import SelectField from '../../components/ui/SelectField';
import { showToast } from '../../components/ui/Toast';
import { useTheme } from '../../context/ThemeContext';
import { UserData, useUser } from '../../context/UserContext';

interface EditProfileScreenProps {
  onBack: () => void;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  bio: string;
  phone: string;
  birthday: string;
  gender: string;
}

const mapServerGenderToUi = (value?: string): string => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'male') return 'Nam';
  if (normalized === 'female') return 'Nữ';
  if (normalized === 'other') return 'Khác';
  return '';
};

const mapUiGenderToServer = (value?: string): string | undefined => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'nam' || normalized === 'male') return 'Male';
  if (normalized === 'nữ' || normalized === 'nu' || normalized === 'female') return 'Female';
  if (normalized === 'khác' || normalized === 'khac' || normalized === 'other') return 'Other';
  return undefined;
};

export default function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const { user, refreshUser } = useUser();
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  const formatDateForInput = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toISOString().slice(0, 10);
  };

  const buildProfileData = (userData?: UserData | null): ProfileData => ({
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    bio: userData?.bio || '',
    phone: userData?.phone || '',
    birthday: formatDateForInput(userData?.dateOfBirth),
    gender: mapServerGenderToUi(userData?.gender),
  });

  const [profileData, setProfileData] = useState<ProfileData>(() => buildProfileData(user));
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hasRequestedProfile, setHasRequestedProfile] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const edgeBackPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.pageX <= 24,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 90 && Math.abs(gesture.vx) > 0.15) onBack();
        },
      }),
    [onBack],
  );

  const genderOptions = ['Nam', 'Nữ', 'Khác'];

  useEffect(() => { setProfileData(buildProfileData(user)); }, [user]);

  useEffect(() => {
    if (!user && !hasRequestedProfile) {
      setHasRequestedProfile(true);
      refreshUser();
    }
  }, [hasRequestedProfile, refreshUser, user]);

  const normalizeDateOfBirth = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const iso = new Date(`${trimmed}T00:00:00.000Z`);
      return Number.isNaN(iso.getTime()) ? undefined : iso.toISOString();
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('/');
      const iso = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      return Number.isNaN(iso.getTime()) ? undefined : iso.toISOString();
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  };

  const formatDateDisplay = (value?: string) => {
    if (!value) return 'Chọn ngày sinh';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Chọn ngày sinh';
    const day = `${parsed.getDate()}`.padStart(2, '0');
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPickerDateValue = () => {
    const normalized = normalizeDateOfBirth(profileData.birthday);
    if (normalized) {
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date(2000, 0, 1);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type !== 'set' || !selectedDate) return;
    const day = `${selectedDate.getDate()}`.padStart(2, '0');
    const month = `${selectedDate.getMonth() + 1}`.padStart(2, '0');
    const year = selectedDate.getFullYear();
    handleChange('birthday', `${day}/${month}/${year}`);
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (isSaving) return;

    // Basic validation
    if (!profileData.firstName.trim()) {
      showToast.error('Lỗi', 'Tên không được để trống');
      return;
    }
    if (!profileData.lastName.trim()) {
      showToast.error('Lỗi', 'Họ không được để trống');
      return;
    }

    setIsSaving(true);
    try {
      const payload: UpdateProfileRequest = {
        firstName: profileData.firstName.trim() || undefined,
        lastName: profileData.lastName.trim() || undefined,
        bio: profileData.bio.trim() || undefined,
        phone: profileData.phone.trim() || undefined,
        gender: mapUiGenderToServer(profileData.gender),
        dateOfBirth: normalizeDateOfBirth(profileData.birthday),
      };

      const result = await authService.updateProfile(payload);
      if (!result.success) {
        showToast.error('Cập nhật thất bại', result.message || 'Vui lòng thử lại sau');
        return;
      }

      await refreshUser({
        expectedUpdatedAt: result.data?.updatedAt,
        maxAttempts: 6,
        delayMs: 100,
      });

      setShowSavedToast(true);
      setTimeout(() => {
        setShowSavedToast(false);
        onBack();
      }, 1000);
    } catch (error: any) {
      showToast.error('Cập nhật thất bại', error?.message || 'Vui lòng thử lại sau');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Success Toast */}
      {showSavedToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={18} color="white" />
            <Text style={styles.toastText}>Đã lưu thành công!</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Chỉnh sửa hồ sơ</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* THÔNG TIN CƠ BẢN */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>THÔNG TIN CƠ BẢN</Text>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {/* Họ và Tên */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#55C5F1' + '1A' }]}>
                <Ionicons name="person-outline" size={18} color="#55C5F1" />
              </View>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Họ và tên</Text>
                <View style={styles.nameRow}>
                  <FormTextField
                    containerStyle={styles.nameField}
                    value={profileData.lastName}
                    onChangeText={(value) => handleChange('lastName', value)}
                    onFocus={() => setEditingField('lastName')}
                    onBlur={() => setEditingField(null)}
                    placeholder="Họ"
                    placeholderTextColor={palette.textMuted}
                    style={[styles.input, { color: palette.textPrimary }, editingField === 'lastName' && styles.inputFocused]}
                  />
                  <FormTextField
                    containerStyle={styles.nameField}
                    value={profileData.firstName}
                    onChangeText={(value) => handleChange('firstName', value)}
                    onFocus={() => setEditingField('firstName')}
                    onBlur={() => setEditingField(null)}
                    placeholder="Tên"
                    placeholderTextColor={palette.textMuted}
                    style={[styles.input, { color: palette.textPrimary }, editingField === 'firstName' && styles.inputFocused]}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            {/* Bio */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F59E0B' + '1A' }]}>
                <Ionicons name="musical-notes-outline" size={18} color="#F59E0B" />
              </View>
              <View style={styles.inputContent}>
                <View style={styles.bioHeader}>
                  <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Tiểu sử</Text>
                  <Text style={[styles.charCount, { color: palette.textMuted }]}>
                    {profileData.bio.length}/200
                  </Text>
                </View>
                <FormTextField
                  containerStyle={styles.bioInput}
                  value={profileData.bio}
                  onChangeText={(value) => { if (value.length <= 200) handleChange('bio', value); }}
                  onFocus={() => setEditingField('bio')}
                  onBlur={() => setEditingField(null)}
                  multiline
                  numberOfLines={2}
                  maxLength={200}
                  placeholder="Viết vài dòng giới thiệu..."
                  placeholderTextColor={palette.textMuted}
                  style={[styles.input, { color: palette.textPrimary }, editingField === 'bio' && styles.inputFocused]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* THÔNG TIN LIÊN HỆ */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>THÔNG TIN LIÊN HỆ</Text>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {/* Phone */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#10B981' + '1A' }]}>
                <Ionicons name="call-outline" size={18} color="#10B981" />
              </View>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Số điện thoại</Text>
                <FormTextField
                  value={profileData.phone}
                  onChangeText={(value) => handleChange('phone', value)}
                  onFocus={() => setEditingField('phone')}
                  onBlur={() => setEditingField(null)}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder="0912345678"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.input, { color: palette.textPrimary }, editingField === 'phone' && styles.inputFocused]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* THÔNG TIN CÁ NHÂN */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>THÔNG TIN CÁ NHÂN</Text>
          <View style={[styles.card, styles.popupHostCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {/* Gender */}
            <View style={styles.genderFieldWrap}>
              <View style={styles.inputRow}>
                <View style={[styles.iconBox, { backgroundColor: '#EC4899' + '1A' }]}>
                  <Ionicons name="male-female-outline" size={18} color="#EC4899" />
                </View>
                <SelectField
                  containerStyle={styles.inputContent}
                  onPress={() => { setShowDatePicker(false); setShowGenderPicker(!showGenderPicker); }}
                  label="Giới tính"
                  labelStyle={[styles.inputLabel, { color: palette.textMuted }]}
                  value={profileData.gender || 'Chọn'}
                  valueTextStyle={[styles.genderValue, { color: profileData.gender ? palette.textPrimary : palette.textMuted }]}
                  rowStyle={styles.genderRow}
                  showChevron
                  isExpanded={showGenderPicker}
                  chevronColor={palette.textMuted}
                />
              </View>
              {showGenderPicker && (
                <View style={[styles.genderPicker, { backgroundColor: isDarkMode ? '#111827' : '#F9FAFB', borderColor: palette.border }]}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.genderOption, profileData.gender === option && styles.genderOptionSelected]}
                      onPress={() => { handleChange('gender', option); setShowGenderPicker(false); }}
                    >
                      <Text style={[styles.genderOptionText, { color: palette.textPrimary }, profileData.gender === option && styles.genderOptionTextSelected]}>
                        {option}
                      </Text>
                      {profileData.gender === option && <Ionicons name="checkmark" size={16} color="#55C5F1" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            {/* Birthday */}
            <View style={styles.birthdayFieldWrap}>
              <View style={styles.inputRow}>
                <View style={[styles.iconBox, { backgroundColor: '#F59E0B' + '1A' }]}>
                  <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
                </View>
                <DateField
                  containerStyle={styles.inputContent}
                  activeOpacity={0.85}
                  onPress={() => { setShowGenderPicker(false); setShowDatePicker(!showDatePicker); }}
                  label="Ngày sinh"
                  labelStyle={[styles.inputLabel, { color: palette.textMuted }]}
                  value={formatDateDisplay(profileData.birthday)}
                  isPlaceholder={!profileData.birthday}
                  valueTextStyle={[styles.input, { color: profileData.birthday ? palette.textPrimary : palette.textMuted }]}
                  rowStyle={styles.datePickerRow}
                  showChevron
                  isExpanded={showDatePicker}
                  chevronColor={palette.textMuted}
                />
              </View>
              {showDatePicker && (
                <View style={[styles.datePickerPopup, { backgroundColor: isDarkMode ? '#111827' : '#F9FAFB', borderColor: palette.border }]}>
                  <DateTimePicker
                    value={getPickerDateValue()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Privacy Note */}
        <View style={styles.formSection}>
          <View style={[styles.privacyNote, { backgroundColor: isDarkMode ? 'rgba(85, 197, 241, 0.14)' : '#55C5F10D', borderColor: isDarkMode ? 'rgba(85, 197, 241, 0.38)' : '#55C5F133' }]}>
            <View style={styles.privacyIconBox}>
              <Ionicons name="shield-checkmark" size={18} color="#55C5F1" />
            </View>
            <View style={styles.privacyContent}>
              <Text style={[styles.privacyTitle, { color: palette.textPrimary }]}>Quyền riêng tư</Text>
              <Text style={[styles.privacyText, { color: palette.textSecondary }]}>
                Thông tin cá nhân của bạn sẽ được bảo mật và chỉ sử dụng để tăng trải nghiệm cá nhân. Bạn có thể chỉnh sửa thông tin bất cứ lúc nào.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
            <Text style={[styles.cancelButtonText, { color: palette.textSecondary }]}>Hủy bỏ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          >
            <LinearGradient
              colors={['#55C5F1', '#A78BFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.edgeSwipeBackZone} {...edgeBackPanResponder.panHandlers} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  edgeSwipeBackZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 20,
  },

  // Toast
  toastContainer: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  saveButton: {
    // backgroundColor: '#55C5F1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Form Section
  formSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  popupHostCard: {
    overflow: 'visible',
  },

  // Input Row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nameField: {
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  input: {
    fontSize: 15,
    color: '#1E293B',
    padding: 0,
    margin: 0,
  },
  inputFocused: {
    color: '#55C5F1',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },

  // Username
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  atSymbol: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  usernameInput: {
    flex: 1,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981' + '1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },

  // Bio
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  bioInput: {
    minHeight: 40,
    textAlignVertical: 'top',
  },

  // Gender
  genderFieldWrap: {
    position: 'relative',
    zIndex: 20,
  },
  birthdayFieldWrap: {
    position: 'relative',
    zIndex: 19,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerPopup: {
    position: 'absolute',
    left: 64,
    right: 16,
    top: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 28,
    elevation: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  genderValue: {
    fontSize: 15,
    color: '#1E293B',
  },
  genderPicker: {
    position: 'absolute',
    left: 64,
    right: 16,
    top: 62,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    zIndex: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  genderOptionSelected: {
    backgroundColor: '#55C5F1' + '1A',
  },
  genderOptionText: {
    fontSize: 14,
    color: '#1E293B',
  },
  genderOptionTextSelected: {
    color: '#55C5F1',
    fontWeight: '600',
  },

  // Add Link Button
  addLinkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  addLinkText: {
    fontSize: 14,
    color: '#55C5F1',
    fontWeight: '600',
  },

  // Privacy Note
  privacyNote: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#55C5F1' + '0D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#55C5F1' + '33',
    padding: 16,
  },
  privacyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#55C5F1' + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    color: 'white',
    fontWeight: '600',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 20,
  },
});
