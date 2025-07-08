const crypto = require('crypto');
const { MercadoPagoConfig, Payment, CardToken } = require('mercadopago');

// Validação das configurações do Mercado Pago
function validateMercadoPagoConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('[MERCADOPAGO] ⚠️  Access token não configurado - funcionalidades desabilitadas');
    return { configured: false, isProduction: false };
  }

  // Verificar se é token de produção ou teste
  const isTestToken = accessToken.startsWith('TEST-');
  const isProductionToken = accessToken.startsWith('APP_USR-');
  
  if (!isTestToken && !isProductionToken) {
    console.error('[MERCADOPAGO] ❌ Token inválido - deve começar com TEST- ou APP_USR-');
    throw new Error('MERCADOPAGO_ACCESS_TOKEN inválido');
  }

  const environment = process.env.NODE_ENV;
  if (environment === 'production' && isTestToken) {
    console.warn('[MERCADOPAGO] ⚠️  AVISO: Usando token de teste em produção!');
  }

  console.log(`[MERCADOPAGO] ✅ Configurado para ${isProductionToken ? 'PRODUÇÃO' : 'TESTE'}`);
  
  return { 
    configured: true, 
    isProduction: isProductionToken,
    isTest: isTestToken,
    accessToken 
  };
}

// Configuração do Mercado Pago
let mercadoPagoConfig;
let client;
let payment;
let cardToken;

try {
  mercadoPagoConfig = validateMercadoPagoConfig();
  
  if (mercadoPagoConfig.configured) {
    // Configurar o SDK globalmente
    client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
    payment = new Payment(client);
    cardToken = new CardToken(client);
    console.log('[MERCADOPAGO] ✅ SDK configurado com sucesso');
  }
} catch (error) {
  console.error('[MERCADOPAGO] ❌ Falha na inicialização:', error.message);
  mercadoPagoConfig = { configured: false, isProduction: false };
}

// Função para criar pagamento direto (sem redirecionamento)
async function createPayment(paymentData) {
  if (!mercadoPagoConfig.configured || !payment) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    console.log('[MERCADOPAGO] 💳 Criando pagamento direto');

    const result = await payment.create({
      body: {
        ...paymentData,
        metadata: {
          ...paymentData.metadata,
          created_at: new Date().toISOString(),
          environment: mercadoPagoConfig.isProduction ? 'production' : 'test',
          platform: 'konektus',
        },
      },
    });

    console.log(`[MERCADOPAGO] ✅ Pagamento criado: ${result.id}`);
    return result;

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao criar pagamento:', {
      message: error.message,
      status: error.status,
    });
    throw error;
  }
}

// Função para gerar token de cartão
async function createCardToken(cardData) {
  if (!mercadoPagoConfig.configured || !cardToken) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    console.log('[MERCADOPAGO] 🔑 Gerando token do cartão');

    const result = await cardToken.create({
      body: {
        card_number: cardData.number.replace(/\s/g, ''),
        security_code: cardData.cvc,
        expiration_month: parseInt(cardData.expiry.split('/')[0]),
        expiration_year: parseInt(cardData.expiry.split('/')[1]),
        cardholder: {
          name: cardData.name,
          identification: {
            type: cardData.docType || 'CPF',
            number: cardData.docNumber
          }
        }
      }
    });

    console.log(`[MERCADOPAGO] ✅ Token do cartão gerado: ${result.id}`);
    return result;

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao gerar token do cartão:', error);
    throw error;
  }
}

// Função para processar pagamento com cartão
async function processCardPayment(courseData, cardData, userData) {
  try {
    console.log('[MERCADOPAGO] 🔄 Processando pagamento com cartão');

    // 1. Gerar token do cartão
    const cardTokenResult = await createCardToken(cardData);

    // 2. Criar pagamento
    const paymentResult = await createPayment({
      transaction_amount: parseFloat(courseData.price),
      token: cardTokenResult.id,
      description: `Curso: ${courseData.title}`,
      installments: 1, // Pagamento à vista
      payment_method_id: cardTokenResult.payment_method_id,
      payer: {
        email: userData.email,
        identification: {
          type: cardData.docType || 'CPF',
          number: cardData.docNumber
        }
      },
      metadata: {
        course_id: courseData.id,
        user_id: userData.id,
        platform: 'konektus'
      }
    });

    return {
      id: paymentResult.id,
      status: paymentResult.status,
      status_detail: paymentResult.status_detail,
      payment_method: paymentResult.payment_method_id,
      installments: paymentResult.installments,
      transaction_amount: paymentResult.transaction_amount
    };

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao processar pagamento:', error);
    throw error;
  }
}

// Função para processar pagamento com PIX
async function processPixPayment(courseData, userData) {
  try {
    console.log('[MERCADOPAGO] 🔄 Processando pagamento com PIX');

    const result = await createPayment({
      transaction_amount: parseFloat(courseData.price),
      payment_method_id: 'pix',
      description: `Curso: ${courseData.title}`,
      payer: {
        email: userData.email,
        first_name: userData.name.split(' ')[0],
        last_name: userData.name.split(' ').slice(1).join(' '),
      },
      metadata: {
        course_id: courseData.id,
        user_id: userData.id,
        platform: 'konektus'
      }
    });

    return {
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      payment_method: 'pix',
      transaction_amount: result.transaction_amount,
      pix_qr_code: result.point_of_interaction.transaction_data.qr_code,
      pix_qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64
    };

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao processar pagamento PIX:', error);
    throw error;
  }
}

// Função para processar pagamento com boleto
async function processBoletoPayment(courseData, userData) {
  try {
    console.log('[MERCADOPAGO] 🔄 Processando pagamento com boleto');

    const result = await createPayment({
      transaction_amount: parseFloat(courseData.price),
      payment_method_id: 'bolbradesco',
      description: `Curso: ${courseData.title}`,
      payer: {
        email: userData.email,
        first_name: userData.name.split(' ')[0],
        last_name: userData.name.split(' ').slice(1).join(' '),
        identification: {
          type: 'CPF',
          number: userData.docNumber
        }
      },
      metadata: {
        course_id: courseData.id,
        user_id: userData.id,
        platform: 'konektus'
      }
    });

    return {
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      payment_method: 'boleto',
      transaction_amount: result.transaction_amount,
      barcode: result.barcode.content,
      external_resource_url: result.transaction_details.external_resource_url
    };

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao processar pagamento boleto:', error);
    throw error;
  }
}

module.exports = {
  createPayment,
  createCardToken,
  processCardPayment,
  processPixPayment,
  processBoletoPayment,
  getMercadoPagoStatus: () => ({
    configured: mercadoPagoConfig.configured,
    environment: mercadoPagoConfig.isProduction ? 'production' : 'test',
  })
}; 