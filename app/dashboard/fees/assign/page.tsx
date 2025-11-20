'use client';

/**
 * Fee Assignment Page - Enhanced Version
 * Phase 23: Fee Management System - Flexible fee assignment with checkboxes
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
  Timestamp,
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
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { FeeStructureItem, StudentFee } from '@/types/fees';
import { formatCurrency, calculateFinalAmount, isOverdue } from '@/lib/feeHelpers';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassId: string;
  currentClassName?: string;
}

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
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedFeeItems, setSelectedFeeItems] = useState<Set<string>>(new Set());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // Helper function to get term name
  const getTermName = (termId: string): string => {
    const term = terms.find(t => t.id === termId);
    return term ? term.name : 'Term';
  };

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
    if (searchTerm.trim() === '') {
      setFilteredStudents(students);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = students.filter(
        (student) =>
          student.firstName.toLowerCase().includes(term) ||
          student.lastName.toLowerCase().includes(term) ||
          student.admissionNumber.toLowerCase().includes(term)
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, students]);

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
        const activeTerm = termsSnapshot.docs.find((doc) =>
          doc.data().isActive === true || doc.data().isCurrent === true
        );
        setSelectedTerm(activeTerm?.id || termsData[0].id);
      }

      // Load classes
      const classesQuery = query(
        collection(db, 'classes'),
        where('tenantId', '==', user.tenantId)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classesMap = new Map<string, string>();
      classesSnapshot.docs
        .filter(doc => doc.data().isActive !== false)
        .forEach((doc) => {
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
      let studentsQuery;

      if (selectedClass !== 'all') {
        studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('currentClassId', '==', selectedClass)
        );
      } else {
        studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId)
        );
      }

      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs
        .filter(doc => doc.data().isActive !== false)
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            admissionNumber: data.admissionNumber || '',
            currentClassId: data.currentClassId || '',
            currentClassName: classes.get(data.currentClassId) || '',
          };
        });
      setStudents(studentsData);
      setFilteredStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const toggleFeeItem = (feeId: string) => {
    const newSelected = new Set(selectedFeeItems);
    if (newSelected.has(feeId)) {
      newSelected.delete(feeId);
    } else {
      newSelected.add(feeId);
    }
    setSelectedFeeItems(newSelected);
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAllFees = () => {
    if (selectedFeeItems.size === feeItems.length) {
      setSelectedFeeItems(new Set());
    } else {
      setSelectedFeeItems(new Set(feeItems.map(f => f.id)));
    }
  };

  const toggleAllStudents = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleAssignFees = async () => {
    if (!user?.tenantId || selectedFeeItems.size === 0 || selectedStudents.size === 0) {
      alert('Please select at least one fee item and one student');
      return;
    }

    const confirmMsg = `Assign ${selectedFeeItems.size} fee item(s) to ${selectedStudents.size} student(s)?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setAssigning(true);

      // Check for existing assignments
      const existingFeesQuery = query(
        collection(db, 'studentFees'),
        where('tenantId', '==', user.tenantId),
        where('termId', '==', selectedTerm)
      );
      const existingFeesSnapshot = await getDocs(existingFeesQuery);

      // Create a map of existing assignments: studentId-feeStructureItemId -> exists
      const existingAssignments = new Set<string>();
      existingFeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        existingAssignments.add(`${data.studentId}-${data.feeStructureItemId}`);
      });

      const batch = writeBatch(db);
      let assignmentCount = 0;
      let skippedCount = 0;

      // Group fees by student to create consolidated bills
      const studentBills = new Map<string, {
        student: Student;
        feeItems: FeeStructureItem[];
        totalAmount: number;
        dueDate: Date;
      }>();

      // First, organize fees by student
      for (const studentId of Array.from(selectedStudents)) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        const studentFeeItems: FeeStructureItem[] = [];
        let totalAmount = 0;
        let earliestDueDate: Date | null = null;

        for (const feeId of Array.from(selectedFeeItems)) {
          const feeItem = feeItems.find(f => f.id === feeId);
          if (!feeItem) continue;

          // Skip if already assigned
          const assignmentKey = `${studentId}-${feeId}`;
          if (existingAssignments.has(assignmentKey)) {
            skippedCount++;
            continue;
          }

          studentFeeItems.push(feeItem);
          totalAmount += feeItem.amount;

          const dueDate = feeItem.dueDate instanceof Date
            ? feeItem.dueDate
            : feeItem.dueDate.toDate();

          if (!earliestDueDate || dueDate < earliestDueDate) {
            earliestDueDate = dueDate;
          }
        }

        if (studentFeeItems.length > 0 && earliestDueDate) {
          studentBills.set(studentId, {
            student,
            feeItems: studentFeeItems,
            totalAmount,
            dueDate: earliestDueDate,
          });
        }
      }

      // Generate consolidated bill ID for this assignment batch
      const consolidatedBillId = `bill_${selectedTerm}_${Date.now()}`;

      // Now create individual fee records but link them to consolidated bill
      for (const [studentId, billData] of studentBills) {
        const { student, feeItems: studentFeeItems, totalAmount, dueDate } = billData;
        const overdueStatus = isOverdue(dueDate);

        // Create one consolidated bill record per student
        const consolidatedBillRef = doc(collection(db, 'studentFees'));
        const consolidatedBill: any = {
          tenantId: user.tenantId,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          admissionNumber: student.admissionNumber,
          termId: selectedTerm,
          classId: student.currentClassId,

          // Consolidated bill fields
          isConsolidated: true,
          consolidatedBillId: consolidatedBillRef.id,
          feeName: `${getTermName(selectedTerm)} Fees (${studentFeeItems.length} items)`,
          feeItems: studentFeeItems.map(fi => ({
            id: fi.id,
            feeType: fi.feeType,
            name: fi.customName || fi.description,
            amount: fi.amount,
          })),

          baseAmount: totalAmount,
          finalAmount: totalAmount,
          amountPaid: 0,
          amountOutstanding: totalAmount,
          status: overdueStatus ? 'overdue' : 'pending',
          dueDate: Timestamp.fromDate(dueDate),
          isOverdue: overdueStatus,
          allowInstallments: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          assignedBy: user.uid,
        };

        batch.set(consolidatedBillRef, consolidatedBill);
        assignmentCount++;

        // Firestore batch limit is 500 operations
        if (assignmentCount % 500 === 0) {
          await batch.commit();
        }
      }

      // Commit remaining operations
      if (assignmentCount % 500 !== 0) {
        await batch.commit();
      }

      const message = skippedCount > 0
        ? `Successfully assigned ${assignmentCount} fees. Skipped ${skippedCount} duplicate assignments.`
        : `Successfully assigned ${assignmentCount} fees to students.`;

      alert(message);

      // Reset selections
      setSelectedFeeItems(new Set());
      setSelectedStudents(new Set());
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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assign Fees to Students</h1>
          <p className="text-gray-600 mt-1">
            Select fee items and students for flexible assignment
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/fees')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Term and Class Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Term and Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Fee Items Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fee Items ({selectedFeeItems.size} selected)</CardTitle>
              {feeItems.length > 0 && (
                <Button variant="outline" size="sm" onClick={toggleAllFees}>
                  {selectedFeeItems.size === feeItems.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {feeItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No fee items available for this term</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/dashboard/fees/structure')}
                >
                  Create Fee Structure
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {feeItems.map((item) => {
                  const className = item.classId ? classes.get(item.classId) : 'All Classes';
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFeeItems.has(item.id)
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFeeItems.has(item.id)}
                        onChange={() => toggleFeeItem(item.id)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.customName || item.description}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.amount)} • {className}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Students Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Students ({selectedStudents.size} selected)</CardTitle>
              {students.length > 0 && (
                <Button variant="outline" size="sm" onClick={toggleAllStudents}>
                  {selectedStudents.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No students found in {selectedClass === 'all' ? 'any class' : 'this class'}</p>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="mb-4 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search by name or admission number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Students List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <label
                      key={student.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStudents.has(student.id)
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {student.admissionNumber} • {student.currentClassName || 'No Class'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignment Summary and Action */}
      {selectedFeeItems.size > 0 && selectedStudents.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedFeeItems.size}</p>
                  <p className="text-sm text-gray-600">Fee Items</p>
                </div>
                <span className="text-2xl text-gray-400">×</span>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{selectedStudents.size}</p>
                  <p className="text-sm text-gray-600">Students</p>
                </div>
                <span className="text-2xl text-gray-400">=</span>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {selectedFeeItems.size * selectedStudents.size}
                  </p>
                  <p className="text-sm text-gray-600">Total Assignments</p>
                </div>
              </div>

              <Button onClick={handleAssignFees} disabled={assigning} size="lg">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                {assigning ? 'Assigning...' : 'Assign Fees'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
