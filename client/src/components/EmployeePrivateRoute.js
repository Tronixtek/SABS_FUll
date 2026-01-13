import React from 'react';
import { Navigate } from 'react-router-dom';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

const EmployeePrivateRoute = ({ children }) => {
  const { employee, loading } = useEmployeeAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return employee ? children : <Navigate to="/employee-login" replace />;
};

export default EmployeePrivateRoute;
