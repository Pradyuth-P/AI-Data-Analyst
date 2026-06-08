import React, { useState, useEffect } from 'react';
import { useDatasetStore } from '../store/datasetStore';
import api from '../services/api';
import { 
  AlertOctagon, 
  Loader2, 
  SlidersHorizontal,
  Info,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';

export const AnomalyDetection: React.FC = () => {
  const { activeDataset } = useDatasetStore();
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [algorithm, setAlgorithm] = useState('zscore');
  const [threshold, setThreshold] = useState(3.0);
  const [anomalyResults, setAnomalyResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericCols = activeDataset 
    ? Object.entries(activeDataset.columns_metadata)
        .filter(([_, meta]) => ['int64', 'float64', 'int32', 'float32'].includes(meta.type))
        .map(([col]) => col)
    : [];

  useEffect(() => {
    if (numericCols.length > 0) {
      setSelectedCols([numericCols[0]]);
    }
  }, [activeDataset]);

  const handleToggleColumn = (col: string) => {
    if (selectedCols.includes(col)) {
      setSelectedCols(selectedCols.filter(c => c !== col));
    } else {
      setSelectedCols([...selectedCols, col]);
    }
  };

  const handleRunDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCols.length === 0) {
      alert("Please select at least one numeric column for anomaly detection.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnomalyResults(null);
    
    try {
      const response = await api.get(`/anomalies/${activeDataset?.id}`, {
        params: {
          columns: selectedCols.join(','),
          algorithm,
          threshold
        }
      });
      setAnomalyResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Anomaly scan execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeDataset) {
    return (
      <div className="max-w-5xl mx-auto w-full flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl p-10">
        <AlertOctagon size={48} className="text-slate-700 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-300">No active workspace loaded</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Please upload or select a dataset from the top navigation dropdown to detect anomalies.
        </p>
      </div>
    );
  }

  const summary = anomalyResults?.summary;
  const list = anomalyResults?.anomalies || [];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text">Anomaly Detection</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Isolate statistical data spikes, fraudulent patterns, or dimensional errors using unsupervised algorithms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Model Configurations */}
        <div className="glass-panel rounded-3xl p-6 h-fit space-y-6">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-blue-500" />
            Parameter Controls
          </h2>

          <form onSubmit={handleRunDetection} className="space-y-5">
            {/* Algorithm Select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Outlier Classifier
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="zscore">Z-Score Deviation</option>
                <option value="iqr">IQR Bound Outliers</option>
                <option value="isolation_forest">Isolation Forest (Multi-Dimensional)</option>
              </select>
            </div>

            {/* Threshold Slider (only for z-score) */}
            {algorithm === 'zscore' && (
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  <span>Z-Score Sensitivity</span>
                  <span className="text-blue-500 font-bold">{threshold} σ</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="5.0"
                  step="0.5"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-blue-600 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[9px] text-slate-500 font-semibold mt-1.5 block">
                  Higher threshold captures only severe, distant outliers.
                </span>
              </div>
            )}

            {/* Column Checklist */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Target Numerical Columns
              </label>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 border border-slate-850 p-3 rounded-2xl bg-slate-950/20">
                {numericCols.map((col) => (
                  <button
                    type="button"
                    key={col}
                    onClick={() => handleToggleColumn(col)}
                    className="w-full flex items-center gap-2.5 text-xs text-slate-300 font-semibold hover:text-slate-100 py-1"
                  >
                    {selectedCols.includes(col) ? (
                      <CheckSquare size={14} className="text-blue-500 shrink-0" />
                    ) : (
                      <Square size={14} className="text-slate-600 shrink-0" />
                    )}
                    <span className="truncate">{col}</span>
                  </button>
                ))}
                {numericCols.length === 0 && (
                  <span className="text-[10px] text-slate-500 font-semibold">No numerical column types found.</span>
                )}
              </div>
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
                  Scan Workspace Outliers
                  <AlertOctagon size={14} />
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

          {/* Forecast Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
              <div className="glass-panel rounded-2xl p-4 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Anomalies</span>
                <p className="text-lg font-bold text-red-400 mt-1">{summary.total_detected}</p>
              </div>
              <div className="glass-panel rounded-2xl p-4 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">High Severity</span>
                <p className="text-lg font-bold text-red-500 mt-1">{summary.high_severity_count}</p>
              </div>
              <div className="glass-panel rounded-2xl p-4 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Medium Severity</span>
                <p className="text-lg font-bold text-amber-500 mt-1">{summary.medium_severity_count}</p>
              </div>
              <div className="glass-panel rounded-2xl p-4 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Percentage</span>
                <p className="text-lg font-bold text-slate-200 mt-1">{summary.percentage_of_data?.toFixed(2)}%</p>
              </div>
            </div>
          )}

          {/* Anomaly list grid */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <AlertOctagon size={18} className="text-blue-500" />
              Anomaly Audit Log ({list.length})
            </h2>

            {list.length === 0 ? (
              <div className="py-20 text-center">
                <Info size={40} className="text-slate-700 mx-auto mb-4" />
                <p className="text-sm text-slate-500 font-semibold">No anomalies flagged. Check columns on the left and scan.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                {list.map((anom: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-850 bg-slate-900/10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-200">
                          Row #{anom.row_index} • Column: <span className="text-blue-400">{anom.column || 'Multi'}</span>
                        </span>
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          anom.severity === 'high' 
                            ? 'bg-red-500/15 text-red-500 border border-red-500/20' 
                            : anom.severity === 'medium'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        }`}>
                          {anom.severity}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">{anom.impact}</p>
                      <p className="text-[10px] text-slate-500 font-semibold italic mt-0.5">Advice: {anom.suggested_action}</p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Confidence</span>
                      <span className="text-sm font-bold text-slate-200 mt-0.5">{(anom.confidence * 100).toFixed(0)}%</span>
                      <span className="text-[9px] text-slate-600 font-semibold mt-0.5">{anom.algorithm}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
