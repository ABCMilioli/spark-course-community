# Sistema de Múltiplos Gateways - Spark Course Community

## Visão Geral

O sistema agora suporta **múltiplos gateways de pagamento** simultaneamente:
- **Stripe** - Gateway internacional
- **Mercado Pago** - Gateway brasileiro

## 🚀 Funcionalidades

### ✅ Implementado
- ✅ Integração simultânea Stripe + Mercado Pago
- ✅ Seleção de gateway pelo usuário
- ✅ Webhooks para ambos os gateways
- ✅ Histórico unificado de pagamentos
- ✅ Estatísticas por gateway
- ✅ Interface responsiva com seleção
- ✅ Redirecionamento automático (Mercado Pago)
- ✅ Confirmação automática via webhooks

### 🔄 Em Desenvolvimento
- 🔄 Stripe Elements para formulário nativo
- 🔄 Página de histórico detalhada
- 🔄 Relatórios comparativos
- 🔄 Sistema de fallback automático

## Arquitetura

### Backend
```
backend/
├── config/
│   ├── stripe.js          # Configuração do Stripe
│   └── mercadopago.js     # Configuração do Mercado Pago
├── index.js               # Endpoints unificados
└── package.json           # Dependências dos gateways
```

### Banco de Dados
```
supabase/migrations/
├── 20250116000000-create-payment-system.sql    # Sistema base
└── 20250116000001-add-mercadopago-support.sql  # Suporte MP
```

## Configuração

### 1. Instalar Dependências

```bash
cd backend
npm install stripe@^14.21.0 mercadopago@^2.0.7
```

### 2. Configurar Stripe

1. **Criar conta**: https://stripe.com
2. **Obter chaves**: Dashboard → Developers → API Keys
3. **Configurar webhook**: URL: `https://seu-dominio.com/api/webhooks/stripe`

### 3. Configurar Mercado Pago

1. **Criar conta**: https://www.mercadopago.com.br
2. **Obter Access Token**: Dashboard → Credenciais
3. **Configurar webhook**: URL: `https://seu-dominio.com/api/webhooks/mercadopago`

### 4. Variáveis de Ambiente

```yaml
# docker-stack.yml
environment:
  # Stripe
  - STRIPE_SECRET_KEY=sk_test_...
  - STRIPE_WEBHOOK_SECRET=whsec_...
  - STRIPE_PUBLISHABLE_KEY=pk_test_...
  
  # Mercado Pago
  - MERCADOPAGO_ACCESS_TOKEN=TEST_...
  - MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com/api/webhooks/mercadopago
  - MERCADOPAGO_SUCCESS_URL=https://seu-dominio.com/payment/success
  - MERCADOPAGO_FAILURE_URL=https://seu-dominio.com/payment/failure
  - MERCADOPAGO_PENDING_URL=https://seu-dominio.com/payment/pending
```

## Endpoints da API

### Stripe
```http
POST /api/payments/create-intent
POST /api/payments/confirm
POST /api/webhooks/stripe
```

### Mercado Pago
```http
POST /api/payments/mercadopago/create-preference
POST /api/webhooks/mercadopago
```

### Unificados
```http
GET /api/payments/history
GET /api/payments/:paymentId
GET /api/payments/methods
GET /api/payments/stats
```

## Fluxo de Pagamento

### 1. Usuário seleciona gateway
- Interface permite escolher entre Stripe e Mercado Pago
- Cada gateway tem suas características destacadas

### 2. Criação do pagamento
- **Stripe**: Cria Payment Intent
- **Mercado Pago**: Cria Preferência de Pagamento

### 3. Processamento
- **Stripe**: Integração direta (futuro: Stripe Elements)
- **Mercado Pago**: Redirecionamento para checkout

### 4. Confirmação
- **Ambos**: Via webhooks automáticos
- Matrícula criada automaticamente
- Status atualizado no banco

## Comparação dos Gateways

