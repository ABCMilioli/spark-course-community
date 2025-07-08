import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Class, ClassEnrollment, ClassCourse, ClassInstanceContent } from "@/types";
import { AddCourseToClassModal } from "@/components/Admin/AddCourseToClassModal";
import { CreateClassContentModal } from "@/components/Admin/CreateClassContentModal";
import { AddStudentToClassModal } from "@/components/Admin/AddStudentToClassModal";
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
  console.log('[fetchClassCourses] Iniciando requisição...');
  try {
    const token = localStorage.getItem('token');
    console.log('[fetchClassCourses] Token:', token);
    console.log('[fetchClassCourses] Buscando cursos da turma:', classId);
    
    const response = await fetch(`/api/classes/${classId}/courses`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('[fetchClassCourses] Status da resposta:', response.status);
    console.log('[fetchClassCourses] Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('[fetchClassCourses] Resposta bruta:', responseText);
    
    if (!response.ok) {
      console.error('[fetchClassCourses] Erro na resposta:', response.status, responseText);
      throw new Error('Erro ao carregar cursos');
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('[fetchClassCourses] Cursos encontrados:', data.length, data);
    } catch (parseError) {
      console.error('[fetchClassCourses] Erro ao fazer parse do JSON:', parseError);
      console.error('[fetchClassCourses] Texto que falhou o parse:', responseText);
      throw new Error('Erro ao processar resposta do servidor');
    }
    
    return data;
  } catch (error) {
    console.error('[fetchClassCourses] Erro ao fazer requisição:', error);
    throw error;
  }
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isCreateContentModalOpen, setIsCreateContentModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [courseToRemove, setCourseToRemove] = useState<ClassCourse | null>(null);

  const { data: classDetails, isLoading: isLoadingClass } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => fetchClassDetails(classId!),
    enabled: !!classId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false
  });

  const { data: enrollments, isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['class-enrollments', classId],
    queryFn: () => fetchClassEnrollments(classId!),
    enabled: !!classId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false
  });

  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['class-courses', classId],
    queryFn: () => fetchClassCourses(classId!),
    enabled: !!classId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false
  });

  const { data: content, isLoading: isLoadingContent } = useQuery({
    queryKey: ['class-content', classId],
    queryFn: () => fetchClassContent(classId!),
    enabled: !!classId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false
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
      toast.success('Conteúdo criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Mutation para matricular usuário
  const enrollUserMutation = useMutation({
    mutationFn: async (data: { user_id: string; role: string }) => {
      const response = await fetch(`/api/classes/${classId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao matricular usuário');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-enrollments', classId] });
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
      toast.success('Usuário matriculado com sucesso!');
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

  const handleRemoveCourse = (course: ClassCourse) => {
    setCourseToRemove(course);
  };

  const confirmRemoveCourse = () => {
    if (courseToRemove) {
      removeCourseMutation.mutate(courseToRemove.course_id);
      setCourseToRemove(null);
    }
  };

  const handleCreateContent = () => {
    setIsCreateContentModalOpen(true);
  };

  const handleContentSuccess = (contentData: { title: string; content: string; content_type: 'announcement' | 'material' | 'assignment'; is_pinned: boolean; file?: File }) => {
    createContentMutation.mutate(contentData);
    setIsCreateContentModalOpen(false);
  };

  const handleAddStudent = () => {
    setIsAddStudentModalOpen(true);
  };

  const handleStudentSuccess = (data: { user_id: string; role: string }) => {
    enrollUserMutation.mutate(data);
    setIsAddStudentModalOpen(false);
  };

  const handleViewCourse = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  const handleSettings = () => {
    navigate(`/classes/${classId}/manage`);
  };

  if (isLoadingClass) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <Skeleton className="h-6 sm:h-8 w-2/3 sm:w-1/3" />
          <Skeleton className="h-4 w-full sm:w-1/2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 sm:h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!classDetails) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">Turma não encontrada</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">A turma que você está procurando não existe ou você não tem acesso.</p>
          <Button asChild>
            <Link to="/classes">Voltar para Turmas</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link to="/classes">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{classDetails.instance_name}</h1>
            <div className="flex items-center gap-2">
              {classDetails.is_public ? (
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              ) : (
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              )}
              <Badge variant={classDetails.is_public ? "default" : "secondary"} className="text-xs sm:text-sm">
                {classDetails.is_public ? "Pública" : "Privada"}
              </Badge>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Criada por {classDetails.instructor_name} • {new Date(classDetails.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {(isInstructor || isAdmin) && (
          <Button variant="outline" size="sm" onClick={handleSettings} className="w-fit">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        )}
      </div>

      {classDetails.instance_description && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm sm:text-base text-muted-foreground">{classDetails.instance_description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold">{classDetails.current_students}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Alunos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold">{courses?.length || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Cursos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold">{content?.length || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Conteúdo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-bold">
                  {classDetails.max_students ? `${classDetails.current_students}/${classDetails.max_students}` : '∞'}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Capacidade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-1 sm:p-2 mb-6 sm:mb-8 bg-background border-b border-border rounded-t-lg sticky top-0 z-10">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 h-auto min-h-[44px] sm:min-h-[48px]">Visão Geral</TabsTrigger>
          <TabsTrigger value="enrollments" className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 h-auto min-h-[44px] sm:min-h-[48px]">Matrículas</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 h-auto min-h-[44px] sm:min-h-[48px]">Cursos</TabsTrigger>
          <TabsTrigger value="content" className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 h-auto min-h-[44px] sm:min-h-[48px]">Conteúdo</TabsTrigger>
        </TabsList>
        <div className="pt-2 sm:pt-4"> {/* Adiciona espaçamento superior para separar as abas do conteúdo */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                    Conteúdo Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingContent ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 sm:h-16" />
                      ))}
                    </div>
                  ) : content?.length === 0 ? (
                    <p className="text-sm sm:text-base text-muted-foreground text-center py-4">Nenhum conteúdo ainda</p>
                  ) : (
                    <div className="space-y-3">
                      {content?.slice(0, 3).map((item: ClassInstanceContent) => (
                        <div key={item.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border">
                          {item.is_pinned && <Pin className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 mt-1 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm sm:text-base truncate">{item.title}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">{item.author_name}</p>
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
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    Matrículas Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingEnrollments ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 sm:h-16" />
                      ))}
                    </div>
                  ) : enrollments?.length === 0 ? (
                    <p className="text-sm sm:text-base text-muted-foreground text-center py-4">Nenhuma matrícula ainda</p>
                  ) : (
                    <div className="space-y-3">
                      {enrollments?.slice(0, 3).map((enrollment: ClassEnrollment) => (
                        <div key={enrollment.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border">
                          <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${enrollment.user_name}`} />
                            <AvatarFallback className="text-xs sm:text-sm">{enrollment.user_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm sm:text-base truncate">{enrollment.user_name}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground capitalize">{enrollment.role}</p>
                          </div>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
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

          <TabsContent value="enrollments" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mt-12 sm:mt-16">
              <h2 className="text-xl sm:text-2xl font-bold">Matrículas</h2>
              {(isInstructor || isAdmin) && (
                <Button size="sm" onClick={handleAddStudent} className="w-fit">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar Aluno
                </Button>
              )}
            </div>

            {isLoadingEnrollments ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 sm:h-32" />
                ))}
              </div>
            ) : enrollments?.length === 0 ? (
              <Card>
                <CardContent className="p-8 sm:p-12 text-center">
                  <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Nenhuma matrícula</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    Ainda não há alunos matriculados nesta turma.
                  </p>
                  {(isInstructor || isAdmin) && (
                    <Button onClick={handleAddStudent}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Aluno
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {enrollments?.map((enrollment: ClassEnrollment) => (
                  <Card key={enrollment.id}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                          <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${enrollment.user_name}`} />
                          <AvatarFallback className="text-sm">{enrollment.user_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{enrollment.user_name}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{enrollment.user_email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <Badge variant="outline" className="capitalize text-xs">
                          {enrollment.role}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(enrollment.enrolled_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="courses" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mt-12 sm:mt-16">
              <h2 className="text-xl sm:text-2xl font-bold">Cursos da Turma</h2>
              {(isInstructor || isAdmin) && (
                <Button size="sm" onClick={handleAddCourse} className="w-fit">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Curso
                </Button>
              )}
            </div>

            {isLoadingCourses ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 sm:h-48" />
                ))}
              </div>
            ) : courses?.length === 0 ? (
              <Card>
                <CardContent className="p-8 sm:p-12 text-center">
                  <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Nenhum curso</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {courses?.map((course: ClassCourse) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg line-clamp-2">{course.course_title}</CardTitle>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                            {course.course_description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          {course.is_required && (
                            <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                          )}
                          {(isInstructor || isAdmin) && !course.is_required && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCourse(course)}
                              disabled={removeCourseMutation.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Ordem: {course.order_index}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewCourse(course.course_id)}
                          className="text-xs"
                        >
                          Ver Curso
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mt-12 sm:mt-16">
              <h2 className="text-xl sm:text-2xl font-bold">Conteúdo da Turma</h2>
              {(isInstructor || isAdmin) && (
                <Button size="sm" onClick={handleCreateContent} className="w-fit">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Conteúdo
                </Button>
              )}
            </div>

            {isLoadingContent ? (
              <div className="space-y-3 sm:space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 sm:h-24" />
                ))}
              </div>
            ) : content?.length === 0 ? (
              <Card>
                <CardContent className="p-8 sm:p-12 text-center">
                  <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Nenhum conteúdo</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
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
              <div className="space-y-3 sm:space-y-4">
                {content?.map((item: ClassInstanceContent) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {item.is_pinned && (
                          <Pin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg line-clamp-2">{item.title}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                                  <AvatarImage src={item.author_avatar} />
                                  <AvatarFallback className="text-xs">{item.author_name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs sm:text-sm text-muted-foreground truncate">{item.author_name}</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {item.content_type}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          
                          {item.content && (
                            <p className="text-sm sm:text-base text-muted-foreground line-clamp-2 mb-3">{item.content}</p>
                          )}
                          
                          {item.file_url && (
                            <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <File className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs sm:text-sm truncate">{item.file_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(1)} MB` : ''} • {item.file_type}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(item.file_url, '_blank')}
                                  className="text-xs flex-shrink-0"
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
        </div>
      </Tabs>

      {/* Modal de confirmação para remover curso */}
      <AlertDialog open={!!courseToRemove} onOpenChange={() => setCourseToRemove(null)}>
        <AlertDialogContent className="max-w-sm sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Remover Curso da Turma</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Tem certeza que deseja remover o curso "{courseToRemove?.course_title}" desta turma? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveCourse}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
              disabled={removeCourseMutation.isPending}
            >
              {removeCourseMutation.isPending ? 'Removendo...' : 'Remover Curso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Modal para adicionar aluno */}
      <AddStudentToClassModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSuccess={handleStudentSuccess}
        classId={classId!}
        isLoading={enrollUserMutation.isPending}
      />
    </div>
  );
}