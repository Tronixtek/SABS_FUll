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
      syncInterval: 5
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
          syncInterval: facility.configuration?.syncInterval || 5
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
          syncInterval: 5
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Facilities</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Facility
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="spinner"></div>
        </div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No facilities found</p>
          <button 
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
          >
            Add Your First Facility
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div key={facility._id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {facility.name}
                  </h3>
                  <p className="text-sm text-gray-600">{facility.code}</p>
                </div>
                <span className={getStatusBadge(facility.status)}>
                  {facility.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p><strong>Location:</strong> {facility.location?.city || 'N/A'}</p>
                <p><strong>Device URL:</strong> {' '}
                  <span className="text-xs break-all">
                    {facility.deviceApiUrl ? facility.deviceApiUrl.substring(0, 40) + '...' : 'Not configured'}
                  </span>
                </p>
                <p><strong>Last Sync:</strong> {' '}
                  {facility.deviceInfo?.lastSyncTime 
                    ? new Date(facility.deviceInfo.lastSyncTime).toLocaleString()
                    : 'Never'}
                </p>
                <p>
                  <strong>Sync Status:</strong>{' '}
                  <span className={getSyncStatusBadge(facility.deviceInfo?.syncStatus)}>
                    {facility.deviceInfo?.syncStatus || 'pending'}
                  </span>
                </p>
                {facility.deviceInfo?.lastSyncError && (
                  <p className="text-xs text-red-600">
                    <strong>Error:</strong> {facility.deviceInfo.lastSyncError}
                  </p>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleSync(facility._id)}
                  className="btn btn-outline flex-1 flex items-center justify-center"
                  title="Sync Now"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Sync Now
                </button>
                <button 
                  onClick={() => handleOpenModal(facility)}
                  className="text-blue-600 hover:text-blue-800 p-2"
                  title="Edit Facility"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => handleDelete(facility._id, facility.name)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Delete Facility"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Facility Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingFacility ? 'Edit Facility' : 'Add New Facility'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Facility Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="input"
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
                      className="input uppercase"
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
                      className="input"
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
                      className="input"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      name="location.address"
                      value={formData.location.address}
                      onChange={handleInputChange}
                      className="input"
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
                      className="input"
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
                      className="input"
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
                      className="input"
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
                      className="input"
                      placeholder="400001"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="contactInfo.phone"
                      value={formData.contactInfo.phone}
                      onChange={handleInputChange}
                      className="input"
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
                      className="input"
                      placeholder="facility@company.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manager Name
                    </label>
                    <input
                      type="text"
                      name="contactInfo.manager"
                      value={formData.contactInfo.manager}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              </div>

              {/* Device API Configuration */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Device API Configuration
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (For Face Recognition/RFID Devices)
                  </span>
                </h3>
                <div className="space-y-4">
                  {/* Device ID - Read Only */}
                  {editingFacility?.deviceInfo?.deviceId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Device ID
                        <span className="text-xs font-normal text-green-600 ml-2">
                          (Auto-captured from device)
                        </span>
                      </label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={editingFacility.deviceInfo.deviceId}
                          readOnly
                          disabled
                          className="input bg-gray-50 text-gray-600 cursor-not-allowed"
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
                      className="input"
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
                      className="input"
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
                      className="input"
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
                      className="input"
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
                      className="input focus:ring-red-500 focus:border-red-500"
                      placeholder="https://abc123.ngrok.io/api/person/{person_uuid}"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL to delete employees FROM device when they are removed from the system
                    </p>
                    
                    {/* Help Box */}
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-blue-900 mb-1">
                            📝 Endpoint Format
                          </p>
                          <code className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded block mb-2 break-all font-mono">
                            https://your-device-url/api/person/{'{person_uuid}'}
                          </code>
                          <p className="text-xs text-blue-700 mb-2">
                            Use <code className="bg-blue-100 px-1 rounded font-mono">{'{person_uuid}'}</code> as a placeholder. 
                            The system will replace it with the actual employee device ID during deletion.
                          </p>
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-xs font-medium text-blue-800 mb-1">Example:</p>
                            <code className="text-xs text-blue-600 bg-white px-2 py-1 rounded block">
                              https://d411e9815f64.ngrok-free.app/api/person/{'{person_uuid}'}
                            </code>
                          </div>
                          <div className="mt-2 pt-2 border-t border-blue-200">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="configuration.autoSync"
                        checked={formData.configuration.autoSync}
                        onChange={handleInputChange}
                        className="mr-2"
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
                      className="input"
                      placeholder="5"
                    />
                  </div>
                </div>
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
