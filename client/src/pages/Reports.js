import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Reports = () => {
  // Helper function to format image URL
  const formatImageUrl = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('data:')) return profileImage;
    if (profileImage.startsWith('http')) return profileImage;
    return `${API_URL}${profileImage}`;
  };
  const [reportType, setReportType] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [filters, setFilters] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-01'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    facility: ''
  });

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('/api/facilities');
      setFacilities(response.data.data);
    } catch (error) {
      console.error('Failed to fetch facilities');
    }
  };

  const handleReportTypeChange = (newType) => {
    setReportType(newType);
    setReportData(null); // Clear existing report data
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let params = {};

      switch (reportType) {
        case 'daily':
          endpoint = '/api/reports/daily';
          params = { date: filters.date, facility: filters.facility };
          break;
        case 'monthly':
          endpoint = '/api/reports/monthly';
          params = { month: filters.month, year: filters.year, facility: filters.facility };
          break;
        case 'custom':
          endpoint = '/api/reports/custom';
          params = { 
            startDate: filters.startDate, 
            endDate: filters.endDate, 
            facility: filters.facility 
          };
          break;
        case 'payroll':
          endpoint = '/api/reports/payroll';
          params = { month: filters.month, year: filters.year, facility: filters.facility };
          break;
        default:
          break;
      }

      const response = await axios.get(endpoint, { params });
      setReportData(response.data.data);
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Handle payroll report CSV export
    if (reportType === 'payroll') {
      if (!reportData || !reportData.payrolls || reportData.payrolls.length === 0) {
        toast.error('No data to export');
        return;
      }

      const headers = ['Employee ID', 'Name', 'Department', 'Hours', 'Overtime', 'Basic Pay', 'Overtime Pay', 'Gross Earnings', 'Tax', 'Pension', 'Deductions', 'Net Pay', 'Status'];
      const rows = reportData.payrolls.map(payroll => [
        payroll.employee?.employeeId || '',
        `${payroll.employee?.firstName || ''} ${payroll.employee?.lastName || ''}`.trim(),
        payroll.employee?.department || '',
        payroll.workHours.totalHours.toFixed(2),
        payroll.workHours.overtimeHours.toFixed(2),
        payroll.earnings.basicPay.toFixed(2),
        payroll.earnings.overtimePay.toFixed(2),
        payroll.earnings.total.toFixed(2),
        payroll.deductions.tax.toFixed(2),
        payroll.deductions.pension.toFixed(2),
        payroll.deductions.total.toFixed(2),
        payroll.netPay.toFixed(2),
        payroll.status
      ]);

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Payroll report exported successfully');
      return;
    }

    // Handle attendance report CSV export
    if (!reportData || !reportData.records || reportData.records.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Employee ID', 'Name', 'Department', 'Designation', 'Facility', 'Status', 'Check In', 'Check Out', 'Work Hours', 'Overtime'];
    const rows = reportData.records.map(record => {
      const formatTime = (timeValue) => {
        try {
          if (!timeValue) return '';
          const date = new Date(timeValue);
          if (isNaN(date.getTime())) return '';
          return format(date, 'hh:mm a');
        } catch (error) {
          console.warn('Invalid time in CSV export:', timeValue);
          return '';
        }
      };

      return [
        record.employee?.employeeId || '',
        `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
        record.employee?.department || '',
        record.employee?.designation || '',
        record.facility?.name || '',
        record.status || '',
        formatTime(record.checkIn?.time),
        formatTime(record.checkOut?.time),
        record.workHours?.toFixed(2) || '0.00',
        record.overtime?.toFixed(2) || '0.00'
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const exportToPDF = async () => {
    if (!reportData) {
      toast.error('Generate a report first');
      return;
    }

    try {
      toast.loading('Generating PDF report...');
      
      // Handle payroll PDF export
      if (reportType === 'payroll') {
        const params = new URLSearchParams({
          month: filters.month,
          year: filters.year,
          ...(filters.facility && { facility: filters.facility })
        });

        const response = await fetch(`/api/reports/payroll-pdf?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to generate PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.dismiss();
        toast.success('Payroll PDF report downloaded successfully!');
        return;
      }
      
      // Prepare query parameters for attendance PDF generation
      const params = new URLSearchParams({
        type: reportType,
        ...(reportType === 'daily' && { date: filters.date }),
        ...(reportType === 'monthly' && { month: filters.month, year: filters.year }),
        ...(reportType === 'custom' && { startDate: filters.startDate, endDate: filters.endDate }),
        ...(filters.facility && { facility: filters.facility })
      });

      // Make request to server-side PDF generation
      const response = await fetch(`/api/reports/pdf?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Add auth if needed
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('PDF report downloaded successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate PDF report');
      console.error('PDF export error:', error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-1">Generate and export attendance reports</p>
          </div>
        </div>
        {reportData && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={exportToCSV}
              className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Report Type</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => handleReportTypeChange('daily')}
            className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
              reportType === 'daily'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" />
              <div>
                <p className="font-medium">Daily Report</p>
                <p className="text-sm opacity-75">Single day attendance</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleReportTypeChange('monthly')}
            className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
              reportType === 'monthly'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5" />
              <div>
                <p className="font-medium">Monthly Report</p>
                <p className="text-sm opacity-75">Full month analysis</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleReportTypeChange('custom')}
            className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
              reportType === 'custom'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5" />
              <div>
                <p className="font-medium">Custom Report</p>
                <p className="text-sm opacity-75">Date range selection</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => handleReportTypeChange('payroll')}
            className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
              reportType === 'payroll'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <div>
                <p className="font-medium">Payroll Report</p>
                <p className="text-sm opacity-75">Salary & payments</p>
              </div>
            </div>
          </button>
        </div>

        {/* Filters based on report type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportType === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
          )}

          {(reportType === 'monthly' || reportType === 'payroll') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                />
              </div>
            </>
          )}

          {reportType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </>
          )}

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
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={generateReport}
            disabled={loading}
            className={`w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              loading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {reportData && reportType !== 'payroll' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 lg:p-6 border border-gray-100 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Employees</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700 mt-1">
                  {reportData.statistics?.totalEmployees || 0}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-200 rounded-full flex-shrink-0 ml-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 lg:p-6 border border-gray-100 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-green-600 font-medium">Present</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700 mt-1">
                  {reportData.statistics?.present || 0}
                </p>
                {reportData.statistics?.totalEmployees > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {((reportData.statistics.present / reportData.statistics.totalEmployees) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-2 sm:p-3 bg-green-200 rounded-full flex-shrink-0 ml-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 lg:p-6 border border-gray-100 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-yellow-600 font-medium">Late</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-700 mt-1">
                  {reportData.statistics?.late || 0}
                </p>
                {reportData.statistics?.totalEmployees > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    {((reportData.statistics.late / reportData.statistics.totalEmployees) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-2 sm:p-3 bg-yellow-200 rounded-full flex-shrink-0 ml-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 lg:p-6 border border-gray-100 bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-red-600 font-medium">Absent</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-700 mt-1">
                  {reportData.statistics?.absent || 0}
                </p>
                {reportData.statistics?.totalEmployees > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {((reportData.statistics.absent / reportData.statistics.totalEmployees) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-2 sm:p-3 bg-red-200 rounded-full flex-shrink-0 ml-2">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-700" />
              </div>
            </div>
          </div>

          {/* Add Excused Card */}
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Excused</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">
                  {reportData.statistics?.excused || 0}
                </p>
                {reportData.statistics?.totalEmployees > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    {((reportData.statistics.excused / reportData.statistics.totalEmployees) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <CheckCircle className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>

          {/* Add Incomplete Card */}
          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Incomplete</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">
                  {reportData.statistics?.incomplete || 0}
                </p>
                {reportData.statistics?.totalEmployees > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    {((reportData.statistics.incomplete / reportData.statistics.totalEmployees) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <Clock className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Statistics Cards */}
      {reportData && reportType === 'payroll' && reportData.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Employees</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{reportData.summary.totalEmployees}</p>
              </div>
              <Users className="w-8 h-8 text-blue-700" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Gross Earnings</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  ₦{reportData.summary.totalGrossEarnings.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Total Deductions</p>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  ₦{reportData.summary.totalDeductions.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Net Pay</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">
                  ₦{reportData.summary.totalNetPay.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Display */}
      {reportData && reportType !== 'payroll' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {reportType === 'daily' && `Daily Report - ${format(new Date(reportData.date), 'MMM dd, yyyy')}`}
              {reportType === 'monthly' && `Monthly Report - ${new Date(0, filters.month - 1).toLocaleString('default', { month: 'long' })} ${filters.year}`}
              {reportType === 'custom' && `Custom Report - ${filters.startDate} to ${filters.endDate}`}
            </h3>
            <div className="text-sm text-gray-500">
              {reportData.records?.length || 0} records found
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Facility</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Work Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.records?.length > 0 ? (
                  reportData.records.map((record, index) => (
                    <tr key={index}>
                      <td className="font-medium">{record.employee?.employeeId}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          {record.employee?.profileImage ? (
                            <img
                              src={formatImageUrl(record.employee.profileImage)}
                              alt={`${record.employee.firstName} ${record.employee.lastName}`}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ${record.employee?.profileImage ? 'hidden' : ''}`}>
                            <Users className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {record.employee?.firstName} {record.employee?.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-gray-600">{record.employee?.department || '-'}</td>
                      <td className="text-sm text-gray-600">{record.employee?.designation || '-'}</td>
                      <td className="text-sm text-gray-600">{record.facility?.name || '-'}</td>
                      <td>
                        {record.checkIn?.time ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {(() => {
                              try {
                                const date = new Date(record.checkIn.time);
                                if (isNaN(date.getTime())) return '-';
                                return format(date, 'hh:mm a');
                              } catch (error) {
                                console.warn('Invalid check-in time:', record.checkIn.time);
                                return '-';
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        {record.checkOut?.time ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {(() => {
                              try {
                                const date = new Date(record.checkOut.time);
                                if (isNaN(date.getTime())) return '-';
                                return format(date, 'hh:mm a');
                              } catch (error) {
                                console.warn('Invalid check-out time:', record.checkOut.time);
                                return '-';
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="font-medium">
                        {record.workHours ? `${record.workHours.toFixed(2)} hrs` : '-'}
                      </td>
                      <td>
                        <span className={`badge ${
                          record.status === 'present' ? 'badge-success' : 
                          record.status === 'absent' ? 'badge-danger' : 
                          record.status === 'late' ? 'badge-warning' :
                          record.status === 'half-day' ? 'badge-info' :
                          'badge-gray'
                        }`}>
                          {record.status || (record.attendance?.present > 0 ? 'Present' : 'Absent')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center text-gray-500 py-8">
                      No data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Show Absent Employees if available */}
          {reportData.absentEmployees && reportData.absentEmployees.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-md font-semibold text-gray-800 mb-3">
                Absent Employees ({reportData.absentEmployees.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {reportData.absentEmployees.map((employee, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    {employee.profileImage ? (
                      <img
                        src={formatImageUrl(employee.profileImage)}
                        alt={`${employee.firstName} ${employee.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 rounded-full bg-red-200 flex items-center justify-center ${employee.profileImage ? 'hidden' : ''}`}>
                      <Users className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{employee.employeeId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payroll Report Table */}
      {reportData && reportType === 'payroll' && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Payroll Report - {reportData.period?.monthName} {reportData.period?.year}
            </h3>
            <div className="text-sm text-gray-500">
              {reportData.payrolls?.length || 0} employees
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">OT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.payrolls?.length > 0 ? (
                  reportData.payrolls.map((payroll, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payroll.employee?.employeeId}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payroll.employee?.firstName} {payroll.employee?.lastName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payroll.employee?.department}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {payroll.workHours.totalHours.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-green-600">
                        {payroll.workHours.overtimeHours.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                        ₦{payroll.earnings.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                        ₦{payroll.deductions.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                        ₦{payroll.netPay.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          payroll.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payroll.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payroll.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                      No payroll records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
