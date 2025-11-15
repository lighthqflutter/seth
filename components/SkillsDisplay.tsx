/**
 * Skills Display Component (Phase 19)
 * Shows student's skill/conduct ratings
 */

import { Card, CardContent } from './ui/card';
import {
  DEFAULT_SKILLS,
  SkillRating,
  getSkillRatingBadgeColor,
  getSkillCategoryLabel,
  calculateSkillSummary,
} from '@/lib/skillsConfig';

interface SkillRatingData {
  skillId: string;
  rating: string;
}

interface SkillsDisplayProps {
  ratings: SkillRatingData[];
  showSummary?: boolean;
}

export function SkillsDisplay({ ratings, showSummary = true }: SkillsDisplayProps) {
  // Use default skills (future: fetch from tenant config)
  const skills = DEFAULT_SKILLS;

  // Map ratings to include skill details
  const ratingsWithDetails = ratings.map(r => {
    const skill = skills.find(s => s.id === r.skillId);
    return {
      skillId: r.skillId,
      skillName: skill?.name || 'Unknown',
      rating: r.rating,
      scale: skill?.scale || '1-5',
      category: skill?.category || 'behavioral',
    };
  });

  // Group by category
  const ratingsByCategory = ratingsWithDetails.reduce((acc, rating) => {
    const category = rating.category as string;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(rating);
    return acc;
  }, {} as Record<string, typeof ratingsWithDetails>);

  // Calculate summary
  const summary = showSummary ? calculateSkillSummary(ratingsWithDetails, skills) : null;

  if (ratings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No skill ratings available for this term</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {showSummary && summary && summary.totalSkills > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Skills</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalSkills}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Excellent/Good</p>
                <p className="text-2xl font-bold text-green-600">{summary.excellentCount}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Satisfactory</p>
                <p className="text-2xl font-bold text-blue-600">{summary.goodCount}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Needs Work</p>
                <p className="text-2xl font-bold text-orange-600">{summary.needsImprovementCount}</p>
              </div>
            </div>

            {summary.averageRating > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Average Rating:</span>{' '}
                  <span className="text-lg font-bold text-blue-600">{summary.averageRating}</span> / 5
                </p>
              </div>
            )}

            {summary.strengths.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Strengths:</p>
                <div className="flex flex-wrap gap-2">
                  {summary.strengths.map((strength, index) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.areasForImprovement.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Areas for Improvement:</p>
                <div className="flex flex-wrap gap-2">
                  {summary.areasForImprovement.map((area, index) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded-full"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skills by Category */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills & Conduct Ratings</h3>
          <div className="space-y-6">
            {Object.entries(ratingsByCategory).map(([category, categoryRatings]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 bg-gray-100 px-3 py-2 rounded">
                  {getSkillCategoryLabel(category as any)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryRatings.map((rating, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">{rating.skillName}</span>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getSkillRatingBadgeColor(rating.rating, rating.scale)}`}>
                        {rating.rating}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