| Característica | Stripe | Mercado Pago |
|---|---|---|
| **País de origem** | EUA | Argentina |
| **Taxas** | ~2.9% + R$ 0.60 | ~2.99% + R$ 0.60 |
| **Métodos** | Cartão, PIX, Boleto | Cartão, PIX, Boleto, TED |
| **Integração** | Direta | Redirecionamento |
| **Suporte** | Internacional | Brasileiro |
| **Documentação** | Excelente | Boa |
| **Facilidade** | Alta | Média |

## Estrutura do Banco

### Tabela `payments` (Atualizada)
```sql
CREATE TABLE public.payments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    gateway TEXT NOT NULL DEFAULT 'stripe', -- 'stripe' ou 'mercadopago'
    stripe_payment_intent_id TEXT,
    external_reference TEXT, -- Para Mercado Pago
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    payment_method_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB
);
```

### Tabelas de Webhooks
```sql
-- Stripe
CREATE TABLE public.stripe_webhooks (...);

-- Mercado Pago
CREATE TABLE public.mercadopago_webhooks (...);
```

## Testes

### Stripe (Cartões de Teste)
- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`

### Mercado Pago (Cartões de Teste)
- **Sucesso**: `4509 9535 6623 3704`
- **Falha**: `4000 0000 0000 0002`

### PIX e Boleto
- Ambos os gateways geram QR codes/códigos de teste
- Use apps reais para testar

## Monitoramento

### Logs Importantes
```bash
# Stripe
[POST /api/payments/create-intent] Payment Intent criado: pi_xxx
[WEBHOOK STRIPE] Evento recebido: payment_intent.succeeded

# Mercado Pago
[POST /api/payments/mercadopago/create-preference] Preferência criada: xxx
[WEBHOOK MERCADOPAGO] Processando pagamento: 123456789
```

### Estatísticas
```sql
-- Ver estatísticas por gateway
SELECT * FROM get_payment_stats();
```

## Vantagens do Sistema Múltiplo

### 1. **Redundância**
- Se um gateway falhar, o outro continua funcionando
- Maior confiabilidade do sistema

### 2. **Flexibilidade**
- Usuários podem escolher o gateway preferido
- Diferentes taxas e métodos disponíveis

### 3. **Cobertura Geográfica**
- Stripe: Internacional
- Mercado Pago: Foco no Brasil

### 4. **Competição**
- Taxas competitivas entre gateways
- Melhor experiência para o usuário

## Troubleshooting

### Problemas Comuns

**1. Webhook não recebido**
- Verificar URLs nos dashboards
- Verificar logs do servidor
- Testar conectividade

**2. Pagamento não confirmado**
- Verificar status no dashboard do gateway
- Verificar logs do webhook
- Verificar se a matrícula foi criada

**3. Erro de configuração**
- Verificar variáveis de ambiente
- Verificar chaves de API
- Verificar permissões

### Comandos Úteis

```bash
# Verificar logs
docker logs <container_name> | grep -E "(STRIPE|MERCADOPAGO)"

# Testar endpoints
curl -X POST /api/payments/create-intent
curl -X POST /api/payments/mercadopago/create-preference

# Verificar banco
SELECT gateway, COUNT(*) FROM payments GROUP BY gateway;
```

## Próximos Passos

### Melhorias Planejadas
1. **Stripe Elements** - Formulário nativo
2. **Fallback automático** - Trocar gateway em caso de falha
3. **Análise de performance** - Comparar taxas de sucesso
4. **Gateway adicional** - PayPal ou PagSeguro
5. **Dashboard unificado** - Relatórios comparativos

### Integrações Futuras
- **PayPal** - Pagamento internacional
- **PagSeguro** - Gateway brasileiro
- **Cielo** - Gateway brasileiro
- **Stone** - Gateway brasileiro

## Suporte

### Documentação
- [Stripe Docs](https://stripe.com/docs)
- [Mercado Pago Docs](https://www.mercadopago.com.br/developers)
- [Stripe Brazil](https://stripe.com/docs/payments/payment-methods/overview)
- [Mercado Pago API](https://www.mercadopago.com.br/developers/docs)

### Contato
- Issues: GitHub Issues
- Email: suporte@seudominio.com
- Discord: Comunidade do projeto

---

**Versão:** 2.0.0  
**Última atualização:** Janeiro 2025  
**Autor:** Spark Course Community Team 