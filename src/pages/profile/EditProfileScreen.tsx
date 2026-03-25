import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../../../components/ui/Toast';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { authService, UpdateProfileRequest } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { UserData, useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

interface EditProfileScreenProps {
  onBack: () => void;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  email: string;
  phone: string;
  location: string;
  birthday: string;
  gender: string;
  website: string;
}

const mapServerGenderToUi = (value?: string): string => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'male' || normalized === 'nam') return 'Nam';
  if (normalized === 'female' || normalized === 'nu' || normalized === 'nữ') return 'Nữ';
  return 'Khác';
};

const mapUiGenderToServer = (value?: string): string | undefined => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'nam' || normalized === 'male') return 'Male';
  if (normalized === 'nu' || normalized === 'nữ' || normalized === 'female') return 'Female';
  return 'Other';
};

export default function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const { user, refreshUser } = useUser();
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  const buildProfileData = (userData?: UserData | null): ProfileData => ({
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    username: userData?.username || '',
    bio: userData?.bio || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    location: userData?.location || '',
    birthday: userData?.dateOfBirth || '',
    gender: mapServerGenderToUi(userData?.gender),
    website: userData?.website || '',
  });

  const [profileData, setProfileData] = useState<ProfileData>(() => buildProfileData(user));
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const genderOptions = ['Nam', 'Nữ', 'Khác'];

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const payload: UpdateProfileRequest = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        bio: profileData.bio.trim(),
        phone: profileData.phone.trim(),
        gender: mapUiGenderToServer(profileData.gender),
        location: profileData.location.trim(),
        website: profileData.website.trim(),
      };

      const result = await authService.updateProfile(payload);
      if (result.success) {
        await refreshUser();
        showToast.success('Thành công', 'Thông tin đã được cập nhật');
        onBack();
      } else {
        showToast.error('Lỗi', result.message || 'Không thể cập nhật');
      }
    } catch (e) {
      showToast.error('Lỗi', 'Vui lòng thử lại sau');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveBtn}>
          {isSaving ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <Text style={[styles.saveBtnText, { color: palette.primary }]}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>THÔNG TIN CƠ BẢN</Text>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Họ</Text>
              <TextInput
                value={profileData.firstName}
                onChangeText={v => handleChange('firstName', v)}
                style={[styles.input, { color: palette.textPrimary }]}
                placeholder="Họ của bạn"
                placeholderTextColor={palette.textSecondary + '80'}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Tên</Text>
              <TextInput
                value={profileData.lastName}
                onChangeText={v => handleChange('lastName', v)}
                style={[styles.input, { color: palette.textPrimary }]}
                placeholder="Tên của bạn"
                placeholderTextColor={palette.textSecondary + '80'}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>GIỚI THIỆU</Text>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <TextInput
              value={profileData.bio}
              onChangeText={v => handleChange('bio', v)}
              style={[styles.input, styles.bioInput, { color: palette.textPrimary }]}
              placeholder="Kể chút về bản thân bạn..."
              placeholderTextColor={palette.textSecondary + '80'}
              multiline
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>LIÊN HỆ & KHÁC</Text>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Số điện thoại</Text>
              <TextInput
                value={profileData.phone}
                onChangeText={v => handleChange('phone', v)}
                style={[styles.input, { color: palette.textPrimary }]}
                placeholder="Số điện thoại"
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowGenderPicker(!showGenderPicker)}
            >
              <Text style={[styles.label, { color: palette.textSecondary }]}>Giới tính</Text>
              <Text style={[styles.input, { color: palette.textPrimary }]}>{profileData.gender}</Text>
              <Ionicons name="chevron-forward" size={16} color={palette.textSecondary} />
            </TouchableOpacity>

            {showGenderPicker && (
              <View style={styles.genderOptions}>
                {genderOptions.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      handleChange('gender', opt);
                      setShowGenderPicker(false);
                    }}
                    style={styles.genderOpt}
                  >
                    <Text style={[styles.genderText, { color: profileData.gender === opt ? palette.primary : palette.textPrimary }]}>{opt}</Text>
                    {profileData.gender === opt && <Ionicons name="checkmark" size={16} color={palette.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: palette.textSecondary }]}>Vị trí</Text>
              <TextInput
                value={profileData.location}
                onChangeText={v => handleChange('location', v)}
                style={[styles.input, { color: palette.textPrimary }]}
                placeholder="Vị trí của bạn"
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  backBtn: {
    padding: 4,
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  label: {
    width: 100,
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  bioInput: {
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  genderOptions: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  genderOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  genderText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
