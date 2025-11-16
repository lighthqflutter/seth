'use client';

/**
 * Defaulters List Page
 * Phase 23: Fee Management System - Students with overdue payments
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { Defaulter, StudentFee } from '@/types/fees';
import { formatCurrency, sortDefaulters, daysPastDue } from '@/lib/feeHelpers';

export default function DefaultersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [filteredDefaulters, setFilteredDefaulters] = useState<Defaulter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'days'>('amount');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.tenantId) return;
    loadDefaulters();
  }, [user]);

  useEffect(() => {
    filterDefaulters();
  }, [defaulters, searchQuery, selectedClass, sortBy]);

  const loadDefaulters = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);

      // Load active term
      const termsQuery = query(
        collection(db, 'terms'),
        where('tenantId', '==', user.tenantId),
        where('isActive', '==', true)
      );
      const termsSnapshot = await getDocs(termsQuery);
      if (termsSnapshot.empty) {
        setLoading(false);
        return;
      }
      const termId = termsSnapshot.docs[0].id;

      // Load all students
      const studentsQuery = query(
        collection(db, 'students'),
        where('tenantId', '==', user.tenantId),
        where('isActive', '==', true)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsMap = new Map<string, any>();
      studentsSnapshot.docs.forEach((doc) => {
        studentsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // Load classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('tenantId', '==', user.tenantId),
        where('isActive', '==', true)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classesMap = new Map<string, string>();
      classesSnapshot.docs.forEach((doc) => {
        classesMap.set(doc.id, doc.data().name);
      });
      setClasses(classesMap);

      // Load overdue fees
      const feesQuery = query(
        collection(db, 'studentFees'),
        where('tenantId', '==', user.tenantId),
        where('termId', '==', termId),
        where('isOverdue', '==', true)
      );
      const feesSnapshot = await getDocs(feesQuery);
      const overdueFees = feesSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((fee: any) => fee.status !== 'paid' && fee.status !== 'waived') as StudentFee[];

      // Group by student
      const defaultersMap = new Map<string, { fees: StudentFee[]; total: number }>();

      overdueFees.forEach((fee) => {
        const existing = defaultersMap.get(fee.studentId) || { fees: [], total: 0 };
        existing.fees.push(fee);
        existing.total += fee.amountOutstanding;
        defaultersMap.set(fee.studentId, existing);
      });

      // Build defaulters list
      const defaultersList = Array.from(defaultersMap.entries())
        .map(([studentId, data]): Defaulter | null => {
          const student = studentsMap.get(studentId);
          if (!student) return null;

          // Load guardian info
          const guardianId = student.guardianId || student.parentId;

          // Calculate max days past due
          const maxDaysPastDue = Math.max(
            ...data.fees.map((f) => {
              const dueDate = f.dueDate instanceof Date ? f.dueDate : f.dueDate.toDate();
              return daysPastDue(dueDate);
            })
          );

          return {
            studentId,
            studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
            admissionNumber: student.admissionNumber || 'N/A',
            classId: student.currentClassId || '',
            className: classesMap.get(student.currentClassId) || 'Unknown',
            guardianName: student.guardianName || undefined,
            guardianPhone: student.guardianPhone || undefined,
            guardianEmail: student.guardianEmail || undefined,
            totalOutstanding: data.total,
            overdueAmount: data.total,
            daysPastDue: maxDaysPastDue,
            fees: data.fees.map((f) => ({
              feeId: f.id,
              feeName: f.feeName,
              amount: f.amountOutstanding,
              dueDate: f.dueDate instanceof Date ? f.dueDate : f.dueDate.toDate(),
            })),
          };
        })
        .filter((d): d is Defaulter => d !== null);

      setDefaulters(defaultersList);
    } catch (error) {
      console.error('Error loading defaulters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDefaulters = () => {
    let filtered = [...defaulters];

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (d) =>
          d.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter((d) => d.classId === selectedClass);
    }

    // Sort
    filtered = sortDefaulters(filtered, sortBy, 'desc');

    setFilteredDefaulters(filtered);
  };

  const handleSendReminder = (defaulter: Defaulter) => {
    if (!defaulter.guardianEmail && !defaulter.guardianPhone) {
      alert('No contact information available for this guardian');
      return;
    }

    // TODO: Integrate with email/SMS notification system (Phase 18)
    alert(`Reminder will be sent to ${defaulter.guardianName || 'guardian'}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            Fee Defaulters
          </h1>
          <p className="text-gray-600 mt-1">
            Students with overdue payments ({filteredDefaulters.length} total)
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/fees')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or admission number..."
                className="pl-10"
              />
            </div>

            {/* Class Filter */}
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {Array.from(classes.entries()).map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'amount' | 'days')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Sort by Amount (High to Low)</SelectItem>
                <SelectItem value="days">Sort by Days Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Defaulters List */}
      {filteredDefaulters.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">No Defaulters Found</p>
              <p className="text-gray-600 mt-2">
                {searchQuery || selectedClass !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All students are up to date with their payments!'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDefaulters.map((defaulter) => (
            <Card
              key={defaulter.studentId}
              className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/fees/student/${defaulter.studentId}`)}
            >
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Student Info */}
                  <div className="md:col-span-2">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {defaulter.studentName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {defaulter.admissionNumber} • {defaulter.className}
                        </p>
                      </div>
                      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {defaulter.daysPastDue} days overdue
                      </span>
                    </div>

                    {/* Overdue Fees */}
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-gray-700 uppercase">Overdue Fees:</p>
                      {defaulter.fees.map((fee) => (
                        <div
                          key={fee.feeId}
                          className="flex items-center justify-between text-sm bg-red-50 p-2 rounded"
                        >
                          <span className="text-gray-900">{fee.feeName}</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(fee.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outstanding Amount */}
                  <div className="flex flex-col items-center justify-center bg-red-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 uppercase mb-1">Total Outstanding</p>
                    <p className="text-3xl font-bold text-red-600">
                      {formatCurrency(defaulter.overdueAmount)}
                    </p>
                  </div>

                  {/* Guardian Contact & Actions */}
                  <div className="flex flex-col justify-between">
                    {/* Guardian Info */}
                    {defaulter.guardianName && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-700 uppercase mb-2">
                          Guardian Contact:
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {defaulter.guardianName}
                        </p>
                        {defaulter.guardianPhone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <PhoneIcon className="h-4 w-4" />
                            {defaulter.guardianPhone}
                          </div>
                        )}
                        {defaulter.guardianEmail && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <EnvelopeIcon className="h-4 w-4" />
                            {defaulter.guardianEmail}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/fees/record-payment?student=${defaulter.studentId}`);
                        }}
                      >
                        Record Payment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendReminder(defaulter);
                        }}
                      >
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        Send Reminder
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
