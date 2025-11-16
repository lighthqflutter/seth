import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { ReportCardTemplate } from '@/types/reportCardTemplate';

const COLLECTION_NAME = 'reportCardTemplates';

/**
 * Assigns a template to specific classes
 */
export async function assignTemplateToClasses(
  templateId: string,
  classIds: string[]
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

    const template = templateDoc.data() as ReportCardTemplate;

    // Merge with existing assignments (avoid duplicates)
    const existingClassIds = template.assignedToClasses || [];
    const mergedClassIds = Array.from(new Set([...existingClassIds, ...classIds]));

    await updateDoc(templateRef, {
      assignedToClasses: mergedClassIds,
      updatedAt: Timestamp.now(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error assigning template to classes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Assigns a template to all classes of specific levels
 */
export async function assignTemplateToLevels(
  templateId: string,
  levels: string[]
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

    const template = templateDoc.data() as ReportCardTemplate;

    // Merge with existing level assignments (avoid duplicates)
    const existingLevels = template.assignedToLevels || [];
    const mergedLevels = Array.from(new Set([...existingLevels, ...levels]));

    await updateDoc(templateRef, {
      assignedToLevels: mergedLevels,
      updatedAt: Timestamp.now(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error assigning template to levels:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Assigns a template to all classes (by assigning to all levels)
 */
export async function assignTemplateToAllClasses(
  templateId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all class levels for the tenant
    const classesSnapshot = await getDocs(
      query(collection(db, 'classes'), where('tenantId', '==', tenantId))
    );

    const allLevels = Array.from(
      new Set(classesSnapshot.docs.map((doc) => doc.data().level as string))
    ).filter(Boolean);

    // Assign to all levels
    return await assignTemplateToLevels(templateId, allLevels);
  } catch (error) {
    console.error('Error assigning template to all classes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Removes template assignment from specific classes
 */
export async function unassignTemplateFromClasses(
  templateId: string,
  classIds: string[]
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

    const template = templateDoc.data() as ReportCardTemplate;
    const updatedClassIds = (template.assignedToClasses || []).filter(
      (id) => !classIds.includes(id)
    );

    await updateDoc(templateRef, {
      assignedToClasses: updatedClassIds,
      updatedAt: Timestamp.now(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error unassigning template from classes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Removes template assignment from specific levels
 */
export async function unassignTemplateFromLevels(
  templateId: string,
  levels: string[]
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

    const template = templateDoc.data() as ReportCardTemplate;
    const updatedLevels = (template.assignedToLevels || []).filter(
      (level) => !levels.includes(level)
    );

    await updateDoc(templateRef, {
      assignedToLevels: updatedLevels,
      updatedAt: Timestamp.now(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error unassigning template from levels:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Clears all assignments for a template
 */
export async function clearTemplateAssignments(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const templateRef = doc(db, COLLECTION_NAME, templateId);

    await updateDoc(templateRef, {
      assignedToClasses: [],
      assignedToLevels: [],
      updatedAt: Timestamp.now(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error clearing template assignments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Gets the template assigned to a specific class
 * Priority: 1) Direct class assignment, 2) Level assignment, 3) Default template
 */
export async function getTemplateForClass(
  classId: string,
  tenantId: string
): Promise<ReportCardTemplate | null> {
  try {
    // Step 1: Check for direct class assignment
    const directQuery = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', tenantId),
      where('assignedToClasses', 'array-contains', classId),
      where('isActive', '==', true)
    );

    const directSnapshot = await getDocs(directQuery);
    if (!directSnapshot.empty) {
      const doc = directSnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as ReportCardTemplate;
    }

    // Step 2: Get class level and check for level assignment
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (!classDoc.exists()) {
      return null;
    }

    const classData = classDoc.data();
    const classLevel = classData.level as string;

    if (classLevel) {
      const levelQuery = query(
        collection(db, COLLECTION_NAME),
        where('tenantId', '==', tenantId),
        where('assignedToLevels', 'array-contains', classLevel),
        where('isActive', '==', true)
      );

      const levelSnapshot = await getDocs(levelQuery);
      if (!levelSnapshot.empty) {
        const doc = levelSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as ReportCardTemplate;
      }
    }

    // Step 3: Fall back to default template
    const defaultQuery = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', tenantId),
      where('isDefault', '==', true),
      where('isActive', '==', true)
    );

    const defaultSnapshot = await getDocs(defaultQuery);
    if (!defaultSnapshot.empty) {
      const doc = defaultSnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as ReportCardTemplate;
    }

    // No template found
    return null;
  } catch (error) {
    console.error('Error getting template for class:', error);
    return null;
  }
}

/**
 * Gets all classes assigned to a template (directly or via level)
 */
export async function getClassesForTemplate(
  templateId: string,
  tenantId: string
): Promise<Array<{ id: string; name: string; level: string }>> {
  try {
    const templateDoc = await getDoc(doc(db, COLLECTION_NAME, templateId));
    if (!templateDoc.exists()) {
      return [];
    }

    const template = templateDoc.data() as ReportCardTemplate;
    const assignedClasses: Array<{ id: string; name: string; level: string }> = [];

    // Get all classes for the tenant
    const classesSnapshot = await getDocs(
      query(collection(db, 'classes'), where('tenantId', '==', tenantId))
    );

    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      const classId = classDoc.id;
      const className = classData.name as string;
      const classLevel = classData.level as string;

      // Check if class is directly assigned
      const isDirectlyAssigned = template.assignedToClasses.includes(classId);

      // Check if class level is assigned
      const isLevelAssigned = template.assignedToLevels.includes(classLevel);

      if (isDirectlyAssigned || isLevelAssigned) {
        assignedClasses.push({
          id: classId,
          name: className,
          level: classLevel,
        });
      }
    }

    return assignedClasses;
  } catch (error) {
    console.error('Error getting classes for template:', error);
    return [];
  }
}

/**
 * Replaces template assignment for a class
 * (Removes class from other templates and assigns to new template)
 */
export async function reassignClassTemplate(
  classId: string,
  newTemplateId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Remove class from all other templates
    const allTemplatesQuery = query(
      collection(db, COLLECTION_NAME),
      where('tenantId', '==', tenantId),
      where('assignedToClasses', 'array-contains', classId)
    );

    const allTemplatesSnapshot = await getDocs(allTemplatesQuery);

    for (const templateDoc of allTemplatesSnapshot.docs) {
      if (templateDoc.id !== newTemplateId) {
        await unassignTemplateFromClasses(templateDoc.id, [classId]);
      }
    }

    // Step 2: Assign to new template
    return await assignTemplateToClasses(newTemplateId, [classId]);
  } catch (error) {
    console.error('Error reassigning class template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Gets assignment summary for a template
 */
export interface AssignmentSummary {
  totalDirectClasses: number;
  totalLevels: number;
  totalAffectedClasses: number;
  directClassNames: string[];
  levelNames: string[];
}

export async function getTemplateAssignmentSummary(
  templateId: string,
  tenantId: string
): Promise<AssignmentSummary> {
  try {
    const templateDoc = await getDoc(doc(db, COLLECTION_NAME, templateId));
    if (!templateDoc.exists()) {
      return {
        totalDirectClasses: 0,
        totalLevels: 0,
        totalAffectedClasses: 0,
        directClassNames: [],
        levelNames: [],
      };
    }

    const template = templateDoc.data() as ReportCardTemplate;

    // Get class names for direct assignments
    const directClassNames: string[] = [];
    if (template.assignedToClasses.length > 0) {
      for (const classId of template.assignedToClasses) {
        const classDoc = await getDoc(doc(db, 'classes', classId));
        if (classDoc.exists()) {
          directClassNames.push(classDoc.data().name as string);
        }
      }
    }

    // Get all affected classes
    const affectedClasses = await getClassesForTemplate(templateId, tenantId);

    return {
      totalDirectClasses: template.assignedToClasses.length,
      totalLevels: template.assignedToLevels.length,
      totalAffectedClasses: affectedClasses.length,
      directClassNames,
      levelNames: template.assignedToLevels,
    };
  } catch (error) {
    console.error('Error getting assignment summary:', error);
    return {
      totalDirectClasses: 0,
      totalLevels: 0,
      totalAffectedClasses: 0,
      directClassNames: [],
      levelNames: [],
    };
  }
}
