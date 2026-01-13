import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import axios from 'axios';
import {
  CalendarIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const RequestLeave = () => {
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  
  const [formData, setFormData] = useState({
    leaveType: 'annual',
    urgency: 'medium',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: '',
    isTimeBased: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const leaveTypes = [
    { value: 'annual', label: 'Annual Leave', description: 'Regular vacation leave' },
    { value: 'sick', label: 'Sick Leave', description: 'Medical/health related' },
    { value: 'emergency', label: 'Emergency Leave', description: 'Urgent family matters' },
    { value: 'maternity', label: 'Maternity Leave', description: 'For expectant mothers' },
    { value: 'paternity', label: 'Paternity Leave', description: 'For new fathers' },
    { value: 'bereavement', label: 'Bereavement Leave', description: 'Loss of family member' },
    { value: 'study', label: 'Study Leave', description: 'Educational purposes' },
    { value: 'unpaid', label: 'Unpaid Leave', description: 'Without pay' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { value: 'high', label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { value: 'emergency', label: 'Emergency', color: 'text-red-600', bgColor: 'bg-red-100' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate dates
      if (!formData.isTimeBased) {
        if (!formData.startDate || !formData.endDate) {
          setError('Please select start and end dates');
          setLoading(false);
          return;
        }
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
          setError('End date cannot be before start date');
          setLoading(false);
          return;
        }
      } else {
        if (!formData.startDate || !formData.startTime || !formData.endTime) {
          setError('Please select date and time range');
          setLoading(false);
          return;
        }
      }

      // Prepare request data
      const requestData = {
        leaveType: formData.leaveType,
        urgency: formData.urgency,
        reason: formData.reason,
        submittedBy: employee.id,
        employeeId: employee.id
      };

      if (formData.isTimeBased) {
        requestData.date = formData.startDate;
        requestData.startTime = formData.startTime;
        requestData.endTime = formData.endTime;
      } else {
        requestData.startDate = formData.startDate;
        requestData.endDate = formData.endDate;
      }

      const response = await axios.post('http://localhost:5000/api/leave', requestData);

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/employee-app/dashboard');
        }, 2000);
      }
    } catch (err) {
      console.error('Leave request error:', err);
      setError(err.response?.data?.message || 'Failed to submit leave request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your leave request has been submitted successfully and is pending approval.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/employee-app/dashboard')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Request Leave</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit a leave request for approval
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Leave Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {leaveTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`relative flex flex-col p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      formData.leaveType === type.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="leaveType"
                      value={type.value}
                      checked={formData.leaveType === type.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="font-medium text-gray-900">{type.label}</span>
                    <span className="text-xs text-gray-500 mt-1">{type.description}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Urgency Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgency Level *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {urgencyLevels.map((level) => (
                  <label
                    key={level.value}
                    className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      formData.urgency === level.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={level.value}
                      checked={formData.urgency === level.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className={`text-sm font-medium ${level.color}`}>{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time-Based Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isTimeBased"
                name="isTimeBased"
                checked={formData.isTimeBased}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isTimeBased" className="ml-2 block text-sm text-gray-700">
                This is a time-based leave (partial day)
              </label>
            </div>

            {/* Date/Time Fields */}
            {!formData.isTimeBased ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="pl-10 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      required
                      className="pl-10 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="pl-10 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                      className="pl-10 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                      className="pl-10 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Leave *
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={4}
                value={formData.reason}
                onChange={handleChange}
                placeholder="Please provide details about your leave request..."
                required
                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Provide a clear explanation for your leave request
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate('/employee-app/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed inline-flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestLeave;
