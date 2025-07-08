import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Course } from "@/types";

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (classData: any) => void;
  isLoading: boolean;
}

interface CreateClassFormData {
  course_id: string;
  instance_name: string;
  instance_description: string;
  is_public: boolean;
  max_students: string;
  start_date: string;
  end_date: string;
  schedule: string;
  location: string;
}

export function CreateClassModal({ isOpen, onClose, onSubmit, isLoading }: CreateClassModalProps) {
  const token = localStorage.getItem('token');
  const [courses, setCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState<CreateClassFormData>({
    course_id: '',
    instance_name: '',
    instance_description: '',
    is_public: false,
    max_students: '',
    start_date: '',
    end_date: '',
    schedule: '',
    location: ''
  });

  // Buscar cursos disponíveis
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCourses(data);
        }
      } catch (error) {
        console.error('Erro ao carregar cursos:', error);
      }
    };

    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.course_id || !formData.instance_name.trim()) {
      toast.error('Selecione um curso e forneça um nome para a turma');
      return;
    }

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          course_id: formData.course_id,
          instance_name: formData.instance_name.trim(),
          instance_description: formData.instance_description.trim() || null,
          is_public: formData.is_public,
          max_students: formData.max_students ? parseInt(formData.max_students) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          schedule: formData.schedule || null,
          location: formData.location || null
        })
      });

      if (response.ok) {
        toast.success('Turma criada com sucesso!');
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar turma');
      }
    } catch (error) {
      console.error('Erro ao criar turma:', error);
      toast.error('Erro ao criar turma');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        course_id: '',
        instance_name: '',
        instance_description: '',
        is_public: false,
        max_students: '',
        start_date: '',
        end_date: '',
        schedule: '',
        location: ''
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Nova Turma</DialogTitle>
          <DialogDescription>
            Configure os detalhes da sua nova turma. Você pode ajustar as configurações depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="course_id">Curso *</Label>
              <Select value={formData.course_id} onValueChange={(value) => setFormData(prev => ({ ...prev, course_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instance_name">Nome da Turma *</Label>
              <Input
                id="instance_name"
                value={formData.instance_name}
                onChange={(e) => setFormData(prev => ({ ...prev, instance_name: e.target.value }))}
                placeholder="Nome da turma"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instance_description">Descrição</Label>
              <Textarea
                id="instance_description"
                value={formData.instance_description}
                onChange={(e) => setFormData(prev => ({ ...prev, instance_description: e.target.value }))}
                placeholder="Descrição da turma"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="max_students">Limite de Alunos</Label>
              <Input
                id="max_students"
                type="number"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ ...prev, max_students: e.target.value }))}
                placeholder="Deixe em branco para sem limite"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Data de Início</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">Data de Fim</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule">Horário</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                placeholder="Ex: Segundas e Quartas, 19h-21h"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Local da turma (presencial ou online)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked as boolean }))}
              />
              <Label htmlFor="is_public">Turma pública</Label>
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
                "Criar Turma"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
