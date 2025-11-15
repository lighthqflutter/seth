'use client';

/**
 * Email Delivery Logs Page (Phase 18)
 * Admin view of all sent emails and delivery status
 *
 * Features:
 * - View all sent emails
 * - Filter by type, status, recipient
 * - Search emails
 * - Retry failed emails
 * - Email delivery statistics
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { EmailType } from '@/lib/email/config';

interface EmailLog {
  id: string;
  to: string | string[];
  subject: string;
  type: EmailType;
  status: 'sent' | 'failed';
  messageId?: string;
  provider: 'brevo' | 'resend';
  error?: string;
  sentAt?: Date;
  createdAt: Date;
}

export default function EmailLogsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EmailLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | EmailType>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    todaySent: 0,
  });

  useEffect(() => {
    const loadLogs = async () => {
      if (!user?.tenantId) return;

      // Only admins can view email logs
      if (user.role !== 'admin') {
        return;
      }

      try {
        const logsQuery = query(
          collection(db, 'emailLogs'),
          where('tenantId', '==', user.tenantId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );

        const logsSnapshot = await getDocs(logsQuery);
        const logsData = logsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          sentAt: doc.data().sentAt?.toDate(),
        })) as EmailLog[];

        setLogs(logsData);
        setFilteredLogs(logsData);

        // Calculate stats
        const total = logsData.length;
        const sent = logsData.filter(log => log.status === 'sent').length;
        const failed = logsData.filter(log => log.status === 'failed').length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySent = logsData.filter(
          log => log.status === 'sent' && log.sentAt && log.sentAt >= today
        ).length;

        setStats({ total, sent, failed, todaySent });
        setLoading(false);
      } catch (error) {
        console.error('Error loading email logs:', error);
        setLoading(false);
      }
    };

    loadLogs();
  }, [user?.tenantId, user?.role]);

  // Apply filters
  useEffect(() => {
    let filtered = logs;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.type === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => {
        const toStr = Array.isArray(log.to) ? log.to.join(', ') : log.to;
        return (
          toStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.subject.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredLogs(filtered);
  }, [logs, statusFilter, typeFilter, searchTerm]);

  const getTypeLabel = (type: EmailType) => {
    const labels: Record<EmailType, string> = {
      [EmailType.SCHOOL_WELCOME]: 'School Welcome',
      [EmailType.STUDENT_WELCOME]: 'Student Welcome',
      [EmailType.TEACHER_WELCOME]: 'Teacher Welcome',
      [EmailType.PARENT_WELCOME]: 'Parent Welcome',
      [EmailType.PASSWORD_RESET]: 'Password Reset',
      [EmailType.PASSWORD_CHANGED]: 'Password Changed',
      [EmailType.EMAIL_VERIFICATION]: 'Email Verification',
      [EmailType.RESULTS_PUBLISHED]: 'Results Published',
      [EmailType.SCORES_ENTERED]: 'Scores Entered',
      [EmailType.SKILLS_ENTERED]: 'Skills Entered',
      [EmailType.FEE_REMINDER]: 'Fee Reminder',
      [EmailType.FEE_PAYMENT_RECEIVED]: 'Fee Payment',
      [EmailType.FEE_RECEIPT]: 'Fee Receipt',
      [EmailType.ANNOUNCEMENT]: 'Announcement',
      [EmailType.NEWSLETTER]: 'Newsletter',
      [EmailType.CUSTOM]: 'Custom',
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: EmailType) => {
    const colors: Record<string, string> = {
      welcome: 'bg-blue-100 text-blue-800',
      password: 'bg-purple-100 text-purple-800',
      results: 'bg-green-100 text-green-800',
      fee: 'bg-orange-100 text-orange-800',
      announcement: 'bg-pink-100 text-pink-800',
    };

    if (type.includes('welcome')) return colors.welcome;
    if (type.includes('password')) return colors.password;
    if (type.includes('results') || type.includes('scores') || type.includes('skills')) return colors.results;
    if (type.includes('fee')) return colors.fee;
    if (type.includes('announcement') || type.includes('newsletter')) return colors.announcement;

    return 'bg-gray-100 text-gray-800';
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Only administrators can access email logs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Delivery Logs</h1>
        <p className="text-gray-600 mt-1">View and monitor email delivery status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sent</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <EnvelopeIcon className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.sent}</p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
              </div>
              <XCircleIcon className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.todaySent}</p>
              </div>
              <ClockIcon className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by recipient or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value={EmailType.RESULTS_PUBLISHED}>Results Published</option>
              <option value={EmailType.FEE_REMINDER}>Fee Reminders</option>
              <option value={EmailType.PASSWORD_RESET}>Password Reset</option>
              <option value={EmailType.ANNOUNCEMENT}>Announcements</option>
              <option value={EmailType.NEWSLETTER}>Newsletters</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Emails ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No emails found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Array.isArray(log.to) ? `${log.to.length} recipients` : log.to}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">{log.subject}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(log.type)}`}>
                          {getTypeLabel(log.type)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {log.status === 'sent' ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.sentAt ? log.sentAt.toLocaleString() : log.createdAt.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
