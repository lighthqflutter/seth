'use client';

/**
 * Audit Log Viewer Page
 * Phase 13: Comprehensive audit trail system
 *
 * Features:
 * - View all audit logs for current tenant
 * - Filter by user, action, entity type, date range
 * - Pagination support
 * - Export to CSV
 * - View detailed changes (before/after)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAuditLogs } from '@/lib/auditLogger';
import { AuditLog, AuditAction, AuditEntityType } from '@/types';
import { ChevronDownIcon, ChevronUpIcon, FunnelIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

export default function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterUserId, setFilterUserId] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('');
  const [filterEntityType, setFilterEntityType] = useState<AuditEntityType | ''>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Expanded log for viewing details
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Load logs
  useEffect(() => {
    if (user?.tenantId) {
      loadLogs();
    }
  }, [user?.tenantId, filterUserId, filterAction, filterEntityType, filterStartDate, filterEndDate]);

  const loadLogs = async () => {
    if (!user?.tenantId) return;

    setLoading(true);
    setError('');

    try {
      const filters: any = {
        tenantId: user.tenantId,
        limit: 100,
      };

      if (filterUserId) filters.userId = filterUserId;
      if (filterAction) filters.action = filterAction;
      if (filterEntityType) filters.entityType = filterEntityType;
      if (filterStartDate) filters.startDate = new Date(filterStartDate);
      if (filterEndDate) filters.endDate = new Date(filterEndDate);

      const auditLogs = await getAuditLogs(filters);
      setLogs(auditLogs);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterUserId('');
    setFilterAction('');
    setFilterEntityType('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const exportToCSV = () => {
    // CSV headers
    const headers = [
      'Timestamp',
      'User',
      'Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'Entity Name',
      'Success',
      'Error Message',
      'IP Address',
    ];

    // CSV rows
    const rows = logs.map(log => [
      log.timestamp.toDate().toLocaleString(),
      log.userName,
      log.userRole,
      log.action,
      log.entityType,
      log.entityId,
      log.entityName || '',
      log.success ? 'Yes' : 'No',
      log.errorMessage || '',
      log.ipAddress || '',
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const formatTimestamp = (timestamp: any) => {
    return timestamp.toDate().toLocaleString();
  };

  const getActionBadgeColor = (action: AuditAction) => {
    if (['create', 'login'].includes(action)) return 'bg-green-100 text-green-800';
    if (['update', 'publish_scores'].includes(action)) return 'bg-blue-100 text-blue-800';
    if (['delete', 'soft_delete', 'failed_login'].includes(action)) return 'bg-red-100 text-red-800';
    if (['view', 'search', 'filter'].includes(action)) return 'bg-gray-100 text-gray-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-2 text-gray-600">
          View and filter system activity logs for compliance and debugging
        </p>
      </div>

      {/* Filter Toggle & Export */}
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FunnelIcon className="h-5 w-5 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        <button
          onClick={exportToCSV}
          disabled={logs.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
          Export to CSV
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* User ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                placeholder="Filter by user ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value as AuditAction | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="failed_login">Failed Login</option>
                <option value="publish_scores">Publish Scores</option>
                <option value="generate_result">Generate Result</option>
                <option value="download_pdf">Download PDF</option>
                <option value="view">View</option>
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity Type
              </label>
              <select
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value as AuditEntityType | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Entity Types</option>
                <option value="student">Student</option>
                <option value="score">Score</option>
                <option value="result">Result</option>
                <option value="class">Class</option>
                <option value="subject">Subject</option>
                <option value="term">Term</option>
                <option value="teacher">Teacher</option>
                <option value="user">User</option>
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Logs Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {logs.length} log{logs.length !== 1 ? 's' : ''}
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
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
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                        <div className="text-sm text-gray-500">{log.userRole}</div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleLogExpansion(log.id)}
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                        >
                          {expandedLogId === log.id ? (
                            <>
                              <ChevronUpIcon className="h-4 w-4 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDownIcon className="h-4 w-4 mr-1" />
                              Show
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
                            {/* Error Message */}
                            {log.errorMessage && (
                              <div>
                                <strong className="text-sm font-medium text-gray-700">Error:</strong>
                                <p className="text-sm text-red-600 mt-1">{log.errorMessage}</p>
                              </div>
                            )}

                            {/* Changes (Before/After) */}
                            {log.changes && (
                              <div>
                                <strong className="text-sm font-medium text-gray-700">Changes:</strong>
                                {log.changes.fields && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Fields changed: {log.changes.fields.join(', ')}
                                  </p>
                                )}
                                <div className="mt-2 grid grid-cols-2 gap-4">
                                  {log.changes.before && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase">Before</p>
                                      <pre className="mt-1 text-xs bg-white p-2 rounded border border-gray-200 overflow-auto">
                                        {JSON.stringify(log.changes.before, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.changes.after && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase">After</p>
                                      <pre className="mt-1 text-xs bg-white p-2 rounded border border-gray-200 overflow-auto">
                                        {JSON.stringify(log.changes.after, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Metadata */}
                            {log.metadata && (
                              <div>
                                <strong className="text-sm font-medium text-gray-700">Metadata:</strong>
                                <pre className="mt-1 text-xs bg-white p-2 rounded border border-gray-200 overflow-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* IP Address & User Agent */}
                            <div className="flex gap-4">
                              {log.ipAddress && (
                                <div>
                                  <strong className="text-sm font-medium text-gray-700">IP Address:</strong>
                                  <p className="text-sm text-gray-600">{log.ipAddress}</p>
                                </div>
                              )}
                              {log.userAgent && (
                                <div>
                                  <strong className="text-sm font-medium text-gray-700">User Agent:</strong>
                                  <p className="text-sm text-gray-600 max-w-md truncate">{log.userAgent}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
