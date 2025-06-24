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

const courseSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  category: z.string().min(3, { message: 'A categoria deve ter pelo menos 3 caracteres.' }),
  level: z.string().min(3, { message: 'O nível é obrigatório.' }),
  price: z.string().min(1, { message: 'O preço é obrigatório.' }),
  thumbnail: z.string().url({ message: 'URL da imagem inválida.' }),
});

type CourseFormValues = z.infer<typeof courseSchema>;

interface CreateCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: Partial<CourseFormValues> & { id?: string };
  isEdit?: boolean;
}

export function CreateCourseModal({ open, onOpenChange, onSuccess, initialData, isEdit }: CreateCourseModalProps) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      level: '',
      price: '',
      thumbnail: ''
    },
  });

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || '',
        level: initialData.level || '',
        price: initialData.price || '',
        thumbnail: initialData.thumbnail || ''
      });
    } else if (open && !initialData) {
      form.reset({ title: '', description: '', category: '', level: '', price: '', thumbnail: '' });
    }
    // eslint-disable-next-line
  }, [open, initialData]);

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  const onSubmit = async (data: CourseFormValues) => {
    try {
      const token = localStorage.getItem('token');
      if (isEdit && initialData?.id) {
        await axios.put(`${API_URL}/courses/${initialData.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Curso editado com sucesso!');
      } else {
        await axios.post(`${API_URL}/courses`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Curso criado com sucesso!');
      }
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (err) {
      sonnerToast.error('Erro ao salvar curso', {
        description: 'Verifique os dados e tente novamente.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Curso' : 'Criar Novo Curso'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados do curso abaixo.' : 'Preencha os dados abaixo para adicionar um novo curso à plataforma.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">Título</label>
            <Input id="title" {...form.register('title')} placeholder="Título do curso" />
            <span className="text-xs text-destructive">{form.formState.errors.title?.message}</span>
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">Descrição</label>
            <Textarea id="description" {...form.register('description')} placeholder="Descreva o conteúdo do curso..." className="resize-y min-h-[100px]" />
            <span className="text-xs text-destructive">{form.formState.errors.description?.message}</span>
          </div>
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium">Categoria</label>
            <Input id="category" {...form.register('category')} placeholder="Ex: Programação, Design, etc." />
            <span className="text-xs text-destructive">{form.formState.errors.category?.message}</span>
          </div>
          <div className="space-y-2">
            <label htmlFor="level" className="block text-sm font-medium">Nível</label>
            <Input id="level" {...form.register('level')} placeholder="Iniciante, Intermediário, Avançado" />
            <span className="text-xs text-destructive">{form.formState.errors.level?.message}</span>
          </div>
          <div className="space-y-2">
            <label htmlFor="price" className="block text-sm font-medium">Preço (R$)</label>
            <Input id="price" type="number" {...form.register('price')} placeholder="197" min="0" step="0.01" />
            <span className="text-xs text-destructive">{form.formState.errors.price?.message}</span>
          </div>
          <div className="space-y-2">
            <label htmlFor="thumbnail" className="block text-sm font-medium">URL da Imagem</label>
            <Input id="thumbnail" {...form.register('thumbnail')} placeholder="https://exemplo.com/imagem.jpg" />
            <span className="text-xs text-destructive">{form.formState.errors.thumbnail?.message}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Salvar Alterações' : 'Criar Curso'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
