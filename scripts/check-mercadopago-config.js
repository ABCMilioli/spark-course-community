import crypto from 'crypto';

// Script para verificar configuração do Mercado Pago
function checkMercadoPagoConfig() {
  console.log('🔍 VERIFICAÇÃO DE CONFIGURAÇÃO DO MERCADO PAGO');
  console.log('='.repeat(60));
  console.log('');
  
  // Dados do webhook real
  const timestamp = '1751776146370';
  const rawBody = '{"action":"payment.updated","api_version":"v1","data":{"id":"123456"},"date_created":"2021-11-01T02:02:02Z","id":"123456","live_mode":false,"type":"payment","user_id":1501873958}';
  const receivedSignature = '7cda9a2d422e28b1bf0645e85c400ff66b4e464a8ee2d0ed2700145181f7225b';
  
  console.log('📋 Dados do webhook:');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Body: ${rawBody}`);
  console.log(`Assinatura recebida: ${receivedSignature}`);
  console.log('');
  
  // Secrets comuns para testar
  const testSecrets = [
    process.env.MERCADOPAGO_WEBHOOK_SECRET || 'e0447c44fb58fe53b48122780116e0d530f37b74a18e9762e621d2751c8bb16b',
    'test_secret_key',
    'webhook_secret',
    'mercadopago_webhook_secret',
    'WHK-xxxx-xxxx-xxxx-xxxx',
    'webhook_key',
    'secret_key'
  ];
  
  console.log('🔑 Testando diferentes secrets:');
  console.log('');
  
  testSecrets.forEach((secret, index) => {
    console.log(`${index + 1}. Secret: ${secret.substring(0, 10)}...`);
    
    // Testar formato mais comum: timestamp + POST + URL + body
    const message = `${timestamp}POST/api/webhooks/mercadopago${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    const isValid = receivedSignature === expectedSignature;
    console.log(`   Formato padrão: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    // Testar apenas body
    const messageBodyOnly = rawBody;
    const signatureBodyOnly = crypto
      .createHmac('sha256', secret)
      .update(messageBodyOnly)
      .digest('hex');
    
    const isValidBodyOnly = receivedSignature === signatureBodyOnly;
    console.log(`   Apenas body: ${isValidBodyOnly ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    if (isValid || isValidBodyOnly) {
      console.log(`   🎉 SECRET ENCONTRADO: ${secret}`);
    }
    console.log('');
  });
  
  console.log('📋 INSTRUÇÕES PARA VERIFICAR NO PAINEL DO MERCADO PAGO:');
  console.log('');
  console.log('1. Acesse https://www.mercadopago.com.br/developers/panel');
  console.log('2. Vá em "Suas integrações" > "Webhooks"');
  console.log('3. Verifique:');
  console.log('   - URL configurada: https://community.iacas.top/api/webhooks/mercadopago');
  console.log('   - Webhook secret (chave secreta)');
  console.log('   - Eventos configurados (payment.created, payment.updated)');
  console.log('');
  console.log('4. Se o secret estiver diferente, atualize a variável de ambiente:');
  console.log('   MERCADOPAGO_WEBHOOK_SECRET=novo_secret_aqui');
  console.log('');
  console.log('5. Se não encontrar o secret, pode ser que o Mercado Pago não use');
  console.log('   validação de assinatura para webhooks de teste');
  console.log('');
  console.log('💡 RECOMENDAÇÃO:');
  console.log('   Mantenha MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true');
  console.log('   até confirmar o formato correto com o Mercado Pago');
}

checkMercadoPagoConfig(); 