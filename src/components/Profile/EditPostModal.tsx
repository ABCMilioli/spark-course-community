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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast as sonnerToast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Post } from '@/types';

const postSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
  category: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
}

const API_URL = process.env.REACT_APP_API_URL || '/api';

const categories = [
  { value: 'geral', label: 'Geral' },
  { value: 'programação', label: 'Programação' },
  { value: 'design', label: 'Design' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'dúvida', label: 'Dúvida' },
  { value: 'dica', label: 'Dica' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'discussão', label: 'Discussão' },
];

export function EditPostModal({ open, onOpenChange, post }: EditPostModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
    },
  });

  // Reset form when post changes
  useEffect(() => {
    if (post && open) {
      form.reset({
        title: post.title,
        content: post.content,
        category: post.category || '',
      });
    }
  }, [post, open, form]);

  // Mutation para atualizar post
  const updatePostMutation = useMutation({
    mutationFn: async (data: PostFormValues) => {
      if (!post) throw new Error('Post não encontrado');
      
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/posts/${post.id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: (data) => {
      sonnerToast.success('Post atualizado com sucesso!');
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar post:', error);
      sonnerToast.error('Erro ao atualizar post', {
        description: error.response?.data?.error || 'Verifique os dados e tente novamente.'
      });
    }
  });

  const onSubmit = (data: PostFormValues) => {
    updatePostMutation.mutate(data);
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Post</DialogTitle>
          <DialogDescription>
            Atualize o conteúdo do seu post. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium">Título</label>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="Título do seu post"
              />
              {form.formState.errors.title && (
                <span className="text-xs text-destructive">{form.formState.errors.title.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="block text-sm font-medium">Categoria</label>
              <Select 
                value={form.watch('category')} 
                onValueChange={(value) => form.setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="block text-sm font-medium">Conteúdo</label>
              <Textarea
                id="content"
                {...form.register('content')}
                placeholder="Conteúdo do seu post..."
                className="min-h-[200px] resize-none"
              />
              {form.formState.errors.content && (
                <span className="text-xs text-destructive">{form.formState.errors.content.message}</span>
              )}
              <div className="text-xs text-muted-foreground text-right">
                {form.watch('content')?.length || 0} caracteres
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updatePostMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updatePostMutation.isPending}
            >
              {updatePostMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 