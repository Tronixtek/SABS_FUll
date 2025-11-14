import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { XMarkIcon, CameraIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const EmployeeModalWithJavaIntegration = ({ employee, facilities, shifts, onClose }) => {
  const [formData, setFormData] = useState({
    employeeId: employee?.employeeId || '',
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    facility: employee?.facility?._id || '',
    department: employee?.department || '',
    designation: employee?.designation || '',
    shift: employee?.shift?._id || '',
    joiningDate: employee?.joiningDate ? employee.joiningDate.split('T')[0] : '',
    dateOfBirth: employee?.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
    nationality: employee?.nationality || '',
    nationalId: employee?.nationalId || '',
    status: employee?.status || 'active'
  });
  
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(employee?.profileImage || null);
  const [stream, setStream] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState({
    deviceSync: null,    // null, 'loading', 'success', 'error'
    databaseSave: null,  // null, 'loading', 'success', 'error'
    message: ''
  });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL (base64)
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
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
            
            toast.success('Employee registered successfully!', { duration: 4000 });
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
          toast.error('Device enrollment timed out. Please check device connectivity.');
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
        
        await registerEmployeeWithEnhancedFlow(formData, capturedImage);
        
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
                  <label className="block text-sm font-medium text-gray-700">Employee ID *</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., EMP001"
                  />
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
              </div>
            </div>

            {/* Work Information Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Work Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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