import axios from 'axios';
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/Community/PostCard";
import { CourseCard } from "@/components/Courses/CourseCard";
import { Edit, Mail, Calendar, Settings, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PostWithAuthor, CourseWithInstructor } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function Profile() {
  const { user, logout } = useAuth();

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
              <Button variant="outline"><Settings className="w-4 h-4 mr-2" /> Editar Perfil</Button>
              <Button variant="ghost" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
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
                {posts?.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
              {posts?.length === 0 && !isLoadingPosts && <p className="text-muted-foreground text-center py-8">Você ainda não criou nenhum post.</p>}
            </TabsContent>
            <TabsContent value="courses" className="mt-4">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoadingCourses && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                {enrollments?.map((enrollment) => (
                  <div key={enrollment.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">{enrollment.course_title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Instrutor: {enrollment.instructor_name || 'Não informado'}</p>
                    <p className="text-sm text-muted-foreground mb-2">Progresso: {enrollment.progress || 0}%</p>
                    <p className="text-xs text-muted-foreground">
                      Matriculado em: {enrollment.enrolled_at ? format(new Date(enrollment.enrolled_at), "dd/MM/yyyy", { locale: ptBR }) : 'Data não disponível'}
                    </p>
                  </div>
                ))}
              </div>
              {enrollments?.length === 0 && !isLoadingCourses && <p className="text-muted-foreground text-center py-8">Você ainda não está inscrito em nenhum curso.</p>}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
