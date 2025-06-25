import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, BookOpen, MessageSquare, Eye, Lock, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { Class } from "@/types";
import { CreateClassModal } from "@/components/Admin/CreateClassModal";
import { Link } from "react-router-dom";

async function fetchClasses(userId: string) {
  const response = await fetch(`/api/classes?user_id=${userId}`, {
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: classes, isLoading, error } = useQuery({
    queryKey: ['classes', user?.id],
    queryFn: () => fetchClasses(user!.id),
    enabled: !!user?.id
  });

  const createClassMutation = useMutation({
    mutationFn: async (classData: { name: string; description?: string; is_public: boolean; max_students?: number }) => {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(classData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar turma');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Turma criada com sucesso!');
      setIsCreateModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleCreateClass = (classData: { name: string; description?: string; is_public: boolean; max_students?: number }) => {
    createClassMutation.mutate(classData);
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
                  {isLoading ? <Skeleton className="h-8 w-12" /> : classes?.length || 0}
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
                    classes?.reduce((total: number, cls: Class) => total + (cls.current_students || 0), 0) || 0}
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
                    classes?.filter((cls: Class) => cls.is_public).length || 0}
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
        ) : classes?.length === 0 ? (
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
          classes?.map((cls: Class) => (
            <Card key={cls.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {cls.name}
                      {cls.is_public ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-orange-600" />
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <User className="w-4 h-4" />
                      {cls.instructor_name}
                    </CardDescription>
                  </div>
                  <Badge variant={cls.is_public ? "default" : "secondary"}>
                    {cls.is_public ? "Pública" : "Privada"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {cls.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {cls.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {cls.current_students} alunos
                    </span>
                    {cls.max_students && (
                      <span className="text-muted-foreground">
                        / {cls.max_students} max
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(cls.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/classes/${cls.id}`}>
                      Ver Detalhes
                    </Link>
                  </Button>
                  {cls.instructor_id === user?.id && (
                    <Button variant="outline" size="sm">
                      Gerenciar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
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
