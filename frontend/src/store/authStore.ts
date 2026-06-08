import { create } from 'zustand';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (form: FormData) => Promise<boolean>;
  register: (email: string, full_name: string, password: string) => Promise<boolean>;
  logout: () => void;
  initialize: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Listen for global logout events triggered by interceptors
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-logout', () => {
      set({ user: null, token: null, isAuthenticated: false, error: 'Session expired' });
    });
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    initialize: () => {
      const token = localStorage.getItem('access_token');
      const cachedUser = localStorage.getItem('auth_user');
      if (token && cachedUser) {
        set({
          token,
          user: JSON.parse(cachedUser),
          isAuthenticated: true,
          error: null,
        });
      }
    },

    clearError: () => set({ error: null }),

    login: async (form: FormData) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.post('/auth/login', form, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        const { access_token, user } = response.data;
        
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        set({
          token: access_token,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } catch (err: any) {
        const errMsg = err.response?.data?.detail || 'Authentication failed';
        set({ error: errMsg, isLoading: false });
        return false;
      }
    },

    register: async (email, full_name, password) => {
      set({ isLoading: true, error: null });
      try {
        await api.post('/auth/register', { email, full_name, password });
        set({ isLoading: false, error: null });
        return true;
      } catch (err: any) {
        const errMsg = err.response?.data?.detail || 'Registration failed';
        set({ error: errMsg, isLoading: false });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      });
    },
  };
});
