import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, X, Tag, Upload, Image, Trash2 } from 'lucide-react';
import { ForumTag } from '@/types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  topicId: string;
  topicTitle: string;
}

interface CreatePostFormData {
  title: string;
  content: string;
  tags: string[];
  cover_image_url: string;
  content_image_url: string;
}

export function CreatePostModal({ isOpen, onClose, onSuccess, topicId, topicTitle }: CreatePostModalProps) {
  const [formData, setFormData] = useState<CreatePostFormData>({
    title: '',
    content: '',
    tags: [],
    cover_image_url: '',
    content_image_url: ''
  });
  const [availableTags, setAvailableTags] = useState<ForumTag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingContent, setIsUploadingContent] = useState(false);
  const coverImageRef = useRef<HTMLInputElement>(null);
  const contentImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

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
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          topic_id: topicId,
          title: formData.title.trim(),
          content: formData.content.trim(),
          tags: formData.tags,
          cover_image_url: formData.cover_image_url,
          content_image_url: formData.content_image_url
        })
      });

      if (response.ok) {
        toast.success('Post criado com sucesso!');
        onSuccess();
        setFormData({ title: '', content: '', tags: [], cover_image_url: '', content_image_url: '' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar post');
      }
    } catch (error) {
      console.error('Erro ao criar post:', error);
      toast.error('Erro ao criar post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ title: '', content: '', tags: [], cover_image_url: '', content_image_url: '' });
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

  const uploadImage = async (file: File, type: 'cover' | 'content') => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      if (type === 'cover') setIsUploadingCover(true);
      else setIsUploadingContent(true);

      const response = await fetch('/api/forum/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({
          ...prev,
          [type === 'cover' ? 'cover_image_url' : 'content_image_url']: result.url
        }));
        toast.success(`Imagem ${type === 'cover' ? 'de capa' : 'de conteúdo'} enviada com sucesso!`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao fazer upload da imagem');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      if (type === 'cover') setIsUploadingCover(false);
      else setIsUploadingContent(false);
    }
  };

  const handleImageUpload = (type: 'cover' | 'content') => {
    const ref = type === 'cover' ? coverImageRef : contentImageRef;
    ref.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'content') => {
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

      uploadImage(file, type);
    }
  };

  const removeImage = (type: 'cover' | 'content') => {
    setFormData(prev => ({
      ...prev,
      [type === 'cover' ? 'cover_image_url' : 'content_image_url']: ''
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Novo Post</DialogTitle>
          <DialogDescription>
            Crie um novo post no tópico "{topicTitle}".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título do seu post"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Escreva o conteúdo do seu post..."
                rows={8}
                disabled={isLoading}
              />
            </div>

            {/* Campo de imagem de capa */}
            <div className="space-y-2">
              <Label>Imagem de Capa</Label>
              <div className="space-y-2">
                {formData.cover_image_url ? (
                  <div className="relative">
                    <img 
                      src={formData.cover_image_url} 
                      alt="Capa do post" 
                      className="w-full h-40 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeImage('cover')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImageUpload('cover')}
                    disabled={isLoading || isUploadingCover}
                    className="w-full h-20 border-dashed"
                  >
                    {isUploadingCover ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Adicionar imagem de capa
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Campo de imagem de conteúdo */}
            <div className="space-y-2">
              <Label>Imagem de Conteúdo</Label>
              <div className="space-y-2">
                {formData.content_image_url ? (
                  <div className="relative">
                    <img 
                      src={formData.content_image_url} 
                      alt="Imagem do conteúdo" 
                      className="w-full h-40 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeImage('content')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImageUpload('content')}
                    disabled={isLoading || isUploadingContent}
                    className="w-full h-20 border-dashed"
                  >
                    {isUploadingContent ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4 mr-2" />
                        Adicionar imagem ao conteúdo
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="space-y-2">
                <Input
                  id="tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Digite uma tag e pressione Enter"
                  disabled={isLoading}
                />
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {!isLoadingTags && availableTags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tags disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
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
          </div>

          {/* Inputs ocultos para upload de imagens */}
          <input
            ref={coverImageRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e, 'cover')}
            className="hidden"
          />
          <input
            ref={contentImageRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e, 'content')}
            className="hidden"
          />

          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim() || !formData.content.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Post"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 