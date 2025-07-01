import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ThumbsUp, Star, MessageSquare, Eye, User, Clock, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function ForumPostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Buscar dados do post do fórum
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['forum-post', postId],
    queryFn: async () => {
      if (!postId) throw new Error('ID do post não fornecido');
      const token = localStorage.getItem('token');
      console.log('[ForumPostDetail] Buscando post do fórum:', postId);
      const response = await axios.get(`${API_URL}/forum/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[ForumPostDetail] Post encontrado:', response.data);
      return response.data;
    },
    enabled: !!postId,
    retry: 1
  });

  // Mutação para curtir/descurtir
  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/forum/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
      toast.success('Post curtido!');
    },
    onError: () => {
      toast.error('Erro ao curtir post.');
    }
  });

  // Mutação para favoritar/desfavoritar
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/forum/posts/${postId}/favorite`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
      toast.success('Post favoritado!');
    },
    onError: () => {
      toast.error('Erro ao favoritar post.');
    }
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleFavorite = () => {
    favoriteMutation.mutate();
  };

  const handleBack = () => {
    navigate('/forum');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            O post que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Fórum
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Post do Fórum</h1>
          <p className="text-muted-foreground">Discussão da comunidade</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage src={post.author_avatar} />
              <AvatarFallback>
                {post.author_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{post.title}</h2>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{post.author_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(post.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.view_count || 0} visualizações</span>
                </div>
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  {post.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Imagem de capa */}
          {post.cover_image_url && (
            <div className="mb-6">
              <img 
                src={post.cover_image_url} 
                alt="Capa do post" 
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="prose prose-sm max-w-none mb-6">
            <p className="whitespace-pre-wrap">{post.content}</p>
            
            {/* Imagem de conteúdo */}
            {post.content_image_url && (
              <div className="mt-4">
                <img 
                  src={post.content_image_url} 
                  alt="Imagem do conteúdo" 
                  className="w-full max-w-md mx-auto rounded-lg"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`flex items-center gap-2 ${post.is_liked_by_user ? 'text-primary' : ''}`}
              disabled={likeMutation.isPending}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{post.likes_count || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavorite}
              className={`flex items-center gap-2 ${post.is_favorited_by_user ? 'text-yellow-500' : ''}`}
              disabled={favoriteMutation.isPending}
            >
              <Star className="w-4 h-4" />
              <span>{post.favorites_count || 0}</span>
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>{post.replies_count || 0} respostas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção de respostas/comentários pode ser adicionada aqui futuramente */}
      {post.replies && post.replies.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Respostas ({post.replies.length})</h3>
          <div className="grid gap-4">
            {post.replies.map((reply: any) => (
              <Card key={reply.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={reply.author_avatar} />
                      <AvatarFallback>
                        {reply.author_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{reply.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 