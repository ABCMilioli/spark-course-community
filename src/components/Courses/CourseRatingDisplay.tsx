import React from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CourseRatingStats } from '@/types';

interface CourseRatingDisplayProps {
  rating: number;
  ratingCount?: number;
  ratingStats?: CourseRatingStats;
  showDistribution?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CourseRatingDisplay({ 
  rating, 
  ratingCount, 
  ratingStats, 
  showDistribution = false,
  size = 'md' 
}: CourseRatingDisplayProps) {
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const starSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star}
            className={`${starSize} ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'fill-gray-200 text-gray-200'
            }`} 
          />
        ))}
      </div>
    );
  };

  const renderRatingDistribution = () => {
    if (!ratingStats) return null;

    const maxCount = Math.max(
      ratingStats.five_star_count,
      ratingStats.four_star_count,
      ratingStats.three_star_count,
      ratingStats.two_star_count,
      ratingStats.one_star_count
    );

    return (
      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = ratingStats[`${stars === 5 ? 'five' : stars === 4 ? 'four' : stars === 3 ? 'three' : stars === 2 ? 'two' : 'one'}_star_count` as keyof CourseRatingStats] as number;
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          return (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-6">{stars}★</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-6">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {renderStars(rating, size)}
        <div className="flex items-center gap-1">
          <span className={`font-semibold ${
            size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
          }`}>
            {typeof rating === 'number' ? rating.toFixed(1) : '0.0'}
          </span>
          {ratingCount && (
            <span className={`text-muted-foreground ${
              size === 'sm' ? 'text-xs' : 'text-sm'
            }`}>
              ({ratingCount})
            </span>
          )}
        </div>
      </div>

      {ratingStats && ratingStats.satisfaction_percentage > 0 && (
        <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs">
          {ratingStats.satisfaction_percentage}% de satisfação
        </Badge>
      )}

      {showDistribution && ratingStats && (
        <div className="pt-2 border-t">
          {renderRatingDistribution()}
        </div>
      )}
    </div>
  );
} 