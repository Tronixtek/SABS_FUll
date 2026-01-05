import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import EmployeeModalWithJavaIntegration from '../components/EmployeeModalWithJavaIntegration';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    facility: '',
    status: ''
  });

  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.facility) params.append('facility', filters.facility);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(`/api/employees?${params}`);
      setEmployees(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEmployees();
    fetchFacilities();
    fetchShifts();
  }, [fetchEmployees]);

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('/api/facilities');
      setFacilities(response.data.data);
    } catch (error) {
      console.error('Failed to fetch facilities');
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await axios.get('/api/shifts');
      setShifts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch shifts');
    }
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setModalOpen(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const handleDeleteEmployee = async (employee) => {
    // Show detailed confirmation dialog for validation-first delete
    const confirmDelete = window.confirm(
      `🔍 VALIDATION-FIRST DELETE\n\n` +
      `Employee: ${employee.firstName} ${employee.lastName}\n` +
      `Employee ID: ${employee.employeeId}\n` +
      `Device ID: ${employee.deviceId || 'Not set'}\n\n` +
      `🔍 VALIDATION PROCESS:\n` +
      `1. Check if employee exists on biometric device\n` +
      `2. Delete from device (if found and connected)\n` +
      `3. Soft delete from database (preserves data)\n\n` +
      `✓ Attendance records will be preserved\n` +
      `✓ Employee can be restored if needed\n` +
      `✓ Device validation ensures data consistency\n\n` +
      `⚠️ If employee is not found on device, deletion will be blocked!\n\n` +
      `Proceed with validation-first deletion?`
    );

    if (!confirmDelete) return;

    const loadingToast = toast.loading('🔍 Validating employee on device...');

    try {
      // ✅ STEP 1: Attempt validation-first delete
      console.log(`🔍 Starting validation-first delete for ${employee.firstName} ${employee.lastName}`);
      
      const response = await axios.delete(`/api/employees/${employee._id}`);
      const data = response.data;

      toast.dismiss(loadingToast);
      
      if (data.success) {
        // ✅ SUCCESS: Employee validated and deleted
        if (data.deletionType === 'soft_delete') {
          toast.success(
            `✅ Employee deleted successfully!\n\n` +
            `Validation: ${data.validationPerformed ? 'Performed' : 'Skipped'}\n` +
            `Deleted from: ${data.deletedFrom}\n` +
            `Type: Soft delete (can be restored)\n` +
            `Attendance records: ${data.attendanceRecordsPreserved} preserved`,
            {
              duration: 6000,
              icon: '✅',
            }
          );
          console.log(`✅ Employee soft deleted successfully with validation`);
        } else {
          toast.success('Employee deleted from database', {
            duration: 4000,
          });
          console.log(`ℹ️ Employee deleted (fallback method used)`);
        }
        
        // Refresh employee list
        fetchEmployees();
        
        // Log success details
        console.log(`✅ Employee removed from UI`);
        console.log(`   Employee: ${data.employeeName}`);
        console.log(`   Deletion type: ${data.deletionType || 'standard'}`);
        console.log(`   Can be restored: ${data.canBeRestored || false}`);
        console.log(`   Validation performed: ${data.validationPerformed || false}`);
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      
      // Handle validation-first specific errors
      if (error.response && error.response.data?.requiresConfirmation) {
        const data = error.response.data;
        
        // Show specific error message based on error type
        let errorMessage = '';
        let detailMessage = '';
        let showForceOption = false;
        
        switch (data.error) {
          case 'EMPLOYEE_NOT_ON_DEVICE':
            errorMessage = '🔍 Employee Not Found on Device';
            detailMessage = 'The employee was not found on the biometric device. This could mean:\n\n' +
                          '• Employee was never enrolled on the device\n' +
                          '• Employee was manually removed from device\n' +
                          '• Device data is out of sync with database\n\n' +
                          'Validation-first deletion requires the employee to exist on the device.';
            showForceOption = true;
            break;
            
          case 'JAVA_SERVICE_TIMEOUT':
            errorMessage = '⏱️ Java Service Timeout';
            detailMessage = 'The Java service (device integration) is not responding. The service may be offline or experiencing issues.';
            showForceOption = true;
            break;
            
          case 'JAVA_SERVICE_UNREACHABLE':
            errorMessage = '🔌 Java Service Unreachable';
            detailMessage = 'Cannot connect to the Java service. Please check if the Java service is running and accessible.';
            showForceOption = true;
            break;
            
          case 'DEVICE_OPERATION_FAILED':
            errorMessage = '❌ Device Operation Failed';
            detailMessage = data.message || 'The device operation failed during validation or deletion process.';
            showForceOption = true;
            break;
            
          case 'JAVA_SERVICE_ERROR':
            errorMessage = '⚠️ Java Service Error';
            detailMessage = data.message || 'The Java service encountered an error while processing the request.';
            showForceOption = true;
            break;
            
          default:
            errorMessage = '⚠️ Validation Failed';
            detailMessage = data.message || 'Employee validation failed for unknown reasons.';
            showForceOption = true;
        }
        
        // Ask user if they want to force delete (bypass validation)
        if (showForceOption) {
          const forceDelete = window.confirm(
            `${errorMessage}\n\n` +
            `${detailMessage}\n\n` +
            `⚠️ VALIDATION-FIRST DELETION BLOCKED!\n\n` +
            `Options:\n` +
            `• Click OK to use FORCE DELETE (database-only, no device validation)\n` +
            `• Click Cancel to abort and check device/service status\n\n` +
            `Proceed with force delete (bypasses validation)?`
          );

          if (!forceDelete) {
            toast.info('Deletion cancelled. Please check device/service connectivity.', {
              duration: 4000,
            });
            return;
          }

          // ✅ STEP 2: Force delete (bypass validation)
          console.log(`⚠️ Using force delete to bypass validation...`);
          const forceLoadingToast = toast.loading('🔧 Force deleting (bypassing validation)...');
        
        try {
          const forceResponse = await axios.delete(`/api/employees/${employee._id}/force`);
          const forceData = forceResponse.data;
          
          toast.dismiss(forceLoadingToast);

          if (forceData.success) {
            toast.success('Employee deleted from database', {
              duration: 5000,
              icon: '✅',
            });
            toast.error('⚠️ WARNING: Employee may still exist on device - Manual cleanup required!', {
              duration: 8000,
            });
            
            // Refresh employee list
            fetchEmployees();
            
            // Log for admin
            console.warn(`⚠️ Employee deleted from DB but may still be on device`);
            console.warn(`   Device ID: ${employee.deviceId}`);
            console.warn(`   Employee: ${employee.firstName} ${employee.lastName}`);
          }
        } catch (forceError) {
          toast.dismiss(forceLoadingToast);
          console.error('❌ Force delete error:', forceError);
          toast.error(`Force delete failed: ${forceError.response?.data?.message || forceError.message}`);
        }
        } else {
          // Other errors
          console.error('❌ Error deleting employee:', error);
          toast.error(
            `Failed to delete employee\n\n${error.response?.data?.message || error.message}`,
            {
              duration: 5000,
            }
          );
        }
      }
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setModalOpen(false);
    setSelectedEmployee(null);
    if (shouldRefresh) {
      fetchEmployees();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800'
    };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Employee Management
          </h1>
          <p className="text-gray-600 mt-1">Manage your workforce and employee data</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleAddEmployee}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter Employees</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Search by name, ID, or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
            <select
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              value={filters.facility}
              onChange={(e) => setFilters({ ...filters, facility: e.target.value })}
            >
              <option value="">All Facilities</option>
              {facilities.map(facility => (
                <option key={facility._id} value={facility._id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table/Cards */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Employee ID</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Facility</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Department</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Shift</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{employee.employeeId}</td>
                    <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">{employee.email}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{employee.facility?.name || 'N/A'}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{employee.department}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {employee.shift?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={getStatusBadge(employee.status)}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEditEmployee(employee)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-lg font-medium text-gray-900">No employees found</p>
                      <p className="text-gray-500">Try adjusting your filters or add a new employee</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-4 space-y-4">
          {employees.length > 0 ? (
            employees.map((employee) => (
              <div key={employee._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">ID: {employee.employeeId}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditEmployee(employee)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium text-gray-900">{employee.email}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Facility:</span>
                    <span className="text-sm font-medium text-gray-900">{employee.facility?.name || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Department:</span>
                    <span className="text-sm font-medium text-gray-900">{employee.department}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Shift:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {employee.shift?.name || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={getStatusBadge(employee.status)}>
                      {employee.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-900">No employees found</p>
                <p className="text-gray-500">Try adjusting your filters or add a new employee</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <EmployeeModalWithJavaIntegration
          employee={selectedEmployee}
          facilities={facilities}
          shifts={shifts}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Employees;
