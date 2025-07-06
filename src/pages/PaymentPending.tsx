import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, RefreshCw, Home, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '@/lib/utils';

export default function PaymentPending() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [checkCount, setCheckCount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [isChecking, setIsChecking] = useState(false);
  
  const courseId = searchParams.get('courseId');
  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');

  // Função para verificar status do pagamento
  const checkPaymentStatus = async () => {
    if (!courseId) return;
    
    try {
      setIsChecking(true);
      const token = localStorage.getItem('token');
      
      // Verificar status do pagamento
      const { data: payment } = await axios.get(`${API_URL}/payments/status/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Status do pagamento:', payment);
      
      if (payment.status === 'succeeded' || payment.status === 'approved') {
        setPaymentStatus('succeeded');
        toast.success('Pagamento aprovado! Redirecionando para o curso...');
        
        // Aguardar um pouco para o usuário ver a mensagem
        setTimeout(() => {
          navigate(`/player?courseId=${courseId}`);
        }, 2000);
        
        return true;
      } else if (payment.status === 'failed' || payment.status === 'rejected') {
        setPaymentStatus('failed');
        toast.error('Pagamento foi rejeitado');
        setTimeout(() => {
          navigate(`/payment/failure?courseId=${courseId}&payment_id=${paymentId}`);
        }, 2000);
        
        return true;
      }
      
      setPaymentStatus(payment.status);
      return false;
      
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Verificação inicial
    const initialCheck = async () => {
      setIsLoading(true);
      await checkPaymentStatus();
      setIsLoading(false);
    };
    
    initialCheck();
  }, [courseId]);

  // Polling automático
  useEffect(() => {
    if (!isLoading && paymentStatus === 'pending') {
      const interval = setInterval(async () => {
        setCheckCount(prev => prev + 1);
        const isCompleted = await checkPaymentStatus();
        
        if (isCompleted) {
          clearInterval(interval);
        }
      }, 10000); // Verificar a cada 10 segundos

      return () => clearInterval(interval);
    }
  }, [isLoading, paymentStatus]);

  const handleCheckStatus = async () => {
    setCheckCount(prev => prev + 1);
    toast.info('Verificando status do pagamento...');
    await checkPaymentStatus();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToCourses = () => {
    navigate('/courses');
  };

  const handleGoToCourse = () => {
    if (courseId) {
      navigate(`/course/${courseId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando pagamento...</p>
        </div>
      </div>
    );
  }

  // Se o pagamento foi aprovado, mostrar tela de sucesso
  if (paymentStatus === 'succeeded') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Pagamento Aprovado!</CardTitle>
            <p className="text-muted-foreground mt-2">
              Redirecionando para o curso...
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-green-800">Status: Aprovado</h3>
              </div>
              <p className="text-sm text-green-700">
                Seu pagamento foi confirmado com sucesso!
              </p>
            </div>
            
            <Button 
              onClick={handleGoToCourse} 
              className="w-full"
              size="lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Ir para o Curso
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se o pagamento falhou
  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Pagamento Falhou</CardTitle>
            <p className="text-muted-foreground mt-2">
              Houve um problema com o pagamento
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h3 className="font-medium text-red-800">Status: Falhou</h3>
              </div>
              <p className="text-sm text-red-700">
                O pagamento não foi aprovado. Tente novamente.
              </p>
            </div>
            
            <Button 
              onClick={handleGoToCourse} 
              className="w-full"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl text-yellow-600">Pagamento Pendente</CardTitle>
          <p className="text-muted-foreground mt-2">
            Seu pagamento está sendo processado
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status do pagamento */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <h3 className="font-medium text-yellow-800">Status: {paymentStatus}</h3>
            </div>
            <p className="text-sm text-yellow-700">
              Estamos aguardando a confirmação do seu pagamento. 
              Isso pode levar alguns minutos.
            </p>
          </div>

          {/* Detalhes do pagamento */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">ID do Pagamento:</span>
              <span className="text-sm font-mono">{paymentId || externalReference || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Verificações:</span>
              <span className="text-sm font-medium">{checkCount}</span>
            </div>
          </div>

          {/* O que está acontecendo */}
          <div className="space-y-3">
            <h3 className="font-medium">O que está acontecendo?</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span>Pagamento enviado para processamento</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span>Aguardando confirmação do banco</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span>Verificação automática em andamento</span>
              </div>
            </div>
          </div>

          {/* Métodos de pagamento que podem estar pendentes */}
          <div className="space-y-3">
            <h3 className="font-medium">Métodos que podem estar pendentes:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>Boleto bancário (até 3 dias úteis)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>PIX (geralmente instantâneo)</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>Cartão de crédito (pode demorar)</span>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <Button 
              onClick={handleCheckStatus} 
              className="w-full"
              size="lg"
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verificar Status
                </>
              )}
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleGoToCourses} 
                variant="outline" 
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Ver Cursos
              </Button>
              
              <Button 
                onClick={handleGoHome} 
                variant="outline" 
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Início
              </Button>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="text-xs text-center text-muted-foreground pt-4 border-t">
            <p>Você receberá uma notificação quando o pagamento for confirmado.</p>
            <p className="mt-1">A página será atualizada automaticamente.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 