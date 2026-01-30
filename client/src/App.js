import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { EmployeeAuthProvider } from './context/EmployeeAuthContext';
import PrivateRoute from './components/PrivateRoute';
import EmployeePrivateRoute from './components/EmployeePrivateRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import EmployeeLogin from './pages/EmployeeLogin';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Facilities from './pages/Facilities';
import Shifts from './pages/Shifts';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Users from './pages/Users';
import LeaveManagement from './pages/LeaveManagement';
import LeavePolicyManagement from './pages/LeavePolicyManagement';
import PayrollManagement from './pages/PayrollManagement';
import SalaryGrades from './pages/SalaryGrades';
import StaffIdPrefixSettings from './pages/StaffIdPrefixSettings';

// Employee Portal Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import RequestLeave from './pages/employee/RequestLeave';
import AttendanceHistory from './pages/employee/AttendanceHistory';
import EmployeeProfile from './pages/employee/EmployeeProfile';
import EmployeePayslip from './pages/employee/EmployeePayslip';
import LeaveBalance from './pages/employee/LeaveBalance';

// Public Registration
import PublicSelfRegister from './components/PublicSelfRegister';

// Layout
import Layout from './components/Layout';

function App() {
  return (
    <AuthProvider>
      <EmployeeAuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<PublicSelfRegister />} />
            
            {/* Staff Portal */}
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="leave" element={<LeaveManagement />} />
              <Route path="leave-policies" element={<LeavePolicyManagement />} />
              <Route path="payroll" element={<PayrollManagement />} />
              <Route path="salary-grades" element={<SalaryGrades />} />
              <Route path="facilities" element={<Facilities />} />
              <Route path="shifts" element={<Shifts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Employee Portal */}
            <Route path="/employee-login" element={<EmployeeLogin />} />
            <Route path="/employee-app/*" element={
              <EmployeePrivateRoute>
                <Routes>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<EmployeeDashboard />} />
                  <Route path="leave-balance" element={<LeaveBalance />} />
                  <Route path="request-leave" element={<RequestLeave />} />
                  <Route path="attendance" element={<AttendanceHistory />} />
                  <Route path="payslip" element={<EmployeePayslip />} />
                  <Route path="profile" element={<EmployeeProfile />} />
                </Routes>
              </EmployeePrivateRoute>
            } />
          </Routes>
        </Router>
      </EmployeeAuthProvider>
    </AuthProvider>
  );
}

export default App;
