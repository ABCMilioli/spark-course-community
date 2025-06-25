import { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { toast as sonnerToast } from 'sonner';
import { Image, Video, X, Upload, Loader2 } from 'lucide-react';
import axios from 'axios';

const postSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
  category: z.string().min(3, { message: 'A categoria deve ter pelo menos 3 caracteres.' }),
  cover_image: z.string().url({ message: 'URL da imagem deve ser válida.' }).optional().or(z.literal('')),
  video_url: z.string().url({ message: 'URL do vídeo deve ser válida.' }).optional().or(z.literal('')),
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
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewVideo, setPreviewVideo] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        title: initialData.title || '',
        content: initialData.content || '',
        category: initialData.category || '',
        cover_image: initialData.cover_image || '',
        video_url: initialData.video_url || '',
      });
      setPreviewImage(initialData.cover_image || '');
      setPreviewVideo(initialData.video_url || '');
    } else if (open && !initialData) {
      form.reset({ title: '', content: '', category: '', cover_image: '', video_url: '' });
      setPreviewImage('');
      setPreviewVideo('');
      setSelectedFile(null);
    }
    // eslint-disable-next-line
  }, [open, initialData]);

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar se é uma imagem
      if (!file.type.startsWith('image/')) {
        sonnerToast.error('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        sonnerToast.error('A imagem deve ter no máximo 5MB.');
        return;
      }
      
      setSelectedFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/upload/thumbnail`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.url;
  };

  const onSubmit = async (data: PostFormValues) => {
    try {
      setIsUploading(true);
      const token = localStorage.getItem('token');
      
      // Se há um arquivo selecionado, fazer upload primeiro
      if (selectedFile) {
        try {
          const imageUrl = await uploadImage(selectedFile);
          data.cover_image = imageUrl;
          sonnerToast.success('Imagem enviada com sucesso!');
        } catch (error) {
          sonnerToast.error('Erro ao enviar imagem');
          return;
        }
      }
      
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
      setPreviewImage('');
      setPreviewVideo('');
      setSelectedFile(null);
      onSuccess?.();
    } catch (err) {
      sonnerToast.error('Erro ao salvar post', {
        description: 'Verifique os dados e tente novamente.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue('cover_image', value);
    setPreviewImage(value);
    setSelectedFile(null); // Limpar arquivo selecionado se usar URL
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue('video_url', value);
    setPreviewVideo(value);
  };

  const clearImage = () => {
    form.setValue('cover_image', '');
    setPreviewImage('');
    setSelectedFile(null);
  };

  const clearVideo = () => {
    form.setValue('video_url', '');
    setPreviewVideo('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Post' : 'Criar Novo Post'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados do post abaixo.' : 'Preencha os dados abaixo para adicionar um novo post à comunidade.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...form.register('title')} placeholder="Título do post" />
            <span className="text-xs text-destructive">{form.formState.errors.title?.message}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea id="content" {...form.register('content')} placeholder="Escreva o conteúdo do post aqui..." className="resize-y min-h-[100px]" />
            <span className="text-xs text-destructive">{form.formState.errors.content?.message}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" {...form.register('category')} placeholder="Ex: Anúncios, Dicas, etc." />
            <span className="text-xs text-destructive">{form.formState.errors.category?.message}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Imagem de Capa
            </Label>
            
            {/* Opção 1: Upload de arquivo */}
            <div className="space-y-2">
              <Label htmlFor="file_upload" className="text-sm text-muted-foreground">
                Ou faça upload de uma imagem:
              </Label>
              <div className="flex gap-2">
                <Input
                  id="file_upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <Button type="button" variant="outline" size="icon" onClick={clearImage}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Opção 2: URL da imagem */}
            <div className="space-y-2">
              <Label htmlFor="cover_image_url" className="text-sm text-muted-foreground">
                Ou insira uma URL da imagem:
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="cover_image_url" 
                  placeholder="https://exemplo.com/imagem.jpg" 
                  value={form.watch('cover_image') || ''}
                  onChange={handleImageUrlChange}
                  disabled={!!selectedFile}
                />
                {previewImage && !selectedFile && (
                  <Button type="button" variant="outline" size="icon" onClick={clearImage}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Preview da imagem */}
            {previewImage && (
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">Preview:</Label>
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded-lg border mt-1"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar Alterações' : 'Criar Post'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 