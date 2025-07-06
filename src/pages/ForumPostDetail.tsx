import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ThumbsUp, Star, MessageSquare, Eye, Clock, Tag, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { EditPostModal } from '@/components/Forum/EditPostModal';
import { DeletePostModal } from '@/components/Forum/DeletePostModal';
import { PostReplies } from '@/components/Forum/PostReplies';
import { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function ForumPostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Estados para modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Buscar dados do post do fórum
  const { data: postData, isLoading, error } = useQuery({
    queryKey: ['forum-post', postId],
    queryFn: async () => {
      if (!postId) throw new Error('ID do post não fornecido');
      const token = localStorage.getItem('token');
      console.log('[ForumPostDetail] Buscando post do fórum:', postId);
      const response = await axios.get(`${API_URL}/forum/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[ForumPostDetail] Post encontrado:', response.data);
      console.log('[ForumPostDetail] Post object:', response.data.post);
      console.log('[ForumPostDetail] content_image_url:', response.data.post?.content_image_url);
      return response.data; // Retornando o objeto completo com post e replies
    },
    enabled: !!postId,
    retry: 1
  });

  // Extrair post e replies dos dados
  const post = postData?.post;
  const repliesCount = postData?.replies?.length || 0;

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

  // Verificar se o usuário pode editar/excluir o post
  const canEditPost = user && post && (user.id === post.author_id || user.role === 'admin');

  // Handlers para modais
  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
    setIsEditModalOpen(false);
  };

  const handleDeleteSuccess = () => {
    navigate(`/forum/topic/${post?.topic_slug || post?.topic_id}`);
  };

  const handleAuthorClick = () => {
    if (post?.author_id) {
      navigate(`/user/${post.author_id}`);
    }
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

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar 
              className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={handleAuthorClick}
            >
              <AvatarImage src={post.author_avatar} />
              <AvatarFallback>
                {post.author_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 
                  className="font-semibold cursor-pointer hover:text-primary transition-colors"
                  onClick={handleAuthorClick}
                >
                  {post.author_name}
                </h3>
                {post.author_role === 'admin' && (
                  <Badge variant="secondary" className="text-xs">Admin</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{formatDate(post.created_at)}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.view_count || 0} visualizações</span>
                </div>
              </div>
            </div>

            {/* Menu de ações do post */}
            {canEditPost && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Post
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Título do post */}
          <div className="mb-4">
            <h1 className="text-xl font-bold">{post.title}</h1>
          </div>

          {/* Conteúdo do post */}
          <div className="mb-4">
            <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
          </div>
          
          {/* Imagem de apoio - formato quadrado estilo rede social */}
          {post.content_image_url ? (
            <div className="mb-4">
              <img 
                src={post.content_image_url} 
                alt="Imagem de apoio" 
                className="w-full aspect-square object-cover rounded-lg border"
                onLoad={() => console.log('[RENDER] Imagem carregada com sucesso')}
                onError={(e) => console.error('[RENDER] Erro ao carregar imagem:', e)}
              />
            </div>
          ) : (
            <div className="mb-4 p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
              <p>Nenhuma imagem de apoio anexada a este post</p>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Ações do post */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center gap-2 ${post.is_liked_by_user ? 'text-primary' : ''}`}
                disabled={likeMutation.isPending}
              >
                <ThumbsUp className="w-5 h-5" />
                <span className="font-medium">{post.likes_count || 0}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavorite}
                className={`flex items-center gap-2 ${post.is_favorited_by_user ? 'text-yellow-500' : ''}`}
                disabled={favoriteMutation.isPending}
              >
                <Star className="w-5 h-5" />
                <span className="font-medium">{post.favorites_count || 0}</span>
              </Button>
              
                             <div className="flex items-center gap-2 text-muted-foreground">
                 <MessageSquare className="w-5 h-5" />
                 <span className="font-medium">{repliesCount} comentários</span>
               </div>
            </div>
            
            {/* Link para o tópico */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/forum/topic/${post.topic_slug || post.topic_id}`)}
            >
              Ver tópico
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Respostas */}
      <div className="max-w-2xl mx-auto mt-8">
        <PostReplies 
          postId={postId!} 
          replies={postData?.replies || []}
          onRepliesUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
          }}
        />
      </div>



      {/* Modais */}
      {post && (
        <>
          <EditPostModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleEditSuccess}
            post={post}
          />
          
          <DeletePostModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onSuccess={handleDeleteSuccess}
            post={post}
          />
        </>
      )}
    </div>
  );
} 