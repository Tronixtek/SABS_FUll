import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import axios from 'axios';
import {
  ClockIcon,
  CalendarIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { employee, employeeLogout, changePin } = useEmployeeAuth();
  const [showChangePinModal, setShowChangePinModal] = useState(employee?.pinMustChange || false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeave, setLoadingLeave] = useState(true);
  
  // PIN Change State
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      fetchLeaveRequests();
    }
  }, [employee]);

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

  const handleLogout = () => {
    employeeLogout();
    navigate('/employee-login');
  };

  const handlePinChange = (e) => {
    const { name, value } = e.target;
    // Only allow digits and max 6 characters
    if (/^\d{0,6}$/.test(value)) {
      setPinForm(prev => ({ ...prev, [name]: value }));
      setPinError('');
    }
  };

  const handleSubmitPinChange = async (e) => {
    e.preventDefault();
    setPinError('');

    // Validation
    if (!pinForm.currentPin || !pinForm.newPin || !pinForm.confirmPin) {
      setPinError('All fields are required');
      return;
    }

    if (pinForm.newPin.length < 4 || pinForm.newPin.length > 6) {
      setPinError('New PIN must be 4-6 digits');
      return;
    }

    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinError('New PIN and confirmation do not match');
      return;
    }

    if (pinForm.currentPin === pinForm.newPin) {
      setPinError('New PIN must be different from current PIN');
      return;
    }

    setPinLoading(true);

    const result = await changePin(pinForm.currentPin, pinForm.newPin);

    if (result.success) {
      setPinSuccess(true);
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setTimeout(() => {
        setShowChangePinModal(false);
        setPinSuccess(false);
      }, 2000);
    } else {
      setPinError(result.message);
    }

    setPinLoading(false);
  };

  const closeChangePinModal = () => {
    if (!employee?.pinMustChange) {
      setShowChangePinModal(false);
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setPinError('');
      setPinSuccess(false);
    }
  };

  // Quick stats (placeholder data - will be connected to real APIs in next phase)
  const stats = [
    {
      name: 'Today\'s Attendance',
      value: 'Not Clocked In',
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: 'This Month',
      value: '20 Days',
      icon: CalendarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Leave Balance',
      value: '12 Days',
      icon: UserIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {employee?.firstName}!
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {employee?.designation} • {employee?.facility?.facilityName}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* PIN Change Alert */}
        {employee?.pinMustChange && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-700">
                  For security reasons, please change your PIN on first login.
                </p>
              </div>
              <button
                onClick={() => setShowChangePinModal(true)}
                className="ml-3 text-sm font-medium text-yellow-700 hover:text-yellow-600"
              >
                Change PIN
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.bgColor} rounded-md p-3`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/employee-app/attendance')}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ClockIcon className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">View Attendance</span>
            </button>
            <button
              onClick={() => navigate('/employee-app/request-leave')}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CalendarIcon className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Request Leave</span>
            </button>
            <button
              onClick={() => navigate('/employee-app/profile')}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UserIcon className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">My Profile</span>
            </button>
            <button
              onClick={() => setShowChangePinModal(true)}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <KeyIcon className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Change PIN</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Leave Requests</h2>
          
          {loadingLeave ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading...</p>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No leave requests yet</p>
              <button
                onClick={() => navigate('/employee-app/request-leave')}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Submit your first leave request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {leaveRequests.slice(0, 5).map((request) => (
                <div
                  key={request._id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 capitalize">
                          {request.type?.replace('-', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          request.status === 'approved' || request.status === 'auto-approved'
                            ? 'bg-green-100 text-green-800'
                            : request.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status === 'auto-approved' ? 'Approved' : request.status}
                        </span>
                        {request.urgency && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            request.urgency === 'emergency'
                              ? 'bg-red-100 text-red-800'
                              : request.urgency === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : request.urgency === 'medium'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {request.urgency}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        {request.startDate && request.endDate ? (
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </div>
                        ) : request.date ? (
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(request.date).toLocaleDateString()}
                            {request.startTime && request.endTime && (
                              <span className="ml-2">({request.startTime} - {request.endTime})</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(request.affectedDate || request.requestDate).toLocaleDateString()}
                          </div>
                        )}
                        
                        {request.reason && (
                          <p className="text-sm line-clamp-2">{request.reason}</p>
                        )}
                        
                        {request.status === 'rejected' && request.managerNotes && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs font-medium text-red-800">Rejection Reason:</p>
                            <p className="text-xs text-red-700 mt-1">{request.managerNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(request.requestDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {leaveRequests.length > 5 && (
                <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2">
                  View all {leaveRequests.length} requests
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-2 mr-3">
                  <KeyIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Change PIN</h3>
                  {employee?.pinMustChange && (
                    <p className="text-xs text-yellow-600">Required for security</p>
                  )}
                </div>
              </div>
              {!employee?.pinMustChange && (
                <button
                  onClick={closeChangePinModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              )}
            </div>

            {pinSuccess ? (
              <div className="py-8 text-center">
                <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900">PIN Changed Successfully!</p>
                <p className="text-sm text-gray-600 mt-2">Your new PIN is now active</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPinChange} className="space-y-4">
                {pinError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                    <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                    {pinError}
                  </div>
                )}

                <div>
                  <label htmlFor="currentPin" className="block text-sm font-medium text-gray-700 mb-1">
                    Current PIN
                  </label>
                  <input
                    type="password"
                    id="currentPin"
                    name="currentPin"
                    value={pinForm.currentPin}
                    onChange={handlePinChange}
                    placeholder="Enter current PIN"
                    maxLength="6"
                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center tracking-widest text-lg"
                    disabled={pinLoading}
                  />
                </div>

                <div>
                  <label htmlFor="newPin" className="block text-sm font-medium text-gray-700 mb-1">
                    New PIN (4-6 digits)
                  </label>
                  <input
                    type="password"
                    id="newPin"
                    name="newPin"
                    value={pinForm.newPin}
                    onChange={handlePinChange}
                    placeholder="Enter new PIN"
                    maxLength="6"
                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center tracking-widest text-lg"
                    disabled={pinLoading}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    id="confirmPin"
                    name="confirmPin"
                    value={pinForm.confirmPin}
                    onChange={handlePinChange}
                    placeholder="Re-enter new PIN"
                    maxLength="6"
                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center tracking-widest text-lg"
                    disabled={pinLoading}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  {!employee?.pinMustChange && (
                    <button
                      type="button"
                      onClick={closeChangePinModal}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      disabled={pinLoading}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={pinLoading}
                  >
                    {pinLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    ) : (
                      'Change PIN'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
