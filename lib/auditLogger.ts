/**
 * Audit Logger Utility
 * Phase 13: Comprehensive audit trail system
 *
 * Provides functions to:
 * - Log all user actions across the system
 * - Retrieve audit logs with flexible filtering
 * - Generate user activity summaries
 */

import { db } from './firebase/client';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { AuditLog, AuditAction, AuditEntityType } from '@/types';

interface User {
  uid: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'parent';
  tenantId: string;
}

interface LogAuditParams {
  user: User;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  before?: any;
  after?: any;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

interface GetAuditLogsFilters {
  tenantId: string;
  userId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface UserActivitySummary {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  actionsByType: Record<string, number>;
  recentActions: AuditLog[];
}

/**
 * Log an audit event
 * Stores comprehensive information about user actions for compliance and debugging
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  const {
    user,
    action,
    entityType,
    entityId,
    entityName,
    before,
    after,
    metadata,
    success = true,
    errorMessage,
  } = params;

  const timestamp = Timestamp.now();

  // Calculate changed fields if both before and after are provided
  let changes: { before?: any; after?: any; fields?: string[] } | undefined;
  if (before !== undefined || after !== undefined) {
    changes = {};

    // Only add before/after if they're defined
    if (before !== undefined) {
      changes.before = before;
    }
    if (after !== undefined) {
      changes.after = after;
    }

    // Calculate changed fields for updates
    if (before && after && action === 'update') {
      const beforeKeys = Object.keys(before);
      const afterKeys = Object.keys(after);
      const allKeys = new Set([...beforeKeys, ...afterKeys]);

      const changedFields: string[] = [];
      allKeys.forEach((key) => {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          changedFields.push(key);
        }
      });

      changes.fields = changedFields;
    }
  }

  // Prepare audit log document
  const auditLogData = {
    tenantId: user.tenantId,
    userId: user.uid,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    action,
    entityType,
    entityId,
    entityName: entityName || undefined,
    changes: changes || undefined,
    ipAddress: metadata?.ipAddress || undefined,
    userAgent: metadata?.userAgent || undefined,
    metadata: metadata ? { ...metadata } : undefined,
    success,
    errorMessage: errorMessage || undefined,
    timestamp,
    createdAt: timestamp,
  };

  // Remove undefined fields to keep Firestore clean
  const cleanedData = Object.fromEntries(
    Object.entries(auditLogData).filter(([_, v]) => v !== undefined)
  );

  // Store in Firestore
  await addDoc(collection(db, 'auditLogs'), cleanedData);
}

/**
 * Retrieve audit logs with flexible filtering
 * Supports filtering by user, action, entity type, date range, etc.
 */
export async function getAuditLogs(
  filters: GetAuditLogsFilters
): Promise<AuditLog[]> {
  const {
    tenantId,
    userId,
    action,
    entityType,
    startDate,
    endDate,
    limit = 100,
  } = filters;

  // Build query with filters
  let q: Query<DocumentData> = collection(db, 'auditLogs');

  // Apply filters
  const constraints: any[] = [
    where('tenantId', '==', tenantId),
    orderBy('timestamp', 'desc'),
    firestoreLimit(limit),
  ];

  if (userId) {
    constraints.unshift(where('userId', '==', userId));
  }

  if (action) {
    constraints.unshift(where('action', '==', action));
  }

  if (entityType) {
    constraints.unshift(where('entityType', '==', entityType));
  }

  if (startDate) {
    constraints.unshift(where('timestamp', '>=', Timestamp.fromDate(startDate)));
  }

  if (endDate) {
    constraints.unshift(where('timestamp', '<=', Timestamp.fromDate(endDate)));
  }

  q = query(q, ...constraints);

  // Execute query
  const snapshot = await getDocs(q);

  // Map results to AuditLog objects
  const logs: AuditLog[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as AuditLog;
  });

  return logs;
}

/**
 * Get user activity summary
 * Provides statistics and recent actions for a specific user
 */
export async function getUserActivity(
  userId: string,
  tenantId: string
): Promise<UserActivitySummary> {
  // Get all logs for this user
  const logs = await getAuditLogs({
    tenantId,
    userId,
    limit: 1000, // Get more logs for accurate statistics
  });

  // Calculate statistics
  const totalActions = logs.length;
  const successfulActions = logs.filter((log) => log.success).length;
  const failedActions = logs.filter((log) => !log.success).length;

  // Count actions by type
  const actionsByType: Record<string, number> = {};
  logs.forEach((log) => {
    actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
  });

  // Get recent actions (last 10)
  const recentActions = logs.slice(0, 10);

  return {
    totalActions,
    successfulActions,
    failedActions,
    actionsByType,
    recentActions,
  };
}
