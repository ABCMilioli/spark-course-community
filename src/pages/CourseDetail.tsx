import { useParams, useNavigate } from "react-router-dom";
import { Clock, BarChart, User, Star, Users, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PostCard } from "@/components/Community/PostCard";
import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import { CourseWithInstructor, PostWithAuthor } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_API_URL || '/api';

async function fetchCourseDetail(courseId: string) {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

async function checkEnrollment(courseId: string) {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/enrollments?course_id=${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export default function CourseDetail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();

  const { data: course, isLoading: isLoadingCourse, error } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: () => fetchCourseDetail(courseId),
    enabled: !!courseId,
  });

  const { data: enrollment, isLoading: isLoadingEnrollment } = useQuery({
    queryKey: ['course-enrollment', courseId],
    queryFn: () => checkEnrollment(courseId),
    enabled: !!courseId,
  });

  // Verificar se o usuário está matriculado neste curso
  const userEnrollment = enrollment?.find((e: any) => e.user_id === user?.id);
  const isEnrolled = !!userEnrollment;

  const handleEnrollClick = async () => {
    if (!course) return;

    if (isEnrolled) {
      // Se já está matriculado, ir para o player
      navigate(`/player?courseId=${courseId}`);
      return;
    }

    if (Number(course.price) === 0) {
      // Curso gratuito - matricular direto
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/enrollments`, {
          course_id: courseId,
          user_id: user?.id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success('Matrícula realizada com sucesso!');
        navigate(`/player?courseId=${courseId}`);
      } catch (error) {
        console.error('Erro ao matricular:', error);
        toast.error('Erro ao realizar matrícula');
      }
    } else {
      // Curso pago - ir para página de pagamento
      navigate(`/payment?courseId=${courseId}`);
    }
  };

  // Example: fetch related posts
  const { data: posts, isLoading: isLoadingPosts } = useQuery<PostWithAuthor[]>({
    queryKey: ['course-posts', courseId],
    queryFn: async () => {
      // This logic is a placeholder. You'd likely filter posts by a course tag or category.
      const { data } = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return data;
    },
    enabled: !!courseId,
  });

  if (isLoadingCourse) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center p-8">Curso não encontrado.</div>;
  }
  
  const instructor = course.profiles;

  return (
    <div className="flex-1 p-6 bg-muted/40">
      <div className="max-w-7xl mx-auto">
        {/* Course Header */}
        <div className="mb-6">
          <p className="text-primary font-semibold mb-1">{course.level}</p>
          <h1 className="text-4xl font-bold mb-2">{course.title}</h1>
          <p className="text-lg text-muted-foreground">{course.description}</p>
          <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {course.duration}
            </div>
            <div className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              {course.students_count} estudantes
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              {course.rating} Avaliação
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <img src={course.thumbnail_url || '/placeholder.svg'} alt={course.title} className="w-full h-auto object-cover rounded-t-lg" />
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Sobre o Curso</h3>
                <p>
                  {course.description}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Conteúdo do Curso</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Módulo 1: Introdução</p>
                    <Badge variant="secondary">3 aulas</Badge>
                  </div>
                  <Progress value={33} />
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Módulo 2: Intermediário</p>
                    <Badge variant="secondary">5 aulas</Badge>
                  </div>
                  <Progress value={66} />
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Módulo 3: Avançado</p>
                    <Badge variant="secondary">2 aulas</Badge>
                  </div>
                  <Progress value={100} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <Button 
                  onClick={handleEnrollClick}
                  className="w-full mb-4"
                  disabled={isLoadingEnrollment}
                >
                  {isLoadingEnrollment ? 'Carregando...' : 
                   isEnrolled ? 'Continuar Curso' : 
                   Number(course.price) === 0 ? 'Matricular Gratuitamente' : 
                   `Inscrever Agora - R$${Number(course.price).toFixed(2)}`
                  }
                </Button>
                <div className="text-center text-sm mb-4">
                  <p>Garantia de 30 dias</p>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart className="w-4 h-4" />
                    Nível {course.level}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {course.students_count} estudantes
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {course.rating} Avaliações
                  </div>
                </div>
              </CardContent>
            </Card>

            {instructor && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Instrutor</h3>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={instructor.avatar_url ?? undefined} />
                      <AvatarFallback>{instructor.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{instructor.name}</p>
                      <p className="text-sm text-muted-foreground">Ingressou em {format(new Date(instructor.created_at), "MMM yyyy", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {instructor.bio}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
