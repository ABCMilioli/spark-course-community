import crypto from 'crypto';

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
let mercadopago;

try {
  mercadoPagoConfig = validateMercadoPagoConfig();
  
  if (mercadoPagoConfig.configured) {
    // Importação dinâmica do SDK do Mercado Pago
    try {
      const mercadopagoModule = await import('mercadopago');
      mercadopago = mercadopagoModule.default || mercadopagoModule;
      
      // Verificar se o SDK tem o método configure
      if (typeof mercadopago.configure === 'function') {
        mercadopago.configure({
          access_token: mercadoPagoConfig.accessToken,
          timeout: 10000,
        });
        console.log('[MERCADOPAGO] ✅ SDK configurado com sucesso');
      } else {
        // Fallback para versões mais antigas do SDK
        mercadopago.access_token = mercadoPagoConfig.accessToken;
        console.log('[MERCADOPAGO] ✅ SDK configurado (modo legacy)');
      }
    } catch (importError) {
      console.error('[MERCADOPAGO] ❌ Erro ao importar SDK:', importError.message);
      mercadoPagoConfig.configured = false;
    }
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
export async function createPreference(items, metadata = {}) {
  if (!mercadoPagoConfig.configured || !mercadopago) {
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
        platform: 'educommunity',
      },
      statement_descriptor: 'EDUCOMMUNITY',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
    };

    const preference = await mercadopago.preferences.create({ body: preferenceData });
    
    console.log(`[MERCADOPAGO] ✅ Preferência criada: ${preference.id}`);
    return preference;

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
export async function getPayment(paymentId) {
  if (!mercadoPagoConfig.configured || !mercadopago) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    console.log(`[MERCADOPAGO] 🔍 Buscando pagamento: ${paymentId}`);

    const payment = await mercadopago.payments.get({ id: paymentId });
    
    console.log(`[MERCADOPAGO] ✅ Pagamento encontrado: ${payment.id} (${payment.status})`);
    return payment;

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
export async function processWebhook(body, headers) {
  if (!mercadoPagoConfig.configured) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    console.log('[MERCADOPAGO] 📨 Processando webhook:', {
      type: body.type,
      action: body.action,
      dataId: body.data?.id,
    });

    // Validar assinatura se configurada
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (secret) {
      const signature = headers['x-signature'];
      const requestId = headers['x-request-id'];
      
      if (!signature || !requestId) {
        throw new Error('Headers de assinatura ausentes');
      }

      // Verificar assinatura (implementação específica do MP)
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${requestId}${body.data?.id}`)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Assinatura inválida');
      }
    }

    // Processar diferentes tipos de webhook
    switch (body.type) {
      case 'payment':
        if (body.action === 'payment.created' || body.action === 'payment.updated') {
          const payment = await getPayment(body.data.id);
          return { type: 'payment', action: body.action, payment };
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
export function convertStatus(mercadoPagoStatus) {
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
export async function createPayment(paymentData) {
  if (!mercadoPagoConfig.configured || !mercadopago) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    console.log('[MERCADOPAGO] 💳 Criando pagamento direto');

    const payment = await mercadopago.payments.create({
      body: {
        ...paymentData,
        metadata: {
          ...paymentData.metadata,
          created_at: new Date().toISOString(),
          environment: mercadoPagoConfig.isProduction ? 'production' : 'test',
          platform: 'educommunity',
        },
      },
    });

    console.log(`[MERCADOPAGO] ✅ Pagamento criado: ${payment.id}`);
    return payment;

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao criar pagamento:', {
      message: error.message,
      status: error.status,
    });
    throw error;
  }
}

// Função para obter métodos de pagamento disponíveis
export function getAvailablePaymentMethods() {
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
export function getMercadoPagoStatus() {
  return {
    configured: mercadoPagoConfig.configured,
    environment: mercadoPagoConfig.isProduction ? 'production' : 'test',
    hasWebhookSecret: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
    hasNotificationUrl: !!process.env.MERCADOPAGO_NOTIFICATION_URL,
  };
}

// Função para criar link de pagamento rápido
export async function createPaymentLink(amount, description, metadata = {}) {
  if (!mercadoPagoConfig.configured || !mercadopago) {
    throw new Error('Mercado Pago não está configurado');
  }

  try {
    console.log(`[MERCADOPAGO] 🔗 Criando link de pagamento: R$ ${amount}`);

    const preference = await createPreference([
      {
        title: description,
        quantity: 1,
        unit_price: parseFloat(amount),
        description: description,
      },
    ], metadata);

    const paymentLink = mercadoPagoConfig.isProduction 
      ? `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preference.id}`
      : `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${preference.id}`;

    console.log(`[MERCADOPAGO] ✅ Link criado: ${paymentLink}`);
    
    return {
      preferenceId: preference.id,
      paymentLink,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    };

  } catch (error) {
    console.error('[MERCADOPAGO] ❌ Erro ao criar link de pagamento:', error);
    throw error;
  }
}

export default mercadopago; 