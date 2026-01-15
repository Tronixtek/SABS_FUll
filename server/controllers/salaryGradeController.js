const SalaryGrade = require('../models/SalaryGrade');
const Employee = require('../models/Employee');

// Get all salary grades
exports.getSalaryGrades = async (req, res) => {
  try {
    const { active } = req.query;
    
    const query = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const grades = await SalaryGrade.find(query)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .sort({ baseSalary: 1 });

    // Get employee count for each grade
    const gradesWithCount = await Promise.all(
      grades.map(async (grade) => {
        const employeeCount = await Employee.countDocuments({ salaryGrade: grade._id });
        return {
          ...grade.toObject(),
          employeeCount
        };
      })
    );

    res.json({
      success: true,
      data: gradesWithCount
    });
  } catch (error) {
    console.error('Error fetching salary grades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary grades'
    });
  }
};

// Get single salary grade
exports.getSalaryGrade = async (req, res) => {
  try {
    const grade = await SalaryGrade.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Salary grade not found'
      });
    }

    const employeeCount = await Employee.countDocuments({ salaryGrade: grade._id });

    res.json({
      success: true,
      data: {
        ...grade.toObject(),
        employeeCount
      }
    });
  } catch (error) {
    console.error('Error fetching salary grade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary grade'
    });
  }
};

// Create new salary grade
exports.createSalaryGrade = async (req, res) => {
  try {
    const { code, name, baseSalary, description, minSalary, maxSalary, benefits } = req.body;

    // Validate
    if (!code || !name || !baseSalary) {
      return res.status(400).json({
        success: false,
        message: 'Code, name, and base salary are required'
      });
    }

    // Check if code already exists
    const existing = await SalaryGrade.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Salary grade code already exists'
      });
    }

    // Validate salary range
    if (minSalary && maxSalary && minSalary > maxSalary) {
      return res.status(400).json({
        success: false,
        message: 'Minimum salary cannot be greater than maximum salary'
      });
    }

    if (baseSalary < (minSalary || 0) || (maxSalary && baseSalary > maxSalary)) {
      return res.status(400).json({
        success: false,
        message: 'Base salary must be within the min-max range'
      });
    }

    const grade = new SalaryGrade({
      code: code.toUpperCase(),
      name,
      baseSalary,
      description,
      minSalary,
      maxSalary,
      benefits: benefits || [],
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    await grade.save();

    res.status(201).json({
      success: true,
      message: 'Salary grade created successfully',
      data: grade
    });
  } catch (error) {
    console.error('Error creating salary grade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create salary grade'
    });
  }
};

// Update salary grade
exports.updateSalaryGrade = async (req, res) => {
  try {
    const { code, name, baseSalary, description, minSalary, maxSalary, benefits, isActive } = req.body;

    const grade = await SalaryGrade.findById(req.params.id);
    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Salary grade not found'
      });
    }

    // Check if code is being changed and if it already exists
    if (code && code.toUpperCase() !== grade.code) {
      const existing = await SalaryGrade.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Salary grade code already exists'
        });
      }
    }

    // Validate salary range
    const newMinSalary = minSalary !== undefined ? minSalary : grade.minSalary;
    const newMaxSalary = maxSalary !== undefined ? maxSalary : grade.maxSalary;
    const newBaseSalary = baseSalary !== undefined ? baseSalary : grade.baseSalary;

    if (newMinSalary && newMaxSalary && newMinSalary > newMaxSalary) {
      return res.status(400).json({
        success: false,
        message: 'Minimum salary cannot be greater than maximum salary'
      });
    }

    if (newBaseSalary < (newMinSalary || 0) || (newMaxSalary && newBaseSalary > newMaxSalary)) {
      return res.status(400).json({
        success: false,
        message: 'Base salary must be within the min-max range'
      });
    }

    // Update fields
    if (code) grade.code = code.toUpperCase();
    if (name) grade.name = name;
    if (baseSalary !== undefined) grade.baseSalary = baseSalary;
    if (description !== undefined) grade.description = description;
    if (minSalary !== undefined) grade.minSalary = minSalary;
    if (maxSalary !== undefined) grade.maxSalary = maxSalary;
    if (benefits !== undefined) grade.benefits = benefits;
    if (isActive !== undefined) grade.isActive = isActive;
    grade.updatedBy = req.user.id;

    await grade.save();

    res.json({
      success: true,
      message: 'Salary grade updated successfully',
      data: grade
    });
  } catch (error) {
    console.error('Error updating salary grade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update salary grade'
    });
  }
};

// Delete salary grade
exports.deleteSalaryGrade = async (req, res) => {
  try {
    const grade = await SalaryGrade.findById(req.params.id);
    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Salary grade not found'
      });
    }

    // Check if any employees are assigned to this grade
    const employeeCount = await Employee.countDocuments({ salaryGrade: grade._id });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete salary grade. ${employeeCount} employee(s) are currently assigned to this grade.`
      });
    }

    await grade.deleteOne();

    res.json({
      success: true,
      message: 'Salary grade deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting salary grade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salary grade'
    });
  }
};

// Get salary grade statistics
exports.getSalaryGradeStats = async (req, res) => {
  try {
    const totalGrades = await SalaryGrade.countDocuments({ isActive: true });
    const totalEmployees = await Employee.countDocuments({ salaryGrade: { $exists: true, $ne: null } });
    
    const gradeDistribution = await Employee.aggregate([
      {
        $match: { salaryGrade: { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: '$salaryGrade',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'salarygrades',
          localField: '_id',
          foreignField: '_id',
          as: 'grade'
        }
      },
      {
        $unwind: '$grade'
      },
      {
        $project: {
          gradeName: '$grade.name',
          gradeCode: '$grade.code',
          baseSalary: '$grade.baseSalary',
          employeeCount: '$count'
        }
      },
      {
        $sort: { baseSalary: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalGrades,
        totalEmployees,
        distribution: gradeDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching salary grade stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary grade statistics'
    });
  }
};
