import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, BookOpen, MessageSquare, Eye, Lock, Calendar, 
  Plus, ArrowLeft, Settings, UserPlus, FileText, Pin, Trash2, Edit, File
} from "lucide-react";
import { Class, ClassEnrollment, ClassCourse, ClassInstanceContent } from "@/types";
import { AddCourseToClassModal } from "@/components/Admin/AddCourseToClassModal";
import { CreateClassContentModal } from "@/components/Admin/CreateClassContentModal";
import { toast } from "sonner";

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
  console.log('[fetchClassCourses] Buscando cursos da turma:', classId);
  
  const response = await fetch(`/api/classes/${classId}/courses`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  console.log('[fetchClassCourses] Status da resposta:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[fetchClassCourses] Erro na resposta:', response.status, errorText);
    throw new Error('Erro ao carregar cursos');
  }
  
  const data = await response.json();
  console.log('[fetchClassCourses] Cursos encontrados:', data.length, data);
  
  return data;
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isCreateContentModalOpen, setIsCreateContentModalOpen] = useState(false);

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

  // Mutation para remover curso da turma
  const removeCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await fetch(`/api/classes/${classId}/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao remover curso');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-courses', classId] });
      toast.success('Curso removido da turma com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Mutation para criar conteúdo
  const createContentMutation = useMutation({
    mutationFn: async (contentData: { title: string; content: string; content_type: 'announcement' | 'material' | 'assignment'; is_pinned: boolean; file?: File }) => {
      const formData = new FormData();
      formData.append('title', contentData.title);
      formData.append('content', contentData.content);
      formData.append('content_type', contentData.content_type);
      formData.append('is_pinned', contentData.is_pinned.toString());
      
      if (contentData.file) {
        formData.append('file', contentData.file);
      }
      
      const response = await fetch(`/api/classes/${classId}/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar conteúdo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-content', classId] });
      setIsCreateContentModalOpen(false);
      toast.success('Conteúdo criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleAddCourse = () => {
    setIsAddCourseModalOpen(true);
  };

  const handleCourseSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['class-courses', classId] });
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!confirm('Tem certeza que deseja remover este curso da turma?')) {
      return;
    }
    
    removeCourseMutation.mutate(courseId);
  };

  const handleCreateContent = () => {
    setIsCreateContentModalOpen(true);
  };

  const handleContentSuccess = (contentData: { title: string; content: string; content_type: 'announcement' | 'material' | 'assignment'; is_pinned: boolean; file?: File }) => {
    createContentMutation.mutate(contentData);
  };

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
            <h1 className="text-3xl font-bold">{classDetails.instance_name}</h1>
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

      {classDetails.instance_description && (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{classDetails.instance_description}</p>
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
                    {content?.slice(0, 3).map((item: ClassInstanceContent) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        {item.is_pinned && <Pin className="w-4 h-4 text-orange-500 mt-1" />}
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.author_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            {item.file_url && (
                              <File className="w-3 h-3 text-blue-500" />
                            )}
                          </div>
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
              <Button size="sm" onClick={handleAddCourse}>
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
                  <Button onClick={handleAddCourse}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeiro Curso
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses?.map((course: ClassCourse) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{course.course_title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                          {course.course_description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {course.is_required && (
                          <Badge variant="destructive">Obrigatório</Badge>
                        )}
                        {(isInstructor || isAdmin) && !course.is_required && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCourse(course.course_id)}
                            disabled={removeCourseMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
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
              <Button size="sm" onClick={handleCreateContent}>
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
                  <Button onClick={handleCreateContent}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Conteúdo
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {content?.map((item: ClassInstanceContent) => (
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
                        
                        {item.content && (
                          <p className="text-muted-foreground line-clamp-2 mb-3">{item.content}</p>
                        )}
                        
                        {item.file_url && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <File className="w-5 h-5 text-blue-500" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.file_name}</p>
                                <p className="text-xs text-gray-500">
                                  {item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(1)} MB` : ''} • {item.file_type}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(item.file_url, '_blank')}
                              >
                                Baixar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal para adicionar curso */}
      <AddCourseToClassModal
        isOpen={isAddCourseModalOpen}
        onClose={() => setIsAddCourseModalOpen(false)}
        onSuccess={handleCourseSuccess}
        classId={classId!}
        isLoading={false}
      />

      {/* Modal para criar conteúdo */}
      <CreateClassContentModal
        isOpen={isCreateContentModalOpen}
        onClose={() => setIsCreateContentModalOpen(false)}
        onSubmit={handleContentSuccess}
        isLoading={createContentMutation.isPending}
      />
    </div>
  );
} 