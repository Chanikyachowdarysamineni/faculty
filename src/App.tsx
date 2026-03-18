import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Faculty from './pages/Faculty';
import Courses from './pages/Courses';
import Allocations from './pages/Allocations';
import Preferences from './pages/Preferences';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return <>{children}</>;
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/faculty" element={<ProtectedRoute roles={['admin', 'dual']}><Faculty /></ProtectedRoute>} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/allocations" element={<ProtectedRoute roles={['admin', 'dual']}><Allocations /></ProtectedRoute>} />
                <Route path="/workload" element={<ProtectedRoute roles={['admin', 'dual']}><Allocations /></ProtectedRoute>} />
                <Route path="/preferences" element={<Preferences />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
