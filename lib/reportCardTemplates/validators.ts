import {
  ReportCardTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateValidationResult,
} from '@/types/reportCardTemplate';

/**
 * Validates a hex color code
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Validates template name
 */
function validateTemplateName(name: string): string[] {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push('Template name is required');
  } else if (name.length < 3) {
    errors.push('Template name must be at least 3 characters');
  } else if (name.length > 100) {
    errors.push('Template name must not exceed 100 characters');
  }

  return errors;
}

/**
 * Validates branding configuration
 */
function validateBranding(template: CreateTemplateInput | UpdateTemplateInput): string[] {
  const errors: string[] = [];

  if (!template.branding) {
    return errors; // Branding is optional for partial updates
  }

  const { branding } = template;

  // Validate custom colors if color scheme is 'custom'
  if (branding.colorScheme === 'custom') {
    if (!branding.customColors) {
      errors.push('Custom colors are required when color scheme is set to custom');
    } else {
      if (branding.customColors.header && !isValidHexColor(branding.customColors.header)) {
        errors.push('Invalid header color. Must be a valid hex color (e.g., #FF5733)');
      }
      if (branding.customColors.borders && !isValidHexColor(branding.customColors.borders)) {
        errors.push('Invalid borders color. Must be a valid hex color');
      }
      if (branding.customColors.grades && !isValidHexColor(branding.customColors.grades)) {
        errors.push('Invalid grades color. Must be a valid hex color');
      }
    }
  }

  return errors;
}

/**
 * Validates layout configuration
 */
function validateLayout(template: CreateTemplateInput | UpdateTemplateInput): string[] {
  const errors: string[] = [];

  if (!template.layout) {
    return errors; // Layout is optional for partial updates
  }

  const { layout } = template;

  // Validate sections
  if (!layout.sections || layout.sections.length === 0) {
    errors.push('At least one section must be defined in the layout');
  } else {
    const enabledSections = layout.sections.filter((s) => s.enabled);
    if (enabledSections.length === 0) {
      errors.push('At least one section must be enabled');
    }

    // Validate section order uniqueness
    const orders = layout.sections.map((s) => s.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      errors.push('Section orders must be unique');
    }

    // Validate custom layout positions
    if (layout.mode === 'custom') {
      for (const section of layout.sections) {
        if (!section.position) {
          errors.push(`Section ${section.id} requires position data in custom layout mode`);
        } else {
          const { row, col, rowSpan, colSpan } = section.position;
          if (row < 0 || col < 0 || rowSpan < 1 || colSpan < 1) {
            errors.push(`Invalid position data for section ${section.id}`);
          }
          if (col + colSpan > 12) {
            errors.push(`Section ${section.id} exceeds 12-column grid (col: ${col}, span: ${colSpan})`);
          }
        }
      }
    }
  }

  // Validate margins
  if (layout.margins) {
    const { top, right, bottom, left } = layout.margins;
    if (top < 0 || right < 0 || bottom < 0 || left < 0) {
      errors.push('Page margins must be non-negative');
    }
    if (top > 100 || right > 100 || bottom > 100 || left > 100) {
      errors.push('Page margins are too large (max 100)');
    }
  }

  return errors;
}

/**
 * Validates scores table configuration
 */
function validateScoresTable(template: CreateTemplateInput | UpdateTemplateInput): string[] {
  const errors: string[] = [];

  if (!template.scoresTable) {
    return errors; // ScoresTable is optional for partial updates
  }

  const { scoresTable } = template;

  // Validate columns
  if (!scoresTable.columns || scoresTable.columns.length === 0) {
    errors.push('At least one column must be selected for the scores table');
  }

  // 'Subject' and 'Total' should always be present
  if (scoresTable.columns && !scoresTable.columns.includes('Subject')) {
    errors.push('Scores table must include "Subject" column');
  }
  if (scoresTable.columns && !scoresTable.columns.includes('Total')) {
    errors.push('Scores table must include "Total" column');
  }

  return errors;
}

/**
 * Validates comments configuration
 */
function validateComments(template: CreateTemplateInput | UpdateTemplateInput): string[] {
  const errors: string[] = [];

  if (!template.comments) {
    return errors; // Comments is optional for partial updates
  }

  const { comments } = template;

  // Validate max length
  if (comments.maxLength !== undefined) {
    if (comments.maxLength < 50) {
      errors.push('Comment max length must be at least 50 characters');
    }
    if (comments.maxLength > 2000) {
      errors.push('Comment max length must not exceed 2000 characters');
    }
  }

  // At least one comment type should be enabled
  if (
    comments.showTeacherComment !== undefined &&
    comments.showPrincipalComment !== undefined &&
    !comments.showTeacherComment &&
    !comments.showPrincipalComment
  ) {
    errors.push('At least one comment type (teacher or principal) must be enabled');
  }

  return errors;
}

