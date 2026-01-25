import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  ClockIcon,
  ArrowLeftIcon,
  IdentificationIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();

  // Debug: Log employee data
  React.useEffect(() => {
    console.log('Employee data:', employee);
    console.log('Profile image:', employee?.profileImage);
  }, [employee]);

  const profileSections = [
    {
      title: 'Personal Information',
      fields: [
        { label: 'Full Name', value: employee?.fullName || `${employee?.firstName} ${employee?.lastName}`, icon: UserIcon },
        { label: 'Staff ID', value: employee?.staffId, icon: IdentificationIcon },
        { label: 'Employee ID', value: employee?.employeeId, icon: IdentificationIcon },
        { label: 'Email', value: employee?.email, icon: EnvelopeIcon },
        { label: 'Phone', value: employee?.phone || 'Not provided', icon: PhoneIcon },
        { label: 'Gender', value: employee?.gender || 'Not specified', icon: UserIcon }
      ]
    },
    {
      title: 'Work Information',
      fields: [
        { label: 'Facility', value: employee?.facility?.name || 'Not assigned', icon: BuildingOfficeIcon },
        { label: 'Department', value: employee?.department || 'Not assigned', icon: BriefcaseIcon },
        { label: 'Designation', value: employee?.designation || 'Not assigned', icon: BriefcaseIcon },
        { label: 'Shift', value: employee?.shift?.name || 'Not assigned', icon: ClockIcon },
        { 
          label: 'Shift Hours', 
          value: employee?.shift?.startTime && employee?.shift?.endTime 
            ? `${employee.shift.startTime} - ${employee.shift.endTime}` 
            : 'Not assigned',
          icon: ClockIcon 
        }
      ]
    },
    {
      title: 'Account Information',
      fields: [
        { 
          label: 'Last Login', 
          value: employee?.lastEmployeeLogin 
            ? new Date(employee.lastEmployeeLogin).toLocaleString() 
            : 'Never',
          icon: CalendarIcon 
        },
        { 
          label: 'Self-Service Status', 
          value: employee?.employeeSelfServiceEnabled ? 'Enabled' : 'Disabled',
          icon: UserIcon,
          badge: employee?.employeeSelfServiceEnabled ? 'green' : 'gray'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/employee-app/dashboard')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your personal and work information
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {employee?.profileImage ? (
                <img
                  src={employee.profileImage.startsWith('data:') ? employee.profileImage : `${API_URL}${employee.profileImage}`}
                  alt={`${employee?.firstName} ${employee?.lastName}`}
                  className="h-24 w-24 rounded-full object-cover border-4 border-blue-100"
                  onError={(e) => {
                    console.error('Image failed to load:', e.target.src);
                    e.target.style.display = 'none';
                    e.target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`bg-blue-100 rounded-full p-4 ${employee?.profileImage ? 'hidden' : ''}`}>
                <UserIcon className="h-16 w-16 text-blue-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {employee?.fullName || `${employee?.firstName} ${employee?.lastName}`}
              </h2>
              <p className="text-gray-600">{employee?.designation || 'Employee'}</p>
              <p className="text-sm text-gray-500 mt-1">
                {employee?.facility?.facilityName || 'No facility assigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Sections */}
        {profileSections.map((section, index) => (
          <div key={index} className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              {section.title}
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.fields.map((field, fieldIndex) => (
                <div key={fieldIndex} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <field.icon className="h-5 w-5 text-gray-400 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      {field.value}
                      {field.badge && (
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          field.badge === 'green' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {field.value}
                        </span>
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        ))}

        {/* Contact Support */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Need to update your information?
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            If you need to update any of your personal or work information, please contact your HR department.
          </p>
          <button className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            <EnvelopeIcon className="h-5 w-5 mr-2" />
            Contact HR
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
