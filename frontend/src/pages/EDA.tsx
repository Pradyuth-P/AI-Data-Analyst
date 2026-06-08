import React, { useState, useEffect } from 'react';
import { useDatasetStore } from '../store/datasetStore';
import api from '../services/api';
import { 
  LineChart, 
  BarChart, 
  Table as TableIcon, 
  SlidersHorizontal,
  Loader2,
  FileText,
  TrendingUp,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBar, XAxis, YAxis, Bar, Tooltip } from 'recharts';

export const AutomatedEDA: React.FC = () => {
  const { activeDataset } = useDatasetStore();
  const [edaData, setEdaData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeDataset) {
      loadEDA();
    }
  }, [activeDataset]);

  const loadEDA = async () => {
    if (!activeDataset) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/eda/${activeDataset.id}`);
      setEdaData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to calculate EDA profiling details.');
    } finally {
      setIsLoading(false);
    }
  };

  const getHeatmapColor = (value: number) => {
    if (value === 1) return 'bg-blue-600 text-white';
    // Greenish for positive, reddish for negative, charcoal for zero
    const absVal = Math.abs(value);
    if (value > 0) {
      if (absVal > 0.7) return 'bg-blue-500/80 text-white';
      if (absVal > 0.4) return 'bg-blue-500/50 text-blue-200';
      return 'bg-blue-500/20 text-blue-400';
    } else if (value < 0) {
      if (absVal > 0.7) return 'bg-red-500/80 text-white';
      if (absVal > 0.4) return 'bg-red-500/50 text-red-200';
      return 'bg-red-500/20 text-red-400';
    }
    return 'bg-slate-900/60 text-slate-500';
  };

  if (!activeDataset) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl p-10">
        <LineChart size={48} className="text-slate-700 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-300">No active workspace loaded</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Please upload or select a dataset from the top navigation dropdown to profile.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className="text-sm text-slate-400 font-semibold">Running profiling metrics & AI insights...</p>
        <p className="text-xs text-slate-600 mt-1">Calculating means, correlations, and distributions.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold rounded-3xl p-8 flex items-center gap-4">
        <AlertCircle size={24} className="shrink-0" />
        <div>
          <h4 className="font-bold">Profiling Calculation Error</h4>
          <p className="text-xs text-slate-500 mt-1 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text">Automated EDA</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Platforms scans column indices, calculates descriptive statistics, aggregates categorical distributions, and correlates numerical ranges.
        </p>
      </div>

      {edaData && (
        <div className="space-y-8">
          
          {/* Top Row: AI Executive Summary & Stats Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* AI Executive Summary */}
            <div className="lg:col-span-2 glass-panel rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-blue-500/10 text-blue-400 rounded-bl-3xl">
                <Sparkles size={16} />
              </div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                AI Executive Summary
              </h2>
              
              <div className="text-xs leading-relaxed text-slate-300 font-medium space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {edaData.executive_summary?.split('\n').map((line: string, index: number) => {
                  if (line.startsWith('### ')) {
                    return <h4 key={index} className="text-sm font-bold text-white mt-4">{line.replace('### ', '')}</h4>;
                  }
                  if (line.startsWith('## ')) {
                    return <h3 key={index} className="text-base font-bold text-blue-400 mt-5">{line.replace('## ', '')}</h3>;
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <li key={index} className="ml-4 list-disc text-slate-300 mt-1">{line.substring(2)}</li>;
                  }
                  if (line.trim() === '') return <div key={index} className="h-2" />;
                  return <p key={index} className="mt-1">{line}</p>;
                })}
              </div>
            </div>

            {/* General Overview Stats Grid */}
            <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-blue-500" />
                Key Dimensions
              </h2>

              <div className="grid grid-cols-2 gap-4 my-auto">
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Row Count</p>
                  <p className="text-xl font-bold text-slate-200 mt-1">{edaData.overview?.row_count?.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Column Count</p>
                  <p className="text-xl font-bold text-slate-200 mt-1">{edaData.overview?.col_count}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Duplicate Rows</p>
                  <p className="text-xl font-bold text-slate-200 mt-1">{edaData.overview?.duplicate_count?.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Missing cells</p>
                  <p className="text-xl font-bold text-slate-200 mt-1">{edaData.overview?.missing_count?.toLocaleString()}</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-semibold border-t border-slate-800/80 pt-4 text-center">
                Cells with empty indicators constitute {edaData.overview?.missing_percentage?.toFixed(2)}% of cells.
              </div>
            </div>
          </div>

          {/* Descriptive Stats Table */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TableIcon size={18} className="text-blue-500" />
              Numerical Variable Profiles
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-850">
                    <th className="p-4">Column</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Nulls (%)</th>
                    <th className="p-4">Mean</th>
                    <th className="p-4">Std Dev</th>
                    <th className="p-4">Min</th>
                    <th className="p-4">Median</th>
                    <th className="p-4">Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {edaData.columns
                    .filter((c: any) => c.mean !== undefined && c.mean !== null)
                    .map((c: any) => (
                      <tr key={c.name} className="hover:bg-slate-900/30">
                        <td className="p-4 font-bold text-slate-200">{c.name}</td>
                        <td className="p-4 text-slate-400">{c.type}</td>
                        <td className="p-4 text-slate-400">{c.null_count} ({c.null_percentage?.toFixed(1)}%)</td>
                        <td className="p-4 text-slate-200 font-semibold">{c.mean?.toFixed(2)}</td>
                        <td className="p-4 text-slate-400">{c.std?.toFixed(2)}</td>
                        <td className="p-4 text-slate-400">{c.min?.toFixed(2)}</td>
                        <td className="p-4 text-slate-200 font-semibold">{c.q50?.toFixed(2)}</td>
                        <td className="p-4 text-slate-400">{c.max?.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Row: Heatmap & Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Correlation Heatmap Grid */}
            <div className="glass-panel rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-500" />
                Correlation Heatmap Matrix
              </h2>

              {edaData.correlation?.columns?.length > 1 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 p-2">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${edaData.correlation.columns.length + 1}, minmax(80px, 1fr))` }}>
                    {/* Corner empty block */}
                    <div className="p-2 text-[10px] font-bold text-slate-500 truncate" />
                    
                    {/* Headers */}
                    {edaData.correlation.columns.map((col: string) => (
                      <div key={col} className="p-2 text-[10px] font-bold text-slate-400 text-center truncate" title={col}>
                        {col}
                      </div>
                    ))}

                    {/* Matrix Rows */}
                    {edaData.correlation.columns.map((rowCol: string, rowIdx: number) => (
                      <React.Fragment key={rowCol}>
                        <div className="p-2 text-[10px] font-bold text-slate-400 truncate flex items-center" title={rowCol}>
                          {rowCol}
                        </div>
                        {edaData.correlation.values[rowIdx].map((val: number, colIdx: number) => (
                          <div
                            key={colIdx}
                            className={`p-3 text-xs font-bold text-center rounded-lg transition-transform hover:scale-105 select-none ${getHeatmapColor(val)}`}
                            title={`${rowCol} vs ${edaData.correlation.columns[colIdx]} = ${val.toFixed(3)}`}
                          >
                            {val.toFixed(2)}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500 font-semibold bg-slate-900/30 rounded-2xl">
                  Not enough numerical columns to compute correlations.
                </div>
              )}
            </div>

            {/* Categorical Distribution Charting (takes top categorical) */}
            <div className="glass-panel rounded-3xl p-6 flex flex-col">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <BarChart size={18} className="text-blue-500" />
                Categorical Frequencies
              </h2>

              {Object.keys(edaData.categorical).length > 0 ? (
                <div className="space-y-8 flex-1 flex flex-col justify-around">
                  {Object.entries(edaData.categorical).slice(0, 2).map(([col, values]: any) => {
                    const dataPoints = Object.entries(values).map(([name, value]) => ({
                      name: name.substring(0, 15),
                      value: Number(value)
                    }));
                    return (
                      <div key={col} className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Distribution: <span className="text-blue-400">{col}</span></h4>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReBar data={dataPoints} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                              <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                              <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                              <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10 }} />
                              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </ReBar>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500 font-semibold bg-slate-900/30 rounded-2xl my-auto">
                  No categorical column classifications found.
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
