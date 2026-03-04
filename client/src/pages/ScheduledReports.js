import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Autocomplete,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TriggerIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ScheduledReports = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    frequency: 'weekly',
    facility: '',
    recipients: [],
    additionalEmails: [],
    isActive: true
  });
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    fetchSchedules();
    fetchFacilities();
    fetchUsers();
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/report-schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setSchedules(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch schedules');
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/facilities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setFacilities(data);
    } catch (err) {
      console.error('Failed to fetch facilities:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        name: schedule.name,
        frequency: schedule.frequency,
        facility: schedule.facility._id,
        recipients: schedule.recipients || [],
        additionalEmails: schedule.additionalEmails || [],
        isActive: schedule.isActive
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        name: '',
        frequency: 'weekly',
        facility: '',
        recipients: [],
        additionalEmails: [],
        isActive: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
    setEmailInput('');
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && /^\S+@\S+\.\S+$/.test(email)) {
      if (!formData.additionalEmails.includes(email)) {
        setFormData({
          ...formData,
          additionalEmails: [...formData.additionalEmails, email]
        });
      }
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email) => {
    setFormData({
      ...formData,
      additionalEmails: formData.additionalEmails.filter(e => e !== email)
    });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      // Validation
      if (!formData.name || !formData.facility) {
        setError('Name and facility are required');
        return;
      }
      
      if (formData.recipients.length === 0 && formData.additionalEmails.length === 0) {
        setError('At least one recipient is required');
        return;
      }

      const token = localStorage.getItem('token');
      const url = editingSchedule
        ? `${API_URL}/report-schedules/${editingSchedule._id}`
        : `${API_URL}/report-schedules`;
      
      const payload = {
        ...formData,
        recipients: formData.recipients.map(r => r._id || r)
      };

      const response = await fetch(url, {
        method: editingSchedule ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingSchedule ? 'Schedule updated successfully' : 'Schedule created successfully');
        handleCloseDialog();
        fetchSchedules();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to save schedule');
      }
    } catch (err) {
      setError('Failed to save schedule');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/report-schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Schedule deleted successfully');
        fetchSchedules();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete schedule');
      }
    } catch (err) {
      setError('Failed to delete schedule');
    }
  };

  const handleToggleActive = async (schedule) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/report-schedules/${schedule._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...schedule,
          facility: schedule.facility._id,
          recipients: schedule.recipients.map(r => r._id),
          isActive: !schedule.isActive
        })
      });

      if (response.ok) {
        fetchSchedules();
      } else {
        setError('Failed to update schedule');
      }
    } catch (err) {
      setError('Failed to update schedule');
    }
  };

  const handleTrigger = async (id) => {
    try {
      setSuccess('Triggering report generation...');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/report-schedules/${id}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Report generation triggered successfully');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.message || 'Failed to trigger report');
      }
    } catch (err) {
      setError('Failed to trigger report');
    }
  };

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case 'weekly': return 'primary';
      case 'monthly': return 'success';
      case 'quarterly': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Scheduled Reports
        </Typography>
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Schedule
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Facility</TableCell>
              <TableCell>Recipients</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No scheduled reports found. Create one to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => (
                <TableRow key={schedule._id}>
                  <TableCell>{schedule.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.frequency.toUpperCase()}
                      color={getFrequencyColor(schedule.frequency)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{schedule.facility?.name}</TableCell>
                  <TableCell>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {schedule.recipients?.slice(0, 2).map((recipient) => (
                        <Chip
                          key={recipient._id}
                          label={recipient.name}
                          size="small"
                          icon={<EmailIcon />}
                        />
                      ))}
                      {schedule.additionalEmails?.slice(0, 1).map((email) => (
                        <Chip
                          key={email}
                          label={email}
                          size="small"
                          icon={<EmailIcon />}
                        />
                      ))}
                      {(schedule.recipients?.length + schedule.additionalEmails?.length) > 3 && (
                        <Chip
                          label={`+${(schedule.recipients?.length || 0) + (schedule.additionalEmails?.length || 0) - 3} more`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.isActive ? 'Active' : 'Inactive'}
                      color={schedule.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {schedule.lastRun
                      ? new Date(schedule.lastRun).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleTrigger(schedule._id)}
                      disabled={!schedule.isActive}
                      title="Trigger now"
                    >
                      <TriggerIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(schedule)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <Switch
                      size="small"
                      checked={schedule.isActive}
                      onChange={() => handleToggleActive(schedule)}
                      title="Toggle active"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(schedule._id)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Schedule Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />

            <TextField
              select
              label="Frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="weekly">Weekly (Every Friday 5:00 PM)</MenuItem>
              <MenuItem value="monthly">Monthly (1st of month 8:00 AM)</MenuItem>
              <MenuItem value="quarterly">Quarterly (1st of quarter 9:00 AM)</MenuItem>
            </TextField>

            <TextField
              select
              label="Facility"
              value={formData.facility}
              onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
              fullWidth
              required
            >
              {facilities.map((facility) => (
                <MenuItem key={facility._id} value={facility._id}>
                  {facility.name}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(option) => `${option.name} (${option.email})`}
              value={formData.recipients}
              onChange={(e, newValue) => setFormData({ ...formData, recipients: newValue })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="System Recipients"
                  placeholder="Select users"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    size="small"
                  />
                ))
              }
            />

            <Box>
              <Box display="flex" gap={1} mb={1}>
                <TextField
                  label="Additional Email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                  placeholder="email@example.com"
                  fullWidth
                  size="small"
                />
                <Button onClick={handleAddEmail} variant="outlined">
                  Add
                </Button>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {formData.additionalEmails.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => handleRemoveEmail(email)}
                    size="small"
                  />
                ))}
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingSchedule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ScheduledReports;
