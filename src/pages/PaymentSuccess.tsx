import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Home, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  
  const courseId = searchParams.get('courseId');
  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    // Simular verificação do pagamento
    const timer = setTimeout(() => {
      setIsLoading(false);
      toast.success('Pagamento confirmado com sucesso!');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoToCourse = () => {
    if (courseId) {
      navigate(`/player?courseId=${courseId}`);
    } else {
      navigate('/courses');
    }
  };

  const handleGoHome = () => {
    navigate('/');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">Pagamento Aprovado!</CardTitle>
          <p className="text-muted-foreground mt-2">
            Seu pagamento foi processado com sucesso
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Detalhes do pagamento */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">ID do Pagamento:</span>
              <span className="text-sm font-mono">{paymentId || externalReference || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm text-green-600 font-medium">Aprovado</span>
            </div>
          </div>

          {/* Próximos passos */}
          <div className="space-y-3">
            <h3 className="font-medium">O que acontece agora?</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Acesso imediato ao curso</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Certificado disponível após conclusão</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Suporte da comunidade ativo</span>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <Button 
              onClick={handleGoToCourse} 
              className="w-full"
              size="lg"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Ir para o Curso
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button 
              onClick={handleGoHome} 
              variant="outline" 
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>

          {/* Informações adicionais */}
          <div className="text-xs text-center text-muted-foreground pt-4 border-t">
            <p>Recebemos seu pagamento e você já tem acesso ao conteúdo.</p>
            <p className="mt-1">Em caso de dúvidas, entre em contato conosco.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 