import React from 'react';
import { Activity, BarChart2, Shield, Settings, Terminal, Zap } from 'lucide-react';
import { SystemState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
  systemState: SystemState;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, systemState }) => {
  const menuItems = [
    { id: 'dashboard', icon: Activity, label: 'Live Desk' },
    { id: 'strategy', icon: Zap, label: 'Strategy' },
    { id: 'trades', icon: Terminal, label: 'Execution' },
    { id: 'risk', icon: Shield, label: 'Risk Mgmt' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-titanium-dark text-slate-300 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-20 lg:w-64 glass-panel border-r border-white/10 flex flex-col z-20">
        <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-titanium-gold to-yellow-700 flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="font-bold text-black font-mono">Ti</span>
          </div>
          <span className="hidden lg:block font-bold text-xl tracking-wider text-white">TITANIUM</span>
        </div>

        <nav className="flex-1 py-8 flex flex-col gap-2 px-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 group
                ${activeView === item.id 
                  ? 'bg-titanium-gold/10 text-titanium-gold border border-titanium-gold/20 neon-border' 
                  : 'hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon className={`w-5 h-5 ${activeView === item.id ? 'animate-pulse' : ''}`} />
              <span className="hidden lg:block font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 px-2">
            <div className={`w-2 h-2 rounded-full ${systemState.isConnected ? 'bg-titanium-green animate-pulse' : 'bg-titanium-red'}`} />
            <span className="hidden lg:block text-xs uppercase tracking-widest text-slate-500">
              {systemState.isConnected ? 'System Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-titanium-teal/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-titanium-gold/5 rounded-full blur-[120px]" />
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;