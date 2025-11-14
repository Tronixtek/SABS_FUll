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

const Reports = () => {
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
      
      // Prepare query parameters for PDF generation
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
        </div>
        {reportData && (
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="btn btn-secondary"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="btn btn-primary"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Report Type Selection */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <button
            onClick={() => handleReportTypeChange('daily')}
            className={`btn ${reportType === 'daily' ? 'btn-primary' : 'btn-outline'}`}
          >
            Daily Report
          </button>
          <button
            onClick={() => handleReportTypeChange('monthly')}
            className={`btn ${reportType === 'monthly' ? 'btn-primary' : 'btn-outline'}`}
          >
            Monthly Report
          </button>
          <button
            onClick={() => handleReportTypeChange('custom')}
            className={`btn ${reportType === 'custom' ? 'btn-primary' : 'btn-outline'}`}
          >
            Custom Report
          </button>
        </div>

        {/* Filters based on report type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportType === 'daily' && (
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <>
              <div>
                <label className="label">Month</label>
                <select
                  className="input"
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
                <label className="label">Year</label>
                <input
                  type="number"
                  className="input"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                />
              </div>
            </>
          )}

          {reportType === 'custom' && (
            <>
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  className="input"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </>
          )}

          <div>
            <label className="label">Facility</label>
            <select
              className="input"
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

        <div className="mt-4">
          <button
            onClick={generateReport}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Employees</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">
                  {reportData.statistics?.totalEmployees || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Users className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Present</p>
                <p className="text-3xl font-bold text-green-700 mt-1">
                  {reportData.statistics?.present || 0}
                </p>
                {reportData.statistics?.totalEmployees > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {((reportData.statistics.present / reportData.statistics.totalEmployees) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Late</p>
                <p className="text-3xl font-bold text-yellow-700 mt-1">
                  {reportData.statistics?.late || 0}
                </p>
                {reportData.statistics?.totalEmployees > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    {((reportData.statistics.late / reportData.statistics.totalEmployees) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <AlertCircle className="w-6 h-6 text-yellow-700" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Absent</p>
                <p className="text-3xl font-bold text-red-700 mt-1">
                  {reportData.statistics?.absent || 0}
                </p>
                {reportData.statistics?.totalEmployees > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {((reportData.statistics.absent / reportData.statistics.totalEmployees) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <XCircle className="w-6 h-6 text-red-700" />
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

      {/* Report Display */}
      {reportData && (
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
                              src={record.employee.profileImage}
                              alt={`${record.employee.firstName} ${record.employee.lastName}`}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
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
                        src={employee.profileImage}
                        alt={`${employee.firstName} ${employee.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center">
                        <Users className="w-5 h-5 text-red-600" />
                      </div>
                    )}
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
    </div>
  );
};

export default Reports;
