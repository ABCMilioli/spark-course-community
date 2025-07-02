import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThumbsUp, MessageSquare, Send, Loader2, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ForumReply } from '@/types';
import { DeleteReplyModal } from './DeleteReplyModal';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

interface PostRepliesProps {
  postId: string;
  replies?: ForumReply[];
  onRepliesUpdate?: () => void;
}

export function PostReplies({ postId, replies = [], onRepliesUpdate }: PostRepliesProps) {
  const [newReplyContent, setNewReplyContent] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<ForumReply | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Mutation para criar nova resposta
  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/forum/posts/${postId}/replies`, 
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
      setNewReplyContent('');
      toast.success('Resposta adicionada com sucesso!');
      if (onRepliesUpdate) onRepliesUpdate();
    },
    onError: () => {
      toast.error('Erro ao adicionar resposta');
    }
  });

  // Mutation para curtir/descurtir resposta
  const likeReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/forum/replies/${replyId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
      if (onRepliesUpdate) onRepliesUpdate();
    },
    onError: () => {
      toast.error('Erro ao curtir resposta');
    }
  });

  // Mutation para editar resposta
  const editReplyMutation = useMutation({
    mutationFn: async ({ replyId, content }: { replyId: string; content: string }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/forum/replies/${replyId}`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
      setEditingReplyId(null);
      setEditContent('');
      toast.success('Resposta editada com sucesso!');
      if (onRepliesUpdate) onRepliesUpdate();
    },
    onError: () => {
      toast.error('Erro ao editar resposta');
    }
  });

  // Mutation para deletar resposta
  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/forum/replies/${replyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
      toast.success('Resposta deletada com sucesso!');
      if (onRepliesUpdate) onRepliesUpdate();
    },
    onError: () => {
      toast.error('Erro ao deletar resposta');
    }
  });

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyContent.trim()) {
      toast.error('Digite uma resposta');
      return;
    }
    createReplyMutation.mutate(newReplyContent.trim());
  };

  const handleEditReply = (reply: ForumReply) => {
    setEditingReplyId(reply.id);
    setEditContent(reply.content);
  };

  const handleSaveEdit = (replyId: string) => {
    if (!editContent.trim()) {
      toast.error('Digite um conteúdo para a resposta');
      return;
    }
    editReplyMutation.mutate({ replyId, content: editContent.trim() });
  };

  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditContent('');
  };

  const handleDeleteReply = (reply: ForumReply) => {
    setReplyToDelete(reply);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteReply = () => {
    if (replyToDelete) {
      deleteReplyMutation.mutate(replyToDelete.id);
      setIsDeleteModalOpen(false);
      setReplyToDelete(null);
    }
  };

  const canEditReply = (reply: ForumReply) => {
    return user && (user.id === reply.author_id || user.role === 'admin');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Respostas ({replies?.length || 0})
        </h3>
      </div>

      {/* Formulário para nova resposta */}
      {user && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmitReply} className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={newReplyContent}
                    onChange={(e) => setNewReplyContent(e.target.value)}
                    placeholder="Escreva sua resposta..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={createReplyMutation.isPending || !newReplyContent.trim()}
                  size="sm"
                >
                  {createReplyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Responder
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de respostas */}
      <div className="space-y-4">
        {replies?.map((reply: ForumReply) => (
          <Card key={reply.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={reply.author_avatar} />
                  <AvatarFallback>
                    {reply.author_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{reply.author_name}</span>
                      {reply.author_role === 'admin' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(reply.created_at)}
                      </span>
                      {reply.is_solution && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Solução
                        </span>
                      )}
                    </div>
                    
                    {/* Menu de ações */}
                    {canEditReply(reply) && editingReplyId !== reply.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditReply(reply)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteReply(reply)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  {/* Conteúdo ou editor */}
                  {editingReplyId === reply.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(reply.id)}
                          disabled={editReplyMutation.isPending || !editContent.trim()}
                        >
                          {editReplyMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={editReplyMutation.isPending}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {reply.content}
                    </p>
                  )}
                  
                  {/* Ações (curtir) - só mostra se não estiver editando */}
                  {editingReplyId !== reply.id && (
                    <div className="flex items-center gap-4 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => likeReplyMutation.mutate(reply.id)}
                        className={`flex items-center gap-1 h-8 px-2 ${
                          reply.is_liked_by_user ? 'text-primary' : 'text-muted-foreground'
                        }`}
                        disabled={likeReplyMutation.isPending}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span className="text-xs">{reply.likes_count || 0}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {replies?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">Nenhuma resposta ainda</h4>
              <p className="text-sm text-muted-foreground">
                Seja o primeiro a responder este post!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de confirmação de deleção */}
      <DeleteReplyModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setReplyToDelete(null);
        }}
        onConfirm={confirmDeleteReply}
        reply={replyToDelete}
        isDeleting={deleteReplyMutation.isPending}
      />
    </div>
  );
} 