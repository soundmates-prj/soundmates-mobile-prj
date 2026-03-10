import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SoundMateLightColors } from '../../constants/theme';

export type TabName = 'home' | 'blog' | 'live' | 'podcast' | 'profile';

interface BottomNavigationProps {
    activeTab: TabName;
    onTabPress: (tab: TabName) => void;
    onLogout?: () => void;
}

interface NavItemProps {
    name: TabName;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
    label: string;
    isActive: boolean;
    onPress: () => void;
}

const NavItem = ({ icon, iconActive, label, isActive, onPress }: NavItemProps) => (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
        <Ionicons
            name={isActive ? iconActive : icon}
            size={24}
            color={isActive ? SoundMateLightColors.primary : SoundMateLightColors.textMuted}
        />
        <Text style={[styles.navText, isActive && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
);

export default function BottomNavigation({ activeTab, onTabPress, onLogout }: BottomNavigationProps) {
    return (
        <View style={styles.container}>
            <NavItem
                name="home"
                icon="home-outline"
                iconActive="home"
                label="Trang chủ"
                isActive={activeTab === 'home'}
                onPress={() => onTabPress('home')}
            />

            <NavItem
                name="podcast"
                icon="mic-outline"
                iconActive="mic"
                label="Podcast"
                isActive={activeTab === 'podcast'}
                onPress={() => onTabPress('podcast')}
            />

            {/* Center Create Button */}
            <TouchableOpacity
                style={styles.navItemCenter}
                onPress={() => onTabPress('live')}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[SoundMateLightColors.primary, SoundMateLightColors.primaryDark]}
                    style={styles.navItemCenterGradient}
                >
                    <Ionicons name="radio" size={28} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>

            <NavItem
                name="blog"
                icon="newspaper-outline"
                iconActive="newspaper"
                label="Blog"
                isActive={activeTab === 'blog'}
                onPress={() => onTabPress('blog')}
            />

            {/* Logout Button (temporary) */}
            <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('profile')} activeOpacity={0.7}>
                <Image
                    source={{ uri: 'https://i.pravatar.cc/150?img=10' }}
                    style={styles.userAvatar}
                />
                <Text style={styles.navText}>Hồ sơ</Text>
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
        backgroundColor: SoundMateLightColors.surface,
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
    navItemCenter: {
        flex: 1,
        alignItems: 'center',
        marginTop: -30,
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
        color: SoundMateLightColors.textMuted,
        marginTop: 4,
        fontWeight: '500',
    },
    navTextActive: {
        color: SoundMateLightColors.primary,
        fontWeight: '600',
    },
    userAvatar: {
        width: 25,
        height: 25,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SoundMateLightColors.primary,
    },
});
