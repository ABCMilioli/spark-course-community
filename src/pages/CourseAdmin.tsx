import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast as sonnerToast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowLeft, Eye, EyeOff, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CourseForAdmin, Profile } from '@/types';
import { useEffect, useState } from 'react';
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

const API_URL = process.env.REACT_APP_API_URL || '/api';

const lessonSchema = z.object({
  id: z.string(),
  title: z.string().min(3, "O título da aula deve ter pelo menos 3 caracteres."),
  duration: z.string().min(4, "A duração deve ser no formato (ex: 10 min)."),
  youtube_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_visible: z.boolean().default(true),
  release_days: z.number().min(0, "Dias de liberação deve ser 0 ou maior.").default(0),
});

const moduleSchema = z.object({
  id: z.string(),
  title: z.string().min(3, "O título do módulo deve ter pelo menos 3 caracteres."),
  is_visible: z.boolean().default(true),
  lessons: z.array(lessonSchema),
});

const courseSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres.").optional().nullable(),
  instructor_id: z.string({ required_error: "Selecione um instrutor." }).optional().nullable(),
  modules: z.array(moduleSchema),
});

type CourseFormValues = z.infer<typeof courseSchema>;

async function fetchCourseAdmin(courseId: string) {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/courses/${courseId}/admin`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export default function CourseAdmin() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Estados para confirmação de deleção
  const [deleteModule, setDeleteModule] = useState<{ index: number; title: string } | null>(null);
  const [deleteLesson, setDeleteLesson] = useState<{ moduleIndex: number; lessonIndex: number; title: string } | null>(null);

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course-admin', courseId],
    queryFn: () => fetchCourseAdmin(courseId),
    enabled: !!courseId,
    retry: 1,
  });

  // Tratar erros de carregamento
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar curso:', error);
      sonnerToast.error("Erro ao carregar curso", {
        description: "Verifique se o curso existe e você tem permissão para editá-lo."
      });
    }
  }, [error]);

  const { data: instructors, isLoading: isLoadingInstructors } = useQuery<Profile[]>({
      queryKey: ['instructors'],
      queryFn: async () => {
          const token = localStorage.getItem('token');
          const { data } = await axios.get(`${API_URL}/instructors`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return data;
      },
  });

  // Mutation para salvar o curso
  const saveCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/courses/${courseId}/admin`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: (data) => {
      sonnerToast.success("Curso salvo com sucesso!", {
        description: `O curso "${data.title}" foi atualizado.`
      });
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['course-admin', courseId] });
      queryClient.invalidateQueries({ queryKey: ['all-courses'] });
    },
    onError: (error: any) => {
      console.error('Erro ao salvar curso:', error);
      sonnerToast.error("Erro ao salvar curso", {
        description: error.response?.data?.error || "Verifique os dados e tente novamente."
      });
    }
  });

  // Handlers para remoção que salvam automaticamente
  const handleRemoveModule = async (moduleIndex: number) => {
    const currentData = form.getValues();
    const updatedModules = currentData.modules.filter((_, index) => index !== moduleIndex);
    
    try {
      await saveCourseMutation.mutateAsync({
        ...currentData,
        modules: updatedModules
      });
      removeModule(moduleIndex);
      sonnerToast.success("Módulo removido com sucesso!");
    } catch (error) {
      console.error('Erro ao remover módulo:', error);
      sonnerToast.error("Erro ao remover módulo");
    }
  };

  const handleRemoveLesson = async (moduleIndex: number, lessonIndex: number) => {
    const currentData = form.getValues();
    const updatedModules = [...currentData.modules];
    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      lessons: updatedModules[moduleIndex].lessons.filter((_, index) => index !== lessonIndex)
    };
    
    try {
      await saveCourseMutation.mutateAsync({
        ...currentData,
        modules: updatedModules
      });
      // Atualizar o formulário com os dados salvos
      form.setValue('modules', updatedModules);
      sonnerToast.success("Aula removida com sucesso!");
    } catch (error) {
      console.error('Erro ao remover aula:', error);
      sonnerToast.error("Erro ao remover aula");
    }
  };

  // Handlers para abrir modais de confirmação
  const handleConfirmDeleteModule = (moduleIndex: number) => {
    const currentData = form.getValues();
    const module = currentData.modules[moduleIndex];
    setDeleteModule({ index: moduleIndex, title: module.title });
  };

  const handleConfirmDeleteLesson = (moduleIndex: number, lessonIndex: number) => {
    const currentData = form.getValues();
    const lesson = currentData.modules[moduleIndex].lessons[lessonIndex];
    setDeleteLesson({ moduleIndex, lessonIndex, title: lesson.title });
  };

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
  });

  useEffect(() => {
    if (course) {
      form.reset({
        ...course,
        title: course.title || '',
        description: course.description || '',
        instructor_id: course.instructor_id || '',
        modules: course.modules?.map(module => ({
          ...module,
          title: module.title || '',
          is_visible: module.is_visible !== undefined ? module.is_visible : true,
          lessons: module.lessons?.map(lesson => ({
            ...lesson,
            title: lesson.title || '',
            duration: lesson.duration || '',
            youtube_id: lesson.youtube_id || '',
            description: lesson.description || '',
            is_visible: lesson.is_visible !== undefined ? lesson.is_visible : true,
            release_days: lesson.release_days !== undefined ? lesson.release_days : 0,
          })) || []
        })) || []
      });
    }
  }, [course, form]);

  const { fields: moduleFields, append: appendModule, remove: removeModule } = useFieldArray({
    control: form.control,
    name: "modules",
  });

  if (isLoading || isLoadingInstructors) {
    return (
        <div className="container mx-auto px-6 py-8 text-center">
            <h1 className="text-2xl font-bold">Carregando editor do curso...</h1>
        </div>
    );
  }

  if (!course) {
    return (
        <div className="container mx-auto px-6 py-8 text-center">
            <h1 className="text-2xl font-bold">Curso não encontrado</h1>
            <p className="text-muted-foreground">O curso que você está tentando editar não existe.</p>
            <Button onClick={() => navigate('/admin')} className="mt-4">
                Voltar para o Painel
            </Button>
        </div>
    );
  }

  const onSubmit = (data: CourseFormValues) => {
    console.log("Salvando dados do curso:", data);
    saveCourseMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin?tab=courses')}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-3xl font-bold">Editar Curso</h1>
            <p className="text-muted-foreground">Administre o conteúdo do curso "{course.title}"</p>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Detalhes do Curso</CardTitle>
                    <CardDescription>Informações gerais sobre o curso.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Título do Curso</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl><Textarea {...field} className="min-h-[100px]" value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="instructor_id" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Instrutor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um instrutor" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {instructors?.map(inst => <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Módulos e Aulas</CardTitle>
                    <CardDescription>Organize o conteúdo do curso.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {moduleFields.map((module, moduleIndex) => (
                        <ModuleField 
                          key={module.id} 
                          form={form} 
                          moduleIndex={moduleIndex} 
                          removeModule={handleRemoveModule}
                          removeLesson={handleRemoveLesson}
                          confirmDeleteModule={handleConfirmDeleteModule}
                          confirmDeleteLesson={handleConfirmDeleteLesson}
                          saveCourseMutation={saveCourseMutation}
                        />
                    ))}
                    <Button type="button" variant="outline" className="mt-4" onClick={() => appendModule({ 
                      id: `new-module-${Date.now()}`, 
                      title: '', 
                      is_visible: true,
                      lessons: [] 
                    })}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Módulo
                    </Button>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={saveCourseMutation.isPending}>
                    {saveCourseMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
            </div>
        </form>
      </Form>

      {/* Modal de confirmação para deletar módulo */}
      <AlertDialog open={!!deleteModule} onOpenChange={() => setDeleteModule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão do módulo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o módulo "{deleteModule?.title}"? 
              Esta ação também removerá todas as aulas deste módulo e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteModule) {
                  handleRemoveModule(deleteModule.index);
                  setDeleteModule(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saveCourseMutation.isPending}
            >
              {saveCourseMutation.isPending ? "Removendo..." : "Excluir Módulo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmação para deletar aula */}
      <AlertDialog open={!!deleteLesson} onOpenChange={() => setDeleteLesson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão da aula</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a aula "{deleteLesson?.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteLesson) {
                  handleRemoveLesson(deleteLesson.moduleIndex, deleteLesson.lessonIndex);
                  setDeleteLesson(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saveCourseMutation.isPending}
            >
              {saveCourseMutation.isPending ? "Removendo..." : "Excluir Aula"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ModuleField({ 
  form, 
  moduleIndex, 
  removeModule, 
  removeLesson,
  confirmDeleteModule,
  confirmDeleteLesson,
  saveCourseMutation
}: { 
  form: any, 
  moduleIndex: number, 
  removeModule: (index: number) => void,
  removeLesson: (moduleIndex: number, lessonIndex: number) => void,
  confirmDeleteModule: (index: number) => void,
  confirmDeleteLesson: (moduleIndex: number, lessonIndex: number) => void,
  saveCourseMutation: any
}) {
    const { fields: lessonFields, append: appendLesson, remove: removeLessonField } = useFieldArray({
        control: form.control,
        name: `modules.${moduleIndex}.lessons`
    });

    return (
        <Accordion type="single" collapsible className="w-full bg-muted/20 p-4 rounded-lg border">
            <AccordionItem value={`item-${moduleIndex}`} className="border-none">
                <div className="flex items-center justify-between">
                    <AccordionTrigger className="flex-1">
                        <div className="flex items-center gap-3 w-full pr-4">
                            <FormField control={form.control} name={`modules.${moduleIndex}.title`} render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl><Input placeholder="Título do Módulo" {...field} className="text-base font-semibold" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name={`modules.${moduleIndex}.is_visible`} render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <Label className="text-sm flex items-center gap-1">
                                        {field.value ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        {field.value ? 'Visível' : 'Oculto'}
                                    </Label>
                                </FormItem>
                            )} />
                        </div>
                    </AccordionTrigger>
                    <Button type="button" variant="ghost" size="icon" onClick={() => confirmDeleteModule(moduleIndex)} disabled={saveCourseMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
                <AccordionContent className="space-y-4 pt-4">
                    {lessonFields.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="flex items-end gap-2 p-3 border rounded-md bg-background">
                             <div className="grid grid-cols-1 md:grid-cols-6 gap-2 flex-1">
                                <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.title`} render={({ field }) => (
                                    <FormItem><FormLabel>Aula</FormLabel><FormControl><Input placeholder="Título da Aula" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.duration`} render={({ field }) => (
                                    <FormItem><FormLabel>Duração</FormLabel><FormControl><Input placeholder="Ex: 15 min" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.youtube_id`} render={({ field }) => (
                                    <FormItem><FormLabel>ID do Vídeo</FormLabel><FormControl><Input placeholder="ex: dQw4w9WgXcQ" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.description`} render={({ field }) => (
                                    <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input placeholder="Descrição da aula" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.is_visible`} render={({ field }) => (
                                    <FormItem className="flex flex-col space-y-2">
                                        <FormLabel className="text-sm">Visível</FormLabel>
                                        <div className="flex items-center space-x-2">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <Label className="text-xs">
                                                {field.value ? 'Sim' : 'Não'}
                                            </Label>
                                        </div>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name={`modules.${moduleIndex}.lessons.${lessonIndex}.release_days`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Liberação (dias)
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                placeholder="0" 
                                                min="0"
                                                {...field} 
                                                value={field.value ?? 0}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                             </div>
                             <Button type="button" variant="ghost" size="icon" onClick={() => confirmDeleteLesson(moduleIndex, lessonIndex)} disabled={saveCourseMutation.isPending}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                             </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendLesson({ 
                      id: `new-lesson-${Date.now()}`, 
                      title: '', 
                      duration: '', 
                      youtube_id: '', 
                      description: '',
                      is_visible: true,
                      release_days: 0
                    })}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Aula
                    </Button>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}
