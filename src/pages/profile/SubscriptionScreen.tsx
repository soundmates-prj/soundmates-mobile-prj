import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { paymentService, type SubscriptionPlanResponse } from '../../api/paymentService';
import { useTheme } from '../../context/ThemeContext';

interface SubscriptionScreenProps {
  onBack: () => void;
  onSelectPlan: (plan: {
    id: string;
    name: string;
    price: number;
    priceLabel: string;
    period: string;
    description: string;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    icon: IconName;
    durationDays?: number;
  }) => void;
}

interface PlanFeature {
  text: string;
  bold?: string;
  highlight?: boolean;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Plan {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  description: string;
  features: PlanFeature[];
  color: string;
  gradientFrom: string;
  gradientTo: string;
  icon: IconName;
  tier: 'free' | 'standard' | 'premium' | 'other';
  durationDays: number;
  requestLimit: number;
  popular?: boolean;
  current?: boolean;
  includesFree?: boolean;
}

const DEFAULT_FREE_PLAN_NAME = 'Miễn Phí';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const detectPlanTier = (plan: SubscriptionPlanResponse): Plan['tier'] => {
  if (plan.price === 0) return 'free';

  const name = normalizeText(plan.planName || '');
  if (name.includes('premium') || name.includes('elite') || name.includes('hoi vien')) {
    return 'premium';
  }
  if (name.includes('standard') || name.includes('tieu chuan')) {
    return 'standard';
  }

  return 'other';
};

const getTierOrder = (tier: Plan['tier']) => {
  switch (tier) {
    case 'free':
      return 0;
    case 'standard':
      return 1;
    case 'premium':
      return 2;
    default:
      return 3;
  }
};

const getPlanFeatures = (plan: SubscriptionPlanResponse, tier: Plan['tier']): PlanFeature[] => {
  const features: PlanFeature[] = [
    { text: 'Nghe podcast/music không giới hạn' },
    { text: 'Tham gia phiên live trực tuyến' },
    { text: 'Gửi request phát nhạc ', bold: `${plan.requestLimit} request/ngày` },
  ];

  if (tier === 'free') {
    features.push({ text: 'Chất lượng âm thanh tiêu chuẩn' });
    return features;
  }

  if (tier === 'premium') {
    features.push({ text: 'Tạo giọng đọc AI dựa trên giọng thật của bạn ', bold: '(Nâng cao)' });
    features.push({ text: 'Ưu tiên request khi tham gia phòng live' });
    features.push({ text: 'Áp dụng các ', bold: 'Theme mới nhất của nền tảng' });
    features.push({ text: 'Gửi thư podcast trực tuyến trong livestream' });
    return features;
  }

  features.push({ text: 'Tạo giọng đọc AI dựa trên giọng thật của bạn ', bold: '(Giới hạn)' });
  features.push({ text: 'Áp dụng các ', bold: 'Theme cơ bản' });
  features.push({ text: 'Gửi thư podcast trực tuyến trong livestream' });
  return features;
};

const mapPlanTheme = (tier: Plan['tier']) => {
  switch (tier) {
    case 'free':
      return {
        color: '#6B7280',
        gradientFrom: '#F3F4F6',
        gradientTo: '#E5E7EB',
        icon: 'headset-outline' as IconName,
      };
    case 'standard':
      return {
        color: '#A78BFA',
        gradientFrom: '#A78BFA',
        gradientTo: '#7C3AED',
        icon: 'star-outline' as IconName,
      };
    case 'premium':
      return {
        color: '#55C5F1',
        gradientFrom: '#55C5F1',
        gradientTo: '#3B82F6',
        icon: 'diamond-outline' as IconName,
      };
    default:
      return {
        color: '#3C5F99',
        gradientFrom: '#3C5F99',
        gradientTo: '#55C5F1',
        icon: 'shield-checkmark-outline' as IconName,
      };
  }
};

const toDisplayPlan = (plan: SubscriptionPlanResponse): Plan => {
  const tier = detectPlanTier(plan);
  const theme = mapPlanTheme(tier);

  return {
    id: plan.id,
    name: plan.planName,
    price: Number(plan.price || 0),
    priceLabel: Number(plan.price || 0).toLocaleString('vi-VN'),
    period: Number(plan.price || 0) > 0 ? `/${plan.durationDays} Ngày` : '',
    description: plan.description || 'Nâng cao trải nghiệm âm nhạc cùng SoundMates',
    features: getPlanFeatures(plan, tier),
    color: theme.color,
    gradientFrom: theme.gradientFrom,
    gradientTo: theme.gradientTo,
    icon: theme.icon,
    tier,
    durationDays: Number(plan.durationDays || 0),
    requestLimit: Number(plan.requestLimit || 0),
    popular: tier === 'premium',
    includesFree: Number(plan.price || 0) > 0,
  };
};

const FEATURE_ICONS: IconName[] = [
  'mic-outline',
  'musical-notes-outline',
  'radio-outline',
  'color-palette-outline',
  'mail-outline',
];

const withAlpha = (hexColor: string, alphaHex: string) => {
  if (!hexColor.startsWith('#')) return hexColor;
  if (hexColor.length === 7 || hexColor.length === 4) {
    return `${hexColor}${alphaHex}`;
  }
  return hexColor;
};

function PlanCard({
  plan,
  isSelected,
  onSelect,
  onPurchase,
  palette,
  isDarkMode,
}: {
  plan: Plan;
  isSelected: boolean;
  onSelect: () => void;
  onPurchase: () => void;
  palette: typeof SoundMateLightColors | typeof SoundMateColors;
  isDarkMode: boolean;
}) {
  const isPremium = plan.tier === 'premium';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onSelect}
      style={[
        styles.planCard,
        { backgroundColor: palette.surface },
        isSelected
          ? isPremium
            ? styles.planCardPremiumSelected
            : { borderColor: plan.color, shadowColor: plan.color, shadowOpacity: 0.2, elevation: 5 }
          : styles.planCardDefault,
      ]}
    >
      {plan.popular && (
        <View style={styles.planBadgeWrapper}>
          <View style={styles.popularBadge}>
            <Ionicons name="sparkles-outline" size={12} color="#1E293B" />
            <Text style={styles.popularBadgeText}>Phổ biến nhất</Text>
          </View>
        </View>
      )}

