import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AddStudentToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { user_id: string; role: string }) => void;
  classId: string;
  isLoading?: boolean;
}

export function AddStudentToClassModal({
  isOpen,
  onClose,
  onSuccess,
  classId,
  isLoading = false,
}: AddStudentToClassModalProps) {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');

  // Buscar usuários disponíveis e já matriculados
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
      fetchEnrolledUsers();
    }
  }, [isOpen, classId]);

  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users?role=student&limit=100', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar usuários');
      }

      const users = await response.json();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledUsers = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/enrollments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const enrollments = await response.json();
        const enrolledUserIds = enrollments.map((enrollment: any) => enrollment.user_id);
        setEnrolledUsers(enrolledUserIds);
      }
    } catch (error) {
      console.error('Erro ao buscar matrículas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      toast.error('Selecione um usuário');
      return;
    }

    onSuccess({
      user_id: selectedUserId,
      role: selectedRole
    });
  };

  const handleClose = () => {
    if (!loading && !isLoading) {
      setSelectedUserId('');
      setSelectedRole('student');
      setSearchTerm('');
      onClose();
    }
  };

  // Filtrar usuários que não estão matriculados e que correspondem à busca
  const filteredUsers = availableUsers.filter(user => 
    !enrolledUsers.includes(user.id) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Aluno à Turma</DialogTitle>
          <DialogDescription>
            Selecione um usuário para matricular na turma. Apenas usuários que ainda não estão matriculados aparecem na lista.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar Usuário</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="search"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_id">Usuário</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={loading || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredUsers.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Nenhum usuário encontrado com essa busca.' : 'Todos os usuários já estão matriculados nesta turma.'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função na Turma</Label>
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
              disabled={loading || isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Aluno</SelectItem>
                <SelectItem value="assistant">Assistente</SelectItem>
                <SelectItem value="instructor">Instrutor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading || isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || isLoading || !selectedUserId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Matriculando...
                </>
              ) : (
                'Matricular Usuário'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 