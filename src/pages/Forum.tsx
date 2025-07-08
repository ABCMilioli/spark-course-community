import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ForumTopic } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  ThumbsUp, 
  Star,
  Plus,
  Pin,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateTopicModal } from '@/components/Forum/CreateTopicModal';
import { EditTopicModal } from '@/components/Forum/EditTopicModal';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export default function Forum() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ForumTopic | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<ForumTopic | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/forum/topics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTopics(data);
    } catch (error) {
      console.error('Erro ao buscar tópicos:', error);
      toast.error('Erro ao carregar tópicos do fórum');
    } finally {
      setLoading(false);
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

  const canCreateTopics = user?.role === 'admin' || user?.role === 'instructor';

  const canEditTopic = (topic: ForumTopic) => {
    return user?.role === 'admin' || user?.role === 'instructor' || topic.created_by === user?.id;
  };

  const handleEditTopic = (topic: ForumTopic) => {
    setEditingTopic(topic);
    setIsEditModalOpen(true);
  };

  const handleDeleteTopic = (topic: ForumTopic) => {
    setTopicToDelete(topic);
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;

    try {
      const response = await fetch(`${API_URL}/forum/topics/${topicToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Tópico excluído com sucesso!');
        fetchTopics();
        setTopicToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao excluir tópico');
      }
    } catch (error) {
      console.error('Erro ao excluir tópico:', error);
      toast.error('Erro ao excluir tópico');
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingTopic(null);
    fetchTopics();
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 bg-muted/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Fórum</h1>
              <p className="text-muted-foreground">Participe das discussões da comunidade</p>
            </div>
            <Skeleton className="h-10 w-full sm:w-32" />
          </div>
          
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 bg-muted/40">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Fórum</h1>
            <p className="text-muted-foreground">Participe das discussões da comunidade</p>
          </div>
          
          {canCreateTopics && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Tópico
            </Button>
          )}
        </div>

        <div className="grid gap-4">
          {topics.map((topic) => (
            <Card key={topic.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div 
                    className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 cursor-pointer"
                    onClick={() => {
                      if (!topic.slug) {
                        toast.error('Erro ao acessar o tópico. Tente novamente.');
                        return;
                      }
                      navigate(`/forum/topic/${topic.slug}`);
                    }}
                  >
                    {/* Imagem de capa do tópico */}
                    {topic.cover_image_url && (
                      <div className="flex-shrink-0">
                        <img 
                          src={topic.cover_image_url} 
                          alt={`Capa do tópico ${topic.title}`}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-shrink-0">
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                        <AvatarImage src={topic.created_by_avatar} />
                        <AvatarFallback>
                          {topic.created_by_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-semibold truncate">
                          {topic.title}
                        </h3>
                        {topic.is_pinned && (
                          <Pin className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      {topic.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {topic.description}
                        </p>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
                        <span>Criado por {topic.created_by_name}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{formatDate(topic.created_at)}</span>
                        {topic.last_activity && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span>Última atividade: {formatDate(topic.last_activity)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">{topic.posts_count}</span>
                      <span className="sm:hidden">{topic.posts_count}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">{topic.replies_count}</span>
                      <span className="sm:hidden">{topic.replies_count}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="hidden sm:inline">{topic.posts_count + topic.replies_count}</span>
                      <span className="sm:hidden">{topic.posts_count + topic.replies_count}</span>
                    </div>

                    {canEditTopic(topic) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTopic(topic)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTopic(topic)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {topics.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum tópico encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Ainda não há tópicos no fórum. Seja o primeiro a criar um!
                </p>
                {canCreateTopics && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Tópico
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <CreateTopicModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchTopics();
          }}
        />

        <EditTopicModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTopic(null);
          }}
          onSuccess={handleEditSuccess}
          topic={editingTopic}
        />

        {/* Modal de confirmação para excluir tópico */}
        <AlertDialog open={!!topicToDelete} onOpenChange={() => setTopicToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Tópico</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o tópico "{topicToDelete?.title}"? 
                Esta ação não pode ser desfeita e todos os posts do tópico também serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteTopic}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir Tópico
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 