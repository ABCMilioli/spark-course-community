# 📊 Página Administrativa de Pagamentos

Esta documentação descreve a página administrativa de pagamentos implementada no sistema, que permite aos administradores monitorar e gerenciar todos os pagamentos da plataforma.

## 🎯 Funcionalidades

### 📈 Dashboard Principal
- **Estatísticas Gerais**: Total de pagamentos, valor total, taxa de sucesso e pagamentos pendentes
- **Estatísticas por Gateway**: Comparação entre Stripe e Mercado Pago
- **Gráficos Visuais**: Barras de progresso para status e gateways

### 📋 Histórico de Pagamentos
- **Tabela Completa**: Todos os pagamentos com detalhes
- **Filtros Avançados**: Por gateway, status e período
- **Informações Detalhadas**: Usuário, curso, valor, data e status
- **Exportação**: Download em CSV dos dados filtrados

### 💳 Métodos de Pagamento
- **Visualização**: Métodos disponíveis no Mercado Pago
- **Ícones**: Representação visual de cada método
- **Descrições**: Informações sobre cada forma de pagamento

### 📊 Análises
- **Gráficos de Status**: Distribuição de pagamentos por status
- **Gráficos de Gateway**: Comparação entre gateways de pagamento
- **Métricas**: Taxas de sucesso e volumes

## 🚀 Como Acessar

### 1. Via Painel Admin
```
1. Acesse: http://localhost:3000/admin
2. Clique na aba "Pagamentos"
3. Clique em "Ver Página Completa"
```

### 2. Acesso Direto
```
http://localhost:3000/admin/payments
```

## 🔐 Controle de Acesso

- **Apenas Administradores**: Apenas usuários com role `admin` podem acessar
- **Verificação Automática**: O sistema verifica automaticamente as permissões
- **Redirecionamento**: Usuários não autorizados são redirecionados

## 📡 Endpoints da API

### GET `/api/payments/stats`
Retorna estatísticas de pagamentos por gateway.

**Resposta:**
```json
[
  {
    "gateway": "stripe",
    "total_payments": 150,
    "total_amount": 15000.00,
    "succeeded_payments": 140,
    "success_rate": 93.33
  },
  {
    "gateway": "mercadopago",
    "total_payments": 75,
    "total_amount": 7500.00,
    "succeeded_payments": 72,
    "success_rate": 96.00
  }
]
```

### GET `/api/payments/history`
Retorna histórico de pagamentos (todos para admin, apenas do usuário para usuários comuns).

**Resposta:**
```json
[
  {
    "id": "payment_123",
    "user_id": "user_456",
    "course_id": "course_789",
    "gateway": "stripe",
    "external_reference": "pi_123456789",
    "amount": 100.00,
    "status": "succeeded",
    "created_at": "2024-01-15T10:30:00Z",
    "course_title": "Curso de React",
    "user_name": "João Silva",
    "user_email": "joao@example.com"
  }
]
```

### GET `/api/payments/methods`
Retorna métodos de pagamento disponíveis.

**Resposta:**
```json
[
  {
    "id": "credit_card",
    "name": "Cartão de Crédito",
    "description": "Visa, Mastercard, Elo, Hipercard",
    "icon": "💳"
  },
  {
    "id": "pix",
    "name": "PIX",
    "description": "Pagamento instantâneo",
    "icon": "📱"
  }
]
```

## 🧪 Testando a Implementação

### Script de Teste (Windows)
```powershell
# Executar o script de teste
.\scripts\test-payment-admin.ps1
```

### Script de Teste (Linux/Mac)
```bash
# Executar o script de teste
./scripts/test-payment-admin.sh
```

### Testes Manuais
1. **Acesse a página**: `http://localhost:3000/admin/payments`
2. **Verifique as estatísticas**: Deve mostrar dados mesmo sem pagamentos
3. **Teste os filtros**: Filtre por gateway e status
4. **Exporte dados**: Teste o botão de exportação
5. **Verifique responsividade**: Teste em diferentes tamanhos de tela

## 🎨 Interface do Usuário

