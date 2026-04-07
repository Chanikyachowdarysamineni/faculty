import React, { useState, useEffect, useCallback } from 'react';
import ErrorBoundary from './ErrorBoundary';
import ToastProvider from './Toast';
import LoadingProvider from './LoadingIndicator';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';

// Restore a previously saved session (token and user payload saved at login)
function loadSavedUser() {
  try {
    const token = localStorage.getItem('wlm_token');
    const raw   = localStorage.getItem('wlm_user');
    if (!token || !raw) return null;
    const user = JSON.parse(raw);
    // Must have an id and role — discard any stale/incomplete entries
    if (!user?.id || !user?.role) {
      localStorage.removeItem('wlm_token');
      localStorage.removeItem('wlm_user');
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState(loadSavedUser);

  const handleLogin = useCallback((user) => {
    localStorage.setItem('wlm_user', JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('wlm_token');
    localStorage.removeItem('wlm_user');
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => handleLogout();
    window.addEventListener('wlm:unauthorized', onUnauthorized);
    return () => window.removeEventListener('wlm:unauthorized', onUnauthorized);
  }, [handleLogout]);

  if (currentUser) {
    return <Dashboard user={currentUser} onLogout={handleLogout} />;
  }

  return <LoginPage onLogin={handleLogin} />;
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <LoadingProvider>
          <AppContent />
        </LoadingProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
