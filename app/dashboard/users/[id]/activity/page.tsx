'use client';

/**
 * User Activity Dashboard
 * Phase 13: View detailed activity for a specific user
 *
 * Features:
 * - Activity summary (total actions, success/failure rate)
 * - Actions by type breakdown
 * - Recent activity log
 * - Filterable by date range
 * - Admin/Super Admin only
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getUserActivity, getAuditLogs } from '@/lib/auditLogger';
import { AuditLog } from '@/types';
import {
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface UserActivitySummary {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  actionsByType: Record<string, number>;
  recentActions: AuditLog[];
}

export default function UserActivityPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = params.id as string;

  const [activity, setActivity] = useState<UserActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load activity
  useEffect(() => {
    if (user?.tenantId && userId) {
      loadActivity();
    }
  }, [user?.tenantId, userId, startDate, endDate]);

  const loadActivity = async () => {
    if (!user?.tenantId || !userId) return;

    setLoading(true);
    setError('');

    try {
      // Get activity summary
      const summary = await getUserActivity(userId, user.tenantId);

      // If date filters applied, get filtered logs
      if (startDate || endDate) {
        const filters: any = {
          tenantId: user.tenantId,
          userId,
          limit: 1000,
        };

        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);

        const filteredLogs = await getAuditLogs(filters);

        // Recalculate summary from filtered logs
        const totalActions = filteredLogs.length;
        const successfulActions = filteredLogs.filter(log => log.success).length;
        const failedActions = filteredLogs.filter(log => !log.success).length;

        const actionsByType: Record<string, number> = {};
        filteredLogs.forEach(log => {
          actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
        });

        setActivity({
          totalActions,
          successfulActions,
          failedActions,
          actionsByType,
          recentActions: filteredLogs.slice(0, 10),
        });
      } else {
        setActivity(summary);
      }
    } catch (err: any) {
      console.error('Error loading user activity:', err);
      setError('Failed to load user activity');
    } finally {
      setLoading(false);
    }
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const formatTimestamp = (timestamp: any) => {
    return timestamp.toDate().toLocaleString();
  };

  const getActionBadgeColor = (action: string) => {
    if (['create', 'login'].includes(action)) return 'bg-green-100 text-green-800';
    if (['update', 'publish_scores'].includes(action)) return 'bg-blue-100 text-blue-800';
    if (['delete', 'soft_delete', 'failed_login'].includes(action)) return 'bg-red-100 text-red-800';
    if (['view', 'search', 'filter'].includes(action)) return 'bg-gray-100 text-gray-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (loading && !activity) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading user activity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!activity) return null;

  const successRate = activity.totalActions > 0
    ? ((activity.successfulActions / activity.totalActions) * 100).toFixed(1)
    : '0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">User Activity Dashboard</h1>
        <p className="mt-2 text-gray-600">
          User ID: {userId}
        </p>
      </div>

      {/* Date Range Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearDateFilters}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Actions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {activity.totalActions}
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        {/* Successful Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Successful</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {activity.successfulActions}
              </p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-green-500" />
          </div>
        </div>

        {/* Failed Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {activity.failedActions}
              </p>
            </div>
            <XCircleIcon className="h-12 w-12 text-red-500" />
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {successRate}%
              </p>
            </div>
            <ClockIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Actions by Type */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Actions by Type</h2>
        {Object.keys(activity.actionsByType).length === 0 ? (
          <p className="text-gray-500">No actions recorded</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(activity.actionsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([action, count]) => (
                <div key={action} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(action)}`}>
                    {action}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Recent Actions */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activity.recentActions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No recent activity
                  </td>
                </tr>
              ) : (
                activity.recentActions.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.entityType}</div>
                      <div className="text-sm text-gray-500">{log.entityName || log.entityId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.success ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.errorMessage || log.ipAddress || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
