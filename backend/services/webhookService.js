const crypto = require('crypto');
const { processWebhook, convertStatus } = require('../config/mercadopago');

// Função para enviar webhook
async function sendWebhook(pool, eventType, payload) {
  try {
    // Buscar webhooks ativos que escutam este evento
    const { rows: webhooks } = await pool.query(`
      SELECT * FROM webhooks 
      WHERE is_active = true 
      AND $1 = ANY(events)
    `, [eventType]);

    for (const webhook of webhooks) {
      try {
        // Preparar payload final
        const fullPayload = {
          event: eventType,
          timestamp: new Date().toISOString(),
          data: payload
        };

        // Preparar headers
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'EduCommunity-Webhook/1.0'
        };

        // Adicionar assinatura HMAC se houver chave secreta
        if (webhook.secret_key) {
          const signature = crypto
            .createHmac('sha256', webhook.secret_key)
            .update(JSON.stringify(fullPayload))
            .digest('hex');
          headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }

        // Fazer requisição
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(fullPayload),
          timeout: 10000 // 10 segundos
        });

        const responseText = await response.text();
        const isSuccess = response.status >= 200 && response.status < 300;

        // Log da tentativa
        await pool.query(`
          INSERT INTO webhook_logs (webhook_id, event_type, payload, response_status, response_body, is_success)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          webhook.id,
          eventType,
          fullPayload,
          response.status,
          responseText.substring(0, 5000), // Limitar tamanho
          isSuccess
        ]);

        if (!isSuccess) {
          console.error(`[WEBHOOK] Erro no webhook ${webhook.name}: ${response.status} ${responseText}`);
        }

      } catch (webhookError) {
        // Log do erro
        await pool.query(`
          INSERT INTO webhook_logs (webhook_id, event_type, payload, error_message, is_success)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          webhook.id,
          eventType,
          { event: eventType, timestamp: new Date().toISOString(), data: payload },
          webhookError.message,
          false
        ]);
        
        console.error(`[WEBHOOK] Erro ao enviar webhook ${webhook.name}:`, webhookError);
      }
    }
  } catch (error) {
    console.error('[WEBHOOK] Erro geral no sistema de webhooks:', error);
  }
}

class WebhookService {
  constructor(pool) {
    this.pool = pool;
  }

  async processMercadoPagoWebhook(req, res) {
    const startTime = Date.now();

    // Garante que o rawBody é sempre uma string
    let rawBody;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else {
      rawBody = JSON.stringify(req.body);
    }

    console.log('[MERCADOPAGO WEBHOOK] RAW BODY:', rawBody);

    let parsedBody;
    let processingResult = { status: 'ignored', message: 'Evento não processado' };
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (e) {
      parsedBody = {};
    }
    console.log('[MERCADOPAGO WEBHOOK] 📨 Webhook recebido:', {
      type: parsedBody?.type,
      action: parsedBody?.action,
      dataId: parsedBody?.data?.id
    });

    try {
      // Processar webhook usando a função do config
      const webhookResult = await processWebhook(rawBody, req.headers, '/api/webhooks/mercadopago');      
      if (webhookResult.type === 'payment') {
        // Processar mudança de status de pagamento
        const payment = webhookResult.payment;
        
        // Se o pagamento não foi encontrado (pode ser teste)
        if (!payment && webhookResult.error === 'payment_not_found') {
          console.log(`[MERCADOPAGO WEBHOOK] ⚠️  Pagamento de teste ignorado: ${webhookResult.paymentId}`);
          processingResult = {
            status: 'ignored',
            message: 'Pagamento de teste ignorado',
            payment_id: webhookResult.paymentId
          };
        } else if (payment) {
          const convertedStatus = convertStatus(payment.status);
          // Atualizar pagamento no banco
          const updateResult = await this.pool.query(`
            UPDATE payments 
            SET status = $1, updated_at = $2, metadata = $3 
            WHERE id = (
              SELECT id FROM payments 
              WHERE metadata->>'mercadopago_payment_id' = $4 
              OR metadata->>'external_reference' = $5
            )
            RETURNING id, user_id, course_id, amount
          `, [
            convertedStatus,
            new Date(),
            {
              mercadopago_payment_id: payment.id,
              mercadopago_status: payment.status,
              mercadopago_status_detail: payment.status_detail,
              payment_method: payment.payment_method_id,
              installments: payment.installments,
              updated_at: new Date().toISOString()
            },
            payment.id.toString(),
            payment.external_reference
          ]);
          if (updateResult.rows.length > 0) {
            const updatedPayment = updateResult.rows[0];
            // Se pagamento foi aprovado, criar matrícula
            if (convertedStatus === 'succeeded') {
              const enrollmentCheck = await this.pool.query(
                'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
                [updatedPayment.user_id, updatedPayment.course_id]
              );
              if (enrollmentCheck.rows.length === 0) {
                const enrollmentId = crypto.randomUUID();
                await this.pool.query(
                  'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
                  [enrollmentId, updatedPayment.user_id, updatedPayment.course_id, new Date(), 0]
                );
                console.log(`[MERCADOPAGO WEBHOOK] ✅ Matrícula criada: ${enrollmentId}`);
              }
              // Disparar webhook personalizado
              try {
                await this.sendWebhook('payment.succeeded', {
                  payment_id: updatedPayment.id,
                  user_id: updatedPayment.user_id,
                  course_id: updatedPayment.course_id,
                  amount: updatedPayment.amount,
                  gateway: 'mercadopago',
                  mercadopago_payment_id: payment.id
                });
              } catch (webhookError) {
                console.error('[WEBHOOK] Erro ao enviar webhook payment.succeeded (MP):', webhookError);
              }
            }
            processingResult = {
              status: 'success',
              message: 'Pagamento atualizado com sucesso',
              payment_id: updatedPayment.id,
              new_status: convertedStatus
            };
            console.log(`[MERCADOPAGO WEBHOOK] ✅ Pagamento atualizado: ${updatedPayment.id} -> ${convertedStatus}`);
          } else {
            console.warn(`[MERCADOPAGO WEBHOOK] ⚠️  Pagamento não encontrado no banco: ${payment.id}`);
            processingResult = {
              status: 'warning',
              message: 'Pagamento não encontrado no banco de dados'
            };
          }
        }
      } else {
        console.log(`[MERCADOPAGO WEBHOOK] ❓ Tipo de webhook não tratado: ${webhookResult.type}`);
        processingResult = {
          status: 'ignored',
          message: `Tipo de webhook ${webhookResult.type} não tratado`
        };
      }
      const processingTime = Date.now() - startTime;
      console.log(`[MERCADOPAGO WEBHOOK] ✅ Webhook processado em ${processingTime}ms`);
      res.json({
        received: true,
        status: processingResult.status,
        message: processingResult.message,
        processing_time_ms: processingTime
      });
    } catch (error) {
      console.error('[MERCADOPAGO WEBHOOK] ❌ Erro geral:', error);
      res.status(500).json({ error: 'Erro interno no processamento do webhook' });
    }
  }
}

module.exports = { WebhookService, sendWebhook }; 