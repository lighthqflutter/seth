/**
 * Dynamic CSV Generation System
 * Phase 10: Universal CSV templates based on actual entity structure
 *
 * This system generates CSV templates dynamically based on:
 * - Entity type (class, subject, term, teacher, student)
 * - Tenant configuration (custom fields, settings)
 * - User preferences (include optional fields, sample data)
 *
 * NO HARDCODED TEMPLATES - Everything is generated from entity definitions
 */

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone';

export interface EntityFieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  label: string;
  description?: string;
  sampleValues?: any[]; // Pre-defined sample values
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    format?: string;
  };
}

export interface EntityStructure {
  entityName: string;
  fields: EntityFieldDefinition[];
  customFields?: EntityFieldDefinition[];
  validationRules?: string[];
  importLimit?: number;
}

export interface CSVGenerationOptions {
  includeOptional: boolean;
  includeCustomFields?: boolean;
  sampleRows: number;
  emptyOptionalFields?: boolean;
}

export interface SampleDataOptions {
  emptyOptionalFields?: boolean;
}

/**
 * Entity Structure Definitions
 * These define the standard fields for each entity type
 */
const ENTITY_STRUCTURES: Record<string, EntityStructure> = {
  class: {
    entityName: 'class',
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Class Name', description: 'Full name of the class (e.g., JSS 1A, Year 5 Blue)' },
      { name: 'level', type: 'string', required: true, label: 'Level', description: 'Grade level (e.g., JSS1, SS2, Year5)', sampleValues: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'] },
      { name: 'academicYear', type: 'string', required: true, label: 'Academic Year', description: 'Academic year in YYYY/YYYY format', sampleValues: ['2024/2025', '2025/2026'] },
      { name: 'teacherId', type: 'string', required: false, label: 'Teacher ID', description: 'Optional: ID of class teacher' },
    ],
    importLimit: 100,
  },
  subject: {
    entityName: 'subject',
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Subject Name', description: 'Full name of the subject', sampleValues: ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology'] },
      { name: 'code', type: 'string', required: true, label: 'Subject Code', description: 'Unique uppercase code (e.g., MATH, ENG, PHY)', sampleValues: ['MATH', 'ENG', 'PHY', 'CHEM', 'BIO'] },
      { name: 'maxScore', type: 'number', required: true, label: 'Maximum Score', description: 'Total possible score', sampleValues: [100, 50, 75] },
      { name: 'description', type: 'string', required: false, label: 'Description', description: 'Optional subject description' },
    ],
    importLimit: 50,
  },
  term: {
    entityName: 'term',
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Term Name', description: 'Name of the term', sampleValues: ['First Term 2024/2025', 'Second Term 2024/2025', 'Third Term 2024/2025'] },
      { name: 'startDate', type: 'date', required: true, label: 'Start Date', description: 'Term start date (YYYY-MM-DD)' },
      { name: 'endDate', type: 'date', required: true, label: 'End Date', description: 'Term end date (YYYY-MM-DD)' },
      { name: 'isCurrent', type: 'boolean', required: true, label: 'Is Current', description: 'Is this the current term? (true/false)', sampleValues: [true, false] },
      { name: 'academicYear', type: 'string', required: true, label: 'Academic Year', description: 'Academic year in YYYY/YYYY format', sampleValues: ['2024/2025', '2025/2026'] },
    ],
    importLimit: 20,
  },
  teacher: {
    entityName: 'teacher',
    fields: [
      { name: 'name', type: 'string', required: true, label: 'Teacher Name', description: 'Full name of teacher', sampleValues: ['John Doe', 'Jane Smith', 'Robert Johnson'] },
      { name: 'email', type: 'email', required: true, label: 'Email Address', description: 'Valid email address', sampleValues: ['john.doe@school.com', 'jane.smith@school.com'] },
      { name: 'phone', type: 'phone', required: false, label: 'Phone Number', description: 'Optional phone number', sampleValues: ['1234567890', '0987654321', ''] },
    ],
    importLimit: 100,
  },
  student: {
    entityName: 'student',
    fields: [
      { name: 'firstName', type: 'string', required: true, label: 'First Name', description: 'Student first name', sampleValues: ['John', 'Jane', 'Michael', 'Sarah'] },
      { name: 'middleName', type: 'string', required: false, label: 'Middle Name', description: 'Optional middle name' },
      { name: 'lastName', type: 'string', required: true, label: 'Last Name', description: 'Student last name', sampleValues: ['Doe', 'Smith', 'Johnson', 'Williams'] },
      { name: 'admissionNumber', type: 'string', required: true, label: 'Admission Number', description: 'Unique admission number', sampleValues: ['ADM2024001', 'ADM2024002', 'ADM2024003'] },
      { name: 'dateOfBirth', type: 'date', required: true, label: 'Date of Birth', description: 'Date of birth (YYYY-MM-DD)' },
      { name: 'gender', type: 'string', required: true, label: 'Gender', description: 'Gender (male/female)', sampleValues: ['male', 'female'] },
      { name: 'currentClassId', type: 'string', required: true, label: 'Current Class ID', description: 'ID of current class (use class IDs from your system)' },
      { name: 'address', type: 'string', required: false, label: 'Address', description: 'Optional residential address' },
    ],
    importLimit: 500,
  },
};

/**
 * Scan entity structure and return field definitions
 * Includes custom fields from tenant settings if provided
 */