      {plan.current && (
        <View style={styles.planBadgeWrapper}>
          <View style={styles.currentBadge}>
            <Ionicons name="checkmark" size={12} color="white" />
            <Text style={styles.currentBadgeText}>Gói hiện tại</Text>
          </View>
        </View>
      )}

      <View style={[styles.planHeader, isPremium ? styles.planHeaderPremium : [styles.planHeaderDefault, { backgroundColor: isDarkMode ? '#111827' : '#F8FAFC' }]]}>
        {isPremium && (
          <>
            <LinearGradient
              colors={[plan.gradientFrom, plan.gradientTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.planDecorCircleTop} />
            <View style={styles.planDecorCircleBottom} />
          </>
        )}

        <View style={styles.planHeaderContent}>
          <View style={styles.planNameRow}>
            <View
              style={[
                styles.planIconWrap,
                isPremium
                  ? styles.planIconWrapPremium
                  : { backgroundColor: withAlpha(plan.color, '15') },
              ]}
            >
              <Ionicons name={plan.icon} size={22} color={isPremium ? 'white' : plan.color} />
            </View>
            <Text style={[styles.planName, isPremium ? styles.planNamePremium : [styles.planNameDefault, { color: palette.textPrimary }]]}>
              {plan.name}
            </Text>
          </View>

          <View style={styles.planPriceRow}>
            <Text style={[styles.planCurrency, isPremium ? styles.planMutedPremium : styles.planMutedDefault]}>
              đ
            </Text>
            <Text style={[styles.planPrice, isPremium ? styles.planPricePremium : styles.planPriceDefault]}>
              {plan.priceLabel}
            </Text>
            {!!plan.period && (
              <Text style={[styles.planPeriod, isPremium ? styles.planMutedPremium : [styles.planMutedDefault, { color: palette.textMuted }]]}>
                {plan.period}
              </Text>
            )}
          </View>

          <Text style={[styles.planDescription, isPremium ? styles.planDescriptionPremium : [styles.planDescriptionDefault, { color: palette.textSecondary }]]}>
            {plan.description}
          </Text>
        </View>
      </View>

      <View style={[styles.planFeaturesSection, { backgroundColor: palette.surface }]}> 
        <Text style={[styles.planFeatureTitle, { color: palette.textMuted }]}>Đặc quyền:</Text>
        <View style={styles.planFeatureList}>
          {plan.features.map((feature, i) => {
            const featureIcon = FEATURE_ICONS[i % FEATURE_ICONS.length];

            return (
              <View key={`${plan.id}-${i}`} style={styles.planFeatureRow}>
                <View
                  style={[
                    styles.planFeatureIconWrap,
                    { backgroundColor: withAlpha(plan.color, '12') },
                  ]}
                >
                  <Ionicons name={featureIcon} size={12} color={plan.color} />
                </View>
                <Text style={[styles.planFeatureText, { color: palette.textPrimary }]}>
                  {feature.text}
                  {!!feature.bold && <Text style={[styles.planFeatureBold, { color: palette.textPrimary }]}>{feature.bold}</Text>}
                </Text>
              </View>
            );
          })}
        </View>

        {plan.includesFree && (
          <View style={[styles.includesFreeWrap, { borderTopColor: palette.border }]}>
            <Text style={styles.includesFreeText}>
              <Ionicons name="gift-outline" size={13} color="#3C5F99" /> Đã bao gồm tất cả các tính năng miễn phí
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.planCtaWrap, { backgroundColor: palette.surface }]}>
        {plan.current ? (
          <View style={[styles.planCta, styles.planCtaCurrent]}>
            <Text style={[styles.planCtaText, styles.planCtaTextLight]}>Gói hiện tại của bạn</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPurchase}
            style={[
              styles.planCta,
              isPremium ? styles.planCtaPremium : styles.planCtaStandard,
            ]}
          >
            <Text
              style={[
                styles.planCtaText,
                isPremium ? styles.planCtaTextLight : styles.planCtaTextDark,
              ]}
            >
              Mua Ngay
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// PaymentModal removed — payment flow now uses a dedicated PaymentCheckoutScreen

function ComparisonSection({
  palette,
  isDarkMode,
}: {
  palette: typeof SoundMateLightColors | typeof SoundMateColors;
  isDarkMode: boolean;
}) {
  const features: {
    label: string;
    free: boolean | string;
    standard: boolean | string;
    premium: boolean | string;
  }[] = [
      { label: 'Nghe nhạc & podcast', free: true, standard: true, premium: true },
      { label: 'Tham gia phiên live', free: true, standard: true, premium: true },
      { label: 'Request phát nhạc', free: '3/ngày', standard: '10/ngày', premium: 'Không giới hạn' },
      { label: 'Giọng đọc AI', free: false, standard: '1 giọng', premium: '5 req/tuần' },
      { label: 'Áp dụng Themes', free: false, standard: true, premium: true },
      { label: 'Podcast trong live', free: false, standard: true, premium: true },
      { label: 'Ưu tiên request live', free: false, standard: false, premium: true },
    ];

  return (
    <View style={styles.comparisonContainer}>
      <View style={styles.comparisonTitleRow}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#55C5F1" />
        <Text style={[styles.comparisonTitle, { color: palette.textPrimary }]}>So sánh các gói</Text>
      </View>

      <View style={[styles.comparisonTable, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={[styles.comparisonHeaderRow, { borderBottomColor: palette.border, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }]}>
          <View style={[styles.comparisonCell, styles.comparisonFeatureCell]}>
            <Text style={[styles.comparisonHeaderText, { color: palette.textMuted }]}>Tính năng</Text>
          </View>
          <View style={styles.comparisonCell}>
            <Text style={[styles.comparisonHeaderText, styles.comparisonHeaderFree]}>Miễn phí</Text>
          </View>
          <View style={styles.comparisonCell}>
            <Text style={[styles.comparisonHeaderText, styles.comparisonHeaderStandard]}>Tiêu chuẩn</Text>
          </View>
          <View style={styles.comparisonCell}>
            <Text style={[styles.comparisonHeaderText, styles.comparisonHeaderPremium]}>Hội viên</Text>
          </View>
        </View>

        {features.map((feature, index) => (
          <View
            key={feature.label}
            style={[
              styles.comparisonDataRow,
              index < features.length - 1 ? [styles.comparisonDataRowBorder, { borderBottomColor: palette.border }] : undefined,
            ]}
          >
            <View style={[styles.comparisonCell, styles.comparisonFeatureCell]}>
              <Text style={[styles.comparisonFeatureText, { color: palette.textPrimary }]}>{feature.label}</Text>
            </View>
            {[feature.free, feature.standard, feature.premium].map((value, idx) => (
              <View key={`${feature.label}-${idx}`} style={styles.comparisonCell}>
                {value === true ? (
                  <Ionicons name="checkmark" size={16} color="#10B981" />
                ) : value === false ? (
                  <Ionicons name="close" size={14} color={palette.textMuted} />
                ) : (
                  <Text style={[styles.comparisonTextValue, { color: palette.textPrimary }]}>{value}</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function FAQItem({
  question,
  answer,
  palette,
  isDarkMode,
}: {
  question: string;
  answer: string;
  palette: typeof SoundMateLightColors | typeof SoundMateColors;
  isDarkMode: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.faqItemContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
      <TouchableOpacity activeOpacity={0.9} onPress={() => setIsOpen((prev) => !prev)} style={styles.faqItemButton}>
        <Text style={[styles.faqQuestion, { color: palette.textPrimary }]}>{question}</Text>
        <View style={[styles.faqChevronWrap, isOpen ? styles.faqChevronOpen : undefined]}>
          <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.faqAnswerWrap}>
          <Text style={[styles.faqAnswer, { color: palette.textSecondary }]}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function SubscriptionScreen({ onBack, onSelectPlan }: SubscriptionScreenProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setLoadError(null);

    try {
      const [plansResult, mySubscriptionResult] = await Promise.all([
        paymentService.getSubscriptionPlans(),
        paymentService.getMySubscription(),
      ]);

      if (!plansResult.success || !plansResult.data?.length) {
        setLoadError(plansResult.message || 'Không thể tải danh sách gói đăng ký');
        setPlans([]);
        return;
      }

      const activePlans = plansResult.data
        .filter((plan) => plan.isActive)
        .sort((a, b) => {
          const tierOrder = getTierOrder(detectPlanTier(a)) - getTierOrder(detectPlanTier(b));
          if (tierOrder !== 0) return tierOrder;
          return a.price - b.price;
        });

      if (!activePlans.length) {
        setLoadError('Hiện chưa có gói đăng ký khả dụng. Vui lòng thử lại sau.');
        setPlans([]);
        return;
      }

      const mappedPlans = activePlans.map(toDisplayPlan);

      const activeMySubscription =
        mySubscriptionResult.success
          && mySubscriptionResult.data
          && mySubscriptionResult.data.status?.toLowerCase() === 'active'
          ? mySubscriptionResult.data
          : null;

      const resolvedCurrentPlanId =
        activeMySubscription?.planId
        || mappedPlans.find((plan) => plan.price === 0)?.id
        || null;

      setCurrentPlanId(resolvedCurrentPlanId);

      const nextPlans = mappedPlans.map((plan) => ({
        ...plan,
        current: resolvedCurrentPlanId === plan.id,
      }));

      setPlans(nextPlans);

      const preferredSelectedPlan =
        nextPlans.find((plan) => plan.id === resolvedCurrentPlanId)?.id
        || nextPlans.find((plan) => plan.price > 0)?.id
        || nextPlans[0]?.id
        || '';

      setSelectedPlan(preferredSelectedPlan);
    } catch (error) {
      console.log('[SubscriptionScreen] loadPlans error:', error);
      setLoadError('Không thể tải danh sách gói đăng ký. Vui lòng thử lại.');
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  // Tap card → chỉ highlight gói, KHÔNG chuyển trang
  const handleHighlightPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  // Bấm nút "Mua Ngay" → chuyển sang PaymentCheckoutScreen
  const handlePurchasePlan = (plan: Plan) => {
    if (!plan.current && plan.price > 0) {
      onSelectPlan({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        priceLabel: plan.priceLabel,
        period: plan.period,
        description: plan.description,
        color: plan.color,
        gradientFrom: plan.gradientFrom,
        gradientTo: plan.gradientTo,
        icon: plan.icon,
        durationDays: plan.durationDays,
      });
    }
  };

  const currentPlan = plans.find((plan) => plan.id === currentPlanId) || null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['left', 'right']}>
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <TouchableOpacity activeOpacity={0.85} onPress={onBack} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={22} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Gói đăng ký</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <LinearGradient
            colors={['#55C5F1', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.titleIconWrap}
          >
            <Ionicons name="diamond-outline" size={28} color="white" />
          </LinearGradient>
          <Text style={[styles.titleMain, { color: palette.textPrimary }]}>Nâng cấp trải nghiệm</Text>
          <Text style={[styles.titleDescription, { color: palette.textSecondary }]}>
            Chọn gói phù hợp để mở khóa toàn bộ tính năng của SoundMates
          </Text>
        </View>

        <View style={styles.currentPlanBannerContainer}>
          <LinearGradient
            colors={['#3C5F99', '#55C5F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.currentPlanBanner}
          >
            <View style={styles.currentPlanIconWrap}>
              <Ionicons name="headset-outline" size={22} color="white" />
            </View>
            <View style={styles.currentPlanTextWrap}>
              <Text style={styles.currentPlanCaption}>Gói hiện tại của bạn</Text>
              <Text style={styles.currentPlanName}>{currentPlan?.name || DEFAULT_FREE_PLAN_NAME}</Text>
            </View>
            <View style={styles.currentPlanForeverTag}>
              <Ionicons name="time-outline" size={12} color="white" />
              <Text style={styles.currentPlanForeverText}>
                {currentPlan?.price === 0
                  ? 'Vĩnh viễn'
                  : `${currentPlan?.durationDays || 0} ngày`}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.planListContainer}>
          {loadingPlans ? (
            <View style={styles.loadStateWrap}>
              <ActivityIndicator size="small" color="#55C5F1" />
              <Text style={[styles.loadStateText, { color: palette.textSecondary }]}>Đang tải danh sách gói...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.loadStateWrap}>
              <Text style={[styles.loadStateText, { color: palette.textSecondary, textAlign: 'center' }]}>{loadError}</Text>
              <TouchableOpacity activeOpacity={0.85} style={styles.retryButton} onPress={() => void loadPlans()}>
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlan === plan.id}
                onSelect={() => handleHighlightPlan(plan.id)}
                onPurchase={() => handlePurchasePlan(plan)}
                palette={palette}
                isDarkMode={isDarkMode}
              />
            ))
          )}
        </View>

        {/* <ComparisonSection palette={palette} isDarkMode={isDarkMode} /> */}

        <View style={styles.faqSection}>
          <View style={styles.faqSectionTitleRow}>
            <Ionicons name="alert-circle-outline" size={18} color="#55C5F1" />
            <Text style={[styles.faqSectionTitle, { color: palette.textPrimary }]}>Câu hỏi thường gặp</Text>
          </View>

          <View style={styles.faqList}>
            {[
              {
                q: 'Tôi có thể hủy gói bất kỳ lúc nào không?',
                a: 'Có, bạn có thể hủy gói đăng ký bất kỳ lúc nào. Gói sẽ vẫn hoạt động đến hết kỳ thanh toán hiện tại.',
              },
              {
                q: 'Thanh toán có an toàn không?',
                a: 'Hoàn toàn an toàn. Chúng tôi sử dụng các cổng thanh toán uy tín và mã hóa SSL 256-bit.',
              },
              {
                q: 'Tôi có thể đổi gói không?',
                a: 'Có, bạn có thể nâng cấp hoặc hạ cấp gói bất kỳ lúc nào. Phần chênh lệch sẽ được tính theo ngày sử dụng.',
              },
            ].map((faq) => (
              <FAQItem key={faq.q} question={faq.q} answer={faq.a} palette={palette} isDarkMode={isDarkMode} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* PaymentModal removed — payment handled by PaymentCheckoutScreen */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  titleIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#55C5F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 7,
  },
  titleMain: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
  },

  currentPlanBannerContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  currentPlanBanner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPlanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentPlanTextWrap: {
    flex: 1,
  },
  currentPlanCaption: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  currentPlanName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  currentPlanForeverTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    gap: 4,
  },
  currentPlanForeverText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },

  planListContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  loadStateWrap: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  loadStateText: {
    fontSize: 13,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#55C5F1',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  planCardDefault: {
    borderColor: '#E5E7EB',
  },
  planCardPremiumSelected: {
    borderColor: '#55C5F1',
    shadowColor: '#55C5F1',
    shadowOpacity: 0.2,
    elevation: 6,
  },
  planBadgeWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  popularBadge: {
    backgroundColor: '#67F700',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  currentBadge: {
    backgroundColor: '#3C5F99',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },

  planHeader: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  planHeaderPremium: {
    backgroundColor: '#55C5F1',
  },
  planHeaderDefault: {
    backgroundColor: '#F8FAFC',
  },
  planDecorCircleTop: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  planDecorCircleBottom: {
    position: 'absolute',
    left: -15,
    bottom: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  planHeaderContent: {
    zIndex: 5,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconWrapPremium: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
  },
  planNamePremium: {
    color: 'white',
  },
  planNameDefault: {
    color: '#1E293B',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  planCurrency: {
    fontSize: 14,
    marginBottom: 6,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
    marginLeft: 2,
  },
  planPricePremium: {
    color: 'white',
  },
  planPriceDefault: {
    color: '#3C5F99',
  },
  planPeriod: {
    fontSize: 16,
    marginLeft: 3,
    marginBottom: 5,
  },
  planMutedPremium: {
    color: 'rgba(255,255,255,0.7)',
  },
  planMutedDefault: {
    color: '#9CA3AF',
  },
  planDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  planDescriptionPremium: {
    color: 'rgba(255,255,255,0.8)',
  },
  planDescriptionDefault: {
    color: '#6B7280',
  },

  planFeaturesSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  planFeatureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  planFeatureList: {
    gap: 12,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  planFeatureIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  planFeatureText: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
  },
  planFeatureBold: {
    fontWeight: '700',
    color: '#1E293B',
  },
  includesFreeWrap: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  includesFreeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C5F99',
    lineHeight: 18,
  },

  planCtaWrap: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  planCta: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCtaCurrent: {
    backgroundColor: '#3C5F99',
  },
  planCtaPremium: {
    backgroundColor: '#55C5F1',
  },
  planCtaStandard: {
    backgroundColor: '#F3F4F6',
  },
  planCtaText: {
    fontSize: 15,
    fontWeight: '700',
  },
  planCtaTextLight: {
    color: 'white',
  },
  planCtaTextDark: {
    color: '#3C5F99',
  },

  comparisonContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  comparisonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  comparisonTable: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  comparisonDataRow: {
    flexDirection: 'row',
  },
  comparisonDataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  comparisonCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  comparisonFeatureCell: {
    flex: 1.6,
    alignItems: 'flex-start',
  },
  comparisonHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#9CA3AF',
  },
  comparisonHeaderFree: {
    color: '#6B7280',
  },
  comparisonHeaderStandard: {
    color: '#A78BFA',
  },
  comparisonHeaderPremium: {
    color: '#55C5F1',
  },
  comparisonFeatureText: {
    fontSize: 12,
    color: '#1E293B',
  },
  comparisonTextValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },

  faqSection: {
    marginHorizontal: 20,
    marginVertical: 24,
  },
  faqSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  faqSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  faqList: {
    gap: 8,
  },
  faqItemContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  faqItemButton: {
    width: '100%',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    paddingRight: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  faqChevronWrap: {
    transform: [{ rotate: '0deg' }],
  },
  faqChevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 21,
    color: '#6B7280',
  },
});
