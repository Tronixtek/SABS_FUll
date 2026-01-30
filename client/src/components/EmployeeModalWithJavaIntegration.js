import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { XMarkIcon, CameraIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    unit: employee?.unit || '', // Add unit field
    designation: employee?.designation || '',
    cadre: employee?.cadre || '',
    gradeLevel: employee?.gradeLevel || '',
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
    salaryGrade: employee?.salaryGrade?._id || '',
    salary: employee?.salary || '',
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
  const [capturedImage, setCapturedImage] = useState(
    employee?.profileImage 
      ? (employee.profileImage.startsWith('data:') 
          ? employee.profileImage 
          : `${API_URL}${employee.profileImage}`)
      : null
  );
  const [stream, setStream] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [uploadMethod, setUploadMethod] = useState('camera'); // 'camera' or 'file'
  const [salaryGrades, setSalaryGrades] = useState([]);
  const [cadreSearch, setCadreSearch] = useState(employee?.cadre || '');
  const [showCadreDropdown, setShowCadreDropdown] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState(employee?.department || '');
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState(employee?.unit || ''); // Add unit search state
  const [showUnitDropdown, setShowUnitDropdown] = useState(false); // Add unit dropdown state
  const [designationSearch, setDesignationSearch] = useState(employee?.designation || '');
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState(employee?.nationality || '');
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [customDepartment, setCustomDepartment] = useState('');
  const [customDesignation, setCustomDesignation] = useState('');
  const [customCadre, setCustomCadre] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState({
    deviceSync: null,    // null, 'loading', 'success', 'error'
    databaseSave: null,  // null, 'loading', 'success', 'error'
    message: ''
  });
  const [availablePrefixes, setAvailablePrefixes] = useState([]);
  const [selectedPrefixType, setSelectedPrefixType] = useState(''); // 'predefined' or 'other'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cadreDropdownRef = useRef(null);
  const departmentDropdownRef = useRef(null);
  const unitDropdownRef = useRef(null); // Add unit dropdown ref
  const designationDropdownRef = useRef(null);
  const nationalityDropdownRef = useRef(null);

  // List of nationalities/countries
  const nationalities = [
    'Nigerian', 'Ghanaian', 'South African', 'Kenyan', 'Egyptian', 'Ethiopian',
    'Ugandan', 'Tanzanian', 'Zimbabwean', 'Moroccan', 'Algerian', 'Tunisian',
    'Sudanese', 'Senegalese', 'Cameroonian', 'Ivorian', 'Rwandan', 'Zambian',
    'American', 'British', 'Canadian', 'Australian', 'French', 'German',
    'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Belgian', 'Swiss',
    'Indian', 'Pakistani', 'Bangladeshi', 'Sri Lankan', 'Chinese', 'Japanese',
    'Korean', 'Filipino', 'Indonesian', 'Malaysian', 'Thai', 'Vietnamese',
    'Brazilian', 'Mexican', 'Argentinian', 'Colombian', 'Chilean', 'Peruvian',
    'Saudi Arabian', 'Emirati', 'Lebanese', 'Jordanian', 'Turkish', 'Iranian',
    'Other'
  ];

  // Comprehensive cadre list for both facility and board levels
  const allCadres = [
    'Administrative Officer',
    'Community Health Extension Worker',
    'Community Health Officer',
    'Computer Assistant',
    'Computer Scientist',
    'Dental Health Technician',
    'Dental Surgery Assistant',
    'Dental Technologist',
    'Dental Therapist',
    'Dietitian',
    'Dispensing Optician',
    'Environmental Health Assistant',
    'Environmental Health Officer',
    'Environmental Health Technician',
    'Executive Officers (General Duties Cadre)',
    'Food Hygiene',
    'Health Assistant',
    'Health Attendant',
    'Health Educator and Promoter',
    'Health Information Manager',
    'Junior Community Health Extension Worker',
    'Medical Laboratory Assistant',
    'Medical Laboratory Scientist',
    'Medical Laboratory Technician',
    'Medical Laboratory Technologist',
    'Medical Officer',
    'Microbiology/Biology/Env Biology',
    'Midwife',
    'Nurse',
    'Nurse/Midwife',
    'Nursing Officer',
    'Nutrition Assistant',
    'Nutrition Officer',
    'OPTOMETRICIAN ASSISTANT',
    'Pharmacist',
    'Pharmacy Technician',
    'Public Health',
    'Radiographer',
    'Scientific Officer',
    'Statistician',
    'Store Officer',
    'X-ray Assistant',
    'X-ray Technician',
    'Other'
  ];

  const allCountries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
    'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
    'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
    'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
    'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
    'Congo (Congo-Brazzaville)', 'Congo (DRC)', 'Costa Rica', 'Croatia', 'Cuba',
    'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
    'East Timor (Timor-Leste)', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
    'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
    'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
    'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast',
    'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo',
    'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
    'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi',
    'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
    'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro',
    'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
    'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
    'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea',
    'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
    'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
    'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia',
    'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
    'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka',
    'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
    'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
    'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela',
    'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
  ];

  // Generic/Old Departments (previously used)
  const genericDepartments = [
    'Medical Department',
    'Nursing Department',
    'Laboratory Department',
    'Pharmacy Department',
    'Administration Department',
    'Finance Department',
    'Human Resources',
    'IT Department',
    'Public Health',
    'Environmental Health',
    'Records Department',
    'Maintenance Department',
    'Security Department',
    'Other'
  ];

  // KANO STATE PHCMB - Official Departments (with hierarchy)
  const kanoDepartments = [
    'PLANNING, MONITORING AND EVALUATION',
    'ADMINISTRATION AND HUMAN RESOURCES',
    'FAMILY HEALTH',
    'FINANCE AND ACCOUNTING',
    'ENVIRONMENTAL AND PUBLIC HEALTH',
    'DISEASE CONTROL AND IMMUNIZATION',
    'PHARMACEUTICAL SERVICES',
    'MEDICAL SERVICES'
  ];

  // All departments combined (KANO + Generic)
  const allDepartments = [...kanoDepartments, ...genericDepartments];

  // Department → Units mapping
  const departmentUnits = {
    'PLANNING, MONITORING AND EVALUATION': [
      'HMIS',
      'ICT',
      'QOC',
      'RMNCAH',
      'Planning and Budget',
      'ISS',
      'Procurement',
      'BHCPF',
      'IMPACT',
      'Partner Coordination',
      'M&E'
    ],
    'ADMINISTRATION AND HUMAN RESOURCES': [
      'Human Resources for Health',
      'General Service',
      'Maintainance',
      'Security',
      'Registry',
      'Floating Assembly'
    ],
    'FAMILY HEALTH': [
      'MCH (service delivery, MAMII, NBC)',
      'Nutrition',
      'Family Planning/RH',
      'IMCI'
    ],
    'FINANCE AND ACCOUNTING': [
      'Cashier',
      'Payroll'
    ],
    'ENVIRONMENTAL AND PUBLIC HEALTH': [
      'ACSM',
      'Community Engagement',
      'Environmental Health',
      'WASH',
      'WDC'
    ],
    'DISEASE CONTROL AND IMMUNIZATION': [
      'Cold Chain',
      'Logistic',
      'SHCSS',
      'DRF',
      'Drugs Supply'
    ],
    'PHARMACEUTICAL SERVICES': [
      'Cold Chain',
      'Logistic',
      'SHCSS',
      'DRF',
      'Drugs Supply'
    ],
    'MEDICAL SERVICES': [
      'Mental Health',
      'MSP',
      'NCD',
      'Referral',
      'School Health Services',
      'Oral Health care',
      'KSCHMA',
      'Laboratory',
      'Primary Eye Care'
    ]
  };

  // All available designations/ranks
  const allDesignations = [
    // PLANNING, MONITORING AND EVALUATION
    'Director Planning, Monitoring, and Evaluation',
    'Deputy Director Planning, Monitoring and Evaluation',
    'HMIS Officer',
    'ICT Manager',
    'Deputy ICT Manager',
    'ICT Support and Training Officer',
    'Digital Health Programs Officer',
    'ISS Coordinator',
    'CPO',
    'Assistant CPO',
    'M&E',
    'BHCPF Coordinator',
    'BHCPF Deputy Coordinator',
    'BHCPF Accountant',
    'BHCPF M&E',
    'BHCPF Quality Control Officer',
    'IMPACT PM',
    'IMPACT M&E',
    'QoC Coordinator',
    'QoC M&E',
    'Procurement FP',

    // ADMINISTRATION AND HUMAN RESOURCES
    'Director Administration and Human Resources',
    'PAS',
    'HRH Coordinator',
    'Deputy HRH Coordinator',
    'HR Workforce Relation Officer',
    'Routine Training Officer',
    'In-service Training officer',
    'Staff Officer',
    'Security Officer',
    'Under Secretary',
    'Record officer',
    'Maintainance Officer',
    'Floating Manager',
    'Refrigerator TO',
    'Electrical TO',
    'Biomedical TO',
    'Technical Assistant',

    // FAMILY HEALTH
    'Director Family Health',
    'Deputy Director/PM SEMCHIC',
    'MNCH Coordinator',
    'Gender Health FP',
    'Family Planning FP',
    'Adolescent FP',
    'State Nutrition PM',
    'M&E Nutrition',
    'Deputy PM (Sensitive Intervention)',
    'Deputy PM (IMAM)',
    'Deputy PM Micronutrient Deficiency)',
    'MAMII FP',
    'New Born Care FP',
    'Nutritionist',
    'IMCI FP',
    'Deputy IMCI FP',

    // FINANCE AND ACCOUNTING
    'Director Finance and Account',
    'Deputy Director Finance and Account',
    'Deputy Director Finance and Account (Auditor)',
    'Cashier',
    'RI Accountant',
    'Operation Accountant',
    'BHCPF Accountant',
    'UNICEF Accountant',
    'PHC Accountant',
    'HMOU Accountant',
    'Payroll accountant',

    // ENVIRONMENTAL AND PUBLIC HEALTH
    'Director',
    'Deputy Director Environmental and Public Health',
    'SMO',
    'WDC FP',
    'Assistant WDC FP',
    'CE FP',
    'Assistant CE FP',
    'SBCC FP',
    'CBHW FP',
    'Assistant CBHW FP',
    'WASH FP',
    'Climate Change FP',
    'Waste Manager',
    'Sanitation Officer',

    // DISEASE CONTROL AND IMMUNIZATION
    'SHCSS FP',
    'SCCO',
    'Assistant SCCO',
    'SLO',
    'Assistant SLO',
    'Drugs Supply FP',
    'SERICC Desk Officer',
    'SERICC Program Manager',
    'SIO',
    'Deputy Director',

    // PHARMACEUTICAL SERVICES
    'SHCSS FP',
    'SCCO',
    'Assistant SCCO',
    'SLO',
    'Assistant SLO',
    'Drugs Supply FP',

    // MEDICAL SERVICES
    'Director',
    'Deputy Director',
    'Mental Health FP',
    'MSPMT Coordinator',
    'Deputy MSPMT Coordinator',
    'MSPMT Member',
    'NCD FP',
    'SHS FP',
    'RP FP',
    'Oral Health Care FP',
    'Primary Eye Care FP',
    'Laboratory FP',
    'KSCHMA Desk Officer',
    'Deputy NCD FP',
    'Member NCD',
    'Referral Network Analytic Team',
    'KSCHMA M&E I',
    'KSCHMA M&E II',
    'KSCHMA Quality Improvement Officer',
    'KSCHMA Bank Liaison Officer',
    'Deputy Laboratory FP',
    'Member Laboratory',
    'MSP Community Engagement Desk Officer',
    'MSP Coordinator',
    'MSP Infrastructure Desk Officer',
    'MSP Logistics & Supply Desk Officer',
    'MSP M&E Desk Officer',
    'MSP Referral Desk Officer',
    'MSP Service Delivery Desk Officer',
    'Medical officer',

    // Facility-level designations
    'ANC In-Charge',
    'Dental In-Charge',
    'Deputy ANC In-Charge',
    'Deputy Dental In-Charge',
    'Deputy In-Charge [2 i/c]',
    'Deputy In-Charge of Health Unit',
    'Deputy Laboratory In-Charge',
    'Deputy Maternity In-Charge',
    'Deputy Nutrition in-Charge',
    'Deputy OPD In-Charge',
    'Deputy Pharmacy In-Charge',
    'Deputy Post Natal In-Charge',
    'Facility In-Charge',
    'Facility M&E',
    'Facility Staff',
    'Family Planning In-Charge',
    'Health Unit In-Charge',
    'Laboratory In-Charge',
    'Maternity In-Charge',
    'Nutrition In-Charge',
    'OPD In-Charge',
    'Pharmacy In Charge',
    'Post-Natal In-Charge',
    'Routine Immunization In-Charge',
    'Other'
  ];

  // Unit → Designations mapping (for backward compatibility)
  const unitDesignations = {
    'All': allDesignations
  };

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

  // Fetch staff ID prefixes
  useEffect(() => {
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
    fetchPrefixes();
  }, []);

  // Handle prefix type change
  useEffect(() => {
    if (selectedPrefixType && selectedPrefixType !== 'other') {
      // When a predefined prefix is selected, clear the staffId to start fresh
      setFormData(prev => ({ ...prev, staffId: selectedPrefixType }));
    } else if (selectedPrefixType === 'other') {
      // When "Other" is selected, clear staffId for manual entry
      setFormData(prev => ({ ...prev, staffId: '' }));
    }
  }, [selectedPrefixType]);

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
      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target)) {
        setShowUnitDropdown(false);
      }
      if (designationDropdownRef.current && !designationDropdownRef.current.contains(event.target)) {
        setShowDesignationDropdown(false);
      }
      if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target)) {
        setShowNationalityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested fields (e.g., address.street, address.city)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Auto-generate employee ID when facility is selected
    if (name === 'facility' && value && !employee) {
      generateEmployeeId(value);
    }
  };

  const handleCadreSelect = (cadre) => {
    if (cadre === 'Other') {
      setCustomCadre('');
    }
    setFormData({ ...formData, cadre });
    setCadreSearch(cadre);
    setShowCadreDropdown(false);
  };

  const handleDepartmentSelect = (department) => {
    // When department changes, reset unit and designation
    setFormData({ ...formData, department, unit: '', designation: '' });
    setDepartmentSearch(department);
    setUnitSearch(''); // Reset unit search
    setDesignationSearch(''); // Reset designation search
    setShowDepartmentDropdown(false);
  };

  const handleUnitSelect = (unit) => {
    // When unit changes, reset designation
    setFormData({ ...formData, unit, designation: '' });
    setUnitSearch(unit);
    setDesignationSearch(''); // Reset designation search
    setShowUnitDropdown(false);
  };

  const handleDesignationSelect = (designation) => {
    setFormData({ ...formData, designation });
    setDesignationSearch(designation);
    setShowDesignationDropdown(false);
  };

  const handleNationalitySelect = (nationality) => {
    setFormData({ ...formData, nationality });
    setNationalitySearch(nationality);
    setShowNationalityDropdown(false);
  };

  const filteredCadres = allCadres.filter(cadre =>
    cadre.toLowerCase().includes(cadreSearch.toLowerCase())
  );

  const filteredCountries = allCountries.filter(country =>
    country.toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  // Use all departments (KANO + Generic)
  const filteredDepartments = allDepartments.filter(dept =>
    dept.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  // Check if selected department is a KANO department (has hierarchy)
  const isKanoDepartment = kanoDepartments.includes(formData.department);

  // Get units for selected department
  const getUnitsForDepartment = (department) => {
    if (!department) return [];
    return departmentUnits[department] || [];
  };

  const availableUnits = getUnitsForDepartment(formData.department);
  const filteredUnits = availableUnits.filter(unit =>
    unit.toLowerCase().includes(unitSearch.toLowerCase())
  );

  // Use the comprehensive designation list
  const availableDesignations = allDesignations;
  const filteredDesignations = availableDesignations.filter(desig =>
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

  // Get available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating cameras:', error);
    }
  };

  const startCamera = async () => {
    setCameraLoading(true);
    try {
      // Get available cameras first
      await getAvailableCameras();
      
      const constraints = { 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          aspectRatio: { ideal: 1.333 } // Prefer 4:3 ratio to prevent stretching
        },
        audio: false
      };
      
      // Use selected camera if available
      if (selectedCamera) {
        constraints.video.deviceId = { exact: selectedCamera };
      } else {
        constraints.video.facingMode = 'user';
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
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

    // Get actual video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const videoAspectRatio = videoWidth / videoHeight;
    
    // Target dimensions for XO5 device (640x480 is ideal)
    const maxWidth = 640;
    const maxHeight = 640;
    
    let targetWidth, targetHeight;
    
    // Calculate scaled dimensions while preserving aspect ratio
    if (videoWidth > videoHeight) {
      // Landscape orientation
      targetWidth = Math.min(maxWidth, videoWidth);
      targetHeight = Math.round(targetWidth / videoAspectRatio);
      
      // If height exceeds max, recalculate based on height
      if (targetHeight > maxHeight) {
        targetHeight = maxHeight;
        targetWidth = Math.round(targetHeight * videoAspectRatio);
      }
    } else {
      // Portrait or square orientation
      targetHeight = Math.min(maxHeight, videoHeight);
      targetWidth = Math.round(targetHeight * videoAspectRatio);
      
      // If width exceeds max, recalculate based on width
      if (targetWidth > maxWidth) {
        targetWidth = maxWidth;
        targetHeight = Math.round(targetWidth / videoAspectRatio);
      }
    }
    
    console.log(`Video: ${videoWidth}x${videoHeight}, Target: ${targetWidth}x${targetHeight}, Ratio: ${videoAspectRatio.toFixed(2)}`);
    
    // Set canvas to exact target dimensions (no stretching)
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear canvas before drawing
    context.clearRect(0, 0, targetWidth, targetHeight);

    // Draw video frame at exact aspect ratio (no distortion)
    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Apply image enhancement for better face detection in low light
    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
    const data = imageData.data;
    
    // Enhanced brightness and contrast boost for low-light conditions
    // Reduced from 1.15+15 to 1.08+8 to preserve facial features for XO5 recognition
    for (let i = 0; i < data.length; i += 4) {
      // Moderate brightness boost for low-light tolerance
      data[i] = Math.min(255, Math.max(0, data[i] * 1.08 + 8));     // Red
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * 1.08 + 8)); // Green  
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * 1.08 + 8)); // Blue
    }
    context.putImageData(imageData, 0, 0);

    // Convert canvas to optimized JPEG for XO5 device
    // Quality 0.75 provides best balance for XO5 face recognition (error code 101008 fix)
    const dataURL = canvas.toDataURL('image/jpeg', 0.75);
    
    // Validate image size - relaxed threshold to match Java service (20KB minimum)
    const imageSizeKB = Math.round((dataURL.length * 3/4) / 1024);
    console.log(`Captured image: ${targetWidth}x${targetHeight}, ${imageSizeKB}KB`);
    
    if (imageSizeKB < 20) {
      toast.error(`Image too small (${imageSizeKB}KB). Please ensure good lighting.`);
      return;
    }
    if (imageSizeKB > 250) {
      toast.error(`Image too large (${imageSizeKB}KB). Please retake with less background.`);
      return;
    }
    setCapturedImage(dataURL);
    stopCamera();
    toast.success(`Face photo captured! (${imageSizeKB}KB)`);
  };

  const retakeImage = () => {
    setCapturedImage(null);
    setRegistrationStatus({ deviceSync: null, databaseSave: null, message: '' });
    if (uploadMethod === 'camera') {
      startCamera();
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file too large. Maximum size is 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to resize and optimize image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Get original dimensions
        const originalWidth = img.width;
        const originalHeight = img.height;
        const aspectRatio = originalWidth / originalHeight;
        
        // Target max dimensions for XO5 device
        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 640;
        
        let targetWidth, targetHeight;
        
        // Calculate scaled dimensions while preserving aspect ratio
        if (originalWidth > originalHeight) {
          // Landscape orientation
          targetWidth = Math.min(MAX_WIDTH, originalWidth);
          targetHeight = Math.round(targetWidth / aspectRatio);
          
          // If height exceeds max, recalculate based on height
          if (targetHeight > MAX_HEIGHT) {
            targetHeight = MAX_HEIGHT;
            targetWidth = Math.round(targetHeight * aspectRatio);
          }
        } else {
          // Portrait or square orientation
          targetHeight = Math.min(MAX_HEIGHT, originalHeight);
          targetWidth = Math.round(targetHeight * aspectRatio);
          
          // If width exceeds max, recalculate based on width
          if (targetWidth > MAX_WIDTH) {
            targetWidth = MAX_WIDTH;
            targetHeight = Math.round(targetWidth / aspectRatio);
          }
        }
        
        console.log('📤 Upload image processing:', {
          original: { width: originalWidth, height: originalHeight },
          target: { width: targetWidth, height: targetHeight },
          aspectRatio: aspectRatio.toFixed(2)
        });
        
        // Set canvas to exact target dimensions (no stretching)
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Clear canvas and draw image with correct aspect ratio
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        // Apply same brightness enhancement as camera
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imageData.data;
        
        // Moderate enhancement to preserve facial features (1.08+8)
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, data[i] * 1.08 + 8));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * 1.08 + 8));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * 1.08 + 8));
        }
        ctx.putImageData(imageData, 0, 0);
        
        // Try different quality levels for optimal file size
        // Never go below 0.65 to preserve facial features for XO5 recognition
        let dataURL;
        let imageSizeKB;
        let quality = 0.80; // Start higher for better face recognition
        
        // First attempt at 0.80 quality (optimal for face recognition)
        dataURL = canvas.toDataURL('image/jpeg', quality);
        imageSizeKB = Math.round((dataURL.length * 3/4) / 1024);
        
        // If too large, reduce to 0.75
        if (imageSizeKB > 180) {
          quality = 0.75;
          dataURL = canvas.toDataURL('image/jpeg', quality);
          imageSizeKB = Math.round((dataURL.length * 3/4) / 1024);
          console.log(`Adjusted quality to ${quality} - Size: ${imageSizeKB}KB`);
        }
        
        // If still too large, reduce to 0.65 (minimum acceptable)
        if (imageSizeKB > 200) {
          quality = 0.65;
          dataURL = canvas.toDataURL('image/jpeg', quality);
          imageSizeKB = Math.round((dataURL.length * 3/4) / 1024);
          console.log(`Final quality reduction to ${quality} - Size: ${imageSizeKB}KB`);
        }
        
        console.log(`Uploaded image optimized: ${targetWidth}x${targetHeight}, ${imageSizeKB}KB (Quality: ${quality})`);
        
        // More lenient validation
        if (imageSizeKB < 20) {
          toast.error(`Image too small (${imageSizeKB}KB). Please use a higher quality photo.`);
          return;
        }
        
        if (imageSizeKB > 250) {
          toast.error(`Image too large (${imageSizeKB}KB). Please try a different photo.`);
          return;
        }
        
        setCapturedImage(dataURL);
        toast.success(`Photo uploaded successfully! (${imageSizeKB}KB)`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
        deviceSync: null, 
        databaseSave: 'loading', 
        message: 'Saving employee to database...' 
      });

      console.log('🚀 Starting employee registration (Database-First)...');
      
      // Prepare registration payload
      const registrationPayload = {
        ...employeeData,
        faceImage: faceImage,
        profileImage: capturedImage
      };

      console.log('📤 Sending registration request...');
      
      // Call the registration endpoint
      const response = await axios.post('/api/employees/register', registrationPayload);
      
      console.log('📨 Registration response:', response.data);

      if (response.data.success) {
        const { employee, deviceEnrollment, selfServiceCredentials, steps } = response.data.data;
        
        // Database save completed
        setRegistrationStatus(prev => ({ 
          ...prev, 
          databaseSave: 'success',
          deviceSync: deviceEnrollment.status === 'success' ? 'success' : 
                      deviceEnrollment.status === 'failed' ? 'failed' : 
                      deviceEnrollment.status === 'error' ? 'error' : null,
          message: steps.deviceEnrollment === 'success' 
            ? '✅ Employee registered and synced to device!' 
            : steps.deviceEnrollment === 'failed' || steps.deviceEnrollment === 'error'
            ? '✅ Employee saved! Device sync failed (can retry later)'
            : '✅ Employee saved successfully!'
        }));

        // Show warnings if device enrollment failed
        if (deviceEnrollment.status === 'failed' || deviceEnrollment.status === 'error') {
          // Extract exact error details from Java service
          const errorCode = deviceEnrollment.errorCode ? `[${deviceEnrollment.errorCode}] ` : '';
          const errorMessage = deviceEnrollment.message || 'Unknown device error';
          
          toast.error(
            `❌ Device Enrollment Failed\n\n` +
            `${errorCode}${errorMessage}\n\n` +
            `✅ Employee record saved to database.\n` +
            `You can retry device sync later.`,
            { duration: 10000 }
          );
        }
        
        // Display generated PIN
        if (selfServiceCredentials) {
          const pinMessage = 
            `✅ EMPLOYEE ${deviceEnrollment.deviceSynced ? 'REGISTERED' : 'CREATED'} SUCCESSFULLY!\n\n` +
            `Employee: ${employee.firstName} ${employee.lastName}\n` +
            `Employee ID: ${employee.employeeId}\n` +
            `Staff ID: ${selfServiceCredentials.staffId}\n\n` +
            `🔑 SELF-SERVICE PORTAL CREDENTIALS:\n` +
            `Staff ID: ${selfServiceCredentials.staffId}\n` +
            `PIN: ${selfServiceCredentials.pin}\n\n` +
            `${!deviceEnrollment.deviceSynced ? '⚠️ DEVICE SYNC STATUS: Failed\n' : ''}` +
            `${!deviceEnrollment.deviceSynced ? 'Face enrollment to device failed but employee record was saved.\n' : ''}` +
            `${!deviceEnrollment.deviceSynced ? 'You can retry device sync later.\n\n' : ''}` +
            `⚠️ IMPORTANT:\n` +
            `• This PIN will only be shown ONCE\n` +
            `• Please save it securely\n` +
            `• Give this PIN to the employee\n` +
            `• Employee will be required to change PIN on first login\n\n` +
            `Employee Portal: ${window.location.origin}/employee-login`;
          
          alert(pinMessage);
          
          toast.success(
            `Employee saved! PIN: ${selfServiceCredentials.pin} (shown in alert)`, 
            { duration: 10000 }
          );
        } else {
          toast.success('Employee saved successfully!', { duration: 4000 });
        }
        
        return { success: true, data: response.data };
        
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
      if (step === 'database_save') {
        setRegistrationStatus({ 
          databaseSave: 'error',
          deviceSync: null,
          message: `Database save failed: ${message}` 
        });
        
        if (error.response?.status === 409) {
          toast.error('Employee already exists with this email or employee ID.');
        } else if (error.response?.status === 400) {
          toast.error(`Validation error: ${message}`);
        } else {
          toast.error(`Failed to save employee: ${message}`);
        }
      } else {
        // Generic error (not specific to a step)
        setRegistrationStatus({ 
          databaseSave: 'error',
          deviceSync: null,
          message: `Registration failed: ${message}` 
        });
        
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

  /**
   * Handle retry device sync for failed enrollments
   */
  const handleRetryDeviceSync = async () => {
    if (!employee || !employee._id) {
      toast.error('No employee selected for retry');
      return;
    }

    // Check if we have a captured image, if not prompt user to capture
    if (!capturedImage) {
      toast.error('Please capture a face image before retrying device sync');
      setShowCamera(true);
      return;
    }

    setLoading(true);
    
    try {
      toast.loading('Retrying device synchronization...', { id: 'retry-sync' });
      
      const payload = {
        faceImage: capturedImage
      };

      const response = await axios.post(`/api/employees/${employee._id}/retry-device-sync`, payload);
      
      toast.dismiss('retry-sync');
      
      if (response.data.success) {
        toast.success('✅ Device synchronization successful! Employee enrolled to biometric device.');
        
        // Update local employee data
        employee.deviceSyncStatus = 'synced';
        employee.deviceSyncAttempts = (employee.deviceSyncAttempts || 0) + 1;
        employee.lastDeviceSyncAttempt = new Date();
        
        // Force re-render by updating state
        setFormData(prev => ({ ...prev }));
        
        // Close modal after successful sync and trigger parent refresh
        setTimeout(() => {
          onClose(true); // Pass true to indicate data changed
        }, 1500);
      } else {
        // Show detailed error from backend
        const errorMsg = response.data.message || 'Unknown error';
        const errorCode = response.data.deviceErrorCode ? `[${response.data.deviceErrorCode}] ` : '';
        
        toast.error(
          `❌ Device Sync Failed\n\n${errorCode}${errorMsg}`,
          { duration: 8000 }
        );
        
        // Update employee with new attempt count
        employee.deviceSyncStatus = 'failed';
        employee.deviceSyncAttempts = (employee.deviceSyncAttempts || 0) + 1;
        employee.deviceSyncError = errorMsg;
      }
    } catch (error) {
      console.error('❌ Retry device sync error:', error);
      toast.dismiss('retry-sync');
      
      // Extract detailed error message from Java service
      const responseData = error.response?.data || {};
      const deviceErrorCode = responseData.deviceErrorCode ? `[${responseData.deviceErrorCode}] ` : '';
      const message = responseData.message || error.message || 'Retry failed';
      
      toast.error(
        `❌ Device Sync Failed\n\n${deviceErrorCode}${message}`,
        { duration: 8000 }
      );
    } finally {
      setLoading(false);
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

      const supportsSmartIntegration = selectedFacility.configuration?.integrationType === 'java-xo5';

      if (!supportsSmartIntegration) {
        toast.error('This facility does not support smart biometric device integration');
        return;
      }
      
      // Only require face image if facility supports integration
      if (!capturedImage) {
        toast.error('Please capture a face image for biometric enrollment');
        return;
      }
    }

    setLoading(true);

    try {
      if (employee) {
        // EDITING existing employee - use traditional update method
        console.log('📝 Updating existing employee...');
        
        const updatePayload = { ...formData };
        
        // Handle custom fields if "Other" is selected
        if (formData.allergies === 'Other' && formData.customAllergy) {
          updatePayload.allergies = formData.customAllergy;
        }
        if (formData.department === 'Other' && formData.customDepartment) {
          updatePayload.department = formData.customDepartment;
        }
        if (formData.designation === 'Other' && formData.customDesignation) {
          updatePayload.designation = formData.customDesignation;
        }
        if (formData.cadre === 'Other' && formData.customCadre) {
          updatePayload.cadre = formData.customCadre;
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
        
        // Prepare form data with custom fields if "Other" is selected
        const submissionData = { ...formData };
        if (formData.allergies === 'Other' && formData.customAllergy) {
          submissionData.allergies = formData.customAllergy;
        }
        if (formData.department === 'Other' && formData.customDepartment) {
          submissionData.department = formData.customDepartment;
        }
        if (formData.designation === 'Other' && formData.customDesignation) {
          submissionData.designation = formData.customDesignation;
        }
        if (formData.cadre === 'Other' && formData.customCadre) {
          submissionData.cadre = formData.customCadre;
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
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold text-gray-900">
              {employee ? 'Edit Employee' : 'Register New Employee'}
            </h3>
            
            {/* Device Sync Status Badge (for existing employees) */}
            {employee && employee.deviceSyncStatus && (
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                employee.deviceSyncStatus === 'synced' 
                  ? 'bg-green-100 text-green-800'
                  : employee.deviceSyncStatus === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : employee.deviceSyncStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : employee.deviceSyncStatus === 'syncing'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {employee.deviceSyncStatus === 'synced' && '✓ Device Synced'}
                {employee.deviceSyncStatus === 'failed' && '✗ Sync Failed'}
                {employee.deviceSyncStatus === 'pending' && '⏳ Pending Sync'}
                {employee.deviceSyncStatus === 'syncing' && '⟳ Syncing...'}
                {!['synced', 'failed', 'pending', 'syncing'].includes(employee.deviceSyncStatus) && employee.deviceSyncStatus}
              </span>
            )}
            
            {/* Sync error tooltip */}
            {employee && employee.deviceSyncStatus === 'failed' && employee.deviceSyncError && (
              <span className="text-xs text-red-600" title={employee.deviceSyncError}>
                ℹ {employee.deviceSyncError.substring(0, 30)}{employee.deviceSyncError.length > 30 ? '...' : ''}
              </span>
            )}
          </div>
          
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
            
            {/* Address Information Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Address Information</h4>
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
                  
                  {/* Custom Department Input - Shows when "Other" is selected */}
                  {formData.department === 'Other' && (
                    <input
                      type="text"
                      value={formData.customDepartment || ''}
                      onChange={(e) => setFormData({ ...formData, customDepartment: e.target.value })}
                      placeholder="Enter custom department name"
                      className="mt-2 block w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  )}
                </div>
                
                {/* Only show Unit field for KANO departments */}
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
                      placeholder={formData.department ? "Search unit..." : "Select department first"}
                      disabled={!formData.department}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    
                    {showUnitDropdown && unitSearch && filteredUnits.length === 0 && formData.department && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-3">
                        <p className="text-sm text-gray-500">No units found matching "{unitSearch}"</p>
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
                      placeholder={"Search designation/rank..."}
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
                  
                  {/* Custom Designation Input - Shows when "Other" is selected */}
                  {formData.designation === 'Other' && (
                    <input
                      type="text"
                      value={formData.customDesignation || ''}
                      onChange={(e) => setFormData({ ...formData, customDesignation: e.target.value })}
                      placeholder="Enter custom designation name"
                      className="mt-2 block w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  )}
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
                    
                    {showCadreDropdown && cadreSearch && filteredCadres.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-3">
                        <p className="text-sm text-gray-500">No cadres found matching "{cadreSearch}"</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Custom Cadre Input - Shows when "Other" is selected */}
                  {formData.cadre === 'Other' && (
                    <input
                      type="text"
                      value={formData.customCadre || ''}
                      onChange={(e) => setFormData({ ...formData, customCadre: e.target.value })}
                      placeholder="Enter custom cadre name"
                      className="mt-2 block w-full border border-blue-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  )}
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
                    
                    {showNationalityDropdown && filteredCountries.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredCountries.map((country, index) => (
                          <div
                            key={index}
                            onClick={() => handleNationalitySelect(country)}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                              formData.nationality === country ? 'bg-blue-100' : ''
                            }`}
                          >
                            <span>{country}</span>
                            {formData.nationality === country && (
                              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {showNationalityDropdown && nationalitySearch && filteredCountries.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg px-3 py-2 text-gray-500">
                        No matching countries found
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

                <div>
                  <label className="block text-sm font-medium text-gray-700">Salary Grade</label>
                  <select
                    name="salaryGrade"
                    value={formData.salaryGrade}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700">Manual Salary Override</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="Leave empty to use salary grade"
                    min="0"
                    step="1000"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Overrides salary grade if set</p>
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

                    {/* Upload Method Toggle */}
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-gray-900 mb-3">Choose Photo Method</h5>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUploadMethod('camera');
                            setCapturedImage(null);
                            if (showCamera) stopCamera();
                            setShowCamera(false);
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
                          muted
                          className="w-full h-80 object-contain"
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
                        onError={(e) => {
                          console.error('Failed to load image:', capturedImage);
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                        onLoad={() => console.log('Image loaded successfully:', capturedImage)}
                      />
                      <div style={{ display: 'none' }} className="absolute inset-0 bg-gray-100 rounded-lg shadow-lg border-4 border-yellow-200 flex flex-col items-center justify-center">
                        <XCircleIcon className="h-16 w-16 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Image failed to load</p>
                        <button
                          type="button"
                          onClick={retakeImage}
                          className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Capture new photo
                        </button>
                      </div>
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
              
              {/* Retry Device Sync Button - Show for existing employees with failed sync */}
              {employee && (employee.deviceSyncStatus === 'failed' || employee.deviceSyncStatus === 'pending') && (
                <button
                  type="button"
                  onClick={handleRetryDeviceSync}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="Retry synchronizing this employee to the biometric device"
                >
                  <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Retry Device Sync
                </button>
              )}
              
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