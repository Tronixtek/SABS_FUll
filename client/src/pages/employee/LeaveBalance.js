import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import axios from 'axios';
import { ArrowLeftIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LeaveBalance = () => {
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [leavePolicies, setLeavePolicies] = useState({});
  const [leaveBalance, setLeaveBalance] = useState({
    annual: { total: 0, used: 0, remaining: 0 },
    maternity: { total: 84, used: 0, remaining: 84 },
    adoptive: { total: 112, used: 0, remaining: 112 },
    takaba: { total: 112, used: 0, remaining: 112 },
    sabbatical: { total: 365, used: 0, remaining: 365 }
  });

  useEffect(() => {
    if (employee?.id) {
      fetchLeaveRequests();
      fetchLeavePolicies();
    }
  }, [employee]);

  const fetchLeavePolicies = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leave-policy`);
      if (response.data.success) {
        const policiesMap = {};
        response.data.data.policies.forEach(policy => {
          policiesMap[policy.leaveType] = policy;
        });
        setLeavePolicies(policiesMap);
      }
    } catch (error) {
      console.error('Failed to fetch leave policies:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoadingLeave(true);
      const response = await axios.get(`${API_URL}/api/leave/my-requests`);
      if (response.data.success) {
        setLeaveRequests(response.data.data.leaveRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoadingLeave(false);
    }
  };

  // Recalculate leave balance when leave requests change
  useEffect(() => {
    if (employee?.id && leaveRequests.length >= 0) {
      calculateLeaveBalance();
    }
  }, [leaveRequests, employee]);

  const calculateLeaveBalance = () => {
    // Calculate annual leave based on grade level
    let annualTotal = 14; // Default GL 1-3
    if (employee?.gradeLevel) {
      const gl = parseInt(employee.gradeLevel);
      if (gl >= 1 && gl <= 3) annualTotal = 14;
      else if (gl >= 4 && gl <= 6) annualTotal = 21;
      else annualTotal = 30;
    }

    // Calculate used leave for current year
    const currentYear = new Date().getFullYear();
    const approvedLeaves = leaveRequests.filter(req => 
      req.status === 'approved' && 
      new Date(req.startDate).getFullYear() === currentYear
    );

    const usedLeave = {
      annual: 0,
      maternity: 0,
      adoptive: 0,
      takaba: 0,
      sabbatical: 0
    };

    approvedLeaves.forEach(leave => {
      const days = calculateLeaveDays(leave.startDate, leave.endDate);
      switch(leave.leaveType) {
        case 'annual':
          usedLeave.annual += days;
          break;
        case 'maternity':
          usedLeave.maternity += days;
          break;
        case 'adoptive':
          usedLeave.adoptive += days;
          break;
        case 'takaba':
          usedLeave.takaba += days;
          break;
        case 'sabbatical':
          usedLeave.sabbatical += days;
          break;
      }
    });

    setLeaveBalance({
      annual: { 
        total: annualTotal, 
        used: usedLeave.annual, 
        remaining: Math.max(0, annualTotal - usedLeave.annual) 
      },
      maternity: { 
        total: 84, 
        used: usedLeave.maternity, 
        remaining: Math.max(0, 84 - usedLeave.maternity) 
      },
      adoptive: { 
        total: 112, 
        used: usedLeave.adoptive, 
        remaining: Math.max(0, 112 - usedLeave.adoptive) 
      },
      takaba: { 
        total: 112, 
        used: usedLeave.takaba, 
        remaining: Math.max(0, 112 - usedLeave.takaba) 
      },
      sabbatical: { 
        total: 365, 
        used: usedLeave.sabbatical, 
        remaining: Math.max(0, 365 - usedLeave.sabbatical) 
      }
    });
  };

  const calculateLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/employee-app')}
              className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Balance Details</h1>
              <p className="text-sm text-gray-500 mt-1">
                View your leave entitlements and usage for {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingLeave ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-4">Loading leave balance...</p>
          </div>
        ) : (
          <>
            {/* Leave Balance Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Leave Balance Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Annual Leave */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Annual Leave</h3>
                    {leavePolicies.annual && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        leavePolicies.annual.isPaid 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {leavePolicies.annual.isPaid 
                          ? `${leavePolicies.annual.salaryPercentage}% Paid` 
                          : 'Unpaid'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-blue-600">{leaveBalance.annual.remaining}</span>
                    <span className="text-sm text-gray-500">of {leaveBalance.annual.total} days</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${(leaveBalance.annual.remaining / leaveBalance.annual.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{leaveBalance.annual.used} days used this year</p>
                </div>

                {/* Maternity Leave */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Maternity Leave</h3>
                    {leavePolicies.maternity && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        leavePolicies.maternity.isPaid 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {leavePolicies.maternity.isPaid 
                          ? `${leavePolicies.maternity.salaryPercentage}% Paid` 
                          : 'Unpaid'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-pink-600">{leaveBalance.maternity.remaining}</span>
                    <span className="text-sm text-gray-500">of {leaveBalance.maternity.total} days</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pink-600 h-2 rounded-full transition-all" 
                      style={{ width: `${(leaveBalance.maternity.remaining / leaveBalance.maternity.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">12 weeks • {leaveBalance.maternity.used} days used</p>
                </div>

                {/* Adoptive Leave */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Adoptive Leave</h3>
                    {leavePolicies.adoptive && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        leavePolicies.adoptive.isPaid 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {leavePolicies.adoptive.isPaid 
                          ? `${leavePolicies.adoptive.salaryPercentage}% Paid` 
                          : 'Unpaid'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-purple-600">{leaveBalance.adoptive.remaining}</span>
                    <span className="text-sm text-gray-500">of {leaveBalance.adoptive.total} days</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all" 
                      style={{ width: `${(leaveBalance.adoptive.remaining / leaveBalance.adoptive.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">16 weeks • {leaveBalance.adoptive.used} days used</p>
                </div>

                {/* Takaba Leave */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Takaba Leave</h3>
                    {leavePolicies.takaba && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        leavePolicies.takaba.isPaid 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {leavePolicies.takaba.isPaid 
                          ? `${leavePolicies.takaba.salaryPercentage}% Paid` 
                          : 'Unpaid'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-orange-600">{leaveBalance.takaba.remaining}</span>
                    <span className="text-sm text-gray-500">of {leaveBalance.takaba.total} days</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all" 
                      style={{ width: `${(leaveBalance.takaba.remaining / leaveBalance.takaba.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">16 weeks • {leaveBalance.takaba.used} days used</p>
                </div>

                {/* Sabbatical Leave */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Sabbatical Leave</h3>
                    {leavePolicies.sabbatical && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        leavePolicies.sabbatical.isPaid 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {leavePolicies.sabbatical.isPaid 
                          ? `${leavePolicies.sabbatical.salaryPercentage}% Paid` 
                          : 'Unpaid'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-indigo-600">{leaveBalance.sabbatical.remaining}</span>
                    <span className="text-sm text-gray-500">of {leaveBalance.sabbatical.total} days</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all" 
                      style={{ width: `${(leaveBalance.sabbatical.remaining / leaveBalance.sabbatical.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">12 months • {leaveBalance.sabbatical.used} days used</p>
                </div>

                {/* Open Leave Types */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-blue-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Open Leave Types</h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Examination Leave</li>
                    <li>• Study Leave</li>
                    <li>• Religious Leave</li>
                    <li>• Casual Leave</li>
                    <li>• Leave of Absence (Emergencies)</li>
                    <li>• Official Assignment (Urgent)</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-3 italic">No balance limit • Requires approval</p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Important Notes</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Leave balances reset annually on January 1st</li>
                <li>• All leave requests must be approved before they are valid</li>
                <li>• Only approved leave requests are deducted from your balance</li>
                <li>• Leave of Absence is for emergencies or unforeseen challenges</li>
                <li>• Official Assignment must be approved same day to prevent late/absent marking</li>
                <li>• Approved leaves count as work days for payroll (full salary)</li>
                <li>• Contact HR for any questions about your leave entitlement</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeaveBalance;
