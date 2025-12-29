// server/testEmail.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function runTest() {
  console.log("--- Starting Email Test ---");
  console.log("Host:", process.env.SMTP_HOST);
  console.log("User:", process.env.SMTP_USER);
  console.log("Pass:", process.env.SMTP_PASS ? 'Exists' : 'MISSING!');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ Error: SMTP_USER or SMTP_PASS is missing from your .env file.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log("\nAttempting to send a test email...");
    const info = await transporter.sendMail({
  from: `"Test Sender" <${process.env.FROM_EMAIL}>`, // use verified sender here
  to: "atifmalik7620@gmail.com",
  subject: "Nodemailer SMTP Test",
  text: "This is a test email from your application.",
});


    console.log("\n✅ SUCCESS! Email sent successfully.");
    console.log("Message ID:", info.messageId);
    
  } catch (error) {
    console.error("\n❌ FAILED. The credentials in your .env file are incorrect.");
    console.error("--- Full Error Log ---");
    console.error(error);
  }
}

runTest();