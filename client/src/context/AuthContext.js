import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Configure axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize token from localStorage only if session is valid
  const initializeToken = () => {
    const storedToken = localStorage.getItem('token');
    const loginTime = localStorage.getItem('loginTime');
    
    if (!storedToken || !loginTime) {
      return null;
    }

    // Check if session is still valid
    const elapsed = Date.now() - parseInt(loginTime);
    const SESSION_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours
    
    if (elapsed > SESSION_TIMEOUT) {
      console.log('Session expired on app load');
      localStorage.removeItem('token');
      localStorage.removeItem('loginTime');
      return null;
    }
    
    return storedToken;
  };
  
  const [token, setToken] = useState(initializeToken());

  // Session timeout: 3 hours (in milliseconds)
  const SESSION_TIMEOUT = 3 * 60 * 60 * 1000;

  // Check if session is still valid
  const isSessionValid = () => {
    const storedToken = localStorage.getItem('token');
    const loginTime = localStorage.getItem('loginTime');
    
    if (!storedToken || !loginTime) {
      return false;
    }

    const elapsed = Date.now() - parseInt(loginTime);
    if (elapsed > SESSION_TIMEOUT) {
      console.log('Session expired after 3 hours');
      return false;
    }
    
    return true;
  };

  // Check session validity on app focus/resume
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App is visible again, check if session is still valid
        if (!isSessionValid() && token) {
          console.log('Session expired, logging out');
          logout();
        }
      }
    };

    // Check session when app becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  // Periodic session check (every 5 minutes while app is active)
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      if (!isSessionValid()) {
        console.log('Session expired during check');
        logout();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(intervalId);
  }, [token]);

  // Set axios default authorization header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.data);
    } catch (error) {
      console.error('Failed to load user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Base URL:', axios.defaults.baseURL);
      console.log('ENV API URL:', process.env.REACT_APP_API_URL);
      console.log('Username:', username);
      
      const response = await axios.post('/api/auth/login', { username, password });
      console.log('Login response:', response);
      
      const { token, user } = response.data.data;
      
      // Store token and login timestamp
      localStorage.setItem('token', token);
      localStorage.setItem('loginTime', Date.now().toString());
      setToken(token);
      setUser(user);
      
      console.log('Login successful!');
      return { success: true };
    } catch (error) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('loginTime');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'super-admin' || user.role === 'admin') return true;
    return user.permissions?.includes(permission) || false;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
