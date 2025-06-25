import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, BookOpen, MessageSquare, Eye, Lock, Calendar, 
  Plus, ArrowLeft, Settings, UserPlus, FileText, Pin
} from "lucide-react";
import { Class, ClassEnrollment, ClassCourse, ClassContent } from "@/types";

async function fetchClassDetails(classId: string) {
  const response = await fetch(`/api/classes/${classId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Erro ao carregar detalhes da turma');
  }
  
  return response.json();
}

async function fetchClassEnrollments(classId: string) {
  const response = await fetch(`/api/classes/${classId}/enrollments`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Erro ao carregar matrículas');
  }
  
  return response.json();
}

async function fetchClassCourses(classId: string) {
  const response = await fetch(`/api/classes/${classId}/courses`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Erro ao carregar cursos');
  }
  
  return response.json();
}

async function fetchClassContent(classId: string) {
  const response = await fetch(`/api/classes/${classId}/content`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Erro ao carregar conteúdo');
  }
  
  return response.json();
}

export default function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: classDetails, isLoading: isLoadingClass } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => fetchClassDetails(classId!),
    enabled: !!classId
  });

  const { data: enrollments, isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['class-enrollments', classId],
    queryFn: () => fetchClassEnrollments(classId!),
    enabled: !!classId
  });

  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['class-courses', classId],
    queryFn: () => fetchClassCourses(classId!),
    enabled: !!classId
  });

  const { data: content, isLoading: isLoadingContent } = useQuery({
    queryKey: ['class-content', classId],
    queryFn: () => fetchClassContent(classId!),
    enabled: !!classId
  });

  const isInstructor = classDetails?.instructor_id === user?.id;
  const isAdmin = user?.role === 'admin';

  if (isLoadingClass) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!classDetails) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Turma não encontrada</h1>
          <p className="text-muted-foreground mb-4">A turma que você está procurando não existe ou você não tem acesso.</p>
          <Button asChild>
            <Link to="/classes">Voltar para Turmas</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/classes">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{classDetails.name}</h1>
            {classDetails.is_public ? (
              <Eye className="w-5 h-5 text-green-600" />
            ) : (
              <Lock className="w-5 h-5 text-orange-600" />
            )}
            <Badge variant={classDetails.is_public ? "default" : "secondary"}>
              {classDetails.is_public ? "Pública" : "Privada"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Criada por {classDetails.instructor_name} • {new Date(classDetails.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {(isInstructor || isAdmin) && (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        )}
      </div>

      {classDetails.description && (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{classDetails.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{classDetails.current_students}</p>
                <p className="text-sm text-muted-foreground">Alunos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Cursos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{content?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Conteúdo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {classDetails.max_students ? `${classDetails.current_students}/${classDetails.max_students}` : '∞'}
                </p>
                <p className="text-sm text-muted-foreground">Capacidade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Conteúdo Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingContent ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : content?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum conteúdo ainda</p>
                ) : (
                  <div className="space-y-3">
                    {content?.slice(0, 3).map((item: ClassContent) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        {item.is_pinned && <Pin className="w-4 h-4 text-orange-500 mt-1" />}
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.author_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Matrículas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingEnrollments ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : enrollments?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma matrícula ainda</p>
                ) : (
                  <div className="space-y-3">
                    {enrollments?.slice(0, 3).map((enrollment: ClassEnrollment) => (
                      <div key={enrollment.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${enrollment.user_name}`} />
                          <AvatarFallback>{enrollment.user_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium">{enrollment.user_name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{enrollment.role}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(enrollment.enrolled_at).toLocaleDateString('pt-BR')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Matrículas</h2>
            {(isInstructor || isAdmin) && (
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Aluno
              </Button>
            )}
          </div>

          {isLoadingEnrollments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : enrollments?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma matrícula</h3>
                <p className="text-muted-foreground mb-4">
                  Ainda não há alunos matriculados nesta turma.
                </p>
                {(isInstructor || isAdmin) && (
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Aluno
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments?.map((enrollment: ClassEnrollment) => (
                <Card key={enrollment.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${enrollment.user_name}`} />
                        <AvatarFallback>{enrollment.user_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{enrollment.user_name}</h3>
                        <p className="text-sm text-muted-foreground">{enrollment.user_email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className="capitalize">
                        {enrollment.role}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(enrollment.enrolled_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Cursos da Turma</h2>
            {(isInstructor || isAdmin) && (
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Curso
              </Button>
            )}
          </div>

          {isLoadingCourses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : courses?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum curso</h3>
                <p className="text-muted-foreground mb-4">
                  Ainda não há cursos associados a esta turma.
                </p>
                {(isInstructor || isAdmin) && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Curso
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses?.map((course: ClassCourse) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{course.course_title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                          {course.course_description}
                        </p>
                      </div>
                      {course.is_required && (
                        <Badge variant="destructive">Obrigatório</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ordem: {course.order_index}</span>
                      <Button variant="outline" size="sm">
                        Ver Curso
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Conteúdo da Turma</h2>
            {(isInstructor || isAdmin) && (
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Criar Conteúdo
              </Button>
            )}
          </div>

          {isLoadingContent ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : content?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum conteúdo</h3>
                <p className="text-muted-foreground mb-4">
                  Ainda não há conteúdo criado nesta turma.
                </p>
                {(isInstructor || isAdmin) && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Conteúdo
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {content?.map((item: ClassContent) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {item.is_pinned && (
                        <Pin className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={item.author_avatar} />
                                <AvatarFallback>{item.author_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">{item.author_name}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.content_type}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-muted-foreground line-clamp-2">{item.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 