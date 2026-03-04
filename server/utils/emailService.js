const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Send report email with PDF attachment
 * @param {Object} options - Email options
 * @param {Array} options.recipients - Array of recipient email addresses
 * @param {String} options.subject - Email subject
 * @param {String} options.reportType - Type of report (weekly, monthly, quarterly)
 * @param {Buffer} options.pdfBuffer - PDF file buffer
 * @param {String} options.facilityName - Name of the facility
 * @param {String} options.startDate - Report start date
 * @param {String} options.endDate - Report end date
 */
const sendReportEmail = async (options) => {
  try {
    const {
      recipients,
      subject,
      reportType,
      pdfBuffer,
      facilityName,
      startDate,
      endDate
    } = options;

    // Create HTML email body
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .info-box {
            background: white;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #1e88e5;
            border-radius: 3px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background: #1e88e5;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Kano State Primary Health Care Management Board</h1>
            <p>Staff Attendance Biometric System</p>
          </div>
          <div class="content">
            <h2>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Attendance Report</h2>
            
            <div class="info-box">
              <strong>Facility:</strong> ${facilityName}<br>
              <strong>Report Period:</strong> ${startDate} to ${endDate}<br>
              <strong>Report Type:</strong> ${reportType.toUpperCase()}<br>
              <strong>Generated:</strong> ${new Date().toLocaleString()}
            </div>
            
            <p>Dear Stakeholder,</p>
            
            <p>Please find attached the ${reportType} attendance report for <strong>${facilityName}</strong> covering the period from <strong>${startDate}</strong> to <strong>${endDate}</strong>.</p>
            
            <p>The report includes:</p>
            <ul>
              <li>Total employees and attendance overview</li>
              <li>Individual employee attendance records</li>
              <li>Total working hours and expected hours</li>
              <li>Utilization rate and performance metrics</li>
              <li>Present, absent, and leave statistics</li>
            </ul>
            
            <p>Please review the attached PDF document for detailed information.</p>
            
            <p>If you have any questions or need additional information, please contact the system administrator.</p>
            
            <div style="margin-top: 30px;">
              <p><strong>Best regards,</strong><br>
              Kano State PHCMB<br>
              Staff Attendance Management System</p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated email from the Staff Attendance Biometric System.</p>
            <p>© ${new Date().getFullYear()} Kano State Primary Health Care Management Board</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate filename
    const filename = `${reportType}-report-${facilityName.replace(/\s+/g, '-')}-${startDate}-to-${endDate}.pdf`;

    // Send email
    const info = await transporter.sendMail({
      from: `"Kano State PHCMB" <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject: subject,
      html: htmlBody,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Verify email configuration
 */
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✓ Email service is ready');
    return true;
  } catch (error) {
    console.error('✗ Email service configuration error:', error.message);
    console.log('Please check your SMTP settings in .env file');
    return false;
  }
};

module.exports = {
  sendReportEmail,
  verifyEmailConfig
};
