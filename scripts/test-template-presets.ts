#!/usr/bin/env tsx
/**
 * Quick validation test for template presets
 * Run with: npx tsx scripts/test-template-presets.ts
 */

import {
  createClassicTemplate,
  createModernTemplate,
  createCompactTemplate,
  createComprehensiveTemplate,
  TEMPLATE_PREVIEWS,
} from '../lib/reportCardTemplates/presets';
import { validateCreateTemplate } from '../lib/reportCardTemplates/validators';

console.log('\n🧪 Report Card Template Presets Validation\n');
console.log('='.repeat(60));

const testTenantId = 'test-tenant-123';
const testUserId = 'test-user-456';

const presets = [
  { name: 'Classic', template: createClassicTemplate(testTenantId, testUserId) },
  { name: 'Modern', template: createModernTemplate(testTenantId, testUserId) },
  { name: 'Compact', template: createCompactTemplate(testTenantId, testUserId) },
  { name: 'Comprehensive', template: createComprehensiveTemplate(testTenantId, testUserId) },
];

let passed = 0;
let failed = 0;

presets.forEach((preset) => {
  console.log(`\n📋 Testing ${preset.name} Template`);
  console.log('-'.repeat(60));

  const validation = validateCreateTemplate(preset.template);

  if (validation.valid) {
    console.log(`✅ Status: VALID`);
    passed++;
  } else {
    console.log(`❌ Status: INVALID`);
    console.log(`   Errors:`);
    validation.errors.forEach((err) => console.log(`     - ${err}`));
    failed++;
  }

  if (validation.warnings.length > 0) {
    console.log(`   ⚠️  Warnings:`);
    validation.warnings.forEach((warn) => console.log(`     - ${warn}`));
  }

  // Display template details
  console.log(`\n   📊 Template Details:`);
  console.log(`      Name: ${preset.template.name}`);
  console.log(`      Type: ${preset.template.templateType}`);
  console.log(`      Layout Mode: ${preset.template.layout.mode}`);
  console.log(`      Page Size: ${preset.template.layout.pageSize}`);
  console.log(`      Sections: ${preset.template.layout.sections.length} total`);
  console.log(
    `      Enabled Sections: ${preset.template.layout.sections.filter((s) => s.enabled).length}`
  );
  console.log(`      Header Style: ${preset.template.branding.headerStyle}`);
  console.log(`      Color Scheme: ${preset.template.branding.colorScheme}`);
  console.log(`      Scores Columns: ${preset.template.scoresTable.columns.length}`);

  // Display enabled sections
  const enabledSections = preset.template.layout.sections
    .filter((s) => s.enabled)
    .map((s) => s.type);
  console.log(`      Section Types: ${enabledSections.join(', ')}`);
});

console.log('\n' + '='.repeat(60));
console.log('📊 Validation Summary');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

// Display template previews
console.log('\n📖 Template Previews');
console.log('='.repeat(60));

Object.values(TEMPLATE_PREVIEWS).forEach((preview) => {
  console.log(`\n${preview.name} (${preview.type})`);
  console.log(`  ${preview.description}`);
  console.log(`  Best For: ${preview.bestFor}`);
  console.log(`  Features:`);
  preview.features.forEach((feature) => console.log(`    - ${feature}`));
});

console.log('\n');

process.exit(failed > 0 ? 1 : 0);
