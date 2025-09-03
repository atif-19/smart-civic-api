const nodemailer = require('nodemailer');

// Create a "transporter" object using the SMTP transport
// This is the engine that will actually send the emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// A reusable function to send notification emails
const sendNotificationEmail = async (userEmail, reportCategory, newStatus) => {
  const subject = `Update on your report: ${reportCategory}`;
  const textBody = `Hi there,\n\nThe status of your report regarding "${reportCategory}" has been updated to "${newStatus}".\n\nThank you for helping improve our city!\n\nThe Smart Civic Reporting Team`;
  const htmlBody = `
    <p>Hi there,</p>
    <p>The status of your report regarding "<strong>${reportCategory}</strong>" has been updated to "<strong>${newStatus}</strong>".</p>
    <p>Thank you for helping improve our city!</p>
    <p><em>The Smart Civic Reporting Team</em></p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Smart Civic Reporting" <${process.env.SMTP_USER}>`, // sender address
      to: userEmail, // list of receivers
      subject: subject, // Subject line
      text: textBody, // plain text body
      html: htmlBody, // html body
    });
    console.log('Email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = { sendNotificationEmail };