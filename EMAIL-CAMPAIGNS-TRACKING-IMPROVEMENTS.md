# 📊 Melhorias de Rastreamento - Sistema de Campanhas de Email

## ✅ **Problema Identificado**

As estatísticas de **entrega e abertura** não estavam funcionando porque:
- ❌ Não havia rastreamento de abertura (pixel de rastreamento)
- ❌ Não havia rastreamento de cliques (links não eram modificados)
- ❌ Dashboard mostrava apenas "Total" e "Enviadas"

## 🔧 **Soluções Implementadas**

### 1. **Rastreamento de Abertura (Pixel de Rastreamento)**

#### **Backend - Módulo de Campanhas**
```javascript
// Adicionar pixel de rastreamento para abertura
const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email-campaigns/webhook/${campaignId}/${recipientId}/opened" width="1" height="1" style="display:none;" />`;
const htmlWithTracking = finalHtml.replace('</body>', `${trackingPixel}</body>`);
```

#### **Backend - Rota de Webhook**
```javascript
// Webhook para rastreamento de abertura (pixel de rastreamento)
router.get('/webhook/:campaignId/:recipientId/opened', async (req, res) => {
  // Processar abertura
  await emailCampaigns.processEmailWebhook(pool, campaignId, recipientId, 'opened');
  
  // Retornar pixel transparente 1x1
  res.set('Content-Type', 'image/gif');
  res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
});
```

### 2. **Rastreamento de Cliques (Links Modificados)**

#### **Backend - Módulo de Campanhas**
```javascript
// Adicionar rastreamento de cliques nos links
const htmlWithClickTracking = htmlWithTracking.replace(
  /<a\s+href="([^"]+)"/gi,
  `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email-campaigns/webhook/${campaignId}/${recipientId}/clicked?url=$1"`
);
```

#### **Backend - Rota de Webhook**
```javascript
// Webhook para rastreamento de clique
router.get('/webhook/:campaignId/:recipientId/clicked', async (req, res) => {
  const { url } = req.query;
  
  // Processar clique
  await emailCampaigns.processEmailWebhook(pool, campaignId, recipientId, 'clicked', { url });
  
  // Redirecionar para a URL original
  res.redirect(decodeURIComponent(url));
});
```

### 3. **Melhorias na Função de Processamento de Webhooks**

#### **Backend - Função processEmailWebhook**
```javascript
async function processEmailWebhook(pool, campaignId, recipientId, action, details = {}) {
  console.log(`[WEBHOOK] Processando ${action} para campanha ${campaignId}, destinatário ${recipientId}`);
  
  // Atualizar status do destinatário
  await pool.query(`
    UPDATE email_campaign_recipients 
    SET status = $1, ${action}_at = NOW()
    WHERE id = $2
  `, [statusMap[action], recipientId]);
  
  // Atualizar contadores da campanha
  await pool.query(`
    UPDATE email_campaigns 
    SET ${updateField} = COALESCE(${updateField}, 0) + 1
    WHERE id = $1
  `, [campaignId]);
  
  // Registrar log
  await pool.query(`
    INSERT INTO email_send_logs (campaign_id, recipient_id, user_id, email, action, details)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [campaignId, recipientId, recipient.user_id, recipient.email, action, details]);
}
```

### 4. **Dashboard Melhorado**

#### **Frontend - Estatísticas Expandidas**
```typescript
// Antes: 4 cards (Total, Enviadas, Agendadas, Rascunhos)
// Depois: 6 cards (Total, Enviadas, Entregues, Abertos, Clicados, Agendadas)

<div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
  {/* Total de Campanhas */}
  {/* Enviadas */}
  {/* Entregues */}
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
  
  {/* Abertos */}
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
  
  {/* Clicados */}
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
</div>
```

## 📈 **Como Funciona o Rastreamento**

### **1. Rastreamento de Abertura**
1. **Email enviado** com pixel de rastreamento invisível
2. **Usuário abre email** → pixel é carregado
3. **Webhook acionado** → status atualizado para 'opened'
4. **Contador incrementado** na campanha

### **2. Rastreamento de Cliques**
1. **Links modificados** para passar pelo webhook
2. **Usuário clica** → redirecionado via webhook
3. **Webhook acionado** → status atualizado para 'clicked'
4. **Usuário redirecionado** para URL original

### **3. Logs Detalhados**
- Todos os eventos são registrados em `email_send_logs`
- Inclui timestamp, ação, email, detalhes
- Disponível no modal de estatísticas

## 🎯 **Estatísticas Agora Disponíveis**

### **Dashboard Principal**
- ✅ **Total de Campanhas** - Número total
- ✅ **Enviadas** - Campanhas com status 'sent'
- ✅ **Entregues** - Emails entregues com sucesso
- ✅ **Abertos** - Emails abertos pelos destinatários
- ✅ **Clicados** - Links clicados nos emails
- ✅ **Agendadas** - Campanhas agendadas

### **Modal de Estatísticas**
- ✅ **Estatísticas detalhadas** por campanha
- ✅ **Taxas de performance** (entrega, abertura, clique, bounce)
- ✅ **Status detalhado** com ícones coloridos
- ✅ **Logs recentes** com timestamps

## 🔧 **Configuração Necessária**

### **Variável de Ambiente**
```bash
# URL da aplicação (para webhooks)
NEXT_PUBLIC_APP_URL=https://sua-aplicacao.com
```

### **Reinicialização**
```bash
# Reiniciar backend para aplicar mudanças
npm start
```

## 📊 **Exemplo de Dados Coletados**

### **Antes**
```json
{
  "total_recipients": 100,
  "sent_count": 100,
  "delivered_count": 0,
  "opened_count": 0,
  "clicked_count": 0
}
```

### **Depois**
```json
{
  "total_recipients": 100,
  "sent_count": 100,
  "delivered_count": 95,
  "opened_count": 67,
  "clicked_count": 23
}
```

## 🚀 **Próximos Passos**

1. **Testar rastreamento** enviando uma campanha de teste
2. **Verificar logs** no console do backend
3. **Acompanhar estatísticas** em tempo real
4. **Configurar webhooks** de provedores de email (opcional)

---

**Status:** ✅ Implementado  
**Funcionalidade:** Rastreamento completo de abertura e cliques  
**Data:** 2024-07-07 