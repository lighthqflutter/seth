/**
 * Tests for Result Calculation System
 * Phase 12: Aggregate scores across subjects and calculate positions
 */

import {
  calculateTermResult,
  calculateClassPositions,
  generateResultSummary,
  SubjectScore,
  StudentResult,
} from '@/lib/resultCalculation';

describe('Result Calculation System', () => {
  describe('calculateTermResult', () => {
    it('should calculate average across all subjects', () => {
      const scores: SubjectScore[] = [
        { subjectId: 'math', subjectName: 'Mathematics', total: 85, percentage: 85, grade: 'A1', maxScore: 100 },
        { subjectId: 'eng', subjectName: 'English', total: 78, percentage: 78, grade: 'A1', maxScore: 100 },
        { subjectId: 'phy', subjectName: 'Physics', total: 92, percentage: 92, grade: 'A1', maxScore: 100 },
      ];

      const result = calculateTermResult(scores);

      expect(result.totalScore).toBe(255); // 85 + 78 + 92
      expect(result.averageScore).toBeCloseTo(85, 1); // 255 / 3
      expect(result.numberOfSubjects).toBe(3);
      expect(result.subjectsPassed).toBe(3);
      expect(result.subjectsFailed).toBe(0);
    });

    it('should count failed subjects (below 40)', () => {
      const scores: SubjectScore[] = [
        { subjectId: 'math', subjectName: 'Mathematics', total: 85, percentage: 85, grade: 'A1', maxScore: 100 },
        { subjectId: 'eng', subjectName: 'English', total: 35, percentage: 35, grade: 'F9', maxScore: 100 },
        { subjectId: 'phy', subjectName: 'Physics', total: 30, percentage: 30, grade: 'F9', maxScore: 100 },
      ];

      const result = calculateTermResult(scores, { passMark: 40 });

      expect(result.subjectsPassed).toBe(1);
      expect(result.subjectsFailed).toBe(2);
    });

    it('should handle empty scores array', () => {
      const result = calculateTermResult([]);

      expect(result.totalScore).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.numberOfSubjects).toBe(0);
      expect(result.subjectsPassed).toBe(0);
      expect(result.subjectsFailed).toBe(0);
    });

    it('should calculate with different max scores per subject', () => {
      const scores: SubjectScore[] = [
        { subjectId: 'math', subjectName: 'Mathematics', total: 85, percentage: 85, grade: 'A1', maxScore: 100 },
        { subjectId: 'prac', subjectName: 'Practical', total: 40, percentage: 80, grade: 'A1', maxScore: 50 },
      ];

      const result = calculateTermResult(scores);

      // Average should be based on percentage, not raw total
      expect(result.averageScore).toBeCloseTo(82.5, 1); // (85 + 80) / 2
    });

    it('should exclude absent subjects from average', () => {
      const scores: SubjectScore[] = [
        { subjectId: 'math', subjectName: 'Mathematics', total: 85, percentage: 85, grade: 'A1', maxScore: 100, isAbsent: false },
        { subjectId: 'eng', subjectName: 'English', total: 0, percentage: 0, grade: '-', maxScore: 100, isAbsent: true },
        { subjectId: 'phy', subjectName: 'Physics', total: 90, percentage: 90, grade: 'A1', maxScore: 100, isAbsent: false },
      ];

      const result = calculateTermResult(scores);

      expect(result.numberOfSubjects).toBe(2); // Excludes absent
      expect(result.averageScore).toBeCloseTo(87.5, 1); // (85 + 90) / 2
    });
  });

  describe('calculateClassPositions', () => {
    it('should rank students by total score descending', () => {
      const students: StudentResult[] = [
        { studentId: 'student-1', studentName: 'Alice', totalScore: 850, averageScore: 85, numberOfSubjects: 10 },
        { studentId: 'student-2', studentName: 'Bob', totalScore: 920, averageScore: 92, numberOfSubjects: 10 },
        { studentId: 'student-3', studentName: 'Charlie', totalScore: 780, averageScore: 78, numberOfSubjects: 10 },
      ];

      const rankedStudents = calculateClassPositions(students);

      expect(rankedStudents[0].position).toBe(1); // Bob - 920
      expect(rankedStudents[0].studentId).toBe('student-2');

      expect(rankedStudents[1].position).toBe(2); // Alice - 850
      expect(rankedStudents[1].studentId).toBe('student-1');

      expect(rankedStudents[2].position).toBe(3); // Charlie - 780
      expect(rankedStudents[2].studentId).toBe('student-3');
    });

    it('should handle tied positions', () => {
      const students: StudentResult[] = [
        { studentId: 'student-1', studentName: 'Alice', totalScore: 850, averageScore: 85, numberOfSubjects: 10 },
        { studentId: 'student-2', studentName: 'Bob', totalScore: 850, averageScore: 85, numberOfSubjects: 10 },
        { studentId: 'student-3', studentName: 'Charlie', totalScore: 780, averageScore: 78, numberOfSubjects: 10 },
      ];

      const rankedStudents = calculateClassPositions(students);

      // Both Alice and Bob should be position 1
      expect(rankedStudents[0].position).toBe(1);
      expect(rankedStudents[1].position).toBe(1);

      // Charlie should be position 3 (not 2, because 2 people tied for 1st)
      expect(rankedStudents[2].position).toBe(3);
    });

    it('should handle single student', () => {
      const students: StudentResult[] = [
        { studentId: 'student-1', studentName: 'Alice', totalScore: 850, averageScore: 85, numberOfSubjects: 10 },
      ];

      const rankedStudents = calculateClassPositions(students);

      expect(rankedStudents[0].position).toBe(1);
    });

    it('should handle empty array', () => {
      const rankedStudents = calculateClassPositions([]);

      expect(rankedStudents).toEqual([]);
    });

    it('should use average as tiebreaker if same total', () => {
      const students: StudentResult[] = [
        { studentId: 'student-1', studentName: 'Alice', totalScore: 850, averageScore: 85.5, numberOfSubjects: 10 },
        { studentId: 'student-2', studentName: 'Bob', totalScore: 850, averageScore: 85.0, numberOfSubjects: 10 },
      ];

      const rankedStudents = calculateClassPositions(students);

      // Alice has higher average, should be ranked higher
      expect(rankedStudents[0].studentId).toBe('student-1');
      expect(rankedStudents[1].studentId).toBe('student-2');
    });
  });

  describe('generateResultSummary', () => {
    it('should generate complete result summary', () => {
      const scores: SubjectScore[] = [
        { subjectId: 'math', subjectName: 'Mathematics', total: 85, percentage: 85, grade: 'A1', maxScore: 100 },
        { subjectId: 'eng', subjectName: 'English', total: 78, percentage: 78, grade: 'A1', maxScore: 100 },
        { subjectId: 'phy', subjectName: 'Physics', total: 35, percentage: 35, grade: 'F9', maxScore: 100 },
      ];

      const summary = generateResultSummary(scores, {
        position: 5,
        classSize: 30,
        passMark: 40,
      });

      expect(summary.totalScore).toBe(198);
      expect(summary.averageScore).toBeCloseTo(66, 1);
      expect(summary.position).toBe(5);
      expect(summary.classSize).toBe(30);
      expect(summary.subjectsPassed).toBe(2);
      expect(summary.subjectsFailed).toBe(1);
      expect(summary.overallGrade).toBeDefined();
    });

    it('should determine overall grade based on average', () => {
      const excellentScores: SubjectScore[] = [
        { subjectId: 'math', subjectName: 'Mathematics', total: 90, percentage: 90, grade: 'A1', maxScore: 100 },
        { subjectId: 'eng', subjectName: 'English', total: 88, percentage: 88, grade: 'A1', maxScore: 100 },
      ];

      const summary = generateResultSummary(excellentScores, {
        position: 1,
        classSize: 30,
        gradeBoundaries: [
          { grade: 'A1', minScore: 75, maxScore: 100 },
          { grade: 'B2', minScore: 70, maxScore: 74 },
          { grade: 'F9', minScore: 0, maxScore: 39 },
        ],
      });

      expect(summary.overallGrade).toBe('A1');
    });

    it('should provide performance remarks', () => {
      const scores: SubjectScore[] = [
        { subjectId: 'math', subjectName: 'Mathematics', total: 90, percentage: 90, grade: 'A1', maxScore: 100 },
        { subjectId: 'eng', subjectName: 'English', total: 88, percentage: 88, grade: 'A1', maxScore: 100 },
      ];

      const summary = generateResultSummary(scores, {
        position: 1,
        classSize: 30,
      });

      expect(summary.remark).toBeDefined();
      expect(summary.remark).toContain('Excellent');
    });

    it('should provide different remarks for different performance levels', () => {
      const poorScores: SubjectScore[] = [
        { subjectId: 'math', subjectName: 'Mathematics', total: 35, percentage: 35, grade: 'F9', maxScore: 100 },
        { subjectId: 'eng', subjectName: 'English', total: 30, percentage: 30, grade: 'F9', maxScore: 100 },
      ];

      const summary = generateResultSummary(poorScores, {
        position: 30,
        classSize: 30,
      });

      expect(summary.remark).toContain('must improve');
    });
  });
});
