/**
 * notificationHubService.ts
 *
 * Manages a persistent SignalR connection to the AccountContentService's
 * NotificationHub for React Native.
 */

import * as signalR from "@microsoft/signalr";
import { API_CONFIG } from "./config";

// Assume the Hub is publicly exposed on port 8004 based on backend configuration.
// If MAIN_BASE_URL is http://161.97.85.232:8080/api/v1 -> http://161.97.85.232:8004/hubs/notifications
const NOTIFICATION_HUB_URL = API_CONFIG.MAIN_BASE_URL
    .replace(/\/api\/v\d+$/, '') // Remove /api/v1
    .replace(/:\d+$/, ':8004') // Replace port with 8004
    + '/hubs/notifications';

export interface RealtimeNotification {
    id: string;
    userId?: string;
    title: string;
    message: string;
    type: string;
    referenceId: string;
    isRead: boolean;
    createdAt: string;
}

export interface BroadcastNotification {
    id: string;
    title: string;
    message: string;
    type: string;
    referenceId: string;
    isRead: boolean;
    createdAt: string;
}

class NotificationHubService {
    private connection: signalR.HubConnection | null = null;
    private startPromise: Promise<void> | null = null;

    private buildConnection(token: string): signalR.HubConnection {
        return new signalR.HubConnectionBuilder()
            .withUrl(NOTIFICATION_HUB_URL, {
                accessTokenFactory: () => token,
                // skipNegotiation=true + WebSockets avoids the React Native fetch negotiation bug
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets,
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();
    }

    async start(token: string): Promise<void> {
        // Already connected — nothing to do
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            return;
        }

        // If a start is already in flight, reuse it
        if (this.startPromise) return this.startPromise;

        // Build a fresh connection object if needed
        if (!this.connection) {
            this.connection = this.buildConnection(token);

            this.connection.onreconnecting(() => {
                console.log("[NotificationHub] Reconnecting...");
            });
            this.connection.onreconnected(() => {
                console.log("[NotificationHub] Reconnected");
            });
            this.connection.onclose((err) => {
                console.log("[NotificationHub] Connection closed", err);
                this.startPromise = null;
            });
        }

        if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
            return; // Connecting or reconnecting — leave it alone
        }

        this.startPromise = this.connection
            .start()
            .then(() => {
                console.log("[NotificationHub] Connected to", NOTIFICATION_HUB_URL);
                this.startPromise = null;
            })
            .catch((err) => {
                console.error("[NotificationHub] Connection failed:", err);
                this.startPromise = null;
                this.connection = null; // reset so next call can rebuild cleanly
                throw err;
            });

        return this.startPromise;
    }

    async stop(): Promise<void> {
        // Await any in-flight start to settle first (prevents "stop before start" error)
        if (this.startPromise) {
            try { await this.startPromise; } catch { /* already logged inside start */ }
        }
        if (
            this.connection &&
            this.connection.state !== signalR.HubConnectionState.Disconnected
        ) {
            await this.connection.stop();
        }
        this.connection = null;
        this.startPromise = null;
    }

    onReceiveNotification(callback: (notification: RealtimeNotification) => void): () => void {
        if (!this.connection) return () => {};
        this.connection.on("ReceiveNotification", callback);
        return () => this.connection?.off("ReceiveNotification", callback);
    }

    onReceiveBroadcastNotification(callback: (notification: BroadcastNotification) => void): () => void {
        if (!this.connection) return () => {};
        this.connection.on("ReceiveBroadcastNotification", callback);
        return () => this.connection?.off("ReceiveBroadcastNotification", callback);
    }

    onRemoveNotification(callback: (data: { referenceId: string; type: string }) => void): () => void {
        if (!this.connection) return () => {};
        this.connection.on("RemoveNotification", callback);
        return () => this.connection?.off("RemoveNotification", callback);
    }

    offAll(): void {
        this.connection?.off("ReceiveNotification");
        this.connection?.off("ReceiveBroadcastNotification");
        this.connection?.off("RemoveNotification");
    }

    getState(): signalR.HubConnectionState {
        return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
    }
}

export const notificationHubService = new NotificationHubService();
export default notificationHubService;
