import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'facility-manager',
    facilities: [],
    developerKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const { username, email, password, confirmPassword, firstName, lastName, role, facilities: selectedFacilities, developerKey } = formData;

  // Fetch facilities when component mounts or when role changes to facility-manager
  useEffect(() => {
    if (role === 'facility-manager') {
      fetchFacilities();
    }
  }, [role]);

  const fetchFacilities = async () => {
    setLoadingFacilities(true);
    try {
      const res = await axios.get('/api/facilities');
      setFacilities(res.data.data || []);
      if (res.data.data.length === 0) {
        toast.error('No facilities available. An admin must create a facility first.');
      }
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
      // If authentication error, show appropriate message
      if (error.response?.status === 401) {
        toast.error('Please use the Users page inside the app to create facility managers.');
      } else {
        toast.error('Unable to load facilities. Please login and use the Users page.');
      }
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
      // Remove facility
      setFormData({
        ...formData,
        facilities: currentFacilities.filter(id => id !== facilityId)
      });
    } else {
      // Add facility
      setFormData({
        ...formData,
        facilities: [...currentFacilities, facilityId]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!username || !email || !password || !firstName || !lastName) {
      toast.error('Please fill in all fields');
      return;
    }

    // Facility Manager must select at least one facility
    if (role === 'facility-manager' && selectedFacilities.length === 0) {
      toast.error('Please select at least one facility for the Facility Manager');
      return;
    }

    // Check if facilities are available for facility-manager role
    if (role === 'facility-manager' && facilities.length === 0) {
      toast.error('Cannot create Facility Manager account. No facilities available. Admin must create a facility first.');
      return;
    }

    // Developer key validation for super-admin role
    if (role === 'super-admin' && !developerKey) {
      toast.error('Developer key is required for super admin creation');
      return;
    }

    // Admin creation requires authentication (will be validated by backend)
    if (role === 'admin') {
      toast.info('Admin users can only be created by Super Admin. You must be logged in as Super Admin.');
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Prepare facilities array - only for facility-manager role
      const facilitiesArray = role === 'facility-manager' ? selectedFacilities : [];

      const res = await axios.post('/api/auth/register', {
        username,
        email,
        password,
        firstName,
        lastName,
        role,
        facilities: facilitiesArray,
        developerKey
      });

      const roleDisplayName = {
        'super-admin': 'Super Admin',
        'admin': 'Admin',
        'facility-manager': 'Facility Manager',
        'hr': 'HR'
      }[role] || 'User';

      toast.success(`${roleDisplayName} user created successfully!`);
      console.log('Registration successful:', res.data);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center py-4 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mx-4">
        {/* Back to Home link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Create User Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Setup for your Smart Attendance System
          </p>
          {/* Notice for Admins */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>Admins:</strong> To create Facility Managers or HR users, please login and go to <strong>Users</strong> page in the app.
            </p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={firstName}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="System"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={lastName}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Administrator"
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin@company.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Minimum 6 characters"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Re-enter password"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              >
                <option value="facility-manager">Facility Manager</option>
                <option value="hr">HR (Read Only)</option>
                <option value="admin">Admin (Super Admin only)</option>
                <option value="super-admin">Super Admin (Developer)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {role === 'super-admin' && 'Full system access - requires developer key'}
                {role === 'admin' && 'Same as Super Admin - can only be created by Super Admin'}
                {role === 'facility-manager' && 'Manage facilities, enroll users, edit devices'}
                {role === 'hr' && 'View all records and download reports only'}
              </p>
            </div>

            {/* Developer Key - Only for Super Admin */}
            {role === 'super-admin' && (
              <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-4">
                <label htmlFor="developerKey" className="block text-sm font-medium text-red-800 mb-1">
                  Developer Key * (Required for Super Admin)
                </label>
                <input
                  id="developerKey"
                  name="developerKey"
                  type="password"
                  required={role === 'super-admin'}
                  value={developerKey}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-red-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Enter developer key"
                />
                <p className="mt-2 text-xs text-red-700">
                  🔒 This is a security measure. Only developers should have access to this key.
                </p>
              </div>
            )}

            {/* Facility Selection - Only for Facility Manager role */}
            {role === 'facility-manager' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label htmlFor="facility" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Facility *
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
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mt-2">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">No Facilities Available</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          An admin must create a facility before you can assign managers. Please create a facility first or select a different role.
                        </p>
                      </div>
                    </div>
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
                      📍 This Facility Manager will manage selected facilities, enroll users, and configure devices.
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating User...
                </>
              ) : (
                `Create ${role === 'super-admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : role === 'facility-manager' ? 'Facility Manager' : 'HR'} Account`
              )}
            </button>
          </div>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-blue-600 hover:text-purple-600 transition-colors font-medium"
            >
              Already have an account? Login here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
