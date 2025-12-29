import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SoundMateColors } from '../../constants/theme';

export type TabName = 'home' | 'live' | 'create' | 'library' | 'profile';

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
            color={isActive ? SoundMateColors.primary : SoundMateColors.textMuted}
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
                name="live"
                icon="radio-outline"
                iconActive="radio"
                label="Live"
                isActive={activeTab === 'live'}
                onPress={() => onTabPress('live')}
            />

            {/* Center Create Button */}
            <TouchableOpacity
                style={styles.navItemCenter}
                onPress={() => onTabPress('create')}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[SoundMateColors.primary, SoundMateColors.primaryDark]}
                    style={styles.navItemCenterGradient}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>

            <NavItem
                name="library"
                icon="library-outline"
                iconActive="library"
                label="Thư viện"
                isActive={activeTab === 'library'}
                onPress={() => onTabPress('library')}
            />

            {/* Logout Button (temporary) */}
            <TouchableOpacity style={styles.navItem} onPress={onLogout} activeOpacity={0.7}>
                <Ionicons
                    name="log-out-outline"
                    size={24}
                    color={SoundMateColors.textMuted}
                />
                <Text style={styles.navText}>Đăng xuất</Text>
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
        backgroundColor: SoundMateColors.surface,
        borderTopWidth: 1,
        borderTopColor: SoundMateColors.border,
        paddingBottom: 20,
        paddingTop: 12,
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
        shadowColor: SoundMateColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    navText: {
        fontSize: 11,
        color: SoundMateColors.textMuted,
        marginTop: 4,
        fontWeight: '500',
    },
    navTextActive: {
        color: SoundMateColors.primary,
        fontWeight: '600',
    },
});
