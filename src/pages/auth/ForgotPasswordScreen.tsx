import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { showToast } from '../../components/ui/Toast';
import { SoundMateDarkColors, SoundMateLightColors } from '../../../constants/theme';
import { authService } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import OtpCodeInput, { type OtpCodeInputRef } from '../../components/ui/OtpCodeInput';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  prefillEmail?: string;
}

type Step = 'email' | 'otp' | 'newPassword' | 'success';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Helpers ────────────────────────────────────────────

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: 'Rất yếu', color: '#EF4444' },
    { score: 1, label: 'Yếu', color: '#F97316' },
    { score: 2, label: 'Trung bình', color: '#F59E0B' },
    { score: 3, label: 'Mạnh', color: '#10B981' },
    { score: 4, label: 'Rất mạnh', color: '#059669' },
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

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (name.length <= 3) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 3)}***@${domain}`;
}

// ─── Step Indicator ─────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'otp', label: 'Xác thực' },
    { key: 'newPassword', label: 'Mật khẩu' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex || currentStep === 'success';
        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  isCompleted
                    ? styles.stepCircleCompleted
                    : isActive
                      ? styles.stepCircleActive
                      : styles.stepCircleInactive,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isActive ? styles.stepNumberActive : styles.stepNumberInactive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive
                    ? styles.stepLabelActive
                    : isCompleted
                      ? styles.stepLabelCompleted
                      : styles.stepLabelInactive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepDivider,
                  isCompleted ? styles.stepDividerCompleted : styles.stepDividerInactive,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function ForgotPasswordScreen({ onBack, prefillEmail }: ForgotPasswordScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateDarkColors : SoundMateLightColors;
  const otpInputRef = useRef<OtpCodeInputRef>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(prefillEmail || '');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const buttonScale = useSharedValue(1);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const allRulesPassed = PASSWORD_RULES.every((rule) => rule.test(newPassword));

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handlePressIn = useCallback(() => {
    buttonScale.value = withSpring(0.96);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [buttonScale]);

  const handlePressOut = useCallback(() => {
    buttonScale.value = withSpring(1);
  }, [buttonScale]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSendOTP = async () => {
    if (!isValidEmail) {
      setError('Vui lòng nhập email hợp lệ');
      return;
    }
    setError('');
    setIsLoading(true);
    const result = await authService.forgotPassword(email);
    setIsLoading(false);
    if (result.success) {
      showToast.success('Đã gửi mã OTP', 'Kiểm tra email của bạn');
      setResendTimer(60);
      setStep('otp');
    } else {
      setError(result.message || 'Lỗi gửi mã');
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      showToast.warning('Lỗi', 'Vui lòng nhập đủ 6 số');
      return;
    }
    setStep('newPassword');
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);

    const result = await authService.forgotPassword(email);

    setIsLoading(false);

    if (result.success) {
      showToast.success('Đã gửi lại mã OTP', 'Vui lòng kiểm tra email của bạn');
      setOtp('');
      setOtpError('');
      setResendTimer(60);
      otpInputRef.current?.focus(0);
    } else {
      showToast.error('Lỗi', result.message || 'Không thể gửi lại mã OTP');
    }
  };

  const handleResetPassword = async () => {
    if (!allRulesPassed || !passwordsMatch) return;
    setIsLoading(true);
    const result = await authService.resetPassword(email, otp, newPassword);
    setIsLoading(false);
    if (result.success) {
      showToast.success('Thành công', 'Mật khẩu đã được đặt lại');
      setStep('success');
    } else {
      showToast.error('Lỗi', result.message);
    }
  };

  const handleGoBack = () => {
    if (step === 'otp') setStep('email');
    else if (step === 'newPassword') setStep('otp');
    else onBack();
  };

  if (step === 'success') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={isDarkMode ? ['#050B18', '#0A1120', '#000000'] : ['#E0F7FF', '#FFFFFF', '#F0F9FF']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.successContainer}>
          <Animated.View entering={FadeInUp.duration(800)} style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={80} color={palette.success} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(800)}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Thành công!</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Mật khẩu của bạn đã được cập nhật thành công.</Text>
            <AnimatedTouchableOpacity
              style={[styles.submitButtonWrapper, buttonAnimatedStyle]}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={onBack}
            >
              <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.submitButton}>
                <Text style={styles.submitButtonText}>Quay lại đăng nhập</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDarkMode ? ['#050B18', '#0A1120', '#000000'] : ['#E0F7FF', '#FFFFFF', '#F0F9FF']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={[styles.backButton, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={24} color={palette.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Quên mật khẩu</Text>
      </View>

      <StepIndicator currentStep={step} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {step === 'email' && (
            <Animated.View entering={FadeInDown.duration(600)}>
              <View style={styles.illustrationContainer}>
                <View style={[styles.iconCircle, { backgroundColor: palette.surface }]}>
                  <Ionicons name="mail-open" size={40} color={palette.primary} />
                </View>
                <Text style={[styles.title, { color: palette.textPrimary }]}>Nhập email</Text>
                <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Chúng tôi sẽ gửi mã xác thực đến email của bạn</Text>
              </View>

              <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { borderColor: palette.border }]}>
                <Ionicons name="mail-outline" size={20} color={palette.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: palette.textPrimary }]}
                  placeholder="Email đăng ký"
                  placeholderTextColor={palette.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </BlurView>

              <AnimatedTouchableOpacity
                style={[styles.submitButtonWrapper, buttonAnimatedStyle]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleSendOTP}
                disabled={!isValidEmail || isLoading}
              >
                <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.submitButton}>
                  <Text style={styles.submitButtonText}>{isLoading ? 'Đang gửi...' : 'Tiếp tục'}</Text>
                </LinearGradient>
              </AnimatedTouchableOpacity>
            </Animated.View>
          )}

          {step === 'otp' && (
            <Animated.View entering={FadeInDown.duration(600)}>
              <View style={styles.illustrationContainer}>
                <View style={[styles.iconCircle, { backgroundColor: palette.surface }]}>
                  <Ionicons name="shield-checkmark" size={40} color={palette.primary} />
                </View>
                <Text style={[styles.title, { color: palette.textPrimary }]}>Xác thực</Text>
                <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Nhập mã 6 số đã được gửi đến {maskEmail(email)}</Text>
              </View>

              <View style={styles.otpWrapper}>
                <OtpCodeInput
                  ref={otpInputRef}
                  value={otp}
                  onChange={(val) => { setOtp(val); setOtpError(''); }}
                  length={6}
                  autoFocus
                  containerStyle={styles.otpContainer}
                  inputStyle={styles.otpInput}
                  filledInputStyle={styles.otpInputFilled}
                  editable={!isLoading}
                />
              </View>

              {otpError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{otpError}</Text>
                </View>
              ) : null}

              <AnimatedTouchableOpacity
                style={[styles.submitButtonWrapper, buttonAnimatedStyle]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleVerifyOTP}
              >
                <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.submitButton}>
                  <Text style={styles.submitButtonText}>Xác nhận</Text>
                </LinearGradient>
              </AnimatedTouchableOpacity>

              <TouchableOpacity style={styles.resendButton} disabled={resendTimer > 0}>
                <Text style={[styles.resendText, resendTimer > 0 && { color: '#AAA' }]}>
                  {resendTimer > 0 ? `Gửi lại sau ${resendTimer}s` : 'Gửi lại mã'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === 'newPassword' && (
            <Animated.View entering={FadeInDown.duration(600)}>
              <View style={styles.illustrationContainer}>
                <View style={[styles.iconCircle, { backgroundColor: palette.surface }]}>
                  <Ionicons name="lock-open" size={40} color={palette.primary} />
                </View>
                <Text style={[styles.title, { color: palette.textPrimary }]}>Mật khẩu mới</Text>
                <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Tạo mật khẩu mới an toàn hơn</Text>
              </View>

              <View style={{ gap: 12 }}>
                <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { borderColor: palette.border }]}>
                  <TextInput
                    style={[styles.input, { color: palette.textPrimary }]}
                    placeholder="Mật khẩu mới"
                    placeholderTextColor={palette.textMuted}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={20} color={palette.textMuted} />
                  </TouchableOpacity>
                </BlurView>

                <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputWrapper, { borderColor: palette.border }]}>
                  <TextInput
                    style={[styles.input, { color: palette.textPrimary }]}
                    placeholder="Xác nhận mật khẩu"
                    placeholderTextColor={palette.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color={palette.textMuted} />
                  </TouchableOpacity>
                </BlurView>
              </View>

              <AnimatedTouchableOpacity
                style={[styles.submitButtonWrapper, buttonAnimatedStyle]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleResetPassword}
                disabled={!allRulesPassed || !passwordsMatch || isLoading}
              >
                <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.submitButton}>
                  <Text style={styles.submitButtonText}>{isLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</Text>
                </LinearGradient>
              </AnimatedTouchableOpacity>
            </Animated.View>
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
    paddingHorizontal: 20,
    height: 60,
    marginTop: Platform.OS === 'ios' ? 40 : 0,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 15,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: SoundMateLightColors.primary,
  },
  stepCircleInactive: {
    backgroundColor: '#E0E0E0',
  },
  stepCircleCompleted: {
    backgroundColor: SoundMateLightColors.success,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepNumberInactive: {
    color: '#9CA3AF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  stepLabelActive: {
    color: SoundMateLightColors.primary,
  },
  stepLabelCompleted: {
    color: SoundMateLightColors.success,
  },
  stepLabelInactive: {
    color: '#9CA3AF',
  },
  stepDivider: {
    width: 20,
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  stepDividerCompleted: {
    backgroundColor: SoundMateLightColors.success,
  },
  stepDividerInactive: {
    backgroundColor: '#E0E0E0',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SoundMateLightColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  otpWrapper: {
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpInput: {
    flex: 1,
    height: 56,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    color: '#1E293B',
    marginHorizontal: 4,
  },
  otpInputFilled: {
    borderColor: SoundMateLightColors.primary,
    backgroundColor: SoundMateLightColors.primary + '0D',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  submitButtonWrapper: {
    marginTop: 10,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: SoundMateLightColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: SoundMateLightColors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successIconCircle: {
    marginBottom: 30,
  },
});
