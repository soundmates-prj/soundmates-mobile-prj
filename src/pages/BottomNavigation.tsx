import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundMateColors, SoundMateLightColors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import MiniPlayer from '../components/player/MiniPlayer';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export type TabName = 'home' | 'blog' | 'live' | 'podcast' | 'profile';

type MinimalPalette = {
  primary: string;
  textSecondary: string;
};

interface BottomNavigationProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  onLogout?: () => void;
}

interface TabConfig {
  tab: TabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  { tab: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { tab: 'podcast', label: 'Podcast', icon: 'mic-outline', iconActive: 'mic' },
  { tab: 'live', label: 'Live', icon: 'radio-outline', iconActive: 'radio' },
  { tab: 'blog', label: 'Blog', icon: 'newspaper-outline', iconActive: 'newspaper' },
  { tab: 'profile', label: 'Hồ sơ', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

const TAB_HEIGHT = 50;

function NavTab({
  config, isActive, palette, onPress, userAvatar,
}: {
  config: TabConfig;
  isActive: boolean;
  palette: MinimalPalette;
  onPress: () => void;
  userAvatar?: string;
}) {
  const indicator = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    indicator.value = withTiming(isActive ? 1 : 0, { duration: 180 });
  }, [isActive]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicator.value,
    transform: [{ scaleX: withSpring(isActive ? 1 : 0.3, { damping: 18 }) }],
  }));

  const iconScale = useSharedValue(1);
  useEffect(() => {
    if (isActive) {
      iconScale.value = withSpring(1.12, { damping: 12 });
    } else {
      iconScale.value = withSpring(1, { damping: 14 });
    }
  }, [isActive]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  const isProfile = config.tab === 'profile';
  const isLive = config.tab === 'live';

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.75}
    >
      {/* Active indicator bar */}
      <Animated.View style={[styles.indicator, { backgroundColor: palette.primary }, indicatorStyle]} />

      <Animated.View style={[styles.iconWrap, iconStyle]}>
        {isProfile && userAvatar ? (
          <View style={[
            styles.avatarBorder,
            { borderColor: isActive ? palette.primary : 'transparent' },
          ]}>
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
          </View>
        ) : isLive ? (
          <View style={[
            styles.liveChip,
            { backgroundColor: isActive ? palette.primary : `${palette.primary}18` },
          ]}>
            <Ionicons name="radio" size={18} color={isActive ? '#FFF' : palette.primary} />
          </View>
        ) : (
          <Ionicons
            name={isActive ? config.iconActive : config.icon}
            size={24}
            color={isActive ? palette.primary : palette.textSecondary}
          />
        )}
      </Animated.View>

      <Text style={[
        styles.label,
        { color: isActive ? palette.primary : palette.textSecondary,
          fontWeight: isActive ? '600' : '400' },
      ]}>
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const { activeSession, activeTrack } = useAudioPlayer();
  const insets = useSafeAreaInsets();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  const bottomPad = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={[
      styles.wrapper,
      {
        backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
        paddingBottom: bottomPad,
        borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      },
    ]}>
      {/* Spotify-style mini player */}
      {(!!activeSession || !!activeTrack) && <MiniPlayer />}

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((cfg) => (
          <NavTab
            key={cfg.tab}
            config={cfg}
            isActive={activeTab === cfg.tab}
            palette={palette}
            onPress={() => onTabPress(cfg.tab)}
            userAvatar={user?.profileImageUrl}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabs: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    gap: 2,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 2.5,
    borderRadius: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  avatarBorder: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, overflow: 'hidden',
  },
  avatar: {
    width: '100%', height: '100%', borderRadius: 12,
  },
  liveChip: {
    width: 38, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
