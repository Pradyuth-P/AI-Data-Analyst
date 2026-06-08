import React, { useState, useEffect, useRef } from 'react';
import { useDatasetStore, Dataset } from '../store/datasetStore';
import api from '../services/api';
import { 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  Loader2, 
  SlidersHorizontal,
  Info,
  CheckCircle,
  Database,
  Grid,
  TrendingUp,
  PieChart as PieIcon,
  BarChart as BarIcon,
  Maximize2,
  Upload,
  FileSpreadsheet,
  ArrowRightLeft,
  FolderOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  ScatterChart, 
  Scatter, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ExecutiveDashboard: React.FC = () => {
  const { 
    datasets,
    activeDataset, 
    isLoading: storeLoading, 
    error: storeError, 
    fetchDatasets, 
    uploadDataset, 
    deleteDataset, 
    joinDatasets 
  } = useDatasetStore();

  const [widgets, setWidgets] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showManager, setShowManager] = useState(false);
  
  // Widget Creator Form State
  const [widgetName, setWidgetName] = useState('New Analytics Metric');
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [agg, setAgg] = useState('sum');
  const [showCreator, setShowCreator] = useState(false);

  // Drag and Drop & Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Join State
  const [datasetA, setDatasetA] = useState('');
  const [datasetB, setDatasetB] = useState('');
  const [joinType, setJoinType] = useState('inner');
  const [joinKeyA, setJoinKeyA] = useState('');
  const [joinKeyB, setJoinKeyB] = useState('');
  const [outputName, setOutputName] = useState('joined_dataset.csv');

  // AI Executive Summary State
  const [executiveSummary, setExecutiveSummary] = useState<string | null>(null);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const columns = activeDataset ? Object.keys(activeDataset.columns_metadata) : [];

  // Fetch datasets list on mount
  useEffect(() => {
    fetchDatasets();
  }, []);

  // Set default selections for Join strategy on datasets change
  useEffect(() => {
    if (datasets.length > 1) {
      if (!datasetA) setDatasetA(datasets[0].id);
      if (!datasetB) setDatasetB(datasets[1].id);
    }
  }, [datasets]);

  // Load preview, widgets, and AI summary when active dataset changes
  useEffect(() => {
    if (activeDataset) {
      loadDashboardWidgets();
      loadPreviewData();
      loadExecutiveSummary();
    } else {
      setWidgets([]);
      setPreviewData([]);
      setExecutiveSummary(null);
    }
  }, [activeDataset]);

  useEffect(() => {
    if (columns.length > 0) {
      setXAxis(columns[0]);
      setYAxis(columns[0]);
    }
  }, [activeDataset]);

  // Handle columns for Join Engine
  const activeDatasetAObj = datasets.find(d => d.id === datasetA);
  const activeDatasetBObj = datasets.find(d => d.id === datasetB);
  
  const colsA = activeDatasetAObj ? Object.keys(activeDatasetAObj.columns_metadata) : [];
  const colsB = activeDatasetBObj ? Object.keys(activeDatasetBObj.columns_metadata) : [];

  useEffect(() => {
    if (colsA.length > 0) setJoinKeyA(colsA[0]);
    if (colsB.length > 0) setJoinKeyB(colsB[0]);
  }, [datasetA, datasetB]);

  const loadDashboardWidgets = async () => {
    if (!activeDataset) return;
    try {
      const response = await api.get(`/visualizations?dataset_id=${activeDataset.id}`);
      setWidgets(response.data);
    } catch (err) {
      console.error("Failed to fetch widgets", err);
    }
  };

  const loadPreviewData = async () => {
    if (!activeDataset) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/datasets/${activeDataset.id}/preview`);
      setPreviewData(response.data.rows);
    } catch (err) {
      console.error("Failed loading preview rows", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExecutiveSummary = async () => {
    if (!activeDataset) return;
    setIsFetchingSummary(true);
    setSummaryError(null);
    try {
      const response = await api.get(`/eda/${activeDataset.id}`);
      setExecutiveSummary(response.data.executive_summary);
    } catch (err: any) {
      setSummaryError(err.response?.data?.detail || 'Failed to retrieve AI analysis insights.');
    } finally {
      setIsFetchingSummary(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processUpload(e.target.files[0]);
    }
  };

  const processUpload = async (file: File) => {
    setUploadProgress(true);
    const uploaded = await uploadDataset(file);
    setUploadProgress(false);
    if (uploaded) {
      fetchDatasets();
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Create widget handler
  const handleCreateWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDataset || !widgetName || !xAxis) return;

    try {
      const response = await api.post('/visualizations', {
        dataset_id: activeDataset.id,
        name: widgetName,
        chart_type: chartType,
        configuration: {
          x_axis: xAxis,
          y_axis: yAxis,
          agg: agg,
          title: widgetName
        },
        is_dashboard_widget: true
      });
      
      setWidgets([...widgets, response.data]);
      setShowCreator(false);
      setWidgetName('New Analytics Metric');
    } catch (err) {
      console.error("Failed creating widget", err);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    try {
      await api.delete(`/visualizations/${widgetId}`);
      setWidgets(widgets.filter(w => w.id !== widgetId));
    } catch (err) {
      console.error("Failed deleting widget", err);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetA || !datasetB || !joinKeyA || !joinKeyB || !outputName) return;

    const res = await joinDatasets({
      dataset_a_id: datasetA,
      dataset_b_id: datasetB,
      join_type: joinType,
      join_on_a: joinKeyA,
      join_on_b: joinKeyB,
      output_filename: outputName
    });

    if (res) {
      alert("Datasets compiled and merged successfully!");
      fetchDatasets();
    }
  };

  // Helper function to aggregate preview data locally
  const getAggregatedData = (config: any) => {
    const { x_axis, y_axis, agg } = config;
    if (!previewData || previewData.length === 0 || !x_axis) return [];

    const groups: Record<string, number[]> = {};
    previewData.forEach(row => {
      const key = String(row[x_axis] ?? 'Null');
      const val = Number(row[y_axis] ?? 0);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(isNaN(val) ? 0 : val);
    });

    return Object.entries(groups).map(([name, values]) => {
      let finalVal = 0;
      if (agg === 'sum') {
        finalVal = values.reduce((a, b) => a + b, 0);
      } else if (agg === 'mean') {
        finalVal = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      } else if (agg === 'count') {
        finalVal = values.length;
      }
      return {
        name: name.substring(0, 15),
        value: Number(finalVal.toFixed(2))
      };
    }).slice(0, 8);
  };

  // ================= BRANCH: NO ACTIVE WORKSPACE LOADED =================
  if (!activeDataset) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
        <div className="text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text">AI Data Analyst Portal</h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            To get started, please upload your spreadsheet datasets or select an existing workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Upload Zone and Files List */}
          <div className="lg:col-span-2 space-y-8">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`glass-panel border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/5' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/20'
              }`}
              onClick={handleTriggerUpload}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInput}
                accept=".csv, .xlsx, .xls"
                className="hidden"
              />
              
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-6">
                {uploadProgress ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  <Upload size={28} />
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-100">
                {uploadProgress ? 'Processing spreadsheet...' : 'Upload your data source'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mt-2 font-medium leading-relaxed">
                Drag & drop files here, or click to browse. Supports CSV, XLS, and XLSX up to 50MB.
              </p>
            </div>

            {storeError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl text-center">
                {storeError}
              </div>
            )}

            {/* Datasets inventory list */}
            <div className="glass-panel rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <FolderOpen size={18} className="text-blue-500" />
                Available Datasets ({datasets.length})
              </h2>

              {datasets.length === 0 ? (
                <div className="py-12 text-center">
                  <FileSpreadsheet size={40} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-sm text-slate-500 font-semibold">No spreadsheets uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {datasets.map((d: Dataset) => (
                    <div 
                      key={d.id}
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/20 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                          <FileSpreadsheet size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-200 truncate pr-4">{d.filename}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            {(d.file_size / (1024 * 1024)).toFixed(2)} MB • {d.row_count.toLocaleString()} rows • {d.col_count} columns
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => useDatasetStore.getState().selectDataset(d.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                        >
                          Select Workspace
                        </button>
                        
                        <button
                          onClick={() => deleteDataset(d.id)}
                          className="p-2 text-slate-500 hover:text-red-400 rounded-xl border border-transparent hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Relation Join Module */}
          <div className="space-y-8">
            <div className="glass-panel rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-blue-500" />
                Relational Join Engine
              </h2>
              <p className="text-xs text-slate-500 font-medium mb-6">
                Combine two datasets horizontally using shared key columns.
              </p>

              {datasets.length < 2 ? (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-400 leading-relaxed font-semibold">
                  <Info size={20} className="text-slate-500 mx-auto mb-2" />
                  You must upload at least two datasets to perform join operations.
                </div>
              ) : (
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Primary Dataset (A)
                    </label>
                    <select
                      value={datasetA}
                      onChange={(e) => setDatasetA(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      {datasets.map((d) => (
                        <option key={d.id} value={d.id}>{d.filename}</option>
                      ))}
                    </select>
                  </div>

                  {colsA.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Join Column (Key A)
                      </label>
                      <select
                        value={joinKeyA}
                        onChange={(e) => setJoinKeyA(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        {colsA.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Secondary Dataset (B)
                    </label>
                    <select
                      value={datasetB}
                      onChange={(e) => setDatasetB(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      {datasets.map((d) => (
                        <option key={d.id} value={d.id} disabled={d.id === datasetA}>{d.filename}</option>
                      ))}
                    </select>
                  </div>

                  {colsB.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Join Column (Key B)
                      </label>
                      <select
                        value={joinKeyB}
                        onChange={(e) => setJoinKeyB(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        {colsB.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Relation Strategy
                    </label>
                    <select
                      value={joinType}
                      onChange={(e) => setJoinType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="inner">Inner Join (Match only)</option>
                      <option value="left">Left Join (Keep all of A)</option>
                      <option value="right">Right Join (Keep all of B)</option>
                      <option value="outer">Full Outer Join (Keep all records)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Output Filename
                    </label>
                    <input
                      type="text"
                      required
                      value={outputName}
                      onChange={(e) => setOutputName(e.target.value)}
                      className="w-full glass-input rounded-2xl px-4 py-3 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={storeLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    {storeLoading ? <Loader2 className="animate-spin" size={16} /> : <>Execute Joined Compilation <Sparkles size={14} /></>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= BRANCH: ACTIVE WORKSPACE CONTENT =================
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text">Executive Dashboard</h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Monitor KPI metrics cards, customize layout charts, or manage uploaded workspace datasets.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowManager(!showManager)}
            className="border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60 text-slate-300 font-bold py-3 px-5 rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            Manage Datasets ({datasets.length})
            {showManager ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={() => setShowCreator(!showCreator)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-5 rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
          >
            <Plus size={14} />
            Create custom widget
          </button>
        </div>
      </div>

      {/* Dataset & Workspace Manager Panel (Collapsible Drawer) */}
      {showManager && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800/80 bg-slate-900/40 animate-fade-in space-y-6">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
            <FolderOpen size={16} className="text-blue-500" />
            Upload & Workspace Manager
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Mini Upload Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/10'
                }`}
                onClick={handleTriggerUpload}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                />
                <Upload size={20} className="text-blue-500 mb-2" />
                <span className="text-xs font-bold text-slate-200">
                  {uploadProgress ? 'Processing spreadsheet...' : 'Upload new spreadsheet dataset'}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Supports CSV, XLS, XLSX formats.</p>
              </div>

              {/* Datasets List */}
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {datasets.map((d: Dataset) => (
                  <div 
                    key={d.id} 
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                      activeDataset.id === d.id ? 'border-blue-500/30 bg-blue-600/5' : 'border-slate-850 bg-slate-950/20'
                    }`}
                  >
                    <div className="min-w-0 pr-4">
                      <p className="font-bold text-slate-200 truncate">{d.filename}</p>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {(d.file_size / (1024 * 1024)).toFixed(2)} MB • {d.row_count.toLocaleString()} rows
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => useDatasetStore.getState().selectDataset(d.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          activeDataset.id === d.id ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {activeDataset.id === d.id ? 'Active' : 'Select'}
                      </button>
                      <button
                        onClick={() => deleteDataset(d.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Join Module */}
            <div className="border-l border-slate-800/80 pl-0 lg:pl-8 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Combine Workspaces</h4>
              {datasets.length < 2 ? (
                <p className="text-[10px] text-slate-500 font-semibold">Upload at least two files to enable merge.</p>
              ) : (
                <div className="space-y-3 text-xs">
                  <select
                    value={datasetA}
                    onChange={(e) => setDatasetA(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-[11px] focus:outline-none cursor-pointer"
                  >
                    {datasets.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
                  </select>
                  <select
                    value={datasetB}
                    onChange={(e) => setDatasetB(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-[11px] focus:outline-none cursor-pointer"
                  >
                    {datasets.map((d) => <option key={d.id} value={d.id} disabled={d.id === datasetA}>{d.filename}</option>)}
                  </select>
                  <button
                    onClick={() => {
                      setShowManager(false);
                      // Force trigger active dataset selection triggers
                      const button = document.createElement('button');
                      button.onclick = () => {
                        const res = joinDatasets({
                          dataset_a_id: datasetA,
                          dataset_b_id: datasetB,
                          join_type: joinType,
                          join_on_a: joinKeyA,
                          join_on_b: joinKeyB,
                          output_filename: outputName
                        });
                        res.then(d => { if(d) fetchDatasets(); });
                      };
                      button.click();
                    }}
                    className="w-full bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 text-blue-400 hover:text-white font-bold py-2 rounded-xl text-[11px] transition-all cursor-pointer"
                  >
                    Compile Workspace Merge
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Widget Creator Box */}
      {showCreator && (
        <div className="glass-panel rounded-3xl p-6 animate-fade-in border border-blue-500/20 bg-blue-500/2">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-blue-500" />
            Widget Designer
          </h3>

          <form onSubmit={handleCreateWidget} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-2">Widget Name</label>
              <input
                type="text"
                required
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>
            
            <div>
              <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-2">Chart Type</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="scatter">Scatter Plot</option>
                <option value="pie">Donut Chart</option>
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-2">Category Key (X)</label>
              <select
                value={xAxis}
                onChange={(e) => setXAxis(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-2">Metric Value (Y)</label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-2">Aggregation</label>
              <select
                value={agg}
                onChange={(e) => setAgg(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="sum">Sum of values</option>
                <option value="mean">Average of values</option>
                <option value="count">Count records</option>
              </select>
            </div>

            <div className="md:col-span-5 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowCreator(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 rounded-xl hover:bg-slate-900/60 transition-colors text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors text-xs font-semibold cursor-pointer shadow-lg"
              >
                Add Widget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-5 border border-slate-805">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Workspace Records</span>
          <p className="text-xl font-bold text-slate-200 mt-1">{activeDataset.row_count?.toLocaleString()}</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-805">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Dimension Fields</span>
          <p className="text-xl font-bold text-slate-200 mt-1">{activeDataset.col_count}</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-805">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">File Size Footprint</span>
          <p className="text-xl font-bold text-slate-200 mt-1">
            {(activeDataset.file_size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-805">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Active Status</span>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-400 font-semibold uppercase tracking-wide">
            <CheckCircle size={14} />
            Cleaned & Ready
          </div>
        </div>
      </div>

      {/* AI Analyst Insights Section */}
      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden border border-blue-500/15">
        <div className="absolute top-0 right-0 p-3 bg-blue-500/10 text-blue-400 rounded-bl-3xl">
          <Sparkles size={16} className="animate-pulse" />
        </div>
        
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-blue-500" />
          AI Analyst Insights
        </h2>

        {isFetchingSummary ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="animate-spin text-blue-500 mb-3" size={24} />
            <p className="text-xs text-slate-500 font-semibold">Running artificial intelligence analysis on '{activeDataset.filename}'...</p>
          </div>
        ) : summaryError ? (
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-3">
            <AlertCircle size={16} />
            <span>{summaryError}</span>
          </div>
        ) : executiveSummary ? (
          <div className="text-xs leading-relaxed text-slate-300 font-medium space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {executiveSummary.split('\n').map((line: string, index: number) => {
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
        ) : (
          <p className="text-xs text-slate-500 font-semibold">No AI insights generated yet. Verify backend connection settings.</p>
        )}
      </div>

      {/* Dashboard widgets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {widgets.map((widget) => {
          const chartData = getAggregatedData(widget.configuration);
          
          return (
            <div key={widget.id} className="glass-panel rounded-3xl p-6 flex flex-col justify-between min-h-[360px]">
              
              {/* Widget Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 truncate pr-6 max-w-xs">{widget.name}</h4>
                  <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                    Metric: {widget.configuration.y_axis} (aggregated by {widget.configuration.agg})
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteWidget(widget.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Widget Graph */}
              <div className="h-60 w-full flex-1">
                {chartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-500 font-semibold">
                    <Info size={32} className="mb-2 text-slate-700" />
                    Failed calculating aggregated data records.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {widget.chart_type === 'line' ? (
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10 }} />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    ) : widget.chart_type === 'scatter' ? (
                      <ScatterChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10 }} />
                        <Scatter name="Points" dataKey="value" fill="#10b981" />
                      </ScatterChart>
                    ) : widget.chart_type === 'pie' ? (
                      <PieChart>
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10 }} />
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    ) : (
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 10 }} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          );
        })}

        {widgets.length === 0 && (
          <div className="md:col-span-2 py-20 text-center glass-panel rounded-3xl p-6 border border-dashed border-slate-800">
            <Info size={40} className="text-slate-700 mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-semibold">No dashboard widgets compiled yet.</p>
            <p className="text-xs text-slate-600 mt-1">Select 'Create custom widget' above to build visualizations.</p>
          </div>
        )}
      </div>

    </div>
  );
};
