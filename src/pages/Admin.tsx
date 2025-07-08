import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, FileText, Video, UserPlus, Edit, Trash2, Settings, CreditCard } from "lucide-react";
import { CreateUserModal } from "@/components/Admin/CreateUserModal";
import { CreateCourseModal } from "@/components/Admin/CreateCourseModal";
import { CreatePostModal } from "@/components/Admin/CreatePostModal";
import { CreateWebhookModal } from "@/components/Admin/CreateWebhookModal";
import { WebhookLogsModal } from "@/components/Admin/WebhookLogsModal";
import { MinioTest } from "@/components/Admin/MinioTest";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from 'axios';
import { Profile, Course, Post, Webhook } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRole } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { DatabaseMigration } from '@/components/Admin/DatabaseMigration';
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function Admin() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Estados para modais
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [isCourseModalOpen, setCourseModalOpen] = useState(false);
  const [isPostModalOpen, setPostModalOpen] = useState(false);
  const [isWebhookModalOpen, setWebhookModalOpen] = useState(false);
  const [isWebhookLogsModalOpen, setWebhookLogsModalOpen] = useState(false);
  
  // Estados para edição
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [selectedWebhookForLogs, setSelectedWebhookForLogs] = useState<Webhook | null>(null);
  
  // Estados para confirmação de deleção
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [deletePost, setDeletePost] = useState<Post | null>(null);
  const [deleteWebhook, setDeleteWebhook] = useState<Webhook | null>(null);

  // Queries
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });

  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['all-courses'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });

  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['all-posts'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });

  const { data: webhooks, isLoading: isLoadingWebhooks, error: webhooksError } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      console.log('Fazendo requisição para webhooks...');
      console.log('Token:', token ? 'Presente' : 'Ausente');
      console.log('API_URL:', API_URL);
      try {
        const { data } = await axios.get(`${API_URL}/webhooks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Resposta dos webhooks:', data);
        return data;
      } catch (error) {
        console.error('Erro na requisição de webhooks:', error);
        throw error;
      }
    },
  });

  // Mutations para deletar
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Usuário deletado com sucesso!');
      setDeleteUser(null);
    },
    onError: () => {
      toast.error('Erro ao deletar usuário');
    }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-courses'] });
      toast.success('Curso deletado com sucesso!');
      setDeleteCourse(null);
    },
    onError: () => {
      toast.error('Erro ao deletar curso');
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-posts'] });
      toast.success('Post deletado com sucesso!');
      setDeletePost(null);
    },
    onError: () => {
      toast.error('Erro ao deletar post');
    }
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/webhooks/${webhookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deletado com sucesso!');
      setDeleteWebhook(null);
    },
    onError: () => {
      toast.error('Erro ao deletar webhook');
    }
  });

  // Handlers para editar
  const handleEditUser = (user: Profile) => {
    console.log('Editando usuário:', user);
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    console.log('Editando curso:', course);
    setEditingCourse(course);
    setCourseModalOpen(true);
  };

  const handleEditPost = (post: Post) => {
    console.log('Editando post:', post);
    setEditingPost(post);
    setPostModalOpen(true);
  };

  const handleEditWebhook = (webhook: Webhook) => {
    console.log('Editando webhook:', webhook);
    setEditingWebhook(webhook);
    setWebhookModalOpen(true);
  };

  const handleViewWebhookLogs = (webhook: Webhook) => {
    console.log('Visualizando logs do webhook:', webhook);
    setSelectedWebhookForLogs(webhook);
    setWebhookLogsModalOpen(true);
  };

  // Handlers para deletar
  const handleDeleteUser = (user: Profile) => {
    console.log('Deletando usuário:', user);
    setDeleteUser(user);
  };

  const handleDeleteCourse = (course: Course) => {
    console.log('Deletando curso:', course);
    setDeleteCourse(course);
  };

  const handleDeletePost = (post: Post) => {
    console.log('Deletando post:', post);
    setDeletePost(post);
  };

  const handleDeleteWebhook = (webhook: Webhook) => {
    console.log('Deletando webhook:', webhook);
    setDeleteWebhook(webhook);
  };

  // Handler para gerenciar conteúdo do curso
  const handleManageCourseContent = (course: Course) => {
    console.log('Gerenciando conteúdo do curso:', course);
    navigate(`/admin/course/edit/${course.id}`);
  };

  // Handlers para fechar modais
  const handleCloseUserModal = () => {
    setUserModalOpen(false);
    setEditingUser(null);
  };

  const handleCloseCourseModal = () => {
    setCourseModalOpen(false);
    setEditingCourse(null);
  };

  const handleClosePostModal = () => {
    setPostModalOpen(false);
    setEditingPost(null);
  };

  const handleCloseWebhookModal = () => {
    setWebhookModalOpen(false);
    setEditingWebhook(null);
  };

  const handleCloseWebhookLogsModal = () => {
    setWebhookLogsModalOpen(false);
    setSelectedWebhookForLogs(null);
  };

  // Callback para sucesso das operações
  const handleUserSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
  };

  const handleCourseSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['all-courses'] });
  };

  const handlePostSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['all-posts'] });
  };

  const handleWebhookSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['webhooks'] });
  };
  
  return (
    <div className="flex-1 p-6 space-y-6 bg-muted/40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Painel de Administração</h1>
          <p className="text-muted-foreground">Gerencie usuários, cursos e posts da plataforma.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ... (stats cards code - can be updated later to show real counts) ... */}
      </div>

              <Tabs defaultValue="users">
          <div className="flex justify-between items-end">
            <TabsList>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="courses">Cursos</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="payments">Pagamentos</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="minio">MinIO Test</TabsTrigger>
            </TabsList>
            {/* Add buttons */}
          </div>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usuários</CardTitle>
                <Button onClick={() => setUserModalOpen(true)} variant="outline" size="sm">Novo Usuário</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data de Ingresso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar_url ?? undefined} />
                              <AvatarFallback>{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge>{user.role}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cursos</CardTitle>
                <Button onClick={() => setCourseModalOpen(true)} variant="outline" size="sm">Novo Curso</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCourses ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Instrutor</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses?.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>{course.title}</TableCell>
                        <TableCell><Badge>{course.level}</Badge></TableCell>
                        <TableCell>{course.instructor_name || '---'}</TableCell>
                        <TableCell>{format(new Date(course.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditCourse(course)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageCourseContent(course)}>
                                <Settings className="w-4 h-4 mr-2" />
                                Gerenciar Conteúdo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteCourse(course)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Posts</CardTitle>
                <Button onClick={() => setPostModalOpen(true)} variant="outline" size="sm">Novo Post</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts?.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>{post.title}</TableCell>
                        <TableCell>{post.author_name || '---'}</TableCell>
                        <TableCell>{post.category || '---'}</TableCell>
                        <TableCell>{format(new Date(post.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditPost(post)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeletePost(post)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gerenciamento de Pagamentos</CardTitle>
                <Button 
                  onClick={() => navigate('/admin/payments')} 
                  variant="outline" 
                  size="sm"
                >
                  Ver Página Completa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="mb-4">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto" />
                </div>
                <h3 className="text-lg font-medium mb-2">Sistema de Pagamentos</h3>
                <p className="text-muted-foreground mb-4">
                  Acesse a página completa de gerenciamento de pagamentos para visualizar estatísticas, 
                  histórico de transações e configurar gateways de pagamento.
                </p>
                <Button onClick={() => navigate('/admin/payments')}>
                  Acessar Gerenciamento de Pagamentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Webhooks</CardTitle>
                <Button onClick={() => setWebhookModalOpen(true)} variant="outline" size="sm">Novo Webhook</Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooksError && (
                <div className="text-center py-4">
                  <p className="text-destructive">Erro ao carregar webhooks: {webhooksError.message}</p>
                  <Button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['webhooks'] })}
                    variant="outline"
                    className="mt-2"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              )}
              {isLoadingWebhooks ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !webhooksError && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Eventos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(webhooks) && webhooks.length > 0 ? (
                      webhooks.map((webhook: Webhook) => (
                        <TableRow key={webhook.id}>
                          <TableCell className="font-medium">{webhook.name}</TableCell>
                          <TableCell className="max-w-xs truncate">{webhook.url}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(webhook.events) && webhook.events.slice(0, 2).map((event) => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                              {Array.isArray(webhook.events) && webhook.events.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{webhook.events.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={webhook.is_active ? "default" : "secondary"}>
                              {webhook.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(webhook.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditWebhook(webhook)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewWebhookLogs(webhook)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Ver Logs
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteWebhook(webhook)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum webhook encontrado. Clique em "Novo Webhook" para criar um.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MinIO Test Tab */}
        <TabsContent value="minio">
          <MinioTest />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <CreateUserModal 
        open={isUserModalOpen} 
        onOpenChange={handleCloseUserModal} 
        onSuccess={handleUserSuccess}
        initialData={editingUser}
        isEdit={!!editingUser}
      />
      <CreateCourseModal 
        open={isCourseModalOpen} 
        onOpenChange={handleCloseCourseModal}
        onSuccess={handleCourseSuccess}
        initialData={editingCourse ? {
          ...editingCourse,
          price: editingCourse.price.toString()
        } : undefined}
        isEdit={!!editingCourse}
      />
      <CreatePostModal 
        open={isPostModalOpen} 
        onOpenChange={handleClosePostModal}
        onSuccess={handlePostSuccess}
        initialData={editingPost}
        isEdit={!!editingPost}
      />

      <CreateWebhookModal 
        open={isWebhookModalOpen} 
        onOpenChange={handleCloseWebhookModal}
        onSuccess={handleWebhookSuccess}
        initialData={editingWebhook}
        isEdit={!!editingWebhook}
      />

      {selectedWebhookForLogs && (
        <WebhookLogsModal 
          open={isWebhookLogsModalOpen} 
          onOpenChange={handleCloseWebhookLogsModal}
          webhook={selectedWebhookForLogs}
        />
      )}

      {/* Modais de Confirmação de Deleção */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{deleteUser?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteUser && deleteUserMutation.mutate(deleteUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCourse} onOpenChange={() => setDeleteCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o curso "{deleteCourse?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteCourse && deleteCourseMutation.mutate(deleteCourse.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePost} onOpenChange={() => setDeletePost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o post "{deletePost?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletePost && deletePostMutation.mutate(deletePost.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteWebhook} onOpenChange={() => setDeleteWebhook(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o webhook "{deleteWebhook?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteWebhook && deleteWebhookMutation.mutate(deleteWebhook.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

              <div className="grid gap-6">
          <DatabaseMigration />
        </div>
    </div>
  );
}
