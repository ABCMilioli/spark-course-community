import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Lock, Check, Loader2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import axios from 'axios';
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'mercadopago'>('stripe');

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-payment', courseIdFromParams],
    queryFn: () => fetchCourseDetail(courseIdFromParams!),
    enabled: !!courseIdFromParams,
  });

  const handleCreatePaymentIntent = async () => {
    if (!course) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      if (selectedGateway === 'stripe') {
        const { data } = await axios.post(`${API_URL}/payments/create-intent`, {
          course_id: courseIdFromParams
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPaymentIntent(data);
        toast.success('Pagamento preparado com sucesso!');
      } else {
        const { data } = await axios.post(`${API_URL}/payments/mercadopago/create-preference`, {
          course_id: courseIdFromParams
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPaymentIntent(data);
        toast.success('Preferência de pagamento criada!');
      }
    } catch (error: any) {
      console.error('Erro ao criar pagamento:', error);
      toast.error(error.response?.data?.error || 'Erro ao preparar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentIntent) {
      await handleCreatePaymentIntent();
      return;
    }

    if (selectedGateway === 'stripe') {
      // Aqui você implementaria a integração com Stripe Elements
      // Por enquanto, vamos simular um pagamento bem-sucedido
      setIsProcessing(true);
      
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/payments/confirm`, {
          payment_intent_id: paymentIntent.payment_intent_id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success('Pagamento processado com sucesso!');
        navigate(`/player?courseId=${courseIdFromParams}`);
      } catch (error: any) {
        console.error('Erro ao processar pagamento:', error);
        toast.error(error.response?.data?.error || 'Erro ao processar pagamento');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Mercado Pago - redirecionar para checkout
      if (paymentIntent.init_point) {
        window.open(paymentIntent.init_point, '_blank');
        toast.success('Redirecionando para o Mercado Pago...');
      }
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

        {/* Gateway Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Escolha o Gateway de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedGateway === 'stripe' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedGateway('stripe')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <div>
                    <p className="font-medium">Stripe</p>
                    <p className="text-sm text-muted-foreground">Gateway internacional</p>
                  </div>
                  {selectedGateway === 'stripe' && (
                    <Check className="w-5 h-5 text-primary ml-auto" />
                  )}
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedGateway === 'mercadopago' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedGateway('mercadopago')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-sm">MP</span>
                  </div>
                  <div>
                    <p className="font-medium">Mercado Pago</p>
                    <p className="text-sm text-muted-foreground">Gateway brasileiro</p>
                  </div>
                  {selectedGateway === 'mercadopago' && (
                    <Check className="w-5 h-5 text-primary ml-auto" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Métodos de Pagamento Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Cartão de Crédito</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedGateway === 'stripe' ? 'Visa, Mastercard, Elo' : 'Visa, Mastercard, Elo, Hipercard'}
                  </p>
                </div>
                <Check className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">PIX</p>
                  <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                </div>
                <Check className="w-5 h-5 text-primary" />
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Boleto Bancário</p>
                  <p className="text-sm text-muted-foreground">Vencimento em 3 dias</p>
                </div>
                <Check className="w-5 h-5 text-primary" />
              </div>

              {selectedGateway === 'mercadopago' && (
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Transferência Bancária</p>
                    <p className="text-sm text-muted-foreground">PIX ou TED</p>
                  </div>
                  <Check className="w-5 h-5 text-primary" />
                </div>
              )}
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
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : selectedGateway === 'mercadopago' ? (
                <>
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Pagar com Mercado Pago - R$ {Number(course.price).toFixed(2)}
                </>
              ) : (
                `Finalizar Compra - R$ ${Number(course.price).toFixed(2)}`
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Ao finalizar, você concorda com nossos termos de uso
            </p>
            {paymentIntent && (
              <p className="text-xs text-center text-green-600 mt-2">
                ✓ {selectedGateway === 'mercadopago' ? 'Preferência criada' : 'Pagamento preparado'} com sucesso
              </p>
            )}
            {selectedGateway === 'mercadopago' && (
              <p className="text-xs text-center text-blue-600 mt-2">
                ⚡ Você será redirecionado para o Mercado Pago para finalizar o pagamento
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 