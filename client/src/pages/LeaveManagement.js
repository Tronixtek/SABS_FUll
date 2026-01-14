import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PlusIcon,
  FunnelIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const LeaveManagement = () => {
  const { hasPermission, user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [filters, setFilters] = useState({
    facility: '',
    urgency: '',
    type: ''
  });

  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'late-arrival',
    affectedDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    reason: '',
    category: 'other',
    urgency: 'medium'
  });

  const leaveTypes = [
    { value: 'late-arrival', label: 'Late Arrival', color: 'orange' },
    { value: 'early-departure', label: 'Early Departure', color: 'blue' },
    { value: 'partial-day', label: 'Partial Day', color: 'purple' },
    { value: 'official-duty', label: 'Official Duty', color: 'green' },
    { value: 'medical-leave', label: 'Medical Leave', color: 'red' },
    { value: 'emergency-exit', label: 'Emergency Exit', color: 'red' },
    { value: 'flexible-time', label: 'Flexible Time', color: 'indigo' }
  ];

  const categories = [
    { value: 'medical', label: 'Medical' },
    { value: 'family-emergency', label: 'Family Emergency' },
    { value: 'official-meeting', label: 'Official Meeting' },
    { value: 'training', label: 'Training' },
    { value: 'personal', label: 'Personal' },
    { value: 'traffic-delay', label: 'Traffic Delay' },
    { value: 'public-transport', label: 'Public Transport' },
    { value: 'technical-issue', label: 'Technical Issue' },
    { value: 'other', label: 'Other' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'gray' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'emergency', label: 'Emergency', color: 'red' }
  ];

  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
    fetchFacilities();
  }, [activeTab, filters]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add status filter based on active tab
      if (activeTab === 'pending') params.append('status', 'pending');
      if (activeTab === 'approved') params.append('status', 'approved,auto-approved');
      if (activeTab === 'rejected') params.append('status', 'rejected');
      
      if (filters.facility) params.append('facilityId', filters.facility);
      if (filters.urgency) params.append('urgency', filters.urgency);
      if (filters.type) params.append('type', filters.type);

      // Use statistics endpoint which returns all requests
      const response = await axios.get(`/api/leave/statistics?${params}`);
      
      if (response.data.success) {
        const allRequests = response.data.data.allRequests || [];
        
        // Filter by status based on active tab
        const filtered = allRequests.filter(req => {
          if (activeTab === 'pending') return req.status === 'pending';
          if (activeTab === 'approved') return req.status === 'approved' || req.status === 'auto-approved';
          if (activeTab === 'rejected') return req.status === 'rejected';
          return true;
        });

        setLeaveRequests(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('/api/facilities');
      setFacilities(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
    }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await axios.post('/api/leave/submit', formData);
      toast.success('Leave request submitted successfully');
      setShowSubmitModal(false);
      resetForm();
      fetchLeaveRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const handleProcessLeave = async (requestId, action) => {
    const confirmMessage = action === 'approve' 
      ? 'Are you sure you want to approve this leave request?'
      : 'Are you sure you want to reject this leave request?';
    
    if (!window.confirm(confirmMessage)) return;

    const managerNotes = action === 'reject' 
      ? prompt('Please provide a reason for rejection:')
      : '';

    if (action === 'reject' && !managerNotes) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      await axios.patch(`/api/leave/process/${requestId}`, {
        action,
        managerNotes,
        approvedBy: user?.id
      });
      
      toast.success(`Leave request ${action}d successfully`);
      fetchLeaveRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${action} leave request`);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: 'late-arrival',
      affectedDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      reason: '',
      category: 'other',
      urgency: 'medium'
    });
    setEmployeeSearch('');
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => {
    const searchLower = employeeSearch.toLowerCase();
    return (
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.employeeId?.toLowerCase().includes(searchLower) ||
      emp.staffId?.toLowerCase().includes(searchLower)
    );
  });

  const handleEmployeeSelect = (employee) => {
    setFormData({ ...formData, employeeId: employee.employeeId });
    setEmployeeSearch(`${employee.firstName} ${employee.lastName} (${employee.staffId || employee.employeeId})`);
    setShowEmployeeDropdown(false);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'auto-approved': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyBadge = (urgency) => {
    const badges = {
      'low': 'bg-gray-100 text-gray-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'emergency': 'bg-red-100 text-red-800'
    };
    return badges[urgency] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (type) => {
    const typeInfo = leaveTypes.find(t => t.value === type);
    if (!typeInfo) return 'bg-gray-100 text-gray-800';
    
    const colorMap = {
      'orange': 'bg-orange-100 text-orange-800',
      'blue': 'bg-blue-100 text-blue-800',
      'purple': 'bg-purple-100 text-purple-800',
      'green': 'bg-green-100 text-green-800',
      'red': 'bg-red-100 text-red-800',
      'indigo': 'bg-indigo-100 text-indigo-800'
    };
    return colorMap[typeInfo.color] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Leave Management
          </h1>
          <p className="text-gray-600 mt-1">Manage employee leave requests and excuses</p>
        </div>
        {hasPermission('submit_leave') && (
          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Submit Leave Request
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-600">
                {leaveRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <ClockIcon className="h-12 w-12 text-yellow-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {leaveRequests.filter(r => r.status === 'approved' || r.status === 'auto-approved').length}
              </p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {leaveRequests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
            <XCircleIcon className="h-12 w-12 text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emergency Exits</p>
              <p className="text-2xl font-bold text-orange-600">
                {leaveRequests.filter(r => r.type === 'emergency-exit').length}
              </p>
            </div>
            <CalendarIcon className="h-12 w-12 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
            <select
              value={filters.facility}
              onChange={(e) => setFilters({ ...filters, facility: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Facilities</option>
              {facilities.map(facility => (
                <option key={facility._id} value={facility._id}>{facility.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
            <select
              value={filters.urgency}
              onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Urgency Levels</option>
              {urgencyLevels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {leaveTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['pending', 'approved', 'rejected', 'all'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Leave Requests Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p>No leave requests found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Urgency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  {hasPermission('approve_leave') && activeTab === 'pending' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaveRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {request.employee?.firstName?.[0]}{request.employee?.lastName?.[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.employee?.firstName} {request.employee?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{request.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadge(request.type)}`}>
                        {leaveTypes.find(t => t.value === request.type)?.label || request.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {/* Multi-day leave */}
                      {request.startDate && request.endDate ? (
                        <>
                          <div>{new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">Multi-day leave</div>
                        </>
                      ) : request.startTime && request.endTime ? (
                        /* Time-based leave */
                        <>
                          <div>{new Date(request.affectedDate).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {request.startTime} - {request.endTime}
                          </div>
                        </>
                      ) : (
                        /* Single day leave */
                        <div>{new Date(request.affectedDate).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-gray-900 truncate">{request.reason}</p>
                      <p className="text-xs text-gray-500">{request.category}</p>
                      {request.status === 'rejected' && request.managerNotes && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-xs font-medium text-red-800">Rejection Reason:</p>
                          <p className="text-xs text-red-700 mt-1">{request.managerNotes}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyBadge(request.urgency)}`}>
                        {request.urgency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    {hasPermission('approve_leave') && activeTab === 'pending' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleProcessLeave(request._id, 'approve')}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcessLeave(request._id, 'reject')}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Submit Leave Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Submit Leave Request</h2>
              <p className="text-sm text-gray-600 mt-1">Submit a leave request on behalf of an employee</p>
            </div>

            <form onSubmit={handleSubmitLeave} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Selection - Searchable */}
                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setShowEmployeeDropdown(true);
                      }}
                      onFocus={() => setShowEmployeeDropdown(true)}
                      placeholder="Search by name or Staff ID..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={!formData.employeeId}
                    />
                    <input
                      type="hidden"
                      value={formData.employeeId}
                      required
                    />
                    
                    {/* Dropdown */}
                    {showEmployeeDropdown && (
                      <>
                        {/* Backdrop to close dropdown */}
                        <div 
                          className="fixed inset-0 z-10"
                          onClick={() => setShowEmployeeDropdown(false)}
                        ></div>
                        
                        {/* Dropdown list */}
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map(emp => (
                              <div
                                key={emp.employeeId}
                                onClick={() => handleEmployeeSelect(emp)}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">
                                  {emp.firstName} {emp.lastName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Staff ID: {emp.staffId || emp.employeeId} • {emp.department}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No employees found
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {formData.employeeId && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Employee selected
                    </p>
                  )}
                </div>

                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {leaveTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Affected Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Affected Date *
                  </label>
                  <input
                    type="date"
                    value={formData.affectedDate}
                    onChange={(e) => setFormData({ ...formData, affectedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Urgency
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {urgencyLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Reason */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please provide a detailed reason for the leave request..."
                    required
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
