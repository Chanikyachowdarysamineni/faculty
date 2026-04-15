/**
 * AdminDashboard.jsx
 * 
 * Admin-only dashboard accessible to users with admin role
 * Shows admin-specific features and management options
 * Fully responsive with mobile sidebar toggle
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PageHeader from './components/PageHeader';
import './Dashboard.css';

const AdminDashboard = () => {
  const { currentUser, onLogout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Close sidebar when a nav item is clicked on mobile
  const handleNavClick = (tab, path) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (path) navigate(path);
  };

  // Close sidebar when clicking overlay on mobile
  const handleSidebarOverlayClick = () => {
    setSidebarOpen(false);
  };

  // Close sidebar on screen resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect to login if not authenticated or not admin
  if (!currentUser) {
    navigate('/login', { replace: true });
    return null;
  }

  if (currentUser.role !== 'admin') {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="dashboard">
      <PageHeader 
        user={currentUser} 
        onLogout={handleLogout}
        isAdmin={true}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="dashboard-content">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay open"
            onClick={handleSidebarOverlayClick}
          />
        )}

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            <h3 className="sidebar-title">Admin Panel</h3>
            
            <div className="nav-section">
              <button
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleNavClick('overview')}
              >
                📊 Overview
              </button>
              <button
                className={`nav-link ${activeTab === 'faculty' ? 'active' : ''}`}
                onClick={() => handleNavClick('faculty', '/faculty')}
              >
                👥 Manage Faculty
              </button>
              <button
                className={`nav-link ${activeTab === 'courses' ? 'active' : ''}`}
                onClick={() => handleNavClick('courses', '/courses')}
              >
                📚 Manage Courses
              </button>
              <button
                className={`nav-link ${activeTab === 'workload' ? 'active' : ''}`}
                onClick={() => handleNavClick('workload', '/workload')}
              >
                💼 Workload Management
              </button>
              <button
                className={`nav-link ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => handleNavClick('audit', '/audit-logs')}
              >
                📋 Audit Logs
              </button>
              <button
                className={`nav-link ${activeTab === 'sections' ? 'active' : ''}`}
                onClick={() => handleNavClick('sections', '/sections')}
              >
                🎓 Section Management
              </button>
              <button
                className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleNavClick('settings', '/settings')}
              >
                ⚙️ Settings
              </button>
            </div>
          </nav>
        </aside>

        <main className="main-content">
          {activeTab === 'overview' && <AdminOverview user={currentUser} />}
        </main>
      </div>
    </div>
  );
};

/**
 * Admin Overview Card - Shows key admin information and quick actions
 */
const AdminOverview = ({ user }) => {
  return (
    <div className="admin-overview">
      <div className="welcome-card">
        <h1>Welcome, Admin {user.name}!</h1>
        <p className="emp-id">Employee ID: {user.id}</p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Admin Access</h3>
            <p className="stat-value">Full Privileges</p>
            <p className="stat-desc">All management features available</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔒</div>
          <div className="stat-content">
            <h3>Security Status</h3>
            <p className="stat-value">Active</p>
            <p className="stat-desc">Secure session in progress</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Access Level</h3>
            <p className="stat-value">Administrator</p>
            <p className="stat-desc">Full system access granted</p>
          </div>
        </div>
      </div>

      <div className="admin-features">
        <h2>Admin Features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <h4>👥 Faculty Management</h4>
            <p>Add, edit, and manage faculty members across all departments</p>
          </div>
          <div className="feature-item">
            <h4>📚 Course Administration</h4>
            <p>Create and manage course offerings, sections, and allocations</p>
          </div>
          <div className="feature-item">
            <h4>💼 Workload Distribution</h4>
            <p>Oversee faculty workload allocation and adjust as needed</p>
          </div>
          <div className="feature-item">
            <h4>📋 Audit Trail</h4>
            <p>Monitor all system activities and user actions</p>
          </div>
          <div className="feature-item">
            <h4>🎓 Section Setup</h4>
            <p>Configure sections and course allocations by semester</p>
          </div>
          <div className="feature-item">
            <h4>⚙️ System Settings</h4>
            <p>Configure system-wide settings and preferences</p>
          </div>
        </div>
      </div>

      <div className="admin-info">
        <h3>📌 Important</h3>
        <p>
          You have full administrator access. All your actions are logged for security and audit purposes.
          Please use this access responsibly and only modify data as necessary.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
