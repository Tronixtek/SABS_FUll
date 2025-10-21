import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  TrendingUp,
  Users,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Award,
  Target,
  BarChart3,
  PieChart,
  Activity,
  X,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  TrendingDown
} from 'lucide-react';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [selectedFacility, setSelectedFacility] = useState('');
  const [facilities, setFacilities] = useState([]);
  
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalEmployees: 0,
      totalFacilities: 0,
      todayPresent: 0,
      todayAbsent: 0,
      todayLate: 0
    },
    monthAttendance: [],
    attendanceTrend: [],
    topLateComers: [],
    facilityWiseAttendance: []
  });
  
  const [performanceData, setPerformanceData] = useState([]);
  const [overtimeData, setOvertimeData] = useState([]);
  
  // Modal states
  const [employeeModal, setEmployeeModal] = useState({ isOpen: false, data: null, loading: false });
  const [facilityModal, setFacilityModal] = useState({ isOpen: false, data: null, loading: false });

  useEffect(() => {
    fetchFacilities();
    fetchAnalytics();
  }, [dateRange, selectedFacility]);

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('/api/facilities');
      setFacilities(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
      // Don't show alert for facilities, just use empty array
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedFacility && { facility: selectedFacility })
      };

      const [dashboardRes, performanceRes, overtimeRes] = await Promise.all([
        axios.get('/api/analytics/dashboard', { params }),
        axios.get('/api/analytics/employee-performance', { params: { ...params, limit: 10 } }),
        axios.get('/api/analytics/overtime', { params })
      ]);

      const dashboardDataRaw = dashboardRes.data.data;
      
      // Filter out attendance trends with invalid dates
      if (dashboardDataRaw.attendanceTrend) {
        dashboardDataRaw.attendanceTrend = dashboardDataRaw.attendanceTrend.filter(day => {
          return day && day.date && !isNaN(new Date(day.date).getTime());
        });
      }

      setDashboardData(dashboardDataRaw);
      setPerformanceData(performanceRes.data.data || []);
      setOvertimeData(overtimeRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      alert('Failed to load analytics data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceRate = () => {
    const total = dashboardData.summary.todayPresent + 
                  dashboardData.summary.todayAbsent + 
                  dashboardData.summary.todayLate;
    if (total === 0) return 0;
    const present = dashboardData.summary.todayPresent + dashboardData.summary.todayLate;
    return ((present / total) * 100).toFixed(1);
  };

  const getMonthStats = () => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      totalWorkHours: 0,
      totalOvertime: 0
    };

    dashboardData.monthAttendance.forEach(item => {
      if (item._id === 'present') stats.present = item.count;
      if (item._id === 'absent') stats.absent = item.count;
      if (item._id === 'late') stats.late = item.count;
      stats.totalWorkHours += item.totalWorkHours || 0;
      stats.totalOvertime += item.totalOvertime || 0;
    });

    return stats;
  };

  // Helper function to safely format dates
  const formatDate = (date, formatString) => {
    try {
      if (!date) return '-';
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return '-';
      return format(parsedDate, formatString);
    } catch (error) {
      console.error('Date formatting error:', error);
      return '-';
    }
  };

  // Fetch detailed employee insights
  const fetchEmployeeDetails = async (employeeId) => {
    setEmployeeModal({ isOpen: true, data: null, loading: true });
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const [employeeRes, attendanceRes] = await Promise.all([
        axios.get(`/api/employees/${employeeId}`),
        axios.get('/api/attendance', { 
          params: { ...params, employee: employeeId, limit: 30, sortBy: 'date', sortOrder: 'desc' }
        })
      ]);

      const employee = employeeRes.data.data;
      const attendanceRecords = (attendanceRes.data.data || []).filter(record => {
        // Filter out records with invalid dates
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
      alert('Failed to load employee details. Please try again.');
      setEmployeeModal({ isOpen: false, data: null, loading: false });
    }
  };

  // Fetch detailed facility insights
  const fetchFacilityDetails = async (facilityId) => {
    setFacilityModal({ isOpen: true, data: null, loading: true });
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        facility: facilityId
      };

      const [facilityRes, dashboardRes, employeesRes] = await Promise.all([
        axios.get(`/api/facilities/${facilityId}`),
        axios.get('/api/analytics/dashboard', { params }),
        axios.get('/api/analytics/employee-performance', { params: { ...params, limit: 5 } })
      ]);

      const facility = facilityRes.data.data;
      const analytics = dashboardRes.data.data;
      const topEmployees = employeesRes.data.data || [];

      // Filter out attendance trends with invalid dates
      if (analytics.attendanceTrend) {
        analytics.attendanceTrend = analytics.attendanceTrend.filter(day => {
          return day && day.date && !isNaN(new Date(day.date).getTime());
        });
      }

      setFacilityModal({ 
        isOpen: true, 
        data: { facility, analytics, topEmployees }, 
        loading: false 
      });
    } catch (error) {
      console.error('Failed to fetch facility details:', error);
      alert('Failed to load facility details. Please try again.');
      setFacilityModal({ isOpen: false, data: null, loading: false });
    }
  };

  const monthStats = getMonthStats();
  const attendanceRate = calculateAttendanceRate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Analytics & Insights</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            className="input max-w-xs"
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
          >
            <option value="">All Facilities</option>
            {facilities.map(facility => (
              <option key={facility._id} value={facility._id}>
                {facility.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="input"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <input
            type="date"
            className="input"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Employees</p>
                  <p className="text-3xl font-bold mt-2">{dashboardData.summary.totalEmployees}</p>
                </div>
                <Users className="w-12 h-12 text-blue-200" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Today Present</p>
                  <p className="text-3xl font-bold mt-2">{dashboardData.summary.todayPresent}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-200" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Today Late</p>
                  <p className="text-3xl font-bold mt-2">{dashboardData.summary.todayLate}</p>
                </div>
                <Clock className="w-12 h-12 text-orange-200" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Today Absent</p>
                  <p className="text-3xl font-bold mt-2">{dashboardData.summary.todayAbsent}</p>
                </div>
                <XCircle className="w-12 h-12 text-red-200" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Attendance Rate</p>
                  <p className="text-3xl font-bold mt-2">{attendanceRate}%</p>
                </div>
                <Target className="w-12 h-12 text-purple-200" />
              </div>
            </div>
          </div>

          {/* Month Statistics */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Month Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Present Days</p>
                <p className="text-2xl font-bold text-green-600">{monthStats.present}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Late Days</p>
                <p className="text-2xl font-bold text-orange-600">{monthStats.late}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Absent Days</p>
                <p className="text-2xl font-bold text-red-600">{monthStats.absent}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Work Hours</p>
                <p className="text-2xl font-bold text-blue-600">{monthStats.totalWorkHours.toFixed(0)}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Overtime</p>
                <p className="text-2xl font-bold text-purple-600">{monthStats.totalOvertime.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Top Performers and Late Comers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-green-600" />
                Top Performers
              </h2>
              <div className="space-y-3">
                {performanceData.slice(0, 5).map((item, index) => (
                  <div 
                    key={item.employee._id} 
                    onClick={() => fetchEmployeeDetails(item.employee._id)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-300 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {item.employee.firstName} {item.employee.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{item.employee.employeeId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{item.metrics.attendanceRate}%</p>
                      <p className="text-xs text-gray-500">{item.metrics.presentDays}/{item.metrics.totalDays} days</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Late Comers */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                Frequent Late Arrivals
              </h2>
              <div className="space-y-3">
                {dashboardData.topLateComers.map((item, index) => (
                  <div 
                    key={item.employee._id} 
                    onClick={() => fetchEmployeeDetails(item.employee._id)}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {item.employee.firstName} {item.employee.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{item.employee.employeeId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">{item.lateCount}x</p>
                      <p className="text-xs text-gray-500">Avg: {item.avgLateMinutes?.toFixed(0)} min</p>
                    </div>
                  </div>
                ))}
                {dashboardData.topLateComers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No late arrivals this period! 🎉</p>
                )}
              </div>
            </div>
          </div>

          {/* Facility-wise Performance */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Facility-wise Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Code</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Total Hours</th>
                    <th>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.facilityWiseAttendance.map(item => (
                    <tr 
                      key={item.facility._id}
                      onClick={() => fetchFacilityDetails(item.facility._id)}
                      className="hover:bg-blue-50 cursor-pointer transition"
                    >
                      <td className="font-medium">{item.facility.name}</td>
                      <td className="text-gray-500">{item.facility.code}</td>
                      <td>
                        <span className="badge badge-success">{item.present}</span>
                      </td>
                      <td>
                        <span className="badge badge-error">{item.absent}</span>
                      </td>
                      <td>{item.totalWorkHours?.toFixed(0)} hrs</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${item.attendanceRate}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold text-sm">{item.attendanceRate?.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overtime Report */}
          {overtimeData.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-600" />
                Overtime Report
              </h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Employee ID</th>
                      <th>Facility</th>
                      <th>Total Overtime</th>
                      <th>Overtime Days</th>
                      <th>Avg/Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtimeData.slice(0, 10).map(item => (
                      <tr key={item.employee._id}>
                        <td className="font-medium">
                          {item.employee.firstName} {item.employee.lastName}
                        </td>
                        <td className="text-gray-500">{item.employee.employeeId}</td>
                        <td className="text-gray-600">{item.facility.name}</td>
                        <td>
                          <span className="font-bold text-purple-600">{item.totalOvertime} hrs</span>
                        </td>
                        <td>{item.overtimeDays} days</td>
                        <td>{item.avgOvertimePerDay} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Employee Performance Detail */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              Employee Performance Details
            </h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Department</th>
                    <th>Total Days</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Work Hours</th>
                    <th>Overtime</th>
                    <th>Attendance Rate</th>
                    <th>Punctuality</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map(item => (
                    <tr 
                      key={item.employee._id}
                      onClick={() => fetchEmployeeDetails(item.employee._id)}
                      className="hover:bg-blue-50 cursor-pointer transition"
                    >
                      <td className="font-medium">
                        {item.employee.firstName} {item.employee.lastName}
                      </td>
                      <td className="text-gray-500">{item.employee.employeeId}</td>
                      <td className="text-gray-600">{item.employee.department}</td>
                      <td>{item.metrics.totalDays}</td>
                      <td>
                        <span className="badge badge-success">{item.metrics.presentDays}</span>
                      </td>
                      <td>
                        <span className="badge badge-warning">{item.metrics.lateDays}</span>
                      </td>
                      <td>
                        <span className="badge badge-error">{item.metrics.absentDays}</span>
                      </td>
                      <td>{item.metrics.totalWorkHours} hrs</td>
                      <td className="text-purple-600 font-semibold">{item.metrics.totalOvertime} hrs</td>
                      <td>
                        <span className={`font-bold ${
                          item.metrics.attendanceRate >= 90 ? 'text-green-600' :
                          item.metrics.attendanceRate >= 75 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {item.metrics.attendanceRate}%
                        </span>
                      </td>
                      <td>
                        <span className={`font-bold ${
                          item.metrics.punctualityScore >= 90 ? 'text-green-600' :
                          item.metrics.punctualityScore >= 75 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {item.metrics.punctualityScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Employee Details Modal */}
      {employeeModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Employee Details
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
                  <div className="spinner"></div>
                </div>
              ) : employeeModal.data ? (
                <>
                  {/* Employee Info */}
                  <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 mb-6">
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
                    <div className="card bg-green-50 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Present</p>
                      <p className="text-2xl font-bold text-green-600">{employeeModal.data.metrics.presentCount}</p>
                    </div>
                    <div className="card bg-orange-50 text-center">
                      <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Late</p>
                      <p className="text-2xl font-bold text-orange-600">{employeeModal.data.metrics.lateCount}</p>
                    </div>
                    <div className="card bg-red-50 text-center">
                      <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Absent</p>
                      <p className="text-2xl font-bold text-red-600">{employeeModal.data.metrics.absentCount}</p>
                    </div>
                    <div className="card bg-blue-50 text-center">
                      <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Total Records</p>
                      <p className="text-2xl font-bold text-blue-600">{employeeModal.data.metrics.totalRecords}</p>
                    </div>
                  </div>

                  {/* Work Hours Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="card bg-purple-50">
                      <p className="text-sm text-gray-600 mb-1">Total Work Hours</p>
                      <p className="text-2xl font-bold text-purple-600">{employeeModal.data.metrics.totalWorkHours.toFixed(1)} hrs</p>
                    </div>
                    <div className="card bg-indigo-50">
                      <p className="text-sm text-gray-600 mb-1">Avg Work Hours/Day</p>
                      <p className="text-2xl font-bold text-indigo-600">{employeeModal.data.metrics.avgWorkHours} hrs</p>
                    </div>
                    <div className="card bg-orange-50">
                      <p className="text-sm text-gray-600 mb-1">Avg Late Minutes</p>
                      <p className="text-2xl font-bold text-orange-600">{employeeModal.data.metrics.avgLateMinutes} min</p>
                    </div>
                  </div>

                  {/* Recent Attendance */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Recent Attendance (Last 10 Records)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Work Hours</th>
                            <th>Overtime</th>
                            <th>Late Minutes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeModal.data.metrics.recentAttendance.map(record => (
                            <tr key={record._id}>
                              <td className="font-medium">{formatDate(record.date, 'MMM dd, yyyy')}</td>
                              <td>
                                <span className={`badge ${
                                  record.status === 'present' ? 'badge-success' :
                                  record.status === 'late' ? 'badge-warning' :
                                  'badge-error'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="text-gray-600">{formatDate(record.checkIn, 'HH:mm')}</td>
                              <td className="text-gray-600">{formatDate(record.checkOut, 'HH:mm')}</td>
                              <td className="font-semibold">{record.workHours?.toFixed(2) || 0} hrs</td>
                              <td className="text-purple-600">{record.overtime?.toFixed(2) || 0} hrs</td>
                              <td className={record.lateMinutes > 0 ? 'text-orange-600 font-semibold' : 'text-gray-400'}>
                                {record.lateMinutes || 0} min
                              </td>
                            </tr>
                          ))}
                          {employeeModal.data.metrics.recentAttendance.length === 0 && (
                            <tr>
                              <td colSpan="7" className="text-center text-gray-500 py-4">
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

      {/* Facility Details Modal */}
      {facilityModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Facility Insights
              </h2>
              <button
                onClick={() => setFacilityModal({ isOpen: false, data: null, loading: false })}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <XCircle className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {facilityModal.loading ? (
                <div className="flex justify-center py-12">
                  <div className="spinner"></div>
                </div>
              ) : facilityModal.data ? (
                <>
                  {/* Facility Info */}
                  <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 mb-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                          {facilityModal.data.facility.name}
                        </h3>
                        <div className="space-y-1 text-gray-600">
                          <p className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium">Code:</span> {facilityModal.data.facility.code}
                          </p>
                          {facilityModal.data.facility.address && (
                            <p className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span className="font-medium">Address:</span> {facilityModal.data.facility.address}
                            </p>
                          )}
                          {facilityModal.data.facility.city && (
                            <p className="text-gray-600 ml-6">
                              {facilityModal.data.facility.city}, {facilityModal.data.facility.state} {facilityModal.data.facility.zipCode}
                            </p>
                          )}
                          {facilityModal.data.facility.contactPerson && (
                            <p className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span className="font-medium">Contact:</span> {facilityModal.data.facility.contactPerson}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          facilityModal.data.facility.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {facilityModal.data.facility.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card bg-blue-50 text-center">
                      <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Total Employees</p>
                      <p className="text-2xl font-bold text-blue-600">{facilityModal.data.analytics.summary.totalEmployees}</p>
                    </div>
                    <div className="card bg-green-50 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Today Present</p>
                      <p className="text-2xl font-bold text-green-600">{facilityModal.data.analytics.summary.todayPresent}</p>
                    </div>
                    <div className="card bg-orange-50 text-center">
                      <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Today Late</p>
                      <p className="text-2xl font-bold text-orange-600">{facilityModal.data.analytics.summary.todayLate}</p>
                    </div>
                    <div className="card bg-red-50 text-center">
                      <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Today Absent</p>
                      <p className="text-2xl font-bold text-red-600">{facilityModal.data.analytics.summary.todayAbsent}</p>
                    </div>
                  </div>

                  {/* Top Performers at this Facility */}
                  <div className="card mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-green-600" />
                      Top Performers at This Facility
                    </h3>
                    <div className="space-y-3">
                      {facilityModal.data.topEmployees.map((item, index) => (
                        <div 
                          key={item.employee._id}
                          onClick={() => {
                            setFacilityModal({ isOpen: false, data: null, loading: false });
                            fetchEmployeeDetails(item.employee._id);
                          }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-yellow-400 text-white' :
                              index === 1 ? 'bg-gray-300 text-white' :
                              index === 2 ? 'bg-orange-400 text-white' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {item.employee.firstName} {item.employee.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{item.employee.employeeId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">{item.metrics.attendanceRate}%</p>
                            <p className="text-xs text-gray-500">{item.metrics.presentDays}/{item.metrics.totalDays} days</p>
                          </div>
                        </div>
                      ))}
                      {facilityModal.data.topEmployees.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No employee data available</p>
                      )}
                    </div>
                  </div>

                  {/* Attendance Trend */}
                  {facilityModal.data.analytics.attendanceTrend.length > 0 && (
                    <div className="card">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        7-Day Attendance Trend
                      </h3>
                      <div className="space-y-2">
                        {facilityModal.data.analytics.attendanceTrend.map(day => {
                          const total = day.present + day.absent + day.late;
                          const presentPercentage = total > 0 ? ((day.present + day.late) / total * 100).toFixed(1) : 0;
                          
                          return (
                            <div key={day.date} className="flex items-center gap-4">
                              <div className="w-24 text-sm text-gray-600 font-medium">
                                {formatDate(day.date, 'MMM dd')}
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                <div
                                  className="bg-gradient-to-r from-green-400 to-green-600 h-6 rounded-full flex items-center justify-center"
                                  style={{ width: `${presentPercentage}%` }}
                                >
                                  {presentPercentage > 10 && (
                                    <span className="text-xs font-bold text-white">{presentPercentage}%</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 w-32">
                                {day.present + day.late}/{total} present
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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

export default Analytics;
