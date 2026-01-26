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
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showLateArrivalsModal, setShowLateArrivalsModal] = useState(false);

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
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 mt-1">Monitor your attendance system performance</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {todayStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">{stat.name}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg ${stat.bgColor} flex-shrink-0 ml-3`}>
                <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Attendance Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
              7-Day Attendance Trend
            </h3>
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Present</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Absent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Late</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">On Leave</span>
              </div>
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Attendance Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            Today's Attendance Distribution
          </h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={todayAttendanceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={window.innerWidth < 640 ? 80 : 100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {todayAttendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Facility-wise Attendance */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
          Facility-wise Attendance
        </h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.facilityWiseAttendance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="facility.name" 
                fontSize={12}
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="present" fill="#10b981" name="Present" radius={[2, 2, 0, 0]} />
              <Bar dataKey="absent" fill="#ef4444" name="Absent" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Late Comers - Facility Grouped */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
          Top Late Arrivals by Facility
        </h3>
        <div className="space-y-4">
          {analytics?.facilityGroupedLateArrivals?.length > 0 ? (
            analytics.facilityGroupedLateArrivals.map((facilityData, index) => (
              <div 
                key={index} 
                onClick={() => {
                  setSelectedFacility(facilityData);
                  setShowLateArrivalsModal(true);
                }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer bg-gradient-to-r from-orange-50 to-white"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <BuildingOfficeIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {facilityData.facility.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {facilityData.facility.code}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        {facilityData.totalLateCount} Late Arrivals
                      </span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {facilityData.topLateEmployees.length} employees affected
                    </p>
                  </div>
                </div>
                {/* Preview of top 3 late employees */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Top late comers:</p>
                  <div className="flex gap-2 flex-wrap">
                    {facilityData.topLateEmployees.slice(0, 3).map((emp, idx) => (
                      <span 
                        key={idx}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {emp.employee.firstName} {emp.employee.lastName} ({emp.lateCount}x)
                      </span>
                    ))}
                    {facilityData.topLateEmployees.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{facilityData.topLateEmployees.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">No late arrivals this month</p>
                <p className="text-sm mt-1">All employees are punctual! 🎉</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Late Arrivals Modal */}
      {showLateArrivalsModal && selectedFacility && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    Late Arrivals - {selectedFacility.facility.name}
                  </h2>
                  <p className="text-orange-100 mt-1">
                    {selectedFacility.facility.code} • {selectedFacility.totalLateCount} total late arrivals this month
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowLateArrivalsModal(false);
                    setSelectedFacility(null);
                  }}
                  className="text-white hover:text-orange-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Top {selectedFacility.topLateEmployees.length} Late Employees
                </h3>
                <p className="text-sm text-gray-600">
                  Employees with the most late arrivals this month
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Late Count
                      </th>
                      <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                        Total Late Minutes
                      </th>
                      <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                        Avg Late Minutes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedFacility.topLateEmployees.map((item, index) => (
                      <tr key={index} className="hover:bg-orange-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold text-sm">
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {item.employee.employeeId}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {item.employee.firstName} {item.employee.lastName}
                            </span>
                            <span className="text-xs text-gray-500 sm:hidden">
                              {item.totalLateMinutes} min total
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                            {item.lateCount}x
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 hidden sm:table-cell">
                          <span className="font-semibold text-orange-600">
                            {item.totalLateMinutes}
                          </span> min
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 hidden lg:table-cell">
                          <span className="font-semibold text-orange-600">
                            {item.avgLateMinutes}
                          </span> min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Stats */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium mb-1">
                    Total Late Arrivals
                  </div>
                  <div className="text-2xl font-bold text-orange-700">
                    {selectedFacility.totalLateCount}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium mb-1">
                    Affected Employees
                  </div>
                  <div className="text-2xl font-bold text-orange-700">
                    {selectedFacility.topLateEmployees.length}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium mb-1">
                    Avg Late/Employee
                  </div>
                  <div className="text-2xl font-bold text-orange-700">
                    {selectedFacility.topLateEmployees.length > 0
                      ? Math.round(selectedFacility.totalLateCount / selectedFacility.topLateEmployees.length)
                      : 0}x
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowLateArrivalsModal(false);
                    setSelectedFacility(null);
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
