import { MessageSquare, Heart, Share2, Bookmark, MoreHorizontal, Edit, Trash2, Copy, ExternalLink, Play } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Post } from "@/types";
import { getVideoEmbedUrl } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast as sonnerToast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from "@/contexts/AuthContext";

interface PostCardProps {
  post: Post & { isLiked?: boolean };
  onLike?: (postId: string) => void;
  onClick?: (postId: string) => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
}

const API_URL = process.env.REACT_APP_API_URL || '/api';

export function PostCard({ post, onLike, onClick, onEdit, onDelete }: PostCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  // Mutation para deletar post
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      sonnerToast.success('Post deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      setDeleteDialogOpen(false);
      onDelete?.(post.id);
    },
    onError: (error: any) => {
      console.error('Erro ao deletar post:', error);
      sonnerToast.error('Erro ao deletar post', {
        description: error.response?.data?.error || 'Tente novamente.'
      });
    }
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(post.id.toString());
  };

  const handleCardClick = () => {
    onClick?.(post.id.toString());
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/user/${post.author_id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(post);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    sonnerToast.success('Link copiado para a área de transferência!');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const text = `${post.title}\n\n${postUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.content,
        url: postUrl,
      });
    } else {
      navigator.clipboard.writeText(text);
      sonnerToast.success('Post copiado para compartilhamento!');
    }
  };

  const handleViewPost = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/post/${post.id}`);
  };

  const confirmDelete = () => {
    deletePostMutation.mutate(post.id);
  };

  // Verifica se o usuário atual é o autor do post
  const isAuthor = user?.id === post.author_id;

  return (
    <>
      <Card 
        className="hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
        onClick={handleCardClick}
      >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              className="w-10 h-10 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={handleAuthorClick}
            >
              <AvatarImage src={post.author_avatar ?? undefined} />
              <AvatarFallback>{post.author_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p 
                  className="font-medium text-sm cursor-pointer hover:text-primary transition-colors truncate"
                  onClick={handleAuthorClick}
                  title={post.author_name}
                >
                  {post.author_name}
                </p>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  Membro
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isAuthor && (
                <>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Post
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleViewPost}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              {isAuthor && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar Post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mídia - Prioriza imagem sobre vídeo */}
        {post.cover_image ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden">
            <img 
              src={post.cover_image} 
              alt="Capa do post" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : post.video_url ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
            <iframe
              src={getVideoEmbedUrl(post.video_url)}
              title="Vídeo do post"
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}

        <div>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {post.content}
          </p>
        </div>

        {post.category && (
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              #{post.category}
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike}
              className="gap-2 text-muted-foreground"
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm">{post.likes_count || 0}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">{post.comments_count || 0}</span>
            </Button>

            <Button variant="ghost" size="sm" className="gap-2">
              <Bookmark className="w-4 h-4" />
              <span className="text-sm">{post.favorites_count || 0}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Bookmark className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Post</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar este post? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deletePostMutation.isPending}
          >
            {deletePostMutation.isPending ? 'Deletando...' : 'Deletar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
