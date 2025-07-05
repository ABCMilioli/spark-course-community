import Stripe from 'stripe';

// Validação das configurações obrigatórias
function validateStripeConfig() {
  const required = ['STRIPE_SECRET_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('[STRIPE] Configurações obrigatórias ausentes:', missing);
    throw new Error(`Configurações Stripe ausentes: ${missing.join(', ')}`);
  }

  // Verificar se a chave está no formato correto
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const isTestKey = secretKey.startsWith('sk_test_');
  const isLiveKey = secretKey.startsWith('sk_live_');
  
  if (!isTestKey && !isLiveKey) {
    throw new Error('STRIPE_SECRET_KEY deve começar com sk_test_ ou sk_live_');
  }

  const environment = process.env.NODE_ENV;
  if (environment === 'production' && isTestKey) {
    console.warn('[STRIPE] ⚠️  AVISO: Usando chave de teste em produção!');
  }

  console.log(`[STRIPE] ✅ Configurado para ${isLiveKey ? 'PRODUÇÃO' : 'TESTE'}`);
  
  return { isLiveKey, isTestKey };
}

// Configuração do Stripe com validação
let stripe;
let stripeConfig;

try {
  stripeConfig = validateStripeConfig();
  
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
    timeout: 10000, // 10 segundos
    maxNetworkRetries: 3,
    appInfo: {
      name: 'EduCommunity Payment System',
      version: '1.0.0',
      url: process.env.APP_URL || 'https://localhost:3000',
    },
  });

  console.log('[STRIPE] ✅ Cliente inicializado com sucesso');
} catch (error) {
  console.error('[STRIPE] ❌ Falha na inicialização:', error.message);
  // Em produção, pode querer continuar sem Stripe mas loggar o erro
  if (process.env.NODE_ENV === 'production') {
    console.error('[STRIPE] Sistema continuará sem Stripe');
  }
}

// Configurações específicas para o Brasil
const BRAZIL_CONFIG = {
  currency: 'brl',
  payment_method_types: ['card', 'boleto', 'pix'],
  payment_method_options: {
    boleto: {
      expires_after_days: 3,
    },
    pix: {
      expires_after_seconds: 3600, // 1 hora
    },
    card: {
      capture_method: 'automatic',
      setup_future_usage: 'off_session', // Para pagamentos futuros
    },
  },
  metadata: {
    country: 'BR',
    platform: 'educommunity',
  },
};

// Função para criar um Payment Intent com validações robustas
export async function createPaymentIntent(amount, currency = 'brl', metadata = {}) {
  if (!stripe) {
    throw new Error('Stripe não está configurado');
  }

  try {
    // Validações
    if (!amount || amount <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }

    if (amount > 99999999) { // Limite do Stripe em centavos (R$ 999.999,99)
      throw new Error('Valor excede o limite máximo permitido');
    }

    const amountInCents = Math.round(amount * 100);
    
    console.log(`[STRIPE] Criando Payment Intent: R$ ${amount.toFixed(2)} (${amountInCents} centavos)`);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      ...BRAZIL_CONFIG,
      metadata: {
        ...BRAZIL_CONFIG.metadata,
        ...metadata,
        created_at: new Date().toISOString(),
        environment: stripeConfig.isLiveKey ? 'production' : 'test',
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Para evitar redirecionamentos
      },
      statement_descriptor: 'EDUCOMMUNITY', // Aparece na fatura do cartão
      statement_descriptor_suffix: 'CURSO', // Sufixo adicional
    });

    console.log(`[STRIPE] ✅ Payment Intent criado: ${paymentIntent.id}`);
    return paymentIntent;

  } catch (error) {
    console.error('[STRIPE] ❌ Erro ao criar Payment Intent:', {
      message: error.message,
      type: error.type,
      code: error.code,
      amount,
      currency,
    });
    throw error;
  }
}

// Função para recuperar um Payment Intent com cache
const paymentIntentCache = new Map();

export async function retrievePaymentIntent(paymentIntentId) {
  if (!stripe) {
    throw new Error('Stripe não está configurado');
  }

  try {
    // Cache simples para evitar múltiplas chamadas
    const cacheKey = `pi_${paymentIntentId}`;
    const cachedResult = paymentIntentCache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp) < 30000) { // 30 segundos
      console.log(`[STRIPE] 📦 Cache hit para Payment Intent: ${paymentIntentId}`);
      return cachedResult.data;
    }

    console.log(`[STRIPE] 🔍 Recuperando Payment Intent: ${paymentIntentId}`);
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge', 'payment_method'], // Expandir dados relacionados
    });

    // Salvar no cache
    paymentIntentCache.set(cacheKey, {
      data: paymentIntent,
      timestamp: Date.now(),
    });

    console.log(`[STRIPE] ✅ Payment Intent recuperado: ${paymentIntent.id} (${paymentIntent.status})`);
    return paymentIntent;

  } catch (error) {
    console.error('[STRIPE] ❌ Erro ao recuperar Payment Intent:', {
      message: error.message,
      type: error.type,
      code: error.code,
      paymentIntentId,
    });
    throw error;
  }
}

