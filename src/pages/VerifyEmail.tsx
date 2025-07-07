import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('resend');
      setMessage('Nenhum token de verificação encontrado. Você pode solicitar um novo link de verificação.');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      setStatus('loading');
      setMessage('Verificando seu email...');

      const response = await fetch('/api/auth/signup-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verificado com sucesso!');
        
        // Mostrar toast de sucesso
        sonnerToast.success('Conta criada com sucesso!', {
          description: 'Você já pode fazer login na plataforma.',
        });

        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Erro ao verificar email.');
      }
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      setStatus('error');
      setMessage('Erro de conexão. Tente novamente.');
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resendEmail) {
      setMessage('Por favor, informe seu email.');
      return;
    }

    try {
      setResendLoading(true);
      setMessage('Enviando novo email de verificação...');

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Novo email de verificação enviado!');
        setEmail(resendEmail);
        
        sonnerToast.success('Email enviado!', {
          description: 'Verifique sua caixa de entrada e spam.',
        });
      } else {
        setStatus('error');
        setMessage(data.error || 'Erro ao reenviar email.');
      }
    } catch (error) {
      console.error('Erro ao reenviar verificação:', error);
      setStatus('error');
      setMessage('Erro de conexão. Tente novamente.');
    } finally {
      setResendLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />;
      case 'loading':
        return <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />;
      default:
        return <Mail className="w-12 h-12 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'loading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-brand-blue rounded-lg flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl gradient-text">Verificação de Email</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Verificando seu email...'}
            {status === 'success' && 'Email verificado com sucesso!'}
            {status === 'error' && 'Erro na verificação'}
            {status === 'resend' && 'Solicitar novo link de verificação'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>

          {/* Message */}
          {message && (
            <Alert variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'default'}>
              <AlertDescription className={getStatusColor()}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Resend Form */}
          {status === 'resend' && (
            <form onSubmit={handleResendVerification} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="resendEmail" className="block text-sm font-medium">
                  Email para reenvio
                </label>
                <Input
                  id="resendEmail"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={resendLoading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={resendLoading}>
                {resendLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Reenviar Email
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Success Actions */}
          {status === 'success' && (
            <div className="space-y-4">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Ir para Login
              </Button>
            </div>
          )}

          {/* Error Actions */}
          {status === 'error' && (
            <div className="space-y-4">
              <Button 
                onClick={() => setStatus('resend')} 
                variant="outline"
                className="w-full"
              >
                Solicitar Novo Link
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Voltar ao Login
              </Button>
            </div>
          )}

          {/* General Actions */}
          {status !== 'loading' && status !== 'success' && (
            <div className="text-center">
              <Button 
                onClick={() => navigate('/')} 
                variant="ghost"
                className="text-sm"
              >
                Voltar ao Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 