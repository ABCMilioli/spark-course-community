# Sistema de Campanhas de Email

## 📧 Visão Geral

O Sistema de Campanhas de Email é uma funcionalidade completa para criar, gerenciar e enviar campanhas de email para divulgar conteúdo da plataforma. Permite segmentação de público, agendamento de envios, templates personalizáveis e estatísticas detalhadas.

## 🎯 Funcionalidades Principais

### ✅ **Tipos de Campanhas**
- **Posts da Comunidade** - Divulgação de posts
- **Posts do Fórum** - Divulgação de discussões
- **Novos Cursos** - Lançamento de cursos
- **Novas Aulas** - Aulas recém-publicadas
- **Materiais de Turma** - Conteúdo específico de turmas
- **Personalizadas** - Campanhas customizadas

### ✅ **Segmentação de Público**
- **Todos os usuários** - Campanha geral
- **Apenas instrutores** - Para educadores
- **Apenas estudantes** - Para alunos
- **Turmas específicas** - Para turmas selecionadas
- **Filtros personalizados** - Critérios avançados

### ✅ **Recursos Avançados**
- **Templates pré-definidos** - Layouts profissionais
- **Editor visual** - Interface amigável
- **Agendamento** - Envio programado
- **Estatísticas detalhadas** - Métricas completas
- **Logs de envio** - Rastreamento completo
- **Teste de envio** - Validação antes do envio

## 🏗️ Arquitetura

### **Backend**
```
backend/
├── modules/
│   └── emailCampaigns.js          # Lógica principal
├── routes/
│   └── emailCampaigns.js          # Endpoints da API
└── index-modular.cjs              # Registro das rotas
```

### **Frontend**
```
src/
├── pages/
│   └── EmailCampaigns.tsx         # Página principal
├── components/Admin/
│   ├── CreateCampaignModal.tsx    # Modal de criação
│   └── CampaignStatsModal.tsx     # Modal de estatísticas
└── types/
    └── index.ts                   # Tipos TypeScript
```

### **Banco de Dados**
```sql
-- Tabelas principais
email_campaigns              # Campanhas
email_campaign_recipients    # Destinatários
email_templates             # Templates
email_send_logs             # Logs de envio
```

## 🚀 Instalação

### 1. **Aplicar Migration**

**Bash (Linux/Mac):**
```bash
chmod +x scripts/apply-email-campaigns-migration.sh
./scripts/apply-email-campaigns-migration.sh
```

**PowerShell (Windows):**
```powershell
.\scripts\apply-email-campaigns-migration.ps1
```

### 2. **Reiniciar Backend**
```bash
# Parar o servidor atual
# Reiniciar para carregar as novas rotas
npm start
```

### 3. **Acessar Interface**
- Navegue para `/admin/email-campaigns`
- Apenas usuários admin têm acesso

## 📊 Estrutura do Banco de Dados

### **Tabela: email_campaigns**
```sql
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    campaign_type TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all',
    target_classes UUID[],
    custom_filter JSONB,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_by UUID NOT NULL,
    reference_id UUID,
    reference_type TEXT,
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    opened_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### **Tabela: email_templates**
```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    campaign_type TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 🔧 API Endpoints

### **Campanhas**
```http
GET    /api/email-campaigns              # Listar campanhas
POST   /api/email-campaigns              # Criar campanha
GET    /api/email-campaigns/:id          # Obter campanha
PUT    /api/email-campaigns/:id          # Atualizar campanha
DELETE /api/email-campaigns/:id          # Deletar campanha
```

### **Ações**
```http
POST   /api/email-campaigns/:id/send     # Enviar campanha
POST   /api/email-campaigns/:id/schedule # Agendar campanha
POST   /api/email-campaigns/:id/cancel   # Cancelar campanha
GET    /api/email-campaigns/:id/stats    # Estatísticas
```

### **Templates e Utilitários**
```http
GET    /api/email-campaigns/templates           # Listar templates
POST   /api/email-campaigns/preview-recipients  # Preview destinatários
POST   /api/email-campaigns/content-data        # Dados do conteúdo
POST   /api/email-campaigns/test-send           # Enviar teste
```

### **Webhooks**
```http
POST   /api/email-campaigns/webhook/:campaignId/:recipientId  # Eventos de email
```

## 📝 Exemplos de Uso

