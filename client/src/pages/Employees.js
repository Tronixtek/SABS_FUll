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
      active: 'badge-success',
      inactive: 'badge-gray',
      suspended: 'badge-warning',
      terminated: 'badge-danger'
    };
    return `badge ${badges[status] || 'badge-gray'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Employees</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleAddEmployee}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search by name, ID, or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Facility</label>
            <select
              className="input"
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
            <label className="label">Status</label>
            <select
              className="input"
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

      {/* Employee Table */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Facility</th>
              <th>Department</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((employee) => (
                <tr key={employee._id}>
                  <td className="font-medium">{employee.employeeId}</td>
                  <td>
                    {employee.firstName} {employee.lastName}
                  </td>
                  <td className="text-gray-600">{employee.email}</td>
                  <td>{employee.facility?.name || 'N/A'}</td>
                  <td>{employee.department}</td>
                  <td>
                    <span className="badge badge-info">
                      {employee.shift?.name || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={getStatusBadge(employee.status)}>
                      {employee.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee)}
                        className="text-red-600 hover:text-red-800"
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
                <td colSpan="8" className="text-center text-gray-500 py-8">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
