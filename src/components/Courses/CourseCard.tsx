import { Play, Clock, Users, Star, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CourseRatingDisplay } from "./CourseRatingDisplay";
import { CourseWithInstructor } from "@/types";
import { useNavigate } from 'react-router-dom';
import { isPaidCourse, formatPrice } from '@/lib/price';

interface CourseCardProps {
  course: CourseWithInstructor & { progressPercentage?: number; total_ratings?: number };
  onPlay?: (courseId: string) => void;
  showProgress?: boolean;
}

export function CourseCard({ course, onPlay, showProgress = false }: CourseCardProps) {
  const navigate = useNavigate();

  const handlePlay = () => {
    if (isPaidCourse(course.price)) {
      navigate(`/payment/${course.id}`);
    } else {
      onPlay?.(course.id);
    }
  };

  const instructor = course.instructor || { name: course.instructor_name, avatar_url: course.instructor_avatar };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'Duração não informada';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 group animate-fade-in overflow-hidden">
      <div className="relative">
        <img 
          src={course.thumbnail_url || '/placeholder.svg'} 
          alt={course.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button 
            size="lg" 
            onClick={handlePlay}
            className="gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
          >
            <Play className="w-5 h-5" />
            {showProgress && course.progressPercentage ? 'Continuar' : 'Assistir'}
          </Button>
        </div>
        
        {/* Level Badge */}
        <Badge 
          className="absolute top-3 left-3"
          variant={course.level === 'Iniciante' ? 'secondary' : 
                   course.level === 'Intermediário' ? 'default' : 'destructive'}
        >
          {course.level}
        </Badge>

        {/* Duration */}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {course.total_duration ? formatDuration(course.total_duration) : course.duration || 'N/A'}
        </div>
      </div>

      <CardHeader className="pb-3">
        <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {course.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Instructor */}
        {instructor && (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={instructor.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{instructor.name?.[0] || 'I'}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{instructor.name}</span>
          </div>
        )}

        {/* Progress (if enrolled) */}
        {showProgress && course.progressPercentage !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{course.progressPercentage}%</span>
            </div>
            <Progress value={course.progressPercentage} className="h-2" />
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.enrolled_students_count || course.students_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <CourseRatingDisplay 
                rating={typeof course.rating === 'number' ? course.rating : 0}
                ratingCount={course.total_ratings}
                size="sm"
              />
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{course.total_lessons || 0}</span>
            </div>
          </div>
          
          {!showProgress && (
            <div className="flex items-center gap-1 font-semibold text-primary">
              <span>{formatPrice(course.price)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {course.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
