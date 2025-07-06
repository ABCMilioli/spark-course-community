import crypto from 'crypto';

// Script para testar diferentes formatos de URL para validação da assinatura
function testMercadoPagoUrls() {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || 'e0447c44fb58fe53b48122780116e0d530f37b74a18e9762e621d2751c8bb16b';
  const timestamp = '1751749588';
  const rawBody = '{"action":"payment.updated","api_version":"v1","data":{"id":"117577904134"},"date_created":"2025-07-06T03:33:18Z","id":122739358738,"live_mode":true,"type":"payment","user_id":"1501873958"}';
  const receivedSignature = 'c1bc81bbc177711dba92d562fb2aecc0d5808038cc3526992280ab36bbbffc2f';
  
  console.log('🧪 Testando diferentes formatos de URL para assinatura do Mercado Pago...');
  console.log('');
  
  const urlsToTest = [
    '/mercadopago',
    '/api/webhooks/mercadopago',
    '/api/webhooks/mercadopago/',
    'https://community.iacas.top/api/webhooks/mercadopago',
    'https://community.iacas.top/mercadopago',
    '/webhooks/mercadopago',
    '/mp/webhook',
    '/webhook/mercadopago'
  ];
  
  console.log('📋 Testando URLs:');
  urlsToTest.forEach((url, index) => {
    const message = `${timestamp}POST${url}${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    const isValid = receivedSignature === expectedSignature;
    
    console.log(`${index + 1}. ${url}`);
    console.log(`   Mensagem: ${message.substring(0, 50)}...`);
    console.log(`   Assinatura esperada: ${expectedSignature}`);
    console.log(`   Resultado: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    console.log('');
  });
  
  // Testar também sem URL (apenas timestamp + método + body)
  console.log('🔍 Testando sem URL (apenas timestamp + método + body):');
  const messageWithoutUrl = `${timestamp}POST${rawBody}`;
  const signatureWithoutUrl = crypto
    .createHmac('sha256', secret)
    .update(messageWithoutUrl)
    .digest('hex');
  
  console.log(`Mensagem: ${messageWithoutUrl.substring(0, 50)}...`);
  console.log(`Assinatura esperada: ${signatureWithoutUrl}`);
  console.log(`Resultado: ${receivedSignature === signatureWithoutUrl ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
  console.log('');
  
  // Testar com diferentes métodos
  console.log('🔍 Testando diferentes métodos HTTP:');
  const methods = ['POST', 'GET', 'PUT'];
  methods.forEach(method => {
    const messageWithMethod = `${timestamp}${method}${rawBody}`;
    const signatureWithMethod = crypto
      .createHmac('sha256', secret)
      .update(messageWithMethod)
      .digest('hex');
    
    console.log(`${method}: ${receivedSignature === signatureWithMethod ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
  });
}

testMercadoPagoUrls(); 