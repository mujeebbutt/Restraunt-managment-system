import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import MenuManager from './pages/MenuManager';
import Stock from './pages/Stock';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Passcode Authentication Page */}
        <Route path="/login" element={<Login />} />
        
        {/* Secured POS Shell Frame */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Child subview pages */}
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="stock" element={<Stock />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all fallback redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
