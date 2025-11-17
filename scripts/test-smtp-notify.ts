/**
 * Test SMTP - Send to notify@seth.ng
 */

import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const transporter = nodemailer.createTransport({
  host: 'sh004.webhostbox.net',
  port: 465,
  secure: true,
  auth: {
    user: 'notify@seth.ng',
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendTests() {
  console.log('\n📧 Testing SMTP with notify@seth.ng...\n');

  // Test 1: Send to notify@seth.ng (admin email)
  try {
    console.log('1️⃣ Sending to notify@seth.ng (admin)...');
    const info1 = await transporter.sendMail({
      from: '"SETH Portal" <notify@seth.ng>',
      to: 'notify@seth.ng',
      subject: 'SMTP Test - Admin Email',
      html: `
        <h2>SMTP Test to notify@seth.ng</h2>
        <p>This is a test email sent to the SETH admin email address.</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        <p>If you receive this, the SMTP configuration is working!</p>
      `,
    });
    console.log('✅ Sent to notify@seth.ng');
    console.log('   Message ID:', info1.messageId);
    console.log('   Response:', info1.response);
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to send to notify@seth.ng:', error.message);
  }

  // Test 2: Send to nnamdiwakwe@gmail.com
  try {
    console.log('2️⃣ Sending to nnamdiwakwe@gmail.com...');
    const info2 = await transporter.sendMail({
      from: '"SETH Portal" <notify@seth.ng>',
      to: 'nnamdiwakwe@gmail.com',
      replyTo: 'notify@seth.ng',
      subject: 'SETH Portal - SMTP Test with notify@seth.ng',
      headers: {
        'X-Mailer': 'SETH Portal',
        'X-Priority': '3',
      },
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #3B82F6; color: white; padding: 20px; text-align: center;">
      <h2 style="margin: 0;">SETH School Portal</h2>
      <p style="margin: 10px 0 0 0;">SMTP Test with notify@seth.ng</p>
    </div>

    <div style="background-color: #f9fafb; padding: 30px;">
      <h3>Test Email</h3>
      <p>Hello,</p>
      <p>This is a test email from SETH Portal using the updated SMTP configuration.</p>

      <div style="background-color: #3B82F6; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>Updated SMTP Sender: notify@seth.ng</strong>
      </div>

      <p><strong>Details:</strong></p>
      <ul>
        <li>From: notify@seth.ng</li>
        <li>SMTP Host: sh004.webhostbox.net</li>
        <li>Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })} WAT</li>
      </ul>

      <p>If you receive this email, please confirm that the SMTP configuration is working correctly.</p>

      <p>Best regards,<br>SETH Portal Team</p>
    </div>

    <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
      <p>This is an automated test email from SETH Portal</p>
      <p>Reply to: notify@seth.ng</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
SETH School Portal - SMTP Test

This is a test email from SETH Portal using the updated SMTP configuration.

Updated SMTP Sender: notify@seth.ng

Details:
- From: notify@seth.ng
- SMTP Host: sh004.webhostbox.net
- Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })} WAT

If you receive this email, please confirm that the SMTP configuration is working correctly.

Best regards,
SETH Portal Team

---
Reply to: notify@seth.ng
      `,
    });
    console.log('✅ Sent to nnamdiwakwe@gmail.com');
    console.log('   Message ID:', info2.messageId);
    console.log('   Response:', info2.response);
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to send to Gmail:', error.message);
  }

  console.log('📬 Check both email addresses:');
  console.log('   - notify@seth.ng (admin inbox)');
  console.log('   - nnamdiwakwe@gmail.com (inbox and spam)');
  console.log('');
}

sendTests();
