import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Calendar, Users, Clock, Plus, Save, Eye, Trash2, Check, X } from 'lucide-react';
import moment from 'moment';

const MonthlyRosterManagement = () => {
  const [rosters, setRosters] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Create roster form
  const [newRoster, setNewRoster] = useState({
    facility: '',
    month: moment().format('YYYY-MM'),
    name: '',
    copyFromPrevious: true
  });
  
  // Bulk assign form
  const [bulkAssign, setBulkAssign] = useState({
    shiftId: '',
    employeeIds: []
  });

  useEffect(() => {
    fetchFacilities();
    fetchRosters();
  }, []);

  useEffect(() => {
    if (selectedFacility) {
      fetchShifts(selectedFacility);
      fetchEmployees(selectedFacility);
    }
  }, [selectedFacility]);

  useEffect(() => {
    if (showAssignModal && selectedRoster?.facility) {
      const facilityId = typeof selectedRoster.facility === 'object' 
        ? selectedRoster.facility._id 
        : selectedRoster.facility;
      console.log('Assign modal opened for roster:', selectedRoster.name);
      console.log('Facility ID:', facilityId);
      console.log('Facility object:', selectedRoster.facility);
      fetchShifts(facilityId);
      fetchEmployees(facilityId);
    }
  }, [showAssignModal, selectedRoster]);

  const fetchFacilities = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/facilities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFacilities(res.data.data || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setFacilities([]);
    }
  };

  const fetchRosters = async (facility = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = facility ? `/api/rosters?facility=${facility}` : '/api/rosters';
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRosters(res.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch rosters');
      setRosters([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async (facilityId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/shifts?facility=${facilityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShifts(res.data.data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      setShifts([]);
    }
  };

  const fetchEmployees = async (facilityId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching employees for facility:', facilityId);
      const res = await axios.get(`/api/employees?facility=${facilityId}&limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Employees response:', res.data);
      setEmployees(res.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const handleCreateRoster = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/rosters', newRoster, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Roster created successfully');
      setShowCreateModal(false);
      fetchRosters(selectedFacility);
      setNewRoster({
        facility: '',
        month: moment().format('YYYY-MM'),
        name: '',
        copyFromPrevious: true
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create roster');
    }
  };

  const handlePublishRoster = async (rosterId) => {
    if (!window.confirm('Publish this roster? Employee shifts will be updated immediately.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/rosters/${rosterId}/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Roster published successfully!');
      fetchRosters(selectedFacility);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish roster');
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedRoster || !bulkAssign.shiftId || bulkAssign.employeeIds.length === 0) {
      toast.error('Please select shift and employees');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const assignments = bulkAssign.employeeIds.map(employeeId => ({
        employeeId,
        shiftId: bulkAssign.shiftId
      }));
      
      await axios.post(`/api/rosters/${selectedRoster._id}/bulk-assign`, 
        { assignments },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success(`${assignments.length} employees assigned successfully`);
      setShowAssignModal(false);
      fetchRosters(selectedFacility);
      setBulkAssign({ shiftId: '', employeeIds: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign employees');
    }
  };

  const handleDeleteRoster = async (rosterId) => {
    if (!window.confirm('Delete this roster? This cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/rosters/${rosterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Roster deleted successfully');
      fetchRosters(selectedFacility);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete roster');
    }
  };

  const handleOpenAssignModal = (roster) => {
    setSelectedRoster(roster);
    
    // Pre-populate with existing assignments if roster has them
    if (roster.assignments && roster.assignments.length > 0) {
      // Get unique shift (assuming all employees in a roster have same shift, or use first one)
      const firstShift = roster.assignments[0]?.shift?._id || roster.assignments[0]?.shift || '';
      
      // Get all assigned employee IDs
      const assignedEmployeeIds = roster.assignments.map(a => 
        a.employee?._id || a.employee
      ).filter(Boolean);
      
      setBulkAssign({ 
        shiftId: firstShift, 
        employeeIds: assignedEmployeeIds 
      });
    } else {
      setBulkAssign({ shiftId: '', employeeIds: [] });
    }
    
    setShowAssignModal(true);
  };

  const handleViewRoster = async (roster) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/rosters/${roster._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedRoster(res.data.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to load roster details');
    }
  };

  const handleRemoveEmployeeFromRoster = async (rosterId, employeeId) => {
    if (!window.confirm('Remove this employee from the roster?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/rosters/${rosterId}/assign/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Employee removed from roster');
      handleViewRoster(selectedRoster); // Refresh the view
      fetchRosters(selectedFacility);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove employee');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-200 text-gray-700',
      published: 'bg-green-200 text-green-800',
      archived: 'bg-yellow-200 text-yellow-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monthly Roster Management</h1>
          <p className="text-gray-600 mt-1">Manage employee shift assignments by month</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create New Roster
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Facility</label>
            <select
              value={selectedFacility}
              onChange={(e) => {
                setSelectedFacility(e.target.value);
                fetchRosters(e.target.value);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Facilities</option>
              {facilities.map(facility => (
                <option key={facility._id} value={facility._id}>{facility.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rosters List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : rosters.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No rosters found. Create your first roster to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rosters.map(roster => (
            <div key={roster._id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{roster.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{roster.facility?.name}</p>
                </div>
                {getStatusBadge(roster.status)}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {moment(roster.effectiveFrom).format('MMM DD')} - {moment(roster.effectiveTo).format('MMM DD, YYYY')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{roster.assignments?.length || 0} employees assigned</span>
                </div>
                {roster.publishedAt && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Published {moment(roster.publishedAt).fromNow()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {roster.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleOpenAssignModal(roster)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      <Users className="w-4 h-4" />
                      Assign
                    </button>
                    <button
                      onClick={() => handlePublishRoster(roster._id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" />
                      Publish
                    </button>
                    <button
                      onClick={() => handleDeleteRoster(roster._id)}
                      className="flex items-center justify-center bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {roster.status === 'published' && (
                  <>
                    <button
                      onClick={() => handleViewRoster(roster)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleOpenAssignModal(roster)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                    >
                      <Users className="w-4 h-4" />
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Roster Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Roster</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facility *</label>
                <select
                  value={newRoster.facility}
                  onChange={(e) => setNewRoster({ ...newRoster, facility: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">Select Facility</option>
                  {facilities.map(facility => (
                    <option key={facility._id} value={facility._id}>{facility.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month *</label>
                <input
                  type="month"
                  value={newRoster.month}
                  onChange={(e) => setNewRoster({ 
                    ...newRoster, 
                    month: e.target.value,
                    name: `${moment(e.target.value).format('MMMM YYYY')} Schedule`
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newRoster.name}
                  onChange={(e) => setNewRoster({ ...newRoster, name: e.target.value })}
                  placeholder={`${moment(newRoster.month).format('MMMM YYYY')} Schedule`}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newRoster.copyFromPrevious}
                  onChange={(e) => setNewRoster({ ...newRoster, copyFromPrevious: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-700">Copy assignments from previous month</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateRoster}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Create Roster
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showAssignModal && selectedRoster && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Assign Employees to Shift</h2>
            <p className="text-gray-600 mb-4">Roster: {selectedRoster.name}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Shift *</label>
                <select
                  value={bulkAssign.shiftId}
                  onChange={(e) => setBulkAssign({ ...bulkAssign, shiftId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Choose a shift</option>
                  {shifts.map(shift => (
                    <option key={shift._id} value={shift._id}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </option>
                  ))}
                </select>
                {shifts.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1">No shifts available. Please create shifts for this facility first.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employees ({bulkAssign.employeeIds.length} selected)
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto">
                  {employees.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No employees found for this facility</p>
                  ) : (
                    employees.map(emp => (
                      <label key={emp._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkAssign.employeeIds.includes(emp._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkAssign({
                                ...bulkAssign,
                                employeeIds: [...bulkAssign.employeeIds, emp._id]
                              });
                            } else {
                              setBulkAssign({
                                ...bulkAssign,
                                employeeIds: bulkAssign.employeeIds.filter(id => id !== emp._id)
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBulkAssign}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Assign Selected
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setBulkAssign({ shiftId: '', employeeIds: [] });
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Roster Modal */}
      {showViewModal && selectedRoster && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedRoster.name}</h2>
                <p className="text-gray-600 mt-1">{selectedRoster.facility?.name}</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Roster Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{selectedRoster.status}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Period</p>
                <p className="text-lg font-semibold text-gray-900">
                  {moment(selectedRoster.effectiveFrom).format('MMM DD')} - {moment(selectedRoster.effectiveTo).format('MMM DD, YYYY')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Employees Assigned</p>
                <p className="text-lg font-semibold text-gray-900">{selectedRoster.assignments?.length || 0}</p>
              </div>
            </div>

            {/* Assignments Table */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Assignments</h3>
              {selectedRoster.assignments && selectedRoster.assignments.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedRoster.assignments.map((assignment, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {assignment.employee?.firstName} {assignment.employee?.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {assignment.employee?.employeeId || assignment.employee?.staffId}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {assignment.shift?.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {assignment.shift?.startTime} - {assignment.shift?.endTime}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {selectedRoster.status === 'draft' && (
                              <button
                                onClick={() => handleRemoveEmployeeFromRoster(selectedRoster._id, assignment.employee._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No employees assigned yet</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              {selectedRoster.status === 'published' && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenAssignModal(selectedRoster);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Edit Assignments
                </button>
              )}
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyRosterManagement;
