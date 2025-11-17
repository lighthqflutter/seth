/**
 * Test SMTP - Send to hello@seth.ng
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
    user: 'notify@seth.com.ng',
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendTests() {
  console.log('\n📧 Sending test emails to multiple addresses...\n');

  // Test 1: Send to hello@seth.ng
  try {
    console.log('1️⃣ Sending to hello@seth.ng...');
    const info1 = await transporter.sendMail({
      from: '"SETH Portal" <notify@seth.com.ng>',
      to: 'hello@seth.ng',
      subject: 'SMTP Test - Internal Email',
      html: `
        <h2>SMTP Test to hello@seth.ng</h2>
        <p>This is a test email sent to the SETH internal email address.</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        <p>If you receive this, the SMTP configuration is working!</p>
      `,
    });
    console.log('✅ Sent to hello@seth.ng');
    console.log('   Message ID:', info1.messageId);
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to send to hello@seth.ng:', error.message);
  }

  // Test 2: Send to nnamdiwakwe@gmail.com with proper headers
  try {
    console.log('2️⃣ Sending to nnamdiwakwe@gmail.com (with proper headers)...');
    const info2 = await transporter.sendMail({
      from: '"SETH Portal" <notify@seth.com.ng>',
      to: 'nnamdiwakwe@gmail.com',
      replyTo: 'hello@seth.ng',
      subject: 'SETH Portal - Test Email #2',
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
      <p style="margin: 10px 0 0 0;">SMTP Configuration Test</p>
    </div>

    <div style="background-color: #f9fafb; padding: 30px;">
      <h3>Test Email #2</h3>
      <p>Hello,</p>
      <p>This is test email #2 from SETH Portal SMTP server.</p>

      <div style="background-color: #3B82F6; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>If you're reading this, the email was successfully delivered!</strong>
      </div>

      <p><strong>Details:</strong></p>
      <ul>
        <li>From: notify@seth.com.ng</li>
        <li>SMTP Host: sh004.webhostbox.net</li>
        <li>Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })} WAT</li>
      </ul>

      <p><strong>Next Steps:</strong></p>
      <p>If you received this email, please confirm and we can proceed with deployment.</p>

      <p>Best regards,<br>SETH Portal Team</p>
    </div>

    <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
      <p>This is an automated test email from SETH Portal</p>
      <p>Reply to: hello@seth.ng</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
SETH School Portal - SMTP Test

This is test email #2 from SETH Portal SMTP server.

If you're reading this, the email was successfully delivered!

Details:
- From: notify@seth.com.ng
- SMTP Host: sh004.webhostbox.net
- Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })} WAT

Next Steps:
If you received this email, please confirm and we can proceed with deployment.

Best regards,
SETH Portal Team

---
Reply to: hello@seth.ng
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
  console.log('   - hello@seth.ng (should arrive quickly)');
  console.log('   - nnamdiwakwe@gmail.com (check inbox and spam)');
  console.log('');
  console.log('💡 Note: Gmail may filter emails from new senders');
  console.log('   Common reasons for not appearing:');
  console.log('   1. SPF/DKIM records not set up for seth.com.ng');
  console.log('   2. Gmail spam filter (check spam/junk folder)');
  console.log('   3. Gmail may take a few minutes to deliver');
  console.log('');
}

sendTests();
