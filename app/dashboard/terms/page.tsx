'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseTermsCSV, exportToCSV, downloadCSV } from '@/lib/csvImport';
import { generateAndDownloadTemplate } from '@/lib/dynamicCSV';

interface Term {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  isCurrent: boolean;
  academicYear: string;
  createdAt: {
    toDate: () => Date;
  };
}

export default function TermsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.tenantId) return;

    const termsQuery = query(
      collection(db, 'terms'),
      where('tenantId', '==', user.tenantId),
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(termsQuery, (snapshot) => {
      const termsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Term[];

      setTerms(termsData);
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
      const result = parseTermsCSV(text);

      if (!result.success) {
        setImportError(result.errors.join('\n'));
        setImporting(false);
        return;
      }

      // Import to Firestore
      const { addDoc, collection: firestoreCollection } = await import('firebase/firestore');
      const termsRef = firestoreCollection(db, 'terms');

      for (const termData of result.data) {
        // Convert date strings to Timestamps
        const startDate = Timestamp.fromDate(new Date(termData.startDate));
        const endDate = Timestamp.fromDate(new Date(termData.endDate));

        await addDoc(termsRef, {
          name: termData.name,
          startDate,
          endDate,
          isCurrent: termData.isCurrent,
          academicYear: termData.academicYear,
          tenantId: user?.tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      setImporting(false);
      alert(`Successfully imported ${result.data.length} terms!`);
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
    generateAndDownloadTemplate('term', undefined, {
      includeOptional: true,
      includeCustomFields: true,
      sampleRows: 3,
    });
  };

  const handleExportTerms = () => {
    const exportData = terms.map((t) => ({
      name: t.name,
      startDate: t.startDate.toDate().toISOString().split('T')[0],
      endDate: t.endDate.toDate().toISOString().split('T')[0],
      isCurrent: t.isCurrent,
      academicYear: t.academicYear,
    }));

    const csv = exportToCSV(exportData, ['name', 'startDate', 'endDate', 'isCurrent', 'academicYear']);
    downloadCSV(csv, `terms_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDelete = async (termId: string, termName: string) => {
    if (!confirm(`Are you sure you want to delete "${termName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'terms', termId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete term');
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Terms</h1>
          <p className="text-gray-600 mt-1">
            {terms.length} {terms.length === 1 ? 'term' : 'terms'}
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
            {terms.length > 0 && (
              <Button variant="outline" onClick={handleExportTerms}>
                Export CSV
              </Button>
            )}
            <Button onClick={() => router.push('/dashboard/terms/new')}>Add Term</Button>
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

      {/* Terms List */}
      {terms.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No terms yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first term or importing from CSV
              </p>
              {user?.role === 'admin' && (
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => router.push('/dashboard/terms/new')}>
                    Add Your First Term
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
          {terms.map((term) => (
            <Card key={term.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Term Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                        term.isCurrent
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span className="text-2xl">📅</span>
                    </div>
                  </div>

                  {/* Term Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{term.name}</h3>
                      {term.isCurrent && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                      <span>
                        <span className="font-medium">Start:</span> {formatDate(term.startDate)}
                      </span>
                      <span>
                        <span className="font-medium">End:</span> {formatDate(term.endDate)}
                      </span>
                      <span>
                        <span className="font-medium">Academic Year:</span> {term.academicYear}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/terms/${term.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(term.id, term.name)}
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
