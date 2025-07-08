const crypto = require('crypto');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

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
let preference;
let payment;

try {
  mercadoPagoConfig = validateMercadoPagoConfig();
  
  if (mercadoPagoConfig.configured) {
    // Configurar o SDK globalmente
    client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
    preference = new Preference(client);
    payment = new Payment(client);
    console.log('[MERCADOPAGO] ✅ SDK configurado com sucesso');
  }
} catch (error) {
  console.error('[MERCADOPAGO] ❌ Falha na inicialização:', error.message);
  mercadoPagoConfig = { configured: false, isProduction: false };
}

// Configurações específicas para o Brasil
const BRAZIL_CONFIG = {
  payer: {
    address: {
      zip_code: null,
      street_name: null,
      street_number: null,
      neighborhood: null,
      city: null,
      federal_unit: null,
    },
  },
  payment_methods: {
    excluded_payment_methods: [],
    excluded_payment_types: [],
    installments: 12, // Máximo 12 parcelas
  },
  back_urls: {
    success: process.env.PAYMENT_SUCCESS_URL || `${process.env.APP_URL}/payment/success`,
    failure: process.env.PAYMENT_FAILURE_URL || `${process.env.APP_URL}/payment/failure`,
    pending: process.env.PAYMENT_CANCEL_URL || `${process.env.APP_URL}/payment/pending`,
  },
  auto_return: 'approved',
  binary_mode: false, // Permite status pending
  notification_url: process.env.MERCADOPAGO_NOTIFICATION_URL,
};

// Função para criar preferência de pagamento
async function createPreference(items, metadata = {}) {
  if (!mercadoPagoConfig.configured || !preference) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    // Validações
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items são obrigatórios e devem ser um array não vazio');
    }

    // Validar cada item
    for (const item of items) {
      if (!item.title || !item.quantity || !item.unit_price) {
        throw new Error('Cada item deve ter title, quantity e unit_price');
      }
      
      if (item.unit_price <= 0) {
        throw new Error('unit_price deve ser maior que zero');
      }
    }

    console.log(`[MERCADOPAGO] 🛒 Criando preferência para ${items.length} item(s)`);

    const preferenceData = {
      items: items.map(item => ({
        id: item.id || crypto.randomUUID(),
        title: item.title,
        description: item.description || item.title,
        category_id: 'education', // Categoria educação
        quantity: parseInt(item.quantity),
        currency_id: 'BRL',
        unit_price: parseFloat(item.unit_price),
      })),
      ...BRAZIL_CONFIG,
      external_reference: metadata.external_reference || crypto.randomUUID(),
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
        environment: mercadoPagoConfig.isProduction ? 'production' : 'test',
        platform: 'konektus',
      },
      statement_descriptor: 'KONEKTUS',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
    };

    const result = await preference.create({ body: preferenceData });
    
    console.log(`[MERCADOPAGO] ✅ Preferência criada: ${result.id}`);
    return result;

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao criar preferência:', {
      message: error.message,
      status: error.status,
      items: items?.length,
    });
    throw error;
  }
}

// Função para buscar informações de um pagamento
async function getPayment(paymentId) {
  if (!mercadoPagoConfig.configured || !payment) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    console.log(`[MERCADOPAGO] 🔍 Buscando pagamento: ${paymentId}`);

    const result = await payment.get({ id: paymentId });
    
    console.log(`[MERCADOPAGO] ✅ Pagamento encontrado: ${result.id} (${result.status})`);
    return result;

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao buscar pagamento:', {
      message: error.message,
      status: error.status,
      paymentId,
    });
    throw error;
  }
}

