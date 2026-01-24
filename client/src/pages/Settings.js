import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon,
  Clock,
  Bell,
  FileText,
  Database,
  Save,
  RefreshCw,
  Mail,
  Send,
  DollarSign,
  CreditCard
} from 'lucide-react';
import StaffIdPrefixSettings from './StaffIdPrefixSettings';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [payrollSettings, setPayrollSettings] = useState({
    overtimeRate: 1.5,
    taxRate: 0.10,
    pensionRate: 0.08,
    insuranceRate: 0,
    insuranceType: 'none',
    workingDaysPerMonth: 22,
    hoursPerDay: 8,
    companyName: '',
    payrollCurrency: 'NGN'
  });
  const [settings, setSettings] = useState({
    // General Settings
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    
    // Attendance Settings
    workStartTime: '09:00',
    workEndTime: '17:00',
    workingHoursPerDay: 8,
    lateArrivalThreshold: 15,
    halfDayThreshold: 4,
    overtimeThreshold: 8,
    autoMarkAbsent: true,
    
    // Notification Settings
    emailNotifications: true,
    lateArrivalNotification: true,
    absentNotification: true,
    reportNotification: false,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    
    // Reporting Settings
    defaultReportFormat: 'pdf',
    includePhotos: true,
    autoGenerateReports: false,
    
    // System Settings
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90
  });

  useEffect(() => {
    fetchSettings();
    fetchPayrollSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/settings');
      const settingsData = response.data.data;
      
      // Convert array of settings to object
      const settingsObj = {};
      settingsData.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      
      setSettings(prev => ({ ...prev, ...settingsObj }));
    } catch (error) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollSettings = async () => {
    try {
      const response = await axios.get('/api/payroll-settings');
      if (response.data.success) {
        setPayrollSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payroll settings:', error);
    }
  };

  const handleSavePayrollSettings = async () => {
    setSaving(true);
    try {
      const response = await axios.put('/api/payroll-settings', payrollSettings);
      if (response.data.success) {
        toast.success('Payroll settings saved successfully');
        fetchPayrollSettings();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save payroll settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Handle payroll settings separately
      if (activeTab === 'payroll') {
        await handleSavePayrollSettings();
        return;
      }

      // Get settings for active tab
      const tabSettings = getTabSettings();
      
      // Update each setting
      const promises = Object.keys(tabSettings).map(key => {
        const category = getCategoryForKey(key);
        return axios.put(`/api/settings/${key}`, {
          key,
          value: settings[key],
          category,
          description: getDescriptionForKey(key)
        });
      });
      
      await Promise.all(promises);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address to test');
      return;
    }

    setTestingEmail(true);
    try {
      await axios.post('/api/settings/test-email', { testEmail });
      toast.success('Test email sent successfully! Check your inbox.');
      setTestEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const getTabSettings = () => {
    const tabs = {
      general: ['companyName', 'companyEmail', 'companyPhone', 'timezone', 'dateFormat'],
      attendance: ['workStartTime', 'workEndTime', 'workingHoursPerDay', 'lateArrivalThreshold', 'halfDayThreshold', 'overtimeThreshold', 'autoMarkAbsent'],
      notification: ['emailNotifications', 'lateArrivalNotification', 'absentNotification', 'reportNotification', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail'],
      reporting: ['defaultReportFormat', 'includePhotos', 'autoGenerateReports'],
      system: ['sessionTimeout', 'maxLoginAttempts', 'passwordExpiry']
    };
    
    const keys = tabs[activeTab] || [];
    const result = {};
    keys.forEach(key => {
      result[key] = settings[key];
    });
    return result;
  };

  const getCategoryForKey = (key) => {
    if (['companyName', 'companyEmail', 'companyPhone', 'timezone', 'dateFormat'].includes(key)) return 'general';
    if (['workStartTime', 'workEndTime', 'workingHoursPerDay', 'lateArrivalThreshold', 'halfDayThreshold', 'overtimeThreshold', 'autoMarkAbsent'].includes(key)) return 'attendance';
    if (['emailNotifications', 'lateArrivalNotification', 'absentNotification', 'reportNotification', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail'].includes(key)) return 'notification';
    if (['defaultReportFormat', 'includePhotos', 'autoGenerateReports'].includes(key)) return 'reporting';
    return 'system';
  };

  const getDescriptionForKey = (key) => {
    const descriptions = {
      companyName: 'Company or organization name',
      companyEmail: 'Company contact email',
      companyPhone: 'Company contact phone',
      timezone: 'Default timezone for the system',
      dateFormat: 'Date display format',
      workStartTime: 'Default work start time',
      workEndTime: 'Default work end time',
      workingHoursPerDay: 'Standard working hours per day',
      lateArrivalThreshold: 'Minutes after shift start to mark as late',
      halfDayThreshold: 'Hours worked to consider as half day',
      overtimeThreshold: 'Hours after which overtime is calculated',
      autoMarkAbsent: 'Automatically mark employees absent if no check-in',
      emailNotifications: 'Enable email notifications',
      lateArrivalNotification: 'Notify on late arrivals',
      absentNotification: 'Notify on absences',
      reportNotification: 'Send scheduled report notifications',
      smtpHost: 'SMTP server hostname',
      smtpPort: 'SMTP server port',
      smtpUser: 'SMTP username/email',
      smtpPassword: 'SMTP password',
      fromEmail: 'From email address',
      defaultReportFormat: 'Default format for reports',
      includePhotos: 'Include employee photos in reports',
      autoGenerateReports: 'Automatically generate daily reports',
      sessionTimeout: 'Session timeout in minutes',
      maxLoginAttempts: 'Maximum failed login attempts',
      passwordExpiry: 'Password expiry in days'
    };
    return descriptions[key] || '';
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'staff-prefix', label: 'Staff ID Prefix', icon: CreditCard },
    { id: 'notification', label: 'Notifications', icon: Bell },
    { id: 'reporting', label: 'Reporting', icon: FileText },
    { id: 'system', label: 'System', icon: Database }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              System Settings
            </h1>
            <p className="text-gray-600 mt-1">Configure system preferences and parameters</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={fetchSettings}
            className="flex-1 sm:flex-none bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 border-b-2 transition-all whitespace-nowrap min-w-0 flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 font-medium bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="card">{/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">General Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Company Name</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="label">Company Email</label>
                  <input
                    type="email"
                    className="input"
                    value={settings.companyEmail}
                    onChange={(e) => handleChange('companyEmail', e.target.value)}
                    placeholder="company@example.com"
                  />
                </div>

                <div>
                  <label className="label">Company Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={settings.companyPhone}
                    onChange={(e) => handleChange('companyPhone', e.target.value)}
                    placeholder="+1 (234) 567-8900"
                  />
                </div>

                <div>
                  <label className="label">Timezone</label>
                  <select
                    className="input"
                    value={settings.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Kolkata">India (IST)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Date Format</label>
                  <select
                    className="input"
                    value={settings.dateFormat}
                    onChange={(e) => handleChange('dateFormat', e.target.value)}
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Settings */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Attendance Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Work Start Time</label>
                  <input
                    type="time"
                    className="input"
                    value={settings.workStartTime}
                    onChange={(e) => handleChange('workStartTime', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Default time employees should start work</p>
                </div>

                <div>
                  <label className="label">Work End Time</label>
                  <input
                    type="time"
                    className="input"
                    value={settings.workEndTime}
                    onChange={(e) => handleChange('workEndTime', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Default time employees should finish work</p>
                </div>

                <div>
                  <label className="label">Working Hours Per Day</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.workingHoursPerDay}
                    onChange={(e) => handleChange('workingHoursPerDay', Number(e.target.value))}
                    min="1"
                    max="24"
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard working hours per day</p>
                </div>

                <div>
                  <label className="label">Late Arrival Threshold (minutes)</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.lateArrivalThreshold}
                    onChange={(e) => handleChange('lateArrivalThreshold', Number(e.target.value))}
                    min="0"
                    max="120"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mark as late after this many minutes</p>
                </div>

                <div>
                  <label className="label">Half Day Threshold (hours)</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.halfDayThreshold}
                    onChange={(e) => handleChange('halfDayThreshold', Number(e.target.value))}
                    min="1"
                    max="12"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Hours worked to consider as half day</p>
                </div>

                <div>
                  <label className="label">Overtime Threshold (hours)</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.overtimeThreshold}
                    onChange={(e) => handleChange('overtimeThreshold', Number(e.target.value))}
                    min="1"
                    max="24"
                  />
                  <p className="text-xs text-gray-500 mt-1">Hours after which overtime starts</p>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      checked={settings.autoMarkAbsent}
                      onChange={(e) => handleChange('autoMarkAbsent', e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Automatically mark employees as absent if no check-in
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Payroll Settings */}
          {activeTab === 'staff-prefix' && (
            <StaffIdPrefixSettings />
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Payroll Configuration</h3>
                  <p className="text-sm text-gray-600 mt-1">Configure payroll calculation parameters and rates</p>
                </div>
                <div className="text-sm text-gray-500">
                  Last updated: {payrollSettings.updatedAt ? new Date(payrollSettings.updatedAt).toLocaleDateString() : 'Never'}
                </div>
              </div>

              {/* Working Schedule */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Working Schedule
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Working Days Per Month</label>
                    <input
                      type="number"
                      className="input"
                      value={payrollSettings.workingDaysPerMonth}
                      onChange={(e) => setPayrollSettings(prev => ({ ...prev, workingDaysPerMonth: Number(e.target.value) }))}
                      min="20"
                      max="31"
                    />
                    <p className="text-xs text-gray-600 mt-1">Standard working days in a month (typically 22)</p>
                  </div>

                  <div>
                    <label className="label">Hours Per Day</label>
                    <input
                      type="number"
                      className="input"
                      value={payrollSettings.hoursPerDay}
                      onChange={(e) => setPayrollSettings(prev => ({ ...prev, hoursPerDay: Number(e.target.value) }))}
                      min="6"
                      max="12"
                      step="0.5"
                    />
                    <p className="text-xs text-gray-600 mt-1">Standard working hours per day (typically 8)</p>
                  </div>
                </div>
              </div>

              {/* Earnings Rates */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Earnings & Rates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Overtime Rate Multiplier</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="input flex-1"
                        value={payrollSettings.overtimeRate}
                        onChange={(e) => setPayrollSettings(prev => ({ ...prev, overtimeRate: Number(e.target.value) }))}
                        min="1.0"
                        max="3.0"
                        step="0.1"
                      />
                      <span className="text-sm font-medium text-gray-700">×</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Overtime pay = Hourly rate × {payrollSettings.overtimeRate}</p>
                  </div>

                  <div>
                    <label className="label">Currency</label>
                    <select
                      className="input"
                      value={payrollSettings.payrollCurrency}
                      onChange={(e) => setPayrollSettings(prev => ({ ...prev, payrollCurrency: e.target.value }))}
                    >
                      <option value="NGN">NGN (₦) - Nigerian Naira</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </select>
                    <p className="text-xs text-gray-600 mt-1">Currency for payroll calculations</p>
                  </div>
                </div>
              </div>

              {/* Deduction Rates */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-4">Deduction Rates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Tax Rate (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="input flex-1"
                        value={(payrollSettings.taxRate * 100).toFixed(1)}
                        onChange={(e) => setPayrollSettings(prev => ({ ...prev, taxRate: Number(e.target.value) / 100 }))}
                        min="0"
                        max="50"
                        step="0.5"
                      />
                      <span className="text-sm font-medium text-gray-700">%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Tax deduction from gross pay</p>
                  </div>

                  <div>
                    <label className="label">Pension Rate (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="input flex-1"
                        value={(payrollSettings.pensionRate * 100).toFixed(1)}
                        onChange={(e) => setPayrollSettings(prev => ({ ...prev, pensionRate: Number(e.target.value) / 100 }))}
                        min="0"
                        max="20"
                        step="0.5"
                      />
                      <span className="text-sm font-medium text-gray-700">%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Pension contribution from gross pay</p>
                  </div>

                  <div>
                    <label className="label">Insurance Rate (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="input flex-1"
                        value={(payrollSettings.insuranceRate * 100).toFixed(1)}
                        onChange={(e) => setPayrollSettings(prev => ({ ...prev, insuranceRate: Number(e.target.value) / 100 }))}
                        min="0"
                        max="10"
                        step="0.1"
                      />
                      <span className="text-sm font-medium text-gray-700">%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Insurance deduction from gross pay</p>
                  </div>
                </div>
              </div>

              {/* Insurance Settings */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-4">Insurance Configuration</h4>
                <div>
                  <label className="label">Insurance Type</label>
                  <select
                    className="input"
                    value={payrollSettings.insuranceType}
                    onChange={(e) => setPayrollSettings(prev => ({ ...prev, insuranceType: e.target.value }))}
                  >
                    <option value="none">No Insurance</option>
                    <option value="health">Health Insurance</option>
                    <option value="life">Life Insurance</option>
                    <option value="both">Health & Life Insurance</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Type of insurance coverage provided</p>
                </div>
              </div>

              {/* Company Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Company Information</h4>
                <div>
                  <label className="label">Company Name (for Payslips)</label>
                  <input
                    type="text"
                    className="input"
                    value={payrollSettings.companyName}
                    onChange={(e) => setPayrollSettings(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter company name"
                  />
                  <p className="text-xs text-gray-600 mt-1">Company name that appears on payslips</p>
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">💡 Calculation Example</h4>
                <p className="text-sm text-gray-700 mb-3">Based on current settings, for a ₦100,000 monthly salary:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Salary:</span>
                    <span className="font-semibold">₦100,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hourly Rate:</span>
                    <span className="font-semibold">
                      ₦{(100000 / (payrollSettings.workingDaysPerMonth * payrollSettings.hoursPerDay)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overtime Rate (per hour):</span>
                    <span className="font-semibold">
                      ₦{((100000 / (payrollSettings.workingDaysPerMonth * payrollSettings.hoursPerDay)) * payrollSettings.overtimeRate).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 my-2"></div>
                  <div className="flex justify-between text-red-600">
                    <span>Tax ({(payrollSettings.taxRate * 100).toFixed(1)}%):</span>
                    <span className="font-semibold">-₦{(100000 * payrollSettings.taxRate).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Pension ({(payrollSettings.pensionRate * 100).toFixed(1)}%):</span>
                    <span className="font-semibold">-₦{(100000 * payrollSettings.pensionRate).toFixed(2)}</span>
                  </div>
                  {payrollSettings.insuranceRate > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Insurance ({(payrollSettings.insuranceRate * 100).toFixed(1)}%):</span>
                      <span className="font-semibold">-₦{(100000 * payrollSettings.insuranceRate).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 my-2"></div>
                  <div className="flex justify-between text-green-600 text-base font-bold">
                    <span>Net Pay:</span>
                    <span>
                      ₦{(100000 - (100000 * payrollSettings.taxRate) - (100000 * payrollSettings.pensionRate) - (100000 * payrollSettings.insuranceRate)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Important:</strong> Changes to these settings will affect all future payroll calculations. 
                  Existing payroll records will not be automatically recalculated.
                </p>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notification' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">📧 Email Configuration</h3>
              <p className="text-sm text-gray-600 mb-4">Configure SMTP settings to enable email notifications</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="label">SMTP Host</label>
                  <input
                    type="text"
                    className="input"
                    value={settings.smtpHost}
                    onChange={(e) => handleChange('smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your email server hostname</p>
                </div>

                <div>
                  <label className="label">SMTP Port</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.smtpPort}
                    onChange={(e) => handleChange('smtpPort', e.target.value)}
                    placeholder="587"
                  />
                  <p className="text-xs text-gray-500 mt-1">Port 587 (TLS) or 465 (SSL)</p>
                </div>

                <div>
                  <label className="label">SMTP Username / Email</label>
                  <input
                    type="email"
                    className="input"
                    value={settings.smtpUser}
                    onChange={(e) => handleChange('smtpUser', e.target.value)}
                    placeholder="your-email@company.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email address for sending</p>
                </div>

                <div>
                  <label className="label">SMTP Password</label>
                  <input
                    type="password"
                    className="input"
                    value={settings.smtpPassword}
                    onChange={(e) => handleChange('smtpPassword', e.target.value)}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Gmail, use App Password</p>
                </div>

                <div className="md:col-span-2">
                  <label className="label">From Email Address</label>
                  <input
                    type="email"
                    className="input"
                    value={settings.fromEmail}
                    onChange={(e) => handleChange('fromEmail', e.target.value)}
                    placeholder="no-reply@company.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Display name for outgoing emails</p>
                </div>

                {/* Test Email */}
                <div className="md:col-span-2">
                  <label className="label">Test Email Configuration</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      className="input flex-1"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                    <button
                      onClick={handleTestEmail}
                      disabled={testingEmail || !testEmail}
                      className="btn btn-secondary"
                    >
                      <Send className="w-4 h-4" />
                      {testingEmail ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Send a test email to verify your SMTP configuration
                  </p>
                </div>
              </div>

              <hr className="my-6" />

              <h3 className="text-lg font-semibold text-gray-800 mb-4">🔔 Notification Preferences</h3>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Email Notifications</span>
                    <p className="text-sm text-gray-500">Enable or disable all email notifications</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={settings.lateArrivalNotification}
                    onChange={(e) => handleChange('lateArrivalNotification', e.target.checked)}
                    disabled={!settings.emailNotifications}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Late Arrival Notifications</span>
                    <p className="text-sm text-gray-500">Notify supervisors when employees arrive late</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={settings.absentNotification}
                    onChange={(e) => handleChange('absentNotification', e.target.checked)}
                    disabled={!settings.emailNotifications}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Absent Notifications</span>
                    <p className="text-sm text-gray-500">Notify when employees are marked absent</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={settings.reportNotification}
                    onChange={(e) => handleChange('reportNotification', e.target.checked)}
                    disabled={!settings.emailNotifications}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Report Notifications</span>
                    <p className="text-sm text-gray-500">Send scheduled attendance reports via email</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Reporting Settings */}
          {activeTab === 'reporting' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Reporting Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Default Report Format</label>
                  <select
                    className="input"
                    value={settings.defaultReportFormat}
                    onChange={(e) => handleChange('defaultReportFormat', e.target.value)}
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Preferred format for generated reports</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={settings.includePhotos}
                    onChange={(e) => handleChange('includePhotos', e.target.checked)}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Include Employee Photos</span>
                    <p className="text-sm text-gray-500">Include employee photos in PDF reports</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    checked={settings.autoGenerateReports}
                    onChange={(e) => handleChange('autoGenerateReports', e.target.checked)}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Auto-Generate Daily Reports</span>
                    <p className="text-sm text-gray-500">Automatically generate reports at end of day</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">System Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleChange('sessionTimeout', Number(e.target.value))}
                    min="5"
                    max="1440"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto logout after inactivity</p>
                </div>

                <div>
                  <label className="label">Max Login Attempts</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleChange('maxLoginAttempts', Number(e.target.value))}
                    min="3"
                    max="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lock account after failed attempts</p>
                </div>

                <div>
                  <label className="label">Password Expiry (days)</label>
                  <input
                    type="number"
                    className="input"
                    value={settings.passwordExpiry}
                    onChange={(e) => handleChange('passwordExpiry', Number(e.target.value))}
                    min="30"
                    max="365"
                  />
                  <p className="text-xs text-gray-500 mt-1">Force password change after days</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default Settings;
