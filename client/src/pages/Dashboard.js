import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UsersIcon, 
  BuildingOfficeIcon, 
  CheckCircleIcon, 
  XCircleIcon 
} from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/analytics/dashboard');
      setAnalytics(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

  const todayStats = [
    {
      name: 'Total Employees',
      value: analytics?.summary?.totalEmployees || 0,
      icon: UsersIcon,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      name: 'Present Today',
      value: analytics?.summary?.todayPresent || 0,
      icon: CheckCircleIcon,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      name: 'Absent Today',
      value: analytics?.summary?.todayAbsent || 0,
      icon: XCircleIcon,
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-600'
    },
    {
      name: 'Total Facilities',
      value: analytics?.summary?.totalFacilities || 0,
      icon: BuildingOfficeIcon,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    }
  ];

  // Format attendance trend data
  const trendData = {};
  analytics?.attendanceTrend?.forEach(item => {
    if (!trendData[item._id.date]) {
      trendData[item._id.date] = { date: item._id.date };
    }
    trendData[item._id.date][item._id.status] = item.count;
  });
  const attendanceTrendData = Object.values(trendData);

  // Prepare pie chart data for today's attendance
  const todayAttendanceData = [
    { name: 'Present', value: analytics?.summary?.todayPresent || 0 },
    { name: 'Absent', value: analytics?.summary?.todayAbsent || 0 },
    { name: 'Late', value: analytics?.summary?.todayLate || 0 }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
        <button
          onClick={fetchDashboardData}
          className="btn btn-primary"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {todayStats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-8 w-8 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            7-Day Attendance Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attendanceTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Attendance Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Today's Attendance Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={todayAttendanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {todayAttendanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Facility-wise Attendance */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Facility-wise Attendance
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics?.facilityWiseAttendance || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="facility.name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="present" fill="#10b981" name="Present" />
            <Bar dataKey="absent" fill="#ef4444" name="Absent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Late Comers */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Top Late Arrivals This Month
        </h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Late Count</th>
                <th>Total Late Minutes</th>
                <th>Avg Late Minutes</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.topLateComers?.map((item, index) => (
                <tr key={index}>
                  <td>{item.employee.employeeId}</td>
                  <td>{item.employee.firstName} {item.employee.lastName}</td>
                  <td>
                    <span className="badge badge-warning">{item.lateCount}</span>
                  </td>
                  <td>{item.totalLateMinutes} min</td>
                  <td>{Math.round(item.avgLateMinutes)} min</td>
                </tr>
              )) || (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
