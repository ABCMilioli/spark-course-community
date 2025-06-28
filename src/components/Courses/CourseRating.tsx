import React, { useState, useEffect } from 'react';
import { Star, StarOff, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { CourseRating as CourseRatingType, CourseRatingStats, CreateRatingData } from '@/types';

interface CourseRatingProps {
  courseId: string;
  onRatingChange?: () => void;
}

export function CourseRating({ courseId, onRatingChange }: CourseRatingProps) {
  const [userRating, setUserRating] = useState<CourseRatingType | null>(null);
  const [ratingStats, setRatingStats] = useState<CourseRatingStats | null>(null);
  const [allRatings, setAllRatings] = useState<CourseRatingType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const { toast } = useToast();

  // Buscar dados de avaliação
  const fetchRatingData = async () => {
    try {
      // Buscar token do localStorage ou contexto de auth
      const token = localStorage.getItem('token');
      if (!token) return;

      // Buscar avaliação do usuário atual
      const userRatingResponse = await fetch(`/api/courses/${courseId}/my-rating`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (userRatingResponse.ok) {
        const userRatingData = await userRatingResponse.json();
        setUserRating(userRatingData);
        setReviewText(userRatingData?.review || '');
      }

      // Buscar estatísticas
      const statsResponse = await fetch(`/api/courses/${courseId}/rating-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setRatingStats(statsData);
      }

      // Buscar todas as avaliações
      const ratingsResponse = await fetch(`/api/courses/${courseId}/ratings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ratingsResponse.ok) {
        const ratingsData = await ratingsResponse.json();
        setAllRatings(ratingsData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de avaliação:', error);
    }
  };

  useEffect(() => {
    fetchRatingData();
  }, [courseId]);

  // Enviar avaliação
  const submitRating = async (rating: number) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para avaliar.",
          variant: "destructive"
        });
        return;
      }

      const ratingData: CreateRatingData = {
        course_id: courseId,
        rating,
        review: reviewText.trim() || undefined
      };

      const response = await fetch(`/api/courses/${courseId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(ratingData)
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Avaliação enviada com sucesso!",
        });
        setShowReviewForm(false);
        fetchRatingData();
        onRatingChange?.();
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.error || "Erro ao enviar avaliação.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar avaliação.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deletar avaliação
  const deleteRating = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/courses/${courseId}/rate`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Avaliação removida com sucesso!",
        });
        setUserRating(null);
        setReviewText('');
        setShowReviewForm(false);
        fetchRatingData();
        onRatingChange?.();
      }
    } catch (error) {
      console.error('Erro ao deletar avaliação:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover avaliação.",
        variant: "destructive"
      });
    }
  };

  // Renderizar estrelas
  const renderStars = (rating: number, interactive = false, onStarClick?: (star: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = interactive ? star <= hoveredStar : star <= rating;
          const isUserRating = userRating && star <= userRating.rating;
          
          return (
            <button
              key={star}
              type={interactive ? "button" : undefined}
              onClick={interactive ? () => onStarClick?.(star) : undefined}
              onMouseEnter={interactive ? () => setHoveredStar(star) : undefined}
              onMouseLeave={interactive ? () => setHoveredStar(0) : undefined}
              disabled={!interactive || isSubmitting}
              className={`transition-colors ${
                interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
              }`}
            >
              {isFilled ? (
                <Star className={`w-5 h-5 ${
                  isUserRating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'
                }`} />
              ) : (
                <StarOff className="w-5 h-5 text-gray-300" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Renderizar barra de distribuição de estrelas
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
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = ratingStats[`${stars === 5 ? 'five' : stars === 4 ? 'four' : stars === 3 ? 'three' : stars === 2 ? 'two' : 'one'}_star_count` as keyof CourseRatingStats] as number;
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          return (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-8">{stars}★</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 w-8">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Seção de Avaliação do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Avaliar este curso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!userRating ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Clique nas estrelas para avaliar:</p>
                {renderStars(0, true, (star) => {
                  submitRating(star);
                })}
              </div>
              
              {showReviewForm && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Deixe um comentário sobre o curso (opcional)..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => submitRating(userRating?.rating || 0)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowReviewForm(false);
                        setUserRating(null);
                        setReviewText('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sua avaliação:</p>
                  {renderStars(userRating.rating)}
                  {userRating.review && (
                    <p className="text-sm text-gray-700 mt-2 italic">"{userRating.review}"</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={deleteRating}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas de Avaliação */}
      {ratingStats && (
        <Card>
          <CardHeader>
            <CardTitle>Avaliações do Curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {typeof ratingStats.average_rating === 'number' ? ratingStats.average_rating.toFixed(1) : '0.0'}
                </div>
                <div className="text-sm text-gray-600">
                  {renderStars(Math.round(ratingStats.average_rating || 0))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {ratingStats.total_ratings} avaliações
                </div>
              </div>
              
              <div className="flex-1">
                {renderRatingDistribution()}
              </div>
            </div>
            
            {ratingStats.satisfaction_percentage > 0 && (
              <div className="pt-2 border-t">
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  {ratingStats.satisfaction_percentage}% de satisfação
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Avaliações */}
      {allRatings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comentários dos Alunos ({allRatings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allRatings.map((rating) => (
                <div key={rating.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={rating.user_avatar} />
                      <AvatarFallback>
                        {rating.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{rating.user_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {rating.user_role}
                        </Badge>
                      </div>
                      
                      {renderStars(rating.rating)}
                      
                      {rating.review && (
                        <p className="text-sm text-gray-700 mt-2">{rating.review}</p>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(rating.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 