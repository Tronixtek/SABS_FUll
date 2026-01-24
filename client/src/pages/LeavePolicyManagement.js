import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CogIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LeavePolicyManagement = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [createData, setCreateData] = useState({
    leaveType: '',
    displayName: '',
    description: '',
    isPaid: true,
    salaryPercentage: 100,
    hasBalanceLimit: false,
    maxDaysPerYear: 0,
    minimumNoticeDays: 0,
    maxDaysPerRequest: 0,
    requiresDocumentation: false,
    requiredDocuments: '',
    requiresUrgentApproval: false,
    allowRetroactive: false
  });

  const leaveTypeLabels = {
    annual: 'Annual Leave',
    maternity: 'Maternity Leave',
    adoptive: 'Adoptive Leave',
    examination: 'Examination Leave',
    takaba: 'Takaba Leave',
    sabbatical: 'Sabbatical Leave',
    study: 'Study Leave',
    religious: 'Religious Leave',
    casual: 'Casual Leave',
    absence: 'Leave of Absence',
    'official-assignment': 'Official Assignment'
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/leave-policy`);
      if (response.data.success) {
        setPolicies(response.data.data.policies);
      }
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      toast.error('Failed to load leave policies');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (policy) => {
    setSelectedPolicy(policy);
    setEditData({
      displayName: policy.displayName,
      description: policy.description,
      isPaid: policy.isPaid,
      salaryPercentage: policy.salaryPercentage,
      requiresDocumentation: policy.requiresDocumentation,
      requiredDocuments: policy.requiredDocuments.join(', '),
      minimumNoticeDays: policy.minimumNoticeDays,
      hasBalanceLimit: policy.hasBalanceLimit
    });
    setShowEditModal(true);
  };

  const handleSavePolicy = async () => {
    try {
      const updateData = {
        ...editData,
        requiredDocuments: editData.requiredDocuments
          .split(',')
          .map(doc => doc.trim())
          .filter(doc => doc)
      };

      const response = await axios.put(
        `${API_URL}/api/leave-policy/${selectedPolicy.leaveType}`,
        updateData
      );

      if (response.data.success) {
        toast.success('Policy updated successfully');
        setShowEditModal(false);
        fetchPolicies();
      }
    } catch (error) {
      console.error('Failed to update policy:', error);
      toast.error(error.response?.data?.message || 'Failed to update policy');
    }
  };

  const handleCreatePolicy = async () => {
    try {
      const newPolicyData = {
        ...createData,
        requiredDocuments: createData.requiredDocuments
          .split(',')
          .map(doc => doc.trim())
          .filter(doc => doc)
      };

      const response = await axios.post(
        `${API_URL}/api/leave-policy/create`,
        newPolicyData
      );

      if (response.data.success) {
        toast.success('Leave policy created successfully');
        setShowCreateModal(false);
        setCreateData({
          leaveType: '',
          displayName: '',
          description: '',
          isPaid: true,
          salaryPercentage: 100,
          hasBalanceLimit: false,
          maxDaysPerYear: 0,
          minimumNoticeDays: 0,
          maxDaysPerRequest: 0,
          requiresDocumentation: false,
          requiredDocuments: '',
          requiresUrgentApproval: false,
          allowRetroactive: false
        });
        fetchPolicies();
      }
    } catch (error) {
      console.error('Failed to create policy:', error);
      toast.error(error.response?.data?.message || 'Failed to create policy');
    }
  };

  const getPaymentBadge = (policy) => {
    if (!policy.isPaid) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Unpaid
        </span>
      );
    }
    if (policy.salaryPercentage === 100) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CurrencyDollarIcon className="h-3 w-3 mr-1" />
          100% Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <CurrencyDollarIcon className="h-3 w-3 mr-1" />
        {policy.salaryPercentage}% Paid
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leave Policy Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure payment status, documentation requirements, and notice periods for each leave type
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Leave
              </button>
              <CogIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Policies Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading policies...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {policies.map((policy) => (
              <div
                key={policy.leaveType}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {leaveTypeLabels[policy.leaveType] || policy.leaveType}
                    </h3>
                    {policy.requiresUrgentApproval && (
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Urgent Approval Required
                      </span>
                    )}
                  </div>
                  {getPaymentBadge(policy)}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {policy.description}
                </p>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  {policy.hasBalanceLimit && (
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="h-4 w-4 text-blue-600 mr-2" />
                      <span>Balance limit enforced</span>
                    </div>
                  )}
                  
                  {policy.minimumNoticeDays > 0 && (
                    <div className="flex items-center text-sm text-gray-700">
                      <ClockIcon className="h-4 w-4 text-orange-600 mr-2" />
                      <span>{policy.minimumNoticeDays} days notice required</span>
                    </div>
                  )}

                  {policy.requiresDocumentation && (
                    <div className="flex items-start text-sm text-gray-700">
                      <DocumentTextIcon className="h-4 w-4 text-purple-600 mr-2 mt-0.5" />
                      <div>
                        <span className="block">Documents required:</span>
                        <ul className="ml-4 mt-1 list-disc text-xs text-gray-600">
                          {policy.requiredDocuments.map((doc, idx) => (
                            <li key={idx}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => handleEditClick(policy)}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Edit Policy
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedPolicy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Edit Policy: {leaveTypeLabels[selectedPolicy.leaveType]}
                </h2>

                <div className="space-y-4">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editData.displayName || ''}
                      onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter leave type display name"
                    />
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={editData.isPaid === true}
                          onChange={() => setEditData({ ...editData, isPaid: true })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Paid</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={editData.isPaid === false}
                          onChange={() => setEditData({ ...editData, isPaid: false, salaryPercentage: 0 })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Unpaid</span>
                      </label>
                    </div>
                  </div>

                  {/* Salary Percentage */}
                  {editData.isPaid && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salary Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.salaryPercentage}
                        onChange={(e) => setEditData({ ...editData, salaryPercentage: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Balance Limit */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editData.hasBalanceLimit}
                        onChange={(e) => setEditData({ ...editData, hasBalanceLimit: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enforce balance limit</span>
                    </label>
                  </div>

                  {/* Minimum Notice Days */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Notice Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editData.minimumNoticeDays}
                      onChange={(e) => setEditData({ ...editData, minimumNoticeDays: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Documentation Required */}
                  <div>
                    <label className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={editData.requiresDocumentation}
                        onChange={(e) => setEditData({ ...editData, requiresDocumentation: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Requires documentation</span>
                    </label>
                    {editData.requiresDocumentation && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Required documents (comma-separated)
                        </label>
                        <textarea
                          value={editData.requiredDocuments}
                          onChange={(e) => setEditData({ ...editData, requiredDocuments: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Medical certificate, Hospital letter"
                        />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePolicy}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create New Leave Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-lg bg-white">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Leave Type</h3>
                
                <div className="space-y-4">
                  {/* Leave Type Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Leave Type Code * (lowercase, hyphenated)
                    </label>
                    <input
                      type="text"
                      value={createData.leaveType}
                      onChange={(e) => setCreateData({...createData, leaveType: e.target.value})}
                      placeholder="e.g., compassionate-leave"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={createData.displayName}
                      onChange={(e) => setCreateData({...createData, displayName: e.target.value})}
                      placeholder="e.g., Compassionate Leave"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={createData.description}
                      onChange={(e) => setCreateData({...createData, description: e.target.value})}
                      rows="2"
                      placeholder="Brief description of this leave type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Payment Status */}
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={createData.isPaid}
                          onChange={(e) => setCreateData({...createData, isPaid: e.target.checked, salaryPercentage: e.target.checked ? 100 : 0})}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">Paid Leave</span>
                      </label>
                    </div>

                    {/* Salary Percentage */}
                    {createData.isPaid && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Salary % (0-100)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={createData.salaryPercentage}
                          onChange={(e) => setCreateData({...createData, salaryPercentage: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Has Balance Limit */}
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={createData.hasBalanceLimit}
                          onChange={(e) => setCreateData({...createData, hasBalanceLimit: e.target.checked})}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">Has Balance Limit</span>
                      </label>
                    </div>

                    {/* Max Days Per Year */}
                    {createData.hasBalanceLimit && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Days/Year
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={createData.maxDaysPerYear}
                          onChange={(e) => setCreateData({...createData, maxDaysPerYear: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Minimum Notice Days */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Notice (days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={createData.minimumNoticeDays}
                        onChange={(e) => setCreateData({...createData, minimumNoticeDays: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    {/* Max Days Per Request */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Days/Request (0 = unlimited)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={createData.maxDaysPerRequest}
                        onChange={(e) => setCreateData({...createData, maxDaysPerRequest: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Requires Documentation */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={createData.requiresDocumentation}
                        onChange={(e) => setCreateData({...createData, requiresDocumentation: e.target.checked})}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Requires Documentation</span>
                    </label>
                  </div>

                  {/* Required Documents */}
                  {createData.requiresDocumentation && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Required Documents (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={createData.requiredDocuments}
                        onChange={(e) => setCreateData({...createData, requiredDocuments: e.target.value})}
                        placeholder="e.g., Medical certificate, Doctor's note"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Requires Urgent Approval */}
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={createData.requiresUrgentApproval}
                          onChange={(e) => setCreateData({...createData, requiresUrgentApproval: e.target.checked})}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">Requires Urgent Approval (24hrs)</span>
                      </label>
                    </div>

                    {/* Allow Retroactive */}
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={createData.allowRetroactive}
                          onChange={(e) => setCreateData({...createData, allowRetroactive: e.target.checked})}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">Allow Retroactive</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePolicy}
                    disabled={!createData.leaveType || !createData.displayName || !createData.description}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Leave Type
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeavePolicyManagement;
