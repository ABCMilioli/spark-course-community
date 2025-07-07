import { useQuery } from '@tanstack/react-query';
import { X, Mail, Users, Eye, MousePointer, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import axios from 'axios';
import { CampaignStats } from '@/types';

const API_URL = process.env.REACT_APP_API_URL || '/api';

interface CampaignStatsModalProps {
  campaignId: string;
  onClose: () => void;
}

export function CampaignStatsModal({ campaignId, onClose }: CampaignStatsModalProps) {
  // Buscar estatísticas da campanha
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['campaign-stats', campaignId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/email-campaigns/${campaignId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data as CampaignStats;
    }
  });

  if (error) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estatísticas da Campanha</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              Erro ao carregar estatísticas: {error.message}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const campaign = stats?.campaign;
  const campaignStats = stats?.stats;

  // Calcular taxas
  const getRate = (value: number, total: number) => {
    if (!total || total === 0 || !value || value === 0) return '0%';
    const rate = Math.round((value / total) * 100);
    if (!isFinite(rate) || isNaN(rate)) return '0%';
    return `${rate}%`;
  };

  const deliveryRate = getRate(campaignStats?.delivered_count || 0, campaignStats?.total_recipients || 0);
  const openRate = getRate(campaignStats?.opened_count || 0, campaignStats?.delivered_count || 0);
  const clickRate = getRate(campaignStats?.clicked_count || 0, campaignStats?.delivered_count || 0);
  const bounceRate = getRate(campaignStats?.bounced_count || 0, campaignStats?.total_recipients || 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Estatísticas da Campanha
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : campaign ? (
          <div className="space-y-6">
            {/* Informações da Campanha */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{campaign.subject}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Status</p>
                    <Badge variant={
                      campaign.status === 'sent' ? 'default' :
                      campaign.status === 'sending' ? 'default' :
                      campaign.status === 'scheduled' ? 'secondary' :
                      campaign.status === 'cancelled' ? 'destructive' : 'secondary'
                    }>
                      {campaign.status === 'draft' ? 'Rascunho' :
                       campaign.status === 'scheduled' ? 'Agendada' :
                       campaign.status === 'sending' ? 'Enviando' :
                       campaign.status === 'sent' ? 'Enviada' :
                       campaign.status === 'cancelled' ? 'Cancelada' : campaign.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium">Criada em</p>
                    <p className="text-muted-foreground">
                      {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Enviada em</p>
                    <p className="text-muted-foreground">
                      {campaign.sent_at 
                        ? new Date(campaign.sent_at).toLocaleDateString('pt-BR')
                        : 'Não enviada'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Tipo</p>
                    <p className="text-muted-foreground capitalize">{campaign.campaign_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{campaignStats?.total_recipients || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Enviados</p>
                      <p className="text-2xl font-bold">{campaignStats?.sent_count || 0}</p>
                    </div>
                    <Mail className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Abertos</p>
                      <p className="text-2xl font-bold">{campaignStats?.opened_count || 0}</p>
                    </div>
                    <Eye className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Clicados</p>
                      <p className="text-2xl font-bold">{campaignStats?.clicked_count || 0}</p>
                    </div>
                    <MousePointer className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Taxas de Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Taxas de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Taxa de Entrega</span>
                    <span className="text-sm text-muted-foreground">{deliveryRate}</span>
                  </div>
                  <Progress value={parseFloat(deliveryRate.replace('%', ''))} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Taxa de Abertura</span>
                    <span className="text-sm text-muted-foreground">{openRate}</span>
                  </div>
                  <Progress value={parseFloat(openRate.replace('%', ''))} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Taxa de Clique</span>
                    <span className="text-sm text-muted-foreground">{clickRate}</span>
                  </div>
                  <Progress value={parseFloat(clickRate.replace('%', ''))} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Taxa de Bounce</span>
                    <span className="text-sm text-muted-foreground">{bounceRate}</span>
                  </div>
                  <Progress value={parseFloat(bounceRate.replace('%', ''))} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Status Detalhado */}
            <Card>
              <CardHeader>
                <CardTitle>Status Detalhado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-green-600">{campaignStats?.delivered_count || 0}</p>
                    <p className="text-sm text-green-600">Entregues</p>
                  </div>

                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-blue-600">{campaignStats?.opened_count || 0}</p>
                    <p className="text-sm text-blue-600">Abertos</p>
                  </div>

                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <MousePointer className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-purple-600">{campaignStats?.clicked_count || 0}</p>
                    <p className="text-sm text-purple-600">Clicados</p>
                  </div>

                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-red-600">{campaignStats?.bounced_count || 0}</p>
                    <p className="text-sm text-red-600">Bounces</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logs Recentes */}
            {stats?.recent_logs && stats.recent_logs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Logs Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {stats.recent_logs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {log.action === 'sent' && <Mail className="w-4 h-4 text-green-600" />}
                          {log.action === 'delivered' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                          {log.action === 'opened' && <Eye className="w-4 h-4 text-purple-600" />}
                          {log.action === 'clicked' && <MousePointer className="w-4 h-4 text-orange-600" />}
                          {log.action === 'bounced' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                          {log.action === 'failed' && <X className="w-4 h-4 text-red-600" />}
                          
                          <span className="text-sm font-medium capitalize">{log.action}</span>
                          <span className="text-sm text-muted-foreground">{log.email}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              Nenhuma estatística disponível para esta campanha.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 