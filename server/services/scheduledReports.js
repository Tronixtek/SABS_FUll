const cron = require('node-cron');
const moment = require('moment');
const ReportSchedule = require('../models/ReportSchedule');
const { generateMonthlyReportPDF } = require('../controllers/reportController');
const { sendReportEmail } = require('../utils/emailService');
const User = require('../models/User');
const Facility = require('../models/Facility');

/**
 * Generate and send scheduled report
 */
const generateAndSendReport = async (schedule) => {
  try {
    console.log(`\n📊 Generating ${schedule.frequency} report: ${schedule.name}`);

    // Determine date range based on frequency
    let startDate, endDate;
    const now = moment();

    switch (schedule.frequency) {
      case 'weekly':
        // Last 7 days
        startDate = now.clone().subtract(7, 'days').format('YYYY-MM-DD');
        endDate = now.format('YYYY-MM-DD');
        break;
      
      case 'monthly':
        // Last month
        startDate = now.clone().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
        endDate = now.clone().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
        break;
      
      case 'quarterly':
        // Last quarter
        const currentQuarter = now.quarter();
        const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
        const lastQuarterYear = currentQuarter === 1 ? now.year() - 1 : now.year();
        startDate = moment().year(lastQuarterYear).quarter(lastQuarter).startOf('quarter').format('YYYY-MM-DD');
        endDate = moment().year(lastQuarterYear).quarter(lastQuarter).endOf('quarter').format('YYYY-MM-DD');
        break;
      
      default:
        throw new Error(`Invalid frequency: ${schedule.frequency}`);
    }

    // Get facility details
    const facility = await Facility.findById(schedule.facility);
    if (!facility) {
      throw new Error(`Facility not found: ${schedule.facility}`);
    }

    // Generate PDF report
    console.log(`Generating report for ${facility.name} from ${startDate} to ${endDate}`);
    const pdfBuffer = await generateMonthlyReportPDF({
      facilityId: schedule.facility,
      startDate,
      endDate
    });

    // Get recipient emails
    const recipients = [];
    
    // Add system user emails
    if (schedule.recipients && schedule.recipients.length > 0) {
      const users = await User.find({ _id: { $in: schedule.recipients } });
      recipients.push(...users.map(u => u.email).filter(Boolean));
    }
    
    // Add additional emails
    if (schedule.additionalEmails && schedule.additionalEmails.length > 0) {
      recipients.push(...schedule.additionalEmails);
    }

    if (recipients.length === 0) {
      console.log('⚠️ No recipients found for schedule:', schedule.name);
      return;
    }

    // Send email with PDF attachment
    const emailSubject = `${schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} Attendance Report - ${facility.name}`;
    
    await sendReportEmail({
      recipients,
      subject: emailSubject,
      reportType: schedule.frequency,
      pdfBuffer,
      facilityName: facility.name,
      startDate: moment(startDate).format('MMM D, YYYY'),
      endDate: moment(endDate).format('MMM D, YYYY')
    });

    console.log(`✓ Report sent successfully to ${recipients.length} recipient(s)`);
    
    // Update last run time
    schedule.lastRun = new Date();
    await schedule.save();

  } catch (error) {
    console.error(`✗ Error generating scheduled report:`, error);
    throw error;
  }
};

/**
 * Schedule weekly reports - Run every Friday at 5:00 PM
 */
const scheduleWeeklyReports = () => {
  // Run every Friday at 5:00 PM
  cron.schedule('0 17 * * 5', async () => {
    try {
      console.log('\n🕐 Running weekly report scheduler...');
      const schedules = await ReportSchedule.find({
        frequency: 'weekly',
        isActive: true
      });

      console.log(`Found ${schedules.length} active weekly schedule(s)`);

      for (const schedule of schedules) {
        await generateAndSendReport(schedule);
      }
    } catch (error) {
      console.error('Error in weekly report scheduler:', error);
    }
  });

  console.log('✓ Weekly report scheduler initialized (Fridays at 5:00 PM)');
};

/**
 * Schedule monthly reports - Run on 1st of every month at 8:00 AM
 */
const scheduleMonthlyReports = () => {
  // Run on 1st of every month at 8:00 AM
  cron.schedule('0 8 1 * *', async () => {
    try {
      console.log('\n🕐 Running monthly report scheduler...');
      const schedules = await ReportSchedule.find({
        frequency: 'monthly',
        isActive: true
      });

      console.log(`Found ${schedules.length} active monthly schedule(s)`);

      for (const schedule of schedules) {
        await generateAndSendReport(schedule);
      }
    } catch (error) {
      console.error('Error in monthly report scheduler:', error);
    }
  });

  console.log('✓ Monthly report scheduler initialized (1st of month at 8:00 AM)');
};

/**
 * Schedule quarterly reports - Run on 1st of Jan, Apr, Jul, Oct at 9:00 AM
 */
const scheduleQuarterlyReports = () => {
  // Run on 1st of January, April, July, October at 9:00 AM
  cron.schedule('0 9 1 1,4,7,10 *', async () => {
    try {
      console.log('\n🕐 Running quarterly report scheduler...');
      const schedules = await ReportSchedule.find({
        frequency: 'quarterly',
        isActive: true
      });

      console.log(`Found ${schedules.length} active quarterly schedule(s)`);

      for (const schedule of schedules) {
        await generateAndSendReport(schedule);
      }
    } catch (error) {
      console.error('Error in quarterly report scheduler:', error);
    }
  });

  console.log('✓ Quarterly report scheduler initialized (Quarterly at 9:00 AM)');
};

/**
 * Initialize all scheduled reports
 */
const initializeScheduledReports = () => {
  console.log('\n📅 Initializing scheduled reports...');
  
  scheduleWeeklyReports();
  scheduleMonthlyReports();
  scheduleQuarterlyReports();
  
  console.log('✓ All report schedulers initialized\n');
};

module.exports = {
  initializeScheduledReports,
  generateAndSendReport
};
