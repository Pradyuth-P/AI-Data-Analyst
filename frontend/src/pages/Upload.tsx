import React, { useState, useRef, useEffect } from 'react';
import { useDatasetStore, Dataset } from '../store/datasetStore';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  ArrowRightLeft, 
  Database, 
  FolderOpen, 
  Loader2, 
  Sparkles,
  Info
} from 'lucide-react';

export const UploadWorkspace: React.FC = () => {
  const { 
    datasets, 
    activeDataset, 
    isLoading, 
    error, 
    fetchDatasets, 
    uploadDataset, 
    deleteDataset, 
    joinDatasets 
  } = useDatasetStore();

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

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Update default join selections when datasets change
  useEffect(() => {
    if (datasets.length > 1) {
      setDatasetA(datasets[0].id);
      setDatasetB(datasets[1].id);
    }
  }, [datasets]);

  // Handle keys list based on datasets selected
  const activeDatasetAObj = datasets.find(d => d.id === datasetA);
  const activeDatasetBObj = datasets.find(d => d.id === datasetB);
  
  const colsA = activeDatasetAObj ? Object.keys(activeDatasetAObj.columns_metadata) : [];
  const colsB = activeDatasetBObj ? Object.keys(activeDatasetBObj.columns_metadata) : [];

  useEffect(() => {
    if (colsA.length > 0) setJoinKeyA(colsA[0]);
    if (colsB.length > 0) setJoinKeyB(colsB[0]);
  }, [datasetA, datasetB]);

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
      alert("Datasets joined successfully! Fresh joined dataset loaded into workspace.");
      fetchDatasets();
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text">Upload Workspace</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Drag and drop spreadsheets or merge multiple files using relation keys.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* File Drag and Drop & List */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Drag and Drop Zone */}
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl text-center">
              {error}
            </div>
          )}

          {/* Uploaded Datasets List */}
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-500" />
              Uploaded Datasets ({datasets.length})
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
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      activeDataset?.id === d.id 
                        ? 'border-blue-500/30 bg-blue-600/5' 
                        : 'border-slate-800 bg-slate-900/20'
                    }`}
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                          activeDataset?.id === d.id 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {activeDataset?.id === d.id ? 'Active Workspace' : 'Select'}
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

        {/* Dataset Multi-join panel */}
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
                
                {/* Dataset A */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Primary Dataset (A)
                  </label>
                  <select
                    value={datasetA}
                    onChange={(e) => setDatasetA(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>{d.filename}</option>
                    ))}
                  </select>
                </div>

                {/* Key A */}
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

                {/* Dataset B */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Secondary Dataset (B)
                  </label>
                  <select
                    value={datasetB}
                    onChange={(e) => setDatasetB(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.id === datasetA}>{d.filename}</option>
                    ))}
                  </select>
                </div>

                {/* Key B */}
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

                {/* Join Type */}
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

                {/* Output Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Joined Output Filename
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
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      Execute Joined Compilation
                      <Sparkles size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
