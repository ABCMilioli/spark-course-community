import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateClassContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contentData: { title: string; content: string; content_type: 'announcement' | 'material' | 'assignment'; is_pinned: boolean }) => void;
  isLoading: boolean;
}

export function CreateClassContentModal({ isOpen, onClose, onSubmit, isLoading }: CreateClassContentModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    content_type: "announcement" as 'announcement' | 'material' | 'assignment',
    is_pinned: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("Conteúdo é obrigatório");
      return;
    }

    onSubmit(formData);
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        title: "",
        content: "",
        content_type: "announcement",
        is_pinned: false
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Criar Conteúdo</DialogTitle>
          <DialogDescription>
            Crie um novo conteúdo para a turma. Pode ser um anúncio, material ou tarefa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Digite o título do conteúdo..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_type">Tipo de Conteúdo</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value: 'announcement' | 'material' | 'assignment') => 
                  setFormData(prev => ({ ...prev, content_type: value }))
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Anúncio</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="assignment">Tarefa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                placeholder="Digite o conteúdo..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                disabled={isLoading}
                rows={6}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_pinned">Fixar no Topo</Label>
                <p className="text-xs text-muted-foreground">
                  Conteúdo fixado aparecerá no topo da lista
                </p>
              </div>
              <Switch
                id="is_pinned"
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_pinned: checked }))}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Conteúdo"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 