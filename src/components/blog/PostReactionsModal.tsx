import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { blogService, ReactionResponse } from '../../api/blogService';
import { SoundMateColors, SoundMateLightColors } from '../../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { REACTIONS, ReactionType } from './BlogPostCard';
import { resolveAuthorName } from '../../utils/authorUtils';

interface PostReactionsModalProps {
    postId: string;
    visible: boolean;
    onClose: () => void;
    onNavigateToUser?: (userId: string) => void;
}

export function PostReactionsModal({
    postId,
    visible,
    onClose,
    onNavigateToUser,
}: PostReactionsModalProps) {
    const { isDarkMode } = useTheme();
    const palette = isDarkMode ? SoundMateColors : SoundMateLightColors;
    const insets = useSafeAreaInsets();

    const [isLoading, setIsLoading] = useState(false);
    const [reactions, setReactions] = useState<ReactionResponse[]>([]);
    const [activeTab, setActiveTab] = useState<string>('all');

    useEffect(() => {
        if (visible && postId) {
            setIsLoading(true);
            setActiveTab('all');
            blogService.getPostReactions(postId)
                .then(res => {
                    if (res.success && res.data) {
                        setReactions(res.data);
                    } else {
                        setReactions([]);
                    }
                })
                .catch(err => {
                    console.log('[PostReactionsModal] Error fetching reactions:', err);
                    setReactions([]);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setReactions([]);
        }
    }, [visible, postId]);

    // Calculate tabs based on reactions data
    const tabs = useMemo(() => {
        if (!reactions.length) return [];
        
        const counts: Record<string, number> = {};
        reactions.forEach(r => {
            const t = (r.reactionType || 'like').toLowerCase();
            counts[t] = (counts[t] || 0) + 1;
        });

        const availableTabs: Array<{ id: string; label: string; count: number; icon: string | null }> = [
            { id: 'all', label: 'Tất cả', count: reactions.length, icon: null }
        ];

        // Add specific reaction tabs based on the predefined REACTIONS array order
        REACTIONS.forEach(def => {
            if (counts[def.type] > 0) {
                availableTabs.push({
                    id: def.type,
                    label: def.label,
                    count: counts[def.type],
                    icon: def.icon
                });
            }
        });

        return availableTabs;
    }, [reactions]);

    const displayedReactions = useMemo(() => {
        if (activeTab === 'all') return reactions;
        return reactions.filter(r => (r.reactionType || 'like').toLowerCase() === activeTab);
    }, [reactions, activeTab]);

    const handleUserPress = useCallback((userId: string) => {
        onClose();
        if (onNavigateToUser) {
            // Small delay to allow modal to close smoothly
            setTimeout(() => {
                onNavigateToUser(userId);
            }, 300);
        }
    }, [onClose, onNavigateToUser]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>
                
                <View style={[
                    styles.modalContainer, 
                    { backgroundColor: palette.background, paddingBottom: Math.max(insets.bottom, 20) }
                ]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Những người đã bày tỏ cảm xúc</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={24} color={palette.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#8B5CF6" />
                        </View>
                    ) : (
                        <>
                            {tabs.length > 0 && (
                                <View style={[styles.tabsWrapper, { borderBottomColor: palette.border }]}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
                                        {tabs.map(tab => {
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <TouchableOpacity
                                                    key={tab.id}
                                                    style={[
                                                        styles.tabItem,
                                                        isActive && styles.tabItemActive
                                                    ]}
                                                    onPress={() => setActiveTab(tab.id)}
                                                >
                                                    {tab.icon && (
                                                        <Ionicons name={tab.icon as any} size={16} color={isActive ? '#8B5CF6' : palette.textMuted} style={{ marginRight: 6 }} />
                                                    )}
                                                    <Text style={[
                                                        styles.tabLabel,
                                                        { color: isActive ? '#8B5CF6' : palette.textMuted },
                                                        isActive && styles.tabLabelActive
                                                    ]}>
                                                        {tab.label} {tab.count}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}

                            {displayedReactions.length === 0 && !isLoading ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="people-outline" size={48} color={palette.textMuted} />
                                    <Text style={[styles.emptyText, { color: palette.textMuted }]}>Chưa có cảm xúc nào</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={displayedReactions}
                                    keyExtractor={item => item.id}
                                    contentContainerStyle={styles.listContent}
                                    renderItem={({ item }) => {
                                        const rType = (item.reactionType || 'like').toLowerCase() as ReactionType;
                                        const rDef = REACTIONS.find(x => x.type === rType);
                                        const fullName = item.userFullName || resolveAuthorName(item as any) || 'Người dùng ẩn danh';
                                        
                                        return (
                                            <TouchableOpacity 
                                                style={styles.userRow}
                                                activeOpacity={0.7}
                                                onPress={() => handleUserPress(item.userId)}
                                            >
                                                <View style={styles.avatarWrapper}>
                                                    <Image 
                                                        source={{ uri: item.userAvatarUrl || `https://api.dicebear.com/7.x/initials/png?seed=${item.userId}&backgroundColor=55C5F1` }} 
                                                        style={styles.avatar}
                                                    />
                                                    {rDef && (
                                                        <View style={[styles.reactionBadge, { backgroundColor: palette.background }]}>
                                                            <Ionicons name={rDef.iconFilled as any} size={12} color={rDef.color} />
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={[styles.userName, { color: palette.textPrimary }]} numberOfLines={1}>
                                                    {fullName}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    tabsWrapper: {
        borderBottomWidth: 1,
    },
    tabsScrollContent: {
        paddingHorizontal: 16,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginRight: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: '#8B5CF6',
    },
    tabIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    tabLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    tabLabelActive: {
        color: '#8B5CF6',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    reactionBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#FFF',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    reactionBadgeText: {
        fontSize: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
    }
});
