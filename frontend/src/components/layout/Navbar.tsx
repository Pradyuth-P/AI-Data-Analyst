import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDatasetStore, Dataset } from '../../store/datasetStore';
import { LogOut, User as UserIcon, Database, ArrowLeftRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { datasets, activeDataset, selectDataset } = useDatasetStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectDataset(e.target.value);
  };

  return (
    <header className="glass-panel h-16 border-b border-slate-800/80 px-8 flex items-center justify-between z-10">
      
      {/* Workspace Switcher */}
      <div className="flex items-center gap-3">
        <Database size={18} className="text-blue-500" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Workspace:
        </span>
        {datasets.length > 0 ? (
          <div className="relative flex items-center">
            <select
              value={activeDataset?.id || ''}
              onChange={handleDatasetChange}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-4 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none pr-8 select-none"
            >
              {datasets.map((d: Dataset) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
            <ArrowLeftRight size={14} className="text-slate-500 absolute right-3 pointer-events-none" />
          </div>
        ) : (
          <span 
            onClick={() => navigate('/')}
            className="text-xs text-blue-500 font-semibold cursor-pointer hover:underline"
          >
            Upload a dataset to begin
          </span>
        )}
      </div>

      {/* User Session profile details */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-850 border border-slate-700 flex items-center justify-center text-slate-300 font-bold uppercase text-xs">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-200">{user?.full_name || 'Premium User'}</span>
            <span className="text-[10px] text-slate-500 capitalize">{user?.role}</span>
          </div>
        </div>

        {/* Log out */}
        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-500/20"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
