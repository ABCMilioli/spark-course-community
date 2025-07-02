import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ForumTopicPosts, ForumPost } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.REACT_APP_API_URL || '/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { 
  MessageSquare, 
  Eye, 
  ThumbsUp, 
  Star,
  Plus,
  Pin,
  ArrowLeft,
  Clock,
  User,
  Tag,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { CreatePostModal } from '@/components/Forum/CreatePostModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditPostModal } from '@/components/Forum/EditPostModal';
import { DeletePostModal } from '@/components/Forum/DeletePostModal';

export default function ForumTopic() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topicData, setTopicData] = useState<ForumTopicPosts | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para modais de edição e exclusão
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

  useEffect(() => {
    if (slug) {
      fetchTopicPosts();
    } else {
      toast.error('Tópico não encontrado');
      navigate('/forum');
    }
  }, [slug, sortBy, currentPage]);

  const fetchTopicPosts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/forum/topics/${slug}/posts`, {
        params: {
          page: currentPage,
          sort: sortBy
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setTopicData(data);
    } catch (error: any) {
      console.error('Erro ao buscar posts:', error);
      
      if (error.response?.status === 404) {
        toast.error('Tópico não encontrado');
      } else {
        toast.error('Erro ao carregar posts do tópico. Por favor, tente novamente.');
      }
      
      navigate('/forum');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await axios.post(`${API_URL}/forum/posts/${postId}/like`, null, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      await fetchTopicPosts();
    } catch (error) {
      console.error('Erro ao curtir post:', error);
      toast.error('Não foi possível curtir o post. Tente novamente.');
    }
  };

  const handleFavorite = async (postId: string) => {
    try {
      await axios.post(`${API_URL}/forum/posts/${postId}/favorite`, null, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      await fetchTopicPosts();
    } catch (error) {
      console.error('Erro ao favoritar post:', error);
      toast.error('Não foi possível favoritar o post. Tente novamente.');
    }
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

  // Verificar se o usuário pode editar/excluir um post
  const canEditPost = (post: ForumPost) => {
    return user && (user.id === post.author_id || user.role === 'admin');
  };

  // Handlers para modais
  const handleEditPost = (post: ForumPost) => {
    setSelectedPost(post);
    setIsEditModalOpen(true);
  };

  const handleDeletePost = (post: ForumPost) => {
    setSelectedPost(post);
    setIsDeleteModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchTopicPosts();
    setIsEditModalOpen(false);
    setSelectedPost(null);
  };

  const handleDeleteSuccess = () => {
    fetchTopicPosts();
    setIsDeleteModalOpen(false);
    setSelectedPost(null);
  };

  const handleAuthorClick = (authorId: string) => {
    navigate(`/user/${authorId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-64 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!topicData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tópico não encontrado</h1>
          <Button onClick={() => navigate('/forum')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Fórum
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Banner do tópico */}
      {topicData.topic.banner_image_url && (
        <div className="mb-8 rounded-lg overflow-hidden">
          <img 
            src={topicData.topic.banner_image_url} 
            alt={`Banner do tópico ${topicData.topic.title}`}
            className="w-full h-32 object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/forum')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          {/* Imagem de capa ao lado do título */}
          <div className="flex items-center gap-4">
            {topicData.topic.cover_image_url && (
              <img 
                src={topicData.topic.cover_image_url} 
                alt={`Capa do tópico ${topicData.topic.title}`}
                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{topicData.topic.title}</h1>
              {topicData.topic.description && (
                <p className="text-muted-foreground mt-2">{topicData.topic.description}</p>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Post
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {topicData.pagination.total} posts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ordenar por:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Mais recentes</SelectItem>
              <SelectItem value="popular">Mais populares</SelectItem>
              <SelectItem value="replies">Mais respostas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {topicData.posts.map((post) => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Imagem à esquerda */}
                {post.content_image_url && (
                  <div className="flex-shrink-0">
                    <img 
                      src={post.content_image_url} 
                      alt="Imagem de apoio" 
                      className="w-32 h-24 object-cover rounded-lg border"
                    />
                  </div>
                )}
                
                {/* Conteúdo à direita */}
                <div className="flex-1 min-w-0">
                  {/* Header com título e pin */}
                  <div className="flex items-start justify-between mb-2">
                    <Link 
                      to={`/forum/post/${post.id}`}
                      className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center gap-2 ml-2">
                      {post.is_pinned && (
                        <Pin className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}
                      
                      {/* Menu de ações do post */}
                      {canEditPost(post) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditPost(post)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeletePost(post)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Preview do conteúdo */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {post.content?.substring(0, 120)}...
                  </p>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {post.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{post.tags.length - 3} mais
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer com autor, data e ações */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar 
                          className="w-6 h-6 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                          onClick={() => handleAuthorClick(post.author_id)}
                        >
                          <AvatarImage src={post.author_avatar} />
                          <AvatarFallback>
                            {post.author_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span 
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleAuthorClick(post.author_id)}
                        >
                          {post.author_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{post.view_count}</span>
                      </div>
                    </div>
                    
                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1 ${post.is_liked_by_user ? 'text-primary' : ''}`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{post.likes_count}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFavorite(post.id)}
                        className={`flex items-center gap-1 ${post.is_favorited_by_user ? 'text-yellow-500' : ''}`}
                      >
                        <Star className="w-4 h-4" />
                        <span>{post.favorites_count}</span>
                      </Button>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.replies_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {topicData.posts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum post encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Seja o primeiro a criar um post neste tópico!
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Post
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {topicData.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {topicData.pagination.pages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(topicData.pagination.pages, prev + 1))}
            disabled={currentPage === topicData.pagination.pages}
          >
            Próxima
          </Button>
        </div>
      )}

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchTopicPosts();
        }}
        topicId={topicData.topic.id}
        topicTitle={topicData.topic.title}
      />
      
      {/* Modais de Edição e Exclusão */}
      {selectedPost && (
        <>
          <EditPostModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPost(null);
            }}
            onSuccess={handleEditSuccess}
            post={selectedPost}
          />
          
          <DeletePostModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedPost(null);
            }}
            onSuccess={handleDeleteSuccess}
            post={selectedPost}
          />
        </>
      )}
    </div>
  );
} 