import { PodcastAuthor } from "../api/podcastService";

/**
 * Resolves the author name from various possible formats returned by the backend.
 * Handles both string usernames and the newer user object format.
 */
export function resolveAuthorName(author: string | PodcastAuthor | null | undefined): string {
  if (!author) return '';
  if (typeof author === 'string') return author;
  if (typeof author === 'object') {
    return author.name || '';
  }
  return '';
}

/**
 * Resolves the author avatar from the author object if available.
 */
export function resolveAuthorAvatar(author: string | PodcastAuthor | null | undefined): string | undefined {
  if (author && typeof author === 'object') {
    return author.avatar || undefined;
  }
  return undefined;
}
