import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Lock, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import axios from 'axios';
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.REACT_APP_API_URL || '/api';

async function fetchCourseDetail(courseId: string) {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export default function Payment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const courseIdFromParams = searchParams.get('courseId') || courseId;

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-payment', courseIdFromParams],
    queryFn: () => fetchCourseDetail(courseIdFromParams!),
    enabled: !!courseIdFromParams,
  });

  const handlePayment = async () => {
    try {
      // Aqui você implementaria a integração com gateway de pagamento
      // Por enquanto, vamos simular um pagamento bem-sucedido
      
      // Criar matrícula após pagamento
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/enrollments`, {
        course_id: courseIdFromParams,
        user_id: user?.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Pagamento processado com sucesso!');
      
      // Redirecionar para o player do curso
      navigate(`/player?courseId=${courseIdFromParams}`);
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento');
    }
  };

  const handleBack = () => {
    navigate(`/course/${courseIdFromParams}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-muted/40">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 p-6 bg-muted/40">
        <div className="max-w-2xl mx-auto text-center">
          <p>Curso não encontrado.</p>
          <Button onClick={() => navigate('/explore')} className="mt-4">
            Voltar para Explorar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 bg-muted/40">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Finalizar Compra</h1>
            <p className="text-muted-foreground">Complete sua matrícula no curso</p>
          </div>
        </div>

        {/* Course Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Resumo do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <img 
                src={course.thumbnail_url || '/placeholder.svg'} 
                alt={course.title}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h3 className="font-semibold">{course.title}</h3>
                <p className="text-sm text-muted-foreground">{course.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{course.level}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {course.students_count} estudantes matriculados
                  </span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Valor do curso:</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {Number(course.price).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Método de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <CreditCard className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Cartão de Crédito</p>
                  <p className="text-sm text-muted-foreground">Visa, Mastercard, Elo</p>
                </div>
                <Check className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">PIX</p>
                  <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>O que você recebe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Acesso vitalício ao curso</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Certificado de conclusão</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Suporte da comunidade</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Atualizações gratuitas</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>Garantia de 30 dias</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Card>
          <CardContent className="p-6">
            <Button 
              onClick={handlePayment} 
              className="w-full h-12 text-lg"
              size="lg"
            >
              Finalizar Compra - R$ {Number(course.price).toFixed(2)}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Ao finalizar, você concorda com nossos termos de uso
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 