import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { XMarkIcon, CameraIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const EmployeeModal = ({ employee, facilities, shifts, onClose }) => {
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
    deviceId: employee?.deviceId || '',
    joiningDate: employee?.joiningDate ? employee.joiningDate.split('T')[0] : '',
    dateOfBirth: employee?.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
    nationality: employee?.nationality || '',
    nationalId: employee?.nationalId || '',
    salaryGrade: employee?.salaryGrade?._id || '',
    salary: employee?.salary || '',
    status: employee?.status || 'active'
  });
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(employee?.profileImage || null);
  const [stream, setStream] = useState(null);
  const [salaryGrades, setSalaryGrades] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Cleanup camera stream on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Fetch salary grades
  useEffect(() => {
    const fetchSalaryGrades = async () => {
      try {
        const response = await axios.get('/api/salary-grades?active=true');
        setSalaryGrades(response.data.data);
      } catch (error) {
        console.error('Failed to fetch salary grades:', error);
      }
    };
    fetchSalaryGrades();
  }, []);

  // Setup video element when camera starts
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
      // Request camera permission
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

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready. Please wait a moment and try again.');
      return;
    }

    const video = videoRef.current;
    
    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast.error('Video is not ready yet. Please wait a moment.');
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    if (imageData && imageData.length > 100) {
      setCapturedImage(imageData);
      stopCamera();
      toast.success('Photo captured successfully!');
    } else {
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const generatePersonUUID = () => {
    // Generate a unique UUID format: timestamp + random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `${timestamp}-${randomStr}`;
  };

  const registerToDevice = async (employeeData, faceImage) => {
    try {
      // Get facility details to access device API
      const facility = facilities.find(f => f._id === employeeData.facility);
      if (!facility) {
        throw new Error('Facility not found');
      }

      // Use addUserApiUrl for registering NEW employees to device
      const addUserUrl = facility.configuration?.addUserApiUrl;
      if (!addUserUrl) {
        throw new Error('Device Add User API URL not configured for this facility. Please configure it in Facility settings.');
      }

      toast.loading('Registering face to device...', { id: 'device-register' });

      // Generate personUUID if not provided
      const personUUID = employeeData.deviceId || generatePersonUUID();

      // Prepare device registration payload matching expected format
      const devicePayload = {
        name: `${employeeData.firstName} ${employeeData.lastName}`,
        facility: facility.name || null,
        department: employeeData.department || null,
        birth_date: employeeData.dateOfBirth || null,
        nation: employeeData.nationality || null,
        id_card: employeeData.nationalId || null,
        person_uuid: personUUID,
        pic_info: faceImage // Base64 image
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (facility.deviceApiKey) {
        headers['Authorization'] = `Bearer ${facility.deviceApiKey}`;
      }

      // Send to device API (ADD USER endpoint)
      const response = await axios.post(
        addUserUrl,
        devicePayload,
        { headers }
      );

      toast.success('Face registered to device successfully!', { id: 'device-register' });
      
      // Return the personUUID so we can save it to the employee record
      return { ...response.data, personUUID };
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || 'Failed to register face to device',
        { id: 'device-register' }
      );
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate face capture for new employees
    if (!employee && !capturedImage) {
      toast.error('Please capture a face photo before submitting');
      return;
    }

    setLoading(true);

    try {
      // STEP 1: Register to device first (for new employees with face)
      let generatedPersonUUID = null;
      if (!employee && capturedImage) {
        const deviceResponse = await registerToDevice(formData, capturedImage);
        generatedPersonUUID = deviceResponse.personUUID;
      }

      // STEP 2: Save to database (only if device registration succeeded or editing)
      const dataToSend = { ...formData };
      
      // Use the generated personUUID as deviceId if it was generated
      if (generatedPersonUUID) {
        dataToSend.deviceId = generatedPersonUUID;
      }
      
      if (capturedImage) {
        dataToSend.profileImage = capturedImage;
      }

      if (employee) {
        await axios.put(`/api/employees/${employee._id}`, dataToSend);
        toast.success('Employee updated successfully');
      } else {
        await axios.post('/api/employees', dataToSend);
        toast.success('Employee created and registered to device successfully');
      }
      
      onClose(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h3>
          <button onClick={() => onClose(false)} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Face Capture Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <CameraIcon className="h-5 w-5 mr-2 text-blue-600" />
              Face Recognition Photo {!employee && <span className="text-red-500 ml-1">*</span>}
            </h4>
            
            {!showCamera && !capturedImage && (
              <div className="text-center py-8">
                <CameraIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Capture employee's face for biometric registration</p>
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={cameraLoading}
                  className="btn btn-outline flex items-center mx-auto disabled:opacity-50"
                >
                  <CameraIcon className="h-5 w-5 mr-2" />
                  {cameraLoading ? 'Starting Camera...' : 'Start Camera'}
                </button>
              </div>
            )}

            {showCamera && (
              <div className="space-y-3">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-4 border-green-400 rounded-lg"></div>
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="btn btn-primary flex-1"
                  >
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Position face in the green frame and click capture
                </p>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured face"
                    className="w-full h-auto rounded-lg border-2 border-green-500"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    ✓ Captured
                  </div>
                </div>
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="btn btn-outline w-full flex items-center justify-center"
                >
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Retake Photo
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Employee ID *</label>
              <input
                type="text"
                name="employeeId"
                className="input"
                value={formData.employeeId}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">
                Device ID (personUUID)
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (Auto-generated if empty)
                </span>
              </label>
              <input
                type="text"
                name="deviceId"
                className="input"
                value={formData.deviceId}
                onChange={handleChange}
                placeholder="Leave empty to auto-generate"
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier for face recognition device
              </p>
            </div>

            <div>
              <label className="label">First Name *</label>
              <input
                type="text"
                name="firstName"
                className="input"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Last Name *</label>
              <input
                type="text"
                name="lastName"
                className="input"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                name="email"
                className="input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                name="phone"
                className="input"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label">Facility *</label>
              <select
                name="facility"
                className="input"
                value={formData.facility}
                onChange={handleChange}
                required
              >
                <option value="">Select Facility</option>
                {facilities.map(facility => (
                  <option key={facility._id} value={facility._id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Shift *</label>
              <select
                name="shift"
                className="input"
                value={formData.shift}
                onChange={handleChange}
                required
              >
                <option value="">Select Shift</option>
                {shifts.map(shift => (
                  <option key={shift._id} value={shift._id}>
                    {shift.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Department *</label>
              <input
                type="text"
                name="department"
                className="input"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Designation *</label>
              <input
                type="text"
                name="designation"
                className="input"
                value={formData.designation}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Joining Date *</label>
              <input
                type="date"
                name="joiningDate"
                className="input"
                value={formData.joiningDate}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                className="input"
                value={formData.dateOfBirth}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label">Nationality</label>
              <input
                type="text"
                name="nationality"
                className="input"
                value={formData.nationality}
                onChange={handleChange}
                placeholder="e.g., American, British, Nigerian"
              />
            </div>

            <div>
              <label className="label">National ID / Passport</label>
              <input
                type="text"
                name="nationalId"
                className="input"
                value={formData.nationalId}
                onChange={handleChange}
                placeholder="National ID or Passport Number"
              />
            </div>

            <div>
              <label className="label">Salary Grade</label>
              <select
                name="salaryGrade"
                className="input"
                value={formData.salaryGrade}
                onChange={handleChange}
              >
                <option value="">Select Salary Grade (Optional)</option>
                {salaryGrades.map(grade => (
                  <option key={grade._id} value={grade._id}>
                    {grade.code} - {grade.name} (₦{grade.baseSalary.toLocaleString()})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Automatic salary from grade level</p>
            </div>

            <div>
              <label className="label">Manual Salary Override</label>
              <input
                type="number"
                name="salary"
                className="input"
                value={formData.salary}
                onChange={handleChange}
                placeholder="Leave empty to use salary grade"
                min="0"
                step="1000"
              />
              <p className="text-xs text-gray-500 mt-1">Overrides salary grade if set</p>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                name="status"
                className="input"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : employee ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;
