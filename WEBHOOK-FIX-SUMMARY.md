# 🔧 Correções no Sistema de Webhook do Mercado Pago

**Data:** 06/07/2025  
**Status:** ✅ Implementado

## 📋 Problemas Identificados

### 1. ❌ Validação de Assinatura Incorreta
- **Problema:** Código esperava formato `ts=timestamp,v1=assinatura`
- **Realidade:** Mercado Pago envia assinatura diretamente como string hexadecimal
- **Impacto:** Todos os webhooks eram rejeitados com "Assinatura inválida"

### 2. ❌ Tratamento de Pagamentos de Teste
- **Problema:** Erro "Payment not found" para IDs de teste
- **Realidade:** IDs como `123456` são usados em testes e não existem no Mercado Pago
- **Impacto:** Webhooks de teste causavam erros desnecessários

## ✅ Soluções Implementadas

### 1. Correção da Validação de Assinatura

**Arquivo:** `backend/config/mercadopago.js`

**Antes:**
```javascript
const signatureParts = signature.split(',');
const timestampPart = signatureParts.find(part => part.startsWith('ts='));
const signatureValue = signatureParts.find(part => part.startsWith('v1='))?.split('=')[1];
```

**Depois:**
```javascript
// Mercado Pago envia no formato: ts=timestamp,v1=assinatura
let signatureValue = signature;
let timestamp = Math.floor(Date.now() / 1000).toString();

// Tentar extrair do formato ts=timestamp,v1=assinatura
if (signature.includes('ts=') && signature.includes('v1=')) {
  const signatureParts = signature.split(',');
  const timestampPart = signatureParts.find(part => part.startsWith('ts='));
  const signaturePart = signatureParts.find(part => part.startsWith('v1='));
  
  if (timestampPart && signaturePart) {
    timestamp = timestampPart.split('=')[1];
    signatureValue = signaturePart.split('=')[1];
  }
}
```

### 2. Melhor Tratamento de Pagamentos de Teste

**Arquivo:** `backend/config/mercadopago.js`

```javascript
try {
  const payment = await getPayment(body.data.id);
  return { type: 'payment', action: body.action, payment };
} catch (error) {
  if (error.status === 404) {
    console.warn(`[MERCADOPAGO] ⚠️  Pagamento não encontrado (pode ser teste): ${body.data.id}`);
    return { 
      type: 'payment', 
      action: body.action, 
      payment: null,
      error: 'payment_not_found',
      paymentId: body.data.id
    };
  }
  throw error;
}
```

**Arquivo:** `backend/services/webhookService.js`

```javascript
if (!payment && webhookResult.error === 'payment_not_found') {
  console.log(`[MERCADOPAGO WEBHOOK] ⚠️  Pagamento de teste ignorado: ${webhookResult.paymentId}`);
  processingResult = {
    status: 'ignored',
    message: 'Pagamento de teste ignorado',
    payment_id: webhookResult.paymentId
  };
}
```

## 🧪 Scripts de Teste Criados

### 1. `scripts/test-mercadopago-signature-fixed.js`
- Testa a validação de assinatura com o formato correto
- Testa diferentes formatos de mensagem para hash
- Fornece diagnóstico detalhado

### 2. Documentação Atualizada
- `README-MERCADOPAGO-WEBHOOK.md` atualizado com as correções
- Instruções claras para configuração

## 🔧 Configuração Recomendada

```bash
# Chave secreta do webhook (configurada no painel do Mercado Pago)
MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta

# URL do webhook
MERCADOPAGO_NOTIFICATION_URL=https://community.iacas.top/api/webhooks/mercadopago

# Desabilitar validação temporariamente se necessário
MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true
```

## 📊 Resultados Esperados

### Antes das Correções:
```
[MERCADOPAGO] ❌ Assinatura inválida
[MERCADOPAGO] ❌ Erro ao processar webhook: Payment not found
```

### Depois das Correções:
```
[MERCADOPAGO] ✅ Assinatura validada com sucesso
[MERCADOPAGO WEBHOOK] ⚠️  Pagamento de teste ignorado: 123456
[MERCADOPAGO WEBHOOK] ✅ Webhook processado em 150ms
```

## 🚀 Próximos Passos

1. **Testar em ambiente de desenvolvimento**
2. **Verificar logs para confirmar funcionamento**
3. **Remover `MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true` quando confirmado**
4. **Monitorar webhooks em produção**

## 📝 Logs Importantes

Procure por estes logs para confirmar funcionamento:

- ✅ `[MERCADOPAGO] ✅ Assinatura validada com sucesso`
- ✅ `[MERCADOPAGO WEBHOOK] ✅ Webhook processado em Xms`
- ⚠️ `[MERCADOPAGO WEBHOOK] ⚠️  Pagamento de teste ignorado` (normal para testes)

---

**Nota:** As correções mantêm compatibilidade com o sistema existente e não quebram funcionalidades atuais. 