import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast as sonnerToast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login, signUp, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'login') {
      const { error: loginError } = await login(email, password);
      if (loginError) {
        setError(loginError.message || 'Email ou senha incorretos');
      }
    } else {
      const { error: signUpError } = await signUp(name, email, password);
      if (signUpError) {
        setError(signUpError.message || 'Erro ao criar conta');
      } else {
        setVerificationEmail(email);
        setShowVerificationMessage(true);
        setActiveTab('login'); // Switch to login tab after successful signup
      }
    }
  };

  // Handler para envio do e-mail de recuperação
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);
    
    try {
      console.log('[LoginForm] Enviando solicitação de recuperação para:', forgotEmail);
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('[LoginForm] Solicitação de recuperação enviada com sucesso');
        setForgotSuccess('Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.');
        setForgotEmail('');
      } else {
        console.error('[LoginForm] Erro na resposta:', data);
        setForgotError(data.error || 'Erro ao enviar solicitação de recuperação.');
      }
    } catch (error) {
      console.error('[LoginForm] Erro ao enviar solicitação:', error);
      setForgotError('Erro de conexão. Tente novamente.');
    } finally {
      setForgotLoading(false);
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
          <CardTitle className="text-2xl gradient-text">Konektus</CardTitle>
          <CardDescription>
            Entre na sua conta para acessar a plataforma
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {activeTab === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <div className="text-right mt-1">
                  <button
                    type="button"
                    className="text-xs text-primary underline hover:text-brand-blue"
                    onClick={() => setShowForgotModal(true)}
                  >
                    Esqueci minha senha?
                  </button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Aguarde...' : activeTab === 'login' ? 'Entrar' : 'Criar Conta'}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de recuperação de senha */}
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail cadastrado para receber um link de redefinição de senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 py-2">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              required
              disabled={forgotLoading}
            />
            {forgotError && <Alert variant="destructive"><AlertDescription>{forgotError}</AlertDescription></Alert>}
            {forgotSuccess && <Alert variant="success"><AlertDescription>{forgotSuccess}</AlertDescription></Alert>}
            <DialogFooter>
              <Button type="submit" disabled={forgotLoading}>
                {forgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <DialogClose asChild>
                <Button variant="outline" type="button">Fechar</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de verificação de email */}
      <Dialog open={showVerificationMessage} onOpenChange={setShowVerificationMessage}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Verificação de Email</DialogTitle>
            <DialogDescription>
              Enviamos um link de verificação para o seu email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Alert>
              <AlertDescription>
                <p className="mb-2">
                  <strong>Email enviado para:</strong> {verificationEmail}
                </p>
                <p className="text-sm text-muted-foreground">
                  Clique no link enviado para confirmar seu email e ativar sua conta. 
                  Verifique também sua pasta de spam.
                </p>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <DialogClose asChild>
                <Button className="w-full">Entendi</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
