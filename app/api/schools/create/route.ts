import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { addDomainToVercel } from '@/lib/vercelDomains';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school, admin, subdomain } = body;

    // Validate required fields
    if (!school?.name || !school?.email || !admin?.name || !admin?.email || !admin?.password || !subdomain) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if subdomain is already taken
    const existingTenants = await adminDb
      .collection('tenants')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (!existingTenants.empty) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
        { status: 400 }
      );
    }

    // Step 1: Create tenant (school) document
    const tenantRef = await adminDb.collection('tenants').add({
      name: school.name,
      slug: subdomain,
      subdomain: subdomain,
      email: school.email,
      phone: school.phone || '',
      address: school.address || '',
      logoUrl: null,
      primaryColor: '#3B82F6', // Default blue
      plan: 'trial',
      status: 'trial',
      maxStudents: 50,
      maxTeachers: 5,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const tenantId = tenantRef.id;

    // Step 2: Create admin user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: admin.email,
      password: admin.password,
      displayName: admin.name,
    });

    // Step 3: Set custom claims (role + tenantId)
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      tenantId: tenantId,
    });

    // Step 4: Create user document in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      tenantId: tenantId,
      email: admin.email,
      name: admin.name,
      role: 'admin',
      phone: '',
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Step 5: Create default academic term
    await adminDb.collection('terms').add({
      tenantId: tenantId,
      name: 'First Term 2024/2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      isCurrent: true,
      academicYear: '2024/2025',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Step 6: Send welcome email to school admin (non-blocking)
    const schoolUrl = `https://${subdomain}.seth.ng`;
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://seth.ng'}/api/users/send-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: admin.email,
        name: admin.name,
        role: 'admin',
        password: admin.password,
        schoolName: school.name,
        schoolUrl: schoolUrl,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          console.log(`Welcome email sent to ${admin.email}`);
        } else {
          console.warn(`Failed to send welcome email: ${result.error}`);
        }
      })
      .catch((error) => {
        console.error('Error sending welcome email:', error);
      });

    // Step 7: Add domain to Vercel (non-blocking, optional)
    // Only runs if VERCEL_TOKEN is configured
    if (process.env.VERCEL_TOKEN) {
      addDomainToVercel(subdomain)
        .then((result) => {
          if (result.success) {
            console.log(`Domain ${result.domain} added to Vercel successfully`);
          } else {
            console.warn(`Failed to add domain to Vercel: ${result.error}`);
          }
        })
        .catch((error) => {
          console.error('Error in background domain addition:', error);
        });
    } else {
      console.log('Vercel token not configured, skipping domain addition (using Cloudflare wildcard SSL)');
    }

    console.log('School created successfully:', {
      tenantId,
      userId: userRecord.uid,
      subdomain,
    });

    return NextResponse.json({
      success: true,
      tenantId,
      userId: userRecord.uid,
      subdomain,
      message: 'School created successfully',
    });
  } catch (error: any) {
    console.error('Error creating school:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Admin email already in use' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create school' },
      { status: 500 }
    );
  }
}
