import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, X, Tag, Upload, Trash2 } from 'lucide-react';
import { ForumTag, ForumPost } from '@/types';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  post: ForumPost;
}

interface EditPostFormData {
  title: string;
  content: string;
  tags: string[];
  content_image_url: string;
}

export function EditPostModal({ isOpen, onClose, onSuccess, post }: EditPostModalProps) {
  const [formData, setFormData] = useState<EditPostFormData>({
    title: '',
    content: '',
    tags: [],
    content_image_url: ''
  });
  const [availableTags, setAvailableTags] = useState<ForumTag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isUploadingContent, setIsUploadingContent] = useState(false);
  const contentImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && post) {
      // Preencher formulário com dados do post
      setFormData({
        title: post.title || '',
        content: post.content || '',
        tags: post.tags || [],
        content_image_url: post.content_image_url || ''
      });
      fetchTags();
    }
  }, [isOpen, post]);

  const fetchTags = async () => {
    try {
      setIsLoadingTags(true);
      const response = await fetch('/api/forum/tags', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const tags = await response.json();
        setAvailableTags(tags);
      }
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Conteúdo é obrigatório');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/forum/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          tags: formData.tags,
          content_image_url: formData.content_image_url
        })
      });

      if (response.ok) {
        toast.success('Post atualizado com sucesso!');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar post');
      }
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
      toast.error('Erro ao atualizar post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setNewTag('');
      onClose();
    }
  };

  const addTag = (tagName: string) => {
    const normalizedTag = tagName.toLowerCase().trim();
    if (normalizedTag && !formData.tags.includes(normalizedTag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, normalizedTag] }));
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(tag => tag !== tagToRemove) 
    }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(newTag);
    }
  };

  const uploadImage = async (file: File) => {
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      setIsUploadingContent(true);

      const response = await fetch('/api/forum/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({
          ...prev,
          content_image_url: result.url
        }));
        toast.success('Imagem enviada com sucesso!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao fazer upload da imagem');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setIsUploadingContent(false);
    }
  };

  const handleImageUpload = () => {
    contentImageRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.');
        return;
      }

      // Validar tamanho (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo: 10MB.');
        return;
      }

      uploadImage(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      content_image_url: ''
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Post</DialogTitle>
          <DialogDescription>
            Atualize as informações do seu post no fórum.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="title">Título do Post *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Digite o título do seu post..."
              required
              maxLength={200}
            />
          </div>

          {/* Conteúdo */}
          <div>
            <Label htmlFor="content">Conteúdo *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Descreva sua dúvida, problema ou compartilhe seu conhecimento..."
              className="min-h-[120px]"
              required
            />
          </div>

          {/* Imagem de Apoio */}
          <div>
            <Label className="text-sm text-muted-foreground">
              Imagem de Apoio (screenshots, exemplos, etc.)
            </Label>
            <div className="mt-2">
              {formData.content_image_url ? (
                <div className="relative">
                  <img
                    src={formData.content_image_url}
                    alt="Imagem de apoio"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleImageUpload}
                  disabled={isUploadingContent}
                  className="w-full h-24 border-dashed"
                >
                  {isUploadingContent ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Adicionar Imagem de Apoio
                    </>
                  )}
                </Button>
              )}
              <input
                ref={contentImageRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Digite uma tag e pressione Enter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(newTag)}
                  disabled={!newTag.trim() || formData.tags.includes(newTag.toLowerCase().trim())}
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Tags adicionadas */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Tags sugeridas */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tags sugeridas:</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags
                      .filter(tag => !formData.tags.includes(tag.name))
                      .slice(0, 10)
                      .map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => addTag(tag.name)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Post'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 