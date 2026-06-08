import React, { useState, useEffect } from 'react';
import { useDatasetStore } from '../store/datasetStore';
import { 
  Sparkles, 
  Trash2, 
  Plus, 
  Play, 
  HelpCircle, 
  ArrowRight,
  Database,
  ArrowDownCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export const DataCleaning: React.FC = () => {
  const { activeDataset, isLoading, cleanDataset } = useDatasetStore();
  const [autoClean, setAutoClean] = useState(false);
  const [operations, setOperations] = useState<any[]>([]);
  
  // Form State for manual operations
  const [selectedCol, setSelectedCol] = useState('');
  const [strategy, setStrategy] = useState('fill_mean');
  const [fillValue, setFillValue] = useState('');
  const [targetType, setTargetType] = useState('int');

  // Stats comparison state
  const [statsBefore, setStatsBefore] = useState<any>(null);
  const [statsAfter, setStatsAfter] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const columns = activeDataset ? Object.keys(activeDataset.columns_metadata) : [];

  useEffect(() => {
    if (columns.length > 0) {
      setSelectedCol(columns[0]);
    }
  }, [activeDataset]);

  const handleAddOperation = () => {
    if (!selectedCol || !strategy) return;
    
    const newOp = {
      column: selectedCol,
      strategy,
      fill_value: strategy === 'fill_value' ? fillValue : null,
      target_type: strategy === 'type_convert' ? targetType : null
    };

    setOperations([...operations, newOp]);
    // Reset inputs
    setFillValue('');
  };

  const handleRemoveOperation = (index: number) => {
    setOperations(operations.filter((_, i) => i !== index));
  };

  const handleApplyClean = async () => {
    if (!activeDataset) return;
    
    setShowSuccess(false);
    const res = await cleanDataset(activeDataset.id, autoClean, operations);
    
    if (res.success) {
      setStatsBefore(res.stats_before);
      setStatsAfter(res.stats_after);
      setShowSuccess(true);
      // Reset operations list
      setOperations([]);
      setAutoClean(false);
    } else {
      alert(`Clean pipeline error: ${res.error}`);
    }
  };

  if (!activeDataset) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl p-10">
        <Database size={48} className="text-slate-700 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-300">No active workspace loaded</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Please upload or select a dataset from the top navigation dropdown to clean.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text">Data Cleaning Module</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Apply automated text trimming and row deduplication, or build step-by-step column imputation chains.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Step Configuration Panel */}
        <div className="space-y-6">
          
          {/* Quick Auto Clean Option */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500" />
              Automated Cleaning
            </h3>
            
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoClean}
                onChange={(e) => setAutoClean(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-800"
              />
              <div className="text-left">
                <span className="text-xs font-bold text-slate-200">Run General Auto Clean</span>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                  Removes row duplicates, trims text, drops high-null columns, and imputes numerical vectors.
                </p>
              </div>
            </label>
          </div>

          {/* Manual Pipeline Configuration */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Plus size={16} className="text-blue-500" />
              Build Manual Operations
            </h3>

            {/* Target Column Select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Target Column
              </label>
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Strategy Select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Imputation Strategy
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none"
              >
                <option value="fill_mean">Fill with Average (Numeric only)</option>
                <option value="fill_median">Fill with Median (Numeric only)</option>
                <option value="fill_mode">Fill with Most Frequent (Mode)</option>
                <option value="fill_value">Fill with Constant Custom Value</option>
                <option value="drop_na">Drop Rows with Empty Cells</option>
                <option value="remove_outliers">Remove Outliers (IQR Method)</option>
                <option value="type_convert">Cast Column Data Type</option>
              </select>
            </div>

            {/* Value Field (Optional) */}
            {strategy === 'fill_value' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Constant Custom Value
                </label>
                <input
                  type="text"
                  value={fillValue}
                  onChange={(e) => setFillValue(e.target.value)}
                  placeholder="e.g. Unknown, 0, N/A"
                  className="w-full glass-input rounded-2xl px-4 py-3 text-xs"
                />
              </div>
            )}

            {/* Typecast Selection (Optional) */}
            {strategy === 'type_convert' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Target Data Type
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none"
                >
                  <option value="int">Integer (Numeric Whole Number)</option>
                  <option value="float">Float (Numeric Decimal)</option>
                  <option value="str">String (Textual)</option>
                  <option value="datetime">Datetime (Date formats)</option>
                </select>
              </div>
            )}

            <button
              onClick={handleAddOperation}
              className="w-full border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 text-blue-400 font-bold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <Plus size={14} />
              Add Pipeline Operation
            </button>
          </div>
        </div>

        {/* Pending Operations Pipeline and Run Button */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between min-h-[350px]">
            <div>
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Play size={18} className="text-blue-500" />
                Active Clean Operations ({operations.length})
              </h2>

              {operations.length === 0 && !autoClean ? (
                <div className="py-16 text-center">
                  <HelpCircle size={40} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-sm text-slate-500 font-semibold">No cleaning operations added to queue.</p>
                  <p className="text-xs text-slate-600 mt-1">Select column keys on the left to customize operations.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                  {autoClean && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                      <div>
                        <p className="text-xs font-bold text-slate-200">Global Auto Imputation & Cleaning</p>
                        <p className="text-[10px] text-blue-400 font-semibold mt-0.5">Applies standard filters recursively.</p>
                      </div>
                      <span className="text-[10px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full uppercase">AUTO</span>
                    </div>
                  )}
                  {operations.map((op, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                      <div>
                        <p className="text-xs font-bold text-slate-200">Column: <span className="text-blue-400">{op.column}</span></p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 capitalize">
                          Strategy: {op.strategy.replace('_', ' ')}
                          {op.fill_value && ` -> "${op.fill_value}"`}
                          {op.target_type && ` -> cast to ${op.target_type}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveOperation(idx)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleApplyClean}
              disabled={isLoading || (operations.length === 0 && !autoClean)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Execute Data Cleaning Pipeline
                  <Sparkles size={16} />
                </>
              )}
            </button>
          </div>

          {/* Side by side comparison stats */}
          {showSuccess && statsBefore && statsAfter && (
            <div className="glass-panel rounded-3xl p-6 space-y-6 animate-fade-in border border-green-500/20 bg-green-500/2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={20} />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Quality Audit Report (Before vs After)</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                
                {/* Row count change */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Rows</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-slate-400 line-through">{statsBefore.row_count}</span>
                    <ArrowRight size={12} className="text-slate-500" />
                    <span className="text-sm font-bold text-white">{statsAfter.row_count}</span>
                  </div>
                </div>

                {/* Column count change */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Columns</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-slate-400 line-through">{statsBefore.column_count}</span>
                    <ArrowRight size={12} className="text-slate-500" />
                    <span className="text-sm font-bold text-white">{statsAfter.column_count}</span>
                  </div>
                </div>

                {/* Duplicate count change */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Duplicates</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-slate-400 line-through">{statsBefore.duplicate_count}</span>
                    <ArrowRight size={12} className="text-slate-500" />
                    <span className="text-sm font-bold text-white">{statsAfter.duplicate_count}</span>
                  </div>
                </div>

                {/* Null values count change */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Missing cells</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-slate-400 line-through">
                      {(Object.values(statsBefore.null_counts) as number[]).reduce((a, b) => a + b, 0)}
                    </span>
                    <ArrowRight size={12} className="text-slate-500" />
                    <span className="text-sm font-bold text-white">
                      {(Object.values(statsAfter.null_counts) as number[]).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* Dataset Field Diagnostics & Recommendations */}
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-blue-500" />
          <h2 className="text-lg font-bold text-white">Dataset Field Diagnostics & Recommendations</h2>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Real-time health report of dataset dimensions, null scopes, and casting suggestions.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-slate-850">
                <th className="p-4">Column</th>
                <th className="p-4">Type</th>
                <th className="p-4">Null Count</th>
                <th className="p-4">Null Percentage</th>
                <th className="p-4">Unique Count</th>
                <th className="p-4">Health Status</th>
                <th className="p-4">Recommended Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {Object.entries(activeDataset.columns_metadata).map(([colName, meta]: [string, any]) => {
                const nullPct = (meta.null_count / activeDataset.row_count) * 100;
                let health = "Excellent";
                let healthColor = "text-green-400 bg-green-500/10 border-green-500/20";
                let recommendation = "None required";

                if (nullPct > 0) {
                  health = nullPct > 20 ? "Needs Urgent Cleaning" : "Needs Attention";
                  healthColor = nullPct > 20 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20";
                  recommendation = `Impute missing values (${meta.null_count} rows)`;
                } else if (colName.toLowerCase().includes("date") && !meta.type.startsWith("datetime")) {
                  health = "Needs Typecast";
                  healthColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                  recommendation = "Cast Column Data Type to Datetime";
                }

                return (
                  <tr key={colName} className="hover:bg-slate-900/30">
                    <td className="p-4 font-bold text-slate-200">{colName}</td>
                    <td className="p-4 font-mono text-slate-400">{meta.type}</td>
                    <td className="p-4 text-slate-350">{meta.null_count}</td>
                    <td className="p-4 text-slate-350">{nullPct.toFixed(1)}%</td>
                    <td className="p-4 text-slate-350">{meta.unique_count}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${healthColor}`}>
                        {health}
                      </span>
                    </td>
                    <td className="p-4 text-slate-200 font-medium">{recommendation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
