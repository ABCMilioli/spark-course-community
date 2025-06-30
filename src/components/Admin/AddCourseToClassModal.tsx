import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Course } from "@/types";

interface AddCourseToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId: string;
  isLoading?: boolean;
}

interface AddCourseFormData {
  course_id: string;
  is_required: boolean;
  order_index: number;
}

export function AddCourseToClassModal({
  isOpen,
  onClose,
  onSuccess,
  classId,
  isLoading = false,
}: AddCourseToClassModalProps) {
  const [formData, setFormData] = useState<AddCourseFormData>({
    course_id: "",
    is_required: false,
    order_index: 0,
  });
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar cursos disponíveis
  useEffect(() => {
    if (isOpen) {
      fetchAvailableCourses();
    }
  }, [isOpen, classId]);

  const fetchAvailableCourses = async () => {
    try {
      setLoading(true);
      console.log('[AddCourseToClassModal] Buscando cursos disponíveis...');
      
      const response = await fetch("/api/courses", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AddCourseToClassModal] Erro na resposta:', response.status, errorText);
        throw new Error("Erro ao buscar cursos");
      }

      const courses = await response.json();
      console.log('[AddCourseToClassModal] Cursos encontrados:', courses.length);
      
      // Por enquanto, mostrar todos os cursos sem filtragem
      setAvailableCourses(courses);
      
      // TODO: Implementar filtragem depois que o problema for resolvido
      /*
      // Filtrar cursos que ainda não estão na turma
      try {
        console.log('[AddCourseToClassModal] Buscando cursos da turma:', classId);
        const classCoursesResponse = await fetch(`/api/classes/${classId}/courses`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (classCoursesResponse.ok) {
          const classCourses = await classCoursesResponse.json();
          console.log('[AddCourseToClassModal] Cursos da turma:', classCourses.length);
          const existingCourseIds = classCourses.map((cc: any) => cc.course_id);
          const filteredCourses = courses.filter((course: Course) => 
            !existingCourseIds.includes(course.id)
          );
          console.log('[AddCourseToClassModal] Cursos filtrados:', filteredCourses.length);
          setAvailableCourses(filteredCourses);
        } else {
          const errorText = await classCoursesResponse.text();
          console.warn('[AddCourseToClassModal] Não foi possível buscar cursos da turma:', classCoursesResponse.status, errorText);
          setAvailableCourses(courses);
        }
      } catch (error) {
        console.warn('[AddCourseToClassModal] Erro ao buscar cursos da turma, mostrando todos os cursos:', error);
        setAvailableCourses(courses);
      }
      */
    } catch (error) {
      console.error('[AddCourseToClassModal] Erro ao buscar cursos:', error);
      toast.error("Erro ao carregar cursos disponíveis");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.course_id) {
      toast.error("Selecione um curso");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/classes/${classId}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao adicionar curso");
      }

      toast.success("Curso adicionado à turma com sucesso!");
      onSuccess();
      onClose();
      setFormData({
        course_id: "",
        is_required: false,
        order_index: 0,
      });
    } catch (error) {
      console.error("Erro ao adicionar curso:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar curso");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setFormData({
        course_id: "",
        is_required: false,
        order_index: 0,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Curso à Turma</DialogTitle>
          <DialogDescription>
            Selecione um curso para adicionar à turma. Você pode definir se é obrigatório e a ordem de apresentação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="course_id">Curso</Label>
            <Select
              value={formData.course_id}
              onValueChange={(value) => setFormData({ ...formData, course_id: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um curso" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableCourses.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                Todos os cursos já estão adicionados à turma.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="order_index">Ordem de Apresentação</Label>
            <Input
              id="order_index"
              type="number"
              min="0"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
              disabled={loading}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Cursos com menor número aparecem primeiro.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_required"
              checked={formData.is_required}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, is_required: checked as boolean })
              }
              disabled={loading}
            />
            <Label htmlFor="is_required">Curso obrigatório</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Cursos obrigatórios não podem ser removidos da turma.
          </p>

          <DialogFooter className="flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.course_id}>
              {loading ? "Adicionando..." : "Adicionar Curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 