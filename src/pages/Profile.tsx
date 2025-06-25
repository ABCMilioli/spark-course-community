import axios from 'axios';
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseCard } from "@/components/Courses/CourseCard";
import { EditProfileModal } from "@/components/Profile/EditProfileModal";
import { LogoutConfirmModal } from "@/components/Profile/LogoutConfirmModal";
import { ProfilePostCard } from "@/components/Profile/ProfilePostCard";
import { Edit, Mail, Calendar, Settings, LogOut, MessageSquare, BookOpen, Award, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PostWithAuthor, CourseWithInstructor } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast as sonnerToast } from 'sonner';
import { EditPostModal } from "@/components/Profile/EditPostModal";

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function Profile() {
  const { user, logout } = useAuth();
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [editPostModalOpen, setEditPostModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);

  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['user-posts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/posts?author_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: !!user,
  });
  
  const { data: enrollments, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['user-enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/enrollments?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: !!user,
  });

  const handleLogout = () => {
    logout();
    setLogoutModalOpen(false);
  };

  const handleProfileUpdate = () => {
    // O modal já invalida as queries automaticamente
    // Aqui podemos adicionar lógica adicional se necessário
  };

  // Mutation para criar dados de teste
  const createTestDataMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/test-data`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      sonnerToast.success('Dados de teste criados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-enrollments'] });
    },
    onError: (error: any) => {
      console.error('Erro ao criar dados de teste:', error);
      sonnerToast.error('Erro ao criar dados de teste');
    }
  });

  const queryClient = useQueryClient();

  if (!user) {
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

  // Calcular estatísticas
  const totalPosts = posts?.length || 0;
  const totalCourses = enrollments?.length || 0;
  const completedCourses = enrollments?.filter(e => e.progress === 100).length || 0;
  const averageProgress = enrollments?.length > 0 
    ? Math.round(enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / enrollments.length)
    : 0;

  return (
    <div className="flex-1 bg-muted/40">
      <div className="h-48 bg-gradient-to-r from-primary to-brand-blue w-full" />
      
      <div className="container -mt-20 pb-10">
        {/* Profile Header */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <Avatar className="w-32 h-32 border-4 border-background -mt-16">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="text-4xl">{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground">{user.bio || "Nenhuma bio informada."}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                <Settings className="w-4 h-4 mr-2" /> Editar Perfil
              </Button>
              <Button variant="ghost" onClick={() => setLogoutModalOpen(true)}>
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </Button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center md:justify-start">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" /> {user.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" /> Ingressou em {user.created_at ? format(new Date(user.created_at), "MMMM 'de' yyyy", { locale: ptBR }) : 'Data não disponível'}
            </div>
            <div className="flex items-center gap-2">
              <Badge>{user.role}</Badge>
            </div>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPosts}</p>
                  <p className="text-sm text-muted-foreground">Posts Criados</p>
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
                  <p className="text-2xl font-bold">{totalCourses}</p>
                  <p className="text-sm text-muted-foreground">Cursos Matriculados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCourses}</p>
                  <p className="text-sm text-muted-foreground">Cursos Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 text-orange-600 text-center text-sm font-bold">%</div>
                </div>
                <div>
                  <p className="text-2xl font-bold">{averageProgress}%</p>
                  <p className="text-sm text-muted-foreground">Progresso Médio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="mt-6">
          <Tabs defaultValue="posts">
            <TabsList>
              <TabsTrigger value="posts">Meus Posts</TabsTrigger>
              <TabsTrigger value="courses">Meus Cursos</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoadingPosts && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                {posts?.map((post) => (
                  <ProfilePostCard 
                    key={post.id} 
                    post={post} 
                    onEdit={(p) => {
                      setPostToEdit(p);
                      setEditPostModalOpen(true);
                    }}
                  />
                ))}
              </div>
              {posts?.length === 0 && !isLoadingPosts && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Você ainda não criou nenhum post.</p>
                  <Button 
                    onClick={() => createTestDataMutation.mutate()}
                    disabled={createTestDataMutation.isPending}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createTestDataMutation.isPending ? 'Criando...' : 'Criar Dados de Teste'}
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="courses" className="mt-4">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoadingCourses && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                {enrollments?.map((enrollment) => (
                  <Card key={enrollment.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{enrollment.course_title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">Instrutor: {enrollment.instructor_name || 'Não informado'}</p>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progresso</span>
                          <span>{enrollment.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${enrollment.progress || 0}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Matriculado em: {enrollment.enrolled_at ? format(new Date(enrollment.enrolled_at), "dd/MM/yyyy", { locale: ptBR }) : 'Data não disponível'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {enrollments?.length === 0 && !isLoadingCourses && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Você ainda não está inscrito em nenhum curso.</p>
                  <Button 
                    onClick={() => createTestDataMutation.mutate()}
                    disabled={createTestDataMutation.isPending}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createTestDataMutation.isPending ? 'Criando...' : 'Criar Dados de Teste'}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <EditProfileModal 
        open={isEditModalOpen} 
        onOpenChange={setEditModalOpen}
        user={user}
        onSuccess={handleProfileUpdate}
      />
      
      <LogoutConfirmModal 
        open={isLogoutModalOpen}
        onOpenChange={setLogoutModalOpen}
        onConfirm={handleLogout}
      />
      <EditPostModal 
        open={editPostModalOpen} 
        onOpenChange={setEditPostModalOpen} 
        post={postToEdit} 
      />
    </div>
  );
}
