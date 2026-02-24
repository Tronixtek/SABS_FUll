import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MinusCircle,
  Download,
  RefreshCw,
  Coffee,
  Activity,
  Briefcase,
  Building2,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Attendance = () => {
  // Helper function to format image URL
  const formatImageUrl = (profileImage) => {
    if (!profileImage) return null;
    // If it's a base64 data URL, use it directly
    if (profileImage.startsWith('data:')) return profileImage;
    // If it's a full URL (starts with http), use it directly
    if (profileImage.startsWith('http')) return profileImage;
    // Otherwise, prepend API_URL
    return `${API_URL}${profileImage}`;
  };
  const [attendance, setAttendance] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0
  });
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    facility: '',
    status: ''
  });
  const [employeeModal, setEmployeeModal] = useState({ isOpen: false, data: null, loading: false });

  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [filters]);

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('/api/facilities');
      setFacilities(response.data.data);
    } catch (error) {
      console.error('Failed to fetch facilities');
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`/api/attendance?${params}`);
      setAttendance(response.data.data);
      calculateStats(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records) => {
    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'incomplete').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      halfDay: records.filter(r => r.status === 'half-day').length
    };
    setStats(stats);
  };

  const fetchEmployeeDetails = async (employeeId) => {
    setEmployeeModal({ isOpen: true, data: null, loading: true });
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate
      };

      const [employeeRes, attendanceRes] = await Promise.all([
        axios.get(`/api/employees/${employeeId}`),
        axios.get('/api/attendance', { 
          params: { ...params, employee: employeeId, limit: 30, sortBy: 'date', sortOrder: 'desc' }
        })
      ]);

      const employee = employeeRes.data.data;
      const attendanceRecords = (attendanceRes.data.data || []).filter(record => {
        return record && record.date && !isNaN(new Date(record.date).getTime());
      });

      // Calculate detailed metrics
      const metrics = {
        totalRecords: attendanceRecords.length,
        presentCount: attendanceRecords.filter(a => a.status === 'present').length,
        lateCount: attendanceRecords.filter(a => a.status === 'late').length,
        absentCount: attendanceRecords.filter(a => a.status === 'absent').length,
        totalWorkHours: attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0),
        totalOvertime: attendanceRecords.reduce((sum, a) => sum + (a.overtime || 0), 0),
        avgWorkHours: 0,
        avgLateMinutes: 0,
        recentAttendance: attendanceRecords.slice(0, 10)
      };

      metrics.avgWorkHours = metrics.totalRecords > 0 
        ? (metrics.totalWorkHours / metrics.totalRecords).toFixed(2) 
        : 0;

      const lateRecords = attendanceRecords.filter(a => a.lateMinutes > 0);
      metrics.avgLateMinutes = lateRecords.length > 0
        ? (lateRecords.reduce((sum, a) => sum + a.lateMinutes, 0) / lateRecords.length).toFixed(0)
        : 0;

      setEmployeeModal({ isOpen: true, data: { employee, metrics }, loading: false });
    } catch (error) {
      console.error('Failed to fetch employee details:', error);
      toast.error('Failed to load employee details. Please try again.');
      setEmployeeModal({ isOpen: false, data: null, loading: false });
    }
  };

  const formatDateForTable = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return '-';
    }
  };

  const exportToCSV = () => {
    if (attendance.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Employee ID', 'Employee Name', 'Facility', 'Check In', 'Check Out', 'Gross Hours', 'Break Time', 'Net Hours', 'Overtime', 'Status', 'Late (min)', 'Early Arrival (min)', 'Breaks Count', 'Break Compliance'];
    const rows = attendance.map(record => [
      format(new Date(record.date), 'yyyy-MM-dd'),
      record.employee?.employeeId || '',
      `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
      record.facility?.name || '',
      formatTime(record.checkIn?.time),
      formatTime(record.checkOut?.time),
      record.workHours?.toFixed(2) || '0.00',
      formatDuration(record.totalBreakTime || 0),
      record.netWorkHours?.toFixed(2) || record.workHours?.toFixed(2) || '0.00',
      record.overtime?.toFixed(2) || '0.00',
      record.status || '',
      record.lateArrival || '0',
      record.earlyArrival || '0',
      record.breaks?.length || '0',
      record.breakCompliance || 'none'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Attendance exported successfully');
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      'half-day': 'bg-blue-100 text-blue-800',
      'on-leave': 'bg-gray-100 text-gray-800',
      holiday: 'bg-blue-100 text-blue-800'
    };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`;
  };

  const formatTime = (time) => {
    return time ? format(new Date(time), 'hh:mm a') : 'N/A';
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getBreakComplianceColor = (compliance) => {
    switch (compliance) {
      case 'compliant': return 'text-green-600 bg-green-50';
      case 'exceeded': return 'text-red-600 bg-red-50';
      case 'insufficient': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Attendance Records
          </h1>
          <p className="text-gray-600 mt-1">Monitor daily attendance and track employee presence</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAttendance}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="btn btn-primary"
            disabled={loading || attendance.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 lg:p-6 border border-gray-100 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Total</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700 mt-1">{stats.total}</p>
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
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700 mt-1">{stats.present}</p>
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
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-700 mt-1">{stats.late}</p>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-200 rounded-full flex-shrink-0 ml-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-700" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 lg:p-6 border border-gray-100 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-purple-600 font-medium">Half Day</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-700 mt-1">{stats.halfDay}</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-200 rounded-full flex-shrink-0 ml-2">
              <MinusCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-700" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-3 sm:p-4 lg:p-6 border border-gray-100 bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-red-600 font-medium">Absent</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-700 mt-1">{stats.absent}</p>
            </div>
            <div className="p-2 sm:p-3 bg-red-200 rounded-full flex-shrink-0 ml-2">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter Attendance Records</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half-day">Half Day</option>
              <option value="on-leave">On Leave</option>
            </select>
          </div>
        </div>
        
        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={exportToCSV}
            className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchAttendance}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Attendance Table/Cards */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading attendance records...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Employee</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Facility</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Check In</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Check Out</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Breaks</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Work Hours</th>
                    <th className="text-left py-4 px-6 text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendance.length > 0 ? (
                    attendance.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 text-sm text-gray-900">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                        <td className="py-4 px-6">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors"
                            onClick={() => record.employee?._id && fetchEmployeeDetails(record.employee._id)}
                            title="Click to view employee details"
                          >
                            {record.employee?.profileImage ? (
                              <img
                                src={formatImageUrl(record.employee.profileImage)}
                                alt={`${record.employee.firstName} ${record.employee.lastName}`}
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${record.employee?.profileImage ? 'hidden' : ''}`}>
                              <Users className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {record.employee?.firstName} {record.employee?.lastName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {record.employee?.employeeId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700">{record.facility?.name}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-900">{formatTime(record.checkIn?.time)}</div>
                              {record.earlyArrival > 0 && (
                                <div className="text-xs text-green-600">🌅 {record.earlyArrival}m early</div>
                              )}
                              {record.lateArrival > 0 && (
                                <div className="text-xs text-red-600">⚠️ {record.lateArrival}m late</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-900">{formatTime(record.checkOut?.time)}</div>
                              {record.earlyDeparture > 0 && (
                                <div className="text-xs text-orange-600">🏃 {record.earlyDeparture}m early</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {record.breaks && record.breaks.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Coffee className="w-4 h-4 text-orange-500" />
                                <span className="font-medium">{formatDuration(record.totalBreakTime)}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {record.breaks.length} break{record.breaks.length > 1 ? 's' : ''}
                              </div>
                              {record.breakCompliance && record.breakCompliance !== 'none' && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getBreakComplianceColor(record.breakCompliance)}`}>
                                  {record.breakCompliance}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No breaks</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                              <Clock className="w-4 h-4" />
                              {record.netWorkHours 
                                ? `${record.netWorkHours.toFixed(2)}h` 
                                : record.workHours 
                                  ? `${record.workHours.toFixed(2)}h`
                                  : '-'}
                            </div>
                            {record.netWorkHours && record.workHours && (
                              <div className="text-xs text-gray-500">
                                Gross: {record.workHours.toFixed(2)}h
                              </div>
                            )}
                            {record.overtime > 0 && (
                              <div className="text-xs text-blue-600 font-medium">
                                +{record.overtime.toFixed(2)}h OT
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={getStatusBadge(record.status)}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-lg font-medium text-gray-900">No attendance records found</p>
                          <p className="text-gray-500">Try adjusting your date range or filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden p-4 space-y-4">
              {attendance.length > 0 ? (
                attendance.map((record) => (
                  <div key={record._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors flex-1"
                        onClick={() => record.employee?._id && fetchEmployeeDetails(record.employee._id)}
                        title="Click to view employee details"
                      >
                        {record.employee?.profileImage ? (
                          <img
                            src={formatImageUrl(record.employee.profileImage)}
                            alt={`${record.employee.firstName} ${record.employee.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${record.employee?.profileImage ? 'hidden' : ''}`}>
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {record.employee?.firstName} {record.employee?.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">ID: {record.employee?.employeeId}</p>
                        </div>
                      </div>
                      <span className={getStatusBadge(record.status)}>
                        {record.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Date:</span>
                        <p className="font-medium text-gray-900">{format(new Date(record.date), 'MMM dd, yyyy')}</p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Facility:</span>
                        <p className="font-medium text-gray-900">{record.facility?.name}</p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Check In:</span>
                        <div>
                          <p className="font-medium text-gray-900">{formatTime(record.checkIn?.time)}</p>
                          {record.earlyArrival > 0 && (
                            <p className="text-xs text-green-600">🌅 {record.earlyArrival}m early</p>
                          )}
                          {record.lateArrival > 0 && (
                            <p className="text-xs text-red-600">⚠️ {record.lateArrival}m late</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Check Out:</span>
                        <div>
                          <p className="font-medium text-gray-900">{formatTime(record.checkOut?.time)}</p>
                          {record.earlyDeparture > 0 && (
                            <p className="text-xs text-orange-600">🏃 {record.earlyDeparture}m early</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Work Hours:</span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {record.netWorkHours 
                              ? `${record.netWorkHours.toFixed(2)}h` 
                              : record.workHours 
                                ? `${record.workHours.toFixed(2)}h`
                                : '-'}
                          </p>
                          {record.overtime > 0 && (
                            <p className="text-xs text-blue-600 font-medium">
                              +{record.overtime.toFixed(2)}h OT
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Breaks:</span>
                        <div>
                          {record.breaks && record.breaks.length > 0 ? (
                            <>
                              <p className="font-medium text-gray-900">{formatDuration(record.totalBreakTime)}</p>
                              <p className="text-xs text-gray-500">{record.breaks.length} break{record.breaks.length > 1 ? 's' : ''}</p>
                              {record.breakCompliance && record.breakCompliance !== 'none' && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getBreakComplianceColor(record.breakCompliance)}`}>
                                  {record.breakCompliance}
                                </span>
                              )}
                            </>
                          ) : (
                            <p className="font-medium text-gray-400">No breaks</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900">No attendance records found</p>
                    <p className="text-gray-500">Try adjusting your date range or filters</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Employee Details Modal */}
      {employeeModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Employee Attendance Details
              </h2>
              <button
                onClick={() => setEmployeeModal({ isOpen: false, data: null, loading: false })}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <XCircle className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {employeeModal.loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : employeeModal.data ? (
                <>
                  {/* Employee Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                          {employeeModal.data.employee.firstName} {employeeModal.data.employee.lastName}
                        </h3>
                        <div className="space-y-1 text-gray-600">
                          <p className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            <span className="font-medium">ID:</span> {employeeModal.data.employee.employeeId}
                          </p>
                          <p className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium">Department:</span> {employeeModal.data.employee.department}
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">Facility:</span> {employeeModal.data.employee.facility?.name}
                          </p>
                          {employeeModal.data.employee.email && (
                            <p className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span className="font-medium">Email:</span> {employeeModal.data.employee.email}
                            </p>
                          )}
                          {employeeModal.data.employee.phone && (
                            <p className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span className="font-medium">Phone:</span> {employeeModal.data.employee.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          employeeModal.data.employee.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {employeeModal.data.employee.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Present</p>
                      <p className="text-2xl font-bold text-green-600">{employeeModal.data.metrics.presentCount}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4 text-center">
                      <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Late</p>
                      <p className="text-2xl font-bold text-orange-600">{employeeModal.data.metrics.lateCount}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Absent</p>
                      <p className="text-2xl font-bold text-red-600">{employeeModal.data.metrics.absentCount}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-blue-600">{employeeModal.data.metrics.totalRecords}</p>
                    </div>
                  </div>

                  {/* Work Hours Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Work Hours</p>
                      <p className="text-2xl font-bold text-purple-600">{employeeModal.data.metrics.totalWorkHours.toFixed(1)} hrs</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-sm text-gray-600 mb-1">Avg Work Hours/Day</p>
                      <p className="text-2xl font-bold text-indigo-600">{employeeModal.data.metrics.avgWorkHours} hrs</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-sm text-gray-600 mb-1">Avg Late Minutes</p>
                      <p className="text-2xl font-bold text-orange-600">{employeeModal.data.metrics.avgLateMinutes} min</p>
                    </div>
                  </div>

                  {/* Recent Attendance */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Recent Attendance Records (Last 10)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Date</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Check In</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Check Out</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Work Hours</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Overtime</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Late (min)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(employeeModal.data?.metrics?.recentAttendance || []).map(record => (
                            <tr key={record._id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-900">{formatDateForTable(record.date)?.split(' ')[0]}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  record.status === 'present' ? 'bg-green-100 text-green-800' :
                                  record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                                  record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600">{formatTime(record.checkIn?.time)}</td>
                              <td className="py-3 px-4 text-gray-600">{formatTime(record.checkOut?.time)}</td>
                              <td className="py-3 px-4 font-semibold text-gray-900">{record.workHours?.toFixed(2) || 0} hrs</td>
                              <td className="py-3 px-4 text-purple-600">{record.overtime?.toFixed(2) || 0} hrs</td>
                              <td className={`py-3 px-4 ${record.lateMinutes > 0 ? 'text-orange-600 font-semibold' : 'text-gray-400'}`}>
                                {record.lateMinutes || 0}
                              </td>
                            </tr>
                          ))}
                          {(employeeModal.data?.metrics?.recentAttendance || []).length === 0 && (
                            <tr>
                              <td colSpan="7" className="text-center text-gray-500 py-8">
                                No attendance records found for this period
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">No data available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