### **1. Criar Campanha de Post**
```javascript
const campaign = {
  name: "Divulgação do novo post",
  subject: "Novo post na comunidade: {{post_title}}",
  html_content: "<h1>{{post_title}}</h1><p>{{post_excerpt}}</p>",
  campaign_type: "post",
  target_audience: "all",
  reference_id: "post-uuid",
  reference_type: "post"
};

await axios.post('/api/email-campaigns', campaign);
```

### **2. Enviar para Turma Específica**
```javascript
const campaign = {
  name: "Material novo na turma",
  subject: "Novo material disponível",
  html_content: "<h1>{{material_title}}</h1>",
  campaign_type: "class_material",
  target_audience: "specific_classes",
  target_classes: ["class-uuid-1", "class-uuid-2"]
};
```

### **3. Agendar Envio**
```javascript
await axios.post('/api/email-campaigns/campaign-id/schedule', {
  scheduled_at: '2024-01-25T10:00:00Z'
});
```

## 🎨 Templates Disponíveis

### **Template de Post**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2>{{post_title}}</h2>
  <p>{{post_excerpt}}</p>
  <p>Por {{author_name}} • {{created_at}}</p>
  <a href="{{post_url}}">Ler Post Completo</a>
</div>
```

### **Template de Curso**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2>{{course_title}}</h2>
  <p>{{course_description}}</p>
  <p>Instrutor: {{instructor_name}}</p>
  <p>{{total_lessons}} aulas • {{course_duration}}</p>
  <a href="{{course_url}}">Ver Curso</a>
</div>
```

## 📈 Estatísticas e Métricas

### **Métricas Disponíveis**
- **Total de destinatários** - Quantidade total
- **Emails enviados** - Envios realizados
- **Taxa de entrega** - % de emails entregues
- **Taxa de abertura** - % de emails abertos
- **Taxa de clique** - % de cliques em links
- **Taxa de bounce** - % de emails retornados

### **Logs Detalhados**
- Timestamp de cada ação
- Status de cada destinatário
- Razões de falha
- Interações (abertura, clique)

## 🔒 Segurança e Permissões

### **Controle de Acesso**
- Apenas usuários **admin** podem criar campanhas
- Usuários podem ver apenas suas próprias campanhas
- Validação de dados em todas as operações

### **Proteções**
- Rate limiting para envios
- Validação de templates
- Sanitização de conteúdo HTML
- Logs de auditoria

## 🧪 Testes

### **Envio de Teste**
```javascript
await axios.post('/api/email-campaigns/test-send', {
  to: 'teste@email.com',
  subject: 'Teste de campanha',
  html_content: '<h1>Teste</h1>'
});
```

### **Preview de Destinatários**
```javascript
const preview = await axios.post('/api/email-campaigns/preview-recipients', {
  target_audience: 'students',
  target_classes: ['class-uuid']
});
```

## 🚨 Troubleshooting

### **Problemas Comuns**

1. **Migration não aplicada**
   ```bash
   # Verificar se as tabelas existem
   psql -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'email_%';"
   ```

2. **Rotas não encontradas**
   ```bash
   # Verificar se o backend foi reiniciado
   # Verificar logs do servidor
   ```

3. **Emails não enviados**
   ```bash
   # Verificar configuração do serviço de email
   # Verificar logs de envio
   ```

4. **Templates não carregados**
   ```bash
   # Verificar se os templates foram inseridos
   psql -c "SELECT COUNT(*) FROM email_templates;"
   ```

### **Logs Importantes**
```bash
# Logs do backend
tail -f backend/logs/app.log

# Logs de email
tail -f backend/logs/email.log
```

## 🔄 Atualizações Futuras

### **Funcionalidades Planejadas**
- [ ] Editor visual drag-and-drop
- [ ] A/B testing de campanhas
- [ ] Automação baseada em eventos
- [ ] Integração com analytics
- [ ] Templates responsivos
- [ ] Personalização avançada

### **Melhorias Técnicas**
- [ ] Cache de templates
- [ ] Envio em lote otimizado
- [ ] Webhooks para provedores de email
- [ ] Backup automático de campanhas

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação
2. Consulte os logs do sistema
3. Teste com campanhas simples
4. Entre em contato com o suporte

---

**Sistema de Campanhas de Email v1.0**  
Desenvolvido para Konektus  
© 2024 - Todos os direitos reservados 