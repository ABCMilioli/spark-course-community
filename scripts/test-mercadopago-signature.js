import crypto from 'crypto';

// Script para testar a validação da assinatura do Mercado Pago
function testMercadoPagoSignature() {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || 'e0447c44fb58fe53b48122780116e0d530f37b74a18e9762e621d2751c8bb16b';
  const timestamp = '1751749588';
  const url = '/api/webhooks/mercadopago';
  const rawBody = '{"action":"payment.updated","api_version":"v1","data":{"id":"117577904134"},"date_created":"2025-07-06T03:33:18Z","id":122739358738,"live_mode":true,"type":"payment","user_id":"1501873958"}';
  
  console.log('🧪 Testando validação de assinatura do Mercado Pago...');
  console.log('');
  console.log('📋 Dados de teste:');
  console.log(`Secret: ${secret.substring(0, 10)}...`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`URL: ${url}`);
  console.log(`Body: ${rawBody}`);
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
  
  // Simular assinatura recebida (dos logs)
  const receivedSignature = 'c1bc81bbc177711dba92d562fb2aecc0d5808038cc3526992280ab36bbbffc2f';
  console.log('📨 Assinatura recebida:', receivedSignature);
  console.log('');
  
  // Comparar
  const isValid = receivedSignature === expectedSignature;
  console.log(`🔍 Validação: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
  console.log('');
  
  if (!isValid) {
    console.log('🔍 Testando com URL antiga (/mercadopago):');
    const oldUrl = '/mercadopago';
    const oldMessage = `${timestamp}POST${oldUrl}${rawBody}`;
    const oldExpectedSignature = crypto
      .createHmac('sha256', secret)
      .update(oldMessage)
      .digest('hex');
    
    console.log('Mensagem antiga:', oldMessage);
    console.log('Assinatura esperada (antiga):', oldExpectedSignature);
    console.log('Validação (antiga):', receivedSignature === oldExpectedSignature ? '✅ VÁLIDA' : '❌ INVÁLIDA');
  }
}

testMercadoPagoSignature(); 