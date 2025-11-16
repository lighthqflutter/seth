import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { createDefaultClassicTemplate, createDefaultTemplateFromTenantSettings } from './defaultTemplate';
import { createTemplate } from './templateCRUD';
import { assignTemplateToAllClasses } from './templateAssignment';
import { hasTemplates } from './templateCRUD';

/**
 * Ensures a tenant has a default template
 * If the tenant has no templates, creates a default classic template
 * This is called on first access to the report card builder
 */
export async function ensureDefaultTemplate(
  tenantId: string,
  userId: string
): Promise<{
  success: boolean;
  templateId?: string;
  created?: boolean;
  error?: string;
}> {
  try {
    // Check if tenant already has templates
    const templatesExist = await hasTemplates(tenantId);

    if (templatesExist) {
      return {
        success: true,
        created: false,
      };
    }

    // No templates exist - create default template
    // Try to get tenant settings to adapt the template
    const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
    let tenantSettings: any = undefined;

    if (tenantDoc.exists()) {
      const tenantData = tenantDoc.data();
      if (tenantData.settings) {
        tenantSettings = {
          numberOfCAs: tenantData.settings.assessment?.numberOfCAs,
          showAttendance: tenantData.settings.reportCard?.sections?.attendanceInfo,
          showSkills: tenantData.settings.reportCard?.sections?.skillsRating,
          reportCardTemplate: tenantData.settings.reportCard?.template,
        };
      }
    }

    // Create default template
    const defaultTemplate = tenantSettings
      ? createDefaultTemplateFromTenantSettings(tenantId, userId, tenantSettings)
      : createDefaultClassicTemplate(tenantId, userId);

    const result = await createTemplate(defaultTemplate);

    if (!result.success || !result.templateId) {
      return {
        success: false,
        error: result.error || 'Failed to create default template',
      };
    }

    // Assign to all classes
    const assignResult = await assignTemplateToAllClasses(result.templateId, tenantId);

    if (!assignResult.success) {
      // Template was created but assignment failed - still consider it a success
      console.warn('Default template created but assignment failed:', assignResult.error);
    }

    return {
      success: true,
      templateId: result.templateId,
      created: true,
    };
  } catch (error) {
    console.error('Error ensuring default template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Migrates all existing schools to use the template system
 * This can be run as a one-time migration script
 *
 * @param adminUserId - User ID to set as creator of default templates
 */
export async function migrateAllTenantsToTemplates(
  adminUserId: string
): Promise<{
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errors: string[];
}> {
  const results = {
    success: true,
    migratedCount: 0,
    skippedCount: 0,
    errors: [] as string[],
  };

  try {
    // Get all tenants
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;

      try {
        const result = await ensureDefaultTemplate(tenantId, adminUserId);

        if (result.success && result.created) {
          results.migratedCount++;
        } else if (result.success && !result.created) {
          results.skippedCount++;
        } else {
          results.errors.push(`${tenantId}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${tenantId}: ${errorMessage}`);
      }
    }

    if (results.errors.length > 0) {
      results.success = false;
    }

    return results;
  } catch (error) {
    console.error('Error migrating tenants to templates:', error);
    return {
      success: false,
      migratedCount: results.migratedCount,
      skippedCount: results.skippedCount,
      errors: [...results.errors, error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Checks if migration is needed for a tenant
 */
export async function isMigrationNeeded(tenantId: string): Promise<boolean> {
  try {
    const templatesExist = await hasTemplates(tenantId);
    return !templatesExist;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Gets migration status for all tenants (admin utility)
 */
export async function getMigrationStatus(): Promise<{
  totalTenants: number;
  migratedTenants: number;
  unmigratedTenants: number;
}> {
  try {
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    const totalTenants = tenantsSnapshot.size;

    let migratedCount = 0;

    for (const tenantDoc of tenantsSnapshot.docs) {
      const templatesExist = await hasTemplates(tenantDoc.id);
      if (templatesExist) {
        migratedCount++;
      }
    }

    return {
      totalTenants,
      migratedTenants: migratedCount,
      unmigratedTenants: totalTenants - migratedCount,
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    return {
      totalTenants: 0,
      migratedTenants: 0,
      unmigratedTenants: 0,
    };
  }
}
