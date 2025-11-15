/**
 * Tests for Score Calculation System
 * Phase 11: Flexible assessment scoring with 2-10 CAs
 */

import {
  calculateTotalScore,
  calculateGrade,
  validateScoreEntry,
  ScoreInputData,
  ScoreCalculationResult,
} from '@/lib/scoreCalculation';
import { AssessmentConfig, GradingConfig } from '@/types';

describe('Score Calculation System', () => {
  // Standard Nigerian 3 CA + Exam setup
  const standardAssessmentConfig: AssessmentConfig = {
    numberOfCAs: 3,
    caConfigs: [
      { name: 'CA1', maxScore: 10, isOptional: false },
      { name: 'CA2', maxScore: 10, isOptional: false },
      { name: 'CA3', maxScore: 10, isOptional: false },
    ],
    exam: { enabled: true, name: 'Exam', maxScore: 70 },
    project: { enabled: false, name: 'Project', maxScore: 0, isOptional: true },
    calculationMethod: 'sum',
    totalMaxScore: 100,
  };

  const standardGradingConfig: GradingConfig = {
    system: 'letter',
    gradeBoundaries: [
      { grade: 'A1', minScore: 75, maxScore: 100, description: 'Excellent' },
      { grade: 'B2', minScore: 70, maxScore: 74, description: 'Very Good' },
      { grade: 'C4', minScore: 60, maxScore: 69, description: 'Good' },
      { grade: 'C6', minScore: 50, maxScore: 59, description: 'Credit' },
      { grade: 'D7', minScore: 45, maxScore: 49, description: 'Pass' },
      { grade: 'E8', minScore: 40, maxScore: 44, description: 'Pass' },
      { grade: 'F9', minScore: 0, maxScore: 39, description: 'Fail' },
    ],
    passMark: 40,
    displayPreference: {
      showPercentage: true,
      showGrade: true,
      showGPA: false,
      showPosition: true,
      showRemark: true,
    },
  };

  describe('calculateTotalScore', () => {
    it('should calculate total with sum method (3 CAs + Exam)', () => {
      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8,
          ca2: 9,
          ca3: 10,
          exam: 65,
        },
      };

      const result = calculateTotalScore(scores, standardAssessmentConfig);

      expect(result.totalCa).toBe(27); // 8 + 9 + 10
      expect(result.total).toBe(92); // 27 + 65
      expect(result.percentage).toBe(92);
      expect(result.maxScore).toBe(100);
    });

    it('should handle 5 CAs + Exam', () => {
      const config: AssessmentConfig = {
        numberOfCAs: 5,
        caConfigs: [
          { name: 'CA1', maxScore: 10, isOptional: false },
          { name: 'CA2', maxScore: 10, isOptional: false },
          { name: 'CA3', maxScore: 10, isOptional: false },
          { name: 'CA4', maxScore: 10, isOptional: false },
          { name: 'CA5', maxScore: 10, isOptional: false },
        ],
        exam: { enabled: true, name: 'Exam', maxScore: 50 },
        project: { enabled: false, name: 'Project', maxScore: 0, isOptional: true },
        calculationMethod: 'sum',
        totalMaxScore: 100,
      };

      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8,
          ca2: 9,
          ca3: 10,
          ca4: 7,
          ca5: 6,
          exam: 45,
        },
      };

      const result = calculateTotalScore(scores, config);

      expect(result.totalCa).toBe(40); // 8+9+10+7+6
      expect(result.total).toBe(85); // 40 + 45
      expect(result.percentage).toBe(85);
    });

    it('should handle 2 CAs only (no exam)', () => {
      const config: AssessmentConfig = {
        numberOfCAs: 2,
        caConfigs: [
          { name: 'Test 1', maxScore: 50, isOptional: false },
          { name: 'Test 2', maxScore: 50, isOptional: false },
        ],
        exam: { enabled: false, name: 'Exam', maxScore: 0 },
        project: { enabled: false, name: 'Project', maxScore: 0, isOptional: true },
        calculationMethod: 'sum',
        totalMaxScore: 100,
      };

      const scores: ScoreInputData = {
        assessmentScores: {
          'test-1': 40,
          'test-2': 45,
        },
      };

      const result = calculateTotalScore(scores, config);

      expect(result.totalCa).toBe(85);
      expect(result.total).toBe(85);
      expect(result.percentage).toBe(85);
    });

    it('should handle weighted average calculation', () => {
      const config: AssessmentConfig = {
        numberOfCAs: 2,
        caConfigs: [
          { name: 'CA1', maxScore: 10, weight: 30, isOptional: false },
          { name: 'CA2', maxScore: 10, weight: 20, isOptional: false },
        ],
        exam: { enabled: true, name: 'Exam', maxScore: 100, weight: 50 },
        project: { enabled: false, name: 'Project', maxScore: 0, isOptional: true },
        calculationMethod: 'weighted_average',
        totalMaxScore: 100,
      };

      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8, // 8/10 = 80% → 80% of 30 = 24
          ca2: 10, // 10/10 = 100% → 100% of 20 = 20
          exam: 60, // 60/100 = 60% → 60% of 50 = 30
        },
      };

      const result = calculateTotalScore(scores, config);

      expect(result.total).toBe(74); // 24 + 20 + 30
      expect(result.percentage).toBe(74);
    });

    it('should handle optional fields with null values', () => {
      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8,
          ca2: 9,
          ca3: null, // Optional, not entered
          exam: 65,
        },
      };

      const result = calculateTotalScore(scores, standardAssessmentConfig);

      expect(result.totalCa).toBe(17); // 8 + 9 (ca3 ignored)
      expect(result.total).toBe(82); // 17 + 65
    });

    it('should handle project scores when enabled', () => {
      const config: AssessmentConfig = {
        ...standardAssessmentConfig,
        project: { enabled: true, name: 'Project', maxScore: 10, isOptional: false },
        totalMaxScore: 110,
      };

      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8,
          ca2: 9,
          ca3: 10,
          exam: 65,
          project: 9,
        },
      };

      const result = calculateTotalScore(scores, config);

      expect(result.total).toBe(101); // 8+9+10+65+9
      expect(result.percentage).toBeCloseTo(91.82, 1); // (101/110) * 100
    });
  });

  describe('calculateGrade', () => {
    it('should assign A1 grade for 75-100', () => {
      const grade = calculateGrade(85, standardGradingConfig);
      expect(grade).toBe('A1');
    });

    it('should assign B2 grade for 70-74', () => {
      const grade = calculateGrade(72, standardGradingConfig);
      expect(grade).toBe('B2');
    });

    it('should assign C4 grade for 60-69', () => {
      const grade = calculateGrade(65, standardGradingConfig);
      expect(grade).toBe('C4');
    });

    it('should assign F9 grade for below 40', () => {
      const grade = calculateGrade(35, standardGradingConfig);
      expect(grade).toBe('F9');
    });

    it('should handle edge cases (boundary values)', () => {
      expect(calculateGrade(75, standardGradingConfig)).toBe('A1'); // Min A1
      expect(calculateGrade(74, standardGradingConfig)).toBe('B2'); // Max B2
      expect(calculateGrade(40, standardGradingConfig)).toBe('E8'); // Min pass
      expect(calculateGrade(39, standardGradingConfig)).toBe('F9'); // Max fail
    });

    it('should handle 100% score', () => {
      const grade = calculateGrade(100, standardGradingConfig);
      expect(grade).toBe('A1');
    });

    it('should handle 0% score', () => {
      const grade = calculateGrade(0, standardGradingConfig);
      expect(grade).toBe('F9');
    });
  });

  describe('validateScoreEntry', () => {
    it('should validate scores within max limits', () => {
      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8,
          ca2: 9,
          ca3: 10,
          exam: 65,
        },
      };

      const result = validateScoreEntry(scores, standardAssessmentConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject scores exceeding max', () => {
      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 15, // Max is 10
          ca2: 9,
          ca3: 10,
          exam: 65,
        },
      };

      const result = validateScoreEntry(scores, standardAssessmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CA1 score (15) exceeds maximum (10)');
    });

    it('should reject negative scores', () => {
      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: -5,
          ca2: 9,
          ca3: 10,
          exam: 65,
        },
      };

      const result = validateScoreEntry(scores, standardAssessmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CA1 score cannot be negative');
    });

    it('should require non-optional fields', () => {
      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8,
          ca2: 9,
          // ca3 missing but required
          exam: 65,
        },
      };

      const result = validateScoreEntry(scores, standardAssessmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should allow null for optional fields', () => {
      const config: AssessmentConfig = {
        ...standardAssessmentConfig,
        caConfigs: [
          { name: 'CA1', maxScore: 10, isOptional: false },
          { name: 'CA2', maxScore: 10, isOptional: false },
          { name: 'CA3', maxScore: 10, isOptional: true }, // Optional
        ],
      };

      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8,
          ca2: 9,
          ca3: null, // Optional, null is ok
          exam: 65,
        },
      };

      const result = validateScoreEntry(scores, config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate exam score if enabled', () => {
      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8,
          ca2: 9,
          ca3: 10,
          exam: 75, // Max is 70
        },
      };

      const result = validateScoreEntry(scores, standardAssessmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Exam score (75) exceeds maximum (70)');
    });

    it('should handle decimal scores', () => {
      const scores: ScoreInputData = {
        assessmentScores: {
          ca1: 8.5,
          ca2: 9.5,
          ca3: 10,
          exam: 65.5,
        },
      };

      const result = validateScoreEntry(scores, standardAssessmentConfig);

      expect(result.valid).toBe(true);
    });
  });
});
