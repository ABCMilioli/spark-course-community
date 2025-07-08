import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, File, X } from "lucide-react";

interface CreateClassContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contentData: { title: string; content: string; content_type: 'announcement' | 'material' | 'assignment'; is_pinned: boolean; file?: File }) => void;
  isLoading: boolean;
}

export function CreateClassContentModal({ isOpen, onClose, onSubmit, isLoading }: CreateClassContentModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    content_type: "announcement" as 'announcement' | 'material' | 'assignment',
    is_pinned: false
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!formData.content.trim() && !selectedFile) {
      toast.error("Conteúdo ou arquivo é obrigatório");
      return;
    }

    onSubmit({
      ...formData,
      file: selectedFile || undefined
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        title: "",
        content: "",
        content_type: "announcement",
        is_pinned: false
      });
      setSelectedFile(null);
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (500MB)
      if (file.size > 500 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 500MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Conteúdo</DialogTitle>
          <DialogDescription>
            Crie um novo conteúdo para a turma. Pode ser um anúncio, material ou tarefa com arquivo anexado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto">
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
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                placeholder="Digite o conteúdo (opcional se houver arquivo)..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                disabled={isLoading}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Arquivo (opcional)</Label>
              <div className="space-y-2">
                {!selectedFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      id="file"
                      onChange={handleFileChange}
                      disabled={isLoading}
                      className="hidden"
                      accept="*/*"
                    />
                    <label htmlFor="file" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Clique para selecionar um arquivo ou arraste aqui
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo 500MB • Todos os tipos de arquivo
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <File className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Tipo desconhecido'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        disabled={isLoading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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

          <DialogFooter className="flex-shrink-0">
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