/**
 * Skills & Conduct Configuration (Phase 19)
 * Affective domain assessments - behavior, social skills, psychomotor skills
 */

export type SkillScale = '1-5' | 'A-E' | 'Excellent-Poor';
export type SkillCategory = 'behavioral' | 'social' | 'psychomotor';

export interface SkillRating {
  id: string;
  name: string;
  description?: string;
  scale: SkillScale;
  category: SkillCategory;
  order: number;
}

export interface StudentSkillRating {
  id: string;
  studentId: string;
  termId: string;
  tenantId: string;
  skillId: string;
  rating: string; // "5", "A", "Excellent", etc.
  comment?: string;
  ratedBy: string; // Teacher/Admin UID
  ratedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default skill ratings for Nigerian schools
 */
export const DEFAULT_SKILLS: SkillRating[] = [
  // Behavioral Skills
  {
    id: 'punctuality',
    name: 'Punctuality',
    description: 'Arrives on time for school and classes',
    scale: '1-5',
    category: 'behavioral',
    order: 1,
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Regular attendance and presence in class',
    scale: '1-5',
    category: 'behavioral',
    order: 2,
  },
  {
    id: 'neatness',
    name: 'Neatness',
    description: 'Personal hygiene and tidiness',
    scale: '1-5',
    category: 'behavioral',
    order: 3,
  },
  {
    id: 'politeness',
    name: 'Politeness',
    description: 'Respectful and courteous behavior',
    scale: '1-5',
    category: 'behavioral',
    order: 4,
  },
  {
    id: 'honesty',
    name: 'Honesty',
    description: 'Truthfulness and integrity',
    scale: '1-5',
    category: 'behavioral',
    order: 5,
  },
  {
    id: 'self-control',
    name: 'Self Control',
    description: 'Emotional regulation and discipline',
    scale: '1-5',
    category: 'behavioral',
    order: 6,
  },

  // Social Skills
  {
    id: 'cooperation',
    name: 'Cooperation',
    description: 'Works well with others',
    scale: '1-5',
    category: 'social',
    order: 7,
  },
  {
    id: 'leadership',
    name: 'Leadership',
    description: 'Takes initiative and guides others',
    scale: '1-5',
    category: 'social',
    order: 8,
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Expresses ideas clearly',
    scale: '1-5',
    category: 'social',
    order: 9,
  },
  {
    id: 'attentiveness',
    name: 'Attentiveness',
    description: 'Pays attention in class',
    scale: '1-5',
    category: 'social',
    order: 10,
  },

  // Psychomotor Skills
  {
    id: 'handwriting',
    name: 'Handwriting',
    description: 'Legibility and neatness of writing',
    scale: '1-5',
    category: 'psychomotor',
    order: 11,
  },
  {
    id: 'sports',
    name: 'Sports & Games',
    description: 'Participation and skill in physical activities',
    scale: '1-5',
    category: 'psychomotor',
    order: 12,
  },
  {
    id: 'arts',
    name: 'Arts & Crafts',
    description: 'Creative and artistic abilities',
    scale: '1-5',
    category: 'psychomotor',
    order: 13,
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Musical abilities and participation',
    scale: '1-5',
    category: 'psychomotor',
    order: 14,
  },
];

/**
 * Scale definitions
 */
export const SCALE_DEFINITIONS = {
  '1-5': [
    { value: '5', label: '5 - Excellent', description: 'Outstanding performance' },
    { value: '4', label: '4 - Very Good', description: 'Above average' },
    { value: '3', label: '3 - Good', description: 'Satisfactory' },
    { value: '2', label: '2 - Fair', description: 'Needs improvement' },
    { value: '1', label: '1 - Poor', description: 'Significant improvement needed' },
  ],
  'A-E': [
    { value: 'A', label: 'A - Excellent', description: 'Outstanding' },
    { value: 'B', label: 'B - Very Good', description: 'Above average' },
    { value: 'C', label: 'C - Good', description: 'Satisfactory' },
    { value: 'D', label: 'D - Fair', description: 'Needs improvement' },
    { value: 'E', label: 'E - Poor', description: 'Significant improvement needed' },
  ],
  'Excellent-Poor': [
    { value: 'Excellent', label: 'Excellent', description: 'Outstanding' },
    { value: 'VeryGood', label: 'Very Good', description: 'Above average' },
    { value: 'Good', label: 'Good', description: 'Satisfactory' },
    { value: 'Fair', label: 'Fair', description: 'Needs improvement' },
    { value: 'Poor', label: 'Poor', description: 'Significant improvement needed' },
  ],
};

/**
 * Get skill rating color
 */
export function getSkillRatingColor(rating: string, scale: SkillScale): string {
  const numericRatings = ['5', '4'];
  const letterRatings = ['A', 'B'];
  const wordRatings = ['Excellent', 'VeryGood'];

  if (numericRatings.includes(rating)) return 'text-green-600';
  if (letterRatings.includes(rating)) return 'text-green-600';
  if (wordRatings.includes(rating)) return 'text-green-600';

  if (rating === '3' || rating === 'C' || rating === 'Good') return 'text-blue-600';
  if (rating === '2' || rating === 'D' || rating === 'Fair') return 'text-orange-600';
  if (rating === '1' || rating === 'E' || rating === 'Poor') return 'text-red-600';

  return 'text-gray-600';
}

/**
 * Get skill rating badge color
 */
export function getSkillRatingBadgeColor(rating: string, scale: SkillScale): string {
  const numericRatings = ['5', '4'];
  const letterRatings = ['A', 'B'];
  const wordRatings = ['Excellent', 'VeryGood'];

  if (numericRatings.includes(rating)) return 'bg-green-100 text-green-800';
  if (letterRatings.includes(rating)) return 'bg-green-100 text-green-800';
  if (wordRatings.includes(rating)) return 'bg-green-100 text-green-800';

  if (rating === '3' || rating === 'C' || rating === 'Good') return 'bg-blue-100 text-blue-800';
  if (rating === '2' || rating === 'D' || rating === 'Fair') return 'bg-orange-100 text-orange-800';
  if (rating === '1' || rating === 'E' || rating === 'Poor') return 'bg-red-100 text-red-800';

  return 'bg-gray-100 text-gray-800';
}

/**
 * Calculate skill summary
 */
export interface SkillSummary {
  totalSkills: number;
  excellentCount: number;
  goodCount: number;
  needsImprovementCount: number;
  averageRating: number; // For numeric scales only
  strengths: string[]; // Skill names with top ratings
  areasForImprovement: string[]; // Skill names with low ratings
}

export function calculateSkillSummary(
  ratings: Array<{ skillId: string; skillName: string; rating: string; scale: SkillScale }>,
  skills: SkillRating[]
): SkillSummary {
  if (ratings.length === 0) {
    return {
      totalSkills: 0,
      excellentCount: 0,
      goodCount: 0,
      needsImprovementCount: 0,
      averageRating: 0,
      strengths: [],
      areasForImprovement: [],
    };
  }

  let excellentCount = 0;
  let goodCount = 0;
  let needsImprovementCount = 0;
  let numericSum = 0;
  let numericCount = 0;
  const strengths: string[] = [];
  const areasForImprovement: string[] = [];

  ratings.forEach(({ skillName, rating, scale }) => {
    // Count categories
    if (['5', '4', 'A', 'B', 'Excellent', 'VeryGood'].includes(rating)) {
      excellentCount++;
      strengths.push(skillName);
    } else if (['3', 'C', 'Good'].includes(rating)) {
      goodCount++;
    } else if (['2', '1', 'D', 'E', 'Fair', 'Poor'].includes(rating)) {
      needsImprovementCount++;
      areasForImprovement.push(skillName);
    }

    // Calculate numeric average (for 1-5 scale)
    if (scale === '1-5') {
      const numRating = parseInt(rating);
      if (!isNaN(numRating)) {
        numericSum += numRating;
        numericCount++;
      }
    }
  });

  return {
    totalSkills: ratings.length,
    excellentCount,
    goodCount,
    needsImprovementCount,
    averageRating: numericCount > 0 ? Math.round((numericSum / numericCount) * 10) / 10 : 0,
    strengths: strengths.slice(0, 3), // Top 3
    areasForImprovement: areasForImprovement.slice(0, 3), // Top 3
  };
}

/**
 * Validate skill rating
 */
export function validateSkillRating(rating: string, scale: SkillScale): boolean {
  const validRatings = SCALE_DEFINITIONS[scale].map(s => s.value);
  return validRatings.includes(rating);
}

/**
 * Get skill category label
 */
export function getSkillCategoryLabel(category: SkillCategory): string {
  const labels: Record<SkillCategory, string> = {
    behavioral: 'Behavioral Skills',
    social: 'Social Skills',
    psychomotor: 'Psychomotor Skills',
  };
  return labels[category];
}
