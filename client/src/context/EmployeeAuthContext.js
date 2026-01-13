import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const EmployeeAuthContext = createContext();

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
};

export const EmployeeAuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if employee is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('employeeToken');
      
      if (token) {
        try {
          // Set default Authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch employee data
          const response = await axios.get('http://localhost:5000/api/employee-auth/me');
          
          if (response.data.success) {
            setEmployee(response.data.employee);
          } else {
            // Invalid token
            localStorage.removeItem('employeeToken');
            delete axios.defaults.headers.common['Authorization'];
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('employeeToken');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Employee login function
  const employeeLogin = async (staffId, pin) => {
    try {
      const response = await axios.post('http://localhost:5000/api/employee-auth/login', {
        staffId,
        pin
      });

      if (response.data.success) {
        const { token, employee } = response.data;
        
        // Store token
        localStorage.setItem('employeeToken', token);
        
        // Set default Authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Set employee state
        setEmployee(employee);
        
        return { success: true, employee };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Employee login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
  };

  // Employee logout function
  const employeeLogout = () => {
    localStorage.removeItem('employeeToken');
    delete axios.defaults.headers.common['Authorization'];
    setEmployee(null);
  };

  // Change PIN function
  const changePin = async (currentPin, newPin) => {
    try {
      const response = await axios.put('http://localhost:5000/api/employee-auth/change-pin', {
        currentPin,
        newPin
      });

      if (response.data.success) {
        // Update employee state to reflect PIN change
        setEmployee(prev => ({
          ...prev,
          pinMustChange: false
        }));
        
        return { success: true, message: response.data.message };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Change PIN error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change PIN. Please try again.'
      };
    }
  };

  const value = {
    employee,
    loading,
    employeeLogin,
    employeeLogout,
    changePin,
    isAuthenticated: !!employee
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export default EmployeeAuthContext;
