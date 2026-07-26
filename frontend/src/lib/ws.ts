import { fetchApi } from './api';
import { WSEvent } from '../types';

type EventHandler = (event: WSEvent) => void;

export class WSClient {
    private ws: WebSocket | null = null;
    private handlers: Set<EventHandler> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectDelay = 30000;
    public status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
    private statusListeners: Set<(status: string) => void> = new Set();

    constructor() {}

    public async connect() {
        if (this.status === 'connecting' || this.status === 'connected') return;
        this.setStatus('connecting');

        try {
            // Get short-lived token
            const res = await fetchApi('/auth/ws-token');
            if (!res || !res.token) throw new Error("Failed to get WS token");

            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
            this.ws = new WebSocket(`${wsUrl}?token=${res.token}`);

            this.ws.onopen = () => {
                this.setStatus('connected');
                this.reconnectAttempts = 0;
                console.log("WebSocket connected");
            };

            this.ws.onmessage = (messageEvent) => {
                try {
                    const data: WSEvent = JSON.parse(messageEvent.data);
                    this.handlers.forEach(handler => handler(data));
                } catch (e) {
                    console.error("Failed to parse WS message", e);
                }
            };

            this.ws.onclose = () => {
                this.setStatus('disconnected');
                this.ws = null;
                this.scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error", error);
                // onclose will handle reconnect
            };

        } catch (error) {
            console.error("WebSocket connection failed", error);
            this.setStatus('disconnected');
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
    }

    public send(data: Record<string, unknown>) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn("WebSocket not connected, dropping message", data);
        }
    }

    public subscribe(handler: EventHandler) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler); // unsubscribe function
    }

    public onStatusChange(handler: (status: string) => void) {
        this.statusListeners.add(handler);
        handler(this.status);
        return () => this.statusListeners.delete(handler);
    }

    private setStatus(newStatus: 'connecting' | 'connected' | 'disconnected') {
        this.status = newStatus;
        this.statusListeners.forEach(h => h(this.status));
    }

    public disconnect() {
        this.setStatus('disconnected');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Singleton instance
export const wsClient = new WSClient();
