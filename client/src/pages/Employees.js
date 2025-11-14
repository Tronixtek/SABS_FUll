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
    // Show detailed confirmation dialog
    const confirmDelete = window.confirm(
      `⚠️ DELETE EMPLOYEE\n\n` +
      `Employee: ${employee.firstName} ${employee.lastName}\n` +
      `Employee ID: ${employee.employeeId}\n` +
      `Device ID: ${employee.deviceId || 'Not set'}\n\n` +
      `This will:\n` +
      `✓ Delete employee from the biometric device\n` +
      `✓ Delete employee from the database\n` +
      `✓ Preserve attendance records for reports\n\n` +
      `⚠️ THIS ACTION CANNOT BE UNDONE!\n\n` +
      `Are you absolutely sure?`
    );

    if (!confirmDelete) return;

    const loadingToast = toast.loading('Deleting employee from device...');

    try {
      // ✅ STEP 1: Try device-first delete
      console.log(`🗑️ Attempting to delete employee ${employee.firstName} ${employee.lastName}`);
      
      const response = await axios.delete(`/api/employees/${employee._id}`);
      const data = response.data;

      toast.dismiss(loadingToast);
      
      if (data.success) {
        // ✅ SUCCESS: Deleted from both device and database
        if (data.deletedFrom === 'device-and-database') {
          toast.success(
            `✅ Employee deleted successfully!\n\n` +
            `Deleted from: Device & Database\n` +
            `Attendance records: ${data.attendanceRecordsPreserved} preserved`,
            {
              duration: 5000,
              icon: '✅',
            }
          );
          console.log(`✅ Employee fully deleted from both device and database`);
        } else if (data.deletedFrom === 'database-only') {
          toast.success('Employee deleted from database', {
            duration: 4000,
          });
          toast.info('No device configured for this facility', {
            duration: 3000,
          });
          console.log(`ℹ️ Employee deleted from database (no device configured)`);
        }
        
        // Refresh employee list
        fetchEmployees();
        
        // Log success
        console.log(`✅ Employee removed from UI`);
        console.log(`   Employee: ${data.employeeName}`);
        console.log(`   Attendance records preserved: ${data.attendanceRecordsPreserved}`);
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      
      // Check if device is unreachable or error occurred
      if (error.response && error.response.data?.requiresConfirmation) {
        const data = error.response.data;
        
        // Show specific error message based on error type
        let errorMessage = '';
        let detailMessage = '';
        
        switch (data.error) {
          case 'DEVICE_TIMEOUT':
            errorMessage = '⏱️ Device Request Timed Out';
            detailMessage = 'The biometric device is not responding. It may be offline or experiencing network issues.';
            break;
          case 'DEVICE_UNREACHABLE':
            errorMessage = '🔌 Device Unreachable';
            detailMessage = 'Cannot connect to the biometric device. Please check if the device is online and the URL is correct.';
            break;
          case 'DEVICE_ERROR':
            errorMessage = '❌ Device Error';
            detailMessage = data.message || 'The device returned an error while trying to delete the employee.';
            break;
          default:
            errorMessage = '⚠️ Device Deletion Failed';
            detailMessage = data.message;
        }
        
        // Ask user if they want to force delete
        const forceDelete = window.confirm(
          `${errorMessage}\n\n` +
          `${detailMessage}\n\n` +
          `⚠️ WARNING: The employee may still exist on the device!\n\n` +
          `What would you like to do?\n\n` +
          `• Click OK to delete from database anyway (you'll need to manually remove from device later)\n` +
          `• Click Cancel to abort the deletion and check device connection\n\n` +
          `Proceed with database-only deletion?`
        );

        if (!forceDelete) {
          toast.info('Deletion cancelled. Please check device connection.', {
            duration: 4000,
          });
          return;
        }

        // ✅ STEP 2: Force delete from database only
        console.log(`⚠️ Force deleting from database only...`);
        const forceLoadingToast = toast.loading('Deleting from database only...');
        
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
