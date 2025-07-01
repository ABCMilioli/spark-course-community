import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, FileText, Video, UserPlus, Edit, Trash2, Settings } from "lucide-react";
import { CreateUserModal } from "@/components/Admin/CreateUserModal";
import { CreateCourseModal } from "@/components/Admin/CreateCourseModal";
import { CreatePostModal } from "@/components/Admin/CreatePostModal";
import { MinioTest } from "@/components/Admin/MinioTest";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from 'axios';
import { Profile, Course, Post } from "@/types";
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

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function Admin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Estados para modais
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [isCourseModalOpen, setCourseModalOpen] = useState(false);
  const [isPostModalOpen, setPostModalOpen] = useState(false);
  
  // Estados para edição
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  
  // Estados para confirmação de deleção
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [deletePost, setDeletePost] = useState<Post | null>(null);

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

              <div className="grid gap-6">
          <DatabaseMigration />
        </div>
    </div>
  );
}
