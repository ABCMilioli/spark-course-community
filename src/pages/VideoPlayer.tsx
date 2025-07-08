import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CustomVideoPlayer } from '@/components/VideoPlayer/CustomVideoPlayer';
import { LessonComments } from '@/components/VideoPlayer/LessonComments';
import { CourseRating } from '@/components/Courses/CourseRating';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, BookOpen, CheckCircle, ArrowLeft, Star, MessageSquare } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { CourseForPlayer, ModuleWithLessons, LessonWithCompletion } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function VideoPlayer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const courseId = searchParams.get('courseId');
  const lessonId = searchParams.get('lessonId');
  
  const [currentLesson, setCurrentLesson] = useState<LessonWithCompletion | null>(null);

  const { data: course, isLoading: isLoadingCourse, error: courseError } = useQuery({
    queryKey: ['course-for-player', courseId],
    queryFn: async () => {
      if (!user || !courseId) return null;
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/courses/${courseId}/player`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: !!user && !!courseId,
  });

  useEffect(() => {
    if (course) {
      let lessonToSet = null;
      if (lessonId) {
        for (const module of course.modules) {
          const found = module.lessons.find(l => l.id === lessonId);
          if (found) {
            lessonToSet = found;
            break;
          }
        }
      }
      
      if (!lessonToSet && course.modules.length > 0 && course.modules[0].lessons.length > 0) {
        lessonToSet = course.modules[0].lessons[0];
      }
      setCurrentLesson(lessonToSet);
    }
  }, [course, lessonId]);


  const getLessonIndices = (lesson: LessonWithCompletion | null) => {
    if (!course || !lesson) return { moduleIndex: -1, lessonIndex: -1 };
    for (let i = 0; i < course.modules.length; i++) {
        const lessonIdx = course.modules[i].lessons.findIndex(l => l.id === lesson.id);
        if (lessonIdx !== -1) {
            return { moduleIndex: i, lessonIndex: lessonIdx };
        }
    }
    return { moduleIndex: -1, lessonIndex: -1 };
  }

  const { moduleIndex: currentModuleIndex, lessonIndex: currentLessonIndex } = getLessonIndices(currentLesson);

  const handleProgress = async (percentage: number) => {
    if (!currentLesson || currentLesson.isCompleted) return;
    if (percentage >= 95) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/lessons/${currentLesson.id}/complete`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentLesson({ ...currentLesson, isCompleted: true });
        queryClient.invalidateQueries({ queryKey: ['course-for-player', courseId] });
      } catch (err) {
        console.error('Erro ao marcar aula como concluída:', err);
      }
    }
  }

  const setLesson = (lesson: LessonWithCompletion) => {
    setCurrentLesson(lesson);
    setSearchParams({ courseId: courseId!, lessonId: String(lesson.id) });
  };

  const handlePrevious = () => {
    if (!course || currentLessonIndex === -1) return;
    
    if (currentLessonIndex > 0) {
      setLesson(course.modules[currentModuleIndex].lessons[currentLessonIndex - 1]);
    } else if (currentModuleIndex > 0) {
      const prevModule = course.modules[currentModuleIndex - 1];
      setLesson(prevModule.lessons[prevModule.lessons.length - 1]);
    }
  };

  const handleNext = () => {
    if (!course || currentLessonIndex === -1) return;
    
    const currentModule = course.modules[currentModuleIndex];
    
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      setLesson(currentModule.lessons[currentLessonIndex + 1]);
    } else if (currentModuleIndex < course.modules.length - 1) {
      const nextModule = course.modules[currentModuleIndex + 1];
      setLesson(nextModule.lessons[0]);
    }
  };

  const hasPrevious = () => {
    return currentModuleIndex > 0 || currentLessonIndex > 0;
  };

  const hasNext = () => {
    if (!course || currentLessonIndex === -1) return false;
    const currentModule = course.modules[currentModuleIndex];
    return currentModuleIndex < course.modules.length - 1 || 
           currentLessonIndex < currentModule.lessons.length - 1;
  };
  
  if (isLoadingCourse) {
    return <div className="container mx-auto px-6 py-8 text-center"><p>Carregando...</p></div>;
  }

  // Verificar se houve erro de acesso negado
  if (courseError) {
    const axiosError = courseError as any; // Tratar como AxiosError
    const isAccessDenied = axiosError.response?.status === 403;
    
    // Se for erro de acesso negado, redirecionar para a página do curso
    if (isAccessDenied && courseId) {
      navigate(`/course/${courseId}`);
      return null; // Não renderizar nada durante o redirecionamento
    }
    
    // Para outros erros, mostrar mensagem de erro
    const errorMessage = axiosError.response?.data?.error || 'Erro ao carregar o curso';
    
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-destructive mb-4">
              Erro
            </h2>
            <p className="text-muted-foreground mb-6">
              {errorMessage}
            </p>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/courses')}
                className="w-full"
              >
                Voltar para Cursos
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="container mx-auto px-6 py-8 text-center">
        <p>Curso ou aula não encontrado.</p>
        <Button onClick={() => navigate('/courses')} className="mt-4">Voltar para cursos</Button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/course/${String(courseId)}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para o curso
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{course.title}</h1>
              <p className="text-sm text-muted-foreground">{currentLesson.title}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Progresso do Curso</p>
              <Progress value={course.progressPercentage || 0} className="w-32 mt-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-6">
            <CustomVideoPlayer
              videoUrl={currentLesson.video_url}
              youtubeId={currentLesson.youtube_id || ''}
              onProgress={handleProgress}
              onPrevious={handlePrevious}
              onNext={handleNext}
              hasPrevious={hasPrevious()}
              hasNext={hasNext()}
            />
            
            {/* Lesson Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{currentLesson.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {currentLesson.duration}
                      </div>
                      <Badge variant="outline">
                        Módulo {currentModuleIndex + 1}
                      </Badge>
                    </div>
                  </div>
                  {currentLesson.isCompleted && (
                    <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Concluída
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {currentLesson.description && (
                <CardContent>
                  <p className="text-muted-foreground">{currentLesson.description}</p>
                </CardContent>
              )}
            </Card>

            {/* Sistema de Comentários e Avaliações */}
            <Tabs defaultValue="comments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comentários da Aula
                </TabsTrigger>
                <TabsTrigger value="rating" className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Avaliar Curso
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="comments" className="mt-4">
                <LessonComments lessonId={String(currentLesson.id)} />
              </TabsContent>
              
              <TabsContent value="rating" className="mt-4">
                <CourseRating 
                  courseId={String(courseId)} 
                  onRatingChange={() => {
                    // Atualizar dados do curso se necessário
                    queryClient.invalidateQueries({ queryKey: ['course-for-player', courseId] });
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Course Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Conteúdo do Curso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.modules.map((module, moduleIdx) => (
                  <div key={module.id} className="space-y-2">
                    <h4 className="font-medium text-sm">{module.title}</h4>
                    <div className="space-y-1">
                      {module.lessons.map((lesson) => (
                        <Button
                          key={lesson.id}
                          variant={lesson.id === currentLesson.id ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 px-3"
                          onClick={() => setLesson(lesson)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {lesson.isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 border-2 border-muted-foreground rounded-full flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate">{lesson.title}</p>
                              <p className="text-xs text-muted-foreground">{lesson.duration}</p>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
