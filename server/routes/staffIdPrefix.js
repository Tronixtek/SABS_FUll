const express = require('express');
const router = express.Router();
const StaffIdPrefix = require('../models/StaffIdPrefix');

// Get all active prefixes
router.get('/', async (req, res) => {
  try {
    const prefixes = await StaffIdPrefix.find({ isActive: true }).sort({ prefix: 1 });
    res.json({ success: true, data: prefixes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all prefixes (including inactive)
router.get('/all', async (req, res) => {
  try {
    const prefixes = await StaffIdPrefix.find().sort({ prefix: 1 });
    res.json({ success: true, data: prefixes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new prefix
router.post('/', async (req, res) => {
  try {
    const { prefix, description } = req.body;
    
    if (!prefix) {
      return res.status(400).json({ success: false, message: 'Prefix is required' });
    }

    const newPrefix = new StaffIdPrefix({
      prefix: prefix.toUpperCase().trim(),
      description
    });

    await newPrefix.save();
    res.status(201).json({ success: true, data: newPrefix });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Prefix already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update prefix
router.put('/:id', async (req, res) => {
  try {
    const { prefix, description, isActive } = req.body;
    
    const updated = await StaffIdPrefix.findByIdAndUpdate(
      req.params.id,
      { 
        prefix: prefix?.toUpperCase().trim(),
        description,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Prefix not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Prefix already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete prefix
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await StaffIdPrefix.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Prefix not found' });
    }

    res.json({ success: true, message: 'Prefix deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
