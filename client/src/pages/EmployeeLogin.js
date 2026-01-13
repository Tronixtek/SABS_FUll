import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { UserCircleIcon, LockClosedIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const EmployeeLogin = () => {
  const navigate = useNavigate();
  const { employeeLogin, loading: authLoading } = useEmployeeAuth();
  
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // PIN pad buttons (0-9, Clear, Login)
  const handlePinClick = (digit) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  const handleClearPin = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!staffId.trim()) {
      setError('Please enter your Staff ID');
      return;
    }

    if (!pin || pin.length < 4) {
      setError('Please enter your 4-6 digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    const result = await employeeLogin(staffId, pin);

    if (result.success) {
      navigate('/employee-app/dashboard');
    } else {
      setError(result.message);
      setPin(''); // Clear PIN on failed attempt
    }

    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Back to Staff Login */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4">
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Staff Login
        </Link>
      </div>

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-full">
            <UserCircleIcon className="h-12 w-12 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Employee Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in with your Staff ID and PIN
        </p>
      </div>

      {/* Login Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Staff ID Input */}
            <div>
              <label htmlFor="staffId" className="block text-sm font-medium text-gray-700">
                Staff ID
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircleIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="staffId"
                  name="staffId"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. KNLG0001"
                  value={staffId}
                  onChange={(e) => {
                    setStaffId(e.target.value.toUpperCase());
                    setError('');
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg uppercase"
                  disabled={loading}
                />
              </div>
            </div>

            {/* PIN Display */}
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                PIN
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  readOnly
                  value={pin}
                  placeholder="Enter your PIN"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-lg text-center tracking-widest"
                />
              </div>
            </div>

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinClick(digit.toString())}
                  disabled={loading}
                  className="py-4 px-6 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg text-xl font-semibold text-gray-700 transition-colors"
                >
                  {digit}
                </button>
              ))}
              
              {/* Clear Button */}
              <button
                type="button"
                onClick={handleClearPin}
                disabled={loading}
                className="py-4 px-6 bg-red-100 hover:bg-red-200 disabled:bg-red-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-red-700 transition-colors"
              >
                Clear
              </button>

              {/* 0 Button */}
              <button
                type="button"
                onClick={() => handlePinClick('0')}
                disabled={loading}
                className="py-4 px-6 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg text-xl font-semibold text-gray-700 transition-colors"
              >
                0
              </button>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading || !staffId || pin.length < 4}
                className="py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6">
            <p className="text-center text-xs text-gray-500">
              Forgot your PIN? Contact your HR department for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;
