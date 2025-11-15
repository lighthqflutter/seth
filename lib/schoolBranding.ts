/**
 * School Branding Configuration (Phase 17)
 * Centralized branding settings for PDF report cards and other documents
 */

export interface SchoolBranding {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  motto?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

/**
 * Get school branding from tenant configuration
 * In a real implementation, this would fetch from Firestore
 * based on the tenant ID
 */
export async function getSchoolBranding(tenantId: string): Promise<SchoolBranding> {
  // TODO: Fetch from Firestore based on tenantId
  // For now, return default branding

  // This is a placeholder - in production, you would:
  // const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
  // return tenantDoc.data()?.branding || getDefaultBranding();

  return getDefaultBranding();
}

/**
 * Default school branding (fallback)
 */
export function getDefaultBranding(): SchoolBranding {
  return {
    name: 'School Portal',
    address: '123 Education Street, Academic District',
    phone: '+234 XXX XXX XXXX',
    email: 'info@schoolportal.edu',
    website: 'www.schoolportal.edu',
    motto: 'Excellence in Education',
    colors: {
      primary: '#2563eb',  // Blue
      secondary: '#1e40af', // Dark blue
      accent: '#f59e0b',    // Orange
    },
  };
}

/**
 * Cedars School specific branding
 * Example of tenant-specific configuration
 */
export function getCedarsSchoolBranding(): SchoolBranding {
  return {
    name: 'Cedars International School',
    address: 'Lagos, Nigeria',
    phone: '+234 XXX XXX XXXX',
    email: 'info@cedarsportal.com.ng',
    website: 'www.cedarsportal.com.ng',
    motto: 'Nurturing Excellence, Building Character',
    colors: {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#059669',  // Green for Cedars
    },
  };
}

/**
 * Update school branding in tenant configuration
 * Admin-only function
 */
export async function updateSchoolBranding(
  tenantId: string,
  branding: Partial<SchoolBranding>
): Promise<void> {
  // TODO: Implement Firestore update
  // import { doc, updateDoc } from 'firebase/firestore';
  // import { db } from '@/lib/firebase/client';

  // await updateDoc(doc(db, 'tenants', tenantId), {
  //   branding: branding,
  //   updatedAt: new Date(),
  // });

  console.log('Branding updated for tenant:', tenantId, branding);
}

/**
 * Validate school branding configuration
 */
export function validateBranding(branding: Partial<SchoolBranding>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (branding.name && branding.name.length < 3) {
    errors.push('School name must be at least 3 characters');
  }

  if (branding.email && !branding.email.includes('@')) {
    errors.push('Invalid email address');
  }

  if (branding.phone && branding.phone.length < 10) {
    errors.push('Phone number must be at least 10 characters');
  }

  if (branding.website && !branding.website.match(/^(www\.)?[\w-]+\.\w+/)) {
    errors.push('Invalid website URL format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
