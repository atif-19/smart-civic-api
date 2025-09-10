const nodemailer = require('nodemailer');

// Create a "transporter" object using the SMTP transport
// This is the engine that will actually send the emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // sometimes needed on Render free tier
  },
});


// A reusable function to send notification emails
const sendNotificationEmail = async (userEmail, reportCategory, newStatus) => {
  const subject = `Update on your report: ${reportCategory}`;
  const textBody = `Hi there,\n\nThe status of your report regarding "${reportCategory}" has been updated to "${newStatus}".\n\nThank you for helping improve our city!\n\nThe Smart Civic Reporting Team`;
  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Report Status Update</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <!-- Main Container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden;">
              
              <!-- Header Section -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 15px; padding: 15px 25px; backdrop-filter: blur(10px);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      🏛️ Smart Civic Reporting
                    </h1>
                  </div>
                </td>
              </tr>
              
              <!-- Status Badge -->
              <tr>
                <td style="padding: 0 30px;">
                  <div style="margin-top: -25px; text-align: center;">
                    <div style="display: inline-block; background: #ffffff; border-radius: 50px; padding: 12px 30px; box-shadow: 0 8px 20px rgba(102,126,234,0.3);">
                      <span style="color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                        ✨ Status Update
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 40px 30px 40px;">
                  <p style="margin: 0 0 25px 0; color: #4a5568; font-size: 17px; line-height: 1.6;">
                    Hi there! 👋
                  </p>
                  
                  <div style="background: linear-gradient(135deg, #f6f8fb 0%, #f1f5f9 100%); border-radius: 15px; padding: 25px; margin: 25px 0; border-left: 4px solid #667eea;">
                    <p style="margin: 0 0 15px 0; color: #2d3748; font-size: 16px; line-height: 1.5;">
                      Great news! Your report has been updated:
                    </p>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 12px 0;">
                          <div style="display: flex; align-items: center;">
                            <span style="color: #718096; font-size: 14px; font-weight: 500; display: inline-block; min-width: 80px;">Category:</span>
                            <span style="background: #e9d8fd; color: #553c9a; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; margin-left: 10px;">
                              ${reportCategory}
                            </span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <div style="display: flex; align-items: center;">
                            <span style="color: #718096; font-size: 14px; font-weight: 500; display: inline-block; min-width: 80px;">Status:</span>
                            <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; margin-left: 10px; box-shadow: 0 4px 12px rgba(102,126,234,0.3);">
                              🎯 ${newStatus}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <div style="background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center; border: 1px solid #f9e79f;">
                    <p style="margin: 0; color: #7d6608; font-size: 15px; line-height: 1.5;">
                      <strong>🙏 Thank you</strong> for being an active citizen and helping us build a better, smarter city together!
                    </p>
                  </div>
                  
                  <!-- Call to Action Button -->
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="https://smart-civic-client.vercel.app" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 10px 25px rgba(102,126,234,0.3); transition: all 0.3s ease;">
                      View More Reports →
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center">
                        <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px; font-weight: 600;">
                          The Smart Civic Reporting Team
                        </p>
                        <p style="margin: 0 0 15px 0; color: #a0aec0; font-size: 13px;">
                          Building better cities, one report at a time
                        </p>
                        
                        <!-- Social Icons -->
                        <div style="margin: 20px 0;">
                          <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                            <div style="width: 36px; height: 36px; background: #667eea; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
                              📧
                            </div>
                          </a>
                          <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                            <div style="width: 36px; height: 36px; background: #764ba2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
                              🌐
                            </div>
                          </a>
                          <a href="#" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                            <div style="width: 36px; height: 36px; background: #667eea; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
                              📱
                            </div>
                          </a>
                        </div>
                        
                        <p style="margin: 15px 0 0 0; color: #cbd5e0; font-size: 12px; line-height: 1.5;">
                          © 2024 Smart Civic Reporting. All rights reserved.<br>
                          <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a> • 
                          <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a> • 
                          <a href="#" style="color: #667eea; text-decoration: none;">Contact Us</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Smart Civic Reporting" <${process.env.FROM_EMAIL}>`, // sender address
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