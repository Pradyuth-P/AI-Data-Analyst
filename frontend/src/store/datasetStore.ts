import { create } from 'zustand';
import api from '../services/api';

export interface Dataset {
  id: string;
  filename: string;
  file_size: number;
  row_count: number;
  col_count: number;
  columns_metadata: Record<string, any>;
  cleaned_file_path: string | null;
  created_at: string;
}

interface DatasetState {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  isLoading: boolean;
  error: string | null;
  fetchDatasets: () => Promise<void>;
  selectDataset: (id: string) => void;
  uploadDataset: (file: File) => Promise<Dataset | null>;
  deleteDataset: (id: string) => Promise<boolean>;
  joinDatasets: (params: {
    dataset_a_id: string;
    dataset_b_id: string;
    join_type: string;
    join_on_a: string;
    join_on_b: string;
    output_filename: string;
  }) => Promise<Dataset | null>;
  cleanDataset: (id: string, autoClean: boolean, operations: any[]) => Promise<any>;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  datasets: [],
  activeDataset: null,
  isLoading: false,
  error: null,

  fetchDatasets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/datasets');
      const datasets = response.data;
      
      let active = get().activeDataset;
      if (datasets.length > 0) {
        // Maintain selection or pick the latest uploaded one
        if (!active || !datasets.some((d: Dataset) => d.id === active?.id)) {
          active = datasets[0];
        } else {
          // Update active with fresh metadata
          active = datasets.find((d: Dataset) => d.id === active?.id) || datasets[0];
        }
      } else {
        active = null;
      }
      
      set({ datasets, activeDataset: active, isLoading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch datasets list', isLoading: false });
    }
  },

  selectDataset: (id: string) => {
    const { datasets } = get();
    const active = datasets.find((d) => d.id === id) || null;
    set({ activeDataset: active });
  },

  uploadDataset: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/datasets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const newDataset = response.data;
      set((state) => {
        const updated = [newDataset, ...state.datasets];
        return {
          datasets: updated,
          activeDataset: newDataset,
          isLoading: false
        };
      });
      return newDataset;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload dataset';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  deleteDataset: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/datasets/${id}`);
      
      set((state) => {
        const updated = state.datasets.filter((d) => d.id !== id);
        const nextActive = updated.length > 0 ? updated[0] : null;
        return {
          datasets: updated,
          activeDataset: nextActive,
          isLoading: false
        };
      });
      return true;
    } catch (err: any) {
      set({ error: 'Failed to delete dataset', isLoading: false });
      return false;
    }
  },

  joinDatasets: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/datasets/join', params);
      const joinedDataset = response.data.dataset;
      set((state) => ({
        datasets: [joinedDataset, ...state.datasets],
        activeDataset: joinedDataset,
        isLoading: false
      }));
      return joinedDataset;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to merge datasets';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  cleanDataset: async (id, autoClean, operations) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/cleaning/${id}`, {
        auto_clean: autoClean,
        operations
      });
      
      const { dataset, stats_before, stats_after } = response.data;
      
      // Update local copy
      set((state) => {
        const updated = state.datasets.map((d) => d.id === id ? dataset : d);
        return {
          datasets: updated,
          activeDataset: dataset,
          isLoading: false
        };
      });
      return { success: true, stats_before, stats_after };
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Cleaning operation failed';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  }
}));
