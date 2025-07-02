import axios from 'axios';
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilePostCard } from "@/components/Profile/ProfilePostCard";
import { Mail, Calendar, MessageSquare, BookOpen, Award, ArrowLeft, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PublicProfile } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('ID do usuário não fornecido');
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data as PublicProfile;
    },
    enabled: !!userId,
  });

  // Se é o próprio usuário, redirecionar para o perfil privado
  if (currentUser && userId === currentUser.id) {
    navigate('/profile');
    return null;
  }

  const handleSendMessage = async () => {
    if (!userId || !currentUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/conversations/direct`, 
        { otherUserId: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        const conversation = response.data;
        navigate(`/messages/${conversation.id}`);
        toast.success('Conversa iniciada!');
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      toast.error('Erro ao iniciar conversa');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-6 bg-muted/40">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
          <div>
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex-1 p-6">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Usuário não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O perfil que você está procurando não existe ou não está disponível.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-muted/40">
      <div className="h-48 bg-gradient-to-r from-primary to-brand-blue w-full" />
      
      <div className="container -mt-20 pb-10">
        {/* Profile Header */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <Avatar className="w-32 h-32 border-4 border-background -mt-16">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-4xl">{profile.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-muted-foreground">{profile.bio || "Nenhuma bio informada."}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendMessage}>
                <Mail className="w-4 h-4 mr-2" /> Enviar Mensagem
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center md:justify-start">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" /> 
              Ingressou em {format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-2">
              <Badge>{profile.role}</Badge>
            </div>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.stats.posts_count}</p>
                  <p className="text-sm text-muted-foreground">Posts na Comunidade</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.stats.courses_enrolled}</p>
                  <p className="text-sm text-muted-foreground">Cursos Matriculados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile.stats.forum_posts_count}</p>
                  <p className="text-sm text-muted-foreground">Posts no Fórum</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <div className="mt-6">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="posts">Posts Recentes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Posts Recentes de {profile.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.recent_posts.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum post encontrado</h3>
                      <p className="text-muted-foreground">
                        {profile.name} ainda não criou nenhum post na comunidade.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profile.recent_posts.map((post) => (
                        <ProfilePostCard key={post.id} post={post} />
                      ))}
                      {profile.stats.posts_count > 5 && (
                        <div className="text-center pt-4">
                          <p className="text-sm text-muted-foreground">
                            Mostrando os 5 posts mais recentes de {profile.stats.posts_count} posts totais.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 