### Componentes Utilizados
- **Tabs**: Navegação entre seções
- **Cards**: Exibição de estatísticas
- **Table**: Histórico de pagamentos
- **Badge**: Status e gateways
- **Button**: Ações e filtros
- **Select**: Filtros de período e status

### Cores e Status
- **Verde**: Pagamentos aprovados
- **Amarelo**: Pagamentos pendentes
- **Vermelho**: Pagamentos falhados
- **Azul**: Stripe
- **Verde**: Mercado Pago

## 🔧 Configuração

### Variáveis de Ambiente
Certifique-se de que as seguintes variáveis estão configuradas no `docker-stack.yml`:

```yaml
# Stripe
STRIPE_SECRET_KEY: sk_test_...
STRIPE_PUBLISHABLE_KEY: pk_test_...
STRIPE_WEBHOOK_SECRET: whsec_...

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN: TEST-...
MERCADOPAGO_WEBHOOK_URL: https://community.iacas.top/api/webhooks/mercadopago
```

### Webhooks
Configure os webhooks nos gateways de pagamento:

**Stripe:**
```
URL: https://community.iacas.top/api/webhooks/stripe
Eventos: payment_intent.succeeded, payment_intent.payment_failed
```

**Mercado Pago:**
```
URL: https://community.iacas.top/api/webhooks/mercadopago
Eventos: payment
```

## 📊 Estrutura do Banco de Dados

### Tabela `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  course_id UUID REFERENCES courses(id),
  gateway VARCHAR(20) NOT NULL,
  external_reference VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  metadata JSONB,
  payment_method_details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🚨 Troubleshooting

### Problema: Página não carrega
**Solução:**
1. Verifique se o backend está rodando
2. Confirme se o usuário tem role `admin`
3. Verifique os logs do console do navegador

### Problema: Endpoints retornam erro 403
**Solução:**
1. Verifique se o token de autenticação é válido
2. Confirme se o usuário tem permissões de admin
3. Verifique se os endpoints estão protegidos corretamente

### Problema: Dados não aparecem
**Solução:**
1. Verifique se existem pagamentos no banco
2. Confirme se as queries estão funcionando
3. Verifique os logs do backend

### Problema: Filtros não funcionam
**Solução:**
1. Verifique se os estados estão sendo atualizados
2. Confirme se a lógica de filtro está correta
3. Verifique se os dados estão sendo re-renderizados

## 🔄 Atualizações Futuras

### Funcionalidades Planejadas
- **Relatórios Avançados**: Gráficos mais detalhados
- **Notificações**: Alertas para pagamentos pendentes
- **Reembolsos**: Interface para processar reembolsos
- **Reconciliação**: Comparação com extratos bancários
- **Auditoria**: Log de todas as ações administrativas

### Melhorias de Performance
- **Paginação**: Para grandes volumes de dados
- **Cache**: Para estatísticas frequentes
- **Lazy Loading**: Para carregar dados sob demanda
- **WebSockets**: Para atualizações em tempo real

## 📝 Logs e Monitoramento

### Logs do Backend
```javascript
// Exemplo de logs importantes
console.log('[GET /api/payments/stats] Buscando estatísticas');
console.log('[GET /api/payments/history] Buscando histórico');
console.log('[AUTH] Acesso negado para usuário:', userId);
```

### Monitoramento Recomendado
- **Taxa de erro**: Monitorar erros 4xx e 5xx
- **Tempo de resposta**: Latência dos endpoints
- **Uso de memória**: Consumo de recursos
- **Acessos**: Frequência de uso da página

## 🤝 Contribuição

Para contribuir com melhorias na página administrativa:

1. **Fork** o repositório
2. **Crie** uma branch para sua feature
3. **Implemente** as mudanças
4. **Teste** com o script de teste
5. **Documente** as mudanças
6. **Abra** um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:

1. **Verifique** esta documentação
2. **Execute** os scripts de teste
3. **Consulte** os logs do sistema
4. **Abra** uma issue no repositório

---

**Última atualização**: Janeiro 2025
**Versão**: 1.0.0
**Autor**: Sistema de Pagamentos 