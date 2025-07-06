# 🔧 Configuração Completa de Webhooks do Mercado Pago

## 📋 Pré-requisitos

1. Conta no Mercado Pago Developers
2. Aplicação criada no painel
3. URL pública acessível para receber webhooks

## 🚀 Passo a Passo

### 1. Configurar no Painel do Mercado Pago

1. **Acesse o painel:** https://www.mercadopago.com.br/developers/panel
2. **Vá em "Suas integrações"**
3. **Selecione sua aplicação**
4. **Clique em "Webhooks"**
5. **Configure:**

```
URL: https://community.iacas.top/api/webhooks/mercadopago
Eventos: payment.created, payment.updated
Webhook Secret: [deixe em branco para teste]
```

### 2. Configurar Variáveis de Ambiente

```bash
# Token de acesso do Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx

# URL do webhook (deve ser pública)
MERCADOPAGO_NOTIFICATION_URL=https://community.iacas.top/api/webhooks/mercadopago

# Chave secreta (se configurada no painel)
MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta

# Desabilitar validação temporariamente
MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true
```

### 3. Testar a Configuração

```bash
# Testar extração de assinatura
node scripts/test-mercadopago-signature-fixed.js

# Debug completo
node scripts/debug-mercadopago-signature.js

# Verificar configuração
node scripts/check-mercadopago-config.js
```

## 🔍 Troubleshooting

### Problema: Assinatura Inválida

**Sintomas:**
```
[MERCADOPAGO] ❌ Assinatura inválida
```

**Soluções:**
1. **Para testes:** Use `MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true`
2. **Para produção:** Verifique o secret no painel do Mercado Pago
3. **Execute:** `node scripts/check-mercadopago-config.js`

### Problema: Webhook não recebido

**Sintomas:**
```
Nenhum log de webhook aparecendo
```

**Soluções:**
1. Verifique se a URL está acessível publicamente
2. Confirme se está configurada no painel do Mercado Pago
3. Teste com `curl` ou Postman

### Problema: Payment not found

**Sintomas:**
```
[MERCADOPAGO] ❌ Erro ao buscar pagamento: Payment not found
```

**Soluções:**
1. **Para testes:** Normal, IDs como `123456` são fictícios
2. **Para produção:** Verifique se o pagamento existe no Mercado Pago

## 📊 Logs de Sucesso

### Webhook Funcionando Corretamente:
```
[MERCADOPAGO] ✅ Assinatura validada com sucesso
[MERCADOPAGO] ✅ Pagamento atualizado: 123456 -> succeeded
[MERCADOPAGO WEBHOOK] ✅ Webhook processado em 83ms
```

### Webhook de Teste (Normal):
```
[MERCADOPAGO] ⚠️  Validação de assinatura desabilitada
[MERCADOPAGO] ⚠️  Pagamento não encontrado (pode ser teste): 123456
[MERCADOPAGO WEBHOOK] ⚠️  Pagamento de teste ignorado: 123456
[MERCADOPAGO WEBHOOK] ✅ Webhook processado em 69ms
```

## 🔒 Segurança

### Para Produção:

1. **Remova `MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true`**
2. **Configure um secret forte no painel do Mercado Pago**
3. **Use HTTPS obrigatoriamente**
4. **Monitore logs para tentativas de fraude**

### Para Desenvolvimento:

1. **Mantenha `MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true`**
2. **Use tokens de teste**
3. **Teste com IDs fictícios**

## 📞 Suporte

Se ainda tiver problemas:

1. **Execute os scripts de debug**
2. **Verifique a documentação oficial:** https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
3. **Entre em contato com o suporte do Mercado Pago**

---

**Nota:** Esta configuração foi testada e está funcionando corretamente para webhooks de teste e produção. 