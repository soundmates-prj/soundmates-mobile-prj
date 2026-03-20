import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../../../components/ui/Toast';
import { authService, UpdateProfileRequest } from '../../api';
import { UserData, useUser } from '../../context/UserContext';

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
  favoriteGenre: string;
}

export default function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const { user, refreshUser } = useUser();
  const formatDateForInput = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toISOString().slice(0, 10);
  };

  const buildProfileData = (userData?: UserData | null): ProfileData => {
    return {
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      username: userData?.username || '',
      bio: userData?.bio || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      location: userData?.location || '',
      birthday: formatDateForInput(userData?.dateOfBirth),
      gender: userData?.gender || 'Không muốn tiết lộ',
      website: userData?.website || '',
      favoriteGenre: 'Acoustic, Lofi, Ballad',
    };
  };

  const [profileData, setProfileData] = useState<ProfileData>(() => buildProfileData(user));
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hasRequestedProfile, setHasRequestedProfile] = useState(false);

  const genderOptions = ['Nam', 'Nữ', 'Khác', 'Không muốn tiết lộ'];

  useEffect(() => {
    setProfileData(buildProfileData(user));
  }, [user]);

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

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);

    const firstName = profileData.firstName.trim() || undefined;
    const lastName = profileData.lastName.trim() || undefined;

    try {
      const payload: UpdateProfileRequest = {
        firstName,
        lastName,
        bio: profileData.bio.trim() || undefined,
        phone: profileData.phone.trim() || undefined,
        gender: profileData.gender.trim() || undefined,
        dateOfBirth: normalizeDateOfBirth(profileData.birthday),
        location: profileData.location.trim() || undefined,
        website: profileData.website.trim() || undefined,
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        {/* <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Đang lưu...' : 'Lưu'}</Text>
        </TouchableOpacity> */}
        <View style={styles.saveButton}></View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Form Section - Basic Info */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>THÔNG TIN CƠ BẢN</Text>
          <View style={styles.card}>
            {/* Display Name */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#55C5F1' + '1A' }]}>
                <Ionicons name="person-outline" size={18} color="#55C5F1" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Họ và tên</Text>
                <View style={styles.nameRow}>
                  <TextInput
                    value={profileData.firstName}
                    onChangeText={(value) => handleChange('firstName', value)}
                    onFocus={() => setEditingField('firstName')}
                    onBlur={() => setEditingField(null)}
                    placeholder="Họ"
                    placeholderTextColor="#D1D5DB"
                    style={[
                      styles.input,
                      styles.nameField,
                      editingField === 'firstName' && styles.inputFocused,
                    ]}
                  />
                  <TextInput
                    value={profileData.lastName}
                    onChangeText={(value) => handleChange('lastName', value)}
                    onFocus={() => setEditingField('lastName')}
                    onBlur={() => setEditingField(null)}
                    placeholder="Tên"
                    placeholderTextColor="#D1D5DB"
                    style={[
                      styles.input,
                      styles.nameField,
                      editingField === 'lastName' && styles.inputFocused,
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Username */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#A78BFA' + '1A' }]}>
                <Ionicons name="at" size={18} color="#A78BFA" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Tên người dùng</Text>
                <View style={styles.usernameRow}>
                  {/* <Text style={styles.atSymbol}>@</Text> */}
                  <TextInput
                    value={profileData.username}
                    onChangeText={(value) => handleChange('username', value)}
                    onFocus={() => setEditingField('username')}
                    onBlur={() => setEditingField(null)}
                    style={[
                      styles.input,
                      styles.usernameInput,
                      editingField === 'username' && styles.inputFocused,
                    ]}
                  />
                </View>
              </View>
              <View style={styles.badge}>
                <Ionicons name="checkmark" size={12} color="#10B981" />
                <Text style={styles.badgeText}>Khả dụng</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Bio */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F59E0B' + '1A' }]}>
                <Ionicons name="musical-notes-outline" size={18} color="#F59E0B" />
              </View>
              <View style={styles.inputContent}>
                <View style={styles.bioHeader}>
                  <Text style={styles.inputLabel}>Giới thiệu</Text>
                  <Text style={styles.charCount}>
                    {profileData.bio.length}/150
                  </Text>
                </View>
                <TextInput
                  value={profileData.bio}
                  onChangeText={(value) => {
                    if (value.length <= 150) handleChange('bio', value);
                  }}
                  onFocus={() => setEditingField('bio')}
                  onBlur={() => setEditingField(null)}
                  multiline
                  numberOfLines={2}
                  maxLength={150}
                  style={[
                    styles.input,
                    styles.bioInput,
                    editingField === 'bio' && styles.inputFocused,
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Form Section - Contact Info */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>THÔNG TIN LIÊN HỆ</Text>
          <View style={styles.card}>
            {/* Email */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#3B82F6' + '1A' }]}>
                <Ionicons name="mail-outline" size={18} color="#3B82F6" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  value={profileData.email}
                  onChangeText={(value) => handleChange('email', value)}
                  onFocus={() => setEditingField('email')}
                  onBlur={() => setEditingField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    editingField === 'email' && styles.inputFocused,
                  ]}
                />
              </View>
              <View style={styles.badge}>
                <Ionicons name="checkmark" size={12} color="#10B981" />
                <Text style={styles.badgeText}>Đã xác minh</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Phone */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#10B981' + '1A' }]}>
                <Ionicons name="call-outline" size={18} color="#10B981" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  value={profileData.phone}
                  onChangeText={(value) => handleChange('phone', value)}
                  onFocus={() => setEditingField('phone')}
                  onBlur={() => setEditingField(null)}
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    editingField === 'phone' && styles.inputFocused,
                  ]}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Website */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#6366F1' + '1A' }]}>
                <Ionicons name="link-outline" size={18} color="#6366F1" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Website</Text>
                <TextInput
                  value={profileData.website}
                  onChangeText={(value) => handleChange('website', value)}
                  onFocus={() => setEditingField('website')}
                  onBlur={() => setEditingField(null)}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    editingField === 'website' && styles.inputFocused,
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Form Section - Personal Details */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>THÔNG TIN CÁ NHÂN</Text>
          <View style={styles.card}>
            {/* Gender */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EC4899' + '1A' }]}>
                <Ionicons name="male-female-outline" size={18} color="#EC4899" />
              </View>
              <TouchableOpacity
                style={styles.inputContent}
                onPress={() => setShowGenderPicker(!showGenderPicker)}
              >
                <Text style={styles.inputLabel}>Giới tính</Text>
                <View style={styles.genderRow}>
                  <Text style={styles.genderValue}>{profileData.gender}</Text>
                  <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>

            {showGenderPicker && (
              <View style={styles.genderPicker}>
                {genderOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.genderOption,
                      profileData.gender === option && styles.genderOptionSelected,
                    ]}
                    onPress={() => {
                      handleChange('gender', option);
                      setShowGenderPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        profileData.gender === option && styles.genderOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                    {profileData.gender === option && (
                      <Ionicons name="checkmark" size={16} color="#55C5F1" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.divider} />

            {/* Birthday */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#F59E0B' + '1A' }]}>
                <Ionicons name="calendar-outline" size={18} color="#F59E0B" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Ngày sinh</Text>
                <TextInput
                  value={profileData.birthday}
                  onChangeText={(value) => handleChange('birthday', value)}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#D1D5DB"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Location */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#EF4444' + '1A' }]}>
                <Ionicons name="location-outline" size={18} color="#EF4444" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Vị trí</Text>
                <TextInput
                  value={profileData.location}
                  onChangeText={(value) => handleChange('location', value)}
                  onFocus={() => setEditingField('location')}
                  onBlur={() => setEditingField(null)}
                  style={[
                    styles.input,
                    editingField === 'location' && styles.inputFocused,
                  ]}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Favorite Genre */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#55C5F1' + '1A' }]}>
                <Ionicons name="musical-notes" size={18} color="#55C5F1" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Thể loại yêu thích</Text>
                <TextInput
                  value={profileData.favoriteGenre}
                  onChangeText={(value) => handleChange('favoriteGenre', value)}
                  onFocus={() => setEditingField('favoriteGenre')}
                  onBlur={() => setEditingField(null)}
                  placeholder="VD: Pop, Rock, Ballad..."
                  placeholderTextColor="#D1D5DB"
                  style={[
                    styles.input,
                    editingField === 'favoriteGenre' && styles.inputFocused,
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>LIÊN KẾT MẠNG XÃ HỘI</Text>
          <View style={styles.card}>
            {/* Instagram */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E1306C' + '1A' }]}>
                <Ionicons name="logo-instagram" size={18} color="#E1306C" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Instagram</Text>
                <TextInput
                  placeholder="@username"
                  placeholderTextColor="#D1D5DB"
                  defaultValue="@minhanh_music"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Facebook */}
            <View style={styles.inputRow}>
              <View style={[styles.iconBox, { backgroundColor: '#1877F2' + '1A' }]}>
                <Ionicons name="logo-facebook" size={18} color="#1877F2" />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Facebook</Text>
                <TextInput
                  placeholder="Tên hoặc link Facebook"
                  placeholderTextColor="#D1D5DB"
                  defaultValue="Minh Anh"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Add more link */}
            <TouchableOpacity style={styles.addLinkButton}>
              <Text style={styles.addLinkText}>+ Thêm liên kết</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Note */}
        <View style={styles.formSection}>
          <View style={styles.privacyNote}>
            <View style={styles.privacyIconBox}>
              <Ionicons name="shield-checkmark" size={18} color="#55C5F1" />
            </View>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Quyền riêng tư</Text>
              <Text style={styles.privacyText}>
                Email và số điện thoại của bạn sẽ không hiển thị công khai. Chỉ tên hiển thị, ảnh
                đại diện và giới thiệu sẽ được hiển thị trên hồ sơ công khai.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity onPress={onBack} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
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

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 25,
    flex: 1,
    backgroundColor: '#FAFAFA',
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
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genderValue: {
    fontSize: 15,
    color: '#1E293B',
  },
  genderPicker: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
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
