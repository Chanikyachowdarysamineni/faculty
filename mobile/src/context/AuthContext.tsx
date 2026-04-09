import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios, { AxiosInstance } from 'axios';
import API_CONFIG from '../constants/apiConfig';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'faculty';
  email?: string;
  canAccessAdmin?: boolean;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp?: (email: string, password: string) => Promise<void>;
  error: string | null;
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize axios instance with token
  const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
  });

  // Add token to requests
  api.interceptors.request.use(
    async (config) => {
      try {
        const token = await SecureStore.getItemAsync('wlm_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.warn('Failed to get token:', err);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Handle token refresh on 401
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        try {
          const refreshToken = await SecureStore.getItemAsync('wlm_refresh_token');
          if (refreshToken) {
            const response = await axios.post(
              `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`,
              { refreshToken }
            );
            if (response.data.success) {
              await SecureStore.setItemAsync('wlm_token', response.data.data.token);
              error.config.headers.Authorization = `Bearer ${response.data.data.token}`;
              return api(error.config);
            }
          }
        } catch (refreshError) {
          console.warn('Token refresh failed:', refreshError);
        }
        await signOut();
      }
      return Promise.reject(error);
    }
  );

  // Bootstrap async data such as tokens on app start
  const bootstrapAsync = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('wlm_token');
      const userData = await SecureStore.getItemAsync('wlm_user');

      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (err) {
      console.warn('Failed to restore session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrapAsync();
  }, [bootstrapAsync]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setIsSigningIn(true);
      setError(null);
      try {
        const response = await api.post(API_CONFIG.ENDPOINTS.LOGIN, {
          email,
          password,
        });

        if (response.data.success) {
          const userData = response.data.data;
          await SecureStore.setItemAsync('wlm_token', userData.token);
          if (userData.refreshToken) {
            await SecureStore.setItemAsync('wlm_refresh_token', userData.refreshToken);
          }

          const user: User = {
            id: userData.id,
            name: userData.name,
            role: userData.role,
            email: userData.email,
            canAccessAdmin: userData.canAccessAdmin,
          };

          await SecureStore.setItemAsync('wlm_user', JSON.stringify(user));
          setUser(user);
        } else {
          setError(response.data.message || 'Login failed');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Login failed';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsSigningIn(false);
      }
    },
    [api]
  );

  const signOut = useCallback(async () => {
    try {
      await api.post(API_CONFIG.ENDPOINTS.LOGOUT);
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      await SecureStore.deleteItemAsync('wlm_token');
      await SecureStore.deleteItemAsync('wlm_refresh_token');
      await SecureStore.deleteItemAsync('wlm_user');
      setUser(null);
      setError(null);
    }
  }, [api]);

  const value: AuthContextType = {
    user,
    isLoading,
    isSigningIn,
    signIn,
    signOut,
    error,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
