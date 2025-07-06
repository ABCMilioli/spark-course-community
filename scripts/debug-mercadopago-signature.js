import crypto from 'crypto';

// Script para debugar a validação da assinatura do Mercado Pago
function debugMercadoPagoSignature() {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || 'e0447c44fb58fe53b48122780116e0d530f37b74a18e9762e621d2751c8bb16b';
  const timestamp = '1751776146370';
  const rawBody = '{"action":"payment.updated","api_version":"v1","data":{"id":"123456"},"date_created":"2021-11-01T02:02:02Z","id":"123456","live_mode":false,"type":"payment","user_id":1501873958}';
  const receivedSignature = '7cda9a2d422e28b1bf0645e85c400ff66b4e464a8ee2d0ed2700145181f7225b';
  
  console.log('🔍 DEBUG: Validação de assinatura do Mercado Pago');
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 Dados reais do webhook:');
  console.log(`Secret: ${secret.substring(0, 10)}...`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Body: ${rawBody}`);
  console.log(`Assinatura recebida: ${receivedSignature}`);
  console.log('');
  
  // Testar diferentes formatos de URL
  const urlFormats = [
    '/api/webhooks/mercadopago',
    '/mercadopago',
    '/webhooks/mercadopago',
    'https://community.iacas.top/api/webhooks/mercadopago',
    'https://community.iacas.top/mercadopago',
    '/api/webhooks/mercadopago/',
    ''
  ];
  
  console.log('🔍 Testando diferentes formatos de URL:');
  console.log('');
  
  urlFormats.forEach((url, index) => {
    const message = `${timestamp}POST${url}${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    const isValid = receivedSignature === expectedSignature;
    
    console.log(`${index + 1}. URL: "${url}"`);
    console.log(`   Mensagem: ${message.substring(0, 80)}...`);
    console.log(`   Assinatura esperada: ${expectedSignature}`);
    console.log(`   Resultado: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    console.log('');
  });
  
  // Testar diferentes formatos de mensagem
  console.log('🔍 Testando diferentes formatos de mensagem:');
  console.log('');
  
  const messageFormats = [
    { name: 'Timestamp + POST + URL + Body', format: `${timestamp}POST/api/webhooks/mercadopago${rawBody}` },
    { name: 'Timestamp + POST + Body', format: `${timestamp}POST${rawBody}` },
    { name: 'Timestamp + Body', format: `${timestamp}${rawBody}` },
    { name: 'POST + URL + Body', format: `POST/api/webhooks/mercadopago${rawBody}` },
    { name: 'URL + Body', format: `/api/webhooks/mercadopago${rawBody}` },
    { name: 'Apenas Body', format: rawBody },
    { name: 'Timestamp + URL + Body', format: `${timestamp}/api/webhooks/mercadopago${rawBody}` }
  ];
  
  messageFormats.forEach((format, index) => {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(format.format)
      .digest('hex');
    
    const isValid = receivedSignature === expectedSignature;
    
    console.log(`${index + 1}. ${format.name}`);
    console.log(`   Mensagem: ${format.format.substring(0, 80)}...`);
    console.log(`   Assinatura esperada: ${expectedSignature}`);
    console.log(`   Resultado: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    console.log('');
  });
  
  // Testar com diferentes métodos HTTP
  console.log('🔍 Testando diferentes métodos HTTP:');
  console.log('');
  
  const methods = ['POST', 'GET', 'PUT', 'DELETE'];
  methods.forEach(method => {
    const message = `${timestamp}${method}/api/webhooks/mercadopago${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    const isValid = receivedSignature === expectedSignature;
    console.log(`${method}: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
  });
  
  console.log('');
  console.log('💡 Dicas para resolver:');
  console.log('1. Se nenhum formato funcionar, verifique se o secret está correto');
  console.log('2. Verifique se a URL no painel do Mercado Pago está correta');
  console.log('3. Consulte a documentação oficial do Mercado Pago');
  console.log('4. Use MERCADOPAGO_SKIP_SIGNATURE_VALIDATION=true temporariamente');
}

debugMercadoPagoSignature(); 