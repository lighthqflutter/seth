'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseTeachersCSV, exportToCSV, downloadCSV } from '@/lib/csvImport';
import { generateAndDownloadTemplate } from '@/lib/dynamicCSV';

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'teacher';
  isActive: boolean;
  createdAt: {
    toDate: () => Date;
  };
}

export default function TeachersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.tenantId) return;

    const teachersQuery = query(
      collection(db, 'users'),
      where('tenantId', '==', user.tenantId),
      where('role', '==', 'teacher'),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(
      teachersQuery,
      (snapshot) => {
        const teachersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Teacher[];

        setTeachers(teachersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading teachers:', error);
        // If index is missing or permission denied, show empty state
        setTeachers([]);
        setLoading(false);
      }
    );

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
      const result = parseTeachersCSV(text);

      if (!result.success) {
        setImportError(result.errors.join('\n'));
        setImporting(false);
        return;
      }

      // Import to Firestore users collection with role='teacher'
      const { addDoc, collection: firestoreCollection } = await import('firebase/firestore');
      const usersRef = firestoreCollection(db, 'users');

      for (const teacherData of result.data) {
        await addDoc(usersRef, {
          name: teacherData.name,
          email: teacherData.email,
          phone: teacherData.phone,
          role: 'teacher',
          isActive: true,
          tenantId: user?.tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      setImporting(false);
      alert(`Successfully imported ${result.data.length} teachers!`);
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
    // Use dynamic CSV system
    generateAndDownloadTemplate('teacher', undefined, {
      includeOptional: true,
      includeCustomFields: true,
      sampleRows: 3,
    });
  };

  const handleExportTeachers = () => {
    const exportData = teachers.map((t) => ({
      name: t.name,
      email: t.email,
      phone: t.phone || '',
    }));

    const csv = exportToCSV(exportData, ['name', 'email', 'phone']);
    downloadCSV(csv, `teachers_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleToggleActive = async (teacherId: string, teacherName: string, isActive: boolean) => {
    const action = isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${teacherName}"?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', teacherId), {
        isActive: !isActive,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Toggle active error:', error);
      alert(`Failed to ${action} teacher`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-600 mt-1">
            {teachers.length} {teachers.length === 1 ? 'teacher' : 'teachers'}
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
            {teachers.length > 0 && (
              <Button variant="outline" onClick={handleExportTeachers}>
                Export CSV
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard/teachers/new')}>Add Teacher</Button>
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

      {/* Teachers List */}
      {teachers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">👨‍🏫</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No teachers yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first teacher or importing from CSV
              </p>
              {user?.role === 'admin' && (
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => router.push('/dashboard/teachers/new')}>
                    Add Your First Teacher
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
        <div className="grid gap-4 md:grid-cols-2">
          {teachers.map((teacher) => (
            <Card key={teacher.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Teacher Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        teacher.isActive
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <span className="text-2xl">👨‍🏫</span>
                    </div>
                  </div>

                  {/* Teacher Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{teacher.name}</h3>
                      {!teacher.isActive && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Email:</span> {teacher.email}
                      </div>
                      {teacher.phone && (
                        <div>
                          <span className="font-medium">Phone:</span> {teacher.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/teachers/${teacher.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggleActive(teacher.id, teacher.name, teacher.isActive)
                        }
                        className={
                          teacher.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                        }
                      >
                        {teacher.isActive ? 'Deactivate' : 'Activate'}
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
