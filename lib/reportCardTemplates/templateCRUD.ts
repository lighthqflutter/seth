import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import {
  ReportCardTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilterOptions,
} from '@/types/reportCardTemplate';
import { validateCreateTemplate, validateUpdateTemplate } from './validators';

const COLLECTION_NAME = 'reportCardTemplates';

/**
 * Creates a new report card template
 */
export async function createTemplate(
  templateData: CreateTemplateInput
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    // Validate template data
    const validation = validateCreateTemplate(templateData);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Add timestamps
    const templateWithTimestamps = {
      ...templateData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // If this is set as default, unset other defaults first
    if (templateData.isDefault) {
      await unsetDefaultTemplates(templateData.tenantId);
    }

    // Create the template
    const docRef = await addDoc(collection(db, COLLECTION_NAME), templateWithTimestamps);

    return {
      success: true,
      templateId: docRef.id,
    };
  } catch (error) {
    console.error('Error creating template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Updates an existing report card template
 */
export async function updateTemplate(
  templateId: string,
  updates: UpdateTemplateInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate update data
    const validation = validateUpdateTemplate(updates);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Get template reference
    const templateRef = doc(db, COLLECTION_NAME, templateId);
    const templateDoc = await getDoc(templateRef);

    if (!templateDoc.exists()) {
      return {
        success: false,
        error: 'Template not found',
      };
    }

    const currentTemplate = templateDoc.data() as ReportCardTemplate;

    // If setting as default, unset other defaults first
    if (updates.isDefault && !currentTemplate.isDefault) {
      await unsetDefaultTemplates(currentTemplate.tenantId);
    }

    // Add updated timestamp
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // Update the template
    await updateDoc(templateRef, updatesWithTimestamp);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Deletes a report card template
 */
export async function deleteTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const templateRef = doc(db, COLLECTION_NAME, templateId);
    const templateDoc = await getDoc(templateRef);

    if (!templateDoc.exists()) {
      return {
        success: false,
        error: 'Template not found',
      };
    }

    const template = { id: templateDoc.id, ...templateDoc.data() } as ReportCardTemplate;

    // Check if template is assigned to any classes
    const totalAssignments = template.assignedToClasses.length + template.assignedToLevels.length;
    if (totalAssignments > 0) {
      return {
        success: false,
        error: `Cannot delete template. It is currently assigned to ${totalAssignments} class(es) or level(s). Please reassign before deleting.`,
      };
    }

    await deleteDoc(templateRef);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Clones an existing template
 */
export async function cloneTemplate(
  templateId: string,
  newName: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const templateRef = doc(db, COLLECTION_NAME, templateId);
    const templateDoc = await getDoc(templateRef);

    if (!templateDoc.exists()) {
      return {
        success: false,
        error: 'Template not found',
      };
    }

    const originalTemplate = templateDoc.data() as ReportCardTemplate;

    // Create a copy with a new name and reset certain fields
    const clonedTemplate: CreateTemplateInput = {
      ...originalTemplate,
      name: newName,
      description: `Cloned from ${originalTemplate.name}`,
      isDefault: false, // Clone is never default
      assignedToClasses: [], // Reset assignments
      assignedToLevels: [],
      createdBy: originalTemplate.createdBy, // Will be updated by caller if needed
    };

    // Create the cloned template
    return await createTemplate(clonedTemplate);
  } catch (error) {
    console.error('Error cloning template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Sets a template as the default for a tenant
 */
export async function setDefaultTemplate(
  templateId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Unset other defaults
    await unsetDefaultTemplates(tenantId);

    // Set this template as default
    const templateRef = doc(db, COLLECTION_NAME, templateId);
    await updateDoc(templateRef, {
      isDefault: true,
      updatedAt: Timestamp.now(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error setting default template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Toggles template active status
 */
export async function toggleTemplateActive(
  templateId: string
): Promise<{ success: boolean; isActive?: boolean; error?: string }> {
  try {
    const templateRef = doc(db, COLLECTION_NAME, templateId);
    const templateDoc = await getDoc(templateRef);

    if (!templateDoc.exists()) {
      return {
        success: false,
        error: 'Template not found',
      };
    }

    const template = templateDoc.data() as ReportCardTemplate;
    const newActiveStatus = !template.isActive;

    await updateDoc(templateRef, {
      isActive: newActiveStatus,
      updatedAt: Timestamp.now(),
    });

    return {
      success: true,
      isActive: newActiveStatus,
    };
  } catch (error) {
    console.error('Error toggling template status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Gets a single template by ID
 */
export async function getTemplate(
  templateId: string
): Promise<ReportCardTemplate | null> {
  try {
    const templateRef = doc(db, COLLECTION_NAME, templateId);
    const templateDoc = await getDoc(templateRef);

    if (!templateDoc.exists()) {
      return null;
    }

    return { id: templateDoc.id, ...templateDoc.data() } as ReportCardTemplate;
  } catch (error) {
    console.error('Error getting template:', error);
    return null;
  }
}

/**
 * Gets all templates for a tenant with optional filtering
 */
export async function getTemplates(
  filterOptions: TemplateFilterOptions
): Promise<ReportCardTemplate[]> {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', filterOptions.tenantId),
      orderBy('createdAt', 'desc')
    );

    // Apply filters
    if (filterOptions.isActive !== undefined) {
      q = query(q, where('isActive', '==', filterOptions.isActive));
    }

    if (filterOptions.isDefault !== undefined) {
      q = query(q, where('isDefault', '==', filterOptions.isDefault));
    }

    if (filterOptions.templateType) {
      q = query(q, where('templateType', '==', filterOptions.templateType));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as ReportCardTemplate)
    );
  } catch (error) {
    console.error('Error getting templates:', error);
    return [];
  }
}

/**
 * Gets the default template for a tenant
 */
export async function getDefaultTemplate(tenantId: string): Promise<ReportCardTemplate | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', tenantId),
      where('isDefault', '==', true),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ReportCardTemplate;
  } catch (error) {
    console.error('Error getting default template:', error);
    return null;
  }
}

/**
 * Helper function to unset all default templates for a tenant
 */
async function unsetDefaultTemplates(tenantId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('tenantId', '==', tenantId),
    where('isDefault', '==', true)
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isDefault: false, updatedAt: Timestamp.now() });
    });
    await batch.commit();
  }
}

/**
 * Gets active templates count for a tenant
 */
export async function getActiveTemplatesCount(tenantId: string): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', tenantId),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting active templates count:', error);
    return 0;
  }
}

/**
 * Checks if a tenant has any templates
 */
export async function hasTemplates(tenantId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', tenantId)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking for templates:', error);
    return false;
  }
}