/**
 * Validates tenant ID is present
 */
function validateTenantId(template: CreateTemplateInput): string[] {
  const errors: string[] = [];

  if (!template.tenantId || template.tenantId.trim().length === 0) {
    errors.push('Tenant ID is required');
  }

  return errors;
}

/**
 * Main validation function for creating a new template
 */
export function validateCreateTemplate(template: CreateTemplateInput): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  errors.push(...validateTenantId(template));
  errors.push(...validateTemplateName(template.name));

  // Configuration validation
  errors.push(...validateBranding(template));
  errors.push(...validateLayout(template));
  errors.push(...validateScoresTable(template));
  errors.push(...validateComments(template));

  // Warnings
  if (template.description && template.description.length > 500) {
    warnings.push('Template description is very long (>500 chars)');
  }

  if (template.layout && template.layout.sections) {
    const enabledCount = template.layout.sections.filter((s) => s.enabled).length;
    if (enabledCount > 8) {
      warnings.push('Template has many sections enabled. This may result in multi-page report cards.');
    }
  }

  if (template.comments && template.comments.maxLength > 1000) {
    warnings.push('Very long comment max length may make report cards lengthy');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validation function for updating an existing template
 */
export function validateUpdateTemplate(update: UpdateTemplateInput): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate only fields that are being updated
  if (update.name !== undefined) {
    errors.push(...validateTemplateName(update.name));
  }

  if (update.branding !== undefined) {
    errors.push(...validateBranding(update as CreateTemplateInput));
  }

  if (update.layout !== undefined) {
    errors.push(...validateLayout(update as CreateTemplateInput));
  }

  if (update.scoresTable !== undefined) {
    errors.push(...validateScoresTable(update as CreateTemplateInput));
  }

  if (update.comments !== undefined) {
    errors.push(...validateComments(update as CreateTemplateInput));
  }

  // Warnings
  if (update.description && update.description.length > 500) {
    warnings.push('Template description is very long (>500 chars)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates imported template from JSON
 */
export function validateImportedTemplate(data: any): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== 'object') {
    errors.push('Invalid template data: must be a JSON object');
    return { valid: false, errors, warnings };
  }

  // Check required fields for template structure
  const requiredFields = ['name', 'templateType', 'layout', 'branding', 'scoresTable'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // If basic structure is valid, run full validation
  if (errors.length === 0) {
    // Remove any tenant-specific fields from imported data
    const sanitized = { ...data };
    delete sanitized.id;
    delete sanitized.tenantId;
    delete sanitized.assignedToClasses;
    delete sanitized.assignedToLevels;
    delete sanitized.createdAt;
    delete sanitized.updatedAt;
    delete sanitized.createdBy;

    // Validate as a create template (will add tenantId later)
    const createInput: CreateTemplateInput = {
      ...sanitized,
      tenantId: '', // Will be set on import
      createdBy: '', // Will be set on import
      assignedToClasses: [],
      assignedToLevels: [],
    };

    const validation = validateCreateTemplate(createInput);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  // Additional warnings for imported templates
  warnings.push('Imported template will be assigned a new ID and tenant');
  warnings.push('Review template configuration before using it');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick validation to check if template can be safely deleted
 */
export function validateTemplateDelete(template: ReportCardTemplate): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if template is assigned to any classes
  const totalAssignments =
    template.assignedToClasses.length + template.assignedToLevels.length;

  if (totalAssignments > 0) {
    errors.push(
      `Template is currently assigned to ${totalAssignments} class(es) or level(s). Please reassign before deleting.`
    );
  }

  // Warn if it's the default template
  if (template.isDefault) {
    warnings.push(
      'This is the default template. Deleting it may affect report card generation. Consider setting a new default first.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates template assignment data
 */
export interface AssignmentValidationOptions {
  templateId: string;
  classIds?: string[];
  levels?: string[];
  allClasses?: boolean;
}

export function validateTemplateAssignment(
  options: AssignmentValidationOptions
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!options.templateId || options.templateId.trim().length === 0) {
    errors.push('Template ID is required for assignment');
  }

  const hasClassIds = options.classIds && options.classIds.length > 0;
  const hasLevels = options.levels && options.levels.length > 0;
  const hasAllClasses = options.allClasses === true;

  // Must have at least one assignment target
  if (!hasClassIds && !hasLevels && !hasAllClasses) {
    errors.push('Must specify at least one assignment target (classes, levels, or all classes)');
  }

  // Warn about conflicts
  if (hasAllClasses && (hasClassIds || hasLevels)) {
    warnings.push(
      'Assigning to all classes will override any specific class or level assignments'
    );
  }

  if (hasClassIds && hasLevels) {
    warnings.push('Assigning to both specific classes and levels may create overlaps');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
