import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (classData: { name: string; description?: string; is_public: boolean; max_students?: number }) => void;
  isLoading: boolean;
}

export function CreateClassModal({ isOpen, onClose, onSubmit, isLoading }: CreateClassModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_public: false,
    max_students: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[CreateClassModal] Formulário submetido com dados:', formData);
    
    if (!formData.name.trim()) {
      toast.error("Nome da turma é obrigatório");
      return;
    }

    const classData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      is_public: formData.is_public,
      max_students: formData.max_students ? parseInt(formData.max_students) : undefined
    };

    console.log('[CreateClassModal] Dados processados para envio:', classData);
    onSubmit(classData);
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: "",
        description: "",
        is_public: false,
        max_students: ""
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Turma</DialogTitle>
          <DialogDescription>
            Configure os detalhes da sua nova turma. Você pode ajustar as configurações depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Turma *</Label>
              <Input
                id="name"
                placeholder="Ex: Turma de React Avançado"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo e conteúdo da turma..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_students">Limite de Alunos</Label>
              <Input
                id="max_students"
                type="number"
                placeholder="Deixe em branco para sem limite"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ ...prev, max_students: e.target.value }))}
                disabled={isLoading}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Defina um limite para controlar o número máximo de alunos na turma
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_public">Turma Pública</Label>
                <p className="text-xs text-muted-foreground">
                  Turmas públicas são visíveis para todos os usuários
                </p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
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
                "Criar Turma"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
