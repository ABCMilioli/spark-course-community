import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Heart, MessageSquare, Share2, Bookmark, MoreHorizontal, Edit, Trash2, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { Post } from '@/types';
import { toast as sonnerToast } from '@/components/ui/sonner';
import { useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { getVideoEmbedUrl } from '@/lib/utils';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

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

  // Buscar estado de favorito
  const { data: favoriteData, isLoading: isFavoriteLoading } = useQuery({
    queryKey: ['post-favorite', postId],
    queryFn: async () => {
      if (!postId) return { favorited: false };
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/posts/${postId}/favorite`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!postId
  });

  // Buscar comentários
  const { data: comments, isLoading: isCommentsLoading, error: commentsError } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      if (!postId) return [];
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/posts/${postId}/comments`, {
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

  // Mutations para favoritar/desfavoritar
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/posts/${postId}/favorite`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-favorite', postId] });
      sonnerToast.success('Post salvo nos favoritos!');
    },
    onError: () => {
      sonnerToast.error('Erro ao favoritar post.');
    }
  });

  const unfavoriteMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/posts/${postId}/favorite`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-favorite', postId] });
      sonnerToast.success('Post removido dos favoritos!');
    },
    onError: () => {
      sonnerToast.error('Erro ao remover dos favoritos.');
    }
  });

  // Mutação para adicionar comentário
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/posts/${postId}/comments`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 100);
    },
    onError: (err: any) => {
      sonnerToast.error('Erro ao comentar', {
        description: err?.response?.data?.error || 'Tente novamente.'
      });
    }
  });

  // Mutação para editar comentário
  const editCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/posts/comments/${id}`, { content }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditContent('');
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
    },
    onError: (err: any) => {
      sonnerToast.error('Erro ao editar comentário', {
        description: err?.response?.data?.error || 'Tente novamente.'
      });
    }
  });

  // Mutação para deletar comentário
  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/posts/comments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      setDeleteCommentId(null);
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
    },
    onError: (err: any) => {
      sonnerToast.error('Erro ao deletar comentário', {
        description: err?.response?.data?.error || 'Tente novamente.'
      });
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

  // Handler do botão de favoritar
  const handleFavorite = () => {
    if (favoriteData?.favorited) {
      unfavoriteMutation.mutate();
    } else {
      favoriteMutation.mutate();
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

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addCommentMutation.mutate(comment.trim());
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/community');
    }
  };

  const handleAuthorClick = (authorId: string) => {
    navigate(`/user/${authorId}`);
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
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <div className="flex items-center gap-3 mb-4">
          <Avatar 
            className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
            onClick={() => handleAuthorClick(post.author_id)}
          >
            <AvatarImage src={post.author_avatar ?? undefined} />
            <AvatarFallback>{post.author_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p 
                className="font-medium cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleAuthorClick(post.author_id)}
              >
                {post.author_name}
              </p>
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
          {/* Imagem de capa */}
          {post.cover_image && (
            <div className="mb-6">
              <img 
                src={post.cover_image} 
                alt="Capa do post" 
                className="w-full h-64 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Vídeo */}
          {post.video_url && (
            <div className="mb-6">
              <div className="relative w-full h-96 bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={getVideoEmbedUrl(post.video_url)}
                  title="Vídeo do post"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

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
            <Heart className={`w-5 h-5 ${likeData?.likedByUser ? 'fill-white text-white' : ''}`} />
            <span>{likeData?.count ?? post.likes_count ?? 0}</span>
          </Button>
          
          <Button variant="ghost" className="gap-2" onClick={handleComment}>
            <MessageSquare className="w-5 h-5" />
            <span>{post.comments_count || 0}</span>
          </Button>

          <Button variant="ghost" className="gap-2">
            <Bookmark className="w-5 h-5" />
            <span>{post.favorites_count || 0}</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant={favoriteData?.favorited ? 'default' : 'ghost'}
            size="sm"
            onClick={handleFavorite}
            disabled={isFavoriteLoading || favoriteMutation.isPending || unfavoriteMutation.isPending}
            aria-label={favoriteData?.favorited ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
            className={
              (favoriteMutation.isPending || unfavoriteMutation.isPending ? 'opacity-50 pointer-events-none' : '')
            }
          >
            <Bookmark className={`w-4 h-4 ${favoriteData?.favorited ? 'fill-white text-white' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Comentários</h3>
        <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
          <input
            ref={commentInputRef}
            type="text"
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Escreva um comentário..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            disabled={addCommentMutation.isPending}
            maxLength={500}
            required
          />
          <Button type="submit" disabled={addCommentMutation.isPending || !comment.trim()}>
            {addCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
          </Button>
        </form>
        {isCommentsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Skeleton className="h-4 w-1/2 mx-auto mb-2" />
            <Skeleton className="h-4 w-1/3 mx-auto" />
          </div>
        ) : commentsError ? (
          <div className="text-center py-8 text-destructive">
            Erro ao carregar comentários.
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map((c: any) => (
              <div key={c.id} className="flex gap-3 items-start group">
                <Avatar 
                  className="w-9 h-9 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                  onClick={() => handleAuthorClick(c.author_id || c.user_id)}
                >
                  <AvatarImage src={c.author_avatar ?? undefined} />
                  <AvatarFallback>{c.author_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted/40 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleAuthorClick(c.author_id || c.user_id)}
                    >
                      {c.author_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR }) : 'agora'}
                    </span>
                    {user?.id === c.user_id && editingCommentId !== c.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="ml-2 p-1 h-6 w-6">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem onClick={() => { setEditingCommentId(c.id); setEditContent(c.content); }}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteCommentId(c.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  {editingCommentId === c.id ? (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        if (!editContent.trim()) return;
                        editCommentMutation.mutate({ id: c.id, content: editContent });
                      }}
                      className="flex gap-2"
                    >
                      <input
                        className="flex-1 px-2 py-1 rounded border border-border bg-background text-foreground"
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        disabled={editCommentMutation.isPending}
                        maxLength={500}
                        required
                        autoFocus
                      />
                      <Button type="submit" size="sm" disabled={editCommentMutation.isPending || !editContent.trim()}>
                        Salvar
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setEditingCommentId(null)}>
                        Cancelar
                      </Button>
                    </form>
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-line">{c.content}</p>
                  )}
                </div>
                {/* Dialog de confirmação para deletar */}
                <AlertDialog open={deleteCommentId === c.id} onOpenChange={open => { if (!open) setDeleteCommentId(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar comentário</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja deletar este comentário? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteCommentMutation.mutate(c.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deleteCommentMutation.isPending}
                      >
                        {deleteCommentMutation.isPending ? 'Deletando...' : 'Deletar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Seja o primeiro a comentar!</p>
          </div>
        )}
      </div>
    </div>
  );
} 