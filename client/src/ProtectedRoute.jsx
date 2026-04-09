/**
 * ProtectedRoute Wrapper Component
 * 
 * Ensures that routes are only accessible to authenticated users.
 * If user is not authenticated, redirects to login page.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

