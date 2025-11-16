/**
 * Backend Infrastructure Test Script
 *
 * This script tests the report card template backend utilities:
 * - Template CRUD operations
 * - Template assignment logic
 * - Migration utilities
 * - Validators
 *
 * Run this in a Next.js API route or admin script to test functionality
 */

import { createClassicTemplate, createModernTemplate } from '../presets';
import {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateImportedTemplate,
  validateTemplateAssignment,
} from '../validators';
import {
  createTemplate,
  updateTemplate,
  getTemplates,
  getDefaultTemplate,
  cloneTemplate,
  setDefaultTemplate,
} from '../templateCRUD';
import {
  assignTemplateToClasses,
  assignTemplateToLevels,
  getTemplateForClass,
  getTemplateAssignmentSummary,
} from '../templateAssignment';
import { ensureDefaultTemplate, isMigrationNeeded } from '../migration';

/**
 * Test Suite Runner
 */
export async function runBackendTests(tenantId: string, userId: string) {
  console.log('🧪 Starting Report Card Template Backend Tests...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; status: 'PASS' | 'FAIL'; message?: string }>,
  };

  // Helper to log test results
  const test = (name: string, condition: boolean, message?: string) => {
    if (condition) {
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✅ ${name}`);
    } else {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', message });
      console.log(`❌ ${name}${message ? `: ${message}` : ''}`);
    }
  };

  // ===========================================
  // TEST 1: Validator Tests
  // ===========================================
  console.log('\n📋 Test Group 1: Validators\n');

  // Test 1.1: Validate valid classic template
  const classicTemplate = createClassicTemplate(tenantId, userId);
  const validationResult = validateCreateTemplate(classicTemplate);
  test(
    'Test 1.1: Classic template passes validation',
    validationResult.valid,
    validationResult.errors.join(', ')
  );

  // Test 1.2: Validate invalid template (missing name)
  const invalidTemplate = { ...classicTemplate, name: '' };
  const invalidResult = validateCreateTemplate(invalidTemplate);
  test(
    'Test 1.2: Invalid template fails validation',
    !invalidResult.valid && invalidResult.errors.length > 0
  );

  // Test 1.3: Validate custom color validation
  const customColorTemplate = {
    ...classicTemplate,
    branding: {
      ...classicTemplate.branding,
      colorScheme: 'custom' as const,
      customColors: { header: '#INVALID', borders: '#000000', grades: '#FF0000' },
    },
  };
  const colorResult = validateCreateTemplate(customColorTemplate);
  test('Test 1.3: Invalid hex color fails validation', !colorResult.valid);

  // Test 1.4: Validate template assignment
  const assignmentValidation = validateTemplateAssignment({
    templateId: 'test-id',
    classIds: ['class1', 'class2'],
  });
  test('Test 1.4: Valid assignment passes validation', assignmentValidation.valid);

  // ===========================================
  // TEST 2: Template CRUD Operations
  // ===========================================
  console.log('\n📋 Test Group 2: Template CRUD Operations\n');

  let createdTemplateId: string | undefined;

  // Test 2.1: Create a new template
  const createResult = await createTemplate(classicTemplate);
  test(
    'Test 2.1: Create template succeeds',
    createResult.success && !!createResult.templateId,
    createResult.error
  );
  createdTemplateId = createResult.templateId;

  // Test 2.2: Get all templates
  if (createdTemplateId) {
    const templates = await getTemplates({ tenantId, isActive: true });
    test('Test 2.2: Get templates returns results', templates.length > 0);
  }

  // Test 2.3: Update template
  if (createdTemplateId) {
    const updateResult = await updateTemplate(createdTemplateId, {
      description: 'Updated description for testing',
    });
    test('Test 2.3: Update template succeeds', updateResult.success, updateResult.error);
  }

  // Test 2.4: Clone template
  if (createdTemplateId) {
    const cloneResult = await cloneTemplate(createdTemplateId, 'Cloned Classic Template');
    test(
      'Test 2.4: Clone template succeeds',
      cloneResult.success && !!cloneResult.templateId,
      cloneResult.error
    );
  }

  // Test 2.5: Set as default
  if (createdTemplateId) {
    const defaultResult = await setDefaultTemplate(createdTemplateId, tenantId);
    test('Test 2.5: Set default template succeeds', defaultResult.success, defaultResult.error);
  }

  // Test 2.6: Get default template
  const defaultTemplate = await getDefaultTemplate(tenantId);
  test('Test 2.6: Get default template returns result', !!defaultTemplate);

  // ===========================================
  // TEST 3: Template Assignment Logic
  // ===========================================
  console.log('\n📋 Test Group 3: Template Assignment Logic\n');

  // Test 3.1: Assign to specific classes (mock class IDs)
  if (createdTemplateId) {
    const assignResult = await assignTemplateToClasses(createdTemplateId, [
      'mock-class-1',
      'mock-class-2',
    ]);
    test('Test 3.1: Assign to classes succeeds', assignResult.success, assignResult.error);
  }

  // Test 3.2: Assign to levels
  if (createdTemplateId) {
    const levelResult = await assignTemplateToLevels(createdTemplateId, ['JSS1', 'JSS2']);
    test('Test 3.2: Assign to levels succeeds', levelResult.success, levelResult.error);
  }

  // Test 3.3: Get assignment summary
  if (createdTemplateId) {
    const summary = await getTemplateAssignmentSummary(createdTemplateId, tenantId);
    test(
      'Test 3.3: Get assignment summary returns data',
      summary.totalDirectClasses >= 0 && summary.totalLevels >= 0
    );
    console.log(`   📊 Summary: ${summary.totalDirectClasses} classes, ${summary.totalLevels} levels`);
  }

  // ===========================================
  // TEST 4: Migration Utilities
  // ===========================================
  console.log('\n📋 Test Group 4: Migration Utilities\n');

  // Test 4.1: Check if migration is needed
  const migrationNeeded = await isMigrationNeeded(tenantId);
  test('Test 4.1: Migration check completes', typeof migrationNeeded === 'boolean');
  console.log(`   📊 Migration needed: ${migrationNeeded}`);

  // Test 4.2: Ensure default template (should not create since we already have templates)
  const migrationResult = await ensureDefaultTemplate(tenantId, userId);
  test('Test 4.2: Ensure default template completes', migrationResult.success);
  console.log(`   📊 Template created: ${migrationResult.created}`);

  // ===========================================
  // TEST 5: Preset Templates
  // ===========================================
  console.log('\n📋 Test Group 5: Preset Templates\n');

  // Test 5.1: Classic preset validation
  const classicPreset = createClassicTemplate(tenantId, userId);
  const classicValidation = validateCreateTemplate(classicPreset);
  test('Test 5.1: Classic preset is valid', classicValidation.valid);

  // Test 5.2: Modern preset validation
  const modernPreset = createModernTemplate(tenantId, userId);
  const modernValidation = validateCreateTemplate(modernPreset);
  test('Test 5.2: Modern preset is valid', modernValidation.valid);

  // Test 5.3: All presets have required sections
  test(
    'Test 5.3: Classic preset has sections',
    classicPreset.layout.sections.length > 0
  );

  test(
    'Test 5.4: Modern preset has different config than classic',
    JSON.stringify(modernPreset.scoresTable) !== JSON.stringify(classicPreset.scoresTable)
  );

  // ===========================================
  // SUMMARY
  // ===========================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50) + '\n');

  // Print failed tests
  if (results.failed > 0) {
    console.log('❌ Failed Tests:');
    results.tests
      .filter((t) => t.status === 'FAIL')
      .forEach((t) => {
        console.log(`   - ${t.name}${t.message ? `: ${t.message}` : ''}`);
      });
    console.log('');
  }

  return results;
}

/**
 * Quick validation test (no database operations)
 */
export function runValidationTests() {
  console.log('🧪 Running Quick Validation Tests (No DB)...\n');

  const testTenantId = 'test-tenant-123';
  const testUserId = 'test-user-456';

  // Test all 4 presets
  const presets = [
    { name: 'Classic', fn: () => import('../presets').then(m => m.createClassicTemplate(testTenantId, testUserId)) },
    { name: 'Modern', fn: () => import('../presets').then(m => m.createModernTemplate(testTenantId, testUserId)) },
    { name: 'Compact', fn: () => import('../presets').then(m => m.createCompactTemplate(testTenantId, testUserId)) },
    { name: 'Comprehensive', fn: () => import('../presets').then(m => m.createComprehensiveTemplate(testTenantId, testUserId)) },
  ];

  let passed = 0;
  let failed = 0;

  presets.forEach(async (preset) => {
    const template = await preset.fn();
    const validation = validateCreateTemplate(template);

    if (validation.valid) {
      console.log(`✅ ${preset.name} template: VALID`);
      passed++;
    } else {
      console.log(`❌ ${preset.name} template: INVALID`);
      console.log(`   Errors: ${validation.errors.join(', ')}`);
      failed++;
    }

    if (validation.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${validation.warnings.join(', ')}`);
    }
  });

  console.log(`\n📊 Validation Summary: ${passed} passed, ${failed} failed\n`);
}
