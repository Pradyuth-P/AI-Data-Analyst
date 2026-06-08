import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';

// Import Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ExecutiveDashboard } from './pages/Dashboard';
import { DataCleaning } from './pages/Clean';
import { AutomatedEDA } from './pages/EDA';
import { AIChat } from './pages/Chat';
import { Forecasting } from './pages/Forecast';
import { AnomalyDetection } from './pages/Anomalies';
import { InsightsAndReports } from './pages/Reports';
import { AdminConsole } from './pages/Admin';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, initialize } = useAuthStore();
  
  useEffect(() => {
    initialize();
  }, []);

  if (!localStorage.getItem('access_token')) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Admin Route Wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initialize } = useAuthStore();
  
  useEffect(() => {
    initialize();
  }, []);

  const token = localStorage.getItem('access_token');
  const cachedUser = localStorage.getItem('auth_user');
  const parsedUser = cachedUser ? JSON.parse(cachedUser) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (parsedUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Unprotected Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Workspace */}
        <Route path="/" element={<ProtectedRoute><ExecutiveDashboard /></ProtectedRoute>} />
        <Route path="/clean" element={<ProtectedRoute><DataCleaning /></ProtectedRoute>} />
        <Route path="/eda" element={<ProtectedRoute><AutomatedEDA /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
        <Route path="/forecast" element={<ProtectedRoute><Forecasting /></ProtectedRoute>} />
        <Route path="/anomalies" element={<ProtectedRoute><AnomalyDetection /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><InsightsAndReports /></ProtectedRoute>} />

        {/* Admin Control Console */}
        <Route path="/admin" element={<AdminRoute><AdminConsole /></AdminRoute>} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};
