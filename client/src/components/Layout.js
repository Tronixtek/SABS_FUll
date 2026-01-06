import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  BuildingOfficeIcon,
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const Layout = () => {
  const { user, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigation = [
    { name: 'Dashboard', to: '/app/dashboard', icon: HomeIcon },
    { name: 'Employees', to: '/app/employees', icon: UsersIcon },
    { name: 'Attendance', to: '/app/attendance', icon: ClipboardDocumentCheckIcon },
    { name: 'Facilities', to: '/app/facilities', icon: BuildingOfficeIcon },
    { name: 'Shifts', to: '/app/shifts', icon: ClockIcon },
    { name: 'Reports', to: '/app/reports', icon: DocumentTextIcon },
    { name: 'Analytics', to: '/app/analytics', icon: ChartBarIcon },
    { name: 'Users', to: '/app/users', icon: UsersIcon, permission: 'manage_users' },
    { name: 'Settings', to: '/app/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-gray-900">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">S</span>
            </div>
            <h1 className="text-xl font-bold text-white">ATS</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/80 hover:text-white transition-colors p-1 rounded-md"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4 pb-20">
          <div className="space-y-1">
            {navigation
              .filter(item => !item.permission || hasPermission(item.permission))
              .map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-700">
          <div className="flex items-center mb-3 p-3 bg-gray-700 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-16 px-4 lg:px-6 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex-1">
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-800 truncate">
                Smart Attendance System
              </h2>
              <p className="text-xs text-gray-500 hidden sm:block">
                Welcome back, {user?.firstName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notification Button */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <BellIcon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </button>
            
            {/* User Info - Desktop */}
            <div className="hidden md:flex items-center space-x-3 border-l border-gray-200 pl-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700 truncate max-w-32">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-32">{user?.email}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>

            {/* Mobile User Avatar */}
            <div className="md:hidden w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 lg:p-6">
          <div className="max-w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
