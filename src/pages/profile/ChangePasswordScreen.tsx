import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
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
import FormTextField from '../../components/ui/FormTextField';
import { showToast } from '../../components/ui/Toast';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

interface ChangePasswordScreenProps {
  onBack: () => void;
  onNavigateToForgotPassword?: () => void;
  onLogout?: () => void;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  bgColor: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: 'Rất yếu', color: '#EF4444', bgColor: '#EF444420' },
    { score: 1, label: 'Yếu', color: '#F97316', bgColor: '#F9731620' },
    { score: 2, label: 'Trung bình', color: '#F59E0B', bgColor: '#F59E0B20' },
    { score: 3, label: 'Mạnh', color: '#10B981', bgColor: '#10B98120' },
    { score: 4, label: 'Rất mạnh', color: '#059669', bgColor: '#05966920' },
  ];

  return levels[score];
}

const PASSWORD_RULES = [
  { id: 'length', label: 'Ít nhất 8 ký tự', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Có ít nhất 1 chữ hoa (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'number', label: 'Có ít nhất 1 số (0-9)', test: (p: string) => /[0-9]/.test(p) },
  {
    id: 'special',
    label: 'Có ít nhất 1 ký tự đặc biệt (!@#$...)',
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

export default function ChangePasswordScreen({ onBack, onNavigateToForgotPassword, onLogout }: ChangePasswordScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const allRulesPassed = PASSWORD_RULES.every((rule) => rule.test(newPassword));
  const isFormValid = currentPassword.length > 0 && allRulesPassed && passwordsMatch;

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

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    const newErrors: Record<string, string> = { ...errors };

    if (field === 'currentPassword' && !currentPassword) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    } else {
      delete newErrors.currentPassword;
    }

    if (field === 'confirmPassword' && confirmPassword && !passwordsMatch) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    } else {
      delete newErrors.confirmPassword;
    }

    setErrors(newErrors);
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1800));

    setIsSubmitting(false);
    setShowSuccess(true);

    // Show toast notification
    showToast.success('Đổi mật khẩu thành công!', 'Vui lòng đăng nhập lại với mật khẩu mới');

    // Auto-logout and navigate to login after 2.5s
    setTimeout(() => {
      if (onLogout) {
        onLogout();
      } else {
        onBack();
      }
    }, 2500);
  };

  // Success overlay
  if (showSuccess) {
    return (
      <SafeAreaView style={[styles.successContainer, { backgroundColor: palette.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#10B981" />
          </View>
          <Text style={[styles.successTitle, { color: palette.textPrimary }]}>Đổi mật khẩu thành công!</Text>
          <Text style={[styles.successSubtitle, { color: palette.textSecondary }]}>
            Mật khẩu của bạn đã được cập nhật.{' \n'}Vui lòng đăng nhập lại để tiếp tục.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Đổi mật khẩu</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 120}
        enabled
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* ── Security notice ── */}
          <View style={styles.noticeContainer}>
          <View style={[styles.notice, { backgroundColor: isDarkMode ? 'rgba(85, 197, 241, 0.15)' : '#55C5F114', borderColor: isDarkMode ? 'rgba(85, 197, 241, 0.35)' : '#55C5F133' }]}>
            <View style={styles.noticeIcon}>
              <Ionicons name="information-circle" size={20} color="#55C5F1" />
            </View>
            <View style={styles.noticeTextContainer}>
              <Text style={[styles.noticeTitle, { color: palette.textPrimary }]}>Bảo mật tài khoản</Text>
              <Text style={[styles.noticeText, { color: palette.textSecondary }]}>
                Để bảo vệ tài khoản, hãy chọn mật khẩu mạnh và không chia sẻ với bất kỳ ai. Sau khi
                đổi mật khẩu, bạn sẽ cần đăng nhập lại trên các thiết bị khác.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Form ── */}
        <View style={styles.formContainer}>
          {/* Current Password */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: palette.textSecondary }]}>MẬT KHẨU HIỆN TẠI</Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: palette.surface, borderColor: palette.border },
                errors.currentPassword && touched.currentPassword && styles.inputContainerError,
              ]}
            >
              <FormTextField
                inputContainerStyle={styles.inputReset}
                style={[styles.input, { color: palette.textPrimary }]}
                leftIconName="lock-closed-outline"
                leftIconSize={18}
                leftIconColor={palette.textMuted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                onBlur={() => handleBlur('currentPassword')}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
                showPasswordToggle
                passwordIconColor={palette.textMuted}
              />
            </View>
            {errors.currentPassword && touched.currentPassword && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={12} color="#EF4444" />
                <Text style={styles.errorText}>{errors.currentPassword}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.forgotButton} 
              onPress={() => {
                if (onNavigateToForgotPassword) {
                  onNavigateToForgotPassword();
                }
              }}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* New Password */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: palette.textSecondary }]}>MẬT KHẨU MỚI</Text>
            <View style={[styles.inputContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <FormTextField
                inputContainerStyle={styles.inputReset}
                style={[styles.input, { color: palette.textPrimary }]}
                leftIconName="lock-closed-outline"
                leftIconSize={18}
                leftIconColor={palette.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
                showPasswordToggle
                passwordIconColor={palette.textMuted}
              />
            </View>

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                {/* Bar */}
                <View style={styles.strengthBar}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBarSegment,
                        {
                          backgroundColor: i < strength.score ? strength.color : '#E5E7EB',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>

                {/* Rules checklist */}
                <View style={styles.rulesContainer}>
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(newPassword);
                    return (
                      <View key={rule.id} style={styles.ruleItem}>
                        <Ionicons
                          name={passed ? 'checkmark-circle' : 'close-circle'}
                          size={15}
                          color={passed ? '#10B981' : '#D1D5DB'}
                        />
                        <Text style={[styles.ruleText, { color: passed ? '#10B981' : palette.textMuted }]}>
                          {rule.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: palette.textSecondary }]}>XÁC NHẬN MẬT KHẨU MỚI</Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: palette.surface, borderColor: palette.border },
                errors.confirmPassword && touched.confirmPassword && styles.inputContainerError,
                confirmPassword && passwordsMatch && styles.inputContainerSuccess,
              ]}
            >
              <FormTextField
                inputContainerStyle={styles.inputReset}
                style={[styles.input, { color: palette.textPrimary }]}
                leftIconName="lock-closed-outline"
                leftIconSize={18}
                leftIconColor={palette.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
                showPasswordToggle
                passwordIconColor={palette.textMuted}
                rightElement={confirmPassword.length > 0 ? (
                  <View style={styles.matchIndicator}>
                    <Ionicons
                      name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={passwordsMatch ? '#10B981' : '#EF4444'}
                    />
                  </View>
                ) : null}
              />
            </View>
            {errors.confirmPassword && touched.confirmPassword && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={12} color="#EF4444" />
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              </View>
            )}
            {confirmPassword && passwordsMatch && (
              <View style={styles.successContainer2}>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                <Text style={styles.successText}>Mật khẩu khớp</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Submit button ── */}
      <View style={[styles.submitContainer, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          style={[
            styles.submitButton,
            isFormValid && !isSubmitting ? styles.submitButtonEnabled : styles.submitButtonDisabled,
          ]}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <View style={styles.submitButtonContent}>
              <Ionicons name="sync" size={20} color="white" />
              <Text style={styles.submitButtonText}>Đang xử lý...</Text>
            </View>
          ) : (
            <View style={styles.submitButtonContent}>
              <Ionicons name="shield-checkmark" size={20} color={isFormValid ? 'white' : '#D1D5DB'} />
              <Text
                style={[
                  styles.submitButtonText,
                  !isFormValid && styles.submitButtonTextDisabled,
                ]}
              >
                Đổi mật khẩu
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 52,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Success screen
  successContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successContent: {
    alignItems: 'center',
  },
  successIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981' + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Notice
  noticeContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  notice: {
    backgroundColor: '#55C5F1' + '14',
    borderWidth: 1,
    borderColor: '#55C5F1' + '33',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#55C5F1' + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },

  // Form
  formContainer: {
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  inputContainerSuccess: {
    borderColor: '#10B981',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  inputReset: {
    flex: 1,
  },
  eyeButton: {
    padding: 4,
  },
  matchIndicator: {
    marginRight: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  successContainer2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
  },
  forgotButton: {
    marginTop: 8,
  },
  forgotText: {
    fontSize: 13,
    color: '#55C5F1',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 20,
  },

  // Strength
  strengthContainer: {
    marginTop: 12,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  strengthBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  rulesContainer: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 13,
  },

  // Submit
  submitContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  submitButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonEnabled: {
    backgroundColor: '#55C5F1',
    shadowColor: '#55C5F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  submitButtonTextDisabled: {
    color: '#D1D5DB',
  },
  bottomSpacer: {
    height: 20,
  },
});
