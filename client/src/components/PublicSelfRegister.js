import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CameraIcon, CheckCircleIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const PublicSelfRegister = () => {
  const [facilities, setFacilities] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [formData, setFormData] = useState({
    staffId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    facility: '',
    department: '',
    unit: '',
    designation: '',
    cadre: '',
    gradeLevel: '',
    shift: '',
    joiningDate: '',
    dateOfBirth: '',
    nationality: 'Nigerian',
    nationalId: '',
    gender: '',
    education: '',
    bloodGroup: '',
    allergies: '',
    customAllergy: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Nigeria'
    }
  });
  
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  const [uploadMethod, setUploadMethod] = useState('camera');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [availablePrefixes, setAvailablePrefixes] = useState([]);
  const [selectedPrefixType, setSelectedPrefixType] = useState('');
  
  // Searchable dropdown states
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [designationSearch, setDesignationSearch] = useState('');
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false);
  const [cadreSearch, setCadreSearch] = useState('');
  const [showCadreDropdown, setShowCadreDropdown] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState('Nigerian');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const departmentDropdownRef = useRef(null);
  const unitDropdownRef = useRef(null);
  const designationDropdownRef = useRef(null);
  const cadreDropdownRef = useRef(null);
  const nationalityDropdownRef = useRef(null);

  // All data arrays from employee management
  const allCadres = [
    'Administrative Officer', 'Community Health Extension Worker', 'Community Health Officer',
    'Computer Assistant', 'Computer Scientist', 'Dental Health Technician', 'Dental Surgery Assistant',
    'Dental Technologist', 'Dental Therapist', 'Dietitian', 'Dispensing Optician',
    'Environmental Health Assistant', 'Environmental Health Officer', 'Environmental Health Technician',
    'Executive Officers (General Duties Cadre)', 'Food Hygiene', 'Health Assistant', 'Health Attendant',
    'Health Educator and Promoter', 'Health Information Manager', 'Junior Community Health Extension Worker',
    'Medical Laboratory Assistant', 'Medical Laboratory Scientist', 'Medical Laboratory Technician',
    'Medical Laboratory Technologist', 'Medical Officer', 'Microbiology/Biology/Env Biology',
    'Midwife', 'Nurse', 'Nurse/Midwife', 'Nursing Officer', 'Nutrition Assistant', 'Nutrition Officer',
    'OPTOMETRICIAN ASSISTANT', 'Pharmacist', 'Pharmacy Technician', 'Public Health', 'Radiographer',
    'Scientific Officer', 'Statistician', 'Store Officer', 'X-ray Assistant', 'X-ray Technician', 'Other'
  ];

  const kanoDepartments = [
    'PLANNING, MONITORING AND EVALUATION', 'ADMINISTRATION AND HUMAN RESOURCES', 'FAMILY HEALTH',
    'FINANCE AND ACCOUNTING', 'ENVIRONMENTAL AND PUBLIC HEALTH', 'DISEASE CONTROL AND IMMUNIZATION',
    'PHARMACEUTICAL SERVICES', 'MEDICAL SERVICES'
  ];

  const genericDepartments = [
    'Medical Department', 'Nursing Department', 'Laboratory Department', 'Pharmacy Department',
    'Administration Department', 'Finance Department', 'Human Resources', 'IT Department',
    'Public Health', 'Environmental Health', 'Records Department', 'Maintenance Department',
    'Security Department', 'Other'
  ];

  const allDepartments = [...kanoDepartments, ...genericDepartments];

  const departmentUnits = {
    'PLANNING, MONITORING AND EVALUATION': ['HMIS', 'ICT', 'QOC', 'RMNCAH', 'Planning and Budget', 'ISS', 'Procurement', 'BHCPF', 'IMPACT', 'Partner Coordination', 'M&E'],
    'ADMINISTRATION AND HUMAN RESOURCES': ['Human Resources for Health', 'General Service', 'Maintainance', 'Security', 'Registry', 'Floating Assembly'],
    'FAMILY HEALTH': ['MCH (service delivery, MAMII, NBC)', 'Nutrition', 'Family Planning/RH', 'IMCI'],
    'FINANCE AND ACCOUNTING': ['Cashier', 'Payroll'],
    'ENVIRONMENTAL AND PUBLIC HEALTH': ['ACSM', 'Community Engagement', 'Environmental Health', 'WASH', 'WDC'],
    'DISEASE CONTROL AND IMMUNIZATION': ['Cold Chain', 'Logistic', 'SHCSS', 'DRF', 'Drugs Supply'],
    'PHARMACEUTICAL SERVICES': ['Cold Chain', 'Logistic', 'SHCSS', 'DRF', 'Drugs Supply'],
    'MEDICAL SERVICES': ['Mental Health', 'MSP', 'NCD', 'Referral', 'School Health Services', 'Oral Health care', 'KSCHMA', 'Laboratory', 'Primary Eye Care']
  };

  const allDesignations = [
    'Director Planning, Monitoring, and Evaluation', 'Deputy Director Planning, Monitoring and Evaluation',
    'HMIS Officer', 'ICT Manager', 'Deputy ICT Manager', 'ICT Support and Training Officer',
    'Director Administration and Human Resources', 'PAS', 'HRH Coordinator', 'Deputy HRH Coordinator',
    'Director Family Health', 'Deputy Director/PM SEMCHIC', 'MNCH Coordinator', 'Gender Health FP',
    'Director Finance and Account', 'Deputy Director Finance and Account', 'Cashier', 'RI Accountant',
    'Director', 'Deputy Director Environmental and Public Health', 'SMO', 'WDC FP', 'CE FP',
    'SHCSS FP', 'SCCO', 'Assistant SCCO', 'SLO', 'Mental Health FP', 'MSPMT Coordinator',
    'NCD FP', 'SHS FP', 'RP FP', 'Oral Health Care FP', 'Primary Eye Care FP', 'Laboratory FP', 'Other'
  ];

  const nationalities = [
    'Nigerian', 'Ghanaian', 'South African', 'Kenyan', 'Egyptian', 'Ethiopian', 'American', 'British',
    'Canadian', 'Australian', 'French', 'German', 'Indian', 'Pakistani', 'Chinese', 'Japanese', 'Other'
  ];

  // Filtered lists
  const filteredDepartments = allDepartments.filter(dept =>
    dept.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  const filteredUnits = formData.department && departmentUnits[formData.department]
    ? departmentUnits[formData.department].filter(unit =>
        unit.toLowerCase().includes(unitSearch.toLowerCase())
      )
    : [];

  const filteredDesignations = allDesignations.filter(desig =>
    desig.toLowerCase().includes(designationSearch.toLowerCase())
  );

  const filteredCadres = allCadres.filter(cadre =>
    cadre.toLowerCase().includes(cadreSearch.toLowerCase())
  );

  const filteredNationalities = nationalities.filter(nat =>
    nat.toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  const isKanoDepartment = kanoDepartments.includes(formData.department);

  useEffect(() => {
    fetchFacilities();
    fetchShifts();
    detectCameras();
    fetchPrefixes();
  }, []);

  // Handle prefix type change
  useEffect(() => {
    if (selectedPrefixType && selectedPrefixType !== 'other') {
      setFormData(prev => ({ ...prev, staffId: selectedPrefixType }));
    } else if (selectedPrefixType === 'other') {
      setFormData(prev => ({ ...prev, staffId: '' }));
    }
  }, [selectedPrefixType]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
        setShowDepartmentDropdown(false);
      }
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target)) {
        setShowUnitDropdown(false);
      }
      if (designationDropdownRef.current && !designationDropdownRef.current.contains(event.target)) {
        setShowDesignationDropdown(false);
      }
      if (cadreDropdownRef.current && !cadreDropdownRef.current.contains(event.target)) {
        setShowCadreDropdown(false);
      }
      if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target)) {
        setShowNationalityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoadingFacilities(true);
      const response = await axios.get('/api/public/facilities');
      if (response.data.success) {
        setFacilities(response.data.data);
        if (response.data.data.length === 0) {
          toast.error('No facilities available for registration');
        }
      }
    } catch (error) {
      console.error('Failed to load facilities:', error);
      toast.error('Failed to load facilities. Please check your connection.');
    } finally {
      setLoadingFacilities(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await axios.get('/api/shifts');
      if (response.data.success) {
        setShifts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load shifts:', error);
    }
  };

  const detectCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      if (cameras.length > 0) {
        setSelectedCamera(cameras[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to detect cameras:', error);
    }
  };

  const fetchPrefixes = async () => {
    try {
      const response = await axios.get('/api/staff-id-prefix');
      if (response.data.success) {
        setAvailablePrefixes(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch prefixes:', error);
    }
  };

  const startCamera = async () => {
    try {
      setCameraLoading(true);
      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setShowCamera(true);
      toast.success('Camera started');
    } catch (error) {
      toast.error('Failed to access camera. Please allow camera permissions.');
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowCamera(false);
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);
      stopCamera();
      toast.success('Image captured successfully');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        toast.success('Image uploaded successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    if (uploadMethod === 'camera') {
      startCamera();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDepartmentSelect = (dept) => {
    setFormData(prev => ({ ...prev, department: dept, unit: '' }));
    setDepartmentSearch(dept);
    setShowDepartmentDropdown(false);
    setUnitSearch('');
  };

  const handleUnitSelect = (unit) => {
    setFormData(prev => ({ ...prev, unit }));
    setUnitSearch(unit);
    setShowUnitDropdown(false);
  };

  const handleDesignationSelect = (desig) => {
    setFormData(prev => ({ ...prev, designation: desig }));
    setDesignationSearch(desig);
    setShowDesignationDropdown(false);
  };

  const handleCadreSelect = (cadre) => {
    setFormData(prev => ({ ...prev, cadre }));
    setCadreSearch(cadre);
    setShowCadreDropdown(false);
  };

  const handleNationalitySelect = (nat) => {
    setFormData(prev => ({ ...prev, nationality: nat }));
    setNationalitySearch(nat);
    setShowNationalityDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!capturedImage) {
      toast.error('Please capture or upload your face image');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        allergies: formData.allergies === 'Other' ? formData.customAllergy : formData.allergies,
        address: JSON.stringify(formData.address),
        faceImageBase64: capturedImage
      };

      const response = await axios.post('/api/public/self-register', payload);

      if (response.data.success) {
        setRegistrationSuccess(response.data.data);
        toast.success('Registration successful!');
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          facility: '',
          department: '',
          unit: '',
          designation: '',
          cadre: '',
          gradeLevel: '',
          shift: '',
          joiningDate: '',
          dateOfBirth: '',
          nationality: 'Nigerian',
          nationalId: '',
          gender: '',
          education: '',
          bloodGroup: '',
          allergies: '',
          customAllergy: '',
          address: { street: '', city: '', state: '', zipCode: '', country: 'Nigeria' }
        });
        setCapturedImage(null);
        setDepartmentSearch('');
        setUnitSearch('');
        setDesignationSearch('');
        setCadreSearch('');
        setNationalitySearch('Nigerian');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-600">Your account has been created</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4 text-blue-900">Your Credentials</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-blue-200">
                <span className="text-gray-600">Employee ID:</span>
                <span className="font-mono font-bold text-lg">{registrationSuccess.employee.employeeId}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-blue-200">
                <span className="text-gray-600">Staff ID:</span>
                <span className="font-mono font-bold text-lg">{registrationSuccess.credentials?.staffId || registrationSuccess.employee.staffId}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-blue-200">
                <span className="text-gray-600">PIN:</span>
                <span className="font-mono font-bold text-lg">{registrationSuccess.credentials?.pin || 'N/A'}</span>
              </div>
            </div>
            <p className="text-sm text-blue-700 mt-4 italic">{registrationSuccess.credentials?.note || 'Save these credentials for future reference'}</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-lg mb-3 text-yellow-900">Next Steps</h3>
            <ul className="space-y-2">
              {(registrationSuccess.nextSteps || [
                'Your account has been created successfully',
                'An administrator will sync your biometric data to the device',
                'You will be notified once your device enrollment is complete',
                'Keep your Staff ID and PIN secure for future login'
              ]).map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-600 mr-2">{index + 1}.</span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setRegistrationSuccess(null)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Register Another Employee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-8 text-center">
            <h1 className="text-4xl font-bold mb-2">Employee Self-Registration</h1>
            <p className="text-blue-100">Create your employee account - Device ID and Staff ID will be auto-generated</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Staff ID / Card Number *
                  </label>
                  
                  {/* Prefix Dropdown */}
                  <select
                    value={selectedPrefixType}
                    onChange={(e) => setSelectedPrefixType(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  >
                    <option value="">Select Prefix</option>
                    {availablePrefixes.map((prefix) => (
                      <option key={prefix._id} value={prefix.prefix}>
                        {prefix.prefix} {prefix.description ? `- ${prefix.description}` : ''}
                      </option>
                    ))}
                    <option value="other">Other (Enter Full ID)</option>
                  </select>
                  
                  {/* Staff ID Input */}
                  {selectedPrefixType && selectedPrefixType !== 'other' ? (
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm font-semibold text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md min-w-[100px] justify-center">
                        {selectedPrefixType}
                      </span>
                      <input
                        type="text"
                        value={formData.staffId.replace(new RegExp(`^${selectedPrefixType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`), '')}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          setFormData({ ...formData, staffId: `${selectedPrefixType}${value}` });
                        }}
                        required
                        className="flex-1 block w-full border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="001"
                      />
                    </div>
                  ) : selectedPrefixType === 'other' ? (
                    <input
                      type="text"
                      value={formData.staffId}
                      onChange={(e) => setFormData({ ...formData, staffId: e.target.value.trim() })}
                      required
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full staff ID (e.g., XYZ123)"
                    />
                  ) : (
                    <input
                      type="text"
                      disabled
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                      placeholder="Select a prefix first"
                    />
                  )}
                  
                  {selectedPrefixType && selectedPrefixType !== 'other' && (
                    <p className="mt-1 text-xs text-gray-500">Enter the numeric/alphanumeric part - prefix is auto-added</p>
                  )}
                  {selectedPrefixType === 'other' && (
                    <p className="mt-1 text-xs text-gray-500">Enter the complete staff ID in any format</p>
                  )}
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
                  <label className="block text-sm font-medium text-gray-700">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Highest Educational Qualification *</label>
                  <select
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    required
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

            {/* Address Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Address Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Street Address *</label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">City *</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Kano"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">State *</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    required
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
                  <label className="block text-sm font-medium text-gray-700">Country *</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nigeria"
                  />
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Work Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department/Service Unit *</label>
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
                      required
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
                  </div>
                </div>

                {isKanoDepartment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit *</label>
                    <div className="relative" ref={unitDropdownRef}>
                      <input
                        type="text"
                        value={unitSearch}
                        onChange={(e) => {
                          setUnitSearch(e.target.value);
                          setShowUnitDropdown(true);
                        }}
                        onFocus={() => setShowUnitDropdown(true)}
                        placeholder="Search unit..."
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.unit && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      
                      {showUnitDropdown && filteredUnits.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredUnits.map((unit, index) => (
                            <div
                              key={index}
                              onClick={() => handleUnitSelect(unit)}
                              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                                formData.unit === unit ? 'bg-blue-100' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-900">{unit}</span>
                                {formData.unit === unit && (
                                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Designation/Rank *</label>
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
                      required
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
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cadre *</label>
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
                      required
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
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Facility *</label>
                  <select
                    name="facility"
                    value={formData.facility}
                    onChange={handleChange}
                    required
                    disabled={loadingFacilities}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {loadingFacilities ? 'Loading facilities...' : 'Select Facility'}
                    </option>
                    {facilities.map(f => (
                      <option key={f._id} value={f._id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                  {!loadingFacilities && facilities.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">No facilities available. Please contact administrator.</p>
                  )}
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
                  <label className="block text-sm font-medium text-gray-700">Appointment Date *</label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nationality *</label>
                  <div className="relative" ref={nationalityDropdownRef}>
                    <input
                      type="text"
                      value={nationalitySearch}
                      onChange={(e) => {
                        setNationalitySearch(e.target.value);
                        setShowNationalityDropdown(true);
                      }}
                      onFocus={() => setShowNationalityDropdown(true)}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search nationality..."
                    />
                    
                    {showNationalityDropdown && filteredNationalities.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredNationalities.map((nat, index) => (
                          <div
                            key={index}
                            onClick={() => handleNationalitySelect(nat)}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                              formData.nationality === nat ? 'bg-blue-100' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-900">{nat}</span>
                              {formData.nationality === nat && (
                                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">National ID / Passport *</label>
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="National ID or Passport Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Grade Level (GL) *</label>
                  <select
                    name="gradeLevel"
                    value={formData.gradeLevel}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Grade Level</option>
                    {[...Array(17)].map((_, i) => {
                      const level = i + 1;
                      return (
                        <option key={level} value={level}>
                          GL {level}
                        </option>
                      );
                    })}
                  </select>
                  {formData.gradeLevel && (
                    <p className="mt-1 text-xs text-blue-600">
                      Annual Leave Entitlement: {' '}
                      <span className="font-semibold">
                        {formData.gradeLevel >= 1 && formData.gradeLevel <= 3 ? '14 days' :
                         formData.gradeLevel >= 4 && formData.gradeLevel <= 6 ? '21 days' : '30 days'}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Face Capture Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Biometric Photo *</h2>
              
              {!capturedImage ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => {
                            setUploadMethod('camera');
                            if (stream) stopCamera();
                          }}
                          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            uploadMethod === 'camera'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          📷 Live Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadMethod('file');
                            if (showCamera) stopCamera();
                            setShowCamera(false);
                          }}
                          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            uploadMethod === 'file'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          📤 Upload Photo
                        </button>
                      </div>
                    </div>

                    {uploadMethod === 'camera' && availableCameras.length > 1 && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <label className="block text-sm font-medium text-gray-900 mb-2">Select Camera</label>
                        <select
                          value={selectedCamera}
                          onChange={(e) => {
                            setSelectedCamera(e.target.value);
                            if (showCamera) {
                              stopCamera();
                              setTimeout(() => startCamera(), 100);
                            }
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {availableCameras.map((camera, index) => (
                            <option key={camera.deviceId} value={camera.deviceId}>
                              {camera.label || `Camera ${index + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {uploadMethod === 'camera' && !showCamera && (
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

                    {uploadMethod === 'file' && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <label className="block text-sm font-medium text-gray-900 mb-2">Upload Passport Photo</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-medium
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Supported: JPG, PNG (Max 5MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {showCamera && (
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-80 object-contain"
                        />
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
                        Your biometric photo has been captured and is ready for enrollment.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={retakeImage}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
                    >
                      Retake Photo
                    </button>
                  </div>

                  <div className="bg-white rounded-lg border-2 border-green-500 overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full h-80 object-contain"
                    />
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading || !capturedImage}
                className="w-full max-w-md bg-blue-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PublicSelfRegister;
