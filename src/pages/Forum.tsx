import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ForumTopic } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
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
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateTopicModal } from '@/components/Forum/CreateTopicModal';
import { useNavigate } from 'react-router-dom';

export default function Forum() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/forum/topics', {
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Fórum</h1>
            <p className="text-muted-foreground">Participe das discussões da comunidade</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
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
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Fórum</h1>
          <p className="text-muted-foreground">Participe das discussões da comunidade</p>
        </div>
        
        {canCreateTopics && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Tópico
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {topics.map((topic) => (
          <Card 
            key={topic.id} 
            className="hover:shadow-md transition-shadow cursor-pointer" 
            onClick={() => {
              if (!topic.slug) {
                toast.error('Erro ao acessar o tópico. Tente novamente.');
                return;
              }
              navigate(`/forum/topic/${topic.slug}`);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={topic.created_by_avatar} />
                      <AvatarFallback>
                        {topic.created_by_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold truncate">
                        {topic.title}
                      </h3>
                      {topic.is_pinned && (
                        <Pin className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    
                    {topic.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Criado por {topic.created_by_name}</span>
                      <span>•</span>
                      <span>{formatDate(topic.created_at)}</span>
                      {topic.last_activity && (
                        <>
                          <span>•</span>
                          <span>Última atividade: {formatDate(topic.last_activity)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{topic.posts_count}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{topic.replies_count}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{topic.posts_count + topic.replies_count}</span>
                  </div>
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
    </div>
  );
} 