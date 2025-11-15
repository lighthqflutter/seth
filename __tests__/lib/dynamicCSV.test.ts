/**
 * Tests for Dynamic CSV Generation System
 * Phase 10: Universal CSV templates based on actual entity structure
 */

import {
  generateDynamicCSVTemplate,
  EntityFieldDefinition,
  EntityStructure,
  generateSampleData,
  scanEntityStructure,
} from '@/lib/dynamicCSV';

describe('Dynamic CSV Generation System', () => {
  describe('generateDynamicCSVTemplate', () => {
    it('should generate CSV template with required fields only', () => {
      const structure: EntityStructure = {
        entityName: 'class',
        fields: [
          { name: 'name', type: 'string', required: true, label: 'Class Name' },
          { name: 'level', type: 'string', required: true, label: 'Level' },
        ],
      };

      const csv = generateDynamicCSVTemplate(structure, { includeOptional: false, sampleRows: 0 });

      expect(csv).toContain('name,level');
      expect(csv.split('\n').length).toBe(1); // Header only
    });

    it('should generate CSV template with optional fields', () => {
      const structure: EntityStructure = {
        entityName: 'class',
        fields: [
          { name: 'name', type: 'string', required: true, label: 'Class Name' },
          { name: 'level', type: 'string', required: true, label: 'Level' },
          { name: 'teacherId', type: 'string', required: false, label: 'Teacher ID' },
        ],
      };

      const csv = generateDynamicCSVTemplate(structure, { includeOptional: true, sampleRows: 0 });

      expect(csv).toContain('name,level,teacherId');
    });

    it('should generate CSV with sample data rows', () => {
      const structure: EntityStructure = {
        entityName: 'class',
        fields: [
          { name: 'name', type: 'string', required: true, label: 'Class Name' },
          { name: 'level', type: 'string', required: true, label: 'Level' },
        ],
      };

      const csv = generateDynamicCSVTemplate(structure, { includeOptional: false, sampleRows: 2 });

      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // Header + 2 sample rows
      expect(lines[0]).toContain('name,level');
    });

    it('should handle custom fields in structure', () => {
      const structure: EntityStructure = {
        entityName: 'student',
        fields: [
          { name: 'firstName', type: 'string', required: true, label: 'First Name' },
          { name: 'lastName', type: 'string', required: true, label: 'Last Name' },
        ],
        customFields: [
          { name: 'customField1', type: 'string', required: false, label: 'Custom Field 1' },
          { name: 'customField2', type: 'number', required: false, label: 'Custom Field 2' },
        ],
      };

      const csv = generateDynamicCSVTemplate(structure, { includeOptional: true, includeCustomFields: true, sampleRows: 0 });

      expect(csv).toContain('customField1');
      expect(csv).toContain('customField2');
    });

    it('should exclude custom fields when option is false', () => {
      const structure: EntityStructure = {
        entityName: 'student',
        fields: [
          { name: 'firstName', type: 'string', required: true, label: 'First Name' },
        ],
        customFields: [
          { name: 'customField1', type: 'string', required: false, label: 'Custom Field 1' },
        ],
      };

      const csv = generateDynamicCSVTemplate(structure, { includeOptional: true, includeCustomFields: false, sampleRows: 0 });

      expect(csv).not.toContain('customField1');
      expect(csv).toContain('firstName');
    });
  });

  describe('generateSampleData', () => {
    it('should generate sample string data', () => {
      const field: EntityFieldDefinition = {
        name: 'firstName',
        type: 'string',
        required: true,
        label: 'First Name',
      };

      const samples = generateSampleData(field, 3);

      expect(samples).toHaveLength(3);
      expect(typeof samples[0]).toBe('string');
      expect(samples[0].length).toBeGreaterThan(0);
    });

    it('should generate sample number data', () => {
      const field: EntityFieldDefinition = {
        name: 'maxScore',
        type: 'number',
        required: true,
        label: 'Max Score',
      };

      const samples = generateSampleData(field, 3);

      expect(samples).toHaveLength(3);
      samples.forEach(sample => {
        expect(typeof sample).toBe('number');
        expect(sample).toBeGreaterThan(0);
      });
    });

    it('should generate sample date data', () => {
      const field: EntityFieldDefinition = {
        name: 'startDate',
        type: 'date',
        required: true,
        label: 'Start Date',
      };

      const samples = generateSampleData(field, 3);

      expect(samples).toHaveLength(3);
      samples.forEach(sample => {
        // Should be valid date format YYYY-MM-DD
        expect(sample).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should generate sample boolean data', () => {
      const field: EntityFieldDefinition = {
        name: 'isActive',
        type: 'boolean',
        required: true,
        label: 'Is Active',
      };

      const samples = generateSampleData(field, 3);

      expect(samples).toHaveLength(3);
      samples.forEach(sample => {
        expect(['true', 'false']).toContain(sample);
      });
    });

    it('should use sampleValues if provided', () => {
      const field: EntityFieldDefinition = {
        name: 'gender',
        type: 'string',
        required: true,
        label: 'Gender',
        sampleValues: ['Male', 'Female'],
      };

      const samples = generateSampleData(field, 5);

      expect(samples).toHaveLength(5);
      samples.forEach(sample => {
        expect(['Male', 'Female']).toContain(sample);
      });
    });

    it('should return empty string for optional fields when specified', () => {
      const field: EntityFieldDefinition = {
        name: 'middleName',
        type: 'string',
        required: false,
        label: 'Middle Name',
      };

      const samples = generateSampleData(field, 3, { emptyOptionalFields: true });

      expect(samples).toHaveLength(3);
      samples.forEach(sample => {
        expect(sample).toBe('');
      });
    });
  });

  describe('scanEntityStructure', () => {
    it('should scan class entity structure', () => {
      const structure = scanEntityStructure('class');

      expect(structure.entityName).toBe('class');
      expect(structure.fields.length).toBeGreaterThan(0);
      expect(structure.fields.find(f => f.name === 'name')).toBeDefined();
      expect(structure.fields.find(f => f.name === 'level')).toBeDefined();
    });

    it('should scan subject entity structure', () => {
      const structure = scanEntityStructure('subject');

      expect(structure.entityName).toBe('subject');
      expect(structure.fields.find(f => f.name === 'name')).toBeDefined();
      expect(structure.fields.find(f => f.name === 'code')).toBeDefined();
      expect(structure.fields.find(f => f.name === 'maxScore')).toBeDefined();
    });

    it('should scan term entity structure', () => {
      const structure = scanEntityStructure('term');

      expect(structure.entityName).toBe('term');
      expect(structure.fields.find(f => f.name === 'startDate')).toBeDefined();
      expect(structure.fields.find(f => f.name === 'endDate')).toBeDefined();
      expect(structure.fields.find(f => f.name === 'isCurrent')).toBeDefined();
    });

    it('should scan teacher entity structure', () => {
      const structure = scanEntityStructure('teacher');

      expect(structure.entityName).toBe('teacher');
      expect(structure.fields.find(f => f.name === 'name')).toBeDefined();
      expect(structure.fields.find(f => f.name === 'email')).toBeDefined();
    });

    it('should scan student entity structure', () => {
      const structure = scanEntityStructure('student');

      expect(structure.entityName).toBe('student');
      expect(structure.fields.find(f => f.name === 'firstName')).toBeDefined();
      expect(structure.fields.find(f => f.name === 'lastName')).toBeDefined();
      expect(structure.fields.find(f => f.name === 'admissionNumber')).toBeDefined();
    });

    it('should throw error for unknown entity', () => {
      expect(() => scanEntityStructure('unknown')).toThrow();
    });

    it('should include custom fields from tenant settings', () => {
      const tenantSettings = {
        customFields: {
          student: [
            { name: 'bloodGroup', type: 'string', required: false, label: 'Blood Group' },
          ],
        },
      };

      const structure = scanEntityStructure('student', tenantSettings);

      expect(structure.customFields).toBeDefined();
      expect(structure.customFields?.length).toBeGreaterThan(0);
      expect(structure.customFields?.find(f => f.name === 'bloodGroup')).toBeDefined();
    });
  });

  describe('Integration: Full CSV Generation Flow', () => {
    it('should generate complete CSV with all features', () => {
      const structure = scanEntityStructure('class');

      const csv = generateDynamicCSVTemplate(structure, {
        includeOptional: true,
        includeCustomFields: false,
        sampleRows: 2,
      });

      const lines = csv.split('\n');

      // Should have header + 2 sample rows
      expect(lines.length).toBe(3);

      // Header should contain all fields
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('level');

      // Sample rows should have data
      expect(lines[1].split(',').length).toBeGreaterThan(0);
      expect(lines[2].split(',').length).toBeGreaterThan(0);
    });
  });
});
