import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentFailure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  
  const courseId = searchParams.get('courseId');
  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');
  const errorMessage = searchParams.get('error_message') || 'Erro no processamento do pagamento';

  useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => {
      setIsLoading(false);
      toast.error('Pagamento não foi processado');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRetryPayment = () => {
    if (courseId) {
      navigate(`/payment?courseId=${courseId}`);
    } else {
      navigate('/courses');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGetHelp = () => {
    // Aqui você pode redirecionar para uma página de suporte
    toast.info('Entre em contato conosco para obter ajuda');
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
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Pagamento Falhou</CardTitle>
          <p className="text-muted-foreground mt-2">
            Não foi possível processar seu pagamento
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Detalhes do erro */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-2">Erro:</h3>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>

          {/* Detalhes do pagamento */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">ID do Pagamento:</span>
              <span className="text-sm font-mono">{paymentId || externalReference || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm text-red-600 font-medium">Falhou</span>
            </div>
          </div>

          {/* Possíveis causas */}
          <div className="space-y-3">
            <h3 className="font-medium">Possíveis causas:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Saldo insuficiente no cartão</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Dados do cartão incorretos</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Problemas temporários no gateway</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Limite de transação excedido</span>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <Button 
              onClick={handleRetryPayment} 
              className="w-full"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleGetHelp} 
                variant="outline" 
                className="w-full"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Ajuda
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
            <p>Não se preocupe, você não foi cobrado.</p>
            <p className="mt-1">Tente novamente ou entre em contato conosco.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 