import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ShieldAlert, 
  Users, 
  Database, 
  FileText, 
  HardDrive,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  Lock
} from 'lucide-react';

export const AdminConsole: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, statsRes, logsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats'),
        api.get('/admin/logs')
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data.metrics);
      setLogs(logsRes.data);
    } catch (err) {
      console.error("Failed loading admin console records", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const freshUser = await api.put(`/admin/users/${userId}/status`, null, {
        params: { is_active: !currentStatus }
      });
      // Update local state list
      setUsers(users.map(u => u.id === userId ? freshUser.data : u));
    } catch (err) {
      console.error("Failed toggling active status", err);
      alert("Failed toggling status. Check credentials.");
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className="text-sm text-slate-400 font-semibold font-sans">Accessing security records & metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text">Admin Panel</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Monitor host statistics, manage user credentials, and verify system audit logs.
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Platform Users</span>
              <p className="text-lg font-bold text-slate-200 mt-0.5">{stats.total_users}</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Database size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Datasets</span>
              <p className="text-lg font-bold text-slate-200 mt-0.5">{stats.total_datasets}</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-600/10 border border-green-500/20 text-green-500 flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Reports Generated</span>
              <p className="text-lg font-bold text-slate-200 mt-0.5">{stats.total_reports}</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <HardDrive size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Disk Space</span>
              <p className="text-lg font-bold text-slate-200 mt-0.5">{stats.storage_footprint_mb?.toFixed(1)} MB</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 col-span-2 lg:col-span-1 flex items-center gap-4 border border-red-500/10 bg-red-500/2">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">System Flags</span>
              <p className="text-lg font-bold text-red-400 mt-0.5">{stats.critical_system_errors}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Users administration */}
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            Workspace Accounts
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-850">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-850 uppercase text-[9px] tracking-wider">
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/20">
                    <td className="p-3">
                      <div className="font-bold text-slate-200">{u.full_name || 'No Name'}</div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {u.is_active ? (
                          <span className="flex items-center gap-1 text-green-400 font-semibold text-[10px]"><CheckCircle size={12} /> Active</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 font-semibold text-[10px]"><XCircle size={12} /> Suspended</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[10px] border transition-all cursor-pointer ${
                          u.is_active 
                            ? 'border-red-500/20 hover:bg-red-500/10 text-red-400' 
                            : 'border-green-500/20 hover:bg-green-500/10 text-green-400'
                        }`}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs monitoring */}
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity size={18} className="text-blue-500" />
            Host Security Log
          </h2>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className={`p-3 rounded-2xl border text-[10px] flex items-start gap-3 transition-colors ${
                  log.level === 'ERROR' || log.level === 'CRITICAL'
                    ? 'border-red-500/20 bg-red-500/5'
                    : 'border-slate-850 bg-slate-900/10'
                }`}
              >
                <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] uppercase shrink-0 ${
                  log.level === 'ERROR' || log.level === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {log.level}
                </span>

                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-slate-300 leading-relaxed">{log.message}</p>
                  <p className="text-[9px] text-slate-500 font-semibold">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="py-16 text-center text-xs text-slate-500 font-semibold">
                No security flags or debug logs recorded.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
