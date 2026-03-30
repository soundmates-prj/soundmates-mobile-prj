import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { showToast } from '../../../components/ui/Toast';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { authService, UpdateProfileRequest } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { UserData, useUser } from '../../context/UserContext';

interface EditProfileScreenProps {
  onBack: () => void;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  phone: string;
  location: string;
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

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyvxwa59e/image/upload';
const CLOUDINARY_PRESET = 'soundmates_upload';

const uploadToCloudinary = async (uri: string): Promise<string> => {
  const formData = new FormData();
  
  // Extract filename and extension
  const filename = uri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;

  formData.append('file', {
    uri,
    name: filename,
    type,
  } as any);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.log('Cloudinary error:', errorData);
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.secure_url;
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
    phone: userData?.phone || '',
    location: userData?.location || '',
    gender: mapServerGenderToUi(userData?.gender),
    website: userData?.website || '',
  });

  const [profileData, setProfileData] = useState<ProfileData>(() => buildProfileData(user));
  const [isSaving, setIsSaving] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(user?.profileImageUrl || null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast.error('Quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh để đổi ảnh đại diện');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let profileImageUrl = user?.profileImageUrl;

      if (selectedImage && selectedImage !== user?.profileImageUrl) {
        try {
          profileImageUrl = await uploadToCloudinary(selectedImage);
        } catch (uploadError) {
          showToast.error('Lỗi', 'Không thể tải ảnh lên Cloudinary');
          setIsSaving(false);
          return;
        }
      }

      const payload: UpdateProfileRequest = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        bio: profileData.bio.trim(),
        phone: profileData.phone.trim(),
        gender: mapUiGenderToServer(profileData.gender),
        location: profileData.location.trim(),
        website: profileData.website.trim(),
        profileImageUrl,
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

  const renderInput = (label: string, field: keyof ProfileData, placeholder: string, last = false, props = {}) => (
    <View style={styles.inputItem}>
      <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>{label}</Text>
      <TextInput
        value={profileData[field]}
        onChangeText={v => handleChange(field, v)}
        style={[styles.inputField, { color: palette.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={palette.textSecondary + '80'}
        {...props}
      />
      {!last && <View style={[styles.innerDivider, { backgroundColor: palette.border }]} />}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#F2F2F7' }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF', borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={[styles.headerCancel, { color: palette.primary }]}>Hủy</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Sửa hồ sơ</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.headerBtn}>
          {isSaving ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <Text style={[styles.headerDone, { color: palette.primary }]}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarPickerTrigger}>
              {selectedImage ? (
                <ExpoImage source={{ uri: selectedImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' }]}>
                  <Ionicons name="person" size={60} color={isDarkMode ? '#48484A' : '#AEAEB2'} />
                </View>
              )}
              <View style={[styles.editBadge, { backgroundColor: palette.primary }]}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
              <Text style={{ color: palette.primary, fontWeight: '600', fontSize: 15 }}>Thay đổi ảnh đại diện</Text>
            </TouchableOpacity>
          </View>

          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>TÀI KHOẢN</Text>
            <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
              {renderInput('Họ', 'firstName', 'Nhập họ')}
              {renderInput('Tên', 'lastName', 'Nhập tên')}
              <View style={styles.inputItem}>
                <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>Username</Text>
                <TextInput
                  value={profileData.username}
                  editable={false}
                  style={[styles.inputField, { color: palette.textSecondary }]}
                  placeholder="Username"
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>THÔNG TIN CÁ NHÂN</Text>
            <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
              {renderInput('Điện thoại', 'phone', 'Số điện thoại', false, { keyboardType: 'phone-pad' })}
              <TouchableOpacity 
                style={styles.inputItem} 
                onPress={() => setShowGenderPicker(!showGenderPicker)}
              >
                <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>Giới tính</Text>
                <View style={styles.pickerValueRow}>
                  <Text style={[styles.inputField, { color: palette.textPrimary }]}>{profileData.gender}</Text>
                  <Ionicons name="chevron-forward" size={16} color={palette.textSecondary} />
                </View>
                {!showGenderPicker && <View style={[styles.innerDivider, { backgroundColor: palette.border }]} />}
              </TouchableOpacity>

              {showGenderPicker && (
                <View style={styles.genderPicker}>
                  {['Nam', 'Nữ', 'Khác'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.genderItem}
                      onPress={() => { handleChange('gender', opt); setShowGenderPicker(false); }}
                    >
                      <Text style={[styles.genderText, { color: profileData.gender === opt ? palette.primary : palette.textPrimary }]}>{opt}</Text>
                      {profileData.gender === opt && <Ionicons name="checkmark" size={18} color={palette.primary} />}
                    </TouchableOpacity>
                  ))}
                  <View style={[styles.innerDivider, { backgroundColor: palette.border }]} />
                </View>
              )}

              {renderInput('Vị trí', 'location', 'Thành phố, Quốc gia', true)}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>GIỚI THIỆU</Text>
            <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
              <TextInput
                value={profileData.bio}
                onChangeText={v => handleChange('bio', v)}
                style={[styles.bioInput, { color: palette.textPrimary }]}
                placeholder="Nói gì đó về bạn..."
                placeholderTextColor={palette.textSecondary + '80'}
                multiline
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
            <Text style={[styles.sectionHeading, { color: palette.textSecondary }]}>KHÁC</Text>
            <View style={[styles.sectionCard, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
              {renderInput('Website', 'website', 'https://example.com', true)}
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerBtn: { paddingVertical: 8, minWidth: 50 },
  headerCancel: { fontSize: 17, fontWeight: '400' },
  headerDone: { fontSize: 17, fontWeight: '600' },
  scrollContent: { paddingBottom: 40 },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarPickerTrigger: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editAvatarBtn: {
    padding: 4,
  },

  section: {
    marginTop: 20,
    paddingHorizontal: 0,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 8,
    marginLeft: 18,
  },
  sectionCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  inputItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    minHeight: 46,
  },
  inputLabel: {
    width: 100,
    fontSize: 16,
    fontWeight: '400',
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    paddingRight: 16,
    paddingVertical: 10,
  },
  innerDivider: {
    position: 'absolute',
    bottom: 0,
    left: 116,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  pickerValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  genderPicker: {
    paddingLeft: 116,
  },
  genderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  genderText: { fontSize: 16, fontWeight: '400' },
  bioInput: {
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
