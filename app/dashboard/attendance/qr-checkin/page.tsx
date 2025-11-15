'use client';

/**
 * QR Code Check-in System (Phase 21+)
 * Modern contactless attendance using QR codes
 *
 * Features:
 * - Generate unique QR codes for each student
 * - Scan QR codes for instant check-in
 * - Real-time attendance tracking
 * - Bulk QR code generation
 * - Print QR code cards
 * - Configure check-in time windows
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  QrCodeIcon,
  CameraIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentClassId: string;
  className?: string;
}

interface CheckInResult {
  success: boolean;
  student?: Student;
  message: string;
  timestamp: Date;
}

export default function QRCheckInPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [mode, setMode] = useState<'scan' | 'generate'>('scan');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [checkInResults, setCheckInResults] = useState<CheckInResult[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<Set<string>>(new Set());

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const readerDivId = 'qr-reader';

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId) return;

      try {
        // Load classes
        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setClasses(classesData);

        // Load students
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map(doc => {
          const cls = classesData.find(c => c.id === doc.data().currentClassId);
          return {
            id: doc.id,
            firstName: doc.data().firstName,
            lastName: doc.data().lastName,
            admissionNumber: doc.data().admissionNumber,
            currentClassId: doc.data().currentClassId,
            className: cls?.name,
          };
        });
        setStudents(studentsData);

        // Load today's check-ins
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayAttendanceQuery = query(
          collection(db, 'attendance'),
          where('tenantId', '==', user.tenantId),
          where('date', '>=', Timestamp.fromDate(today)),
          where('date', '<=', Timestamp.fromDate(todayEnd))
        );
        const todayAttendanceSnapshot = await getDocs(todayAttendanceQuery);
        const checkedInStudents = new Set(
          todayAttendanceSnapshot.docs.map(doc => doc.data().studentId)
        );
        setTodayCheckIns(checkedInStudents);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [user?.tenantId]);

  useEffect(() => {
    if (mode === 'scan' && scanning) {
      // Initialize QR scanner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const scanner = new Html5QrcodeScanner(readerDivId, config, false);
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (error) => {
          // Silent fail for scan errors
        }
      );

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
      };
    }
  }, [mode, scanning]);

  const handleScanSuccess = async (decodedText: string) => {
    if (!user?.tenantId) return;

    try {
      // Parse QR code data (format: studentId:tenantId)
      const [studentId, qrTenantId] = decodedText.split(':');

      if (qrTenantId !== user.tenantId) {
        addCheckInResult({
          success: false,
          message: 'Invalid QR code for this school',
          timestamp: new Date(),
        });
        return;
      }

      // Check if already checked in today
      if (todayCheckIns.has(studentId)) {
        const student = students.find(s => s.id === studentId);
        addCheckInResult({
          success: false,
          student,
          message: 'Already checked in today',
          timestamp: new Date(),
        });
        return;
      }

      // Get student details
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (!studentDoc.exists()) {
        addCheckInResult({
          success: false,
          message: 'Student not found',
          timestamp: new Date(),
        });
        return;
      }

      const studentData = {
        id: studentDoc.id,
        ...studentDoc.data(),
      } as Student;

      // Record attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendanceId = `${studentId}_${today.getTime()}`;
      const now = new Date();
      const hour = now.getHours();

      // Determine status based on time (assuming school starts at 8 AM)
      const status = hour >= 8 && hour < 9 ? 'present' : hour >= 9 ? 'late' : 'present';

      await setDoc(doc(db, 'attendance', attendanceId), {
        studentId,
        classId: studentData.currentClassId,
        date: Timestamp.fromDate(today),
        status,
        period: 'full_day',
        markedBy: user.uid,
        markedAt: serverTimestamp(),
        tenantId: user.tenantId,
        checkInMethod: 'qr_code',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setTodayCheckIns(prev => new Set([...prev, studentId]));

      addCheckInResult({
        success: true,
        student: studentData,
        message: status === 'late' ? 'Checked in (Late)' : 'Checked in successfully',
        timestamp: now,
      });

      // Play success sound (optional)
      playSuccessSound();
    } catch (error) {
      console.error('Error processing check-in:', error);
      addCheckInResult({
        success: false,
        message: 'Error processing check-in',
        timestamp: new Date(),
      });
    }
  };

  const addCheckInResult = (result: CheckInResult) => {
    setCheckInResults(prev => [result, ...prev].slice(0, 10));
  };

  const playSuccessSound = () => {
    // Optional: Play success sound
    const audio = new Audio('/sounds/success.mp3');
    audio.play().catch(() => {
      // Ignore audio play errors
    });
  };

  const generateQRCode = async (studentId: string, tenantId: string): Promise<string> => {
    const qrData = `${studentId}:${tenantId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrCodeDataUrl;
  };

  const handleGenerateQRCodes = async () => {
    if (!user?.tenantId) return;

    setLoading(true);
    try {
      const filteredStudents = selectedClass
        ? students.filter(s => s.currentClassId === selectedClass)
        : students;

      // Generate PDF with all QR codes
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();

      let x = 20;
      let y = 20;
      const cardWidth = 80;
      const cardHeight = 100;
      const margin = 10;

      for (let i = 0; i < filteredStudents.length; i++) {
        const student = filteredStudents[i];
        const qrCodeDataUrl = await generateQRCode(student.id, user.tenantId);

        // Add QR code and student info
        pdf.addImage(qrCodeDataUrl, 'PNG', x, y, 60, 60);
        pdf.setFontSize(10);
        pdf.text(`${student.firstName} ${student.lastName}`, x + 30, y + 70, { align: 'center' });
        pdf.text(student.admissionNumber, x + 30, y + 76, { align: 'center' });
        pdf.text(student.className || '', x + 30, y + 82, { align: 'center' });

        // Draw border
        pdf.rect(x - 5, y - 5, cardWidth, cardHeight);

        x += cardWidth + margin;
        if (x > 150) {
          x = 20;
          y += cardHeight + margin;
        }

        if (y > 250) {
          pdf.addPage();
          x = 20;
          y = 20;
        }
      }

      pdf.save(`Student_QR_Codes_${selectedClass || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`);
      alert(`Generated ${filteredStudents.length} QR codes successfully!`);
    } catch (error) {
      console.error('Error generating QR codes:', error);
      alert('Failed to generate QR codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Code Check-In</h1>
        <p className="text-gray-600 mt-1">Contactless attendance with QR codes</p>
      </div>

      {/* Mode Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Button
              variant={mode === 'scan' ? 'default' : 'outline'}
              onClick={() => {
                setMode('scan');
                setScanning(false);
              }}
              className="flex-1"
            >
              <CameraIcon className="h-5 w-5 mr-2" />
              Scan QR Codes
            </Button>
            <Button
              variant={mode === 'generate' ? 'default' : 'outline'}
              onClick={() => {
                setMode('generate');
                setScanning(false);
              }}
              className="flex-1"
            >
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Generate QR Codes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan Mode */}
      {mode === 'scan' && (
        <>
          {/* Scanner Card */}
          <Card>
            <CardHeader>
              <CardTitle>Scan Student QR Codes</CardTitle>
            </CardHeader>
            <CardContent>
              {!scanning ? (
                <div className="text-center py-12">
                  <CameraIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Start scanning to check in students
                  </p>
                  <Button onClick={() => setScanning(true)}>
                    <CameraIcon className="h-5 w-5 mr-2" />
                    Start Scanning
                  </Button>
                </div>
              ) : (
                <div>
                  <div id={readerDivId} className="mb-4"></div>
                  <Button variant="outline" onClick={() => setScanning(false)} className="w-full">
                    Stop Scanning
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check-in Results */}
          {checkInResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-Ins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checkInResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result.success ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-6 w-6 text-red-600" />
                          )}
                          <div>
                            {result.student && (
                              <p className="font-semibold text-gray-900">
                                {result.student.firstName} {result.student.lastName}
                              </p>
                            )}
                            <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                              {result.message}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <ClockIcon className="h-4 w-4" />
                          {result.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Check-ins Count */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Students Checked In Today</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">{todayCheckIns.size}</p>
                <p className="text-sm text-gray-500 mt-1">out of {students.length} total students</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Generate Mode */}
      {mode === 'generate' && (
        <>
          {/* Generation Options */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Student QR Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class (Optional)
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Classes</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> QR codes will be generated as a PDF file with student
                    information. You can print these cards and laminate them for students to use
                    for daily check-in.
                  </p>
                </div>

                <Button
                  onClick={handleGenerateQRCodes}
                  disabled={loading}
                  className="w-full"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  {loading ? 'Generating...' : 'Generate & Download QR Codes'}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  {selectedClass
                    ? `${students.filter(s => s.currentClassId === selectedClass).length} students selected`
                    : `${students.length} students will be generated`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use QR Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <p className="text-gray-700">
                    Generate QR codes for your students using the form above
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <p className="text-gray-700">
                    Print the PDF and cut out individual QR code cards
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <p className="text-gray-700">
                    Laminate the cards for durability (recommended)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  <p className="text-gray-700">
                    Distribute cards to students to keep in their bags or wallets
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                    5
                  </div>
                  <p className="text-gray-700">
                    Students scan their QR codes at the school entrance for instant check-in
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
