import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { XMarkIcon, CameraIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const EmployeeModalWithJavaIntegration = ({ employee, facilities, shifts, onClose }) => {
  const [formData, setFormData] = useState({
    employeeId: employee?.employeeId || '',
    staffId: employee?.staffId || '',
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    facility: employee?.facility?._id || '',
    department: employee?.department || '',
    designation: employee?.designation || '',
    cadre: employee?.cadre || '',
    shift: employee?.shift?._id || '',
    joiningDate: employee?.joiningDate ? employee.joiningDate.split('T')[0] : '',
    dateOfBirth: employee?.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
    nationality: employee?.nationality || '',
    nationalId: employee?.nationalId || '',
    gender: employee?.gender || '',
    education: employee?.education || '',
    bloodGroup: employee?.bloodGroup || '',
    allergies: employee?.allergies || '',
    customAllergy: employee?.allergies && !['None', 'Penicillin Allergy', 'Latex Allergy', 'Food Allergies', 'Asthma', 'Diabetes', 'Hypertension', 'Epilepsy', 'Sickle Cell Disease'].includes(employee?.allergies) ? employee?.allergies : '',
    address: {
      street: employee?.address?.street || '',
      city: employee?.address?.city || '',
      state: employee?.address?.state || '',
      zipCode: employee?.address?.zipCode || '',
      country: employee?.address?.country || ''
    },
    status: employee?.status || 'active'
  });
  
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(employee?.profileImage || null);
  const [stream, setStream] = useState(null);
  const [cadreSearch, setCadreSearch] = useState(employee?.cadre || '');
  const [showCadreDropdown, setShowCadreDropdown] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState(employee?.department || '');
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [designationSearch, setDesignationSearch] = useState(employee?.designation || '');
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState({
    deviceSync: null,    // null, 'loading', 'success', 'error'
    databaseSave: null,  // null, 'loading', 'success', 'error'
    message: ''
  });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cadreDropdownRef = useRef(null);
  const departmentDropdownRef = useRef(null);
  const designationDropdownRef = useRef(null);

  // Comprehensive cadre list for both facility and board levels
  const allCadres = [
    // FACILITY LEVEL CADRES
    'Community Health Officer (CHO)',
    'Community Health Extension Worker (CHEW)',
    'Junior Community Health Extension Worker (JCHEW)',
    'Registered Nurse',
    'Enrolled Nurse',
    'Midwife',
    'Nurse/Midwife Assistant',
    'Medical Officer',
    'Medical Officer of Health (MOH)',
    'Laboratory Scientist',
    'Laboratory Technician',
    'Laboratory Assistant',
    'Pharmacist',
    'Pharmacy Technician',
    'Pharmacy Assistant',
    'Environmental Health Officer (EHO)',
    'Health Assistant (Environmental)',
    'Health Records Officer',
    'Health Information Manager',
    'Records Assistant',
    'Health Educator',
    'Community Health Promoter',
    'Administrative Officer',
    'Secretary/Clerical Officer',
    'Accountant',
    'Accounts Clerk',
    'Driver',
    'Cleaner',
    'Security Guard',
    'Ward Attendant/Orderly',
    'Gateman',
    'Gardener',
    
    // BOARD LEVEL CADRES
    'Executive Secretary/Executive Director',
    'Director',
    'Deputy Director',
    'Assistant Director',
    'Principal Administrative Officer',
    'Senior Administrative Officer',
    'Administrative Officer I',
    'Administrative Officer II',
    'Assistant Administrative Officer',
    'Executive Assistant',
    'Director of Finance & Accounts',
    'Principal Accountant',
    'Senior Accountant',
    'Accountant I',
    'Accountant II',
    'Accounts Assistant',
    'Cashier',
    'Director of Planning, Research & Statistics',
    'Principal Planning Officer',
    'Senior Planning Officer',
    'Planning Officer I',
    'Planning Officer II',
    'Statistician',
    'Data Analyst',
    'M&E Officer (Monitoring & Evaluation)',
    'Director of Medical Services',
    'Consultant Physician',
    'Principal Medical Officer',
    'Senior Medical Officer',
    'Medical Officer I',
    'Medical Officer II',
    'Director of Nursing Services',
    'Assistant Director of Nursing',
    'Principal Nursing Officer',
    'Senior Nursing Officer',
    'Nursing Officer I',
    'Nursing Officer II',
    'Director of Public Health',
    'Principal Public Health Officer',
    'Senior Public Health Officer',
    'Disease Surveillance & Notification Officer (DSNO)',
    'Epidemiologist',
    'Health Promotion Officer',
    'Director of Pharmaceutical Services',
    'Principal Pharmacist',
    'Senior Pharmacist',
    'Pharmacist I',
    'Pharmacist II',
    'Director of Laboratory Services',
    'Principal Laboratory Scientist',
    'Senior Laboratory Scientist',
    'Laboratory Scientist I',
    'Laboratory Scientist II',
    'Director of PHC Services',
    'PHC Coordinator (LGA)',
    'CHEW Supervisor',
    'Director of Procurement/Supplies',
    'Principal Procurement Officer',
    'Senior Procurement Officer',
    'Store Officer',
    'Supply Chain Officer',
    'Director of ICT/Health Information',
    'Principal ICT Officer',
    'Senior ICT Officer',
    'Database Administrator',
    'System Analyst',
    'Director of Human Resources',
    'Principal HR Officer',
    'Senior HR Officer',
    'HR Officer I',
    'HR Officer II',
    'Training Officer',
    'Director of Legal Services',
    'Principal Legal Officer',
    'Legal Officer I',
    'Legal Officer II',
    'Director of Internal Audit',
    'Principal Auditor',
    'Senior Auditor',
    'Internal Auditor',
    'Director of Public Relations',
    'Public Relations Officer',
    'Information Officer',
    'Director of Works/Engineering',
    'Civil Engineer',
    'Electrical Engineer',
    'Mechanical Engineer',
    'Technician',
    'Artisan',
    'Protocol Officer',
    'Messenger/Dispatch Rider'
  ];

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
        toast.error('Failed to start video preview');
      });
    }
  }, [showCamera, stream]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cadreDropdownRef.current && !cadreDropdownRef.current.contains(event.target)) {
        setShowCadreDropdown(false);
      }
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
        setShowDepartmentDropdown(false);
      }
      if (designationDropdownRef.current && !designationDropdownRef.current.contains(event.target)) {
        setShowDesignationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Auto-generate employee ID when facility is selected
    if (e.target.name === 'facility' && e.target.value && !employee) {
      generateEmployeeId(e.target.value);
    }
  };

  const handleCadreSelect = (cadre) => {
    setFormData({ ...formData, cadre });
    setCadreSearch(cadre);
    setShowCadreDropdown(false);
  };

  const handleDepartmentSelect = (department) => {
    setFormData({ ...formData, department });
    setDepartmentSearch(department);
    setShowDepartmentDropdown(false);
  };

  const handleDesignationSelect = (designation) => {
    setFormData({ ...formData, designation });
    setDesignationSearch(designation);
    setShowDesignationDropdown(false);
  };

  const filteredCadres = allCadres.filter(cadre =>
    cadre.toLowerCase().includes(cadreSearch.toLowerCase())
  );

  // Get departments for selected facility
  const getDepartments = () => {
    if (!formData.facility) return [];
    const facility = facilities.find(f => f._id === formData.facility);
    const departments = facility?.departments || [];
    if (departments.length === 0) {
      return [
        'General Outpatient',
        'Maternal & Child Health',
        'Immunization',
        'Laboratory Services',
        'Pharmacy',
        'Emergency Services',
        'Environmental Health',
        'Health Education',
        'Medical Records',
        'Administration'
      ];
    }
    return departments;
  };

  const filteredDepartments = getDepartments().filter(dept =>
    dept.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  // Get designations for selected facility
  const getDesignations = () => {
    if (!formData.facility) return [];
    const facility = facilities.find(f => f._id === formData.facility);
    const designations = facility?.designations || [];
    if (designations.length === 0) {
      return [
        'Medical Officer',
        'Nurse',
        'Midwife',
        'Community Health Officer (CHO)',
        'Community Health Extension Worker (CHEW)',
        'Laboratory Technician',
        'Pharmacist',
        'Pharmacy Technician',
        'Health Records Officer',
        'Environmental Health Officer',
        'Health Educator',
        'Ward Attendant',
        'Security Officer',
        'Administrative Officer',
        'Cleaner',
        'Driver'
      ];
    }
    return designations;
  };

  const filteredDesignations = getDesignations().filter(desig =>
    desig.toLowerCase().includes(designationSearch.toLowerCase())
  );

  const generateEmployeeId = async (facilityId) => {
    try {
      const response = await axios.get(`/api/employees/generate-id/${facilityId}`);
      if (response.data.success) {
        setFormData(prev => ({ ...prev, employeeId: response.data.data.employeeId }));
        toast.success(`Employee ID generated: ${response.data.data.employeeId}`);
      }
    } catch (error) {
      console.error('Failed to generate employee ID:', error);
      toast.error('Failed to generate employee ID');
    }
  };

  const startCamera = async () => {
    setCameraLoading(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      toast.success('Camera started successfully');
    } catch (error) {
      console.error('Camera error:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Camera access denied. Please allow camera permissions in your browser.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No camera found on your device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Camera is already in use by another application.');
      } else {
        toast.error('Failed to access camera. Please try again.');
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready. Please try again.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set optimal canvas size for XO5 device (higher resolution for better face detection)
    const targetWidth = 640;  // Optimal resolution for XO5 
    const targetHeight = 480; // 4:3 aspect ratio standard
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw and scale video frame to optimal size for XO5
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, targetWidth, targetHeight);

    // Apply image enhancement for better face detection
    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;
    
    // Enhance contrast and brightness for better XO5 recognition
    for (let i = 0; i < data.length; i += 4) {
      // Slight contrast and brightness boost
      data[i] = Math.min(255, Math.max(0, data[i] * 1.05 + 5));     // Red
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * 1.05 + 5)); // Green  
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * 1.05 + 5)); // Blue
    }
    context.putImageData(imageData, 0, 0);

    // Convert canvas to high-quality data URL for XO5 device
    // Using high quality (0.95) for better XO5 compatibility 
    const dataURL = canvas.toDataURL('image/jpeg', 0.95);
    
    // Validate image size
    const imageSizeKB = Math.round((dataURL.length * 3/4) / 1024);
    console.log(`Captured image: ${targetWidth}x${targetHeight}, ${imageSizeKB}KB`);
    
    if (imageSizeKB < 30) {
      toast.error('Image quality too low for device recognition. Please ensure good lighting.');
      return;
    }
    setCapturedImage(dataURL);
    stopCamera();
    toast.success('Face photo captured successfully!');
  };

  const retakeImage = () => {
    setCapturedImage(null);
    setRegistrationStatus({ deviceSync: null, databaseSave: null, message: '' });
    startCamera();
  };

  /**
   * Enhanced Employee Registration Flow
   * 1. Validate form data
   * 2. Send to MERN backend with device-first approach
   * 3. Backend calls Java service for XO5 enrollment
   * 4. If device enrollment succeeds, save to database
   * 5. Return comprehensive response with status
   */
  const registerEmployeeWithEnhancedFlow = async (employeeData, faceImage) => {
    try {
      // Reset status
      setRegistrationStatus({ 
        deviceSync: 'loading', 
        databaseSave: null, 
        message: 'Starting employee registration...' 
      });

      console.log('🚀 Starting enhanced employee registration flow...');
      
      // Prepare registration payload
      const registrationPayload = {
        ...employeeData,
        faceImage: faceImage,
        profileImage: capturedImage
      };

      console.log('� Sending registration request to MERN backend...');
      
      // Call the enhanced registration endpoint
      const response = await axios.post('/api/employees/register', registrationPayload);
      
      console.log('📨 Registration response:', response.data);

      if (response.data.success) {
        const { steps } = response.data.data;
        
        // Update status to show successful device enrollment
        if (steps.deviceEnrollment === 'completed') {
          setRegistrationStatus(prev => ({ 
            ...prev, 
            deviceSync: 'success', 
            databaseSave: 'loading',
            message: 'Device enrollment successful, saving to database...' 
          }));

          // Update status to show successful database save
          if (steps.databaseSave === 'completed') {
            setRegistrationStatus(prev => ({ 
              ...prev, 
              databaseSave: 'success',
              message: '✅ Employee registration completed successfully!' 
            }));
            
            // Display generated PIN if available
            if (response.data.data.selfServiceCredentials) {
              const credentials = response.data.data.selfServiceCredentials;
              const employee = response.data.data.employee;
              
              // Show PIN in an alert with copy functionality
              const pinMessage = 
                `✅ EMPLOYEE CREATED SUCCESSFULLY!\n\n` +
                `Employee: ${employee.firstName} ${employee.lastName}\n` +
                `Employee ID: ${employee.employeeId}\n` +
                `Staff ID: ${credentials.staffId}\n\n` +
                `🔑 SELF-SERVICE PORTAL CREDENTIALS:\n` +
                `Staff ID: ${credentials.staffId}\n` +
                `PIN: ${credentials.pin}\n\n` +
                `⚠️ IMPORTANT:\n` +
                `• This PIN will only be shown ONCE\n` +
                `• Please save it securely\n` +
                `• Give this PIN to the employee\n` +
                `• Employee will be required to change PIN on first login\n\n` +
                `Employee Portal: ${window.location.origin}/employee-login`;
              
              alert(pinMessage);
              
              // Also show a success toast
              toast.success(
                `Employee created! PIN: ${credentials.pin} (shown in alert)`, 
                { duration: 10000 }
              );
            } else {
              toast.success('Employee registered successfully!', { duration: 4000 });
            }
            
            return { success: true, data: response.data };
          }
        }
        
        // If we reach here, something went wrong with the steps
        throw new Error('Registration completed but steps verification failed');
        
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }

    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // Parse error response for detailed feedback
      const errorData = error.response?.data || {};
      const step = errorData.step || 'unknown';
      const message = errorData.message || error.message || 'Registration failed';
      
      // Update status based on which step failed
      if (step === 'device_enrollment') {
        setRegistrationStatus(prev => ({ 
          ...prev, 
          deviceSync: 'error',
          message: `Device enrollment failed: ${message}` 
        }));
        
        if (errorData.error === 'SERVICE_UNAVAILABLE') {
          toast.error('Device service is unavailable. Please check the service status.');
        } else if (errorData.error === 'TIMEOUT') {
          if (errorData.possibleSuccess) {
            toast.error(
              `⏱️ Device enrollment timed out!\n\n` +
              `The employee may have been successfully enrolled on the device.\n` +
              `Please check the device and try again if needed.\n\n` +
              `Employee ID: ${errorData.employeeId || 'N/A'}`,
              { duration: 8000 }
            );
          } else {
            toast.error('Device enrollment timed out. Please check device connectivity.');
          }
        } else {
          toast.error(`Device enrollment error: ${errorData.deviceError || message}`);
        }
        
      } else if (step === 'database_save') {
        setRegistrationStatus(prev => ({ 
          ...prev, 
          deviceSync: 'success',
          databaseSave: 'error',
          message: `Database save failed: ${message}` 
        }));
        
        toast.error('Device enrollment succeeded but database save failed. Contact administrator.');
        
      } else {
        // Validation or unknown errors
        setRegistrationStatus(prev => ({ 
          ...prev, 
          deviceSync: 'error',
          message: `Registration failed: ${message}` 
        }));
        
        if (error.response?.status === 409) {
          toast.error('Employee already exists with this email or employee ID.');
        } else if (error.response?.status === 400) {
          toast.error(`Validation error: ${message}`);
        } else {
          toast.error(`Registration failed: ${message}`);
        }
      }
      
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.employeeId.trim()) {
      toast.error('Employee ID is required');
      return;
    }
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    
    if (!formData.facility) {
      toast.error('Please select a facility');
      return;
    }
    
    if (!formData.shift) {
      toast.error('Please select a shift');
      return;
    }

    // Check if facility supports smart integration for new employees
    if (!employee) {
      const selectedFacility = facilities.find(f => f._id === formData.facility);
      
      if (!selectedFacility) {
        toast.error('Selected facility not found');
        return;
      }
      
      if (selectedFacility.configuration?.integrationType !== 'java-xo5') {
        toast.error(
          `Facility "${selectedFacility.name}" does not support smart device integration. ` +
          `Please select a facility with smart integration or contact your administrator.`
        );
        return;
      }
    }
    
    // Validate face capture for new employees
    if (!employee && !capturedImage) {
      toast.error('Please capture a face photo before submitting');
      return;
    }

    setLoading(true);

    try {
      if (employee) {
        // EDITING existing employee - use traditional update method
        console.log('📝 Updating existing employee...');
        
        const updatePayload = { ...formData };
        
        // Handle custom allergy if "Other" is selected
        if (formData.allergies === 'Other' && formData.customAllergy) {
          updatePayload.allergies = formData.customAllergy;
        }
        
        if (capturedImage) {
          updatePayload.profileImage = capturedImage;
        }
        
        const response = await axios.put(`/api/employees/${employee._id}`, updatePayload);
        
        if (response.data.success) {
          toast.success('Employee updated successfully');
          onClose(true);
        } else {
          toast.error(response.data.message || 'Update failed');
        }
        
      } else {
        // NEW employee registration with enhanced device-first flow
        console.log('🚀 Starting enhanced employee registration...');
        
        // Prepare form data with custom allergy if "Other" is selected
        const submissionData = { ...formData };
        if (formData.allergies === 'Other' && formData.customAllergy) {
          submissionData.allergies = formData.customAllergy;
        }
        
        await registerEmployeeWithEnhancedFlow(submissionData, capturedImage);
        
        // If we get here, registration was successful
        setTimeout(() => {
          onClose(true);
        }, 2000); // Give user time to see success message
      }
      
    } catch (error) {
      console.error('❌ Submit error:', error);
      // Error handling is done in registerEmployeeWithEnhancedFlow for new employees
      
      if (employee) {
        // Handle update errors
        const message = error.response?.data?.message || error.message || 'Update failed';
        toast.error(`Failed to update employee: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Status indicator component
   */
  const RegistrationStatus = () => {
    if (registrationStatus.deviceSync === null) return null;
    
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Registration Status</h4>
        
        {/* Device Sync Status */}
        <div className="flex items-center mb-2">
          {registrationStatus.deviceSync === 'loading' && (
            <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin mr-2" />
          )}
          {registrationStatus.deviceSync === 'success' && (
            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
          )}
          {registrationStatus.deviceSync === 'error' && (
            <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
          )}
          <span className="text-sm text-gray-700">Device Registration</span>
        </div>
        
        {/* Database Save Status */}
        {registrationStatus.databaseSave !== null && (
          <div className="flex items-center mb-2">
            {registrationStatus.databaseSave === 'loading' && (
              <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin mr-2" />
            )}
            {registrationStatus.databaseSave === 'success' && (
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
            )}
            {registrationStatus.databaseSave === 'error' && (
              <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />
            )}
            <span className="text-sm text-gray-700">Database Save</span>
          </div>
        )}
        
        {/* Status Message */}
        {registrationStatus.message && (
          <p className="text-xs text-gray-600 mt-2 italic">
            {registrationStatus.message}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-900">
            {employee ? 'Edit Employee' : 'Register New Employee'}
          </h3>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Information Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Device ID (System) *
                    {!employee && <span className="text-xs text-gray-500 ml-1">(Auto-generated)</span>}
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    required
                    readOnly={!employee}
                    className={`mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!employee ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder={!employee ? "Select facility to generate" : "e.g., EMP001"}
                  />
                  <p className="mt-1 text-xs text-gray-500">For biometric device only</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Staff ID / Card Number *
                  </label>
                  <div className="mt-1 flex">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                      KNLG
                    </span>
                    <input
                      type="text"
                      name="staffId"
                      value={formData.staffId.replace(/^KNLG/, '')}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // Only allow numbers
                        setFormData({ ...formData, staffId: `KNLG${value}` });
                      }}
                      required
                      className="flex-1 block w-full border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="001"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Highest Educational Qualification</label>
                  <select
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Education Level</option>
                    <option value="Primary School Leaving Certificate">Primary School Leaving Certificate</option>
                    <option value="SSCE/WAEC/NECO">SSCE/WAEC/NECO</option>
                    <option value="OND">OND (Ordinary National Diploma)</option>
                    <option value="NCE">NCE (National Certificate in Education)</option>
                    <option value="HND">HND (Higher National Diploma)</option>
                    <option value="B.Sc/B.A/B.Eng">B.Sc/B.A/B.Eng (Bachelor's Degree)</option>
                    <option value="M.Sc/M.A/MBA">M.Sc/M.A/MBA (Master's Degree)</option>
                    <option value="PhD/Doctorate">PhD/Doctorate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Allergies / Medical Conditions</label>
                  <select
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Allergy/Medical Condition</option>
                    <option value="None">None</option>
                    <option value="Penicillin Allergy">Penicillin Allergy</option>
                    <option value="Latex Allergy">Latex Allergy</option>
                    <option value="Food Allergies">Food Allergies (Nuts, Eggs, etc.)</option>
                    <option value="Asthma">Asthma</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Hypertension">Hypertension (High Blood Pressure)</option>
                    <option value="Epilepsy">Epilepsy</option>
                    <option value="Sickle Cell Disease">Sickle Cell Disease</option>
                    <option value="Other">Other (Please Specify)</option>
                  </select>
                </div>
                
                {formData.allergies === 'Other' && (
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Please Specify Allergy/Medical Condition</label>
                    <textarea
                      name="customAllergy"
                      value={formData.customAllergy}
                      onChange={handleChange}
                      rows="2"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Please describe the allergy or medical condition..."
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Address Information Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Address Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Street Address</label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Kano"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Kano State"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Zip Code</label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="700001"
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nigeria"
                  />
                </div>
              </div>
            </div>

            {/* Work Information Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Work Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department/Service Unit</label>
                  <div className="relative" ref={departmentDropdownRef}>
                    <input
                      type="text"
                      value={departmentSearch}
                      onChange={(e) => {
                        setDepartmentSearch(e.target.value);
                        setShowDepartmentDropdown(true);
                      }}
                      onFocus={() => setShowDepartmentDropdown(true)}
                      placeholder="Search department..."
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.department && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    {showDepartmentDropdown && filteredDepartments.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredDepartments.map((dept, index) => (
                          <div
                            key={index}
                            onClick={() => handleDepartmentSelect(dept)}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                              formData.department === dept ? 'bg-blue-100' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-900">{dept}</span>
                              {formData.department === dept && (
                                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {showDepartmentDropdown && departmentSearch && filteredDepartments.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-3">
                        <p className="text-sm text-gray-500">No departments found matching "{departmentSearch}"</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Designation/Rank</label>
                  <div className="relative" ref={designationDropdownRef}>
                    <input
                      type="text"
                      value={designationSearch}
                      onChange={(e) => {
                        setDesignationSearch(e.target.value);
                        setShowDesignationDropdown(true);
                      }}
                      onFocus={() => setShowDesignationDropdown(true)}
                      placeholder="Search designation..."
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.designation && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    {showDesignationDropdown && filteredDesignations.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredDesignations.map((desig, index) => (
                          <div
                            key={index}
                            onClick={() => handleDesignationSelect(desig)}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                              formData.designation === desig ? 'bg-blue-100' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-900">{desig}</span>
                              {formData.designation === desig && (
                                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {showDesignationDropdown && designationSearch && filteredDesignations.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-3">
                        <p className="text-sm text-gray-500">No designations found matching "{designationSearch}"</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cadre</label>
                  <div className="relative" ref={cadreDropdownRef}>
                    <input
                      type="text"
                      value={cadreSearch}
                      onChange={(e) => {
                        setCadreSearch(e.target.value);
                        setShowCadreDropdown(true);
                      }}
                      onFocus={() => setShowCadreDropdown(true)}
                      placeholder="Search cadre..."
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.cadre && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    {showCadreDropdown && filteredCadres.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredCadres.map((cadre, index) => (
                          <div
                            key={index}
                            onClick={() => handleCadreSelect(cadre)}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                              formData.cadre === cadre ? 'bg-blue-100' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-900">{cadre}</span>
                              {formData.cadre === cadre && (
                                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {showCadreDropdown && cadreSearch && filteredCadres.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-3">
                        <p className="text-sm text-gray-500">No cadres found matching "{cadreSearch}"</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Facility *
                    {formData.facility && (
                      <span className="ml-2 text-xs text-blue-600">
                        {(() => {
                          const facility = facilities.find(f => f._id === formData.facility);
                          const integrationType = facility?.configuration?.integrationType;
                          return integrationType === 'java-xo5' ? '(Smart Device ✓)' : '(Standard Device)';
                        })()}
                      </span>
                    )}
                  </label>
                  <select
                    name="facility"
                    value={formData.facility}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Facility</option>
                    {facilities.map(facility => (
                      <option key={facility._id} value={facility._id}>
                        {facility.name} ({facility.code}) 
                        {facility.configuration?.integrationType === 'java-xo5' ? ' - Smart Device' : ' - Standard'}
                      </option>
                    ))}
                  </select>
                  {formData.facility && (() => {
                    const facility = facilities.find(f => f._id === formData.facility);
                    return facility?.configuration?.integrationType !== 'java-xo5' && (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠️ This facility uses standard device integration. Smart registration may not be available.
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Shift *</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Shift</option>
                    {shifts.map(shift => (
                      <option key={shift._id} value={shift._id}>
                        {shift.name} ({shift.startTime} - {shift.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Joining Date</label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Biometric Registration Section */}
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  Biometric Registration {!employee && <span className="text-red-500">*</span>}
                </h4>
                <div className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                  Face Recognition
                </div>
              </div>
              
              {!capturedImage ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Instructions */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-gray-900 mb-2">Photo Guidelines</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Look directly at the camera</li>
                        <li>• Ensure good lighting</li>
                        <li>• Remove glasses if possible</li>
                        <li>• Keep a neutral expression</li>
                        <li>• Make sure face is clearly visible</li>
                      </ul>
                    </div>
                    
                    {!showCamera && (
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={cameraLoading}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-md disabled:opacity-50 flex items-center justify-center"
                      >
                        {cameraLoading ? (
                          <>
                            <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                            Starting Camera...
                          </>
                        ) : (
                          <>
                            <CameraIcon className="h-5 w-5 mr-2" />
                            Start Camera
                          </>
                        )}
                      </button>
                    )}

                    {/* Registration Status */}
                    <RegistrationStatus />
                  </div>
                  
                  {/* Camera Feed */}
                  {showCamera && (
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-80 object-cover"
                        />
                        {/* Face guide overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-60 border-2 border-white rounded-lg opacity-50">
                            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                          Position your face within the frame
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={captureImage}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium"
                        >
                          Capture Photo
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center text-green-700 mb-2">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        <span className="font-medium">Photo Captured Successfully</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Your biometric photo has been captured and is ready for device enrollment.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={retakeImage}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                    >
                      Retake Photo
                    </button>

                    {/* Registration Status */}
                    <RegistrationStatus />
                  </div>
                  
                  <div>
                    <div className="relative">
                      <img
                        src={capturedImage}
                        alt="Employee"
                        className="w-full h-80 object-cover rounded-lg shadow-lg border-4 border-green-200"
                      />
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                        ✓ Captured
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || registrationStatus.deviceSync === 'loading'}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                    {employee ? 'Updating...' : 'Registering...'}
                  </div>
                ) : (
                  employee ? 'Update Employee' : 'Register Employee'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default EmployeeModalWithJavaIntegration;