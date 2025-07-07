import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Mail, Users, Eye, Send, Calendar, Save, Loader2, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { EmailCampaign, EmailTemplate, RecipientPreview, ContentData } from '@/types';

const API_URL = process.env.REACT_APP_API_URL || '/api';

interface CreateCampaignModalProps {
  campaign?: EmailCampaign | null;
  templates: EmailTemplate[];
  onClose: () => void;
  onSuccess: () => void;
}

interface CampaignFormData {
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  campaign_type: string;
  target_audience: string;
  target_classes: string[];
  custom_filter?: any;
  scheduled_at?: string;
  reference_id?: string;
  reference_type?: string;
}

export function CreateCampaignModal({ campaign, templates, onClose, onSuccess }: CreateCampaignModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('content');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [recipientPreview, setRecipientPreview] = useState<RecipientPreview | null>(null);
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const form = useForm<CampaignFormData>({
    defaultValues: {
      name: '',
      subject: '',
      html_content: '',
      text_content: '',
      campaign_type: 'custom',
      target_audience: 'all',
      target_classes: [],
      custom_filter: null,
      scheduled_at: '',
      reference_id: '',
      reference_type: ''
    }
  });

  // Preencher formulário se for edição
  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        subject: campaign.subject,
        html_content: campaign.html_content,
        text_content: campaign.text_content,
        campaign_type: campaign.campaign_type,
        target_audience: campaign.target_audience,
        target_classes: campaign.target_classes || [],
        custom_filter: campaign.custom_filter,
        scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : '',
        reference_id: campaign.reference_id,
        reference_type: campaign.reference_type
      });
    }
  }, [campaign, form]);

  // Buscar preview de destinatários
  const { refetch: fetchRecipientPreview } = useQuery({
    queryKey: ['recipient-preview'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/email-campaigns/preview-recipients`, {
        target_audience: form.getValues('target_audience'),
        target_classes: form.getValues('target_classes'),
        custom_filter: form.getValues('custom_filter')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: false
  });

  // Buscar dados do conteúdo
  const { refetch: fetchContentData } = useQuery({
    queryKey: ['content-data'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/email-campaigns/content-data`, {
        reference_id: form.getValues('reference_id'),
        reference_type: form.getValues('reference_type')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: false
  });

  // Criar/atualizar campanha
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const token = localStorage.getItem('token');
      const url = campaign 
        ? `${API_URL}/email-campaigns/${campaign.id}`
        : `${API_URL}/email-campaigns`;
      
      const method = campaign ? 'PUT' : 'POST';
      
      const response = await axios({
        method,
        url,
        data,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    },
    onSuccess: () => {
      toast.success(campaign ? 'Campanha atualizada com sucesso!' : 'Campanha criada com sucesso!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao salvar campanha');
    }
  });

  // Enviar email de teste
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const formData = form.getValues();
      
      await axios.post(`${API_URL}/email-campaigns/test-send`, {
        to: testEmail,
        subject: formData.subject,
        html_content: formData.html_content,
        text_content: formData.text_content
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      toast.success('Email de teste enviado com sucesso!');
      setShowTestModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao enviar email de teste');
    }
  });

  // Aplicar template
  const applyTemplate = (template: EmailTemplate) => {
    form.setValue('subject', template.subject_template);
    form.setValue('html_content', template.html_template);
    form.setValue('text_content', template.text_template || '');
    form.setValue('campaign_type', template.campaign_type);
    setSelectedTemplate(template.id);
  };

  // Atualizar preview de destinatários
  const updateRecipientPreview = async () => {
    try {
      const result = await fetchRecipientPreview();
      if (result.data) {
        setRecipientPreview(result.data);
      }
    } catch (error) {
      console.error('Erro ao buscar preview de destinatários:', error);
    }
  };

  // Atualizar dados do conteúdo
  const updateContentData = async () => {
    try {
      const result = await fetchContentData();
      if (result.data) {
        setContentData(result.data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do conteúdo:', error);
    }
  };

  // Processar template com variáveis
  const processTemplate = (template: string, variables: any) => {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value || '');
    }
    return processed;
  };

  // Preview do email
  const getEmailPreview = () => {
    const formData = form.getValues();
    if (!formData.html_content) return '';
    
    const variables = {
      ...contentData,
      user_name: 'Usuário Exemplo',
      user_email: 'exemplo@email.com',
      unsubscribe_url: '#'
    };
    
    return processTemplate(formData.html_content, variables);
  };

  const onSubmit = (data: CampaignFormData) => {
    createCampaignMutation.mutate(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {campaign ? 'Editar Campanha' : 'Nova Campanha'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="audience">Público</TabsTrigger>
              <TabsTrigger value="schedule">Agendamento</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* Aba de Conteúdo */}
            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Campanha</Label>
                    <Input
                      id="name"
                      {...form.register('name', { required: 'Nome é obrigatório' })}
                      placeholder="Ex: Divulgação do novo curso"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="campaign_type">Tipo de Campanha</Label>
                    <Select
                      value={form.watch('campaign_type')}
                      onValueChange={(value) => form.setValue('campaign_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post">Post da Comunidade</SelectItem>
                        <SelectItem value="forum">Post do Fórum</SelectItem>
                        <SelectItem value="course">Novo Curso</SelectItem>
                        <SelectItem value="lesson">Nova Aula</SelectItem>
                        <SelectItem value="class_material">Material de Turma</SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject">Assunto do Email</Label>
                    <Input
                      id="subject"
                      {...form.register('subject', { required: 'Assunto é obrigatório' })}
                      placeholder="Ex: Novo curso disponível!"
                    />
                    {form.formState.errors.subject && (
                      <p className="text-sm text-red-500">{form.formState.errors.subject.message}</p>
                    )}
                  </div>

                  {/* Referência do conteúdo */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="reference_type">Tipo de Referência</Label>
                      <Select
                        value={form.watch('reference_type') || undefined}
                        onValueChange={(value) => {
                          form.setValue('reference_type', value);
                          form.setValue('reference_id', '');
                          updateContentData();
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="post">Post</SelectItem>
                          <SelectItem value="forum_post">Post do Fórum</SelectItem>
                          <SelectItem value="course">Curso</SelectItem>
                          <SelectItem value="lesson">Aula</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reference_id">ID da Referência</Label>
                      <Input
                        id="reference_id"
                        {...form.register('reference_id')}
                        placeholder="ID do conteúdo"
                        onChange={(e) => {
                          form.setValue('reference_id', e.target.value);
                          updateContentData();
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Templates Disponíveis</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {templates
                        .filter(t => t.campaign_type === form.watch('campaign_type') || form.watch('campaign_type') === 'custom')
                        .map((template) => (
                          <Card
                            key={template.id}
                            className={`cursor-pointer transition-colors ${
                              selectedTemplate === template.id ? 'border-primary' : ''
                            }`}
                            onClick={() => applyTemplate(template)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{template.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {template.campaign_type}
                                  </p>
                                </div>
                                {template.is_default && (
                                  <Badge variant="secondary" className="text-xs">Padrão</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>

                  {contentData && Object.keys(contentData).length > 0 && (
                    <div>
                      <Label>Dados do Conteúdo</Label>
                      <Card>
                        <CardContent className="p-3">
                          <div className="space-y-1 text-sm">
                            {Object.entries(contentData).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-medium">{key}:</span>
                                <span className="text-muted-foreground">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="html_content">Conteúdo HTML</Label>
                  <Textarea
                    id="html_content"
                    {...form.register('html_content', { required: 'Conteúdo HTML é obrigatório' })}
                    placeholder="Digite o conteúdo HTML do email..."
                    rows={15}
                    className="font-mono text-sm"
                  />
                  {form.formState.errors.html_content && (
                    <p className="text-sm text-red-500">{form.formState.errors.html_content.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="text_content">Conteúdo Texto (opcional)</Label>
                  <Textarea
                    id="text_content"
                    {...form.register('text_content')}
                    placeholder="Versão em texto puro do email..."
                    rows={5}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba de Público */}
            <TabsContent value="audience" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target_audience">Público Alvo</Label>
                  <Select
                    value={form.watch('target_audience')}
                    onValueChange={(value) => {
                      form.setValue('target_audience', value);
                      updateRecipientPreview();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      <SelectItem value="instructors">Apenas instrutores</SelectItem>
                      <SelectItem value="students">Apenas estudantes</SelectItem>
                      <SelectItem value="specific_classes">Turmas específicas</SelectItem>
                      <SelectItem value="custom_filter">Filtro personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Preview de Destinatários</Label>
                  <Card>
                    <CardContent className="p-4">
                      {recipientPreview ? (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Total: {recipientPreview.count} destinatários
                          </p>
                          <div className="space-y-1">
                            {recipientPreview.recipients.map((recipient) => (
                              <div key={recipient.id} className="flex justify-between text-sm">
                                <span>{recipient.name}</span>
                                <span className="text-muted-foreground">{recipient.email}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Clique em "Atualizar Preview" para ver os destinatários
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={updateRecipientPreview}
                        className="mt-2"
                      >
                        Atualizar Preview
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Aba de Agendamento */}
            <TabsContent value="schedule" className="space-y-4">
              <div>
                <Label htmlFor="scheduled_at">Data e Hora de Envio (opcional)</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  {...form.register('scheduled_at')}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Deixe em branco para enviar imediatamente
                </p>
              </div>
            </TabsContent>

            {/* Aba de Preview */}
            <TabsContent value="preview" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Preview do Email</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTestModal(true)}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Enviar Teste
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div
                    className="border rounded-lg p-4 bg-white"
                    dangerouslySetInnerHTML={{ __html: getEmailPreview() }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {campaign ? 'Atualizar' : 'Criar'} Campanha
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Modal de Teste */}
        <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Email de Teste</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test_email">Email de Teste</Label>
                <Input
                  id="test_email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTestModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => testEmailMutation.mutate()}
                  disabled={testEmailMutation.isPending || !testEmail}
                >
                  {testEmailMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Teste
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
} 