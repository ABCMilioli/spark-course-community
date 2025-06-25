import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Heart, MessageSquare, Share2, Bookmark } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { Post } from '@/types';
import { toast as sonnerToast } from '@/components/ui/sonner';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Buscar dados do post
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) throw new Error('ID do post não fornecido');
      const token = localStorage.getItem('token');
      console.log('[PostDetail] Buscando post:', postId);
      const response = await axios.get(`${API_URL}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[PostDetail] Post encontrado:', response.data);
      return response.data;
    },
    enabled: !!postId,
    retry: 1
  });

  // Buscar estado de curtida
  const { data: likeData, isLoading: isLikeLoading } = useQuery({
    queryKey: ['post-likes', postId],
    queryFn: async () => {
      if (!postId) return { count: 0, likedByUser: false };
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/posts/${postId}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!postId
  });

  // Mutations para curtir/descurtir
  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-likes', postId] });
    },
    onError: () => {
      sonnerToast.error('Erro ao curtir post.');
    }
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/posts/${postId}/like`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-likes', postId] });
    },
    onError: () => {
      sonnerToast.error('Erro ao remover curtida.');
    }
  });

  // Handler do botão de curtir
  const handleLike = () => {
    if (likeData?.likedByUser) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  const handleComment = () => {
    sonnerToast.info('Funcionalidade de comentários em breve!');
  };
  const handleShare = () => {
    const postUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.content,
        url: postUrl,
      });
    } else {
      navigator.clipboard.writeText(postUrl);
      sonnerToast.success('Link do post copiado para a área de transferência!');
    }
  };
  const handleSave = () => {
    sonnerToast.info('Funcionalidade de salvar post em breve!');
  };

  // Log de erro se houver
  if (error) {
    console.error('[PostDetail] Erro na query:', error);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Post não encontrado</h2>
          <p className="text-muted-foreground mb-6">
            O post que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => navigate('/community')}>
            Voltar para a Comunidade
          </Button>
        </div>
      </div>
    );
  }

  // Validação adicional para garantir que temos dados válidos
  if (!post.id || !post.title || !post.content) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Dados do post inválidos</h2>
          <p className="text-muted-foreground mb-6">
            Os dados do post estão corrompidos ou incompletos.
          </p>
          <Button onClick={() => navigate('/community')}>
            Voltar para a Comunidade
          </Button>
        </div>
      </div>
    );
  }

  // Formatação simples da data
  const timeAgo = post.created_at ? new Date(post.created_at).toLocaleDateString('pt-BR') : 'Data desconhecida';

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.author_avatar ?? undefined} />
            <AvatarFallback>{post.author_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{post.author_name}</p>
              <Badge variant="secondary">
                Membro
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
          {post.category && (
            <Badge variant="outline" className="w-fit">
              #{post.category}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-gray max-w-none">
            <p className="text-lg leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-6">
          <Button
            variant={likeData?.likedByUser ? 'default' : 'ghost'}
            className={`gap-2 ${likeMutation.isPending || unlikeMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={handleLike}
            disabled={isLikeLoading}
            aria-label={likeData?.likedByUser ? 'Descurtir' : 'Curtir'}
          >
            <Heart className={`w-5 h-5 ${likeData?.likedByUser ? 'fill-primary text-primary' : ''}`} />
            <span>{likeData?.count ?? post.likes_count ?? 0}</span>
          </Button>
          
          <Button variant="ghost" className="gap-2" onClick={handleComment}>
            <MessageSquare className="w-5 h-5" />
            <span>{post.comments_count || 0}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Comentários</h3>
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
        </div>
      </div>
    </div>
  );
} 