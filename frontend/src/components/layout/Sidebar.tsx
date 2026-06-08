import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Sparkles, 
  LineChart, 
  MessageSquare, 
  TrendingUp, 
  AlertOctagon, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Database
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDatasetStore } from '../../store/datasetStore';

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = useAuthStore((state) => state.user);
  const activeDataset = useDatasetStore((state) => state.activeDataset);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Data Cleaning', path: '/clean', icon: Sparkles },
    { name: 'Automated EDA', path: '/eda', icon: LineChart },
    { name: 'AI Chat Assistant', path: '/chat', icon: MessageSquare },
    { name: 'Time Series Forecast', path: '/forecast', icon: TrendingUp },
    { name: 'Anomaly Detection', path: '/anomalies', icon: AlertOctagon },
    { name: 'Insights & Reports', path: '/reports', icon: FileText },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ name: 'Admin Console', path: '/admin', icon: Settings });
  }

  return (
    <div 
      className={`glass-panel h-screen relative flex flex-col transition-all duration-300 border-r border-slate-800 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 border border-slate-700 flex items-center justify-center text-white cursor-pointer z-50 transition-colors shadow-md"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <TrendingUp className="text-white" size={18} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-blue-400 text-sm tracking-wide">
              AI ANALYST
            </span>
            <span className="text-[10px] text-blue-500 font-semibold tracking-wider uppercase">
              Agent Portal
            </span>
          </div>
        )}
      </div>

      {/* Workspace Summary */}
      {!isCollapsed && activeDataset && (
        <div className="px-6 py-4 mx-4 my-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <Database size={16} className="text-blue-500 shrink-0" />
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{activeDataset.filename}</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {activeDataset.row_count.toLocaleString()} rows • {activeDataset.col_count} cols
            </p>
          </div>
        </div>
      )}

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`
            }
          >
            <item.icon size={18} className="shrink-0 transition-transform group-hover:scale-110" />
            {!isCollapsed && <span className="truncate">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom version footer */}
      {!isCollapsed && (
        <div className="p-6 border-t border-slate-800/80">
          <p className="text-[10px] text-slate-500 text-center font-medium">
            AI Data Analyst v1.0.0
          </p>
        </div>
      )}
    </div>
  );
};
