import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast as sonnerToast } from 'sonner';
import axios from 'axios';

const userSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }).optional(),
  role: z.string().min(3, { message: 'O tipo de usuário é obrigatório.' }),
});

type UserFormValues = z.infer<typeof userSchema>;

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: Partial<UserFormValues> & { id?: string };
  isEdit?: boolean;
}

export function CreateUserModal({ open, onOpenChange, onSuccess, initialData, isEdit }: CreateUserModalProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: '',
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name || '',
        email: initialData.email || '',
        password: '',
        role: initialData.role || '',
      });
    } else if (open && !initialData) {
      form.reset({ name: '', email: '', password: '', role: '' });
    }
    // eslint-disable-next-line
  }, [open, initialData]);

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  const onSubmit = async (data: UserFormValues) => {
    try {
      const token = localStorage.getItem('token');
      if (isEdit && initialData?.id) {
        await axios.put(`${API_URL}/users/${initialData.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Usuário editado com sucesso!');
      } else {
        await axios.post(`${API_URL}/users`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Usuário criado com sucesso!');
      }
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (err) {
      sonnerToast.error('Erro ao salvar usuário', {
        description: 'Verifique os dados e tente novamente.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados do usuário abaixo.' : 'Preencha os dados abaixo para adicionar um novo usuário à plataforma.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">Nome</label>
            <Input id="name" {...form.register('name')} placeholder="Nome do usuário" />
            <span className="text-xs text-destructive">{form.formState.errors.name?.message}</span>
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <Input id="email" {...form.register('email')} placeholder="email@exemplo.com" />
            <span className="text-xs text-destructive">{form.formState.errors.email?.message}</span>
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">Senha</label>
              <Input id="password" type="password" {...form.register('password')} placeholder="Senha" />
              <span className="text-xs text-destructive">{form.formState.errors.password?.message}</span>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium">Tipo</label>
            <Input id="role" {...form.register('role')} placeholder="admin, free, premium, etc." />
            <span className="text-xs text-destructive">{form.formState.errors.role?.message}</span>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Salvar Alterações' : 'Criar Usuário'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
