export function getLiveListenersCount(
  session: { listenersCount?: number; totalListeners?: number; nowPlaying?: { totalListeners?: number; listenersCount?: number } } | null | undefined,
  nowPlaying?: { totalListeners?: number; listenersCount?: number } | null
): number {
  return session?.listenersCount ?? // High-priority internal tracking
         nowPlaying?.totalListeners ?? // Azuracast total listeners
         nowPlaying?.listenersCount ?? // In case it gets renamed
         session?.nowPlaying?.totalListeners ??
         session?.nowPlaying?.listenersCount ??
         session?.totalListeners ?? // DB fallback
         0;
}
