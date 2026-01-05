import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    facility: '',
    startTime: '09:00',
    endTime: '17:00',
    workingHours: 8,
    graceTime: {
      checkIn: 15,
      checkOut: 15
    },
    breakTime: 60,
    breakTrackingEnabled: false,
    breaks: [],
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    isOvernight: false,
    isDefault: false,
    color: '#3498db',
    status: 'active',
    allowances: {
      overtimeRate: 1.5,
      nightShiftAllowance: 0,
      weekendAllowance: 0
    },
    description: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shiftColors = [
    '#3498db', // Blue
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#e74c3c', // Red
    '#9b59b6', // Purple
    '#1abc9c', // Teal
    '#34495e', // Dark Gray
    '#e67e22', // Dark Orange
  ];

  useEffect(() => {
    fetchShifts();
    fetchFacilities();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await axios.get('/api/shifts');
      setShifts(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('/api/facilities');
      setFacilities(response.data.data);
    } catch (error) {
      console.error('Failed to fetch facilities');
    }
  };

  const handleOpenModal = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name || '',
        code: shift.code || '',
        facility: shift.facility?._id || '',
        startTime: shift.startTime || '09:00',
        endTime: shift.endTime || '17:00',
        workingHours: shift.workingHours || 8,
        graceTime: {
          checkIn: shift.graceTime?.checkIn || 15,
          checkOut: shift.graceTime?.checkOut || 15
        },
        breakTime: shift.breakTime || 60,
        breakTrackingEnabled: shift.breakTrackingEnabled || false,
        breaks: shift.breaks || [],
        workingDays: shift.workingDays || [],
        isOvernight: shift.isOvernight || false,
        isDefault: shift.isDefault || false,
        color: shift.color || '#3498db',
        status: shift.status || 'active',
        allowances: {
          overtimeRate: shift.allowances?.overtimeRate || 1.5,
          nightShiftAllowance: shift.allowances?.nightShiftAllowance || 0,
          weekendAllowance: shift.allowances?.weekendAllowance || 0
        },
        description: shift.description || ''
      });
    } else {
      setEditingShift(null);
      setFormData({
        name: '',
        code: '',
        facility: '',
        startTime: '09:00',
        endTime: '17:00',
        workingHours: 8,
        graceTime: {
          checkIn: 15,
          checkOut: 15
        },
        breakTime: 60,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        isOvernight: false,
        isDefault: false,
        color: '#3498db',
        status: 'active',
        allowances: {
          overtimeRate: 1.5,
          nightShiftAllowance: 0,
          weekendAllowance: 0
        },
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingShift(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'number' ? parseFloat(value) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
      }));
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const calculateWorkingHours = (start, end, isOvernight) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    let startInMinutes = startHour * 60 + startMin;
    let endInMinutes = endHour * 60 + endMin;
    
    if (isOvernight && endInMinutes <= startInMinutes) {
      endInMinutes += 24 * 60;
    }
    
    const totalMinutes = endInMinutes - startInMinutes;
    return (totalMinutes / 60).toFixed(1);
  };

  useEffect(() => {
    const hours = calculateWorkingHours(formData.startTime, formData.endTime, formData.isOvernight);
    setFormData(prev => ({ ...prev, workingHours: parseFloat(hours) }));
  }, [formData.startTime, formData.endTime, formData.isOvernight]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingShift) {
        await axios.put(`/api/shifts/${editingShift._id}`, formData);
        toast.success('Shift updated successfully');
      } else {
        await axios.post('/api/shifts', formData);
        toast.success('Shift created successfully');
      }
      handleCloseModal();
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete shift "${name}"?`)) {
      return;
    }
    
    try {
      await axios.delete(`/api/shifts/${id}`);
      toast.success('Shift deleted successfully');
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete shift');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Shift Management
          </h1>
          <p className="text-gray-600 mt-1">Manage work shifts and schedules</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Shift
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading shifts...</p>
          </div>
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-100">
          <ClockIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg mb-4">No shifts found</p>
          <button 
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
          >
            Create Your First Shift
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <div key={shift._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: shift.color || '#3498db' }}
                  ></div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      {shift.name}
                      {shift.isDefault && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          ⭐ Default
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">{shift.code}</p>
                  </div>
                </div>
                <span 
                  className={`badge ${shift.status === 'active' ? 'badge-success' : 'badge-gray'}`}
                >
                  {shift.status}
                </span>
              </div>

              <div className="space-y-3 text-sm mb-4">
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-gray-600 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Time:
                  </span>
                  <span className="font-medium">
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>
                
                {shift.isOvernight && (
                  <div className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded inline-block">
                    🌙 Overnight Shift
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Work Hours:</span>
                  <span className="font-medium">{shift.workingHours} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Break Time:</span>
                  <span className="font-medium">{shift.breakTime} min</span>
                </div>
                
                {shift.breakTrackingEnabled && (
                  <div className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                    ☕ Break Tracking Enabled ({shift.breaks?.length || 0} breaks)
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Grace Period:</span>
                  <span className="font-medium">
                    {shift.graceTime?.checkIn || 0} / {shift.graceTime?.checkOut || 0} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Facility:</span>
                  <span className="font-medium text-blue-600">
                    {shift.facility?.name || 'N/A'}
                  </span>
                </div>
              </div>

              {shift.workingDays && shift.workingDays.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">Working Days:</p>
                  <div className="flex flex-wrap gap-1">
                    {shift.workingDays.map((day) => (
                      <span key={day} className="badge badge-info text-xs">
                        {day.substring(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-3 border-t">
                <button
                  onClick={() => handleOpenModal(shift)}
                  className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                  title="Edit Shift"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(shift._id, shift.name)}
                  className="text-red-600 hover:text-red-800 flex items-center text-sm ml-auto"
                  title="Delete Shift"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingShift ? 'Edit Shift' : 'Add New Shift'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Shift Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="input"
                      placeholder="Morning Shift"
                    />
                  </div>
                  <div>
                    <label className="label">Shift Code *</label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                      className="input uppercase"
                      placeholder="MS-001"
                    />
                  </div>
                  <div>
                    <label className="label">Facility *</label>
                    <select
                      name="facility"
                      value={formData.facility}
                      onChange={handleInputChange}
                      required
                      className="input"
                    >
                      <option value="">Select Facility</option>
                      {facilities.map(facility => (
                        <option key={facility._id} value={facility._id}>
                          {facility.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center mt-6">
                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={formData.isDefault}
                        onChange={handleInputChange}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        ⭐ Set as Default Shift
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      New employees will be assigned to this shift
                    </p>
                  </div>
                </div>
              </div>

              {/* Shift Timing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Shift Timing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Start Time *</label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">End Time *</label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Working Hours</label>
                    <input
                      type="number"
                      name="workingHours"
                      value={formData.workingHours}
                      readOnly
                      className="input bg-gray-50"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                  </div>
                  <div>
                    <label className="label">Break Time (minutes)</label>
                    <input
                      type="number"
                      name="breakTime"
                      value={formData.breakTime}
                      onChange={handleInputChange}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="flex items-center mt-6">
                      <input
                        type="checkbox"
                        name="isOvernight"
                        checked={formData.isOvernight}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Overnight Shift 🌙
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Check if shift crosses midnight
                    </p>
                  </div>
                </div>
              </div>

              {/* Grace Time */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Grace Period (minutes)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Check-In Grace</label>
                    <input
                      type="number"
                      name="graceTime.checkIn"
                      value={formData.graceTime.checkIn}
                      onChange={handleInputChange}
                      className="input"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minutes allowed to be late without penalty
                    </p>
                  </div>
                  <div>
                    <label className="label">Check-Out Grace</label>
                    <input
                      type="number"
                      name="graceTime.checkOut"
                      value={formData.graceTime.checkOut}
                      onChange={handleInputChange}
                      className="input"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minutes allowed to leave early without penalty
                    </p>
                  </div>
                </div>
              </div>

              {/* Break Tracking Configuration */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                      ☕ Break Tracking
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure automatic break detection and tracking
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="breakTrackingEnabled"
                      checked={formData.breakTrackingEnabled}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {formData.breakTrackingEnabled && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Structured Breaks</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newBreak = {
                            name: 'Lunch Break',
                            type: 'lunch',
                            duration: 60,
                            startWindow: '12:00',
                            endWindow: '14:00',
                            isPaid: false,
                            isOptional: false,
                            maxDuration: 90,
                            allowMultiple: false
                          };
                          setFormData(prev => ({
                            ...prev,
                            breaks: [...(prev.breaks || []), newBreak]
                          }));
                        }}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Break
                      </button>
                    </div>

                    {(!formData.breaks || formData.breaks.length === 0) && (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 mb-2">☕ No breaks configured</p>
                        <p className="text-sm text-gray-400">Click "Add Break" to configure break periods</p>
                      </div>
                    )}

                    {formData.breaks && formData.breaks.map((breakItem, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-orange-50 border-orange-200">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">Break #{index + 1}</h5>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                breaks: prev.breaks.filter((_, i) => i !== index)
                              }));
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Break Name
                            </label>
                            <input
                              type="text"
                              value={breakItem.name}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].name = e.target.value;
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="input text-sm"
                              placeholder="e.g., Lunch Break"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Break Type
                            </label>
                            <select
                              value={breakItem.type}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].type = e.target.value;
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="input text-sm"
                            >
                              <option value="lunch">Lunch</option>
                              <option value="tea">Tea</option>
                              <option value="prayer">Prayer</option>
                              <option value="rest">Rest</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Expected Duration (minutes)
                            </label>
                            <input
                              type="number"
                              value={breakItem.duration}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].duration = Number(e.target.value);
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="input text-sm"
                              min="5"
                              max="180"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Max Duration (minutes)
                            </label>
                            <input
                              type="number"
                              value={breakItem.maxDuration}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].maxDuration = Number(e.target.value);
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="input text-sm"
                              min="5"
                              max="240"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Start Window
                            </label>
                            <input
                              type="time"
                              value={breakItem.startWindow}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].startWindow = e.target.value;
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="input text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              End Window
                            </label>
                            <input
                              type="time"
                              value={breakItem.endWindow}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].endWindow = e.target.value;
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="input text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={breakItem.isPaid}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].isPaid = e.target.checked;
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Paid Break</span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={breakItem.isOptional}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].isOptional = e.target.checked;
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Optional</span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={breakItem.allowMultiple}
                              onChange={(e) => {
                                const newBreaks = [...formData.breaks];
                                newBreaks[index].allowMultiple = e.target.checked;
                                setFormData(prev => ({ ...prev, breaks: newBreaks }));
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Allow Multiple</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Working Days */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Working Days</h3>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        formData.workingDays.includes(day)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift Color */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Shift Color</h3>
                <div className="flex flex-wrap gap-3">
                  {shiftColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-10 h-10 rounded-full border-4 transition-all ${
                        formData.color === color
                          ? 'border-gray-800 scale-110'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Allowances */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Allowances & Rates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Overtime Rate (multiplier)</label>
                    <input
                      type="number"
                      name="allowances.overtimeRate"
                      value={formData.allowances.overtimeRate}
                      onChange={handleInputChange}
                      className="input"
                      step="0.1"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., 1.5 = 150% of regular rate
                    </p>
                  </div>
                  <div>
                    <label className="label">Night Shift Allowance (%)</label>
                    <input
                      type="number"
                      name="allowances.nightShiftAllowance"
                      value={formData.allowances.nightShiftAllowance}
                      onChange={handleInputChange}
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">Weekend Allowance (%)</label>
                    <input
                      type="number"
                      name="allowances.weekendAllowance"
                      value={formData.allowances.weekendAllowance}
                      onChange={handleInputChange}
                      className="input"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Description</h3>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input"
                  rows="3"
                  placeholder="Additional notes about this shift..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shifts;
