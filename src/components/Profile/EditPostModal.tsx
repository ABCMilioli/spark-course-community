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
import { Label } from '@/components/ui/label';
import { toast as sonnerToast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Image, Video, X } from 'lucide-react';
import axios from 'axios';
import { Post } from '@/types';

const postSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
  category: z.string().optional(),
  cover_image: z.string().url({ message: 'URL da imagem deve ser válida.' }).optional().or(z.literal('')),
  video_url: z.string().url({ message: 'URL do vídeo deve ser válida.' }).optional().or(z.literal('')),
});

type PostFormValues = z.infer<typeof postSchema>;

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post | null;
}

const API_URL = process.env.REACT_APP_API_URL || '/api';

export function EditPostModal({ open, onOpenChange, post }: EditPostModalProps) {
  const queryClient = useQueryClient();
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewVideo, setPreviewVideo] = useState<string>('');

  // Buscar categorias existentes
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['post-categories'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/posts/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: open
  });

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
      cover_image: '',
      video_url: '',
    },
  });

  // Reset form when post changes
  useEffect(() => {
    setCustomCategory('');
    setShowCustomInput(false);
    if (post && open) {
      form.reset({
        title: post.title,
        content: post.content,
        category: post.category || '',
        cover_image: post.cover_image || '',
        video_url: post.video_url || '',
      });
      setPreviewImage(post.cover_image || '');
      setPreviewVideo(post.video_url || '');
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
    const category = showCustomInput ? customCategory.trim() : data.category;
    updatePostMutation.mutate({ ...data, category });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue('cover_image', value);
    setPreviewImage(value);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue('video_url', value);
    setPreviewVideo(value);
  };

  const clearImage = () => {
    form.setValue('cover_image', '');
    setPreviewImage('');
  };

  const clearVideo = () => {
    form.setValue('video_url', '');
    setPreviewVideo('');
  };

  useEffect(() => {
    if (categories) {
      console.log('[EditPostModal] Categorias carregadas:', categories);
    }
  }, [categories]);

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
              <Label htmlFor="title">Título</Label>
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
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={showCustomInput ? 'outra' : form.watch('category') || ''}
                onValueChange={(value) => {
                  if (value === 'outra') {
                    setShowCustomInput(true);
                    setCustomCategory('');
                    form.setValue('category', '');
                  } else {
                    setShowCustomInput(false);
                    form.setValue('category', value);
                  }
                }}
                disabled={isCategoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isCategoriesLoading ? 'Carregando...' : 'Selecione uma categoria'} />
                </SelectTrigger>
                <SelectContent>
                  {categories && categories.length > 0 ? (
                    categories
                      .filter((cat: string) => !!cat && cat.trim() !== '')
                      .map((cat: string) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no-categories" disabled>Nenhuma categoria encontrada</SelectItem>
                  )}
                  <SelectItem value="outra">Outra...</SelectItem>
                </SelectContent>
              </Select>
              {showCustomInput && (
                <Input
                  className="mt-2"
                  placeholder="Digite uma nova categoria"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  maxLength={40}
                  required
                  autoFocus
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
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

            <div className="space-y-2">
              <Label htmlFor="cover_image" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Imagem de Capa (URL)
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="cover_image" 
                  placeholder="https://exemplo.com/imagem.jpg" 
                  value={form.watch('cover_image') || ''}
                  onChange={handleImageChange}
                />
                {previewImage && (
                  <Button type="button" variant="outline" size="icon" onClick={clearImage}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {previewImage && (
                <div className="mt-2">
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded-lg border"
                    onError={() => setPreviewImage('')}
                  />
                </div>
              )}
              <span className="text-xs text-destructive">{form.formState.errors.cover_image?.message}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_url" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Vídeo (URL)
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="video_url" 
                  placeholder="https://youtube.com/watch?v=..." 
                  value={form.watch('video_url') || ''}
                  onChange={handleVideoChange}
                />
                {previewVideo && (
                  <Button type="button" variant="outline" size="icon" onClick={clearVideo}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {previewVideo && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Preview do vídeo:</div>
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                    <Video className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
              )}
              <span className="text-xs text-destructive">{form.formState.errors.video_url?.message}</span>
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