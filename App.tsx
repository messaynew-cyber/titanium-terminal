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
            // If we regain connection, disable simulation
            if (msg.data.isConnected) setIsSimulated(false);
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

    // Watchdog: If no connection after 2s, start simulation
    const watchdog = setTimeout(() => {
      if (!systemState.isConnected) {
        setIsSimulated(true);
        setLogs(prev => [...prev, {
            id: 'sim-init', 
            timestamp: new Date().toISOString(), 
            level: 'WARNING', 
            message: 'UPLINK SEVERED. ENGAGING OFFLINE SIMULATION PROTOCOL.'
        }]);
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(watchdog);
    };
  }, [systemState.isConnected]); // Re-run if connection status changes actually triggers state updates

  // Simulation Engine
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
    
    try {
      await fetch(`http://localhost:8000/api/force/${side}`, { method: 'POST' });
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
           </div>
           
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/10">
                 <th className="p-3">Time</th>
                 <th className="p-3">Symbol</th>
                 <th className="p-3">Side</th>
                 <th className="p-3">Qty</th>
                 <th className="p-3">Price</th>
                 <th className="p-3">Status</th>
               </tr>
             </thead>
             <tbody className="font-mono text-sm">
                {trades.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-600">No recent trades fetched.</td></tr>
                ) : (
                  trades.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 font-bold text-titanium-gold">{t.symbol}</td>
                      <td className={`p-3 font-bold ${t.side === 'buy' ? 'text-titanium-green' : 'text-titanium-red'}`}>{t.side.toUpperCase()}</td>
                      <td className="p-3">{t.qty}</td>
                      <td className="p-3">${t.price.toFixed(2)}</td>
                      <td className="p-3"><span className="px-2 py-1 rounded bg-white/10 text-xs">{t.status}</span></td>
                    </tr>
                  ))
                )}
             </tbody>
           </table>
        </div>
      )}

      {/* Placeholder views for others */}
      {['strategy', 'risk', 'settings'].includes(activeView) && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-600">
          <Activity size={64} className="mb-4 opacity-20" />
          <p className="text-xl">Module Under Construction</p>
          <p className="text-sm">Connect backend to unlock {activeView} data streams.</p>
        </div>
      )}
    </Layout>
  );
};

export default App;