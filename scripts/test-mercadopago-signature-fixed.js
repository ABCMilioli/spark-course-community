import crypto from 'crypto';

// Script para testar a validação da assinatura do Mercado Pago (versão corrigida)
function testMercadoPagoSignatureFixed() {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || 'e0447c44fb58fe53b48122780116e0d530f37b74a18e9762e621d2751c8bb16b';
  const timestamp = '1751775936685';
  const url = '/api/webhooks/mercadopago';
  const rawBody = '{"action":"payment.updated","api_version":"v1","data":{"id":"123456"},"date_created":"2021-11-01T02:02:02Z","id":"123456","live_mode":false,"type":"payment","user_id":1501873958}';
  const receivedSignature = '014c3d29cf72e90b10c8a1bf690922a96c88c93fc842bf6c506c74d6c7c5ed6f';
  
  console.log('🧪 Testando validação de assinatura do Mercado Pago (VERSÃO CORRIGIDA)...');
  console.log('');
  console.log('📋 Dados de teste:');
  console.log(`Secret: ${secret.substring(0, 10)}...`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`URL: ${url}`);
  console.log(`Body: ${rawBody}`);
  console.log(`Assinatura recebida: ${receivedSignature}`);
  console.log('');
  
  // Gerar string para validação (formato correto)
  const message = `${timestamp}POST${url}${rawBody}`;
  console.log('🔍 Mensagem para hash:', message);
  console.log('');
  
  // Gerar assinatura esperada
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  
  console.log('✅ Assinatura esperada:', expectedSignature);
  console.log('');
  
  // Comparar
  const isValid = receivedSignature === expectedSignature;
  console.log(`🔍 Validação: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
  console.log('');
  
  if (!isValid) {
    console.log('🔍 Testando diferentes formatos...');
    
    // Teste 1: Sem URL
    const messageWithoutUrl = `${timestamp}POST${rawBody}`;
    const signatureWithoutUrl = crypto
      .createHmac('sha256', secret)
      .update(messageWithoutUrl)
      .digest('hex');
    console.log(`Sem URL: ${receivedSignature === signatureWithoutUrl ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    // Teste 2: Apenas body
    const messageBodyOnly = rawBody;
    const signatureBodyOnly = crypto
      .createHmac('sha256', secret)
      .update(messageBodyOnly)
      .digest('hex');
    console.log(`Apenas body: ${receivedSignature === signatureBodyOnly ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    // Teste 3: Timestamp + body
    const messageTimestampBody = `${timestamp}${rawBody}`;
    const signatureTimestampBody = crypto
      .createHmac('sha256', secret)
      .update(messageTimestampBody)
      .digest('hex');
    console.log(`Timestamp + body: ${receivedSignature === signatureTimestampBody ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    // Teste 4: URL + body
    const messageUrlBody = `${url}${rawBody}`;
    const signatureUrlBody = crypto
      .createHmac('sha256', secret)
      .update(messageUrlBody)
      .digest('hex');
    console.log(`URL + body: ${receivedSignature === signatureUrlBody ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
  }
  
  console.log('');
  console.log('💡 Dica: Se nenhum formato funcionar, pode ser necessário:');
  console.log('1. Verificar se o secret está correto no painel do Mercado Pago');
  console.log('2. Verificar se a URL está configurada corretamente');
  console.log('3. Usar MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true temporariamente');
}

testMercadoPagoSignatureFixed(); 