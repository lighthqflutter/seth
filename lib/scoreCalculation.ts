/**
 * Score Calculation System
 * Phase 11: Flexible assessment scoring with 2-10 CAs
 *
 * Handles:
 * - Dynamic CA calculation (2-10 CAs)
 * - Multiple calculation methods (sum, weighted_average, best_of_n)
 * - Grade assignment based on grading config
 * - Score validation
 */

import { AssessmentConfig, GradingConfig } from '@/types';

export interface ScoreInputData {
  assessmentScores: {
    [key: string]: number | null; // e.g., { ca1: 8, ca2: 9, exam: 65 }
  };
}

export interface ScoreCalculationResult {
  totalCa: number; // Sum/average of CA scores
  total: number; // Grand total
  percentage: number; // Percentage score
  maxScore: number; // Maximum possible score
  breakdown: {
    [key: string]: number; // Individual scores
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Calculate total score based on assessment configuration
 */
export function calculateTotalScore(
  scores: ScoreInputData,
  config: AssessmentConfig
): ScoreCalculationResult {
  const { assessmentScores } = scores;
  const { calculationMethod, totalMaxScore } = config;

  let totalCa = 0;
  let total = 0;
  const breakdown: { [key: string]: number } = {};

  switch (calculationMethod) {
    case 'sum':
      // Simple summation of all scores
      totalCa = calculateSumCAs(assessmentScores, config);
      total = totalCa;

      // Add exam if enabled
      if (config.exam.enabled && assessmentScores.exam !== null && assessmentScores.exam !== undefined) {
        total += assessmentScores.exam;
      }

      // Add project if enabled
      if (config.project.enabled && assessmentScores.project !== null && assessmentScores.project !== undefined) {
        total += assessmentScores.project;
      }

      // Add custom assessments
      if (config.customAssessments) {
        for (const custom of config.customAssessments) {
          const scoreKey = custom.id.toLowerCase().replace(/\s+/g, '-');
          if (assessmentScores[scoreKey] !== null && assessmentScores[scoreKey] !== undefined) {
            total += assessmentScores[scoreKey] as number;
          }
        }
      }

      break;

    case 'weighted_average':
      // Weighted average calculation
      totalCa = calculateWeightedCAs(assessmentScores, config);
      total = totalCa;

      // Add weighted exam
      if (config.exam.enabled && config.exam.weight && assessmentScores.exam !== null && assessmentScores.exam !== undefined) {
        const examPercentage = (assessmentScores.exam / config.exam.maxScore) * 100;
        const examWeighted = (examPercentage * config.exam.weight) / 100;
        total += examWeighted;
      }

      // Add weighted project
      if (config.project.enabled && config.project.weight && assessmentScores.project !== null && assessmentScores.project !== undefined) {
        const projectPercentage = (assessmentScores.project / config.project.maxScore) * 100;
        const projectWeighted = (projectPercentage * config.project.weight) / 100;
        total += projectWeighted;
      }

      break;

    case 'best_of_n':
      // Take best N scores from M assessments
      totalCa = calculateBestOfN(assessmentScores, config);
      total = totalCa;

      // Add exam if enabled
      if (config.exam.enabled && assessmentScores.exam !== null && assessmentScores.exam !== undefined) {
        total += assessmentScores.exam;
      }

      break;

    default:
      // Default to sum
      totalCa = calculateSumCAs(assessmentScores, config);
      total = totalCa;

      if (config.exam.enabled && assessmentScores.exam !== null && assessmentScores.exam !== undefined) {
        total += assessmentScores.exam;
      }
  }

  // Calculate percentage
  const percentage = totalMaxScore > 0 ? (total / totalMaxScore) * 100 : 0;

  // Build breakdown
  for (const key in assessmentScores) {
    if (assessmentScores[key] !== null && assessmentScores[key] !== undefined) {
      breakdown[key] = assessmentScores[key] as number;
    }
  }

  return {
    totalCa: Math.round(totalCa * 100) / 100, // Round to 2 decimal places
    total: Math.round(total * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
    maxScore: totalMaxScore,
    breakdown,
  };
}

/**
 * Calculate sum of CA scores
 */
function calculateSumCAs(
  assessmentScores: { [key: string]: number | null },
  config: AssessmentConfig
): number {
  let sum = 0;

  for (const caConfig of config.caConfigs) {
    const scoreKey = caConfig.name.toLowerCase().replace(/\s+/g, '-');
    const score = assessmentScores[scoreKey];

    if (score !== null && score !== undefined) {
      sum += score;
    }
  }

  return sum;
}

/**
 * Calculate weighted average of CA scores
 */
function calculateWeightedCAs(
  assessmentScores: { [key: string]: number | null },
  config: AssessmentConfig
): number {
  let weightedSum = 0;

  for (const caConfig of config.caConfigs) {
    const scoreKey = caConfig.name.toLowerCase().replace(/\s+/g, '-');
    const score = assessmentScores[scoreKey];

    if (score !== null && score !== undefined && caConfig.weight) {
      // Calculate percentage, then apply weight
      const percentage = (score / caConfig.maxScore) * 100;
      const weighted = (percentage * caConfig.weight) / 100;
      weightedSum += weighted;
    }
  }

  return weightedSum;
}

/**
 * Calculate best N scores from M assessments
 */
function calculateBestOfN(
  assessmentScores: { [key: string]: number | null },
  config: AssessmentConfig
): number {
  if (!config.bestOfN) {
    return calculateSumCAs(assessmentScores, config);
  }

  const { take, from } = config.bestOfN;
  const scores: number[] = [];

  for (const caConfig of config.caConfigs) {
    const scoreKey = caConfig.name.toLowerCase().replace(/\s+/g, '-');
    const score = assessmentScores[scoreKey];

    if (score !== null && score !== undefined) {
      scores.push(score);
    }
  }

  // Sort descending and take best N
  scores.sort((a, b) => b - a);
  const bestScores = scores.slice(0, take);

  return bestScores.reduce((sum, score) => sum + score, 0);
}

/**
 * Calculate grade based on percentage and grading config
 */
export function calculateGrade(
  percentage: number,
  gradingConfig: GradingConfig
): string {
  // Find the grade boundary that matches the percentage
  for (const boundary of gradingConfig.gradeBoundaries) {
    if (percentage >= boundary.minScore && percentage <= boundary.maxScore) {
      return boundary.grade;
    }
  }

  // Default to lowest grade if no match found
  return gradingConfig.gradeBoundaries[gradingConfig.gradeBoundaries.length - 1]?.grade || 'F';
}

/**
 * Validate score entry against assessment config
 */
export function validateScoreEntry(
  scores: ScoreInputData,
  config: AssessmentConfig
): ValidationResult {
  const errors: string[] = [];
  const { assessmentScores } = scores;

  // Validate CAs
  for (const caConfig of config.caConfigs) {
    const scoreKey = caConfig.name.toLowerCase().replace(/\s+/g, '-');
    const score = assessmentScores[scoreKey];

    // Check if required field is missing
    if (!caConfig.isOptional && (score === null || score === undefined)) {
      errors.push(`${caConfig.name} is required`);
      continue;
    }

    // Skip validation for null optional fields
    if (score === null || score === undefined) {
      continue;
    }

    // Validate score is a number
    if (typeof score !== 'number' || isNaN(score)) {
      errors.push(`${caConfig.name} must be a valid number`);
      continue;
    }

    // Validate score is not negative
    if (score < 0) {
      errors.push(`${caConfig.name} score cannot be negative`);
      continue;
    }

    // Validate score does not exceed max
    if (score > caConfig.maxScore) {
      errors.push(`${caConfig.name} score (${score}) exceeds maximum (${caConfig.maxScore})`);
    }
  }

  // Validate exam
  if (config.exam.enabled) {
    const examScore = assessmentScores.exam;

    if (examScore === null || examScore === undefined) {
      errors.push('Exam score is required');
    } else {
      if (typeof examScore !== 'number' || isNaN(examScore)) {
        errors.push('Exam score must be a valid number');
      } else {
        if (examScore < 0) {
          errors.push('Exam score cannot be negative');
        }
        if (examScore > config.exam.maxScore) {
          errors.push(`Exam score (${examScore}) exceeds maximum (${config.exam.maxScore})`);
        }
      }
    }
  }

  // Validate project
  if (config.project.enabled && !config.project.isOptional) {
    const projectScore = assessmentScores.project;

    if (projectScore === null || projectScore === undefined) {
      errors.push('Project score is required');
    } else {
      if (typeof projectScore !== 'number' || isNaN(projectScore)) {
        errors.push('Project score must be a valid number');
      } else {
        if (projectScore < 0) {
          errors.push('Project score cannot be negative');
        }
        if (projectScore > config.project.maxScore) {
          errors.push(`Project score (${projectScore}) exceeds maximum (${config.project.maxScore})`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get human-readable label for assessment key
 */
export function getAssessmentLabel(key: string, config: AssessmentConfig): string {
  // Check CAs
  for (const ca of config.caConfigs) {
    if (ca.name.toLowerCase().replace(/\s+/g, '-') === key) {
      return ca.name;
    }
  }

  // Check exam
  if (key === 'exam' && config.exam.enabled) {
    return config.exam.name;
  }

  // Check project
  if (key === 'project' && config.project.enabled) {
    return config.project.name;
  }

  // Check custom assessments
  if (config.customAssessments) {
    for (const custom of config.customAssessments) {
      if (custom.id.toLowerCase().replace(/\s+/g, '-') === key) {
        return custom.name;
      }
    }
  }

  // Default to key itself
  return key;
}
