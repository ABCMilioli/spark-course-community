import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ForumReply } from '@/types';

interface PostRepliesProps {
  postId: string;
}

export function PostReplies({ postId }: PostRepliesProps) {
  const [newReplyContent, setNewReplyContent] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar respostas do post
  const { data: replies, isLoading } = useQuery({
    queryKey: ['forum-post-replies', postId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/forum/posts/${postId}/replies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erro ao buscar respostas');
      return response.json();
    },
    enabled: !!postId
  });

  // Mutation para criar nova resposta
  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/forum/posts/${postId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Erro ao criar resposta');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post-replies', postId] });
      setNewReplyContent('');
      toast.success('Resposta adicionada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao adicionar resposta');
    }
  });

  // Mutation para curtir/descurtir resposta
  const likeReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/forum/replies/${replyId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erro ao curtir resposta');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post-replies', postId] });
    },
    onError: () => {
      toast.error('Erro ao curtir resposta');
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
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Respostas</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
                  
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {reply.content}
                  </p>
                  
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
    </div>
  );
} 