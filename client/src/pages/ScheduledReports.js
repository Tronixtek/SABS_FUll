import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Mail,
  X,
  Calendar,
  Clock,
  Users,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ScheduledReports = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    frequency: 'weekly',
    facility: '',
    recipients: [],
    additionalEmails: [],
    isActive: true
  });
  const [emailInput, setEmailInput] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    fetchSchedules();
    fetchFacilities();
    fetchUsers();
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/report-schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSchedules(response.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to fetch schedules');
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('/api/facilities');
      setFacilities(response.data.data);
    } catch (err) {
      console.error('Failed to fetch facilities:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        name: schedule.name,
        frequency: schedule.frequency,
        facility: schedule.facility._id,
        recipients: schedule.recipients || [],
        additionalEmails: schedule.additionalEmails || [],
        isActive: schedule.isActive
      });
      setSelectedUsers(schedule.recipients || []);
    } else {
      setEditingSchedule(null);
      setFormData({
        name: '',
        frequency: 'weekly',
        facility: '',
        recipients: [],
        additionalEmails: [],
        isActive: true
      });
      setSelectedUsers([]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
    setEmailInput('');
    setSelectedUsers([]);
  };

  const handleUserToggle = (user) => {
    const isSelected = selectedUsers.some(u => u._id === user._id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
      setFormData({
        ...formData,
        recipients: formData.recipients.filter(id => id !== user._id)
      });
    } else {
      setSelectedUsers([...selectedUsers, user]);
      setFormData({
        ...formData,
        recipients: [...formData.recipients, user._id]
      });
    }
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && /^\S+@\S+\.\S+$/.test(email)) {
      if (!formData.additionalEmails.includes(email)) {
        setFormData({
          ...formData,
          additionalEmails: [...formData.additionalEmails, email]
        });
      }
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email) => {
    setFormData({
      ...formData,
      additionalEmails: formData.additionalEmails.filter(e => e !== email)
    });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      // Validation
      if (!formData.name || !formData.facility) {
        toast.error('Name and facility are required');
        return;
      }
      
      if (formData.recipients.length === 0 && formData.additionalEmails.length === 0) {
        toast.error('At least one recipient is required');
        return;
      }

      const token = localStorage.getItem('token');
      const url = editingSchedule
        ? `${API_URL}/report-schedules/${editingSchedule._id}`
        : `${API_URL}/report-schedules`;
      
      const payload = {
        ...formData,
        recipients: formData.recipients
      };

      const response = await axios({
        method: editingSchedule ? 'PUT' : 'POST',
        url,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: payload
      });

      if (response.status === 200 || response.status === 201) {
        toast.success(editingSchedule ? 'Schedule updated successfully' : 'Schedule created successfully');
        handleCloseDialog();
        fetchSchedules();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save schedule');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/report-schedules/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success('Schedule deleted successfully');
      fetchSchedules();
    } catch (err) {
      toast.error('Failed to delete schedule');
    }
  };

  const handleToggleActive = async (schedule) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/report-schedules/${schedule._id}`, {
        ...schedule,
        facility: schedule.facility._id,
        recipients: schedule.recipients.map(r => r._id),
        isActive: !schedule.isActive
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      fetchSchedules();
    } catch (err) {
      toast.error('Failed to update schedule');
    }
  };

  const handleTrigger = async (id) => {
    try {
      toast.loading('Triggering report generation...');
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/report-schedules/${id}/trigger`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.dismiss();
      toast.success(response.data.message || 'Report generation triggered successfully');
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Failed to trigger report');
    }
  };

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case 'weekly': return 'bg-blue-100 text-blue-700';
      case 'monthly': return 'bg-green-100 text-green-700';
      case 'quarterly': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Scheduled Reports
            </h1>
            <p className="text-gray-600 mt-1">Automate report generation and email delivery</p>
          </div>
        </div>
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <button
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Create Schedule
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Schedules Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Run</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No scheduled reports found. Create one to get started.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{schedule.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getFrequencyColor(schedule.frequency)}`}>
                        {schedule.frequency.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{schedule.facility?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {schedule.recipients?.slice(0, 2).map((recipient) => (
                          <span key={recipient._id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            <Mail className="w-3 h-3" />
                            {recipient.name}
                          </span>
                        ))}
                        {schedule.additionalEmails?.slice(0, 1).map((email) => (
                          <span key={email} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            <Mail className="w-3 h-3" />
                            {email}
                          </span>
                        ))}
                        {(schedule.recipients?.length + schedule.additionalEmails?.length) > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            +{(schedule.recipients?.length || 0) + (schedule.additionalEmails?.length || 0) - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        schedule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {schedule.lastRun ? new Date(schedule.lastRun).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTrigger(schedule._id)}
                          disabled={!schedule.isActive}
                          className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                          title="Trigger now"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDialog(schedule)}
                          className="p-1 text-blue-600 hover:text-blue-700"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(schedule)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            schedule.isActive ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                          title="Toggle active"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              schedule.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule._id)}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">
                {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
              </h3>
              <button
                onClick={handleCloseDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Schedule Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Weekly Staff Attendance Report"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency *
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly (Every Friday 5:00 PM)</option>
                  <option value="monthly">Monthly (1st of month 8:00 AM)</option>
                  <option value="quarterly">Quarterly (1st of quarter 9:00 AM)</option>
                </select>
              </div>

              {/* Facility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facility *
                </label>
                <select
                  value={formData.facility}
                  onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a facility...</option>
                  {facilities.map((facility) => (
                    <option key={facility._id} value={facility._id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* System Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Recipients
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-auto">
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500">No users available</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => (
                        <label key={user._id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedUsers.some(u => u._id === user._id)}
                            onChange={() => handleUserToggle(user)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {user.name} ({user.email})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Emails */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Email Addresses
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.additionalEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="hover:text-blue-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isActive ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                {editingSchedule ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledReports;
