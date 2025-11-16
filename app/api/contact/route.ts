import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sh004.webhostbox.net',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // Use SSL
  auth: {
    user: process.env.SMTP_USER || 'notify@seth.com.ng',
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolName, contactName, email, phone, studentCount, message } = body;

    // Validate required fields
    if (!schoolName || !contactName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Email to admin
    const adminEmailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #4B5563; }
    .value { color: #1F2937; margin-top: 5px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New School Inquiry - SETH Portal</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">School Name:</div>
        <div class="value">${schoolName}</div>
      </div>

      <div class="field">
        <div class="label">Contact Person:</div>
        <div class="value">${contactName}</div>
      </div>

      <div class="field">
        <div class="label">Email:</div>
        <div class="value"><a href="mailto:${email}">${email}</a></div>
      </div>

      <div class="field">
        <div class="label">Phone:</div>
        <div class="value"><a href="tel:${phone}">${phone}</a></div>
      </div>

      ${studentCount ? `
      <div class="field">
        <div class="label">Estimated Student Count:</div>
        <div class="value">${studentCount}</div>
      </div>
      ` : ''}

      ${message ? `
      <div class="field">
        <div class="label">Message:</div>
        <div class="value" style="white-space: pre-wrap;">${message}</div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Sent from SETH School Portal Contact Form</p>
        <p>${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })} (WAT)</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Email to customer (confirmation)
    const customerEmailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Thank You for Your Inquiry!</h2>
    </div>
    <div class="content">
      <p>Dear ${contactName},</p>

      <p>Thank you for your interest in SETH School Portal. We have received your inquiry for <strong>${schoolName}</strong> and our team will review it shortly.</p>

      <p><strong>What happens next?</strong></p>
      <ul>
        <li>We'll review your information within 24 hours</li>
        <li>Set up your custom school portal (${schoolName.toLowerCase().replace(/\s+/g, '')}.seth.ng)</li>
        <li>Create your admin account</li>
        <li>Send you login credentials and setup instructions</li>
      </ul>

      <p>If you have any urgent questions, feel free to contact us:</p>
      <p>
        📧 <a href="mailto:hello@seth.ng">hello@seth.ng</a><br>
        📞 <a href="tel:+2348106940120">+234 810 694 0120</a>
      </p>

      <p>Best regards,<br>
      The SETH Team</p>

      <div class="footer">
        <p>SETH School Portal - Modern School Management System</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email to admin
    await transporter.sendMail({
      from: `"SETH Portal" <${process.env.SMTP_USER || 'notify@seth.ng'}>`,
      to: 'hello@seth.ng',
      subject: `New School Inquiry: ${schoolName}`,
      html: adminEmailContent,
      replyTo: email,
    });

    // Send confirmation email to customer
    await transporter.sendMail({
      from: `"SETH Portal" <${process.env.SMTP_USER || 'notify@seth.ng'}>`,
      to: email,
      subject: 'Thank you for your inquiry - SETH School Portal',
      html: customerEmailContent,
    });

    return NextResponse.json({
      success: true,
      message: 'Inquiry sent successfully',
    });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send inquiry',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
