import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import axios from 'axios';
import {
  CalendarIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const RequestLeave = () => {
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  
  const [formData, setFormData] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: '',
    isTimeBased: false
  });
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  
  // Shift information
  const [currentShift, setCurrentShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(false);

  // Load leave types from API
  useEffect(() => {
    fetchLeaveTypes();
    fetchCurrentShift();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leave-policy`);
      if (response.data.success) {
        const types = response.data.data.policies.map(policy => ({
          value: policy.leaveType,
          label: policy.displayName,
          description: policy.description
        }));
        setLeaveTypes(types);
        setLeavePolicies(response.data.data.policies);
      }
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const fetchCurrentShift = async () => {
    try {
      setLoadingShift(true);
      const token = localStorage.getItem('employeeToken');
      const response = await axios.get(
        `${API_URL}/api/rosters/assignments/current/${employee?.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success && response.data.data) {
        setCurrentShift(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch current shift:', error);
      // Fallback to employee.shift if available
      if (employee?.shift) {
        setCurrentShift({ shift: employee.shift });
      }
    } finally {
      setLoadingShift(false);
    }
  };

  // Fetch all leave policies on mount
  useEffect(() => {
    fetchLeavePolicies();
  }, []);

  // Fetch specific policy when leave type changes
  useEffect(() => {
    if (formData.leaveType && employee) {
      fetchPolicyDetails(formData.leaveType);
    }
  }, [formData.leaveType, employee]);

  const fetchLeavePolicies = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leave-policy`);
      if (response.data.success) {
        setLeavePolicies(response.data.data.policies);
      }
    } catch (error) {
      console.error('Failed to fetch leave policies:', error);
    }
  };

  const fetchPolicyDetails = async (leaveType) => {
    try {
      setLoadingPolicy(true);
      console.log('[FETCH POLICY] Employee data:', {
        gradeLevel: employee?.gradeLevel,
        facility: employee?.facility,
        employeeId: employee?.employeeId
      });
      
      const params = new URLSearchParams({
        gradeLevel: employee?.gradeLevel || '1',
        ...(employee?.facility && { facilityId: employee.facility })
      });
      
      console.log('[FETCH POLICY] Fetching policy for:', leaveType, 'with params:', params.toString());
      
      const response = await axios.get(
        `${API_URL}/api/leave-policy/${leaveType}?${params}`
      );
      
      console.log('[FETCH POLICY] Response:', response.data);
      
      if (response.data.success) {
        const policy = response.data.data.policy;
        setSelectedPolicy(policy);
        console.log('[FETCH POLICY] Policy set:', policy);
        console.log('[FETCH POLICY] isPaid:', policy.isPaid, 'salaryPercentage:', policy.salaryPercentage);
        console.log('[FETCH POLICY] requiresDocumentation:', policy.requiresDocumentation);
      }
    } catch (error) {
      console.error('Failed to fetch policy details:', error);
      setSelectedPolicy(null);
    } finally {
      setLoadingPolicy(false);
    }
  };

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

      // Validate against policy if loaded
      if (selectedPolicy) {
        console.log('[SUBMIT] Validating with policy:', selectedPolicy);
        
        // Check minimum notice period
        const now = new Date();
        const requestStartDate = new Date(formData.startDate);
        const daysNotice = Math.ceil((requestStartDate - now) / (1000 * 60 * 60 * 24));
        
        console.log('[SUBMIT] Notice period check:', {
          minimumRequired: selectedPolicy.minimumNoticeDays,
          provided: daysNotice,
          allowRetroactive: selectedPolicy.allowRetroactive
        });
        
        if (!selectedPolicy.allowRetroactive && daysNotice < selectedPolicy.minimumNoticeDays) {
          setError(`This leave type requires ${selectedPolicy.minimumNoticeDays} days advance notice. You are requesting ${daysNotice} days in advance.`);
          setLoading(false);
          return;
        }

        // Check maximum days per request
        const requestedDays = Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        
        console.log('[SUBMIT] Days limit check:', {
          maxAllowed: selectedPolicy.maxDaysPerRequest,
          requested: requestedDays
        });
        
        if (selectedPolicy.maxDaysPerRequest > 0 && requestedDays > selectedPolicy.maxDaysPerRequest) {
          setError(`Maximum ${selectedPolicy.maxDaysPerRequest} days allowed per request for ${selectedPolicy.displayName}.`);
          setLoading(false);
          return;
        }

        // Check if documentation is required
        if (selectedPolicy.requiresDocumentation && selectedPolicy.requiredDocuments.length > 0) {
          if (selectedFiles.length === 0) {
            setError(`This leave type requires documentation: ${selectedPolicy.requiredDocuments.join(', ')}. Please upload the required documents.`);
            setLoading(false);
            return;
          }
        }
      } else {
        console.warn('[SUBMIT] No policy loaded - skipping frontend validation');
      }

      // Prepare request data with FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('leaveType', formData.leaveType);
      formDataToSend.append('reason', formData.reason);
      formDataToSend.append('submittedBy', employee.id);
      formDataToSend.append('employeeId', employee.id);

      if (formData.isTimeBased) {
        formDataToSend.append('date', formData.startDate);
        formDataToSend.append('startTime', formData.startTime);
        formDataToSend.append('endTime', formData.endTime);
      } else {
        formDataToSend.append('startDate', formData.startDate);
        formDataToSend.append('endDate', formData.endDate);
      }
      
      // Add files if any
      selectedFiles.forEach(file => {
        formDataToSend.append('documents', file);
      });
      
      console.log('[SUBMIT] Uploading', selectedFiles.length, 'files');

      const response = await axios.post(`${API_URL}/api/leave`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

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
        {/* Current Shift Info */}
        {currentShift && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <ClockIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Your Current Shift</h3>
                <p className="text-sm text-blue-800">
                  <strong>{currentShift.shift?.name}</strong> - {currentShift.shift?.startTime} to {currentShift.shift?.endTime} ({currentShift.shift?.workingHours}hrs)
                </p>
                {currentShift.effectiveTo && (
                  <p className="text-xs text-blue-700 mt-1">
                    Valid until {new Date(currentShift.effectiveTo).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
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
              <label htmlFor="leaveType" className="block text-base font-semibold text-gray-900 mb-2">
                Leave Type *
              </label>
              <select
                id="leaveType"
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                required
                className="block w-full px-4 py-3 text-base font-medium border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-400 transition-colors"
              >
                {leaveTypes.map((type) => (
                  <option key={type.value} value={type.value} className="py-2">
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600">
                Select the type of leave you want to request
              </p>
            </div>

            {/* Policy Information Card */}
            {selectedPolicy && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start mb-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-blue-900">
                    {selectedPolicy.displayName} Policy
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {/* Balance Limit */}
                  {selectedPolicy.hasBalanceLimit && (
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-gray-700">
                        Max: {selectedPolicy.maxDaysPerYear} days/year
                      </span>
                    </div>
                  )}

                  {/* No Balance Limit */}
                  {!selectedPolicy.hasBalanceLimit && (
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-green-700 font-medium">
                        No balance limit
                      </span>
                    </div>
                  )}

                  {/* Notice Period */}
                  {selectedPolicy.minimumNoticeDays > 0 && (
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 text-orange-600 mr-2" />
                      <span className="text-gray-700">
                        {selectedPolicy.minimumNoticeDays} days notice required
                      </span>
                    </div>
                  )}

                  {/* Documentation Required */}
                  {selectedPolicy.requiresDocumentation && (
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 text-purple-600 mr-2" />
                      <span className="text-gray-700">
                        Documentation required
                      </span>
                    </div>
                  )}

                  {/* Urgent Approval */}
                  {selectedPolicy.requiresUrgentApproval && (
                    <div className="flex items-center">
                      <ExclamationCircleIcon className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-red-700 font-medium">
                        Must be approved same day
                      </span>
                    </div>
                  )}
                </div>

                {/* Required Documents */}
                {selectedPolicy.requiresDocumentation && selectedPolicy.requiredDocuments?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs font-medium text-blue-900 mb-1">Required Documents:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {selectedPolicy.requiredDocuments.map((doc, idx) => (
                        <li key={idx}>• {doc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Description */}
                <p className="mt-3 text-xs text-gray-600 italic">
                  {selectedPolicy.description}
                </p>
              </div>
            )}

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
            
            {/* Document Upload - Only show if policy requires documentation */}
            {console.log('[RENDER] selectedPolicy:', selectedPolicy)}
            {console.log('[RENDER] requiresDocumentation:', selectedPolicy?.requiresDocumentation)}
            {selectedPolicy?.requiresDocumentation && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <DocumentTextIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                      Documentation Required *
                    </h4>
                    <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
                      <p className="text-sm text-yellow-900 font-medium">
                        Required: {selectedPolicy.requiredDocuments.join(', ')}
                      </p>
                    </div>
                    <p className="text-xs text-yellow-700 mb-3">
                      Upload required documents (PDF, Word, or Images). Max 5MB per file.
                    </p>
                    
                    <label className="block">
                      <span className="sr-only">Upload documents</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          const maxSize = 5 * 1024 * 1024; // 5MB
                          const validFiles = files.filter(file => file.size <= maxSize);
                          
                          if (files.length !== validFiles.length) {
                            setFileError('Some files were too large (max 5MB)');
                          } else {
                            setFileError('');
                          }
                          
                          setSelectedFiles(validFiles);
                        }}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-semibold
                          file:bg-yellow-100 file:text-yellow-700
                          hover:file:bg-yellow-200 cursor-pointer"
                      />
                    </label>
                    
                    {selectedFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 font-medium mb-1">Selected files:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {selectedFiles.map((file, index) => (
                            <li key={index} className="flex items-center">
                              <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                              {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {fileError && (
                      <p className="mt-2 text-xs text-red-600">{fileError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

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
