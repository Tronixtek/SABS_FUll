import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const EmployeePayslip = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchMyPayroll();
  }, [filters]);

  const fetchMyPayroll = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('employeeToken');
      const response = await axios.get(`${API_URL}/api/employee-auth/my-payroll`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          month: filters.month,
          year: filters.year
        }
      });
      
      setPayrolls(response.data.payrolls);
    } catch (err) {
      console.error('Fetch payroll error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const printPayslip = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Payslips</h1>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Month</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Payroll Cards */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading payslips...</p>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No payslips found for the selected period</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {payrolls.map((payroll) => (
              <div
                key={payroll._id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedPayroll(payroll);
                  setShowDetails(true);
                }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Pay Period</p>
                      <p className="font-semibold">
                        {formatDate(payroll.payPeriod.startDate)} - {formatDate(payroll.payPeriod.endDate)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(payroll.status)}`}>
                      {payroll.status}
                    </span>
                  </div>

                  <div className="border-t border-b border-gray-200 py-4 my-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Gross Earnings:</span>
                      <span className="font-medium text-green-600">{formatCurrency(payroll.earnings.total)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Deductions:</span>
                      <span className="font-medium text-red-600">{formatCurrency(payroll.deductions.total)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Net Pay:</span>
                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(payroll.netPay)}</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-gray-600">Work Hours</p>
                        <p className="font-semibold">{payroll.workHours.totalHours}h</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Overtime</p>
                        <p className="font-semibold text-green-600">{payroll.workHours.overtimeHours}h</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Present Days</p>
                        <p className="font-semibold">{payroll.attendance.presentDays}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Payslip Modal */}
        {showDetails && selectedPayroll && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8" id="payslip-print">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6 print:mb-8">
                  <h2 className="text-2xl font-bold">Payslip</h2>
                  <div className="flex gap-2 print:hidden">
                    <button
                      onClick={printPayslip}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Print
                    </button>
                    <button
                      onClick={() => {
                        setShowDetails(false);
                        setSelectedPayroll(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Company Header (you can customize this) */}
                <div className="border-b-2 border-gray-300 pb-4 mb-6">
                  <h3 className="text-xl font-bold">SABS Attendance System</h3>
                  <p className="text-sm text-gray-600">Employee Payslip</p>
                </div>

                {/* Pay Period and Status */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Pay Period</p>
                    <p className="font-semibold">
                      {formatDate(selectedPayroll.payPeriod.startDate)} - {formatDate(selectedPayroll.payPeriod.endDate)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Month/Year</p>
                    <p className="font-semibold">{selectedPayroll.payPeriod.month}/{selectedPayroll.payPeriod.year}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedPayroll.status)}`}>
                      {selectedPayroll.status}
                    </span>
                    {selectedPayroll.paidAt && (
                      <>
                        <p className="text-sm text-gray-600 mt-2">Paid On</p>
                        <p className="font-semibold">{formatDate(selectedPayroll.paidAt)}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Attendance & Work Hours */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-semibold mb-3">Attendance Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Days:</span>
                        <span className="font-medium">{selectedPayroll.attendance.totalDays}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span className="text-sm">Present:</span>
                        <span className="font-medium">{selectedPayroll.attendance.presentDays}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span className="text-sm">Absent:</span>
                        <span className="font-medium">{selectedPayroll.attendance.absentDays}</span>
                      </div>
                      <div className="flex justify-between text-yellow-600">
                        <span className="text-sm">Late:</span>
                        <span className="font-medium">{selectedPayroll.attendance.lateDays}</span>
                      </div>
                      <div className="flex justify-between text-blue-600">
                        <span className="text-sm">On Leave:</span>
                        <span className="font-medium">{selectedPayroll.attendance.leaveDays}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-semibold mb-3">Work Hours</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Regular Hours:</span>
                        <span className="font-medium">{selectedPayroll.workHours.regularHours}h</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span className="text-sm">Overtime:</span>
                        <span className="font-medium">{selectedPayroll.workHours.overtimeHours}h</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span className="text-sm">Undertime:</span>
                        <span className="font-medium">{selectedPayroll.workHours.undertimeHours}h</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 pt-2">
                        <span className="text-sm font-semibold">Total:</span>
                        <span className="font-bold">{selectedPayroll.workHours.totalHours}h</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings & Deductions */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <h4 className="font-semibold mb-3 text-green-800">Earnings</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Basic Pay:</span>
                        <span className="font-medium">{formatCurrency(selectedPayroll.earnings.basicPay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Overtime Pay:</span>
                        <span className="font-medium">{formatCurrency(selectedPayroll.earnings.overtimePay)}</span>
                      </div>
                      {selectedPayroll.earnings.allowances > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Allowances:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.earnings.allowances)}</span>
                        </div>
                      )}
                      {selectedPayroll.earnings.bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Bonus:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.earnings.bonus)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t-2 border-green-300 pt-2">
                        <span className="font-semibold">Gross Earnings:</span>
                        <span className="font-bold text-lg">{formatCurrency(selectedPayroll.earnings.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded border border-red-200">
                    <h4 className="font-semibold mb-3 text-red-800">Deductions</h4>
                    <div className="space-y-2">
                      {selectedPayroll.deductions.tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Tax:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.deductions.tax)}</span>
                        </div>
                      )}
                      {selectedPayroll.deductions.pension > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Pension:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.deductions.pension)}</span>
                        </div>
                      )}
                      {selectedPayroll.deductions.insurance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Insurance:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.deductions.insurance)}</span>
                        </div>
                      )}
                      {selectedPayroll.deductions.loanDeduction > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Loan Deduction:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.deductions.loanDeduction)}</span>
                        </div>
                      )}
                      {selectedPayroll.deductions.absentDeduction > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Absent Deduction:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.deductions.absentDeduction)}</span>
                        </div>
                      )}
                      {selectedPayroll.deductions.undertimeDeduction > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Undertime Deduction:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.deductions.undertimeDeduction)}</span>
                        </div>
                      )}
                      {selectedPayroll.deductions.other > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Other:</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.deductions.other)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t-2 border-red-300 pt-2">
                        <span className="font-semibold">Total Deductions:</span>
                        <span className="font-bold text-lg">{formatCurrency(selectedPayroll.deductions.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Pay */}
                <div className="bg-blue-600 text-white p-6 rounded-lg text-center">
                  <p className="text-lg mb-2">Net Pay</p>
                  <p className="text-4xl font-bold">{formatCurrency(selectedPayroll.netPay)}</p>
                </div>

                {/* Notes */}
                {selectedPayroll.notes && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="font-medium text-sm">Notes:</p>
                    <p className="text-sm mt-1">{selectedPayroll.notes}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                  <p>This is a computer-generated payslip and does not require a signature.</p>
                  <p>Generated on {formatDate(selectedPayroll.generatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip-print, #payslip-print * {
            visibility: visible;
          }
          #payslip-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeePayslip;
