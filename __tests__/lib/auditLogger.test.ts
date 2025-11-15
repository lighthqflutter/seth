/**
 * Tests for Audit Logger
 * Phase 13: Comprehensive audit trail system
 */

import { logAudit, getAuditLogs, getUserActivity } from '@/lib/auditLogger';
import { addDoc, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { AuditAction, AuditEntityType } from '@/types';

jest.mock('@/lib/firebase/client', () => ({
  db: {},
}));

jest.mock('firebase/firestore');

describe('Audit Logger', () => {
  const mockAddDoc = addDoc as jest.Mock;
  const mockGetDocs = getDocs as jest.Mock;

  const mockUser = {
    uid: 'user-123',
    name: 'John Doe',
    email: 'john@school.com',
    role: 'admin' as const,
    tenantId: 'tenant-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logAudit', () => {
    it('should log a create action', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-1' });

      await logAudit({
        user: mockUser,
        action: 'create',
        entityType: 'student',
        entityId: 'student-123',
        entityName: 'Alice Johnson',
        after: { firstName: 'Alice', lastName: 'Johnson' },
      });

      expect(mockAddDoc).toHaveBeenCalled();
      const callArgs = mockAddDoc.mock.calls[0][1];

      expect(callArgs.action).toBe('create');
      expect(callArgs.entityType).toBe('student');
      expect(callArgs.entityId).toBe('student-123');
      expect(callArgs.userId).toBe('user-123');
      expect(callArgs.tenantId).toBe('tenant-123');
      expect(callArgs.success).toBe(true);
    });

    it('should log an update action with before/after', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-2' });

      await logAudit({
        user: mockUser,
        action: 'update',
        entityType: 'score',
        entityId: 'score-456',
        before: { total: 80, grade: 'B2' },
        after: { total: 85, grade: 'A1' },
      });

      expect(mockAddDoc).toHaveBeenCalled();
      const callArgs = mockAddDoc.mock.calls[0][1];

      expect(callArgs.changes?.before).toEqual({ total: 80, grade: 'B2' });
      expect(callArgs.changes?.after).toEqual({ total: 85, grade: 'A1' });
      expect(callArgs.changes?.fields).toEqual(['total', 'grade']);
    });

    it('should log a delete action', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-3' });

      await logAudit({
        user: mockUser,
        action: 'delete',
        entityType: 'class',
        entityId: 'class-789',
        entityName: 'JSS 1A',
        before: { name: 'JSS 1A', studentCount: 30 },
      });

      expect(mockAddDoc).toHaveBeenCalled();
      const callArgs = mockAddDoc.mock.calls[0][1];

      expect(callArgs.action).toBe('delete');
      expect(callArgs.changes?.before).toBeDefined();
    });

    it('should log authentication events', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-4' });

      await logAudit({
        user: mockUser,
        action: 'login',
        entityType: 'user',
        entityId: 'user-123',
        metadata: { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      });

      expect(mockAddDoc).toHaveBeenCalled();
      const callArgs = mockAddDoc.mock.calls[0][1];

      expect(callArgs.action).toBe('login');
      expect(callArgs.ipAddress).toBe('192.168.1.1');
      expect(callArgs.userAgent).toBe('Mozilla/5.0');
    });

    it('should log failed actions with error message', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-5' });

      await logAudit({
        user: mockUser,
        action: 'update',
        entityType: 'student',
        entityId: 'student-999',
        success: false,
        errorMessage: 'Student not found',
      });

      expect(mockAddDoc).toHaveBeenCalled();
      const callArgs = mockAddDoc.mock.calls[0][1];

      expect(callArgs.success).toBe(false);
      expect(callArgs.errorMessage).toBe('Student not found');
    });

    it('should include metadata when provided', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-6' });

      await logAudit({
        user: mockUser,
        action: 'publish_scores',
        entityType: 'score',
        entityId: 'bulk',
        metadata: {
          classId: 'class-1',
          subjectId: 'math',
          termId: 'term-1',
          studentCount: 30,
        },
      });

      expect(mockAddDoc).toHaveBeenCalled();
      const callArgs = mockAddDoc.mock.calls[0][1];

      expect(callArgs.metadata?.classId).toBe('class-1');
      expect(callArgs.metadata?.studentCount).toBe(30);
    });

    it('should handle missing optional fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'audit-log-7' });

      await logAudit({
        user: mockUser,
        action: 'view',
        entityType: 'result',
        entityId: 'result-123',
      });

      expect(mockAddDoc).toHaveBeenCalled();
      const callArgs = mockAddDoc.mock.calls[0][1];

      expect(callArgs.changes).toBeUndefined();
      expect(callArgs.metadata).toBeUndefined();
      expect(callArgs.success).toBe(true); // Default to true
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs for a tenant', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          data: () => ({
            action: 'create',
            entityType: 'student',
            timestamp: Timestamp.now(),
          }),
        },
        {
          id: 'log-2',
          data: () => ({
            action: 'update',
            entityType: 'score',
            timestamp: Timestamp.now(),
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockLogs });

      const logs = await getAuditLogs({
        tenantId: 'tenant-123',
        limit: 50,
      });

      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('create');
      expect(logs[1].action).toBe('update');
    });

    it('should filter by user ID', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'log-1',
            data: () => ({
              userId: 'user-123',
              action: 'create',
              timestamp: Timestamp.now(),
            }),
          },
        ],
      });

      const logs = await getAuditLogs({
        tenantId: 'tenant-123',
        userId: 'user-123',
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user-123');
    });

    it('should filter by action type', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'log-1',
            data: () => ({
              action: 'login',
              timestamp: Timestamp.now(),
            }),
          },
        ],
      });

      const logs = await getAuditLogs({
        tenantId: 'tenant-123',
        action: 'login',
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('login');
    });

    it('should filter by entity type', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'log-1',
            data: () => ({
              entityType: 'score',
              action: 'publish_scores',
              timestamp: Timestamp.now(),
            }),
          },
        ],
      });

      const logs = await getAuditLogs({
        tenantId: 'tenant-123',
        entityType: 'score',
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].entityType).toBe('score');
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'log-1',
            data: () => ({
              action: 'create',
              timestamp: Timestamp.fromDate(new Date('2025-01-15')),
            }),
          },
        ],
      });

      const logs = await getAuditLogs({
        tenantId: 'tenant-123',
        startDate,
        endDate,
      });

      expect(logs).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const logs = await getAuditLogs({
        tenantId: 'tenant-123',
      });

      expect(logs).toEqual([]);
    });
  });

  describe('getUserActivity', () => {
    it('should get activity summary for a user', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          data: () => ({
            action: 'create',
            entityType: 'student',
            timestamp: Timestamp.now(),
            success: true,
          }),
        },
        {
          id: 'log-2',
          data: () => ({
            action: 'update',
            entityType: 'score',
            timestamp: Timestamp.now(),
            success: true,
          }),
        },
        {
          id: 'log-3',
          data: () => ({
            action: 'login',
            entityType: 'user',
            timestamp: Timestamp.now(),
            success: true,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockLogs });

      const activity = await getUserActivity('user-123', 'tenant-123');

      expect(activity.totalActions).toBe(3);
      expect(activity.actionsByType).toHaveProperty('create', 1);
      expect(activity.actionsByType).toHaveProperty('update', 1);
      expect(activity.actionsByType).toHaveProperty('login', 1);
      expect(activity.recentActions).toHaveLength(3);
    });

    it('should count failed actions', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'log-1',
            data: () => ({
              action: 'update',
              success: true,
              timestamp: Timestamp.now(),
            }),
          },
          {
            id: 'log-2',
            data: () => ({
              action: 'delete',
              success: false,
              timestamp: Timestamp.now(),
            }),
          },
        ],
      });

      const activity = await getUserActivity('user-123', 'tenant-123');

      expect(activity.totalActions).toBe(2);
      expect(activity.successfulActions).toBe(1);
      expect(activity.failedActions).toBe(1);
    });

    it('should handle user with no activity', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const activity = await getUserActivity('user-999', 'tenant-123');

      expect(activity.totalActions).toBe(0);
      expect(activity.successfulActions).toBe(0);
      expect(activity.failedActions).toBe(0);
      expect(activity.recentActions).toEqual([]);
    });
  });
});
