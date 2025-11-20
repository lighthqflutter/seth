import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sh004.webhostbox.net',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'notify@seth.ng',
    pass: process.env.SMTP_PASSWORD,
  },
});

interface InvitationRequest {
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'parent' | 'finance';
  password: string;
  schoolName: string;
  schoolUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InvitationRequest = await request.json();
    const { email, name, role, password, schoolName, schoolUrl } = body;

    // Validate required fields
    if (!email || !name || !role || !password || !schoolName || !schoolUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare role-specific content
    const roleDisplayName = role === 'admin' ? 'School Administrator' :
                           role === 'teacher' ? 'Teacher' :
                           'Parent';

    const roleWelcome = role === 'admin'
      ? 'You have been granted administrative access to manage your school portal.'
      : role === 'teacher'
      ? 'You have been added as a teacher. You can now manage your classes, enter scores, and track student performance.'
      : 'You have been added as a parent. You can now view your child\'s academic progress and results.';

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3B82F6; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials-box { background-color: white; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-item { margin: 10px 0; }
    .credential-label { font-weight: bold; color: #4B5563; }
    .credential-value { color: #1F2937; font-family: 'Courier New', monospace; background-color: #F3F4F6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
    .password-highlight { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6B7280; }
    .steps { background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; }
    .steps ol { margin: 10px 0; padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to ${schoolName}!</h2>
      <p style="margin: 10px 0 0 0;">Your ${roleDisplayName} Account is Ready</p>
    </div>
    <div class="content">
      <p>Hello ${name},</p>

      <p>${roleWelcome}</p>

      <div class="credentials-box">
        <h3 style="margin-top: 0; color: #1F2937;">Your Login Credentials</h3>

        <div class="credential-item">
          <div class="credential-label">Portal URL:</div>
          <div class="credential-value">${schoolUrl}</div>
        </div>

        <div class="credential-item">
          <div class="credential-label">Email:</div>
          <div class="credential-value">${email}</div>
        </div>

        <div class="credential-item">
          <div class="credential-label">Temporary Password:</div>
          <div class="credential-value" style="font-size: 18px; font-weight: bold;">${password}</div>
        </div>
      </div>

      <div class="password-highlight">
        <strong>⚠️ Important:</strong> For security reasons, you will be required to change this password when you first log in.
      </div>

      <div class="steps">
        <h3 style="margin-top: 0; color: #1F2937;">Getting Started:</h3>
        <ol>
          <li>Visit the portal URL above</li>
          <li>Log in using your email and temporary password</li>
          <li>Create a new secure password (minimum 6 characters)</li>
          <li>Start exploring the portal!</li>
        </ol>
      </div>

      <div style="text-align: center;">
        <a href="${schoolUrl}" class="button">Access Your Portal</a>
      </div>

      <p>If you have any questions or need assistance, please contact your school administrator.</p>

      <p>Best regards,<br>
      <strong>${schoolName}</strong><br>
      SETH School Portal</p>

      <div class="footer">
        <p>This is an automated invitation email from SETH School Portal</p>
        <p>Please do not reply to this email</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send invitation email
    await transporter.sendMail({
      from: `"${schoolName}" <${process.env.SMTP_USER || 'notify@seth.ng'}>`,
      to: email,
      subject: `Welcome to ${schoolName} - Your ${roleDisplayName} Account`,
      html: emailContent,
      text: `
Welcome to ${schoolName}!

Hello ${name},

${roleWelcome}

Your Login Credentials:
- Portal URL: ${schoolUrl}
- Email: ${email}
- Temporary Password: ${password}

IMPORTANT: For security reasons, you will be required to change this password when you first log in.

Getting Started:
1. Visit the portal URL above
2. Log in using your email and temporary password
3. Create a new secure password (minimum 6 characters)
4. Start exploring the portal!

If you have any questions or need assistance, please contact your school administrator.

Best regards,
${schoolName}
SETH School Portal

---
This is an automated invitation email from SETH School Portal
Please do not reply to this email
      `.trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
    });
  } catch (error: any) {
    console.error('Invitation email error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send invitation',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
