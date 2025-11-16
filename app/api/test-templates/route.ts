import { NextRequest, NextResponse } from 'next/server';
import { runBackendTests } from '@/lib/reportCardTemplates/__tests__/backend-test';

/**
 * API Route to test Report Card Template backend
 *
 * Usage: GET /api/test-templates?tenantId=YOUR_TENANT_ID&userId=YOUR_USER_ID
 *
 * This is a temporary route for testing. Remove in production.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');

    if (!tenantId || !userId) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'Please provide tenantId and userId query parameters',
          example: '/api/test-templates?tenantId=YOUR_TENANT_ID&userId=YOUR_USER_ID',
        },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🧪 REPORT CARD TEMPLATE BACKEND TEST');
    console.log(`Tenant ID: ${tenantId}`);
    console.log(`User ID: ${userId}`);
    console.log(`${'='.repeat(60)}\n`);

    // Run the test suite
    const results = await runBackendTests(tenantId, userId);

    return NextResponse.json(
      {
        success: results.failed === 0,
        summary: {
          passed: results.passed,
          failed: results.failed,
          total: results.passed + results.failed,
          successRate: `${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`,
        },
        tests: results.tests,
        message:
          results.failed === 0
            ? '✅ All tests passed! Backend infrastructure is working correctly.'
            : `❌ ${results.failed} test(s) failed. Check console for details.`,
      },
      { status: results.failed === 0 ? 200 : 500 }
    );
  } catch (error) {
    console.error('❌ Test execution error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Test execution failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
