const Settings = require('../models/Settings');
const emailService = require('../services/emailService');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = {};
    if (category) query.category = category;
    
    // Non-admin users can only see public settings
    if (req.user.role !== 'super-admin' && req.user.role !== 'admin') {
      query.isPublic = true;
    }
    
    const settings = await Settings.find(query).sort({ category: 1, key: 1 });
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single setting
// @route   GET /api/settings/:key
// @access  Private
exports.getSetting = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }
    
    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update or create setting
// @route   PUT /api/settings/:key
// @access  Private (Admin only)
exports.updateSetting = async (req, res) => {
  try {
    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      req.body,
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );
    
    res.json({
      success: true,
      data: setting,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete setting
// @route   DELETE /api/settings/:key
// @access  Private (Admin only)
exports.deleteSetting = async (req, res) => {
  try {
    const setting = await Settings.findOneAndDelete({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Test email configuration
// @route   POST /api/settings/test-email
// @access  Private (Admin only)
exports.testEmail = async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    const result = await emailService.testEmailConfiguration(testEmail);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully! Check your inbox.'
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Email test failed: ${result.message}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
