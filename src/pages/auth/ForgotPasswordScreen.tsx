import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { authService } from '../../api';
import FormTextField from '../../components/ui/FormTextField';
import OtpCodeInput, { type OtpCodeInputRef } from '../../components/ui/OtpCodeInput';
import { showToast } from '../../components/ui/Toast';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  prefillEmail?: string;
}

type Step = 'email' | 'otp' | 'newPassword' | 'success';

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

export default function ForgotPasswordScreen({
  onBack,
  prefillEmail,
}: ForgotPasswordScreenProps) {
  const otpInputRef = useRef<OtpCodeInputRef>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(prefillEmail || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otpError, setOtpError] = useState('');

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const allRulesPassed = PASSWORD_RULES.every((rule) => rule.test(newPassword));

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ── Step handlers ──

  const handleSendOTP = async () => {
    if (!isValidEmail) {
      setError('Vui lòng nhập email hợp lệ');
      return;
    }
    setError('');
    setIsLoading(true);

    const result = await authService.forgotPassword(email);
    console.log('Forgot Password Result:', result);

    setIsLoading(false);

    if (result.success) {
      showToast.success('Đã gửi mã OTP', 'Vui lòng kiểm tra email của bạn');
      setResendTimer(60);
      setStep('otp');
    } else {
      setError(result.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
      showToast.error('Lỗi', result.message || 'Không thể gửi mã OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError('Vui lòng nhập đủ 6 số');
      return;
    }
    setOtpError('');
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
      showToast.error('Lỗi', result.message || 'Không thể đặt lại mật khẩu');
    }
  };

  const handleGoBack = () => {
    if (step === 'otp') setStep('email');
    else if (step === 'newPassword') setStep('otp');
    else onBack();
  };

  // ── Success screen ──

  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Đặt lại mật khẩu thành công!</Text>
          <Text style={styles.successSubtitle}>
            Mật khẩu của bạn đã được cập nhật.{'\n'}Hãy sử dụng mật khẩu mới để đăng nhập.
          </Text>
          <TouchableOpacity onPress={onBack} style={styles.successButton} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color="white" />
            <Text style={styles.successButtonText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quên mật khẩu</Text>
      </View>

      {/* ── Step Indicator ── */}
      <StepIndicator currentStep={step} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 120}
        enabled
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* ═══ STEP 1: Email ═══ */}
        {step === 'email' && (
          <View style={styles.stepContent}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#55C5F1' + '1A' }]}>
                <Ionicons name="mail" size={36} color="#55C5F1" />
              </View>
              <Text style={styles.stepTitle}>Xác minh email của bạn</Text>
              <Text style={styles.stepDescription}>
                Nhập email đã đăng ký tài khoản SoundMates. Chúng tôi sẽ gửi mã xác thực 6 số đến
                email của bạn.
              </Text>
            </View>

            {/* Email input */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>EMAIL ĐĂNG KÝ</Text>
              <View style={[styles.inputContainer, error && styles.inputContainerError]}>
                <FormTextField
                  inputContainerStyle={styles.inputReset}
                  style={styles.input}
                  leftIconName="mail-outline"
                  leftIconSize={18}
                  leftIconColor="#9CA3AF"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError('');
                  }}
                  placeholder="example@soundmates.vn"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {isValidEmail && (
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.checkIcon} />
                )}
              </View>
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={12} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>

            {/* Info box */}
            <View style={styles.infoBox}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <Text style={styles.infoText}>
                Nếu bạn không nhận được email, hãy kiểm tra thư mục Spam hoặc thử lại sau vài phút.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={!isValidEmail || isLoading}
              style={[
                styles.submitButton,
                isValidEmail && !isLoading
                  ? styles.submitButtonEnabled
                  : styles.submitButtonDisabled,
              ]}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="sync" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Đang gửi...</Text>
                </View>
              ) : (
                <View style={styles.submitButtonContent}>
                  <Text style={[styles.submitButtonText, !isValidEmail && styles.submitButtonTextDisabled]}>
                    Gửi mã xác thực
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={isValidEmail ? 'white' : '#D1D5DB'} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ STEP 2: OTP ═══ */}
        {step === 'otp' && (
          <View style={styles.stepContent}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#A78BFA' + '1A' }]}>
                <Ionicons name="phone-portrait" size={36} color="#A78BFA" />
              </View>
              <Text style={styles.stepTitle}>Nhập mã xác thực</Text>
              <Text style={styles.stepDescription}>
                Mã xác thực 6 số đã được gửi đến{' '}
                <Text style={styles.emailHighlight}>{maskEmail(email)}</Text>
              </Text>
            </View>

            {/* OTP input */}
            <View style={styles.fieldContainer}>
              <OtpCodeInput
                ref={otpInputRef}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  setOtpError('');
                }}
                length={6}
                autoFocus
                containerStyle={styles.otpContainer}
                inputStyle={styles.otpInput}
                filledInputStyle={styles.otpInputFilled}
                editable={!isLoading}
              />
            </View>

            {/* OTP Error */}
            {otpError && (
              <View style={styles.errorContainerCenter}>
                <Ionicons name="alert-circle" size={12} color="#EF4444" />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            )}

            {/* Resend */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendLabel}>Chưa nhận được mã?</Text>
              {resendTimer > 0 ? (
                <Text style={styles.resendTimer}>Gửi lại sau {resendTimer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
                  <View style={styles.resendButton}>
                    <Ionicons name="refresh" size={12} color="#55C5F1" />
                    <Text style={styles.resendButtonText}>Gửi lại mã</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleVerifyOTP}
              disabled={otp.length !== 6 || isLoading}
              style={[
                styles.submitButton,
                otp.length === 6 && !isLoading
                  ? styles.submitButtonEnabled
                  : styles.submitButtonDisabled,
              ]}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="sync" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Đang xác thực...</Text>
                </View>
              ) : (
                <View style={styles.submitButtonContent}>
                  <Text style={[styles.submitButtonText, otp.length !== 6 && styles.submitButtonTextDisabled]}>
                    Xác nhận
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={otp.length === 6 ? 'white' : '#D1D5DB'} />
                </View>
              )}
            </TouchableOpacity>

            {/* Change email */}
            <TouchableOpacity
              onPress={() => {
                setStep('email');
                setOtp('');
                setOtpError('');
              }}
              style={styles.changeEmailButton}
            >
              <Text style={styles.changeEmailText}>Thay đổi email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ STEP 3: New Password ═══ */}
        {step === 'newPassword' && (
          <View style={styles.stepContent}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#10B981' + '1A' }]}>
                <Ionicons name="key" size={36} color="#10B981" />
              </View>
              <Text style={styles.stepTitle}>Tạo mật khẩu mới</Text>
              <Text style={styles.stepDescription}>
                Chọn mật khẩu mạnh để bảo vệ tài khoản của bạn. Mật khẩu mới không được trùng với
                mật khẩu cũ.
              </Text>
            </View>

            {/* New Password */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>MẬT KHẨU MỚI</Text>
              <View style={styles.inputContainer}>
                <FormTextField
                  inputContainerStyle={styles.inputReset}
                  style={styles.input}
                  leftIconName="lock-closed-outline"
                  leftIconSize={18}
                  leftIconColor="#9CA3AF"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor="#D1D5DB"
                  secureTextEntry
                  showPasswordToggle
                  passwordIconColor="#9CA3AF"
                />
              </View>

              {/* Strength bar */}
              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
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
                          <Text style={[styles.ruleText, { color: passed ? '#10B981' : '#9CA3AF' }]}>
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
              <Text style={styles.label}>XÁC NHẬN MẬT KHẨU MỚI</Text>
              <View
                style={[
                  styles.inputContainer,
                  confirmPassword && !passwordsMatch && styles.inputContainerError,
                  confirmPassword && passwordsMatch && styles.inputContainerSuccess,
                ]}
              >
                <FormTextField
                  inputContainerStyle={styles.inputReset}
                  style={styles.input}
                  leftIconName="lock-closed-outline"
                  leftIconSize={18}
                  leftIconColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor="#D1D5DB"
                  secureTextEntry
                  showPasswordToggle
                  passwordIconColor="#9CA3AF"
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
              {confirmPassword && !passwordsMatch && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={12} color="#EF4444" />
                  <Text style={styles.errorText}>Mật khẩu xác nhận không khớp</Text>
                </View>
              )}
              {confirmPassword && passwordsMatch && (
                <View style={styles.successContainer2}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={styles.successText}>Mật khẩu khớp</Text>
                </View>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={!allRulesPassed || !passwordsMatch || isLoading}
              style={[
                styles.submitButton,
                allRulesPassed && passwordsMatch && !isLoading
                  ? styles.submitButtonEnabled
                  : styles.submitButtonDisabled,
              ]}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="sync" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Đang xử lý...</Text>
                </View>
              ) : (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="shield-checkmark" size={20} color={allRulesPassed && passwordsMatch ? 'white' : '#D1D5DB'} />
                  <Text
                    style={[
                      styles.submitButtonText,
                      (!allRulesPassed || !passwordsMatch) && styles.submitButtonTextDisabled,
                    ]}
                  >
                    Đặt lại mật khẩu
                  </Text>
                </View>
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
    backgroundColor: '#FAFAFA',
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
    paddingBottom: 40,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepCircleActive: {
    backgroundColor: '#55C5F1',
  },
  stepCircleInactive: {
    backgroundColor: '#F3F4F6',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepNumberInactive: {
    color: '#9CA3AF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#55C5F1',
  },
  stepLabelCompleted: {
    color: '#10B981',
  },
  stepLabelInactive: {
    color: '#9CA3AF',
  },
  stepDivider: {
    width: 32,
    height: 2,
    borderRadius: 1,
  },
  stepDividerCompleted: {
    backgroundColor: '#10B981',
  },
  stepDividerInactive: {
    backgroundColor: '#E5E7EB',
  },

  // Content
  stepContent: {
    paddingHorizontal: 20,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  emailHighlight: {
    fontWeight: '600',
    color: '#1E293B',
  },

  // Form fields
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
  checkIcon: {
    marginLeft: 8,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
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
  errorContainerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 16,
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

  // Info box
  infoBox: {
    backgroundColor: '#F59E0B' + '14',
    borderWidth: 1,
    borderColor: '#F59E0B' + '33',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },

  // OTP Input
  otpContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  otpInput: {
    width: 48,
    height: 56,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    color: '#1E293B',
  },
  otpInputFilled: {
    borderColor: '#55C5F1',
    backgroundColor: '#55C5F1' + '0D',
  },

  // Resend
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 24,
  },
  resendLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  resendTimer: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#55C5F1',
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

  // Submit button
  submitButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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

  // Change email
  changeEmailButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  changeEmailText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
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
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 32,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 280,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#55C5F1',
    shadowColor: '#55C5F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
