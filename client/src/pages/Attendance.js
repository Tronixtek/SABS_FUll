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
  Coffee
} from 'lucide-react';

const Attendance = () => {
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
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      halfDay: records.filter(r => r.status === 'half-day').length
    };
    setStats(stats);
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
      present: 'badge-success',
      absent: 'badge-danger',
      late: 'badge-warning',
      'half-day': 'badge-info',
      'on-leave': 'badge-gray',
      holiday: 'badge-info'
    };
    return `badge ${badges[status] || 'badge-gray'}`;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Attendance Records</h1>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Records</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <Calendar className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Present</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{stats.present}</p>
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
              <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.late}</p>
            </div>
            <div className="p-3 bg-yellow-200 rounded-full">
              <AlertCircle className="w-6 h-6 text-yellow-700" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Half Day</p>
              <p className="text-3xl font-bold text-purple-700 mt-1">{stats.halfDay}</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <MinusCircle className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Absent</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{stats.absent}</p>
            </div>
            <div className="p-3 bg-red-200 rounded-full">
              <XCircle className="w-6 h-6 text-red-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div>
            <label className="label">Status</label>
            <select
              className="input"
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
      </div>

      {/* Attendance Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Facility</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Breaks</th>
                <th>Work Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length > 0 ? (
                attendance.map((record) => (
                  <tr key={record._id}>
                    <td>{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        {record.employee?.profileImage ? (
                          <img
                            src={record.employee.profileImage}
                            alt={`${record.employee.firstName} ${record.employee.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {record.employee?.firstName} {record.employee?.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.employee?.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{record.facility?.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div>{formatTime(record.checkIn?.time)}</div>
                          {record.earlyArrival > 0 && (
                            <div className="text-xs text-green-600">🌅 {record.earlyArrival}m early</div>
                          )}
                          {record.lateArrival > 0 && (
                            <div className="text-xs text-red-600">⚠️ {record.lateArrival}m late</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div>{formatTime(record.checkOut?.time)}</div>
                          {record.earlyDeparture > 0 && (
                            <div className="text-xs text-orange-600">🏃 {record.earlyDeparture}m early</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
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
                    <td>
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
                    <td>
                      <span className={getStatusBadge(record.status)}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center text-gray-500 py-8">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Attendance;
