'use client';

/**
 * Fee Assignment Page
 * Phase 23: Fee Management System - Assign fees from structure to students
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { FeeStructureItem, StudentFee } from '@/types/fees';
import { formatCurrency, calculateFinalAmount, determinePaymentStatus, isOverdue } from '@/lib/feeHelpers';

export default function AssignFeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [classes, setClasses] = useState<Map<string, string>>(new Map());
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [feeItems, setFeeItems] = useState<FeeStructureItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedFeeItem, setSelectedFeeItem] = useState<string>('');
  const [assignmentSummary, setAssignmentSummary] = useState<{
    total: number;
    alreadyAssigned: number;
    willAssign: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    loadInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedTerm) {
      loadFeeItems();
    }
  }, [selectedTerm]);

  useEffect(() => {
    if (selectedTerm && selectedClass) {
      loadStudents();
    }
  }, [selectedTerm, selectedClass]);

  useEffect(() => {
    if (selectedFeeItem && students.length > 0) {
      calculateAssignmentSummary();
    } else {
      setAssignmentSummary(null);
    }
  }, [selectedFeeItem, students]);

  const loadInitialData = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);

      // Load terms
      const termsQuery = query(
        collection(db, 'terms'),
        where('tenantId', '==', user.tenantId)
      );
      const termsSnapshot = await getDocs(termsQuery);
      const termsData = termsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setTerms(termsData);

      if (termsData.length > 0 && !selectedTerm) {
        const activeTerm = termsSnapshot.docs.find((doc) => doc.data().isActive);
        setSelectedTerm(activeTerm?.id || termsData[0].id);
      }

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
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeeItems = async () => {
    if (!user?.tenantId || !selectedTerm) return;

    try {
      const feesQuery = query(
        collection(db, 'feeStructureItems'),
        where('tenantId', '==', user.tenantId),
        where('termId', '==', selectedTerm),
        where('isActive', '==', true)
      );
      const feesSnapshot = await getDocs(feesQuery);
      const items = feesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FeeStructureItem[];
      setFeeItems(items);
    } catch (error) {
      console.error('Error loading fee items:', error);
    }
  };

  const loadStudents = async () => {
    if (!user?.tenantId) return;

    try {
      let studentsQuery = query(
        collection(db, 'students'),
        where('tenantId', '==', user.tenantId),
        where('isActive', '==', true)
      );

      if (selectedClass !== 'all') {
        studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true),
          where('currentClassId', '==', selectedClass)
        );
      }

      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const calculateAssignmentSummary = async () => {
    if (!user?.tenantId || !selectedFeeItem || students.length === 0) return;

    try {
      // Check which students already have this fee assigned
      const existingFeesQuery = query(
        collection(db, 'studentFees'),
        where('tenantId', '==', user.tenantId),
        where('termId', '==', selectedTerm),
        where('feeStructureItemId', '==', selectedFeeItem)
      );
      const existingFeesSnapshot = await getDocs(existingFeesQuery);
      const assignedStudentIds = new Set(
        existingFeesSnapshot.docs.map((doc) => doc.data().studentId)
      );

      const willAssign = students.filter((s) => !assignedStudentIds.has(s.id)).length;

      setAssignmentSummary({
        total: students.length,
        alreadyAssigned: assignedStudentIds.size,
        willAssign,
      });
    } catch (error) {
      console.error('Error calculating assignment summary:', error);
    }
  };

  const handleAssignFees = async () => {
    if (!user?.tenantId || !selectedFeeItem || !assignmentSummary) return;

    if (assignmentSummary.willAssign === 0) {
      alert('No students to assign fees to');
      return;
    }

    if (!confirm(`Assign fees to ${assignmentSummary.willAssign} students?`)) {
      return;
    }

    try {
      setAssigning(true);

      // Get fee item details
      const feeItem = feeItems.find((f) => f.id === selectedFeeItem);
      if (!feeItem) {
        throw new Error('Fee item not found');
      }

      // Get already assigned student IDs
      const existingFeesQuery = query(
        collection(db, 'studentFees'),
        where('tenantId', '==', user.tenantId),
        where('termId', '==', selectedTerm),
        where('feeStructureItemId', '==', selectedFeeItem)
      );
      const existingFeesSnapshot = await getDocs(existingFeesQuery);
      const assignedStudentIds = new Set(
        existingFeesSnapshot.docs.map((doc) => doc.data().studentId)
      );

      // Filter students who don't have this fee yet
      const studentsToAssign = students.filter((s) => !assignedStudentIds.has(s.id));

      // Use batch for better performance
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const student of studentsToAssign) {
        const finalAmount = calculateFinalAmount(feeItem.amount, {
          discountAmount: 0,
          waiverAmount: 0,
          latePenaltyPercentage: feeItem.latePenaltyPercentage,
          isOverdue: false,
        });

        const dueDate = feeItem.dueDate instanceof Date ? feeItem.dueDate : feeItem.dueDate.toDate();
        const overdueStatus = isOverdue(dueDate);

        const studentFee: Omit<StudentFee, 'id'> = {
          tenantId: user.tenantId,
          studentId: student.id,
          feeStructureItemId: feeItem.id,
          termId: selectedTerm,
          classId: student.currentClassId,
          feeType: feeItem.feeType,
          feeName: feeItem.customName || feeItem.description,
          baseAmount: feeItem.amount,
          finalAmount,
          amountPaid: 0,
          amountOutstanding: finalAmount,
          status: overdueStatus ? 'overdue' : 'pending',
          dueDate: Timestamp.fromDate(dueDate),
          isOverdue: overdueStatus,
          allowInstallments: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          assignedBy: user.uid,
        };

        const feeRef = doc(collection(db, 'studentFees'));
        batch.set(feeRef, studentFee);

        batchCount++;

        // Firestore batch limit is 500 operations
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }

      // Commit remaining operations
      if (batchCount > 0) {
        await batch.commit();
      }

      alert(`Successfully assigned fees to ${studentsToAssign.length} students`);

      // Reset and reload
      setSelectedFeeItem('');
      calculateAssignmentSummary();
    } catch (error) {
      console.error('Error assigning fees:', error);
      alert('Failed to assign fees. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assign Fees to Students</h1>
          <p className="text-gray-600 mt-1">
            Bulk assign fees from structure to students
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/fees')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Selection Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Fee and Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Term Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term *
            </label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class *
            </label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
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
          </div>

          {/* Fee Item Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fee to Assign *
            </label>
            <Select value={selectedFeeItem} onValueChange={setSelectedFeeItem}>
              <SelectTrigger>
                <SelectValue placeholder="Select fee item" />
              </SelectTrigger>
              <SelectContent>
                {feeItems.length === 0 ? (
                  <SelectItem value="" disabled>
                    No fee items available for this term
                  </SelectItem>
                ) : (
                  feeItems.map((item) => {
                    const className = item.classId ? classes.get(item.classId) : 'All Classes';
                    return (
                      <SelectItem key={item.id} value={item.id}>
                        {item.customName || item.description} - {formatCurrency(item.amount)} ({className})
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Summary */}
      {assignmentSummary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              Assignment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {assignmentSummary.total}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Students</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {assignmentSummary.alreadyAssigned}
                </p>
                <p className="text-sm text-gray-600 mt-1">Already Assigned</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">
                  {assignmentSummary.willAssign}
                </p>
                <p className="text-sm text-gray-600 mt-1">Will Be Assigned</p>
              </div>
            </div>

            {assignmentSummary.willAssign === 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      All students already have this fee assigned
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      No new assignments needed
                    </p>
                  </div>
                </div>
              </div>
            )}

            {assignmentSummary.willAssign > 0 && (
              <>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-900">
                        Ready to assign fees to {assignmentSummary.willAssign} students
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        This action will create fee records for all students who don't have this fee yet
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleAssignFees}
                  disabled={assigning}
                  className="w-full mt-6"
                  size="lg"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {assigning
                    ? 'Assigning Fees...'
                    : `Assign Fees to ${assignmentSummary.willAssign} Students`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use This Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Select the term for which you want to assign fees</li>
            <li>Choose a class (or "All Classes" to assign to all students)</li>
            <li>Select the fee item from the fee structure</li>
            <li>Review the assignment summary to see how many students will receive the fee</li>
            <li>Click "Assign Fees" to create fee records for all eligible students</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Students who already have this fee assigned will be skipped automatically.
              This prevents duplicate fee assignments.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
