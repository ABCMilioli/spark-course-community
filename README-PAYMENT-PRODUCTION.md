# 🚀 Configuração de Gateways de Pagamento para Produção

Guia completo para configurar Stripe e Mercado Pago em ambiente de produção.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do Stripe](#configuração-do-stripe)
3. [Configuração do Mercado Pago](#configuração-do-mercado-pago)
4. [Variáveis de Ambiente](#variáveis-de-ambiente)
5. [Configuração de Webhooks](#configuração-de-webhooks)
6. [Testes](#testes)
7. [Monitoramento](#monitoramento)
8. [Troubleshooting](#troubleshooting)

## 🔧 Pré-requisitos

### 1. Contas dos Gateways
- ✅ **Conta Stripe** (stripe.com) - verificada e ativa
- ✅ **Conta Mercado Pago** (mercadopago.com.br) - verificada e ativa
- ✅ **Domínio próprio** com HTTPS válido
- ✅ **Certificado SSL** configurado

### 2. Ambiente de Produção
- ✅ **Servidor** com Node.js 18+ e PostgreSQL
- ✅ **DNS** configurado para seu domínio
- ✅ **Firewall** configurado (portas 80, 443, 5432)
- ✅ **Backup** automatizado do banco de dados

## 💳 Configuração do Stripe

### 1. Obter Chaves de Produção

1. **Acesse o Dashboard:** https://dashboard.stripe.com
2. **Ative o modo Live:** Toggle no canto superior esquerdo
3. **Navegue para:** Developers > API keys
4. **Copie as chaves:**
   - `Publishable key` (pk_live_...)
   - `Secret key` (sk_live_...)

### 2. Configurar Webhooks

1. **Vá para:** Developers > Webhooks
2. **Clique:** "Add endpoint"
3. **Configure:**
   - **URL:** `https://seu-dominio.com/api/webhooks/stripe`
   - **Eventos:** Selecione:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `payment_intent.processing`
     - `payment_intent.requires_action`

4. **Copie o Webhook Secret** (whsec_...)

### 3. Configurar Métodos de Pagamento Brasileiros

1. **Vá para:** Settings > Payment methods
2. **Ative:**
   - ✅ **PIX** (Pagamento instantâneo)
   - ✅ **Boleto** (Boleto bancário)
   - ✅ **Cartões** (Visa, Mastercard, Elo)

## 🛒 Configuração do Mercado Pago

### 1. Obter Access Token de Produção

1. **Acesse:** https://www.mercadopago.com.br/developers
2. **Vá para:** Suas integrações > Criar aplicação
3. **Configure:**
   - **Nome:** EduCommunity Payment
   - **Modelo de integração:** Checkout Pro
   - **Produtos:** Pagamentos online

4. **Copie as credenciais de PRODUÇÃO:**
   - `Access Token` (APP_USR-...)
   - `Client ID`
   - `Client Secret`

### 2. Configurar Webhooks

1. **Vá para:** Webhooks na sua aplicação
2. **Configure a URL:** `https://seu-dominio.com/api/webhooks/mercadopago`
3. **Eventos:** Selecione:
   - `payment` (pagamentos)
   - `merchant_order` (pedidos)

4. **Configure validação de assinatura** (opcional mas recomendado)

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env.production` com todas as configurações:

```bash
# ===== PRODUÇÃO - GATEWAYS DE PAGAMENTO =====

# Base
NODE_ENV=production
APP_URL=https://seu-dominio.com
API_URL=https://seu-dominio.com/api

# Banco de Dados
POSTGRES_HOST=seu-db-host
POSTGRES_PORT=5432
POSTGRES_USER=seu-usuario
POSTGRES_PASSWORD=sua-senha-segura
POSTGRES_DB=educommunity_prod

# Stripe (PRODUÇÃO)
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Mercado Pago (PRODUÇÃO)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_CLIENT_ID=xxxxxxxxxxxxxxxx
MERCADOPAGO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=sua-chave-secreta-opcional

# URLs de Retorno
PAYMENT_SUCCESS_URL=https://seu-dominio.com/payment/success
PAYMENT_FAILURE_URL=https://seu-dominio.com/payment/failure
PAYMENT_CANCEL_URL=https://seu-dominio.com/payment/cancel

# Webhooks
MERCADOPAGO_NOTIFICATION_URL=https://seu-dominio.com/api/webhooks/mercadopago

# Segurança
JWT_SECRET=sua-chave-jwt-super-segura-256-bits
ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🎯 Configuração de Webhooks

### Stripe Webhooks

```bash
# Testar webhook do Stripe
curl -X POST https://seu-dominio.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=timestamp,v1=signature" \
  -d '{"id":"evt_test","type":"payment_intent.succeeded"}'
```

### Mercado Pago Webhooks

```bash
# Testar webhook do Mercado Pago
curl -X POST https://seu-dominio.com/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","action":"payment.updated","data":{"id":"123456789"}}'
```

## 🧪 Testes

### 1. Script de Teste Automático

Execute o script de teste:

```bash
# PowerShell (Windows)
.\scripts\test-payment-production.ps1

# Bash (Linux/Mac)
./scripts/test-payment-production.sh
```

### 2. Teste Manual

1. **Acesse:** `https://seu-dominio.com/admin/payments`
2. **Verifique:**
   - ✅ Dashboard carrega sem erros
   - ✅ Estatísticas são exibidas
   - ✅ Métodos de pagamento aparecem
   - ✅ Exportação CSV funciona

### 3. Teste de Pagamento Real

1. **Crie um curso com preço baixo** (R$ 1,00)
2. **Teste pagamento com:**
   - 💳 Cartão de teste Stripe
   - 🛒 Checkout Mercado Pago
   - 📱 PIX (valores baixos)

## 📊 Monitoramento

### 1. Logs de Produção

```bash
# Verificar logs do backend
docker logs educommunity-backend -f

# Filtrar logs de pagamento
docker logs educommunity-backend 2>&1 | grep -E "STRIPE|MERCADOPAGO|PAYMENT"
```

### 2. Métricas Importantes

- **Taxa de Sucesso:** > 95%
- **Tempo de Resposta:** < 2s
- **Webhooks:** 100% de entrega
- **Erros:** < 1% das transações

### 3. Alertas Recomendados

- 🚨 **Taxa de falha > 5%**
- 🚨 **Webhook não recebido > 10min**
- 🚨 **Pagamento pendente > 24h**
- 🚨 **Erro de conexão com gateway**

## 🔍 Troubleshooting

### Problemas Comuns

#### ❌ "Stripe não está configurado"

**Causa:** Chave secreta inválida ou ausente

**Solução:**
```bash
# Verificar se a chave está correta
echo $STRIPE_SECRET_KEY | grep "sk_live_"

# Reiniciar o serviço
docker restart educommunity-backend
```

#### ❌ "Mercado Pago não configurado"

**Causa:** Access token inválido ou ausente

**Solução:**
```bash
# Verificar token
echo $MERCADOPAGO_ACCESS_TOKEN | grep "APP_USR-"

# Testar API do MP
curl -H "Authorization: Bearer $MERCADOPAGO_ACCESS_TOKEN" \
  https://api.mercadopago.com/v1/payment_methods
```

#### ❌ "Webhook signature inválida"

**Causa:** Secret do webhook incorreto

**Solução:**
1. Verifique o secret no dashboard do gateway
2. Atualize a variável de ambiente
3. Reinicie o serviço

#### ❌ "Erro 500 nos endpoints"

**Causa:** Banco de dados desconectado ou tabela ausente

**Solução:**
```bash
# Verificar conexão com DB
docker exec educommunity-backend node -e "
const { Pool } = require('pg');
const pool = new Pool(process.env);
pool.query('SELECT NOW()').then(console.log);
"

# Verificar se as tabelas existem
docker exec educommunity-db psql -U postgres -d educommunity_prod -c "
SELECT tablename FROM pg_tables WHERE tablename = 'payments';
"
```

## 🛡️ Segurança

### 1. Checklist de Segurança

- ✅ **HTTPS** obrigatório em produção
- ✅ **Webhook secrets** configurados
- ✅ **Rate limiting** ativo
- ✅ **CORS** restrito ao seu domínio
- ✅ **Logs** não expõem dados sensíveis
- ✅ **Chaves** armazenadas como secrets
- ✅ **Backup** criptografado

### 2. Rotação de Chaves

**Frequência recomendada:** A cada 6 meses

1. Gere novas chaves no dashboard
2. Atualize as variáveis de ambiente
3. Teste com chaves antigas e novas
4. Atualize produção
5. Revogue chaves antigas

## 📈 Otimização

### 1. Performance

- **Cache:** Implementado para Payment Intents (30s)
- **Pool de Conexões:** PostgreSQL otimizado
- **Timeouts:** 10s para APIs externas
- **Retry:** 3 tentativas automáticas

### 2. Custos

- **Stripe:** 3.4% + R$ 0,40 por transação
- **Mercado Pago:** 4.99% para cartão, 2.99% para PIX
- **Sugestão:** Oferecer desconto para PIX

## 🎉 Próximos Passos

Após a configuração em produção:

1. **📊 Analytics:** Integrar Google Analytics de pagamentos
2. **📧 Notificações:** Email para pagamentos bem-sucedidos
3. **🎯 A/B Testing:** Testar diferentes fluxos de checkout
4. **🤖 Anti-fraude:** Implementar regras de segurança
5. **📱 Mobile:** Otimizar checkout para mobile

---

## 📞 Suporte

- **Stripe:** https://support.stripe.com
- **Mercado Pago:** https://www.mercadopago.com.br/developers/pt/support
- **Documentação:** Este arquivo 😊

**✅ Sistema configurado e funcionando em produção!** 🚀 