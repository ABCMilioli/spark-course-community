import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, RefreshCw, Home, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentPending() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [checkCount, setCheckCount] = useState(0);
  
  const courseId = searchParams.get('courseId');
  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    // Simular carregamento inicial
    const timer = setTimeout(() => {
      setIsLoading(false);
      toast.info('Pagamento em processamento');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Simular verificação periódica do status
  useEffect(() => {
    if (!isLoading) {
      const interval = setInterval(() => {
        setCheckCount(prev => prev + 1);
        // Aqui você faria uma chamada real para verificar o status
        console.log('Verificando status do pagamento...');
      }, 10000); // Verificar a cada 10 segundos

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleCheckStatus = () => {
    setCheckCount(prev => prev + 1);
    toast.info('Verificando status do pagamento...');
    // Aqui você faria uma chamada real para verificar o status
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToCourses = () => {
    navigate('/courses');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
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
              <h3 className="font-medium text-yellow-800">Status: Pendente</h3>
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
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Verificar Status
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