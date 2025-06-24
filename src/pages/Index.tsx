import { PostCard } from '@/components/Community/PostCard';
import { CourseCard } from '@/components/Courses/CourseCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BookOpen, Users, MessageSquare, ArrowRight, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

async function fetchPosts() {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/posts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

async function fetchCourses() {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/courses`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

async function fetchDashboardStats() {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/dashboard-stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

async function fetchPopularTags() {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/popular-tags`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

export default function Index() {
  const { user } = useAuth();
  
  console.log('Index component rendering, user:', user?.name, 'role:', user?.role);
  
  const { data: posts, isLoading: isLoadingPosts, error: postsError } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  const { data: featuredCourses, isLoading: isLoadingCourses, error: coursesError } = useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
  });

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const { data: popularTags, isLoading: isLoadingTags, error: tagsError } = useQuery({
    queryKey: ['popular-tags'],
    queryFn: fetchPopularTags,
  });

  console.log('Query states:', {
    postsLoading: isLoadingPosts,
    coursesLoading: isLoadingCourses,
    statsLoading: isLoadingStats,
    tagsLoading: isLoadingTags,
    postsError,
    coursesError,
    statsError,
    tagsError
  });

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-4">
          Bem-vindo{user ? `, ${user.name}` : ''} à EduCommunity
        </h1>
        <p className="text-xl text-muted-foreground">
          Sua plataforma de aprendizado e conexão com a comunidade tech
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                {isLoadingStats ? (
                  <div className="space-y-1">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{stats?.membersCount}+</p>
                    <p className="text-sm text-muted-foreground">Membros Ativos</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-brand-blue" />
              </div>
              <div>
                {isLoadingStats ? (
                   <div className="space-y-1">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{stats?.coursesCount}+</p>
                    <p className="text-sm text-muted-foreground">Cursos Disponíveis</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-success" />
              </div>
              <div>
                {isLoadingStats ? (
                   <div className="space-y-1">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{stats?.postsCount}+</p>
                    <p className="text-sm text-muted-foreground">Discussões Ativas</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-warning" />
              </div>
              <div>
                {isLoadingStats ? (
                   <div className="space-y-1">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{stats?.averageRating}</p>
                    <p className="text-sm text-muted-foreground">Avaliação Média</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="community" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="community">Comunidade</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Discussões em Alta</h2>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/community">
                Ver Todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            {isLoadingPosts ? (
              <LoadingSkeleton />
            ) : (
              posts?.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={(postId) => console.log('Navigate to post:', postId)}
                />
              ))
            )}
          </div>

          {/* Community Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Participe da Comunidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Faça perguntas, compartilhe conhecimento e conecte-se com outros desenvolvedores.
                </p>
                <Button className="w-full">Criar Post</Button>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Tópicos Populares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {isLoadingTags ? (
                    Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-24 rounded-full" />)
                  ) : (
                    popularTags?.map((tag) => (
                      <Badge key={tag} variant="outline">#{tag}</Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Cursos em Destaque</h2>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/explore">
                Ver Todos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingCourses ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)
            ) : (
              featuredCourses?.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onPlay={(courseId) => console.log('Play course:', courseId)}
                />
              ))
            )}
          </div>

          {/* Course Features */}
          {(!user || user.role === 'free') && (
            <Card className="glass-effect">
              <CardContent className="p-8 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-2">Desbloqueie Todo o Conteúdo</h3>
                <p className="text-muted-foreground mb-6">
                  Acesse mais de 50 cursos premium, projetos práticos e certificados profissionais.
                </p>
                <Button size="lg" className="gap-2">
                  <Star className="w-4 h-4" />
                  Fazer Upgrade para Premium
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
