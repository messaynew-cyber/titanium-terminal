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

    // 2. Dynamic Detection for Production (Northflank) vs Local
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // e.g. "titanium-app.northflank.app"
    
    // If we are on localhost:3000 (React dev server), we want to hit localhost:8000
    if (host.includes('localhost:3000')) {
        return 'ws://127.0.0.1:8000/ws';
    }

    // In production (Docker), React is served FROM Python on the same port, so we use the same host.
    return `${protocol}//${host}/ws`;
  }

  connect() {
    const url = this.getUrl();
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
        this.retryConnection();
      };

      this.ws.onerror = (event) => {
        console.warn('Titanium Uplink Connection Error');
      };
    } catch (e) {
      console.error('Connection failed', e);
      this.retryConnection();
    }
  }

  private retryConnection() {
    if (this.attempts < this.maxReconnectAttempts) {
      this.attempts++;
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached. Switching to Offline Mode.');
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