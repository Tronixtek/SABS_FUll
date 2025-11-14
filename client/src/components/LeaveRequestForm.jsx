import React, { useState } from 'react';
import './LeaveRequestForm.css';

const LeaveRequestForm = () => {
  const [formData, setFormData] = useState({
    employeeId: '',
    type: '',
    affectedDate: '',
    startTime: '',
    endTime: '',
    reason: '',
    category: '',
    urgency: 'medium'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const leaveTypes = [
    { value: 'early-departure', label: 'Early Departure' },
    { value: 'late-arrival', label: 'Late Arrival' },
    { value: 'partial-day', label: 'Partial Day Leave' },
    { value: 'emergency-exit', label: 'Emergency Exit' },
    { value: 'flexible-time', label: 'Flexible Time' },
    { value: 'medical-leave', label: 'Medical Leave' },
    { value: 'official-duty', label: 'Official Duty' }
  ];

  const categories = [
    { value: 'medical', label: 'Medical' },
    { value: 'family-emergency', label: 'Family Emergency' },
    { value: 'official-meeting', label: 'Official Meeting' },
    { value: 'personal', label: 'Personal' },
    { value: 'traffic-delay', label: 'Traffic Delay' },
    { value: 'public-transport', label: 'Public Transport' },
    { value: 'technical-issue', label: 'Technical Issue' },
    { value: 'other', label: 'Other' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'emergency', label: 'Emergency' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/leave/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Leave request ${result.data.leaveRequest.status} successfully!`
        });
        
        // Reset form
        setFormData({
          employeeId: '',
          type: '',
          affectedDate: '',
          startTime: '',
          endTime: '',
          reason: '',
          category: '',
          urgency: 'medium'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to submit leave request'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyExit = async () => {
    if (!formData.employeeId || !formData.reason || !formData.category) {
      setMessage({
        type: 'error',
        text: 'Please fill in Employee ID, Reason, and Category for emergency exit'
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/leave/emergency-exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          reason: formData.reason,
          category: formData.category
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Emergency exit recorded and auto-approved!'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to record emergency exit'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="leave-request-form">
      <div className="form-header">
        <h2>🏢 Leave & Excuse Request</h2>
        <p>Submit requests for early departure, late arrival, or emergency exits</p>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Employee ID */}
          <div className="form-group">
            <label htmlFor="employeeId">Employee ID *</label>
            <input
              type="text"
              id="employeeId"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              placeholder="e.g., EMP001122"
              required
            />
          </div>

          {/* Leave Type */}
          <div className="form-group">
            <label htmlFor="type">Leave Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Affected Date */}
          <div className="form-group">
            <label htmlFor="affectedDate">Affected Date *</label>
            <input
              type="date"
              id="affectedDate"
              name="affectedDate"
              value={formData.affectedDate}
              onChange={handleChange}
              required
            />
          </div>

          {/* Start Time */}
          <div className="form-group">
            <label htmlFor="startTime">Start Time *</label>
            <input
              type="datetime-local"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
            />
          </div>

          {/* End Time */}
          <div className="form-group">
            <label htmlFor="endTime">End Time *</label>
            <input
              type="datetime-local"
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency */}
          <div className="form-group">
            <label htmlFor="urgency">Urgency Level</label>
            <select
              id="urgency"
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
            >
              {urgencyLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="form-group full-width">
            <label htmlFor="reason">Reason *</label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Please provide a detailed reason for your request..."
              rows="4"
              maxLength="500"
              required
            />
            <small>{500 - formData.reason.length} characters remaining</small>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '⏳ Submitting...' : '📤 Submit Request'}
          </button>

          <button
            type="button"
            className="btn btn-emergency"
            onClick={handleEmergencyExit}
            disabled={loading}
          >
            🚨 Emergency Exit (Auto-Approve)
          </button>
        </div>
      </form>

      <div className="help-text">
        <h4>📝 Request Types:</h4>
        <ul>
          <li><strong>Late Arrival:</strong> When you'll arrive after scheduled time</li>
          <li><strong>Early Departure:</strong> When you need to leave before scheduled end time</li>
          <li><strong>Emergency Exit:</strong> Already left due to emergency (auto-approved)</li>
          <li><strong>Partial Day:</strong> Taking a few hours off during the day</li>
          <li><strong>Medical Leave:</strong> Medical appointment or health-related absence</li>
          <li><strong>Official Duty:</strong> Work-related meetings or assignments outside office</li>
        </ul>
      </div>
    </div>
  );
};

export default LeaveRequestForm;