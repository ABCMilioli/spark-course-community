import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Upload, Image, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || '/api';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateTopicFormData {
  title: string;
  description: string;
  order_index: number;
  cover_image_url: string;
  banner_image_url: string;
}

export function CreateTopicModal({ isOpen, onClose, onSuccess }: CreateTopicModalProps) {
  const [formData, setFormData] = useState<CreateTopicFormData>({
    title: '',
    description: '',
    order_index: 0,
    cover_image_url: '',
    banner_image_url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const coverImageRef = useRef<HTMLInputElement>(null);
  const bannerImageRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/forum/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          cover_image_url: formData.cover_image_url,
          banner_image_url: formData.banner_image_url
        })
      });

      if (response.ok) {
        toast.success('Tópico criado com sucesso!');
        onSuccess();
        setFormData({ title: '', description: '', order_index: 0, cover_image_url: '', banner_image_url: '' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar tópico');
      }
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
      toast.error('Erro ao criar tópico');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ title: '', description: '', order_index: 0, cover_image_url: '', banner_image_url: '' });
      onClose();
    }
  };

  const uploadImage = async (file: File, type: 'cover' | 'banner') => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      if (type === 'cover') setIsUploadingCover(true);
      else setIsUploadingBanner(true);

      const response = await fetch(`${API_URL}/forum/upload-image`, {
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
          [type === 'cover' ? 'cover_image_url' : 'banner_image_url']: result.url
        }));
        toast.success(`Imagem ${type === 'cover' ? 'de capa' : 'de banner'} enviada com sucesso!`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao fazer upload da imagem');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      if (type === 'cover') setIsUploadingCover(false);
      else setIsUploadingBanner(false);
    }
  };

  const handleImageUpload = (type: 'cover' | 'banner') => {
    const ref = type === 'cover' ? coverImageRef : bannerImageRef;
    ref.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'banner') => {
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

  const removeImage = (type: 'cover' | 'banner') => {
    setFormData(prev => ({
      ...prev,
      [type === 'cover' ? 'cover_image_url' : 'banner_image_url']: ''
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Novo Tópico</DialogTitle>
          <DialogDescription>
            Crie um novo tópico para organizar as discussões do fórum.
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
                placeholder="Nome do tópico"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do tópico (opcional)"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_index">Ordem de Exibição</Label>
              <Input
                id="order_index"
                type="number"
                min="0"
                value={formData.order_index}
                onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Tópicos com menor número aparecem primeiro.
              </p>
            </div>

            {/* Campo de imagem de capa */}
            <div className="space-y-2">
              <Label>Imagem de Capa</Label>
              <div className="space-y-2">
                {formData.cover_image_url ? (
                  <div className="relative">
                    <img 
                      src={formData.cover_image_url} 
                      alt="Capa do tópico" 
                      className="w-full h-32 object-cover rounded-md"
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

            {/* Campo de imagem de banner */}
            <div className="space-y-2">
              <Label>Imagem de Banner</Label>
              <div className="space-y-2">
                {formData.banner_image_url ? (
                  <div className="relative">
                    <img 
                      src={formData.banner_image_url} 
                      alt="Banner do tópico" 
                      className="w-full h-20 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeImage('banner')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImageUpload('banner')}
                    disabled={isLoading || isUploadingBanner}
                    className="w-full h-16 border-dashed"
                  >
                    {isUploadingBanner ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Image className="w-4 h-4 mr-2" />
                        Adicionar imagem de banner
                      </>
                    )}
                  </Button>
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
            ref={bannerImageRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e, 'banner')}
            className="hidden"
          />

          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Tópico"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 