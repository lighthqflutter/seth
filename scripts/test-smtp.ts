/**
 * Test SMTP Email Configuration
 *
 * Usage: npx tsx scripts/test-smtp.ts
 */

import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('📁 Loading environment from .env.local...');
  dotenv.config({ path: envPath });
} else {
  console.log('⚠️  Warning: .env.local not found');
}

const SMTP_HOST = process.env.SMTP_HOST || 'sh004.webhostbox.net';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || 'notify@seth.com.ng';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

async function testSMTP() {
  console.log('\n🔧 Testing SMTP Configuration...\n');

  console.log('Configuration:');
  console.log(`  Host: ${SMTP_HOST}`);
  console.log(`  Port: ${SMTP_PORT}`);
  console.log(`  User: ${SMTP_USER}`);
  console.log(`  Password: ${SMTP_PASSWORD ? '********' : 'NOT SET'}`);
  console.log('');

  if (!SMTP_PASSWORD) {
    console.error('❌ Error: SMTP_PASSWORD not set in .env.local');
    process.exit(1);
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true, // SSL
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
      debug: true, // Show debug output
      logger: true, // Log to console
    });

    console.log('✅ Transporter created');
    console.log('\n🔍 Verifying SMTP connection...\n');

    // Verify connection
    await transporter.verify();
    console.log('\n✅ SMTP connection verified successfully!\n');

    console.log('📧 Sending test email to nnamdiwakwe@gmail.com...\n');

    // Send test email
    const info = await transporter.sendMail({
      from: `"SETH Portal Test" <${SMTP_USER}>`,
      to: 'nnamdiwakwe@gmail.com',
      subject: 'SETH Portal - SMTP Test Email',
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .success { background-color: #10B981; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎉 SMTP Test Successful!</h2>
    </div>
    <div class="content">
      <div class="success">
        <strong>✅ Your SMTP configuration is working perfectly!</strong>
      </div>

      <p>Hello,</p>

      <p>This is a test email from the SETH School Portal system. If you're reading this, it means our SMTP email configuration is working correctly.</p>

      <h3>Configuration Details:</h3>
      <ul>
        <li><strong>SMTP Host:</strong> ${SMTP_HOST}</li>
        <li><strong>SMTP Port:</strong> ${SMTP_PORT}</li>
        <li><strong>From Email:</strong> ${SMTP_USER}</li>
        <li><strong>Sent At:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })} (WAT)</li>
      </ul>

      <h3>Next Steps:</h3>
      <p>The contact form on the SETH Portal is now ready to:</p>
      <ul>
        <li>Send inquiries to hello@seth.ng</li>
        <li>Send confirmation emails to customers</li>
        <li>Work without opening email clients</li>
      </ul>

      <p>Best regards,<br>
      <strong>SETH Portal System</strong></p>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <p style="font-size: 12px; color: #666;">
        This is an automated test email. Please do not reply.
      </p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      text: `
SMTP Test Successful!

This is a test email from the SETH School Portal system. If you're reading this, it means our SMTP email configuration is working correctly.

Configuration Details:
- SMTP Host: ${SMTP_HOST}
- SMTP Port: ${SMTP_PORT}
- From Email: ${SMTP_USER}
- Sent At: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })} (WAT)

Next Steps:
The contact form on the SETH Portal is now ready to:
- Send inquiries to hello@seth.ng
- Send confirmation emails to customers
- Work without opening email clients

Best regards,
SETH Portal System

---
This is an automated test email. Please do not reply.
      `.trim(),
    });

    console.log('\n✅ Test email sent successfully!\n');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n📬 Check nnamdiwakwe@gmail.com inbox (and spam folder)\n');
    console.log('🎉 SMTP configuration is working perfectly!\n');

  } catch (error: any) {
    console.error('\n❌ SMTP Test Failed!\n');
    console.error('Error:', error.message);

    if (error.code) {
      console.error('Error Code:', error.code);
    }

    if (error.command) {
      console.error('Failed Command:', error.command);
    }

    console.error('\n💡 Common issues:');
    console.error('  - Check SMTP credentials are correct');
    console.error('  - Verify SMTP server allows connections');
    console.error('  - Check firewall/network settings');
    console.error('  - Verify port 465 is not blocked');
    console.error('');

    process.exit(1);
  }
}

testSMTP();
