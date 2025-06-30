import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast as sonnerToast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Profile } from '@/types';
import { Camera, X } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  bio: z.string().max(500, { message: 'A bio deve ter no máximo 500 caracteres.' }).optional(),
  avatar_url: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile;
  onSuccess?: () => void;
}

const API_URL = process.env.REACT_APP_API_URL || '/api';

export function EditProfileModal({ open, onOpenChange, user, onSuccess }: EditProfileModalProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      bio: user.bio || '',
      avatar_url: user.avatar_url || '',
    },
  });

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: (data) => {
      sonnerToast.success('Perfil atualizado com sucesso!');
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-enrollments'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('[EditProfileModal] Erro ao atualizar perfil:', error);
      sonnerToast.error('Erro ao atualizar perfil', {
        description: error.response?.data?.error || 'Verifique os dados e tente novamente.'
      });
    }
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Por enquanto, vamos usar uma URL temporária
    // Em produção, você faria upload para um serviço como Cloudinary
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      form.setValue('avatar_url', result);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    form.setValue('avatar_url', '');
  };

  useEffect(() => {
    if (open) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [open, user, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-y-auto">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={form.watch('avatar_url') || user.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {form.watch('name')?.[0] || user.name[0]}
                </AvatarFallback>
              </Avatar>
              {form.watch('avatar_url') && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 w-6 h-6"
                  onClick={removeAvatar}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('avatar-input')?.click()}
                disabled={isUploading}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isUploading ? 'Enviando...' : 'Alterar Foto'}
              </Button>
            </div>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium">Nome</label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Seu nome completo"
              />
              {form.formState.errors.name && (
                <span className="text-xs text-destructive">{form.formState.errors.name.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="seu@email.com"
              />
              {form.formState.errors.email && (
                <span className="text-xs text-destructive">{form.formState.errors.email.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
              <Textarea
                id="bio"
                {...form.register('bio')}
                placeholder="Conte um pouco sobre você..."
                className="min-h-[100px] resize-none"
              />
              {form.formState.errors.bio && (
                <span className="text-xs text-destructive">{form.formState.errors.bio.message}</span>
              )}
              <div className="text-xs text-muted-foreground text-right">
                {form.watch('bio')?.length || 0}/500
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateProfileMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 