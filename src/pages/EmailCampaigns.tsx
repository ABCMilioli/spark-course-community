import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Mail, Users, Eye, Send, Calendar, Trash2, Edit, BarChart3, Filter, CheckCircle, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { EmailCampaign, EmailTemplate } from '@/types';
import { CreateCampaignModal } from '@/components/Admin/CreateCampaignModal';
import { CampaignStatsModal } from '@/components/Admin/CampaignStatsModal';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Função para buscar campanhas
async function fetchCampaigns(filters: any = {}) {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();
  
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.campaign_type && filters.campaign_type !== 'all') params.append('campaign_type', filters.campaign_type);
  if (filters.limit) params.append('limit', filters.limit.toString());
  
  const { data } = await axios.get(`${API_URL}/email-campaigns?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

// Função para buscar templates
async function fetchTemplates(campaignType?: string) {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();
  
  if (campaignType) params.append('campaign_type', campaignType);
  
  const { data } = await axios.get(`${API_URL}/email-campaigns/templates?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export default function EmailCampaigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: 'all',
    campaign_type: 'all'
  });
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Buscar campanhas
  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['email-campaigns', filters],
    queryFn: () => fetchCampaigns(filters),
    enabled: !!user
  });

  // Buscar templates
  const { data: templates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => fetchTemplates(),
    enabled: !!user
  });

  // Função para deletar campanha
  const deleteCampaign = async (campaignId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/email-campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Campanha deletada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      toast.error('Erro ao deletar campanha');
    }
  };

  // Função para enviar campanha
  const sendCampaign = async (campaignId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/email-campaigns/${campaignId}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Campanha enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    } catch (error: any) {
      console.error('Erro ao enviar campanha:', error);
      toast.error(error.response?.data?.error || 'Erro ao enviar campanha');
    }
  };

  // Função para cancelar campanha
  const cancelCampaign = async (campaignId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/email-campaigns/${campaignId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Campanha cancelada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    } catch (error: any) {
      console.error('Erro ao cancelar campanha:', error);
      toast.error(error.response?.data?.error || 'Erro ao cancelar campanha');
    }
  };

  // Função para obter status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Rascunho' },
      scheduled: { variant: 'default' as const, label: 'Agendada' },
      sending: { variant: 'default' as const, label: 'Enviando' },
      sent: { variant: 'default' as const, label: 'Enviada' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelada' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Função para obter tipo badge
  const getTypeBadge = (type: string) => {
    const typeConfig = {
      post: { variant: 'outline' as const, label: 'Post' },
      forum: { variant: 'outline' as const, label: 'Fórum' },
      course: { variant: 'outline' as const, label: 'Curso' },
      lesson: { variant: 'outline' as const, label: 'Aula' },
      class_material: { variant: 'outline' as const, label: 'Material' },
      custom: { variant: 'outline' as const, label: 'Personalizada' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.custom;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Função para obter público badge
  const getAudienceBadge = (audience: string) => {
    const audienceConfig = {
      all: { variant: 'secondary' as const, label: 'Todos' },
      instructors: { variant: 'secondary' as const, label: 'Instrutores' },
      students: { variant: 'secondary' as const, label: 'Estudantes' },
      specific_classes: { variant: 'secondary' as const, label: 'Turmas' },
      custom_filter: { variant: 'secondary' as const, label: 'Filtro' }
    };
    
    const config = audienceConfig[audience as keyof typeof audienceConfig] || audienceConfig.all;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar campanhas: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Campanhas de Email</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas de email para divulgar conteúdo
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                                          <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="sending">Enviando</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={filters.campaign_type} onValueChange={(value) => setFilters(prev => ({ ...prev, campaign_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                                          <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="forum">Fórum</SelectItem>
                  <SelectItem value="course">Curso</SelectItem>
                  <SelectItem value="lesson">Aula</SelectItem>
                  <SelectItem value="class_material">Material</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Campanhas</p>
                <p className="text-2xl font-bold">{campaigns?.length || 0}</p>
              </div>
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enviadas</p>
                <p className="text-2xl font-bold">
                  {campaigns?.filter(c => c.status === 'sent').length || 0}
                </p>
              </div>
              <Send className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entregues</p>
                <p className="text-2xl font-bold">
                  {campaigns?.reduce((total, c) => total + (c.delivered_count || 0), 0) || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Abertos</p>
                <p className="text-2xl font-bold">
                  {campaigns?.reduce((total, c) => total + (c.opened_count || 0), 0) || 0}
                </p>
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
                <p className="text-2xl font-bold">
                  {campaigns?.reduce((total, c) => total + (c.clicked_count || 0), 0) || 0}
                </p>
              </div>
              <MousePointer className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold">
                  {campaigns?.filter(c => c.status === 'scheduled').length || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : campaigns?.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma campanha encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira campanha de email para começar
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Campanha
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns?.map((campaign: EmailCampaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(campaign.status)}
                        {getTypeBadge(campaign.campaign_type)}
                        {getAudienceBadge(campaign.target_audience)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Estatísticas */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setShowStatsModal(true);
                      }}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Stats
                    </Button>
                    
                    {/* Ações baseadas no status */}
                    {campaign.status === 'draft' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendCampaign(campaign.id)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Enviar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setShowCreateModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      </>
                    )}
                    
                    {campaign.status === 'scheduled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelCampaign(campaign.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                    
                    {campaign.status === 'sent' && (
                      <div className="text-sm text-muted-foreground">
                        {campaign.sent_count} enviados
                      </div>
                    )}
                    
                    {/* Deletar (apenas rascunhos) */}
                    {campaign.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      {showCreateModal && (
        <CreateCampaignModal
          campaign={selectedCampaign}
          templates={templates || []}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCampaign(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
            setShowCreateModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}
      
      {showStatsModal && selectedCampaign && (
        <CampaignStatsModal
          campaignId={selectedCampaign.id}
          onClose={() => {
            setShowStatsModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
} 