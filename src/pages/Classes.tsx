import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, BookOpen, MessageSquare, Eye, Lock, Calendar, User, MoreVertical, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Class } from "@/types";
import { CreateClassModal } from "@/components/Admin/CreateClassModal";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || '/api';

async function fetchClasses(userId: string) {
  const response = await fetch(`${API_URL}/classes?user_id=${userId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Erro ao carregar turmas');
  }
  
  return response.json();
}

export default function Classes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: classesData = [], isLoading, error } = useQuery({
    queryKey: ['classes', user?.id],
    queryFn: () => fetchClasses(user?.id),
    enabled: !!user?.id
  });

  const createClassMutation = useMutation({
    mutationFn: async (classData: { name: string; description?: string; is_public: boolean; max_students?: number }) => {
      console.log('[Classes] Tentando criar turma com dados:', classData);
      
      const response = await fetch(`${API_URL}/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(classData)
      });
      
      console.log('[Classes] Resposta do servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[Classes] Erro do servidor:', error);
        throw new Error(error.error || 'Erro ao criar turma');
      }
      
      const result = await response.json();
      console.log('[Classes] Turma criada com sucesso:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[Classes] onSuccess executado, dados:', data);
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Turma criada com sucesso!');
      setIsCreateModalOpen(false);
    },
    onError: (error: Error) => {
      console.error('[Classes] Erro na mutação:', error);
      toast.error(error.message);
    }
  });

  const handleCreateClass = (classData: { name: string; description?: string; is_public: boolean; max_students?: number }) => {
    console.log('[Classes] handleCreateClass chamado com:', classData);
    createClassMutation.mutate(classData);
  };

  const handleManageClass = (classId: string) => {
    navigate(`/classes/${classId}/manage`);
  };

  const handleEditClass = (classItem: Class) => {
    // TODO: Implementar edição de turma
    console.log('Editar turma:', classItem);
    toast.info('Funcionalidade de edição será implementada em breve');
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) {
      return;
    }

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Turma excluída com sucesso');
        fetchClasses(user?.id); // Recarregar lista
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao excluir turma');
      }
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      toast.error('Erro ao excluir turma');
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar turmas</h1>
          <p className="text-muted-foreground">Tente novamente mais tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Turmas</h1>
          <p className="text-muted-foreground">
            Gerencie suas turmas e acesse o conteúdo específico de cada uma
          </p>
        </div>
        {['instructor', 'admin'].includes(user?.role || '') && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Turma
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : classesData.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Minhas Turmas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-brand-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : 
                    classesData.reduce((total: number, cls: Class) => total + Number(cls.current_students || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total de Alunos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : 
                    classesData.filter((cls: Class) => cls.is_public).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Turmas Públicas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : classesData.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma turma encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {['instructor', 'admin'].includes(user?.role || '') 
                ? 'Crie sua primeira turma para começar a organizar seus alunos.'
                : 'Você ainda não está matriculado em nenhuma turma.'
              }
            </p>
            {['instructor', 'admin'].includes(user?.role || '') && (
              <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeira Turma
              </Button>
            )}
          </div>
        ) : (
          classesData.map((classItem) => (
            <div key={classItem.id} className="bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {classItem.instance_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Curso: {classItem.course_title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Instructor: {classItem.instructor_name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {classItem.is_public && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Pública
                      </span>
                    )}
                  </div>
                </div>
                {classItem.instance_description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {classItem.instance_description}
                  </p>
                )}
                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                  <span>
                    {classItem.current_students || 0} / {classItem.max_students || '∞'} alunos
                  </span>
                  <span>
                    Criada em {new Date(classItem.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => navigate(`/classes/${classItem.id}`)}
                    className="flex-1"
                  >
                    Ver Detalhes
                  </Button>
                  {classItem.instructor_id === user?.id && (
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/classes/${classItem.id}/manage`)}
                    >
                      Gerenciar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateClass}
        isLoading={createClassMutation.isPending}
      />
    </div>
  );
}
