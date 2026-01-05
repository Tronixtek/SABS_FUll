import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Facilities = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    contactInfo: {
      phone: '',
      email: '',
      manager: ''
    },
    deviceApiUrl: '',
    deviceApiKey: '',
    userApiUrl: '',
    addUserApiUrl: '',
    timezone: 'Asia/Kolkata',
    configuration: {
      autoSync: true,
      syncInterval: 5,
      integrationType: 'java-xo5' // Default to Java Smart Device integration
    },
    status: 'active'
  });

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('/api/facilities');
      setFacilities(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (facilityId) => {
    const loadingToast = toast.loading('Syncing facility data...');
    try {
      await axios.post(`/api/facilities/${facilityId}/sync`);
      toast.success('Facility synced successfully', { id: loadingToast });
      fetchFacilities();
    } catch (error) {
      toast.error('Failed to sync facility', { id: loadingToast });
    }
  };

  const handleOpenModal = (facility = null) => {
    if (facility) {
      // Editing existing facility
      setEditingFacility(facility);
      setFormData({
        name: facility.name || '',
        code: facility.code || '',
        location: {
          address: facility.location?.address || '',
          city: facility.location?.city || '',
          state: facility.location?.state || '',
          country: facility.location?.country || '',
          zipCode: facility.location?.zipCode || ''
        },
        contactInfo: {
          phone: facility.contactInfo?.phone || '',
          email: facility.contactInfo?.email || '',
          manager: facility.contactInfo?.manager || ''
        },
        deviceApiUrl: facility.deviceApiUrl || '',
        deviceApiKey: facility.deviceApiKey || '',
        userApiUrl: facility.configuration?.userApiUrl || '',
        addUserApiUrl: facility.configuration?.addUserApiUrl || '',
        timezone: facility.timezone || 'Asia/Kolkata',
        configuration: {
          autoSync: facility.configuration?.autoSync ?? true,
          syncInterval: facility.configuration?.syncInterval || 5,
          integrationType: facility.configuration?.integrationType || 'java-xo5'
        },
        status: facility.status || 'active'
      });
    } else {
      // Adding new facility
      setEditingFacility(null);
      setFormData({
        name: '',
        code: '',
        location: {
          address: '',
          city: '',
          state: '',
          country: '',
          zipCode: ''
        },
        contactInfo: {
          phone: '',
          email: '',
          manager: ''
        },
        deviceApiUrl: '',
        deviceApiKey: '',
        userApiUrl: '',
        timezone: 'Asia/Kolkata',
        configuration: {
          autoSync: true,
          syncInterval: 5,
          integrationType: 'java-xo5'
        },
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFacility(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(editingFacility ? 'Updating facility...' : 'Creating facility...');

    try {
      // Prepare data with userApiUrl and addUserApiUrl in configuration
      const submitData = {
        ...formData,
        configuration: {
          ...formData.configuration,
          userApiUrl: formData.userApiUrl,
          addUserApiUrl: formData.addUserApiUrl
        }
      };
      // Remove from root level (keep only in configuration)
      delete submitData.userApiUrl;
      delete submitData.addUserApiUrl;

      if (editingFacility) {
        await axios.put(`/api/facilities/${editingFacility._id}`, submitData);
        toast.success('Facility updated successfully', { id: loadingToast });
      } else {
        await axios.post('/api/facilities', submitData);
        toast.success('Facility created successfully', { id: loadingToast });
      }
      
      handleCloseModal();
      fetchFacilities();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save facility';
      toast.error(message, { id: loadingToast });
    }
  };

  const handleDelete = async (facilityId, facilityName) => {
    if (!window.confirm(`Are you sure you want to delete ${facilityName}?`)) {
      return;
    }

    const loadingToast = toast.loading('Deleting facility...');
    try {
      await axios.delete(`/api/facilities/${facilityId}`);
      toast.success('Facility deleted successfully', { id: loadingToast });
      fetchFacilities();
    } catch (error) {
      toast.error('Failed to delete facility', { id: loadingToast });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      inactive: 'badge-gray',
      maintenance: 'badge-warning'
    };
    return `badge ${badges[status] || 'badge-gray'}`;
  };

  const getSyncStatusBadge = (status) => {
    const badges = {
      success: 'badge-success',
      failed: 'badge-danger',
      pending: 'badge-warning',
      'in-progress': 'badge-info'
    };
    return `badge ${badges[status] || 'badge-gray'}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Facility Management
          </h1>
          <p className="text-gray-600 mt-1">Manage facilities and device integrations</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Facility
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading facilities...</p>
          </div>
        </div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="flex flex-col items-center">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500 text-lg mb-4">No facilities found</p>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              Add Your First Facility
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {facilities.map((facility) => (
            <div key={facility._id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 sm:p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">
                    {facility.name}
                  </h3>
                  <p className="text-sm text-gray-600">{facility.code}</p>
                </div>
                <span className={getStatusBadge(facility.status)}>
                  {facility.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span className="text-right">{facility.location?.city || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-medium">Device URL:</span>
                  <span className="text-xs text-right max-w-32 truncate">
                    {facility.deviceApiUrl ? facility.deviceApiUrl.substring(0, 25) + '...' : 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Last Sync:</span>
                  <span className="text-xs text-right">
                    {facility.deviceInfo?.lastSyncTime 
                      ? new Date(facility.deviceInfo.lastSyncTime).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Sync Status:</span>
                  <span className={getSyncStatusBadge(facility.deviceInfo?.syncStatus)}>
                    {facility.deviceInfo?.syncStatus || 'pending'}
                  </span>
                </div>
                {facility.deviceInfo?.lastSyncError && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                    <p className="text-xs text-red-600">
                      <strong>Error:</strong> {facility.deviceInfo.lastSyncError}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleSync(facility._id)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  title="Sync Now"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Sync Now
                </button>
                <button 
                  onClick={() => handleOpenModal(facility)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  title="Edit Facility"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(facility._id, facility.name)}
                  className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-all duration-200 flex items-center justify-center text-sm"
                  title="Delete Facility"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Facility Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-purple-50 border-b px-4 sm:px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingFacility ? 'Edit Facility' : 'Add New Facility'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Facility Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Main Office"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Facility Code *
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 uppercase"
                      placeholder="FAC001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Location</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      name="location.address"
                      value={formData.location.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="location.city"
                      value={formData.location.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      name="location.state"
                      value={formData.location.state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="location.country"
                      value={formData.location.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="India"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      name="location.zipCode"
                      value={formData.location.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="400001"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="contactInfo.phone"
                      value={formData.contactInfo.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="+91 123 456 7890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="contactInfo.email"
                      value={formData.contactInfo.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="facility@company.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Name
                    </label>
                    <input
                      type="text"
                      name="contactInfo.manager"
                      value={formData.contactInfo.manager}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              </div>

              {/* Device API Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Device API Configuration
                  <span className="text-sm font-normal text-gray-500 block sm:inline sm:ml-2">
                    (For Face Recognition/RFID Devices)
                  </span>
                </h3>
                <div className="space-y-4">
                  {/* Integration Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Integration Type *
                    </label>
                    <select
                      name="configuration.integrationType"
                      value={formData.configuration.integrationType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="java-xo5">Smart Device (Full Management)</option>
                      <option value="legacy">Standard Device (Basic)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="block">Smart Device: Two-way communication with remote management, configuration, and monitoring</span>
                      <span className="block">Standard Device: One-way data collection for basic attendance tracking</span>
                    </p>
                  </div>
                  {/* Device ID - Read Only */}
                  {editingFacility?.deviceInfo?.deviceId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Device ID
                        <span className="text-xs font-normal text-green-600 block sm:inline sm:ml-2">
                          (Auto-captured from device)
                        </span>
                      </label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={editingFacility.deviceInfo.deviceId}
                          readOnly
                          disabled
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                        />
                        <span className="ml-2 text-green-500" title="Auto-populated from device">
                          ✓
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        This ID is automatically captured from your device during sync
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Device API URL (Attendance Records) *
                    </label>
                    <input
                      type="url"
                      name="deviceApiUrl"
                      value={formData.deviceApiUrl}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="https://abc123.ngrok.io/api/attendance"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The endpoint to fetch check-in/check-out records
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Device API Key (Optional)
                    </label>
                    <input
                      type="text"
                      name="deviceApiKey"
                      value={formData.deviceApiKey}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Bearer token or API key"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty if device doesn't require authentication
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Sync API URL (Optional)
                    </label>
                    <input
                      type="url"
                      name="userApiUrl"
                      value={formData.userApiUrl}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="https://abc123.ngrok.io/api/users/list"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL to fetch/sync registered users FROM device to central database
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add User API URL (Optional)
                    </label>
                    <input
                      type="url"
                      name="addUserApiUrl"
                      value={formData.addUserApiUrl}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="https://abc123.ngrok.io/api/users/add"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL to register new employees TO device (required for face capture)
                    </p>
                  </div>

                  {/* Delete User API URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center gap-2">
                        <TrashIcon className="w-4 h-4 text-red-500" />
                        Delete User API URL (Optional)
                      </span>
                    </label>
                    <input
                      type="url"
                      name="deleteUserApiUrl"
                      value={formData.configuration?.deleteUserApiUrl || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        configuration: {
                          ...formData.configuration,
                          deleteUserApiUrl: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                      placeholder="https://abc123.ngrok.io/api/person/{person_uuid}"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL to delete employees FROM device when they are removed from the system
                    </p>
                    
                    {/* Help Box - Mobile Responsive */}
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-900 mb-1">
                            📝 Endpoint Format
                          </p>
                          <div className="bg-blue-100 p-2 rounded text-xs text-blue-700 font-mono break-all mb-2">
                            https://your-device-url/api/person/{'{person_uuid}'}
                          </div>
                          <p className="text-xs text-blue-700 mb-2">
                            Use <code className="bg-blue-100 px-1 rounded font-mono">{'{person_uuid}'}</code> as a placeholder. 
                            The system will replace it with the actual employee device ID during deletion.
                          </p>
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-xs font-medium text-blue-800 mb-1">Example:</p>
                            <div className="bg-white p-2 rounded text-xs text-blue-600 font-mono break-all">
                              https://d411e9815f64.ngrok-free.app/api/person/{'{person_uuid}'}
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-blue-200 space-y-1">
                            <p className="text-xs text-blue-700">
                              <strong>HTTP Method:</strong> DELETE
                            </p>
                            <p className="text-xs text-blue-700">
                              <strong>Authentication:</strong> Uses Device API Key (above)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Sync Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="configuration.autoSync"
                        checked={formData.configuration.autoSync}
                        onChange={handleInputChange}
                        className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable Auto-Sync
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Automatically sync data at regular intervals
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sync Interval (minutes)
                    </label>
                    <input
                      type="number"
                      name="configuration.syncInterval"
                      value={formData.configuration.syncInterval}
                      onChange={handleInputChange}
                      min="1"
                      max="60"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  {editingFacility ? 'Update Facility' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facilities;
