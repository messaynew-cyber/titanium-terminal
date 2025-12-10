export interface TickerData {
  symbol: string;
  price: number;
  change_pct: number;
  volatility: number;
  timestamp: string;
}

export interface RegimeData {
  current_regime: 'BULL' | 'BEAR' | 'CHOP';
  score: number;
  probabilities: {
    BULL: number;
    BEAR: number;
    CHOP: number;
  };
  action: 'BUY' | 'SELL' | 'HOLD';
}

export interface AccountData {
  equity: number;
  cash: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  buying_power: number;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'TRADE';
  message: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  timestamp: string;
  status: 'filled' | 'new' | 'canceled';
}

export interface SystemState {
  isConnected: boolean;
  isRunning: boolean;
  lastUpdate: string;
}

export interface WebSocketMessage {
  type: 'TICKER' | 'REGIME' | 'ACCOUNT' | 'LOG' | 'TRADE_HISTORY' | 'SYSTEM_STATUS';
  data: any;
}