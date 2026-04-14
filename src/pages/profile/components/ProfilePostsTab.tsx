import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlogPostCard, DisplayPost, ReactionType } from '../../../components/blog/BlogPostCard';

type Palette = {
  primary: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
};

interface ProfilePostsTabProps {
  palette: Palette;
  isDarkMode: boolean;
  avatarUrl: string;
  firstName?: string;
  isPostsLoading: boolean;
  myPosts: DisplayPost[];
  postsPage: number;
  postsTotalPages: number;
  onOpenCreatePost: () => void;
  onReactPost: (postId: string, reactionType: ReactionType | null) => void;
  onOpenPostDetail: (postId: string) => void;
  onEditPost: (post: DisplayPost) => void;
  onDeletePost: (postId: string) => void;
  onLoadMore: (page: number) => void;
}

export default function ProfilePostsTab({
  palette,
  isDarkMode,
  avatarUrl,
  firstName,
  isPostsLoading,
  myPosts,
  postsPage,
  postsTotalPages,
  onOpenCreatePost,
  onReactPost,
  onOpenPostDetail,
  onEditPost,
  onDeletePost,
  onLoadMore,
}: ProfilePostsTabProps) {
  return (
    <>
      <View style={styles.composerContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.composerCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={onOpenCreatePost}
        >
          <View style={styles.composerCollapsed}>
            <Image source={{ uri: avatarUrl }} style={styles.composerAvatar} />
            <View style={[styles.composerPlaceholder, { backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9' }]}>
              <Text style={[styles.composerPlaceholderText, { color: palette.textSecondary }]}>
                {`Bạn đang nghĩ gì${firstName ? `, ${firstName}` : ''}?`}
              </Text>
            </View>
            <View style={[styles.composerQuickIcon, { backgroundColor: palette.primary + '1A' }]}>
              <Ionicons name="create-outline" size={18} color={palette.primary} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {isPostsLoading ? (
        <View style={styles.postsLoadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.postsLoadingText, { color: palette.textSecondary }]}>Đang tải bài viết...</Text>
        </View>
      ) : myPosts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyStateIcon, { backgroundColor: palette.primary + '1A' }]}>
            <Ionicons name="create-outline" size={28} color={palette.primary} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: palette.textPrimary }]}>Bạn chưa có bài viết nào</Text>
          <Text style={[styles.emptyStateSubtitle, { color: palette.textSecondary }]}>Hãy đăng bài đầu tiên để chia sẻ với cộng đồng!</Text>
        </View>
      ) : (
        <>
          {myPosts.map((post) => (
            <BlogPostCard
              key={post.id}
              post={post}
              onReaction={(type) => onReactPost(post.id, type)}
              onNavigateToDetail={onOpenPostDetail}
              showOwnerActions
              onEdit={() => onEditPost(post)}
              onDelete={() => onDeletePost(post.id)}
            />
          ))}

          {!isPostsLoading && postsPage < postsTotalPages && myPosts.length > 0 && (
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
              activeOpacity={0.8}
              onPress={() => onLoadMore(postsPage + 1)}
            >
              <Text style={[styles.loadMoreText, { color: palette.primary }]}>Tải thêm bài viết</Text>
              <Ionicons name="chevron-down" size={16} color={palette.primary} />
            </TouchableOpacity>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  composerContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  composerCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  composerCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  composerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  composerPlaceholder: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerPlaceholderText: {
    fontSize: 14,
  },
  composerQuickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postsLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postsLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
});
