const express = require('express');
const router = express.Router();
const ReportSchedule = require('../models/ReportSchedule');
const { protect, authorize } = require('../middleware/auth');
const { generateAndSendReport } = require('../services/scheduledReports');

// Get all report schedules
router.get('/', protect, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const schedules = await ReportSchedule.find()
      .populate('facility', 'name code')
      .populate('recipients', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching report schedules:', error);
    res.status(500).json({ message: 'Error fetching report schedules', error: error.message });
  }
});

// Get single report schedule
router.get('/:id', protect, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const schedule = await ReportSchedule.findById(req.params.id)
      .populate('facility', 'name code')
      .populate('recipients', 'name email')
      .populate('createdBy', 'name email');

    if (!schedule) {
      return res.status(404).json({ message: 'Report schedule not found' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Error fetching report schedule:', error);
    res.status(500).json({ message: 'Error fetching report schedule', error: error.message });
  }
});

// Create new report schedule
router.post('/', protect, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      name,
      frequency,
      facility,
      recipients,
      additionalEmails,
      isActive
    } = req.body;

    // Validate required fields
    if (!name || !frequency || !facility) {
      return res.status(400).json({ 
        message: 'Name, frequency, and facility are required' 
      });
    }

    // Validate frequency
    if (!['weekly', 'monthly', 'quarterly'].includes(frequency)) {
      return res.status(400).json({ 
        message: 'Frequency must be weekly, monthly, or quarterly' 
      });
    }

    // Validate that there is at least one recipient
    if ((!recipients || recipients.length === 0) && 
        (!additionalEmails || additionalEmails.length === 0)) {
      return res.status(400).json({ 
        message: 'At least one recipient is required' 
      });
    }

    const schedule = new ReportSchedule({
      name,
      frequency,
      facility,
      recipients: recipients || [],
      additionalEmails: additionalEmails || [],
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.userId
    });

    await schedule.save();

    const populatedSchedule = await ReportSchedule.findById(schedule._id)
      .populate('facility', 'name code')
      .populate('recipients', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedSchedule);
  } catch (error) {
    console.error('Error creating report schedule:', error);
    res.status(500).json({ message: 'Error creating report schedule', error: error.message });
  }
});

// Update report schedule
router.put('/:id', protect, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      name,
      frequency,
      facility,
      recipients,
      additionalEmails,
      isActive
    } = req.body;

    const schedule = await ReportSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Report schedule not found' });
    }

    // Validate frequency if provided
    if (frequency && !['weekly', 'monthly', 'quarterly'].includes(frequency)) {
      return res.status(400).json({ 
        message: 'Frequency must be weekly, monthly, or quarterly' 
      });
    }

    // Update fields
    if (name !== undefined) schedule.name = name;
    if (frequency !== undefined) schedule.frequency = frequency;
    if (facility !== undefined) schedule.facility = facility;
    if (recipients !== undefined) schedule.recipients = recipients;
    if (additionalEmails !== undefined) schedule.additionalEmails = additionalEmails;
    if (isActive !== undefined) schedule.isActive = isActive;

    await schedule.save();

    const populatedSchedule = await ReportSchedule.findById(schedule._id)
      .populate('facility', 'name code')
      .populate('recipients', 'name email')
      .populate('createdBy', 'name email');

    res.json(populatedSchedule);
  } catch (error) {
    console.error('Error updating report schedule:', error);
    res.status(500).json({ message: 'Error updating report schedule', error: error.message });
  }
});

// Delete report schedule
router.delete('/:id', protect, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const schedule = await ReportSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Report schedule not found' });
    }

    await schedule.deleteOne();

    res.json({ message: 'Report schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting report schedule:', error);
    res.status(500).json({ message: 'Error deleting report schedule', error: error.message });
  }
});

// Manually trigger a scheduled report
router.post('/:id/trigger', protect, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const schedule = await ReportSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Report schedule not found' });
    }

    if (!schedule.isActive) {
      return res.status(400).json({ message: 'Cannot trigger inactive schedule' });
    }

    // Generate and send report in background
    generateAndSendReport(schedule)
      .then(() => {
        console.log('Manual report triggered successfully for:', schedule.name);
      })
      .catch(error => {
        console.error('Error in manual report trigger:', error);
      });

    res.json({ 
      message: 'Report generation triggered successfully',
      note: 'Report will be generated and sent in the background'
    });
  } catch (error) {
    console.error('Error triggering report:', error);
    res.status(500).json({ message: 'Error triggering report', error: error.message });
  }
});

module.exports = router;
