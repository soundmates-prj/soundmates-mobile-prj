import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SoundMateColors, SoundMateLightColors } from '../../constants/theme';
import { useTheme } from '../context/ThemeContext';

export type TabName = 'home' | 'blog' | 'live' | 'podcast' | 'profile';

interface BottomNavigationProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  onLogout?: () => void;
}

interface NavItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}

const NavItem = ({ icon, iconActive, label, isActive, activeColor, inactiveColor, onPress }: NavItemProps) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconContainer}>
      <Ionicons name={isActive ? iconActive : icon} size={24} color={isActive ? activeColor : inactiveColor} />
    </View>
    <Text style={[styles.navText, { color: isActive ? activeColor : inactiveColor }, isActive && styles.navTextActive]} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  const { isDarkMode } = useTheme();
  const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderTopColor: palette.border }]}> 
      <NavItem
        icon="home-outline"
        iconActive="home"
        label="Trang chủ"
        isActive={activeTab === 'home'}
        activeColor={palette.primary}
        inactiveColor={palette.textMuted}
        onPress={() => onTabPress('home')}
      />

      <NavItem
        icon="mic-outline"
        iconActive="mic"
        label="Podcast"
        isActive={activeTab === 'podcast'}
        activeColor={palette.primary}
        inactiveColor={palette.textMuted}
        onPress={() => onTabPress('podcast')}
      />

      <TouchableOpacity style={styles.navItemCenter} onPress={() => onTabPress('live')} activeOpacity={0.8}>
        <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.navItemCenterGradient}>
          <Ionicons name="radio" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      <NavItem
        icon="newspaper-outline"
        iconActive="newspaper"
        label="Blog"
        isActive={activeTab === 'blog'}
        activeColor={palette.primary}
        inactiveColor={palette.textMuted}
        onPress={() => onTabPress('blog')}
      />

      <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('profile')} activeOpacity={0.7}>
        <View style={styles.iconContainer}>
          <Image source={{ uri: 'https://i.pravatar.cc/150?img=10' }} style={[styles.userAvatar, { borderColor: palette.primary }]} />
        </View>
        <Text
          style={[
            styles.navText,
            { color: activeTab === 'profile' ? palette.primary : palette.textMuted },
            activeTab === 'profile' && styles.navTextActive,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          Trang Cá Nhân
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
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemCenter: {
    flex: 1,
    alignItems: 'center',
    marginTop: -18,
  },
  navItemCenterGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SoundMateLightColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  navText: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
    fontWeight: '400',
    textAlign: 'center',
  },
  navTextActive: {
    fontWeight: '600',
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
});