// Função para confirmar um Payment Intent
export async function confirmPaymentIntent(paymentIntentId, paymentMethodId, returnUrl = null) {
  if (!stripe) {
    throw new Error('Stripe não está configurado');
  }

  try {
    console.log(`[STRIPE] 🔄 Confirmando Payment Intent: ${paymentIntentId}`);

    const confirmData = {
      payment_method: paymentMethodId,
    };

    // Adicionar URL de retorno se fornecida (necessário para alguns métodos)
    if (returnUrl) {
      confirmData.return_url = returnUrl;
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, confirmData);
    
    console.log(`[STRIPE] ✅ Payment Intent confirmado: ${paymentIntent.id} (${paymentIntent.status})`);
    return paymentIntent;

  } catch (error) {
    console.error('[STRIPE] ❌ Erro ao confirmar Payment Intent:', {
      message: error.message,
      type: error.type,
      code: error.code,
      paymentIntentId,
      paymentMethodId,
    });
    throw error;
  }
}

// Função para cancelar um Payment Intent
export async function cancelPaymentIntent(paymentIntentId, reason = 'requested_by_customer') {
  if (!stripe) {
    throw new Error('Stripe não está configurado');
  }

  try {
    console.log(`[STRIPE] ❌ Cancelando Payment Intent: ${paymentIntentId}`);

    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: reason,
    });

    console.log(`[STRIPE] ✅ Payment Intent cancelado: ${paymentIntent.id}`);
    return paymentIntent;

  } catch (error) {
    console.error('[STRIPE] ❌ Erro ao cancelar Payment Intent:', {
      message: error.message,
      type: error.type,
      code: error.code,
      paymentIntentId,
    });
    throw error;
  }
}

// Função para verificar webhook com validação robusta
export function constructWebhookEvent(payload, signature, secret) {
  if (!stripe) {
    throw new Error('Stripe não está configurado');
  }

  try {
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET não configurado');
    }

    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    
    console.log(`[STRIPE] ✅ Webhook válido: ${event.type} (${event.id})`);
    return event;

  } catch (error) {
    console.error('[STRIPE] ❌ Webhook inválido:', {
      message: error.message,
      signaturePresent: !!signature,
      secretConfigured: !!secret,
    });
    throw error;
  }
}

// Função para criar uma sessão de checkout (alternativa ao Payment Intent)
export async function createCheckoutSession(lineItems, metadata = {}, successUrl, cancelUrl) {
  if (!stripe) {
    throw new Error('Stripe não está configurado');
  }

  try {
    console.log('[STRIPE] 🛒 Criando sessão de checkout');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto', 'pix'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        created_at: new Date().toISOString(),
        environment: stripeConfig.isLiveKey ? 'production' : 'test',
      },
      payment_intent_data: {
        metadata: {
          ...metadata,
          checkout_session: true,
        },
      },
      locale: 'pt-BR',
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['BR'],
      },
      customer_creation: 'always',
    });

    console.log(`[STRIPE] ✅ Sessão de checkout criada: ${session.id}`);
    return session;

  } catch (error) {
    console.error('[STRIPE] ❌ Erro ao criar sessão de checkout:', {
      message: error.message,
      type: error.type,
      code: error.code,
    });
    throw error;
  }
}

// Função para formatar valor para exibição
export function formatAmount(amount, currency = 'brl') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

// Função para converter valor de reais para centavos
export function convertToCents(amount) {
  return Math.round(amount * 100);
}

// Função para converter valor de centavos para reais
export function convertFromCents(amount) {
  return amount / 100;
}

// Função para verificar status do Stripe
export function getStripeStatus() {
  return {
    configured: !!stripe,
    environment: stripeConfig?.isLiveKey ? 'production' : 'test',
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
  };
}

// Limpar cache periodicamente
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of paymentIntentCache.entries()) {
      if (now - value.timestamp > 60000) { // 1 minuto
        paymentIntentCache.delete(key);
      }
    }
  }, 60000);
}

export default stripe; 