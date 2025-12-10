import { WebSocketMessage } from '../types';

type MessageHandler = (msg: WebSocketMessage) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectInterval: number = 3000;
  
  // Safely access env with optional chaining to prevent runtime crashes if env is undefined
  // Use VITE_WS_URL if available (production), otherwise fallback to localhost (dev)
  private url: string = import.meta.env?.VITE_WS_URL || 'ws://localhost:8000/ws';

  connect() {
    try {
      console.log(`Connecting to Titanium Uplink: ${this.url}`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('⚡ TITANIUM Uplink Established');
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
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.ws.onerror = (event) => {
        // Downgrade to warn to avoid cluttering console in dev/demo mode
        console.warn('Titanium Uplink Unreachable - Running in Offline/Simulation Protocol');
        this.ws?.close();
      };
    } catch (e) {
      console.error('Connection failed', e);
      setTimeout(() => this.connect(), this.reconnectInterval);
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