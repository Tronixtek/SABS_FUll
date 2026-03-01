import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PlusIcon, PencilIcon, TrashIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import EmployeeModalWithJavaIntegration from '../components/EmployeeModalWithJavaIntegration';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    facility: '',
    status: ''
  });
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [devicePersons, setDevicePersons] = useState([]);
  const [fetchingFromDevice, setFetchingFromDevice] = useState(false);
  const [selectedFacilityForDevice, setSelectedFacilityForDevice] = useState('');
  const [includePhotos, setIncludePhotos] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.facility) params.append('facility', filters.facility);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', '9999'); // Request all employees for client-side pagination
      
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
  // Get filtered employees (already filtered by API based on filters state)
  const getFilteredEmployees = () => {
    return employees; // employees state already contains filtered results
  };  // Helper function to convert image URL to base64
  const getBase64Image = async (url) => {
    try {
      if (!url) return null;
      
      // If already base64, return as is
      if (url.startsWith('data:')) return url;
      
      // Construct full URL if relative
      const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
      
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  };

  // Export employees to PDF with photos
  const exportEmployeesToPDF = async () => {
    try {
      toast.loading('Generating PDF with photos...');
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const photoSize = 25;
      const rowHeight = 35;
      const colWidth = (pageWidth - 2 * margin) / 2;
      
      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Registry', pageWidth / 2, 20, { align: 'center' });
      
      // Add date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 27, { align: 'center' });
      
      let yPos = 40;
      let xPos = margin;
      let column = 0;
      
      // Get filtered employees
      const employeesToExport = getFilteredEmployees();
      
      for (let i = 0; i < employeesToExport.length; i++) {
        const employee = employeesToExport[i];
        
        // Check if we need a new page
        if (yPos + rowHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          xPos = margin;
          column = 0;
        }
        
        // Draw border
        doc.setDrawColor(200);
        doc.rect(xPos, yPos, colWidth - 5, rowHeight);
        
        // Add photo
        const photoX = xPos + 5;
        const photoY = yPos + 5;
        
        try {
          if (employee.profileImage) {
            const imgData = await getBase64Image(employee.profileImage);
            if (imgData) {
              doc.addImage(imgData, 'JPEG', photoX, photoY, photoSize, photoSize);
            } else {
              // Draw placeholder
              doc.setFillColor(220, 220, 220);
              doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'F');
              doc.setFontSize(8);
              doc.text('No Photo', photoX + photoSize / 2, photoY + photoSize / 2, { align: 'center' });
            }
          } else {
            // Draw placeholder
            doc.setFillColor(220, 220, 220);
            doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'F');
            doc.setFontSize(8);
            doc.text('No Photo', photoX + photoSize / 2, photoY + photoSize / 2, { align: 'center' });
          }
        } catch (err) {
          console.error('Error adding photo:', err);
          // Draw placeholder on error
          doc.setFillColor(220, 220, 220);
          doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'F');
        }
        
        // Add text info
        const textX = photoX + photoSize + 5;
        const textY = photoY + 5;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${employee.firstName} ${employee.lastName}`, textX, textY);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`ID: ${employee.employeeId || 'N/A'}`, textX, textY + 5);
        doc.text(`Staff ID: ${employee.staffId || 'N/A'}`, textX, textY + 10);
        doc.text(`Dept: ${employee.department || 'N/A'}`, textX, textY + 15);
        doc.text(`Status: ${employee.status || 'N/A'}`, textX, textY + 20);
        
        // Move to next position
        column++;
        if (column >= 2) {
          column = 0;
          xPos = margin;
          yPos += rowHeight + 5;
        } else {
          xPos += colWidth;
        }
      }
      
      // Add footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Total Employees: ${employeesToExport.length}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
      
      // Save the PDF
      doc.save(`Employee-Registry-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss();
      toast.success(`Successfully exported ${employeesToExport.length} employees with photos!`);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.dismiss();
      toast.error('Failed to export employees. Please try again.');
    }
  };

  // Fetch all persons from device
  const handleFetchFromDevice = async () => {
    if (!selectedFacilityForDevice) {
      toast.error('Please select a facility first');
      return;
    }

    const selectedFacility = facilities.find(f => f._id === selectedFacilityForDevice);
    if (!selectedFacility) {
      toast.error('Invalid facility selected');
      return;
    }

    // Use facility code as device key, secret defaults to 123456
    const deviceKey = selectedFacility.code?.toLowerCase();
    const deviceSecret = selectedFacility.configuration?.deviceSecret || '123456';

    if (!deviceKey) {
      toast.error('Facility code is missing');
      return;
    }

    setFetchingFromDevice(true);
    const loadingToast = toast.loading(
      includePhotos 
        ? 'Fetching registered persons with photos from device... This may take several minutes for large registries.' 
        : 'Fetching registered persons list... Checking photo availability for each person...'
    );

    try {
      const response = await axios.post(`${API_URL}/api/employees/device/get-all-persons`, {
        deviceKey: deviceKey,
        secret: deviceSecret,
        includePhotos: includePhotos
      }, {
        timeout: 900000 // 15 min timeout (checking hasPhoto status takes time)
      });

      toast.dismiss(loadingToast);

      if (response.data.success) {
        const { totalPersons, persons } = response.data.data;
        setDevicePersons(persons || []);
        setDeviceModalOpen(true);
        toast.success(`Found ${totalPersons} person(s) registered on device`);
      } else {
        toast.error(response.data.message || 'Failed to fetch persons from device');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Device fetch error:', error);
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error(`Request timed out after 15 minutes. Device has many persons - this may require more time. The Java service may still be processing. Please check logs or try again later.`);
      } else if (error.response?.status === 503) {
        toast.error('Java device service is unavailable. Please ensure it is running.');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to connect to device. Please check device connection.');
      }
    } finally {
      setFetchingFromDevice(false);
    }
  };

  // Export device persons to PDF (fetch photos from MongoDB)
  const handleExportDevicePersonsToPDF = async () => {
    if (devicePersons.length === 0) {
      toast.error('No data to export');
      return;
    }

    const loadingToast = toast.loading('Fetching photos from database and generating PDF...');

    try {
      const selectedFacility = facilities.find(f => f._id === selectedFacilityForDevice);
      const facilityName = selectedFacility ? selectedFacility.name : 'Device';

      // Fetch photos from MongoDB for persons with hasPhoto=true
      const employeeIds = devicePersons
        .filter(p => p.hasPhoto)
        .map(p => p.employeeId);

      let photoMap = {};
      
      if (employeeIds.length > 0) {
        toast.loading('Fetching photos from database...', { id: loadingToast });
        
        const photoResponse = await axios.post(`${API_URL}/api/employees/device/get-photos`, {
          employeeIds,
          facilityId: selectedFacilityForDevice
        });

        if (photoResponse.data.success) {
          photoMap = photoResponse.data.data.photoMap;
          console.log(`✅ Fetched ${Object.keys(photoMap).length} photos from MongoDB`);
        }
      }

      toast.loading('Generating PDF...', { id: loadingToast });

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const cardWidth = 60;
      const cardHeight = 70;
      const spacing = 5;
      const cardsPerRow = 3;
      const photoSize = 40;
      
      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Device Registry - ${facilityName}`, pageWidth / 2, 20, { align: 'center' });
      
      // Add metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 27, { align: 'center' });
      doc.text(`Total: ${devicePersons.length} | With Photos: ${Object.keys(photoMap).length}`, pageWidth / 2, 32, { align: 'center' });
      
      let yPos = 40;
      let xPos = margin;
      let cardCount = 0;

      devicePersons.forEach((person, index) => {
        // Calculate position
        const col = cardCount % cardsPerRow;
        const row = Math.floor(cardCount / cardsPerRow);
        
        xPos = margin + col * (cardWidth + spacing);
        yPos = 40 + row * (cardHeight + spacing);
        
        // Check if we need a new page
        if (yPos + cardHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          cardCount = 0;
          xPos = margin;
        }
        
        // Draw card border
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.rect(xPos, yPos, cardWidth, cardHeight);
        
        // Add photo
        const photoX = xPos + (cardWidth - photoSize) / 2;
        const photoY = yPos + 5;
        
        // Get photo from MongoDB photoMap
        const photoData = photoMap[person.employeeId];
        
        if (photoData && photoData.photo) {
          try {
            doc.addImage(photoData.photo, 'JPEG', photoX, photoY, photoSize, photoSize);
          } catch (err) {
            // If photo fails, draw placeholder
            doc.setFillColor(240, 240, 240);
            doc.rect(photoX, photoY, photoSize, photoSize, 'F');
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('No Photo', photoX + photoSize / 2, photoY + photoSize / 2, { align: 'center' });
          }
        } else {
          // Draw placeholder for no photo
          doc.setFillColor(240, 240, 240);
          doc.rect(photoX, photoY, photoSize, photoSize, 'F');
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('No Photo', photoX + photoSize / 2, photoY + photoSize / 2, { align: 'center' });
        }
        
        // Add name
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        const name = person.name || 'Unknown';
        const nameLines = doc.splitTextToSize(name, cardWidth - 4);
        doc.text(nameLines, xPos + cardWidth / 2, photoY + photoSize + 5, { align: 'center', maxWidth: cardWidth - 4 });
        
        // Add employee ID
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`ID: ${person.employeeId || 'N/A'}`, xPos + cardWidth / 2, photoY + photoSize + 12, { align: 'center' });
        
        cardCount++;
      });

      // Save the PDF
      const fileName = `device-registry-${facilityName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF exported successfully', { id: loadingToast });
    } catch (error) {
      console.error('PDF export error:', error);
      console.error('Error details:', error.message, error.stack);
      toast.error(`Failed to export PDF: ${error.message || 'Unknown error'}`, { id: loadingToast });
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

  const handleBulkSync = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select employees to sync');
      return;
    }

    if (!window.confirm(`Sync ${selectedEmployees.length} employee(s) to biometric device?\n\nThis will process them sequentially to avoid device conflicts.`)) {
      return;
    }

    setBulkSyncing(true);
    const API_URL = process.env.REACT_APP_API_URL || '';
    const loadingToast = toast.loading(`Syncing ${selectedEmployees.length} employees...`);

    try {
      const response = await axios.post(`${API_URL}/api/employees/bulk-sync`, {
        employeeIds: selectedEmployees
      });

      toast.dismiss(loadingToast);

      if (response.data.success) {
        const { successful, failed, skipped } = response.data.data;
        
        if (successful.length > 0) {
          toast.success(`✅ Successfully synced ${successful.length} employee(s)`, { duration: 5000 });
        }
        if (failed.length > 0) {
          toast.error(`❌ Failed to sync ${failed.length} employee(s)`, { duration: 5000 });
        }
        if (skipped.length > 0) {
          toast.info(`⚠️ Skipped ${skipped.length} employee(s)`, { duration: 5000 });
        }

        setSelectedEmployees([]);
        fetchEmployees();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'Bulk sync failed');
      console.error('Bulk sync error:', error);
    } finally {
      setBulkSyncing(false);
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleSelectAll = () => {
    const currentPageIds = currentEmployees.map(emp => emp._id);
    const allCurrentSelected = currentPageIds.every(id => selectedEmployees.includes(id));
    
    if (allCurrentSelected) {
      // Deselect all on current page
      setSelectedEmployees(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedEmployees(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const getSyncBadge = (employee) => {
    const status = employee.deviceSyncStatus || employee.biometricData?.syncStatus || 'pending';
    
    switch (status) {
      case 'synced':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'failed':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
      case 'syncing':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
    }
  };

  const getSyncText = (employee) => {
    const status = employee.deviceSyncStatus || employee.biometricData?.syncStatus || 'pending';
    
    switch (status) {
      case 'synced':
        return '✓ Synced';
      case 'failed':
        return '✗ Failed';
      case 'syncing':
        return '⟳ Syncing';
      default:
        return '⏳ Pending';
    }
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

  // Pagination calculations
  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = employees.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedEmployees([]); // Clear selections when changing pages
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
    setSelectedEmployees([]);
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
          {selectedEmployees.length > 0 && (
            <button
              onClick={handleBulkSync}
              disabled={bulkSyncing}
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkSyncing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing {selectedEmployees.length}...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync ({selectedEmployees.length})
                </>
              )}
            </button>
          )}
          <button
            onClick={exportEmployeesToPDF}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Export with Photos
          </button>
          <button
            onClick={() => {
              setDeviceModalOpen(true);
              setDevicePersons([]);
              setSelectedFacilityForDevice('');
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Device Registry
          </button>
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
              placeholder="Search by name, Staff ID, Device ID, or email..."
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
                <th className="py-4 px-6">
                  <input
                    type="checkbox"
                    checked={currentEmployees.length > 0 && currentEmployees.every(emp => selectedEmployees.includes(emp._id))}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Employee ID</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Staff ID</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Facility</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Department</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Shift</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Device Sync</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentEmployees.length > 0 ? (
                currentEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee._id)}
                        onChange={() => toggleEmployeeSelection(employee._id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{employee.employeeId}</td>
                    <td className="py-4 px-6 text-sm font-semibold text-blue-700">{employee.staffId || 'N/A'}</td>
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
                      <span className={getSyncBadge(employee)}>
                        {getSyncText(employee)}
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
                  <td colSpan="11" className="py-12 text-center text-gray-500">
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
          {currentEmployees.length > 0 ? (
            currentEmployees.map((employee) => (
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

        {/* Pagination */}
        {employees.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Items per page */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">
                  of {employees.length} employees
                </span>
              </div>

              {/* Page info and navigation */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  <div className="hidden sm:flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <EmployeeModalWithJavaIntegration
          employee={selectedEmployee}
          facilities={facilities}
          shifts={shifts}
          onClose={handleModalClose}
        />
      )}

      {/* Device Registry Modal */}
      {deviceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Device Registry</h2>
                <p className="text-green-100 text-sm">View all persons registered on biometric device</p>
              </div>
              <button
                onClick={() => {
                  setDeviceModalOpen(false);
                  setDevicePersons([]);
                  setSelectedFacilityForDevice('');
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Facility Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Facility with Smart Device
                </label>
                <div className="flex gap-3">
                  <select
                    value={selectedFacilityForDevice}
                    onChange={(e) => setSelectedFacilityForDevice(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">-- Select Facility --</option>
                    {facilities
                      .filter(f => f.configuration?.integrationType === 'java-xo5')
                      .map(facility => (
                        <option key={facility._id} value={facility._id}>
                          {facility.name} ({facility.code})
                        </option>
                      ))
                    }
                  </select>
                  <button
                    onClick={handleFetchFromDevice}
                    disabled={!selectedFacilityForDevice || fetchingFromDevice}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                  >
                    {fetchingFromDevice ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Fetching...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Fetch from Device
                      </>
                    )}
                  </button>
                </div>
                
                {/* Include Photos Checkbox */}
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePhotos}
                      onChange={(e) => setIncludePhotos(e.target.checked)}
                      disabled={fetchingFromDevice}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50"
                    />
                    <span>Fetch photos from device (slower, use only if photos not in database)</span>
                  </label>
                  <p className="ml-6 mt-1 text-xs text-gray-500">
                    💡 Tip: Leave unchecked for fast loading. Photos will be fetched from database when exporting to PDF.
                  </p>
                </div>
                
                {facilities.filter(f => f.configuration?.integrationType === 'java-xo5').length === 0 && (
                  <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    ℹ️ No facilities with smart device configuration found. Please configure a facility with integration type "Smart Device (Full Management)".
                  </p>
                )}
              </div>

              {/* Results */}
              {devicePersons.length > 0 ? (
                <div>
                  <div className="mb-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Found {devicePersons.length} Person(s)
                      </h3>
                      <span className="text-sm text-gray-600">
                        {devicePersons.filter(p => p.hasPhoto).length} with photos
                      </span>
                    </div>
                    <button
                      onClick={handleExportDevicePersonsToPDF}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 text-sm"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export to PDF
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devicePersons.map((person, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                      >
                        <div className="flex items-start gap-3">
                          {/* Photo */}
                          <div className="flex-shrink-0">
                            {person.photo ? (
                              <img
                                src={person.photo}
                                alt={person.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-green-500"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center"
                              style={{ display: person.photo ? 'none' : 'flex' }}
                            >
                              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {person.name || 'Unknown'}
                            </h4>
                            <p className="text-sm text-gray-600 mt-0.5">
                              ID: <span className="font-mono text-xs">{person.employeeId}</span>
                            </p>
                            {person.department && (
                              <p className="text-xs text-gray-500 mt-1">
                                {person.department}
                              </p>
                            )}
                            <div className="mt-2">
                              {person.hasPhoto ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Has Photo
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  No Photo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-24 w-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Data Yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Select a facility and click "Fetch from Device" to view registered persons
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
