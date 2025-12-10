import { WebSocketMessage } from '../types';

type MessageHandler = (msg: WebSocketMessage) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectInterval: number = 3000;
  private maxReconnectAttempts: number = 5;
  private attempts: number = 0;
  
  private getUrl(): string {
    // 1. If explicitly set in environment
    if (import.meta.env?.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }

    // 2. Dynamic Protocol & Host Detection
    // CRITICAL FIX: Ensure WSS is used when page is HTTPS to prevent "Mixed Content" security errors.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // In production (Docker), the backend serves the frontend, so relative path /ws works.
    // In dev, Vite proxies /ws to the backend.
    return `${protocol}//${host}/ws`;
  }

  connect() {
    const url = this.getUrl();
    
    // Prevent duplicate connections
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      console.log(`Connecting to Titanium Uplink: ${url}`);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('⚡ TITANIUM Uplink Established');
        this.attempts = 0;
        this.notifyHandlers({ type: 'SYSTEM_STATUS', data: { isConnected: true } });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyHandlers(data);
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        console.log('🔴 Uplink Lost. Reconnecting...');
        this.notifyHandlers({ type: 'SYSTEM_STATUS', data: { isConnected: false } });
        this.ws = null;
        this.retryConnection();
      };

      this.ws.onerror = (event) => {
        console.warn('Titanium Uplink Connection Error. Check console for Mixed Content details.');
      };
    } catch (e) {
      console.error('Connection failed', e);
      this.retryConnection();
    }
  }

  private retryConnection() {
    if (this.attempts < this.maxReconnectAttempts) {
      this.attempts++;
      const delay = this.reconnectInterval * Math.min(this.attempts, 3); // Exponential backoff cap at 9s
      console.log(`Reconnecting attempt ${this.attempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached. Switching to Offline Mode.');
      // Notify app that we are giving up
      this.notifyHandlers({ type: 'SYSTEM_STATUS', data: { isConnected: false } });
    }
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(msg: WebSocketMessage) {
    this.handlers.forEach(h => h(msg));
  }

  send(type: string, payload: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...payload }));
    }
  }
}

export const socketService = new SocketService();