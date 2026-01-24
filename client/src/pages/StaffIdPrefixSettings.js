import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const StaffIdPrefixSettings = () => {
  const [prefixes, setPrefixes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPrefix, setEditingPrefix] = useState(null);
  const [formData, setFormData] = useState({
    prefix: '',
    description: ''
  });

  useEffect(() => {
    fetchPrefixes();
  }, []);

  const fetchPrefixes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/staff-id-prefix/all');
      if (response.data.success) {
        setPrefixes(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch prefixes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPrefix) {
        // Update existing prefix
        const response = await axios.put(`/api/staff-id-prefix/${editingPrefix._id}`, formData);
        if (response.data.success) {
          toast.success('Prefix updated successfully');
        }
      } else {
        // Create new prefix
        const response = await axios.post('/api/staff-id-prefix', formData);
        if (response.data.success) {
          toast.success('Prefix created successfully');
        }
      }
      
      fetchPrefixes();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save prefix');
    }
  };

  const handleEdit = (prefix) => {
    setEditingPrefix(prefix);
    setFormData({
      prefix: prefix.prefix,
      description: prefix.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prefix?')) {
      return;
    }

    try {
      await axios.delete(`/api/staff-id-prefix/${id}`);
      toast.success('Prefix deleted successfully');
      fetchPrefixes();
    } catch (error) {
      toast.error('Failed to delete prefix');
    }
  };

  const handleToggleActive = async (prefix) => {
    try {
      await axios.put(`/api/staff-id-prefix/${prefix._id}`, {
        ...prefix,
        isActive: !prefix.isActive
      });
      toast.success(`Prefix ${prefix.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchPrefixes();
    } catch (error) {
      toast.error('Failed to update prefix status');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPrefix(null);
    setFormData({ prefix: '', description: '' });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff ID Prefix Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage staff ID prefixes used during employee registration
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Prefix
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prefix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prefixes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No prefixes found. Click "Add Prefix" to create one.
                  </td>
                </tr>
              ) : (
                prefixes.map((prefix) => (
                  <tr key={prefix._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded">
                        {prefix.prefix}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{prefix.description || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(prefix)}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          prefix.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {prefix.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(prefix)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <PencilIcon className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(prefix._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingPrefix ? 'Edit Prefix' : 'Add New Prefix'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prefix *
                  </label>
                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., KNLG, KANO SG"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Will be converted to uppercase automatically</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Kano State, Lagos Office"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingPrefix ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffIdPrefixSettings;