// Função para processar webhook do Mercado Pago
async function processWebhook(rawBody, headers, url) {
  if (!mercadoPagoConfig.configured) {
    throw new Error('Mercado Pago não está configurado');
  }

  let body;

  try {
    // Parse para log
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      body = {};
    }
    console.log('[MERCADOPAGO] 📨 Processando webhook:', {
      type: body.type,
      action: body.action,
      dataId: body.data?.id,
    });

    // Validar assinatura se configurada
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (secret) {
      console.log('[MERCADOPAGO] 🔑 Secret usado:', secret, 'Tamanho:', secret.length);
      console.log('[MERCADOPAGO] 🔐 Validando assinatura do webhook');
      
      // Mercado Pago envia a assinatura diretamente, não no formato ts=,v1=
      const signature = headers['signature'] || headers['Signature'] || headers['x-signature'] || headers['X-Signature'];
      const requestId = headers['x-request-id'] || headers['X-Request-Id'];
      
      if (!signature) {
        console.error('[MERCADOPAGO] ❌ Header de assinatura ausente');
        throw new Error('Header de assinatura ausente');
      }

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
          console.log('[MERCADOPAGO] 🔍 Extraído do formato ts=,v1=:', { timestamp, signatureValue });
        }
      }
      
      // Se não conseguiu extrair, usar headers específicos
      if (signatureValue === signature) {
        timestamp = headers['x-timestamp'] || headers['X-Timestamp'] || 
                   headers['x-mercadopago-timestamp'] || headers['X-MercadoPago-Timestamp'] ||
                   timestamp;
      }

      // Gerar string para validação
      // Formato: timestamp + método + url + body bruto
      const message = `${timestamp}POST${url}${rawBody}`;
      
      console.log('[MERCADOPAGO] 🔍 Dados para validação:', {
        method: 'POST',
        url,
        timestamp,
        bodyLength: rawBody.length,
        messageToHash: message
      });

      // Gerar assinatura esperada
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');

      console.log('[MERCADOPAGO] 🔍 Verificando assinatura:', {
        received: signatureValue,
        expected: expectedSignature,
        timestamp,
        requestId
      });

      // Verificar se deve pular validação (para debug)
      const skipValidation = process.env.MERCADOPAGO_SKIP_SIGNATURE_VALIDATION === 'true';
      
      if (signatureValue !== expectedSignature) {
        console.error('[MERCADOPAGO] ❌ Assinatura inválida:', {
          received: signatureValue,
          expected: expectedSignature,
          messageUsed: message,
          rawBody
        });
        
        if (skipValidation) {
          console.warn('[MERCADOPAGO] ⚠️  Validação de assinatura desabilitada - processando mesmo assim');
        } else {
          throw new Error('Assinatura inválida');
        }
      } else {
        console.log('[MERCADOPAGO] ✅ Assinatura validada com sucesso');
      }
    }

    // Processar diferentes tipos de webhook
    switch (body.type) {
      case 'payment':
        if (body.action === 'payment.created' || body.action === 'payment.updated') {
          try {
            const payment = await getPayment(body.data.id);
            return { type: 'payment', action: body.action, payment };
          } catch (error) {
            // Se o pagamento não for encontrado, pode ser um teste ou pagamento inválido
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
        }
        break;
        
      case 'merchant_order':
        console.log(`[MERCADOPAGO] 📋 Merchant Order: ${body.data.id}`);
        return { type: 'merchant_order', action: body.action, orderId: body.data.id };
        
      default:
        console.log(`[MERCADOPAGO] ❓ Tipo de webhook não tratado: ${body.type}`);
        return { type: body.type, action: body.action, data: body.data };
    }

    return { type: 'unknown', action: body.action };

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao processar webhook:', {
      message: error.message,
      type: body?.type,
      action: body?.action,
    });
    throw error;
  }
}

// Função para converter status do Mercado Pago para formato padrão
function convertStatus(mercadoPagoStatus) {
  const statusMap = {
    pending: 'pending',
    approved: 'succeeded',
    authorized: 'succeeded',
    in_process: 'pending',
    in_mediation: 'pending',
    rejected: 'failed',
    cancelled: 'canceled',
    refunded: 'refunded',
    charged_back: 'failed',
  };

  return statusMap[mercadoPagoStatus] || 'unknown';
}

// Função para criar um payment (alternativa à preferência)
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

// Função para obter métodos de pagamento disponíveis
function getAvailablePaymentMethods() {
  const methods = [
    {
      id: 'stripe',
      name: 'Stripe',
      type: 'credit_card',
      enabled: true, // Stripe sempre habilitado
      description: 'Cartão de crédito, PIX e Boleto via Stripe',
      icon: '💳',
    },
  ];

  if (mercadoPagoConfig.configured) {
    methods.push({
      id: 'mercadopago',
      name: 'Mercado Pago',
      type: 'multiple',
      enabled: true,
      description: 'Cartão, PIX, Boleto e outros via Mercado Pago',
      icon: '🛒',
    });
  } else {
    methods.push({
      id: 'mercadopago',
      name: 'Mercado Pago',
      type: 'multiple',
      enabled: false,
      description: 'Configure MERCADOPAGO_ACCESS_TOKEN para habilitar',
      icon: '🛒',
    });
  }

  return methods;
}

// Função para verificar status do Mercado Pago
function getMercadoPagoStatus() {
  return {
    configured: mercadoPagoConfig.configured,
    environment: mercadoPagoConfig.isProduction ? 'production' : 'test',
    hasWebhookSecret: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
    hasNotificationUrl: !!process.env.MERCADOPAGO_NOTIFICATION_URL,
  };
}

// Função para criar link de pagamento rápido
async function createPaymentLink(amount, description, metadata = {}) {
  if (!mercadoPagoConfig.configured || !preference) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    console.log(`[MERCADOPAGO] 🔗 Criando link de pagamento: R$ ${amount}`);

    const preferenceResult = await createPreference([
      {
        title: description,
        quantity: 1,
        unit_price: parseFloat(amount),
        description: description,
      },
    ], metadata);

    const paymentLink = mercadoPagoConfig.isProduction 
      ? `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceResult.id}`
      : `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceResult.id}`;

    console.log(`[MERCADOPAGO] ✅ Link criado: ${paymentLink}`);
    
    return {
      preferenceId: preferenceResult.id,
      paymentLink,
      initPoint: preferenceResult.init_point,
      sandboxInitPoint: preferenceResult.sandbox_init_point,
    };

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao criar link de pagamento:', error);
    throw error;
  }
}

module.exports = {
  createPreference,
  getPayment,
  processWebhook,
  convertStatus,
  createPayment,
  getAvailablePaymentMethods,
  getMercadoPagoStatus,
  createPaymentLink,
}; 