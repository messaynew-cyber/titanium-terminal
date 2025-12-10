import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign, Wallet, Brain } from 'lucide-react';
import { TickerData, AccountData, RegimeData, LogMessage } from '../types';

interface DashboardProps {
  ticker: TickerData | null;
  account: AccountData | null;
  regime: RegimeData | null;
  logs: LogMessage[];
  history: any[];
}

const MetricCard: React.FC<{ title: string; value: string; sub?: string; icon: any; trend?: 'up' | 'down' | 'neutral' }> = ({ title, value, sub, icon: Icon, trend }) => (
  <div className="glass-panel p-6 rounded-xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={48} />
    </div>
    <div className="relative z-10">
      <h3 className="text-slate-400 text-sm uppercase tracking-widest mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-mono font-bold text-white">{value}</span>
      </div>
      {sub && (
        <div className={`text-xs font-mono mt-2 flex items-center gap-1 ${
          trend === 'up' ? 'text-titanium-green' : trend === 'down' ? 'text-titanium-red' : 'text-slate-500'
        }`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : trend === 'down' ? <ArrowDownRight size={12} /> : null}
          {sub}
        </div>
      )}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ ticker, account, regime, logs, history }) => {
  const [dataPoints, setDataPoints] = useState<any[]>([]);

  useEffect(() => {
    if (ticker) {
      setDataPoints(prev => [...prev, {
        time: new Date(ticker.timestamp).toLocaleTimeString(),
        price: ticker.price,
        regimeScore: regime?.score || 0
      }].slice(-50)); // Keep last 50 points
    }
  }, [ticker, regime]);

  const getRegimeColor = (r: string) => {
    if (r === 'BULL') return 'text-titanium-green';
    if (r === 'BEAR') return 'text-titanium-red';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Equity" 
          value={account ? `$${account.equity.toLocaleString()}` : '---'}
          sub={account ? `${account.daily_pnl >= 0 ? '+' : ''}${account.daily_pnl.toFixed(2)} (${(account.daily_pnl_pct * 100).toFixed(2)}%)` : ''}
          icon={Wallet}
          trend={account && account.daily_pnl >= 0 ? 'up' : 'down'}
        />
        <MetricCard 
          title="Live Price" 
          value={ticker ? `$${ticker.price.toFixed(2)}` : '---'}
          sub={ticker ? `Vol: ${(ticker.volatility * 100).toFixed(2)}%` : ''}
          icon={Activity}
          trend="neutral"
        />
        <MetricCard 
          title="HMM Regime" 
          value={regime ? regime.current_regime : 'INIT'}
          sub={regime ? `Score: ${regime.score.toFixed(3)}` : 'Model Loading'}
          icon={Brain}
          trend={regime?.action === 'BUY' ? 'up' : regime?.action === 'SELL' ? 'down' : 'neutral'}
        />
        <MetricCard 
          title="Buying Power" 
          value={account ? `$${account.buying_power.toLocaleString()}` : '---'}
          sub="Available Margin"
          icon={DollarSign}
        />
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* Price & Regime Chart */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-6 bg-titanium-gold rounded-sm"></span>
              LIVE MARKET FEED <span className="text-titanium-gold font-mono text-sm opacity-50">:: {ticker?.symbol || 'GLD'}</span>
            </h2>
            <div className="flex gap-2 text-xs font-mono">
              <span className="px-2 py-1 bg-white/5 rounded text-titanium-green">BULL PROB: {((regime?.probabilities.BULL || 0) * 100).toFixed(0)}%</span>
              <span className="px-2 py-1 bg-white/5 rounded text-titanium-red">BEAR PROB: {((regime?.probabilities.BEAR || 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPoints}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} width={40} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0e17', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#d4af37' }}
                />
                <Area type="monotone" dataKey="price" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Logs Console */}
        <div className="glass-panel rounded-xl p-6 flex flex-col h-full">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">System Log</h2>
          <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 pr-2">
            {logs.length === 0 && <div className="text-slate-600 italic">Waiting for system logs...</div>}
            {[...logs].reverse().map((log) => (
              <div key={log.id} className="border-l-2 border-slate-700 pl-3 py-1">
                <div className="flex justify-between opacity-50 mb-1">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={`font-bold ${
                    log.level === 'ERROR' ? 'text-titanium-red' : 
                    log.level === 'TRADE' ? 'text-titanium-teal' : 'text-slate-400'
                  }`}>{log.level}</span>
                </div>
                <div className="text-slate-300 break-words">
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;