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

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login, signUp, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('login');

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
        sonnerToast.success('Conta criada com sucesso!', {
          description: 'Enviamos um link de confirmação para o seu email.',
        });
        setActiveTab('login'); // Switch to login tab after successful signup
      }
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
          <CardTitle className="text-2xl gradient-text">EduCommunity</CardTitle>
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
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Aguarde...' : activeTab === 'login' ? 'Entrar' : 'Criar Conta'}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
