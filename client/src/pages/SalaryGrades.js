import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { DollarSign, Plus, Edit2, Trash2, Users, TrendingUp, Award } from 'lucide-react';

const SalaryGrades = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    baseSalary: '',
    minSalary: '',
    maxSalary: '',
    taxRate: 10,
    pensionRate: 0,
    description: '',
    benefits: [],
    isActive: true
  });

  useEffect(() => {
    fetchGrades();
    fetchStats();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/salary-grades');
      setGrades(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch salary grades');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/salary-grades/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGrade) {
        await axios.put(`/api/salary-grades/${editingGrade._id}`, formData);
        toast.success('Salary grade updated successfully');
      } else {
        await axios.post('/api/salary-grades', formData);
        toast.success('Salary grade created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchGrades();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (grade) => {
    setEditingGrade(grade);
    setFormData({
      code: grade.code,
      name: grade.name,
      baseSalary: grade.baseSalary,
      minSalary: grade.minSalary || '',
      maxSalary: grade.maxSalary || '',
      taxRate: grade.taxRate !== undefined ? grade.taxRate : 10,
      pensionRate: grade.pensionRate !== undefined ? grade.pensionRate : 0,
      description: grade.description || '',
      benefits: grade.benefits || [],
      isActive: grade.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salary grade?')) return;
    
    try {
      await axios.delete(`/api/salary-grades/${id}`);
      toast.success('Salary grade deleted successfully');
      fetchGrades();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete salary grade');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      baseSalary: '',
      minSalary: '',
      maxSalary: '',
      taxRate: 10,
      pensionRate: 0,
      description: '',
      benefits: [],
      isActive: true
    });
    setEditingGrade(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Salary Grades
            </h1>
            <p className="text-gray-600 mt-1">Manage salary levels and pay scales</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Salary Grade
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Grades</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalGrades}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Assigned Employees</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalEmployees}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Avg. Salary Range</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {stats.distribution.length > 0 
                    ? formatCurrency(stats.distribution.reduce((sum, g) => sum + g.baseSalary, 0) / stats.distribution.length)
                    : '₦0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grades Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salary Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
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
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="spinner"></div>
                    </div>
                  </td>
                </tr>
              ) : grades.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No salary grades found. Create one to get started.
                  </td>
                </tr>
              ) : (
                grades.map((grade) => (
                  <tr key={grade._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900 bg-blue-100 px-2 py-1 rounded">
                        {grade.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{grade.name}</div>
                      {grade.description && (
                        <div className="text-xs text-gray-500 mt-1">{grade.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(grade.baseSalary)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {grade.minSalary && grade.maxSalary
                          ? `${formatCurrency(grade.minSalary)} - ${formatCurrency(grade.maxSalary)}`
                          : 'Not set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {grade.employeeCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        grade.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {grade.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(grade)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(grade._id)}
                          className="text-red-600 hover:text-red-900"
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {editingGrade ? 'Edit Salary Grade' : 'Add New Salary Grade'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Code *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g., L1, GRADE-A"
                  />
                </div>

                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Level 1, Junior Staff"
                  />
                </div>

                <div>
                  <label className="label">Base Salary *</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    required
                    min="0"
                    step="1000"
                    placeholder="100000"
                  />
                </div>

                <div>
                  <label className="label">Minimum Salary</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.minSalary}
                    onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                    min="0"
                    step="1000"
                    placeholder="80000"
                  />
                </div>

                <div>
                  <label className="label">Maximum Salary</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.maxSalary}
                    onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                    min="0"
                    step="1000"
                    placeholder="120000"
                  />
                </div>

                <div>
                  <label className="label">Tax Rate (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="10"
                  />
                  <small className="text-xs text-gray-500">Tax percentage for this grade</small>
                </div>

                <div>
                  <label className="label">Pension Rate (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.pensionRate}
                    onChange={(e) => setFormData({ ...formData, pensionRate: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                  />
                  <small className="text-xs text-gray-500">Pension contribution percentage</small>
                </div>

                <div>
                  <label className="label">Status</label>
                  <select
                    className="input"
                    value={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Brief description of this salary grade..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGrade ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryGrades;
