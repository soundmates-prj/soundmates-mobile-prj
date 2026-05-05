/**
 * LiveHub SignalR Service (React Native)
 *
 * Mirrors the web liveHubService so that mobile and web share the same
 * SignalR hub for real-time chat, listener tracking, and session events.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as signalR from '@microsoft/signalr';
import { API_HOST } from '@env';

// ── Hub URL ────────────────────────────────────────────────────────
// The live-session SignalR hub lives on port 8003 of the same host.
const LIVE_HUB_URL = API_HOST
  ? `${API_HOST.replace(/:8080$/, '')}:8003/hubs/live-session`
  : 'http://161.97.85.232:8003/hubs/live-session';

// ── Helpers ────────────────────────────────────────────────────────

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUEST_ID_KEY = 'liveGuestIdentifier';

function normalizeGuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return GUID_REGEX.test(trimmed) ? trimmed : null;
}

async function getOrCreateGuestIdentifier(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
    if (existing && existing.trim()) return existing;

    const generated = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(GUEST_ID_KEY, generated);
    return generated;
  } catch {
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function toListenerTuple(args: any[]): { sessionId: string; count: number } | null {
  if (args.length >= 2) {
    const sid = String(args[0] ?? '');
    const count = Number(args[1]);
    if (sid && Number.isFinite(count)) return { sessionId: sid, count };
  }
  const payload = args[0];
  if (payload && typeof payload === 'object') {
    const sid = String(
      payload.sessionId ?? payload.SessionId ?? payload.id ?? payload.Id ?? '',
    );
    const count = Number(
      payload.count ??
        payload.Count ??
        payload.listeners ??
        payload.Listeners ??
        payload.currentListeners ??
        payload.CurrentListeners ??
        payload.listenersCount ??
        payload.ListenersCount ??
        payload.totalListeners ??
        payload.TotalListeners,
    );
    if (sid && Number.isFinite(count)) return { sessionId: sid, count };
  }
  return null;
}

function toUserJoinTuple(
  args: any[],
): { sessionId: string; userId: string | null; count: number } | null {
  if (args.length >= 3) {
    const sid = String(args[0] ?? '');
    const uid = args[1] == null ? null : String(args[1]);
    const count = Number(args[2]);
    if (sid && Number.isFinite(count)) return { sessionId: sid, userId: uid, count };
  }
  const payload = args[0];
  if (payload && typeof payload === 'object') {
    const sid = String(
      payload.sessionId ?? payload.SessionId ?? payload.id ?? payload.Id ?? '',
    );
    const uidRaw = payload.userId ?? payload.UserId ?? null;
    const uid = uidRaw == null ? null : String(uidRaw);
    const count = Number(
      payload.count ??
        payload.Count ??
        payload.listeners ??
        payload.Listeners ??
        payload.currentListeners ??
        payload.CurrentListeners ??
        payload.listenersCount ??
        payload.ListenersCount,
    );
    if (sid && Number.isFinite(count)) return { sessionId: sid, userId: uid, count };
  }
  return null;
}

// ── Interfaces ─────────────────────────────────────────────────────

export interface HubChatMessage {
  id: string;
  liveSessionId: string;
  userId: string;
  userName?: string;
  avatarUrl?: string; // NEW
  message: string;
  createdAt: string;
}

export interface LiveSessionEvent {
  id: string;
  userId: string;
  stationId: string;
  stationName: string | null;
  sessionName: string;
  description: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  genre: string | null;
  listenersCount: number;
}

export interface NowPlayingUpdatedEvent {
  currentTrack: {
    shId: number;
    title: string | null;
    artist: string | null;
    album: string | null;
    artUrl: string | null;
    duration: number;
    elapsed: number;
    remaining: number;
    playedAt: number;
    isRequest: boolean;
    lyrics?: string | null;
  };
  playingNext: {
    shId: number;
    title: string | null;
    artist: string | null;
    album: string | null;
    artUrl: string | null;
    duration: number;
    elapsed: number;
    remaining: number;
    playedAt: number;
    isRequest: boolean;
    lyrics?: string | null;
  } | null;
  listenUrl: string | null;
  totalListeners: number;
}

export interface SongChangedEvent {
  sessionId: string;
  trackTitle: string;
  trackArtist: string | null;
  trackAlbum: string | null;
  artUrl: string | null;
  duration: number;
  elapsed: number;
  listenUrl: string | null;
  isRequest: boolean;
  playedAt: string;
  lyrics?: string | null;
}

export interface SongRequestCreatedEvent {
  requestId: string;
  sessionId: string;
  mediaFileId: string;
  songTitle: string;
  songArtist: string | null;
  requestedByUserId: string;
  requestedByUserName: string | null;
  message: string | null;
  createdAt: string;
}

// ── Service ────────────────────────────────────────────────────────

class LiveHubService {
  private connection: signalR.HubConnection | null = null;
  private reconnectAttempt = 0;
  private joinedSessions = new Map<
    string,
    { userId: string | null; anonymousIdentifier: string | null }
  >();

  getConnection(): signalR.HubConnection {
    if (!this.connection) {
      console.log('[LiveHub-Mobile] Connecting to:', LIVE_HUB_URL);
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(LIVE_HUB_URL)
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      this.connection.onreconnecting(() => {
        this.reconnectAttempt++;
        console.log(`[LiveHub-Mobile] Reconnecting... attempt ${this.reconnectAttempt}`);
      });

      this.connection.onreconnected(() => {
        console.log('[LiveHub-Mobile] Reconnected');
        this.reconnectAttempt = 0;
        // Re-join all sessions
        for (const [sessionId, state] of this.joinedSessions.entries()) {
          void this.connection
            ?.invoke('JoinSession', sessionId, state.userId, state.anonymousIdentifier)
            .then(() => console.log(`[LiveHub-Mobile] Re-joined ${sessionId}`))
            .catch((err) => console.log(`[LiveHub-Mobile] Re-join failed ${sessionId}:`, err));
        }
      });

      this.connection.onclose(() => {
        console.log('[LiveHub-Mobile] Connection closed');
      });
    }
    return this.connection;
  }

  async start(): Promise<void> {
    const conn = this.getConnection();
    if (conn.state === signalR.HubConnectionState.Disconnected) {
      try {
        await conn.start();
        console.log('[LiveHub-Mobile] Connected');
        this.reconnectAttempt = 0;
      } catch (err) {
        console.log('[LiveHub-Mobile] Connection failed:', err);
        throw err;
      }
    }
  }

  async stop(): Promise<void> {
    if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) {
      await this.connection.stop();
      console.log('[LiveHub-Mobile] Disconnected');
    }
    this.joinedSessions.clear();
  }

  async joinSession(sessionId: string, userId?: string | null): Promise<void> {
    const conn = this.getConnection();
    if (!normalizeGuid(sessionId)) {
      throw new Error('Session ID is not a valid GUID');
    }

    if (conn.state !== signalR.HubConnectionState.Connected) {
      await this.start();
    }

    if (conn.state === signalR.HubConnectionState.Connected) {
      const normalizedUserId = normalizeGuid(userId);
      const anonymousIdentifier = normalizedUserId
        ? null
        : await getOrCreateGuestIdentifier();

      try {
        await conn.invoke('JoinSession', sessionId, normalizedUserId, anonymousIdentifier);
        this.joinedSessions.set(sessionId, {
          userId: normalizedUserId,
          anonymousIdentifier,
        });
        console.log(`[LiveHub-Mobile] Joined session ${sessionId}`);
      } catch (err: any) {
        const signalrMsg: string = err?.message ?? '';
        const errorData: any = err?.errorData ?? err?.error ?? null;
        const serverMsg: string =
          errorData?.message ??
          errorData?.Message ??
          (typeof errorData === 'string' ? errorData : null) ??
          signalrMsg.replace(
            /^Failed to invoke 'JoinSession' due to an error on the server\.\s*/i,
            '',
          ) ??
          '';

        const finalMsg = serverMsg.trim() || signalrMsg || 'JoinSession failed on server';
        console.log('[LiveHub-Mobile] JoinSession error:', finalMsg);
        throw new Error(finalMsg);
      }
    }
  }

  async leaveSession(sessionId: string, userId?: string | null): Promise<void> {
    const conn = this.getConnection();
    if (conn.state === signalR.HubConnectionState.Connected) {
      const normalizedUserId = normalizeGuid(userId);
      const anonymousIdentifier = normalizedUserId
        ? null
        : await getOrCreateGuestIdentifier();
      await conn.invoke('LeaveSession', sessionId, normalizedUserId, anonymousIdentifier);
    }
    this.joinedSessions.delete(sessionId);
  }

  async sendChat(sessionId: string, userId: string, message: string, userName?: string, avatarUrl?: string): Promise<void> {
    const conn = this.getConnection();
    if (conn.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Mất kết nối — không thể gửi tin nhắn');
    }
    await conn.invoke('SendChat', sessionId, userId, message, userName || null, avatarUrl || null);
  }

  async deleteChat(sessionId: string, chatId: string, requestUserId: string, role: string): Promise<void> {
    const conn = this.getConnection();
    if (conn.state === signalR.HubConnectionState.Connected) {
      await conn.invoke('DeleteChat', sessionId, chatId, requestUserId, role);
    }
  }

  // ── Event listeners ───────────────────────────────────────────────

  onReceiveChat(callback: (chat: HubChatMessage) => void): () => void {
    const conn = this.getConnection();
    conn.on('ReceiveChat', callback);
    return () => conn.off('ReceiveChat', callback);
  }

  onChatHistory(callback: (chats: HubChatMessage[]) => void): () => void {
    const conn = this.getConnection();
    conn.on('ChatHistory', callback);
    return () => conn.off('ChatHistory', callback);
  }

  onChatDeleted(callback: (chatId: string) => void): () => void {
    const conn = this.getConnection();
    conn.on('ChatDeleted', callback);
    return () => conn.off('ChatDeleted', callback);
  }

  onSessionStarted(callback: (session: LiveSessionEvent) => void): () => void {
    const conn = this.getConnection();
    conn.on('SessionStarted', callback);
    return () => conn.off('SessionStarted', callback);
  }

  onSessionEnded(callback: (session: LiveSessionEvent) => void): () => void {
    const conn = this.getConnection();
    conn.on('SessionEnded', callback);
    return () => conn.off('SessionEnded', callback);
  }

  onUserJoined(
    callback: (sessionId: string, userId: string | null, count: number) => void,
  ): () => void {
    const conn = this.getConnection();
    const handler = (...args: any[]) => {
      const parsed = toUserJoinTuple(args);
      if (parsed) callback(parsed.sessionId, parsed.userId, parsed.count);
    };
    conn.on('UserJoined', handler);
    return () => conn.off('UserJoined', handler);
  }

  onUserLeft(
    callback: (sessionId: string, userId: string | null, count: number) => void,
  ): () => void {
    const conn = this.getConnection();
    const handler = (...args: any[]) => {
      const parsed = toUserJoinTuple(args);
      if (parsed) callback(parsed.sessionId, parsed.userId, parsed.count);
    };
    conn.on('UserLeft', handler);
    return () => conn.off('UserLeft', handler);
  }

  onListenersUpdated(
    callback: (sessionId: string, count: number) => void,
  ): () => void {
    const conn = this.getConnection();
    const handler = (...args: any[]) => {
      const parsed = toListenerTuple(args);
      if (parsed) callback(parsed.sessionId, parsed.count);
    };
    conn.on('ListenersUpdated', handler);
    conn.on('listenersupdated', handler);
    return () => {
      conn.off('ListenersUpdated', handler);
      conn.off('listenersupdated', handler);
    };
  }

  onSongChanged(callback: (song: SongChangedEvent) => void): () => void {
    const conn = this.getConnection();
    conn.on('SongChanged', callback);
    return () => conn.off('SongChanged', callback);
  }

  onNowPlayingUpdated(callback: (data: NowPlayingUpdatedEvent) => void): () => void {
    const conn = this.getConnection();
    conn.on('NowPlayingUpdated', callback);
    return () => conn.off('NowPlayingUpdated', callback);
  }

  onSongRequestCreated(callback: (req: SongRequestCreatedEvent) => void): () => void {
    const conn = this.getConnection();
    conn.on('SongRequestCreated', callback);
    return () => conn.off('SongRequestCreated', callback);
  }

  onHostMicStarted(callback: (sessionId: string) => void): () => void {
    const conn = this.getConnection();
    conn.on('HostMicStarted', callback);
    return () => conn.off('HostMicStarted', callback);
  }

  onHostMicStopped(callback: (sessionId: string) => void): () => void {
    const conn = this.getConnection();
    conn.on('HostMicStopped', callback);
    return () => conn.off('HostMicStopped', callback);
  }

  onGlobalVolumeUpdated(callback: (volume: number) => void): () => void {
    const conn = this.getConnection();
    conn.on('GlobalVolumeUpdated', callback);
    return () => conn.off('GlobalVolumeUpdated', callback);
  }

  offAll(): void {
    const conn = this.getConnection();
    conn.off('SessionStarted');
    conn.off('SessionEnded');
    conn.off('UserJoined');
    conn.off('UserLeft');
    conn.off('ReceiveChat');
    conn.off('ListenersUpdated');
    conn.off('SongChanged');
    conn.off('NowPlayingUpdated');
    conn.off('SongRequestCreated');
    conn.off('HostMicStarted');
    conn.off('HostMicStopped');
    conn.off('GlobalVolumeUpdated');
  }
}

export const liveHubService = new LiveHubService();
export default liveHubService;
