# Sistema de Pagamento - Spark Course Community

## Visão Geral

O sistema de pagamento foi implementado usando o **Stripe** como gateway de pagamento principal, oferecendo suporte completo para pagamentos no Brasil com cartão de crédito, PIX e boleto bancário.

## Funcionalidades

### ✅ Implementado
- ✅ Integração com Stripe
- ✅ Suporte a múltiplos métodos de pagamento (Cartão, PIX, Boleto)
- ✅ Sistema de webhooks para confirmação automática
- ✅ Histórico de pagamentos
- ✅ Matrícula automática após pagamento confirmado
- ✅ Interface de pagamento responsiva
- ✅ Validações de segurança
- ✅ Logs detalhados de transações

### 🔄 Em Desenvolvimento
- 🔄 Stripe Elements para formulário de cartão
- 🔄 Página de histórico de pagamentos
- 🔄 Relatórios administrativos
- 🔄 Sistema de reembolso

## Arquitetura

### Backend
```
backend/
├── config/
│   └── stripe.js          # Configuração do Stripe
├── index.js               # Endpoints de pagamento
└── package.json           # Dependência do Stripe
```

### Frontend
```
src/
├── pages/
│   └── Payment.tsx        # Página de pagamento
└── components/
    └── ui/                # Componentes de UI
```

### Banco de Dados
```
supabase/migrations/
└── 20250116000000-create-payment-system.sql
```

## Configuração

### 1. Instalar Dependências

```bash
# Na raiz do projeto
chmod +x scripts/setup-payment-system.sh
./scripts/setup-payment-system.sh
```

### 2. Configurar Stripe

1. **Criar conta no Stripe**
   - Acesse: https://stripe.com
   - Crie uma conta e ative o modo de teste

2. **Obter chaves de API**
   - Dashboard → Developers → API Keys
   - Copie as chaves de teste

3. **Configurar variáveis de ambiente**

```yaml
# docker-stack.yml
environment:
  - STRIPE_SECRET_KEY=sk_test_your_secret_key_here
  - STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
  - STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Configurar Webhook

1. **No Dashboard do Stripe**
   - Developers → Webhooks → Add endpoint
   - URL: `https://seu-dominio.com/api/webhooks/stripe`
   - Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`

2. **Obter Webhook Secret**
   - Copie o "Signing secret" do webhook criado
   - Configure em `STRIPE_WEBHOOK_SECRET`

### 4. Aplicar Migração

```sql
-- Execute no seu banco de dados
-- Arquivo: supabase/migrations/20250116000000-create-payment-system.sql
```

## Endpoints da API

### Criar Payment Intent
```http
POST /api/payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "course_id": "uuid-do-curso"
}
```

**Resposta:**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "amount": "R$ 99,90",
  "course": {
    "id": "uuid",
    "title": "Nome do Curso",
    "price": 99.90
  }
}
```

### Confirmar Pagamento
```http
POST /api/payments/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "payment_intent_id": "pi_xxx"
}
```

### Histórico de Pagamentos
```http
GET /api/payments/history
Authorization: Bearer <token>
```

### Detalhes do Pagamento
```http
GET /api/payments/:paymentId
Authorization: Bearer <token>
```

### Webhook do Stripe
```http
POST /api/webhooks/stripe
Content-Type: application/json
Stripe-Signature: t=xxx,v1=xxx
```

## Fluxo de Pagamento

### 1. Usuário acessa página de pagamento
- Sistema verifica se o curso é pago
- Verifica se usuário já está matriculado
- Exibe informações do curso e preço

### 2. Usuário inicia pagamento
- Frontend chama `/api/payments/create-intent`
- Backend cria Payment Intent no Stripe
- Retorna `client_secret` para o frontend

### 3. Usuário confirma pagamento
- Frontend integra com Stripe Elements
- Usuário insere dados do cartão/PIX
- Stripe processa o pagamento

