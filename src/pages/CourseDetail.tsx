import { useParams, useNavigate } from "react-router-dom";
import { Clock, BarChart, User, Star, Users, MessageSquare, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PostCard } from "@/components/Community/PostCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from 'axios';
import { CourseWithInstructor, PostWithAuthor } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { parsePrice, formatPrice, isFreeCourse } from '@/lib/price';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const queryClient = useQueryClient();
  const [cpf, setCpf] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showCpfModal, setShowCpfModal] = useState(false);

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

    if (isFreeCourse(course.price)) {
      // Curso gratuito - matricular direto
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/enrollments`, {
          course_id: courseId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Matrícula realizada com sucesso!');
        // Recarregar matrícula antes de redirecionar
        await queryClient.invalidateQueries({ queryKey: ['course-enrollment', courseId] });
        // Invalidar cache dos cursos matriculados
        await queryClient.invalidateQueries({ queryKey: ['enrolled-courses', user?.id] });
        // Redirecionar para a página de detalhes do curso
        navigate(`/course/${courseId}`);
      } catch (error) {
        console.error('Erro ao matricular:', error);
        toast.error('Erro ao realizar matrícula');
      }
    } else {
      // Curso pago - verificar tipo de checkout
      const isInternalCheckout = course.payment_gateway === 'mercadopago' || course.payment_gateway === 'stripe';
      
      if (isInternalCheckout) {
        // Checkout interno - redirecionar para página de pagamento
        navigate(`/payment?courseId=${courseId}`);
      } else {
        // Checkout externo - abrir modal para CPF
        setShowCpfModal(true);
      }
    }
  };

  // Fluxo para pagamento externo (chamado pelo modal)
  const handleExternalPayment = async () => {
    if (!cpf || cpf.length < 11) {
      toast.error('Informe um CPF válido');
      return;
    }
    setIsRedirecting(true);
    try {
      // Salvar CPF permanentemente no banco (cria usuário se não existir)
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/external/save-cpf`, {
        cpf: cpf.replace(/\D/g, ''),
        course_id: course.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fechar modal e redirecionar para o checkout externo
      setShowCpfModal(false);
      window.location.href = course.external_checkout_url;
    } catch (err) {
      console.error('Erro ao salvar CPF:', err);
      toast.error('Erro ao processar checkout externo');
      setIsRedirecting(false);
    }
  };

  // Buscar posts relacionados ao curso (por tags ou categoria)
  const { data: posts, isLoading: isLoadingPosts } = useQuery<PostWithAuthor[]>({
    queryKey: ['course-posts', courseId],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Filtrar posts que tenham tags relacionadas ao curso
      if (course?.tags && course.tags.length > 0) {
        return data.filter((post: PostWithAuthor) => 
          post.tags && post.tags.some(tag => course.tags.includes(tag))
        ).slice(0, 2); // Limitar a 2 posts
      }
      return data.slice(0, 2); // Retornar apenas 2 posts se não houver filtro
    },
    enabled: !!courseId && !!course,
  });

  const { data: ratingStats } = useQuery({
    queryKey: ['course-rating-stats', courseId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/rating-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!courseId,
  });

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'Duração não informada';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

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
  
  const instructor = course.instructor || { name: course.instructor_name, avatar_url: course.instructor_avatar };

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
              {course.total_duration ? formatDuration(course.total_duration) : course.duration || 'Duração não informada'}
            </div>
            <div className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              {course.enrolled_students_count || course.students_count || 0} estudantes
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              {typeof ratingStats?.average_rating === 'number' && !isNaN(ratingStats.average_rating) ? ratingStats.average_rating.toFixed(1) : '0.0'} ({ratingStats?.total_ratings || 0} Avaliações)
            </div>
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              {course.total_lessons || 0} aulas
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
            
            {/* Conteúdo do Curso - Agora com dados reais */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Conteúdo do Curso</h3>
                {course.modules && course.modules.length > 0 ? (
                  <div className="space-y-4">
                    {course.modules.map((module, index) => (
                      <div key={module.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Módulo {module.module_order}: {module.title}</p>
                          <Badge variant="secondary">{module.lessons.length} aulas</Badge>
                        </div>
                        {module.lessons.length > 0 && (
                          <div className="ml-4 space-y-1">
                            {module.lessons.slice(0, 3).map((lesson) => (
                              <div key={lesson.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Play className="w-3 h-3" />
                                {lesson.title}
                                {lesson.duration && (
                                  <span className="text-xs">({lesson.duration})</span>
                                )}
                              </div>
                            ))}
                            {module.lessons.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{module.lessons.length - 3} aulas
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum conteúdo disponível ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Posts Relacionados */}
            {posts && posts.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Posts Relacionados</h3>
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
                   isFreeCourse(course.price) ? 'Matricular Gratuitamente' : 
                   `Inscrever Agora - ${formatPrice(course.price)}`
                  }
                </Button>
                <div className="text-center text-sm mb-4">
                  <p>Garantia de 30 dias</p>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {course.total_duration ? formatDuration(course.total_duration) : course.duration || 'Duração não informada'}
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart className="w-4 h-4" />
                    Nível {course.level}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {course.enrolled_students_count || course.students_count || 0} estudantes
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {typeof ratingStats?.average_rating === 'number' && !isNaN(ratingStats.average_rating) ? ratingStats.average_rating.toFixed(1) : '0.0'} ({ratingStats?.total_ratings || 0} Avaliações)
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    {course.total_lessons || 0} aulas
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
                      <AvatarFallback>{instructor.name?.[0] || 'I'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{instructor.name}</p>
                      {instructor.created_at && (
                        <p className="text-sm text-muted-foreground">
                          Ingressou em {format(new Date(instructor.created_at), "MMM yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  {instructor.bio && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {instructor.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <div className="mt-8">
          {/* Botão único de pagamento/matrícula */}
          {isEnrolled ? (
            <Button onClick={() => navigate(`/player?courseId=${courseId}`)}>
              Acessar Curso
            </Button>
          ) : isFreeCourse(course.price) ? (
            <Button onClick={handleEnrollClick}>
              Matricular-se Gratuitamente
            </Button>
          ) : (
            // Curso pago - botão único que se comporta conforme o checkout
            <Button onClick={handleEnrollClick} className="w-full">
              {(() => {
                if (course.payment_gateway === 'mercadopago') return 'Comprar com Mercado Pago';
                if (course.payment_gateway === 'stripe') return 'Comprar com Stripe';
                if (course.payment_gateway === 'hotmart') return 'Comprar no Hotmart';
                if (course.payment_gateway === 'kiwify') return 'Comprar no Kiwify';
                return 'Comprar Curso';
              })()}
            </Button>
          )}
        </div>

        {/* Modal para CPF (Checkout Externo) */}
        <Dialog open={showCpfModal} onOpenChange={setShowCpfModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Informe seu CPF</DialogTitle>
              <DialogDescription>
                Para prosseguir com a compra no {course?.payment_gateway === 'hotmart' ? 'Hotmart' : 'Kiwify'}, 
                precisamos do seu CPF para salvar no sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                  maxLength={14}
                  disabled={isRedirecting}
                />
                <p className="text-xs text-muted-foreground">
                  Seu CPF será salvo permanentemente no sistema para facilitar futuras compras.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowCpfModal(false)}
                disabled={isRedirecting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleExternalPayment} 
                disabled={isRedirecting || !cpf || cpf.length < 11}
              >
                {isRedirecting ? 'Processando...' : 'Continuar para Checkout'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
