import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { SoundMateLightColors } from '../../constants/theme';

interface SoundMatesLogoProps {
    size?: number;
    showText?: boolean;
}

export const SoundMatesLogo: React.FC<SoundMatesLogoProps> = ({
    size = 120,
    showText = true,
}) => {
    const scale = size / 120;

    return (
        <View style={styles.container}>
            <Svg
                width={size}
                height={size * 0.85}
                viewBox="0 0 120 102"
                style={styles.logo}
            >
                <Defs>
                    <LinearGradient id="headphoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#7DD4F5" />
                        <Stop offset="100%" stopColor="#55C5F1" />
                    </LinearGradient>
                    <LinearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#A8E4FA" />
                        <Stop offset="100%" stopColor="#7DD4F5" />
                    </LinearGradient>
                </Defs>

                {/* Headphone band */}
                <Path
                    d="M25 55 C25 30, 45 15, 60 15 C75 15, 95 30, 95 55"
                    stroke="url(#headphoneGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Left ear cup */}
                <G>
                    <Path
                        d="M18 50 L18 75 C18 82, 22 88, 30 88 L32 88 C36 88, 38 85, 38 80 L38 50 C38 45, 35 42, 30 42 L26 42 C21 42, 18 45, 18 50 Z"
                        fill="url(#headphoneGradient)"
                    />
                    {/* Left speaker detail */}
                    <Circle cx="28" cy="65" r="6" fill="url(#innerGradient)" opacity="0.6" />
                </G>

                {/* Right ear cup */}
                <G>
                    <Path
                        d="M82 50 L82 75 C82 82, 86 88, 94 88 L96 88 C100 88, 102 85, 102 80 L102 50 C102 45, 99 42, 94 42 L90 42 C85 42, 82 45, 82 50 Z"
                        fill="url(#headphoneGradient)"
                    />
                    {/* Right speaker detail */}
                    <Circle cx="92" cy="65" r="6" fill="url(#innerGradient)" opacity="0.6" />
                </G>

                {/* SM text in center */}
                <G>
                    {/* S letter */}
                    <Path
                        d="M48 48 C48 44, 51 42, 55 42 C59 42, 62 44, 62 47 C62 50, 59 52, 55 53 C51 54, 48 56, 48 59 C48 63, 51 65, 55 65 C59 65, 62 63, 62 60"
                        stroke="#55C5F1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* M letter */}
                    <Path
                        d="M66 65 L66 45 L72 55 L78 45 L78 65"
                        stroke="#55C5F1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                </G>
            </Svg>

            {showText && (
                <Text style={[styles.brandText, { fontSize: 16 * scale }]}>SoundMates</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        marginBottom: 4,
    },
    brandText: {
        fontWeight: '600',
        color: SoundMateLightColors.primary,
        letterSpacing: 0.5,
        fontStyle: 'italic',
    },
});

export default SoundMatesLogo;
