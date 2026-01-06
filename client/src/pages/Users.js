import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { user, hasPermission } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    facilityManagers: 0,
    hrUsers: 0
  });
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'facility-manager',
    facilities: []
  });

  const { username, email, password, firstName, lastName, role, facilities: selectedFacilities } = formData;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (showModal && role === 'facility-manager') {
      fetchFacilities();
    }
  }, [showModal, role]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/auth/users');
      const usersData = res.data.data || [];
      setUsers(usersData);
      
      // Calculate stats
      const facilityManagers = usersData.filter(u => u.role === 'facility-manager').length;
      const hrUsers = usersData.filter(u => u.role === 'hr').length;
      
      setStats({
        total: usersData.length,
        facilityManagers,
        hrUsers
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchFacilities = async () => {
    setLoadingFacilities(true);
    try {
      const res = await axios.get('/api/facilities');
      setFacilities(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
      toast.error('Failed to load facilities');
      setFacilities([]);
    } finally {
      setLoadingFacilities(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFacilityToggle = (facilityId) => {
    const currentFacilities = formData.facilities || [];
    if (currentFacilities.includes(facilityId)) {
      setFormData({
        ...formData,
        facilities: currentFacilities.filter(id => id !== facilityId)
      });
    } else {
      setFormData({
        ...formData,
        facilities: [...currentFacilities, facilityId]
      });
    }
  };

  const handleOpenModal = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'facility-manager',
      facilities: []
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!username || !email || !password || !firstName || !lastName) {
      toast.error('Please fill in all fields');
      return;
    }

    if (role === 'facility-manager' && selectedFacilities.length === 0) {
      toast.error('Please select at least one facility for the Facility Manager');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const facilitiesArray = role === 'facility-manager' ? selectedFacilities : [];

      const res = await axios.post('/api/auth/register', {
        username,
        email,
        password,
        firstName,
        lastName,
        role,
        facilities: facilitiesArray
      });

      const roleDisplayName = {
        'facility-manager': 'Facility Manager',
        'hr': 'HR'
      }[role] || 'User';

      toast.success(`${roleDisplayName} user created successfully!`);
      handleCloseModal();
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('User creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            User Management
          </h1>
          <p className="text-gray-600 mt-1">Create and manage facility managers and HR users</p>
        </div>
        {hasPermission('manage_users') && (
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create User
          </button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Facility Managers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.facilityManagers}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">HR Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.hrUsers}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-purple-50 border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create New User
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 p-1">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={firstName}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={lastName}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={username}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="johndoe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@company.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={password}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    name="role"
                    value={role}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="facility-manager">Facility Manager</option>
                    <option value="hr">HR (Read Only)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {role === 'facility-manager' && 'Can manage facilities, enroll users, edit devices'}
                    {role === 'hr' && 'View all records and download reports only'}
                  </p>
                </div>
              </div>

              {/* Facility Selection - Only for Facility Manager */}
              {role === 'facility-manager' && (
                <div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Facilities * (Select one or more)
                  </label>
                  {loadingFacilities ? (
                    <div className="flex items-center justify-center py-3">
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-2 text-sm text-gray-600">Loading facilities...</span>
                    </div>
                  ) : facilities.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        No facilities available. Please create a facility first.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {facilities.map((fac) => (
                          <label
                            key={fac._id}
                            className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFacilities.includes(fac._id)}
                              onChange={() => handleFacilityToggle(fac._id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3 flex-1">
                              <span className="text-sm font-medium text-gray-900">{fac.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({fac.code})</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-blue-700">
                        📍 Maximum 2 managers per facility
                      </p>
                      {selectedFacilities.length > 0 && (
                        <p className="mt-1 text-xs font-medium text-blue-800">
                          ✓ {selectedFacilities.length} {selectedFacilities.length === 1 ? 'facility' : 'facilities'} selected
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (role === 'facility-manager' && selectedFacilities.length === 0)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white transition-all ${
                    loading || (role === 'facility-manager' && selectedFacilities.length === 0)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
