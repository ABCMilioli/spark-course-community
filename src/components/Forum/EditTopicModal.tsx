import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Upload, Image, Trash2 } from 'lucide-react';
import { ForumTopic } from '@/types';

interface EditTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  topic: ForumTopic | null;
}

interface EditTopicFormData {
  title: string;
  description: string;
  order_index: number;
  cover_image_url: string;
  banner_image_url: string;
}

export function EditTopicModal({ isOpen, onClose, onSuccess, topic }: EditTopicModalProps) {
  const [formData, setFormData] = useState<EditTopicFormData>({
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

  useEffect(() => {
    if (topic && isOpen) {
      setFormData({
        title: topic.title,
        description: topic.description || '',
        order_index: topic.order_index,
        cover_image_url: topic.cover_image_url || '',
        banner_image_url: topic.banner_image_url || ''
      });
    }
  }, [topic, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!topic) {
      toast.error('Erro: tópico não encontrado');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/forum/topics/${topic.id}`, {
        method: 'PUT',
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
        toast.success('Tópico editado com sucesso!');
        onSuccess();
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao editar tópico');
      }
    } catch (error) {
      console.error('Erro ao editar tópico:', error);
      toast.error('Erro ao editar tópico');
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Tópico</DialogTitle>
          <DialogDescription>
            Edite as informações do tópico do fórum.
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
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 