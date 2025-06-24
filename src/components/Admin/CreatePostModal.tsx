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
import { Textarea } from '@/components/ui/textarea';
import { toast as sonnerToast } from 'sonner';
import axios from 'axios';

const postSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
  category: z.string().min(3, { message: 'A categoria deve ter pelo menos 3 caracteres.' }),
});

type PostFormValues = z.infer<typeof postSchema>;

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: Partial<PostFormValues> & { id?: string };
  isEdit?: boolean;
}

export function CreatePostModal({ open, onOpenChange, onSuccess, initialData, isEdit }: CreatePostModalProps) {
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        title: initialData.title || '',
        content: initialData.content || '',
        category: initialData.category || '',
      });
    } else if (open && !initialData) {
      form.reset({ title: '', content: '', category: '' });
    }
    // eslint-disable-next-line
  }, [open, initialData]);

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  const onSubmit = async (data: PostFormValues) => {
    try {
      const token = localStorage.getItem('token');
      if (isEdit && initialData?.id) {
        await axios.put(`${API_URL}/posts/${initialData.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Post editado com sucesso!');
      } else {
        await axios.post(`${API_URL}/posts`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Post criado com sucesso!');
      }
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (err) {
      sonnerToast.error('Erro ao salvar post', {
        description: 'Verifique os dados e tente novamente.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Post' : 'Criar Novo Post'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados do post abaixo.' : 'Preencha os dados abaixo para adicionar um novo post à comunidade.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">Título</label>
            <Input id="title" {...form.register('title')} placeholder="Título do post" />
            <span className="text-xs text-destructive">{form.formState.errors.title?.message}</span>
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="block text-sm font-medium">Conteúdo</label>
            <Textarea id="content" {...form.register('content')} placeholder="Escreva o conteúdo do post aqui..." className="resize-y min-h-[100px]" />
            <span className="text-xs text-destructive">{form.formState.errors.content?.message}</span>
          </div>
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium">Categoria</label>
            <Input id="category" {...form.register('category')} placeholder="Ex: Anúncios, Dicas, etc." />
            <span className="text-xs text-destructive">{form.formState.errors.category?.message}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Salvar Alterações' : 'Criar Post'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 