### 4. Confirmação automática
- Stripe envia webhook para `/api/webhooks/stripe`
- Backend processa o evento
- Cria matrícula automaticamente
- Atualiza status do pagamento

### 5. Redirecionamento
- Usuário é redirecionado para o player do curso
- Pode começar a assistir as aulas imediatamente

## Estrutura do Banco de Dados

### Tabela `payments`
```sql
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    course_id UUID NOT NULL REFERENCES public.courses(id),
    stripe_payment_intent_id TEXT UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB
);
```

### Tabela `stripe_webhooks`
```sql
CREATE TABLE public.stripe_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payment_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Segurança

### Validações Implementadas
- ✅ Autenticação obrigatória em todos os endpoints
- ✅ Verificação de propriedade do pagamento
- ✅ Validação de assinatura do webhook
- ✅ Prevenção de pagamentos duplicados
- ✅ Verificação de matrícula existente

### Boas Práticas
- 🔒 Chaves do Stripe em variáveis de ambiente
- 🔒 Webhook secret para validação
- 🔒 Logs detalhados para auditoria
- 🔒 Tratamento de erros robusto

## Testes

### Cartões de Teste do Stripe

**Cartão de Sucesso:**
- Número: `4242 4242 4242 4242`
- Data: Qualquer data futura
- CVC: Qualquer 3 dígitos

**Cartão de Falha:**
- Número: `4000 0000 0000 0002`
- Data: Qualquer data futura
- CVC: Qualquer 3 dígitos

### PIX de Teste
- Use o QR Code gerado pelo Stripe
- Pague com qualquer app de pagamento

### Boleto de Teste
- Use o código de barras gerado
- Pague em qualquer banco

## Monitoramento

### Logs Importantes
```bash
# Payment Intent criado
[POST /api/payments/create-intent] Payment Intent criado: pi_xxx

# Webhook recebido
[WEBHOOK STRIPE] Evento recebido: payment_intent.succeeded

# Matrícula criada
[WEBHOOK STRIPE] Matrícula criada: uuid
```

### Métricas a Monitorar
- Taxa de conversão de pagamentos
- Tempo médio de processamento
- Taxa de falha por método de pagamento
- Volume de vendas por período

## Troubleshooting

### Problemas Comuns

**1. Webhook não recebido**
- Verificar URL do webhook no Stripe
- Verificar se o domínio está acessível
- Verificar logs do servidor

**2. Pagamento não confirmado**
- Verificar status no Stripe Dashboard
- Verificar logs do webhook
- Verificar se a matrícula foi criada

**3. Erro de assinatura do webhook**
- Verificar `STRIPE_WEBHOOK_SECRET`
- Verificar se o webhook está correto
- Verificar logs de erro

### Comandos Úteis

```bash
# Verificar logs do container
docker logs <container_name>

# Testar conectividade com Stripe
curl -X POST /api/payments/create-intent

# Verificar status do banco
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;
```

## Próximos Passos

### Melhorias Planejadas
1. **Stripe Elements** - Formulário de cartão nativo
2. **Página de histórico** - Visualizar pagamentos anteriores
3. **Relatórios admin** - Dashboard de vendas
4. **Sistema de reembolso** - Cancelamento e reembolso
5. **Cupons de desconto** - Promoções e códigos
6. **Assinaturas** - Cursos recorrentes
7. **Múltiplas moedas** - Suporte internacional

### Integrações Futuras
- **MercadoPago** - Gateway alternativo
- **PayPal** - Pagamento internacional
- **PagSeguro** - Gateway brasileiro
- **Cielo** - Gateway brasileiro

## Suporte

### Documentação
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Brazil](https://stripe.com/docs/payments/payment-methods/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

### Contato
- Issues: GitHub Issues
- Email: suporte@seudominio.com
- Discord: Comunidade do projeto

---

**Versão:** 1.0.0  
**Última atualização:** Janeiro 2025  
**Autor:** Spark Course Community Team 