import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { generatePassword } from '@/lib/utils/passwordGenerator';

interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'teacher' | 'parent';
  tenantId: string;
  schoolName: string;
  schoolUrl: string;
  sendInvitation?: boolean; // Default: true
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    const { name, email, phone, role, tenantId, schoolName, schoolUrl, sendInvitation = true } = body;

    // Validate required fields
    if (!name || !email || !role || !tenantId || !schoolName || !schoolUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate secure temporary password
    const temporaryPassword = generatePassword();

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: email.toLowerCase().trim(),
      password: temporaryPassword,
      displayName: name.trim(),
      disabled: false,
    });

    // Set custom claims (role and tenantId)
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role,
      tenantId,
    });

    // Create user document in Firestore
    const userData = {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      phone: phone?.trim() || null,
      role,
      tenantId,
      isActive: true,
      mustChangePassword: true, // Force password change on first login
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('users').doc(userRecord.uid).set(userData);

    // Send invitation email (if requested)
    if (sendInvitation) {
      try {
        const invitationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/users/send-invitation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            name: name.trim(),
            role,
            password: temporaryPassword,
            schoolName,
            schoolUrl,
          }),
        });

        if (!invitationResponse.ok) {
          console.error('Failed to send invitation email');
          // Don't fail the user creation if email fails
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't fail the user creation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
      temporaryPassword: sendInvitation ? undefined : temporaryPassword, // Only return password if not sending email
      message: sendInvitation
        ? `User created successfully. Invitation sent to ${email}`
        : 'User created successfully',
    });
  } catch (error: any) {
    console.error('User creation error:', error);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create user',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
