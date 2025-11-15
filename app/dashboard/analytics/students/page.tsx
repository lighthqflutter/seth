'use client';

/**
 * Student Analytics (Phase 22)
 * Individual student performance analysis
 *
 * Features:
 * - Student search and selection
 * - Performance trends over terms
 * - Subject strengths/weaknesses
 * - At-risk identification
 * - Performance predictions
 * - Improvement tracking
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  className: string;
}

interface SubjectScore {
  subject: string;
  score: number;
  grade: string;
}

interface TermPerformance {
  term: string;
  average: number;
}

interface PredictionData {
  nextTermPrediction: number;
  trend: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export default function StudentAnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [subjectScores, setSubjectScores] = useState<SubjectScore[]>([]);
  const [termPerformance, setTermPerformance] = useState<TermPerformance[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [studentStats, setStudentStats] = useState({
    currentAverage: 0,
    highestScore: 0,
    lowestScore: 0,
    totalSubjects: 0,
    passedSubjects: 0,
    failedSubjects: 0,
  });

  useEffect(() => {
    const loadStudents = async () => {
      if (!user?.tenantId) return;

      try {
        const studentsQuery = query(
          collection(db, 'students'),
          where('tenantId', '==', user.tenantId),
          where('isActive', '==', true)
        );
        const studentsSnapshot = await getDocs(studentsQuery);

        const classesQuery = query(
          collection(db, 'classes'),
          where('tenantId', '==', user.tenantId)
        );
        const classesSnapshot = await getDocs(classesQuery);
        const classes = new Map(
          classesSnapshot.docs.map(doc => [doc.id, doc.data().name])
        );

        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: `${doc.data().firstName} ${doc.data().lastName}`,
          admissionNumber: doc.data().admissionNumber,
          className: classes.get(doc.data().currentClassId) || 'Unknown',
        }));

        setStudents(studentsData);
      } catch (error) {
        console.error('Error loading students:', error);
      }
    };

    loadStudents();
  }, [user?.tenantId]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentAnalytics();
    }
  }, [selectedStudent]);

  const loadStudentAnalytics = async () => {
    if (!user?.tenantId || !selectedStudent) return;

    setLoading(true);
    try {
      // Load all terms
      const termsQuery = query(
        collection(db, 'terms'),
        where('tenantId', '==', user.tenantId),
        orderBy('startDate', 'desc')
      );
      const termsSnapshot = await getDocs(termsQuery);
      const terms = termsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));

      // Load scores for all terms
      const scoresQuery = query(
        collection(db, 'scores'),
        where('tenantId', '==', user.tenantId),
        where('studentId', '==', selectedStudent),
        where('isPublished', '==', true)
      );
      const scoresSnapshot = await getDocs(scoresQuery);
      const scores = scoresSnapshot.docs.map(doc => ({
        ...doc.data(),
        termId: doc.data().termId,
      }));

      // Load subjects
      const subjectsQuery = query(
        collection(db, 'subjects'),
        where('tenantId', '==', user.tenantId)
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjects = new Map(
        subjectsSnapshot.docs.map(doc => [doc.id, doc.data().name])
      );

      // Get current term scores
      const currentTerm = terms[0];
      const currentTermScores = scores.filter(s => s.termId === currentTerm?.id);

      const subjectScoresData: SubjectScore[] = currentTermScores.map(score => ({
        subject: subjects.get(score.subjectId) || 'Unknown',
        score: score.percentage || 0,
        grade: score.grade || 'F9',
      })).sort((a, b) => b.score - a.score);

      setSubjectScores(subjectScoresData);

      // Calculate term performance over time
      const termPerfData: TermPerformance[] = terms.map(term => {
        const termScores = scores.filter(s => s.termId === term.id);
        const average = termScores.length > 0
          ? termScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / termScores.length
          : 0;

        return {
          term: term.name,
          average: Math.round(average),
        };
      }).reverse();

      setTermPerformance(termPerfData);

      // Calculate student stats
      const currentAverage = subjectScoresData.length > 0
        ? subjectScoresData.reduce((sum, s) => sum + s.score, 0) / subjectScoresData.length
        : 0;

      const highestScore = subjectScoresData.length > 0
        ? Math.max(...subjectScoresData.map(s => s.score))
        : 0;

      const lowestScore = subjectScoresData.length > 0
        ? Math.min(...subjectScoresData.map(s => s.score))
        : 0;

      const passedSubjects = subjectScoresData.filter(s => s.score >= 40).length;
      const failedSubjects = subjectScoresData.filter(s => s.score < 40).length;

      setStudentStats({
        currentAverage: Math.round(currentAverage),
        highestScore,
        lowestScore,
        totalSubjects: subjectScoresData.length,
        passedSubjects,
        failedSubjects,
      });

      // Calculate predictions
      if (termPerfData.length >= 2) {
        const recentTerms = termPerfData.slice(-3);
        const averages = recentTerms.map(t => t.average);

        // Simple linear regression for prediction
        const n = averages.length;
        const sumX = (n * (n + 1)) / 2;
        const sumY = averages.reduce((a, b) => a + b, 0);
        const sumXY = averages.reduce((sum, y, i) => sum + (i + 1) * y, 0);
        const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const nextTermPrediction = Math.round(slope * (n + 1) + intercept);

        // Determine trend
        const firstAvg = averages[0];
        const lastAvg = averages[averages.length - 1];
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (lastAvg > firstAvg + 5) trend = 'improving';
        else if (lastAvg < firstAvg - 5) trend = 'declining';

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (currentAverage < 40 || trend === 'declining') riskLevel = 'high';
        else if (currentAverage < 60 || failedSubjects > 2) riskLevel = 'medium';

        // Generate recommendations
        const recommendations: string[] = [];
        if (riskLevel === 'high') {
          recommendations.push('Immediate intervention required - schedule parent-teacher meeting');
          recommendations.push('Consider extra lessons or tutoring');
        }
        if (failedSubjects > 0) {
          const weakSubjects = subjectScoresData
            .filter(s => s.score < 40)
            .map(s => s.subject)
            .slice(0, 3);
          recommendations.push(`Focus on weak subjects: ${weakSubjects.join(', ')}`);
        }
        if (trend === 'declining') {
          recommendations.push('Performance is declining - investigate potential causes');
        }
        if (trend === 'improving') {
          recommendations.push('Positive trend detected - maintain current study habits');
        }
        if (recommendations.length === 0) {
          recommendations.push('Maintain good performance with consistent effort');
        }

        setPrediction({
          nextTermPrediction: Math.max(0, Math.min(100, nextTermPrediction)),
          trend,
          riskLevel,
          recommendations,
        });
      } else {
        setPrediction(null);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading student analytics:', error);
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Analytics</h1>
          <p className="text-gray-600 mt-1">Individual performance analysis and predictions</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>

      {/* Student Search */}
      <Card>
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {searchTerm && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                {filteredStudents.length > 0 ? (
                  filteredStudents.slice(0, 10).map(student => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setSelectedStudent(student.id);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.admissionNumber} • {student.className}</p>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-gray-500">No students found</p>
                )}
              </div>
            )}

            {selectedStudentData && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Selected:</strong> {selectedStudentData.name} ({selectedStudentData.admissionNumber})
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedStudent && !loading && (
        <>
          {/* Student Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Current Average</p>
                <p className={`text-2xl font-bold mt-1 ${
                  studentStats.currentAverage >= 75 ? 'text-green-600' :
                  studentStats.currentAverage >= 60 ? 'text-blue-600' :
                  studentStats.currentAverage >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {studentStats.currentAverage}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  High: {studentStats.highestScore}% | Low: {studentStats.lowestScore}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{studentStats.totalSubjects}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-green-600">{studentStats.passedSubjects} passed</span> •
                  <span className="text-red-600 ml-1">{studentStats.failedSubjects} failed</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Prediction</p>
                {prediction ? (
                  <>
                    <p className={`text-2xl font-bold mt-1 ${
                      prediction.nextTermPrediction >= 75 ? 'text-green-600' :
                      prediction.nextTermPrediction >= 60 ? 'text-blue-600' :
                      prediction.nextTermPrediction >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {prediction.nextTermPrediction}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      {prediction.trend === 'improving' && <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />}
                      {prediction.trend === 'declining' && <ArrowTrendingDownIcon className="h-3 w-3 text-red-600" />}
                      {prediction.trend.charAt(0).toUpperCase() + prediction.trend.slice(1)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">Insufficient data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Predictions & Recommendations */}
          {prediction && prediction.riskLevel !== 'low' && (
            <Card className={`border-l-4 ${
              prediction.riskLevel === 'high' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExclamationTriangleIcon className={`h-5 w-5 ${
                    prediction.riskLevel === 'high' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  {prediction.riskLevel === 'high' ? 'High Risk Student' : 'Medium Risk Student'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">Recommendations:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {prediction.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-700">{rec}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {termPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={termPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="term" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={2} name="Average Score" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">No data available</div>
                )}
              </CardContent>
            </Card>

            {/* Subject Performance Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance Profile</CardTitle>
              </CardHeader>
              <CardContent>
                {subjectScores.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={subjectScores.slice(0, 6)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subject Details */}
          <Card>
            <CardHeader>
              <CardTitle>Subject Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectScores.map((subject, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        subject.score >= 75 ? 'bg-green-100 text-green-800' :
                        subject.score >= 60 ? 'bg-blue-100 text-blue-800' :
                        subject.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        subject.score >= 40 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {subject.grade}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          subject.score >= 75 ? 'bg-green-500' :
                          subject.score >= 60 ? 'bg-blue-500' :
                          subject.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${subject.score}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{subject.score}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!selectedStudent && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a student to view detailed analytics</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
