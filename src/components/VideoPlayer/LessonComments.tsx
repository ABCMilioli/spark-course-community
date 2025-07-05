import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Heart, Reply } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { LessonComment, CreateCommentData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';

interface LessonCommentsProps {
  lessonId: string;
}

export function LessonComments({ lessonId }: LessonCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['lesson-comments', lessonId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/lessons/${lessonId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Dados dos comentários carregados:', data);
      return data as LessonComment[];
    },
    enabled: !!lessonId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData: CreateCommentData) => {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/lessons/${lessonId}/comments`, commentData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] });
      setNewComment('');
      toast.success('Comentário adicionado!');
    },
    onError: () => {
      toast.error('Erro ao adicionar comentário');
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      console.log('Iniciando mutation de like para comentário:', commentId);
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/comments/${commentId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Resposta da API:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Like realizado com sucesso, invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] });
    },
    onError: (error) => {
      console.error('Erro na mutation de like:', error);
      toast.error('Erro ao curtir comentário');
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    createCommentMutation.mutate({
      lesson_id: lessonId,
      content: newComment.trim(),
    });
  };

  const handleLikeComment = (commentId: string) => {
    console.log('Clicou no like do comentário:', commentId);
    likeCommentMutation.mutate(commentId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comentários</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Carregando comentários...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comentários ({comments?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário para novo comentário */}
        <div className="space-y-3">
          <Textarea
            placeholder="Adicione um comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
            >
              {createCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
            </Button>
          </div>
        </div>

        {/* Lista de comentários */}
        <div className="space-y-4">
          {comments?.map((comment) => (
            <div key={comment.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user_avatar} />
                  <AvatarFallback>{comment.user_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{comment.user_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </p>
                </div>
              </div>
              
              <p className="text-sm">{comment.content}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLikeComment(comment.id)}
                  className={`gap-1 ${comment.is_liked_by_user ? 'text-red-500' : ''}`}
                  disabled={likeCommentMutation.isPending}
                >
                  <Heart className={`w-4 h-4 ${comment.is_liked_by_user ? 'fill-current' : ''}`} />
                  {comment.likes_count}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {comments?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 