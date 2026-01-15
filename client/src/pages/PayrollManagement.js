import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PayrollManagement = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'all'
  });
  
  // Generate form
  const [generateForm, setGenerateForm] = useState({
    startDate: '',
    endDate: '',
    employeeId: '',
    generateAll: true
  });
  
  // Summary
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchPayrolls();
    fetchSummary();
  }, [filters]);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        month: filters.month,
        year: filters.year
      };
      
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/payroll`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setPayrolls(response.data.payrolls);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch payroll records');
      console.error('Fetch payroll error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/payroll/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          month: filters.month,
          year: filters.year
        }
      });
      
      setSummary(response.data);
    } catch (err) {
      console.error('Fetch summary error:', err);
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    
    if (!generateForm.startDate || !generateForm.endDate) {
      alert('Please select start and end dates');
      return;
    }
    
    try {
      setGenerateLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const payload = {
        startDate: generateForm.startDate,
        endDate: generateForm.endDate
      };
      
      if (!generateForm.generateAll && generateForm.employeeId) {
        payload.employeeId = generateForm.employeeId;
      }
      
      const response = await axios.post(
        `${API_URL}/api/payroll/generate`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`Payroll generated: ${response.data.successful} successful, ${response.data.failed} failed, ${response.data.skipped} skipped`);
      
      // Reset form
      setGenerateForm({
        startDate: '',
        endDate: '',
        employeeId: '',
        generateAll: true
      });
      
      fetchPayrolls();
      fetchSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate payroll');
      console.error('Generate payroll error:', err);
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleApprove = async (payrollId) => {
    if (!window.confirm('Are you sure you want to approve this payroll?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/payroll/${payrollId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Payroll approved successfully');
      fetchPayrolls();
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve payroll');
    }
  };

  const handleMarkAsPaid = async (payrollId) => {
    const paymentMethod = prompt('Payment method (bank_transfer/cash/cheque/mobile_money):');
    const paymentReference = prompt('Payment reference (optional):');
    
    if (!paymentMethod) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/payroll/${payrollId}/pay`,
        { paymentMethod, paymentReference },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Payroll marked as paid successfully');
      fetchPayrolls();
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark payroll as paid');
    }
  };

  const viewDetails = async (payrollId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/payroll/${payrollId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSelectedPayroll(response.data);
      setShowDetails(true);
    } catch (err) {
      alert('Failed to fetch payroll details');
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

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Payroll Management</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && summary.overall && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-2xl font-bold">{summary.overall.totalRecords || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.overall.totalEarnings || 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Deductions</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.overall.totalDeductions || 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Net Pay</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.overall.totalNetPay || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Generate Payroll Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate Payroll</h2>
        <form onSubmit={handleGeneratePayroll} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={generateForm.startDate}
                onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={generateForm.endDate}
                onChange={(e) => setGenerateForm({ ...generateForm, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={generateForm.generateAll}
                onChange={(e) => setGenerateForm({ ...generateForm, generateAll: e.target.checked })}
                className="mr-2"
              />
              Generate for all employees
            </label>
          </div>
          
          {!generateForm.generateAll && (
            <div>
              <label className="block text-sm font-medium mb-1">Employee ID</label>
              <input
                type="text"
                value={generateForm.employeeId}
                onChange={(e) => setGenerateForm({ ...generateForm, employeeId: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Enter employee ID"
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={generateLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {generateLoading ? 'Generating...' : 'Generate Payroll'}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  Loading payroll records...
                </td>
              </tr>
            ) : payrolls.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  No payroll records found
                </td>
              </tr>
            ) : (
              payrolls.map((payroll) => (
                <tr key={payroll._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{payroll.employee?.firstName} {payroll.employee?.lastName}</p>
                      <p className="text-sm text-gray-500">{payroll.employeeId}</p>
                      <p className="text-xs text-gray-400">{payroll.employee?.department}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {formatDate(payroll.payPeriod.startDate)} - {formatDate(payroll.payPeriod.endDate)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p>Regular: {payroll.workHours.regularHours}h</p>
                      <p className="text-green-600">OT: {payroll.workHours.overtimeHours}h</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">
                    {formatCurrency(payroll.earnings.total)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-red-600">
                    {formatCurrency(payroll.deductions.total)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">
                    {formatCurrency(payroll.netPay)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(payroll.status)}`}>
                      {payroll.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => viewDetails(payroll._id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </button>
                      {payroll.status === 'draft' && (
                        <button
                          onClick={() => handleApprove(payroll._id)}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Approve
                        </button>
                      )}
                      {payroll.status === 'approved' && (
                        <button
                          onClick={() => handleMarkAsPaid(payroll._id)}
                          className="text-purple-600 hover:text-purple-800 text-sm"
                        >
                          Mark as Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payroll Details Modal */}
      {showDetails && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Payroll Details</h2>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Info */}
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Employee Information</h3>
                  <p><span className="font-medium">Name:</span> {selectedPayroll.employee?.firstName} {selectedPayroll.employee?.lastName}</p>
                  <p><span className="font-medium">ID:</span> {selectedPayroll.employeeId}</p>
                  <p><span className="font-medium">Department:</span> {selectedPayroll.employee?.department}</p>
                  <p><span className="font-medium">Designation:</span> {selectedPayroll.employee?.designation}</p>
                </div>

                {/* Pay Period */}
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Pay Period</h3>
                  <p><span className="font-medium">Start:</span> {formatDate(selectedPayroll.payPeriod.startDate)}</p>
                  <p><span className="font-medium">End:</span> {formatDate(selectedPayroll.payPeriod.endDate)}</p>
                  <p><span className="font-medium">Month:</span> {selectedPayroll.payPeriod.month}/{selectedPayroll.payPeriod.year}</p>
                  <p><span className="font-medium">Status:</span> <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedPayroll.status)}`}>{selectedPayroll.status}</span></p>
                </div>

                {/* Attendance Summary */}
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Attendance Summary</h3>
                  <p><span className="font-medium">Total Days:</span> {selectedPayroll.attendance.totalDays}</p>
                  <p className="text-green-600"><span className="font-medium">Present:</span> {selectedPayroll.attendance.presentDays}</p>
                  <p className="text-red-600"><span className="font-medium">Absent:</span> {selectedPayroll.attendance.absentDays}</p>
                  <p className="text-yellow-600"><span className="font-medium">Late:</span> {selectedPayroll.attendance.lateDays}</p>
                  <p className="text-blue-600"><span className="font-medium">Leave:</span> {selectedPayroll.attendance.leaveDays}</p>
                </div>

                {/* Work Hours */}
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Work Hours</h3>
                  <p><span className="font-medium">Regular:</span> {selectedPayroll.workHours.regularHours}h</p>
                  <p className="text-green-600"><span className="font-medium">Overtime:</span> {selectedPayroll.workHours.overtimeHours}h</p>
                  <p className="text-red-600"><span className="font-medium">Undertime:</span> {selectedPayroll.workHours.undertimeHours}h</p>
                  <p><span className="font-medium">Total:</span> {selectedPayroll.workHours.totalHours}h</p>
                </div>

                {/* Earnings */}
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-semibold mb-2 text-green-800">Earnings</h3>
                  <p><span className="font-medium">Basic Pay:</span> {formatCurrency(selectedPayroll.earnings.basicPay)}</p>
                  <p><span className="font-medium">Overtime Pay:</span> {formatCurrency(selectedPayroll.earnings.overtimePay)}</p>
                  <p><span className="font-medium">Allowances:</span> {formatCurrency(selectedPayroll.earnings.allowances)}</p>
                  <p><span className="font-medium">Bonus:</span> {formatCurrency(selectedPayroll.earnings.bonus)}</p>
                  <p className="text-lg font-bold border-t border-green-200 mt-2 pt-2">
                    Total: {formatCurrency(selectedPayroll.earnings.total)}
                  </p>
                </div>

                {/* Deductions */}
                <div className="bg-red-50 p-4 rounded">
                  <h3 className="font-semibold mb-2 text-red-800">Deductions</h3>
                  <p><span className="font-medium">Tax:</span> {formatCurrency(selectedPayroll.deductions.tax)}</p>
                  <p><span className="font-medium">Pension:</span> {formatCurrency(selectedPayroll.deductions.pension)}</p>
                  <p><span className="font-medium">Insurance:</span> {formatCurrency(selectedPayroll.deductions.insurance)}</p>
                  <p><span className="font-medium">Loan:</span> {formatCurrency(selectedPayroll.deductions.loanDeduction)}</p>
                  <p><span className="font-medium">Absent:</span> {formatCurrency(selectedPayroll.deductions.absentDeduction)}</p>
                  <p><span className="font-medium">Undertime:</span> {formatCurrency(selectedPayroll.deductions.undertimeDeduction)}</p>
                  <p><span className="font-medium">Other:</span> {formatCurrency(selectedPayroll.deductions.other)}</p>
                  <p className="text-lg font-bold border-t border-red-200 mt-2 pt-2">
                    Total: {formatCurrency(selectedPayroll.deductions.total)}
                  </p>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-blue-50 p-6 rounded mt-6 text-center">
                <h3 className="text-lg font-semibold mb-2">Net Pay</h3>
                <p className="text-4xl font-bold text-blue-600">
                  {formatCurrency(selectedPayroll.netPay)}
                </p>
              </div>

              {/* Notes */}
              {selectedPayroll.notes && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-medium">Notes:</p>
                  <p className="text-sm">{selectedPayroll.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;