export function scanEntityStructure(
  entityType: string,
  tenantSettings?: any
): EntityStructure {
  const baseStructure = ENTITY_STRUCTURES[entityType];

  if (!baseStructure) {
    throw new Error(`Unknown entity type: ${entityType}. Supported types: ${Object.keys(ENTITY_STRUCTURES).join(', ')}`);
  }

  // Clone the structure
  const structure: EntityStructure = {
    ...baseStructure,
    fields: [...baseStructure.fields],
  };

  // Add custom fields from tenant settings if available
  if (tenantSettings?.customFields?.[entityType]) {
    structure.customFields = tenantSettings.customFields[entityType].map((cf: any) => ({
      name: cf.name,
      type: cf.type || 'string',
      required: cf.required || false,
      label: cf.label || cf.name,
      description: cf.description,
    }));
  }

  return structure;
}

/**
 * Generate sample data for a field based on its type
 */
export function generateSampleData(
  field: EntityFieldDefinition,
  count: number,
  options: SampleDataOptions = {}
): any[] {
  const samples: any[] = [];

  // If field is optional and emptyOptionalFields is true, return empty strings
  if (!field.required && options.emptyOptionalFields) {
    return Array(count).fill('');
  }

  // If sampleValues provided, use them
  if (field.sampleValues && field.sampleValues.length > 0) {
    for (let i = 0; i < count; i++) {
      samples.push(field.sampleValues[i % field.sampleValues.length]);
    }
    return samples;
  }

  // Generate based on type
  switch (field.type) {
    case 'string':
      // Generate generic string samples
      for (let i = 0; i < count; i++) {
        samples.push(`Sample ${field.label} ${i + 1}`);
      }
      break;

    case 'number':
      // Generate number samples
      for (let i = 0; i < count; i++) {
        samples.push(100);
      }
      break;

    case 'date':
      // Generate date samples (current date + offset)
      for (let i = 0; i < count; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i * 30); // 30 days apart
        samples.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
      }
      break;

    case 'boolean':
      // Alternate true/false
      for (let i = 0; i < count; i++) {
        samples.push(i % 2 === 0 ? 'true' : 'false');
      }
      break;

    case 'email':
      // Generate email samples
      for (let i = 0; i < count; i++) {
        samples.push(`sample${i + 1}@school.com`);
      }
      break;

    case 'phone':
      // Generate phone samples or empty
      for (let i = 0; i < count; i++) {
        if (!field.required && i % 2 === 0) {
          samples.push(''); // Some empty for optional fields
        } else {
          samples.push(`123456789${i}`);
        }
      }
      break;

    default:
      // Default to string
      for (let i = 0; i < count; i++) {
        samples.push(`Sample ${i + 1}`);
      }
  }

  return samples;
}

/**
 * Generate dynamic CSV template based on entity structure
 * This is the CORE function - NO HARDCODED TEMPLATES
 */
export function generateDynamicCSVTemplate(
  structure: EntityStructure,
  options: CSVGenerationOptions
): string {
  const lines: string[] = [];

  // Collect fields to include
  const fieldsToInclude: EntityFieldDefinition[] = [];

  // Always include required fields
  fieldsToInclude.push(...structure.fields.filter(f => f.required));

  // Include optional fields if requested
  if (options.includeOptional) {
    fieldsToInclude.push(...structure.fields.filter(f => !f.required));
  }

  // Include custom fields if requested
  if (options.includeCustomFields && structure.customFields) {
    fieldsToInclude.push(...structure.customFields);
  }

  // Generate header row
  const header = fieldsToInclude.map(f => f.name).join(',');
  lines.push(header);

  // Generate sample data rows if requested
  if (options.sampleRows > 0) {
    for (let i = 0; i < options.sampleRows; i++) {
      const rowData = fieldsToInclude.map(field => {
        const samples = generateSampleData(field, options.sampleRows, {
          emptyOptionalFields: options.emptyOptionalFields,
        });
        const value = samples[i];

        // Handle CSV escaping
        if (value === null || value === undefined) {
          return '';
        }

        const stringValue = String(value);

        // Escape commas and quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });

      lines.push(rowData.join(','));
    }
  }

  return lines.join('\n');
}

/**
 * Export data to CSV (reusable across all entities)
 * This function is already in csvImport.ts but duplicated here for completeness
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  headers: string[]
): string {
  if (data.length === 0) {
    return headers.join(',');
  }

  const csvRows: string[] = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }

      // Handle date objects
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }

      // Handle Firestore Timestamps
      if (value && typeof value === 'object' && 'toDate' in value) {
        return value.toDate().toISOString().split('T')[0];
      }

      // Escape commas and quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    });

    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Download CSV file (browser only)
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate downloadable CSV template for an entity type
 * This is what users will call to get a template
 */
export function generateAndDownloadTemplate(
  entityType: string,
  tenantSettings?: any,
  options: Partial<CSVGenerationOptions> = {}
): void {
  // Scan entity structure
  const structure = scanEntityStructure(entityType, tenantSettings);

  // Default options
  const fullOptions: CSVGenerationOptions = {
    includeOptional: options.includeOptional ?? true,
    includeCustomFields: options.includeCustomFields ?? true,
    sampleRows: options.sampleRows ?? 3,
    emptyOptionalFields: options.emptyOptionalFields ?? false,
  };

  // Generate CSV
  const csv = generateDynamicCSVTemplate(structure, fullOptions);

  // Download
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${entityType}_import_template_${timestamp}.csv`;
  downloadCSV(csv, filename);
}
