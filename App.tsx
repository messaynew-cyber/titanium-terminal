import React, { useEffect, useState, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import { socketService } from './services/socket';
import { AccountData, LogMessage, RegimeData, SystemState, TickerData, WebSocketMessage, Trade } from './types';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [systemState, setSystemState] = useState<SystemState>({ isConnected: false, isRunning: false, lastUpdate: '' });
  
  // Data State
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [regime, setRegime] = useState<RegimeData | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  // Simulation State
  const [isSimulated, setIsSimulated] = useState(false);
  const simPriceRef = useRef(2040.50);

  useEffect(() => {
    // Connect to WebSocket
    socketService.connect();

    // Subscribe to updates
    const unsubscribe = socketService.subscribe((msg: WebSocketMessage) => {
      switch (msg.type) {
        case 'SYSTEM_STATUS':
          setSystemState(prev => {
            const connected = msg.data.isConnected;
            // If we regain connection, disable simulation immediately
            if (connected) setIsSimulated(false);
            return { ...prev, ...msg.data };
          });
          break;
        case 'TICKER':
          setTicker(msg.data);
          break;
        case 'ACCOUNT':
          setAccount(msg.data);
          break;
        case 'REGIME':
          setRegime(msg.data);
          break;
        case 'LOG':
          setLogs(prev => [...prev.slice(-100), msg.data]); // Keep last 100 logs
          break;
        case 'TRADE_HISTORY':
          setTrades(msg.data);
          break;
      }
    });

    // Watchdog: If no connection after 7s (increased for production latency/cold starts), start simulation
    const watchdog = setTimeout(() => {
      if (!systemState.isConnected) {
        setIsSimulated(true);
        setLogs(prev => [...prev, {
            id: 'sim-init', 
            timestamp: new Date().toISOString(), 
            level: 'WARNING', 
            message: 'UPLINK TIMEOUT. ENGAGING OFFLINE SIMULATION PROTOCOL.'
        }]);
      }
    }, 7000);

    return () => {
      unsubscribe();
      clearTimeout(watchdog);
    };
  }, [systemState.isConnected]);

  // Simulation Engine (Client-side fallback)
  useEffect(() => {
    if (!isSimulated || systemState.isConnected) return;

    const interval = setInterval(() => {
      // 1. Simulate Price (Random Walk)
      const change = (Math.random() - 0.5) * 2.5;
      simPriceRef.current += change;
      
      const newTicker: TickerData = {
        symbol: 'XAU/USD',
        price: simPriceRef.current,
        change_pct: change / simPriceRef.current,
        volatility: 0.12 + Math.random() * 0.05,
        timestamp: new Date().toISOString()
      };
      setTicker(newTicker);

      // 2. Simulate Regime (Occasionally)
      if (Math.random() > 0.9) {
        const regimes: Array<'BULL' | 'BEAR' | 'CHOP'> = ['BULL', 'BEAR', 'CHOP'];
        const r = regimes[Math.floor(Math.random() * regimes.length)];
        setRegime({
          current_regime: r,
          score: Math.random(),
          probabilities: { BULL: 0.3, BEAR: 0.3, CHOP: 0.4 }, // simplified
          action: r === 'BULL' ? 'BUY' : r === 'BEAR' ? 'SELL' : 'HOLD'
        });
      }

      // 3. Simulate Account
      setAccount({
        equity: 100000 + (simPriceRef.current - 2000) * 10,
        cash: 50000,
        daily_pnl: (simPriceRef.current - 2000) * 10,
        daily_pnl_pct: ((simPriceRef.current - 2000) * 10) / 100000,
        buying_power: 400000
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulated, systemState.isConnected]);

  const handleManualTrade = async (side: 'BUY' | 'SELL') => {
    if (isSimulated) {
      setLogs(prev => [...prev, {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        level: 'WARNING',
        message: `SIMULATION MODE: Cannot execute real ${side} order.`
      }]);
      return;
    }
    
    // In production/docker, relative path works because of proxy or same-origin
    const apiUrl = '/api/force'; 
    
    try {
      await fetch(`${apiUrl}/${side}`, { method: 'POST' });
    } catch (e) {
      console.error("Failed to execute trade", e);
      setLogs(prev => [...prev, {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: 'EXECUTION FAILED: API Unreachable'
      }]);
    }
  };

  return (
    <Layout activeView={activeView} onNavigate={setActiveView} systemState={systemState}>
      {activeView === 'dashboard' && (
        <Dashboard 
          ticker={ticker}
          account={account}
          regime={regime}
          logs={logs}
          history={[]}
        />
      )}
      
      {activeView === 'trades' && (
        <div className="glass-panel p-6 rounded-xl">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Execution History</h2>
              <div className="flex gap-3">
                 <button onClick={() => handleManualTrade('BUY')} className="px-4 py-2 bg-titanium-green/20 text-titanium-green border border-titanium-green/50 rounded hover:bg-titanium-green/30">FORCE BUY</button>
                 <button onClick={() => handleManualTrade('SELL')} className="px-4 py-2 bg-titanium-red/20 text-titanium-red border border-titanium-red/50 rounded hover:bg-titanium-red/30">FORCE SELL</button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-white/10">
                      <th className="pb-3 pl-4">Time</th>
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Side</th>
                      <th className="pb-3">Qty</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-mono">
                    {trades.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-600 italic">No trades executed today</td>
                      </tr>
                    )}
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 pl-4 text-slate-400">{new Date(trade.timestamp).toLocaleTimeString()}</td>
                        <td className="py-3 font-bold text-white">{trade.symbol}</td>
                        <td className={`py-3 ${trade.side === 'buy' ? 'text-titanium-green' : 'text-titanium-red'}`}>
                          {trade.side.toUpperCase()}
                        </td>
                        <td className="py-3 text-slate-300">{trade.qty}</td>
                        <td className="py-3 text-slate-300">${trade.price.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.status === 'filled' ? 'bg-titanium-green/10 text-titanium-green' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {trade.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {activeView === 'strategy' && (
        <div className="glass-panel p-8 flex items-center justify-center h-full">
           <div className="text-center">
              <Activity className="w-16 h-16 text-titanium-gold mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-white mb-2">HMM STRATEGY MATRIX</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Hidden Markov Model parameters and transition probabilities are calculated server-side. 
                Adjust hyperparameters in <code>backend/main.py</code>.
              </p>
           </div>
        </div>
      )}
      
      {activeView === 'risk' && (
        <div className="glass-panel p-8 flex items-center justify-center h-full">
           <div className="text-center">
              <Activity className="w-16 h-16 text-titanium-red mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-white mb-2">RISK MANAGEMENT</h2>
              <p className="text-slate-500">Global stop-loss and position sizing controls.</p>
           </div>
        </div>
      )}

      {activeView === 'settings' && (
        <div className="glass-panel p-8 flex items-center justify-center h-full">
           <div className="text-center">
              <Activity className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-white mb-2">SYSTEM CONFIG</h2>
              <p className="text-slate-500">API Keys and Network preferences.</p>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;