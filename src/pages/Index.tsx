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
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CourseWithInstructor } from '@/types';
import { useEffect, useState } from 'react';
import { CreatePostModal } from '@/components/Admin/CreatePostModal';

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

function useCourseRatingStats(courseId: string) {
  return useQuery({
    queryKey: ['course-rating-stats', courseId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/courses/${courseId}/rating-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!courseId,
  });
}

// Componente para encapsular o hook por card
function CourseCardWithStats({ course, onPlay }: { course: CourseWithInstructor, onPlay: (id: string) => void }) {
  const { data: ratingStats } = useCourseRatingStats(course.id);
  return (
    <CourseCard
      course={{
        ...course,
        rating: typeof ratingStats?.average_rating === 'number' && !isNaN(ratingStats.average_rating)
          ? ratingStats.average_rating
          : 0,
        total_ratings: ratingStats?.total_ratings || 0
      }}
      onPlay={onPlay}
    />
  );
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  
  console.log('Index component rendering, user:', user?.name, 'role:', user?.role);
  
  const { data: posts, isLoading: isLoadingPosts, error: postsError, refetch: refetchPosts } = useQuery({
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

  // Estado para média real
  const [realAverageRating, setRealAverageRating] = useState<number | null>(null);

  // Buscar estatísticas de avaliação de todos os cursos e calcular média real
  useEffect(() => {
    async function fetchAllRatings() {
      if (!featuredCourses || featuredCourses.length === 0) {
        setRealAverageRating(null);
        return;
      }
      let totalSum = 0;
      let totalCount = 0;
      for (const course of featuredCourses) {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/courses/${course.id}/rating-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const stats = await res.json();
          if (stats && stats.total_ratings > 0) {
            totalSum += stats.average_rating * stats.total_ratings;
            totalCount += stats.total_ratings;
          }
        } catch (e) {
          // Ignorar erros individuais
        }
      }
      if (totalCount > 0) {
        setRealAverageRating(Number((totalSum / totalCount).toFixed(2)));
      } else {
        setRealAverageRating(0);
      }
    }
    fetchAllRatings();
  }, [featuredCourses]);

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

  // Função para lidar com clique no post
  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  // Função para lidar com clique no curso
  const handleCourseClick = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

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
                    <p className="text-2xl font-bold">{realAverageRating !== null ? realAverageRating : '0.0'}</p>
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
                  onClick={handlePostClick}
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
                <Button className="w-full" onClick={() => setCreateModalOpen(true)}>
                  Criar Post
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Tópicos Populares
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clique em um tópico para ver posts relacionados
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {isLoadingTags ? (
                    Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-24 rounded-full" />)
                  ) : (
                    popularTags?.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => navigate(`/community?search=${encodeURIComponent(tag)}`)}
                      >
                        #{tag}
                      </Badge>
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
                <CourseCardWithStats
                  key={course.id}
                  course={course}
                  onPlay={handleCourseClick}
                />
              ))
            )}
          </div>

          {/* Course Features */}
          {(!user || user.role === 'student') && (
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
      
      <CreatePostModal
        open={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          refetchPosts();
        }}
      />
    </div>
  );
}
