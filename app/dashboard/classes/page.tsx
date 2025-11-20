'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseClassesCSV, exportToCSV, downloadCSV } from '@/lib/csvImport';
import { generateAndDownloadTemplate, scanEntityStructure, generateDynamicCSVTemplate } from '@/lib/dynamicCSV';

interface Class {
  id: string;
  name: string;
  level: string;
  teacherId?: string;
  studentCount: number;
  academicYear: string;
  createdAt: {
    toDate: () => Date;
  };
}

export default function ClassesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.tenantId) return;

    const classesQuery = query(
      collection(db, 'classes'),
      where('tenantId', '==', user.tenantId),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(classesQuery, async (snapshot) => {
      const classesData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const classData = doc.data();

          // Get actual student count from students collection
          const studentsQuery = query(
            collection(db, 'students'),
            where('tenantId', '==', user.tenantId),
            where('currentClassId', '==', doc.id)
          );
          const studentsSnapshot = await getDocs(studentsQuery);

          return {
            id: doc.id,
            ...classData,
            studentCount: studentsSnapshot.size,
          } as Class;
        })
      );

      setClasses(classesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.tenantId]);

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    try {
      const text = await file.text();
      const result = parseClassesCSV(text);

      if (!result.success) {
        setImportError(result.errors.join('\n'));
        setImporting(false);
        return;
      }

      // Import to Firestore
      const { addDoc, collection: firestoreCollection } = await import('firebase/firestore');
      const classesRef = firestoreCollection(db, 'classes');

      for (const classData of result.data) {
        await addDoc(classesRef, {
          ...classData,
          tenantId: user?.tenantId,
          studentCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      setImporting(false);
      alert(`Successfully imported ${result.data.length} classes!`);
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to import CSV file');
      setImporting(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    // Use dynamic CSV system - generates template based on actual entity structure
    generateAndDownloadTemplate('class', undefined, {
      includeOptional: true,
      includeCustomFields: true,
      sampleRows: 3,
    });
  };

  const handleExportClasses = () => {
    const exportData = classes.map(c => ({
      name: c.name,
      level: c.level,
      academicYear: c.academicYear,
      studentCount: c.studentCount,
      teacherId: c.teacherId || '',
    }));

    const csv = exportToCSV(exportData, ['name', 'level', 'academicYear', 'studentCount', 'teacherId']);
    downloadCSV(csv, `classes_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDelete = async (classId: string, className: string, studentCount: number) => {
    if (studentCount > 0) {
      alert(`Cannot delete "${className}" because it has ${studentCount} students. Please reassign students first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${className}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'classes', classId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete class');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600 mt-1">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <Button variant="outline" onClick={handleImportCSV} disabled={importing}>
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            {classes.length > 0 && (
              <Button variant="outline" onClick={handleExportClasses}>
                Export CSV
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard/classes/new')}>
              Add Class
            </Button>
          </div>
        )}
      </div>

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Import Error */}
      {importError && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <h3 className="text-red-900 font-semibold mb-2">Import Failed</h3>
            <pre className="text-sm text-red-700 whitespace-pre-wrap">{importError}</pre>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setImportError(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Classes List */}
      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">🏫</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No classes yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first class or importing from CSV
              </p>
              {user?.role === 'admin' && (
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => router.push('/dashboard/classes/new')}>
                    Add Your First Class
                  </Button>
                  <Button variant="outline" onClick={handleImportCSV}>
                    Import from CSV
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* Class Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-16 w-16 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <span className="text-2xl">🏫</span>
                    </div>
                  </div>

                  {/* Class Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {classItem.name}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                      <span>
                        <span className="font-medium">Level:</span> {classItem.level}
                      </span>
                      <span>
                        <span className="font-medium">Year:</span> {classItem.academicYear}
                      </span>
                      <span>
                        <span className="font-medium">Students:</span> {classItem.studentCount} students
                      </span>
                      {classItem.teacherId && (
                        <span>
                          <span className="font-medium">Teacher ID:</span> {classItem.teacherId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/classes/${classItem.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(classItem.id, classItem.name, classItem.studentCount)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
