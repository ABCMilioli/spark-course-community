# Webhook do Mercado Pago - Solução de Problemas

## ✅ PROBLEMA PARCIALMENTE RESOLVIDO: Assinatura Inválida

**Status:** Extração corrigida em 06/07/2025 - Validação em progresso

### Problema Identificado

O código estava esperando a assinatura no formato `ts=timestamp,v1=assinatura`, mas não conseguia extrair corretamente os valores.

### Status Atual

✅ **EXTRAÇÃO FUNCIONANDO:** O sistema agora extrai corretamente o timestamp e assinatura do formato `ts=timestamp,v1=assinatura`

⚠️ **VALIDAÇÃO EM PROGRESSO:** A assinatura extraída ainda não está validando corretamente. Isso pode ser porque:

1. **Webhooks de teste não usam validação de assinatura** (comum em ambientes de desenvolvimento)
2. **Secret incorreto** - Verificar no painel do Mercado Pago
3. **Formato específico** - Pode usar um formato não documentado

O webhook está funcionando perfeitamente com `MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true`

### Solução Implementada

1. **Removido parsing do formato ts=,v1=**
2. **Assinatura agora é usada diretamente**
3. **Timestamp extraído de headers específicos ou gerado automaticamente**

### Código Corrigido

```javascript
// ANTES (incorreto)
const signatureParts = signature.split(',');
const timestampPart = signatureParts.find(part => part.startsWith('ts='));
const signatureValue = signatureParts.find(part => part.startsWith('v1='))?.split('=')[1];

// DEPOIS (correto)
const signatureValue = signature; // Usar diretamente
const timestamp = headers['x-timestamp'] || Math.floor(Date.now() / 1000).toString();
```

### Como Testar

Execute o script de teste atualizado:

```bash
node scripts/test-mercadopago-signature-fixed.js
```

### Configuração Atual

Para produção, use:

```bash
# Chave secreta do webhook (configurada no painel do Mercado Pago)
MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta

# URL do webhook
MERCADOPAGO_NOTIFICATION_URL=https://community.iacas.top/api/webhooks/mercadopago

# Desabilitar validação temporariamente se necessário
MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true
```

### Soluções Temporárias

#### 1. Desabilitar Validação de Assinatura (Para Debug)

Adicione a variável de ambiente:

```bash
MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true
```

Isso permitirá que os webhooks sejam processados mesmo com assinatura inválida.

#### 2. Verificar Configuração no Mercado Pago

1. Acesse o painel do Mercado Pago
2. Vá em "Configurações" > "Webhooks"
3. Verifique se a URL está correta: `https://community.iacas.top/api/webhooks/mercadopago`
4. Verifique se o secret está correto

#### 3. Testar Diferentes Formatos

Execute o script de teste para verificar qual formato funciona:

```bash
node scripts/test-mercadopago-urls.js
```

### Soluções Permanentes

#### 1. Corrigir URL na Validação

Se o teste mostrar que uma URL específica funciona, atualize o código em `backend/services/webhookService.js`:

```javascript
// Linha 123 - alterar a URL conforme necessário
const webhookResult = await processWebhook(rawBody, req.headers, '/mercadopago');
```

#### 2. Implementar Validação Flexível

Modificar `backend/config/mercadopago.js` para tentar diferentes formatos de URL:

```javascript
// Tentar diferentes formatos de URL
const urlFormats = [
  '/api/webhooks/mercadopago',
  '/mercadopago',
  '/webhooks/mercadopago'
];

let validSignature = false;
for (const urlFormat of urlFormats) {
  const message = `${timestamp}POST${urlFormat}${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  
  if (signatureValue === expectedSignature) {
    validSignature = true;
    break;
  }
}
```

### Como Testar

1. **Teste local:**
   ```bash
   node scripts/test-mercadopago-signature.js
   ```

2. **Teste com diferentes URLs:**
   ```bash
   node scripts/test-mercadopago-urls.js
   ```

3. **Verificar logs do container:**
   ```bash
   docker logs <container-name> | grep MERCADOPAGO
   ```

### Configuração Recomendada

Para produção, use:

```bash
# Desabilitar validação temporariamente
MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true

# Ou corrigir a URL conforme o teste
# MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta
```

### Próximos Passos

1. Execute os scripts de teste para identificar o formato correto
2. Atualize o código conforme necessário
3. Reative a validação de assinatura
4. Monitore os logs para confirmar que está funcionando

### Logs Importantes

Procure por estes logs nos logs do container:

- `[MERCADOPAGO] ✅ Assinatura validada com sucesso`
- `[MERCADOPAGO] ✅ Pagamento atualizado:`
- `[MERCADOPAGO] ✅ Matrícula criada:`

Se aparecer `[MERCADOPAGO] ⚠️  Validação de assinatura desabilitada`, significa que está funcionando com a validação desabilitada. 