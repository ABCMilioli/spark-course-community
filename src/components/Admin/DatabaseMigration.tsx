import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function DatabaseMigration() {
  const [isApplying, setIsApplying] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyForumPostMigration = async () => {
    try {
      setIsApplying(true);
      setError(null);
      setMigrationStatus('Aplicando migration...');

      const token = localStorage.getItem('token');
      
      // Verificar estrutura atual
      let response = await fetch('/api/admin/check-forum-posts-structure', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const structure = await response.json();
        console.log('Estrutura atual:', structure);
        setMigrationStatus(`Estrutura atual: ${structure.columns.map((c: any) => c.column_name).join(', ')}`);
      }

      // Aplicar migration
      response = await fetch('/api/admin/apply-forum-posts-migration', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setMigrationStatus('Migration aplicada com sucesso!');
        toast.success('Migration aplicada com sucesso!');
        console.log('Migration result:', result);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao aplicar migration');
      }

    } catch (err: any) {
      console.error('Erro na migration:', err);
      setError(err.message);
      toast.error('Erro ao aplicar migration: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Migration dos Posts do Fórum
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Esta migration remove o campo cover_image_url e garante que content_image_url existe na tabela forum_posts.
        </p>

        {migrationStatus && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>{migrationStatus}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={applyForumPostMigration}
          disabled={isApplying}
          className="w-full"
        >
          {isApplying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Aplicando Migration...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Aplicar Migration
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 