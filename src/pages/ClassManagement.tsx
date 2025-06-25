import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, BookOpen, MessageSquare, Eye, Lock, Calendar, 
  MoreVertical, Edit, Trash2, Save, ArrowLeft, Shield,
  UserCheck, UserX, Crown, GraduationCap, ClipboardList,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Class, ClassEnrollment, ClassCourse, ClassContent } from "@/types";

const API_URL = process.env.REACT_APP_API_URL || '/api';

async function fetchClassDetails(classId: string) {
  const response = await fetch(`${API_URL}/classes/${classId}`, {
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
  const response = await fetch(`${API_URL}/classes/${classId}/enrollments`, {
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
  const response = await fetch(`${API_URL}/classes/${classId}/courses`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Erro ao carregar cursos da turma');
  }
  
  return response.json();
}

async function fetchClassContent(classId: string) {
  const response = await fetch(`${API_URL}/classes/${classId}/content`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Erro ao carregar conteúdo da turma');
  }
  
  return response.json();
}

export default function ClassManagement() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    is_public: false,
    max_students: ""
  });

  // Queries
  const { data: classDetails, isLoading: isLoadingClass } = useQuery({
    queryKey: ['class-details', classId],
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

  // Mutations
  const updateClassMutation = useMutation({
    mutationFn: async (classData: any) => {
      const response = await fetch(`${API_URL}/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(classData)
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar turma');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-details', classId] });
      toast.success('Turma atualizada com sucesso!');
      setIsEditModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteClassMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir turma');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Turma excluída com sucesso!');
      navigate('/classes');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Verificar se o usuário é o instructor da turma
  const isInstructor = classDetails?.instructor_id === user?.id;
  const isAdmin = user?.role === 'admin';

  if (!isInstructor && !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">
            Você não tem permissão para gerenciar esta turma.
          </p>
          <Button asChild>
            <Link to="/classes">Voltar para Turmas</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingClass) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <p className="text-muted-foreground mb-4">A turma que você está procurando não existe.</p>
          <Button asChild>
            <Link to="/classes">Voltar para Turmas</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleEditClick = () => {
    setEditForm({
      name: classDetails.name,
      description: classDetails.description || "",
      is_public: classDetails.is_public,
      max_students: classDetails.max_students?.toString() || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSave = () => {
    const classData = {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      is_public: editForm.is_public,
      max_students: editForm.max_students ? parseInt(editForm.max_students) : null
    };

    updateClassMutation.mutate(classData);
  };

  const handleDelete = () => {
    deleteClassMutation.mutate();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/classes">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
          
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-blue-600" />
              <h1 className="text-2xl font-bold">{classDetails.name}</h1>
              {classDetails.is_public ? (
                <Eye className="w-4 h-4 text-green-600" />
              ) : (
                <Lock className="w-4 h-4 text-orange-600" />
              )}
              <Badge variant="secondary">
                {classDetails.is_public ? "Pública" : "Privada"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Gerenciando desde {new Date(classDetails.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to={`/classes/${classId}`}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClick}>
                <Edit className="w-4 h-4 mr-2" />
                Editar Turma
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsDeleteModalOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Turma
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{classDetails.current_students}</p>
                <p className="text-sm text-muted-foreground">Alunos Ativos</p>
                {classDetails.max_students && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round((classDetails.current_students / classDetails.max_students) * 100)}% da capacidade
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{courses?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Cursos Associados</p>
                <p className="text-xs text-muted-foreground">
                  {courses?.filter(c => c.is_required).length || 0} obrigatórios
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{content?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Conteúdos Criados</p>
                <p className="text-xs text-muted-foreground">
                  {content?.filter(c => c.is_pinned).length || 0} fixados
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {classDetails.max_students ? 'Limitada' : 'Ilimitada'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações da Turma */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detalhes da Turma */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Informações da Turma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nome</Label>
              <p className="text-sm text-muted-foreground">{classDetails.name}</p>
            </div>
            
            {classDetails.description && (
              <div>
                <Label className="text-sm font-medium">Descrição</Label>
                <p className="text-sm text-muted-foreground">{classDetails.description}</p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Badge variant={classDetails.is_active ? "default" : "secondary"}>
                {classDetails.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </div>

            <div>
              <Label className="text-sm font-medium">Visibilidade</Label>
              <Badge variant={classDetails.is_public ? "default" : "secondary"}>
                {classDetails.is_public ? "Pública" : "Privada"}
              </Badge>
            </div>

            <div>
              <Label className="text-sm font-medium">Limite de Alunos</Label>
              <p className="text-sm text-muted-foreground">
                {classDetails.max_students ? `${classDetails.max_students} alunos` : 'Sem limite'}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Criada em</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(classDetails.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Última atualização</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(classDetails.updated_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alunos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Alunos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEnrollments ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : enrollments?.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum aluno matriculado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enrollments?.slice(0, 5).map((enrollment: ClassEnrollment) => (
                  <div key={enrollment.id} className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-xs">
                        {enrollment.user_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{enrollment.user_name}</p>
                      <p className="text-xs text-muted-foreground">{enrollment.user_email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {enrollment.role}
                    </Badge>
                  </div>
                ))}
                {enrollments && enrollments.length > 5 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      +{enrollments.length - 5} mais alunos
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Turma</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias nos dados da turma.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Turma *</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da turma"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da turma"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max_students">Limite de Alunos</Label>
              <Input
                id="max_students"
                type="number"
                value={editForm.max_students}
                onChange={(e) => setEditForm(prev => ({ ...prev, max_students: e.target.value }))}
                placeholder="Deixe em branco para sem limite"
                min="1"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_public">Turma Pública</Label>
                <p className="text-xs text-muted-foreground">
                  Turmas públicas são visíveis para todos os usuários
                </p>
              </div>
              <Switch
                id="is_public"
                checked={editForm.is_public}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_public: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSave}
              disabled={updateClassMutation.isPending || !editForm.name.trim()}
            >
              {updateClassMutation.isPending ? (
                <>
                  <Skeleton className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a turma "{classDetails.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteClassMutation.isPending}
            >
              {deleteClassMutation.isPending ? (
                <>
                  <Skeleton className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Turma
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 