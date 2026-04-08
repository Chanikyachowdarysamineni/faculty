import React, { useState, useEffect, useCallback, useRef } from 'react';
import ErrorBoundary from './ErrorBoundary';
import ToastProvider from './Toast';
import LoadingProvider from './LoadingIndicator';
import { DataProvider } from './DataContext';
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

// Session timeout constants (in seconds)
const SESSION_TIMEOUT_SECONDS = 30 * 60; // 30 minutes
const WARNING_THRESHOLD_SECONDS = 2 * 60; // 2 minutes before timeout

function AppContent() {
  const [currentUser, setCurrentUser] = useState(loadSavedUser);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_TIMEOUT_SECONDS);
  
  // Use refs to track session state without triggering re-renders
  const sessionTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const sessionStartRef = useRef(null);

  const handleLogin = useCallback((user) => {
    localStorage.setItem('wlm_user', JSON.stringify(user));
    setCurrentUser(user);
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);
  }, []);

  const handleLogout = useCallback(async () => {
    // Clear all timers first
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Try to call logout endpoint
    try {
      const token = localStorage.getItem('wlm_token');
      if (token) {
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {}); // Ignore errors
      }
    } catch (err) {
      console.error('Logout API call failed:', err);
    }
    
    localStorage.removeItem('wlm_token');
    localStorage.removeItem('wlm_user');
    setCurrentUser(null);
    setShowTimeoutWarning(false);
    setRemainingSeconds(SESSION_TIMEOUT_SECONDS);
  }, []);

  // Start/reset the countdown timer
  const startCountdown = useCallback(() => {
    // Clear existing countdown
    if (countdownRef.current) clearInterval(countdownRef.current);

    let timeLeft = SESSION_TIMEOUT_SECONDS;
    setRemainingSeconds(timeLeft);

    // Update UI every second
    countdownRef.current = setInterval(() => {
      timeLeft--;
      setRemainingSeconds(timeLeft);

      // Show warning when 2 minutes remaining
      if (timeLeft === WARNING_THRESHOLD_SECONDS) {
        setShowTimeoutWarning(true);
      }

      // Auto-logout when time is up
      if (timeLeft <= 0) {
        clearInterval(countdownRef.current);
        handleLogout();
      }
    }, 1000);
  }, [handleLogout]);

  // Reset session timeout on user activity
  const resetSessionTimeout = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // Debounce: only reset if at least 3 seconds passed since last activity
    if (timeSinceLastActivity < 3000) return;

    lastActivityRef.current = now;
    setShowTimeoutWarning(false);

    // Clear existing session timer
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Start fresh countdown
    startCountdown();
  }, [startCountdown]);

  // Initialize session timer when user logs in
  useEffect(() => {
    if (!currentUser) {
      // Cleanup on logout
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    // Start fresh session
    lastActivityRef.current = Date.now();
    sessionStartRef.current = Date.now();
    setShowTimeoutWarning(false);
    startCountdown();

    // Cleanup on unmount or user change
    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [currentUser, startCountdown]);

  // Track user activity and reset session
  useEffect(() => {
    if (!currentUser) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetSessionTimeout();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true); // Use capture phase
    });

    // Cleanup event listeners
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [currentUser, resetSessionTimeout]);

  // Handle unauthorized events
  useEffect(() => {
    const onUnauthorized = () => handleLogout();
    window.addEventListener('wlm:unauthorized', onUnauthorized);
    return () => window.removeEventListener('wlm:unauthorized', onUnauthorized);
  }, [handleLogout]);

  if (currentUser) {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <>
        {showTimeoutWarning && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '420px',
            minWidth: '280px',
            zIndex: 10000,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            animation: 'slideInRight 0.3s ease-out',
          }}>
            <style>{`
              @keyframes slideInRight {
                from {
                  opacity: 0;
                  transform: translateX(400px);
                }
                to {
                  opacity: 1;
                  transform: translateX(0);
                }
              }
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
              .timeout-pulse {
                animation: pulse 1.5s ease-in-out infinite;
              }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <span style={{ fontSize: '28px', lineHeight: '1' }} className="timeout-pulse">⏱️</span>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#b45309', fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                  ⚠️ Session Timeout Warning
                </strong>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#92400e', lineHeight: '1.4' }}>
                  Your session will expire in <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{formatTime(remainingSeconds)}</span> due to inactivity.
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: '#a16207', fontStyle: 'italic' }}>
                  Move your mouse, press a key, or click the button below to stay logged in.
                </p>
                <button
                  onClick={() => resetSessionTimeout()}
                  style={{
                    marginTop: '12px',
                    background: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#d97706';
                    e.target.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f59e0b';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ✓ Stay Logged In
                </button>
              </div>
            </div>
          </div>
        )}
        <Dashboard user={currentUser} onLogout={handleLogout} remainingSeconds={remainingSeconds} />
      </>
    );
  }

  return <LoginPage onLogin={handleLogin} />;
}

function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <ToastProvider>
          <LoadingProvider>
            <AppContent />
          </LoadingProvider>
        </ToastProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}

export default App;
