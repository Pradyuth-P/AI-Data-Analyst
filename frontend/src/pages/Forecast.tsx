import React, { useState, useEffect } from 'react';
import { useDatasetStore } from '../store/datasetStore';
import api from '../services/api';
import { 
  TrendingUp, 
  Loader2, 
  SlidersHorizontal,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  XAxis, 
  YAxis, 
  Line, 
  Area, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

export const Forecasting: React.FC = () => {
  const { activeDataset } = useDatasetStore();
  const [dateColumn, setDateColumn] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [period, setPeriod] = useState(30);
  const [forecastData, setForecastData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns = activeDataset ? Object.keys(activeDataset.columns_metadata) : [];
  
  // Attempt to pre-select sensible columns on dataset load
  useEffect(() => {
    if (activeDataset) {
      const numericCols = Object.entries(activeDataset.columns_metadata)
        .filter(([_, meta]) => ['int64', 'float64', 'int32', 'float32'].includes(meta.type))
        .map(([col]) => col);
        
      const dateCols = Object.entries(activeDataset.columns_metadata)
        .filter(([col, meta]) => col.toLowerCase().includes('date') || col.toLowerCase().includes('time') || meta.type.startsWith('datetime'))
        .map(([col]) => col);

      if (dateCols.length > 0) setDateColumn(dateCols[0]);
      else if (columns.length > 0) setDateColumn(columns[0]);

      if (numericCols.length > 0) setTargetColumn(numericCols[0]);
      else if (columns.length > 0) setTargetColumn(columns[0]);
    }
  }, [activeDataset]);

  const handleRunForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateColumn || !targetColumn || !period) return;
    
    setIsLoading(true);
    setError(null);
    setForecastData(null);
    
    try {
      const response = await api.post('/forecast', {
        dataset_id: activeDataset?.id,
        date_column: dateColumn,
        target_column: targetColumn,
        forecast_period: Number(period)
      });
      setForecastData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Forecasting computation failed. Check parameters and date layouts.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeDataset) {
    return (
      <div className="max-w-5xl mx-auto w-full flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl p-10">
        <TrendingUp size={48} className="text-slate-700 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-300">No active workspace loaded</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Please upload or select a dataset from the top navigation dropdown to forecast.
        </p>
      </div>
    );
  }

  // Combine actual history and forecast predictions for charting
  const getCombinedChartData = () => {
    if (!forecastData) return [];
    
    const history = forecastData.forecast_results.history.map((h: any) => ({
      date: h.date,
      actual: h.actual,
      forecast: null,
      range: null
    }));

    const prediction = forecastData.forecast_results.forecast.map((f: any) => ({
      date: f.date,
      actual: null,
      forecast: f.forecast,
      range: [f.lower, f.upper]
    }));

    // Join them
    return [...history, ...prediction];
  };

  const chartData = getCombinedChartData();
  const summary = forecastData?.forecast_results?.summary;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text">Forecasting Engine</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Fit statistical models on time-ordered variables to project business trends.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Model Configurations */}
        <div className="glass-panel rounded-3xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-blue-500" />
            Parameter Controls
          </h2>

          <form onSubmit={handleRunForecast} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Date Variable Index
              </label>
              <select
                value={dateColumn}
                onChange={(e) => setDateColumn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Target Column to Project
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Forecast Period Count
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="w-full glass-input rounded-2xl px-4 py-3 text-xs font-semibold"
              />
              <span className="text-[9px] text-slate-500 font-semibold mt-1.5 block">
                Number of periods/days to generate beyond dataset endpoint.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  Fit & Generate Projections
                  <TrendingUp size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Projections Visual Panel */}
        <div className="lg:col-span-2 space-y-8">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          {/* Forecast Chart Card */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              Growth Outlook & Prediction Bounds
            </h2>

            {chartData.length === 0 ? (
              <div className="py-24 text-center">
                <Info size={40} className="text-slate-700 mx-auto mb-4" />
                <p className="text-sm text-slate-500 font-semibold">Configure parameters and hit Run to load graphs.</p>
              </div>
            ) : (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                    
                    {/* Confidence intervals band area */}
                    <Area name="95% Confidence Bounds" dataKey="range" fill="#3b82f6" stroke="none" fillOpacity={0.15} />
                    
                    {/* History Line */}
                    <Line name="Historical Value" type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    
                    {/* Forecast Line */}
                    <Line name="Projected Forecast" type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2.5} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Model Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Model Selected</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">{summary.model}</p>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Interval Frequency</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">Parsed: {summary.frequency}</p>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Growth Projection</span>
                  <p className={`text-sm font-bold mt-1 ${summary.projected_growth_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {summary.projected_growth_pct >= 0 ? '+' : ''}{summary.projected_growth_pct?.toFixed(2)}%
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
