const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');
const { syncLogger } = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromEmail = null;
  }

  async initializeTransporter() {
    try {
      // Get email settings from database
      const smtpHost = await Settings.findOne({ key: 'smtpHost' });
      const smtpPort = await Settings.findOne({ key: 'smtpPort' });
      const smtpUser = await Settings.findOne({ key: 'smtpUser' });
      const smtpPassword = await Settings.findOne({ key: 'smtpPassword' });
      const fromEmail = await Settings.findOne({ key: 'fromEmail' });

      if (!smtpHost || !smtpUser || !smtpPassword) {
        syncLogger.warn('⚠️ Email settings not configured');
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: smtpHost.value,
        port: parseInt(smtpPort?.value || '587'),
        secure: smtpPort?.value === '465', // true for 465, false for other ports
        auth: {
          user: smtpUser.value,
          pass: smtpPassword.value,
        },
      });

      this.fromEmail = fromEmail?.value || smtpUser.value;
      
      // Verify connection
      await this.transporter.verify();
      syncLogger.info('✅ Email service initialized successfully');
      return true;
    } catch (error) {
      syncLogger.error(`❌ Email service initialization failed: ${error.message}`);
      return false;
    }
  }

  async sendLateArrivalNotification(employee, attendance) {
    try {
      const enabled = await this.isNotificationEnabled('lateArrivalNotification');
      if (!enabled) {
        syncLogger.info('Late arrival notifications are disabled');
        return;
      }

      if (!employee.email) {
        syncLogger.warn(`⚠️ No email address for employee: ${employee.firstName} ${employee.lastName}`);
        return;
      }

      const initialized = await this.initializeTransporter();
      if (!initialized) return;

      const mailOptions = {
        from: this.fromEmail,
        to: employee.email,
        subject: `Late Arrival Notice - ${new Date().toLocaleDateString()}`,
        html: this.getLateArrivalTemplate(employee, attendance),
      };

      await this.transporter.sendMail(mailOptions);
      syncLogger.info(`📧 Late arrival email sent to ${employee.email}`);
    } catch (error) {
      syncLogger.error(`❌ Failed to send late arrival email: ${error.message}`);
    }
  }

  async sendAbsentNotification(employee, date) {
    try {
      const enabled = await this.isNotificationEnabled('absentNotification');
      if (!enabled) {
        syncLogger.info('Absent notifications are disabled');
        return;
      }

      if (!employee.email) {
        syncLogger.warn(`⚠️ No email address for employee: ${employee.firstName} ${employee.lastName}`);
        return;
      }

      const initialized = await this.initializeTransporter();
      if (!initialized) return;

      const mailOptions = {
        from: this.fromEmail,
        to: employee.email,
        subject: `Absence Notice - ${new Date(date).toLocaleDateString()}`,
        html: this.getAbsentTemplate(employee, date),
      };

      await this.transporter.sendMail(mailOptions);
      syncLogger.info(`📧 Absent email sent to ${employee.email}`);
    } catch (error) {
      syncLogger.error(`❌ Failed to send absent email: ${error.message}`);
    }
  }

  async sendDailyReport(reportData, recipientEmail) {
    try {
      const enabled = await this.isNotificationEnabled('reportNotification');
      if (!enabled) {
        syncLogger.info('Report notifications are disabled');
        return;
      }

      const initialized = await this.initializeTransporter();
      if (!initialized) return;

      const mailOptions = {
        from: this.fromEmail,
        to: recipientEmail,
        subject: `Daily Attendance Report - ${new Date().toLocaleDateString()}`,
        html: this.getDailyReportTemplate(reportData),
      };

      await this.transporter.sendMail(mailOptions);
      syncLogger.info(`📧 Daily report sent to ${recipientEmail}`);
    } catch (error) {
      syncLogger.error(`❌ Failed to send daily report: ${error.message}`);
    }
  }

  async testEmailConfiguration(testEmail) {
    try {
      const initialized = await this.initializeTransporter();
      if (!initialized) {
        return { success: false, message: 'Email configuration is incomplete' };
      }

      const mailOptions = {
        from: this.fromEmail,
        to: testEmail,
        subject: 'Test Email - SABS (Smart Attendance Biometric System)',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px; }
              .content { padding: 20px; background: #f9fafb; margin-top: 20px; border-radius: 8px; }
              .brand { font-size: 12px; color: #6b7280; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>✅ Email Test Successful!</h2>
                <div class="brand">SABS - Smart Attendance Biometric System</div>
              </div>
              <div class="content">
                <p>Your email configuration is working correctly.</p>
                <p>This is a test email from your SABS (Smart Attendance Biometric System).</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      syncLogger.info(`✅ Test email sent successfully to ${testEmail}`);
      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      syncLogger.error(`❌ Test email failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async isNotificationEnabled(key) {
    const masterEnabled = await Settings.findOne({ key: 'emailNotifications' });
    if (!masterEnabled || masterEnabled.value !== 'true') return false;

    const specific = await Settings.findOne({ key });
    return specific && specific.value === 'true';
  }

  getLateArrivalTemplate(employee, attendance) {
    const scheduledTime = attendance.scheduledCheckIn ? new Date(attendance.scheduledCheckIn).toLocaleTimeString() : 'N/A';
    const actualTime = attendance.checkIn?.time ? new Date(attendance.checkIn.time).toLocaleTimeString() : 'N/A';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background: #f9fafb; }
          .info { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #f59e0b; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; background: #f3f4f6; border-radius: 0 0 8px 8px; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">⏰ Late Arrival Notice</h2>
          </div>
          <div class="content">
            <p>Hello <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
            <p>This is to inform you that you were marked late for today's attendance.</p>
            
            <div class="info">
              <p style="margin: 5px 0;"><span class="label">Date:</span> <span class="value">${new Date(attendance.date).toLocaleDateString()}</span></p>
              <p style="margin: 5px 0;"><span class="label">Scheduled Check-in:</span> <span class="value">${scheduledTime}</span></p>
              <p style="margin: 5px 0;"><span class="label">Actual Check-in:</span> <span class="value">${actualTime}</span></p>
              <p style="margin: 5px 0;"><span class="label">Late by:</span> <span class="value" style="color: #f59e0b; font-weight: bold;">${attendance.lateArrival || 0} minutes</span></p>
            </div>
            
            <p>Please ensure you arrive on time in the future to avoid any impact on your attendance record.</p>
            <p style="color: #6b7280; font-size: 14px;">If you believe this is an error, please contact your HR department.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from SABS (Smart Attendance Biometric System).</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getAbsentTemplate(employee, date) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background: #f9fafb; }
          .info { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #ef4444; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; background: #f3f4f6; border-radius: 0 0 8px 8px; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">❌ Absence Notice</h2>
          </div>
          <div class="content">
            <p>Hello <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
            <p>You were marked absent for the following date:</p>
            
            <div class="info">
              <p style="margin: 5px 0;"><span class="label">Date:</span> <span class="value">${new Date(date).toLocaleDateString()}</span></p>
              <p style="margin: 5px 0;"><span class="label">Status:</span> <span class="value" style="color: #ef4444; font-weight: bold;">Absent</span></p>
              <p style="margin: 5px 0;"><span class="label">Reason:</span> <span class="value">No check-in recorded</span></p>
            </div>
            
            <p><strong>Important:</strong> If you were present on this date, please contact HR immediately to rectify your attendance record.</p>
            <p style="color: #6b7280; font-size: 14px;">Make sure to check in using the biometric device when you arrive at work.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from SABS (Smart Attendance Biometric System).</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDailyReportTemplate(reportData) {
    const attendanceRate = reportData.totalEmployees > 0 
      ? ((reportData.present / reportData.totalEmployees) * 100).toFixed(1)
      : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 20px; background: #f9fafb; }
          .stat { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .stat-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
          .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .rate { background: #10b981; color: white; padding: 15px; text-align: center; margin: 0 20px; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; background: #f3f4f6; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">📊 Daily Attendance Report</h2>
            <p style="margin: 5px 0;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div class="rate">
            <div style="font-size: 32px; font-weight: bold;">${attendanceRate}%</div>
            <div>Attendance Rate</div>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-label">Total Employees</div>
              <div class="stat-value" style="color: #3b82f6;">${reportData.totalEmployees || 0}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Present</div>
              <div class="stat-value" style="color: #10b981;">${reportData.present || 0}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Late</div>
              <div class="stat-value" style="color: #f59e0b;">${reportData.late || 0}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Absent</div>
              <div class="stat-value" style="color: #ef4444;">${reportData.absent || 0}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated daily report from SABS (Smart Attendance Biometric System).</p>
            <p>For detailed reports, please log in to the system.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
