import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolate,
  withTiming
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SoundMateColors, SoundMateLightColors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

export type TabName = 'home' | 'blog' | 'live' | 'podcast' | 'profile';

interface BottomNavigationProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  onLogout?: () => void;
}

const NavItem = ({ icon, iconActive, label, isActive, palette, onPress }: any) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.1 : 1);
    opacity.value = withTiming(isActive ? 1 : 0.6);
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity 
      style={styles.navItem} 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }} 
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Ionicons 
          name={isActive ? iconActive : icon} 
          size={24} 
          color={isActive ? palette.primary : palette.textSecondary} 
        />
      </Animated.View>
      <Text style={[
        styles.navText, 
        { color: isActive ? palette.primary : palette.textSecondary },
        isActive && styles.navTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  return (
    <View style={styles.container}>
      <BlurView 
        intensity={Platform.OS === 'ios' ? 80 : 100} 
        style={StyleSheet.absoluteFill} 
        tint={isDarkMode ? 'dark' : 'light'} 
      />
      
      <NavItem
        icon="home-outline"
        iconActive="home"
        label="Home"
        isActive={activeTab === 'home'}
        palette={palette}
        onPress={() => onTabPress('home')}
      />

      <NavItem
        icon="mic-outline"
        iconActive="mic"
        label="Podcast"
        isActive={activeTab === 'podcast'}
        palette={palette}
        onPress={() => onTabPress('podcast')}
      />

      <View style={styles.centerBtnContainer}>
        <TouchableOpacity 
          style={styles.navItemCenter} 
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onTabPress('live');
          }} 
          activeOpacity={0.8}
        >
          <LinearGradient 
            colors={[palette.primary, '#2DD4BF']} 
            style={styles.navItemCenterGradient}
          >
            <Ionicons name="radio" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <NavItem
        icon="newspaper-outline"
        iconActive="newspaper"
        label="Blog"
        isActive={activeTab === 'blog'}
        palette={palette}
        onPress={() => onTabPress('blog')}
      />

      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onTabPress('profile');
        }} 
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: user?.profileImageUrl || 'https://i.pravatar.cc/150?img=10' }} 
            style={[
              styles.userAvatar, 
              { borderColor: activeTab === 'profile' ? palette.primary : 'transparent' }
            ]} 
          />
        </View>
        <Text style={[
          styles.navText, 
          { color: activeTab === 'profile' ? palette.primary : palette.textSecondary },
          activeTab === 'profile' && styles.navTextActive
        ]}>
          Hồ sơ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    overflow: 'hidden',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtnContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemCenter: {
    marginTop: -35,
  },
  navItemCenterGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  navTextActive: {
    fontWeight: '700',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
  },
});
