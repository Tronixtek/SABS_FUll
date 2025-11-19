import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  Shield,
  BarChart3,
  CheckCircle,
  Smartphone,
  Building,
  Zap,
  Eye,
  FileText,
  ArrowRight,
  Star,
  Play
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: <Eye className="w-8 h-8 text-green-600" />,
      title: "Contactless Biometric Attendance",
      description: "Advanced facial recognition technology ensuring hygienic, contactless attendance tracking for health workers across PHC facilities."
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-600" />,
      title: "Real-Time Health Worker Monitoring",
      description: "Track attendance of doctors, nurses, and support staff in real-time across all Kano State PHC centers."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-600" />,
      title: "Comprehensive Health Facility Analytics",
      description: "Detailed analytics on staff attendance patterns, shift coverage, and facility staffing levels for better healthcare service delivery."
    },
    {
      icon: <Shield className="w-8 h-8 text-red-600" />,
      title: "Medical Leave & Emergency Management",
      description: "Specialized leave management for medical emergencies, patient care duties, and health worker specific attendance scenarios."
    },
    {
      icon: <FileText className="w-8 h-8 text-yellow-600" />,
      title: "Ministry-Compliant Reporting",
      description: "Generate official reports for Kano State Ministry of Health with staff attendance records, work hours, and facility coverage data."
    },
    {
      icon: <Building className="w-8 h-8 text-indigo-600" />,
      title: "Multi-PHC Center Management",
      description: "Centralized management of all Primary Health Care centers across Kano State with facility-specific reporting and monitoring."
    }
  ];

  const benefits = [
    {
      title: "99.9% Biometric Accuracy",
      description: "Advanced facial recognition ensures precise attendance tracking for health workers"
    },
    {
      title: "85% Administrative Time Savings",
      description: "Automated processes reduce manual record-keeping for PHC administrators"
    },
    {
      title: "Real-Time Health Facility Oversight",
      description: "Instant visibility into staff attendance across all PHC centers"
    },
    {
      title: "Infection Control Compliance", 
      description: "Contactless biometric solution supports hygiene protocols in healthcare settings"
    },
    {
      title: "Ministry Reporting Integration",
      description: "Seamless data export for Kano State health department reporting requirements"
    }
  ];

  const testimonials = [
    {
      name: "Dr. Amina Yusuf",
      role: "Chief Medical Officer, Kano State PHC Board",
      content: "SABS has transformed how we monitor staff attendance across our 400+ health centers. The real-time dashboard gives us unprecedented visibility into our workforce.",
      rating: 5
    },
    {
      name: "Mallam Ibrahim Sani",
      role: "Head of Administration, Kano Central PHC",
      content: "The contactless biometric system is perfect for our health facilities. It maintains hygiene standards while providing accurate attendance tracking for all our staff.",
      rating: 5
    },
    {
      name: "Nurse Fatima Abdullahi", 
      role: "Senior Nursing Officer, Wudil PHC Center",
      content: "The leave management system handles our shift work perfectly. When we have medical emergencies, the system automatically adjusts our attendance records.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 text-white p-2 rounded-lg">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SABS</h1>
                <p className="text-sm text-gray-600">Kano State PHC Board - Attendance System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-700 hover:text-green-600 font-medium transition-colors"
              >
                Staff Login
              </Link>
              <Link 
                to="/register" 
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Access Portal
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 via-white to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-green-100 font-bold text-green-800 px-6 py-3 rounded-full text-4xl font-bold mb-6 inline-block">
                Kano State Primary Health Care Development Board
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Smart Attendance 
                <span className="text-green-600"> & Biometric</span> 
                <br />Management System
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                A bespoke attendance management solution designed specifically for Kano State PHC facilities. 
                Features advanced biometric recognition, real-time monitoring, and comprehensive health worker attendance tracking.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/login" 
                  className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  Access Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link 
                  to="/register"
                  className="border border-green-300 text-green-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-50 transition-colors flex items-center justify-center"
                >
                  Staff Registration
                </Link>
              </div>
              <div className="flex items-center mt-8 space-x-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">400+</div>
                  <div className="text-sm text-gray-600">PHC Centers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">15K+</div>
                  <div className="text-sm text-gray-600">Health Workers</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-2">Kano PHC Dashboard</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/20 p-3 rounded">
                      <div className="text-2xl font-bold">847</div>
                      <div className="text-sm opacity-90">Present Today</div>
                    </div>
                    <div className="bg-white/20 p-3 rounded">
                      <div className="text-2xl font-bold">23</div>
                      <div className="text-sm opacity-90">On Leave</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Victor Francis</span>
                    <span className="text-green-600 text-sm">✓ Present</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Sarah Johnson</span>
                    <span className="text-yellow-600 text-sm">⏰ Late (Excused)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Workplaces
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive solution combines cutting-edge technology with intuitive design 
              to deliver unmatched attendance management capabilities.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why SABS for Kano State PHC?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Experience the difference with our healthcare-specific attendance system designed 
                for Primary Health Care facilities, ensuring optimal workforce management and compliance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                      <p className="text-gray-600 text-sm">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-green-500 to-blue-600 text-white p-8 rounded-2xl">
                <h3 className="text-2xl font-bold mb-4">PHC System Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Biometric Accuracy</span>
                      <span>99.9%</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 w-[99.9%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Processing Speed</span>
                      <span>{'< 0.5s'}</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 w-[95%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>System Uptime</span>
                      <span>99.8%</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 w-[99.8%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Modernize Kano State PHC Attendance Management
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Access the SABS platform designed specifically for healthcare workforce monitoring across PHC facilities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/login" 
              className="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Access Dashboard
            </Link>
            <Link 
              to="/register" 
              className="border border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Register Staff
            </Link>
          </div>
          <p className="text-green-100 mt-4 text-sm">
            Secure • Reliable • Designed for Healthcare Facilities
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-600 p-2 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">SABS</h3>
                  <p className="text-gray-400 text-sm">Kano State PHC Attendance System</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Modernizing healthcare workforce management for Primary Health Care facilities 
                across Kano State with advanced biometric technology.
              </p>
              <div className="flex space-x-4">
                <div className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">System</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/login" className="hover:text-white">Features</a></li>
                <li><a href="/login" className="hover:text-white">Security</a></li>
                <li><a href="/login" className="hover:text-white">Analytics</a></li>
                <li><a href="/login" className="hover:text-white">Reports</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/login" className="hover:text-white">User Guide</a></li>
                <li><a href="/login" className="hover:text-white">Help Center</a></li>
                <li><a href="/login" className="hover:text-white">Technical Support</a></li>
                <li><a href="/login" className="hover:text-white">Staff Training</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kano State PHC</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/login" className="hover:text-white">Ministry Portal</a></li>
                <li><a href="/login" className="hover:text-white">Health Centers</a></li>
                <li><a href="/login" className="hover:text-white">Staff Directory</a></li>
                <li><a href="/login" className="hover:text-white">Official Reports</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 SABS - Kano State Primary Health Care Development Board. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;