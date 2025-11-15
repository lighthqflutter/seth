'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseSubjectsCSV, exportToCSV, downloadCSV } from '@/lib/csvImport';
import { generateAndDownloadTemplate } from '@/lib/dynamicCSV';

interface Subject {
  id: string;
  name: string;
  code: string;
  maxScore: number;
  description?: string;
  createdAt: {
    toDate: () => Date;
  };
}

export default function SubjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.tenantId) return;

    const subjectsQuery = query(
      collection(db, 'subjects'),
      where('tenantId', '==', user.tenantId),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(subjectsQuery, (snapshot) => {
      const subjectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];

      setSubjects(subjectsData);
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
      const result = parseSubjectsCSV(text);

      if (!result.success) {
        setImportError(result.errors.join('\n'));
        setImporting(false);
        return;
      }

      // Import to Firestore
      const { addDoc, collection: firestoreCollection } = await import('firebase/firestore');
      const subjectsRef = firestoreCollection(db, 'subjects');

      for (const subjectData of result.data) {
        await addDoc(subjectsRef, {
          ...subjectData,
          tenantId: user?.tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      setImporting(false);
      alert(`Successfully imported ${result.data.length} subjects!`);
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
    generateAndDownloadTemplate('subject', undefined, {
      includeOptional: true,
      includeCustomFields: true,
      sampleRows: 3,
    });
  };

  const handleExportSubjects = () => {
    const exportData = subjects.map((s) => ({
      name: s.name,
      code: s.code,
      maxScore: s.maxScore,
      description: s.description || '',
    }));

    const csv = exportToCSV(exportData, ['name', 'code', 'maxScore', 'description']);
    downloadCSV(csv, `subjects_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDelete = async (subjectId: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to delete "${subjectName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'subjects', subjectId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete subject');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-600 mt-1">
            {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
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
            {subjects.length > 0 && (
              <Button variant="outline" onClick={handleExportSubjects}>
                Export CSV
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard/subjects/new')}>Add Subject</Button>
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

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No subjects yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first subject or importing from CSV
              </p>
              {user?.role === 'admin' && (
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => router.push('/dashboard/subjects/new')}>
                    Add Your First Subject
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
          {subjects.map((subject) => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Subject Icon */}
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                      <span className="text-xl font-bold">{subject.code.slice(0, 3)}</span>
                    </div>
                  </div>

                  {/* Subject Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                      <span>
                        <span className="font-medium">Code:</span> {subject.code}
                      </span>
                      <span>
                        <span className="font-medium">Max Score:</span> {subject.maxScore}
                      </span>
                    </div>
                    {subject.description && (
                      <p className="text-sm text-gray-600 mt-2">{subject.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/subjects/${subject.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(subject.id, subject.name)}
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
