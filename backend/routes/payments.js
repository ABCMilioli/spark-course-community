const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { processCardPayment, processPixPayment, processBoletoPayment, createPreference } = require('../config/mercadopago-transparent');

const router = express.Router();

module.exports = (pool, sendWebhook) => {
  // Processar pagamento com cartão de crédito
  router.post('/mercadopago/process-card', authenticateToken, async (req, res) => {
    try {
      const { course_id, card_data } = req.body;
      
      if (!course_id || !card_data) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }

      // Buscar informações do curso
      const courseResult = await pool.query(
        'SELECT id, title, price FROM courses WHERE id = $1',
        [course_id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Curso não encontrado' });
      }

      const course = courseResult.rows[0];
      
      // Processar pagamento
      const payment = await processCardPayment(course, card_data, {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      });

      // Salvar pagamento no banco
      const paymentId = crypto.randomUUID();
      await pool.query(`
        INSERT INTO payments (id, user_id, course_id, amount, currency, status, gateway, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        paymentId,
        req.user.id,
        course.id,
        course.price,
        'BRL',
        payment.status === 'approved' ? 'succeeded' : payment.status,
        'mercadopago',
        {
          mercadopago_payment_id: payment.id,
          payment_method: payment.payment_method,
          installments: payment.installments,
          created_at: new Date().toISOString(),
        }
      ]);

      console.log(`[MERCADOPAGO] ✅ Pagamento com cartão processado: ${payment.id}`);

      res.json({
        payment_id: paymentId,
        mercadopago_payment_id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail
      });

    } catch (error) {
      console.error('[MERCADOPAGO] ❌ Erro ao processar pagamento com cartão:', error);
      res.status(500).json({ 
        error: 'Erro ao processar pagamento',
        details: error.message 
      });
    }
  });

  // Gerar pagamento PIX
  router.post('/mercadopago/generate-pix', authenticateToken, async (req, res) => {
    try {
      const { course_id } = req.body;
      
      if (!course_id) {
        return res.status(400).json({ error: 'course_id é obrigatório' });
      }

      // Buscar informações do curso
      const courseResult = await pool.query(
        'SELECT id, title, price FROM courses WHERE id = $1',
        [course_id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Curso não encontrado' });
      }

      const course = courseResult.rows[0];
      
      // Gerar PIX
      const payment = await processPixPayment(course, {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      });

      // Salvar pagamento no banco
      const paymentId = crypto.randomUUID();
      await pool.query(`
        INSERT INTO payments (id, user_id, course_id, amount, currency, status, gateway, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        paymentId,
        req.user.id,
        course.id,
        course.price,
        'BRL',
        'pending',
        'mercadopago',
        {
          mercadopago_payment_id: payment.id,
          payment_method: 'pix',
          created_at: new Date().toISOString(),
        }
      ]);

      console.log(`[MERCADOPAGO] ✅ PIX gerado: ${payment.id}`);

      res.json({
        payment_id: paymentId,
        mercadopago_payment_id: payment.id,
        status: payment.status,
        qr_code: payment.pix_qr_code,
        qr_code_base64: payment.pix_qr_code_base64
      });

    } catch (error) {
      console.error('[MERCADOPAGO] ❌ Erro ao gerar PIX:', error);
      res.status(500).json({ 
        error: 'Erro ao gerar PIX',
        details: error.message 
      });
    }
  });

  // Gerar boleto
  router.post('/mercadopago/generate-boleto', authenticateToken, async (req, res) => {
    try {
      const { course_id, doc_number } = req.body;
      
      if (!course_id || !doc_number) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }

      // Buscar informações do curso
      const courseResult = await pool.query(
        'SELECT id, title, price FROM courses WHERE id = $1',
        [course_id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Curso não encontrado' });
      }

      const course = courseResult.rows[0];
      
      // Gerar boleto
      const payment = await processBoletoPayment(course, {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        docNumber: doc_number
      });

      // Salvar pagamento no banco
      const paymentId = crypto.randomUUID();
      await pool.query(`
        INSERT INTO payments (id, user_id, course_id, amount, currency, status, gateway, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        paymentId,
        req.user.id,
        course.id,
        course.price,
        'BRL',
        'pending',
        'mercadopago',
        {
          mercadopago_payment_id: payment.id,
          payment_method: 'boleto',
          created_at: new Date().toISOString(),
        }
      ]);

      console.log(`[MERCADOPAGO] ✅ Boleto gerado: ${payment.id}`);

      res.json({
        payment_id: paymentId,
        mercadopago_payment_id: payment.id,
        status: payment.status,
        boleto_url: payment.external_resource_url,
        barcode: payment.barcode
      });

    } catch (error) {
      console.error('[MERCADOPAGO] ❌ Erro ao gerar boleto:', error);
      res.status(500).json({ 
        error: 'Erro ao gerar boleto',
        details: error.message 
      });
    }
  });

  // Verificar status do pagamento
  router.get('/status/:courseId', authenticateToken, async (req, res) => {
    try {
      const { courseId } = req.params;
      
      // Buscar o pagamento mais recente do usuário para este curso
      const paymentResult = await pool.query(`
        SELECT p.id, p.status, p.amount, p.created_at, p.metadata,
               c.title as course_title
        FROM payments p
        JOIN courses c ON p.course_id = c.id
        WHERE p.user_id = $1 AND p.course_id = $2
        ORDER BY p.created_at DESC
        LIMIT 1
      `, [req.user.id, courseId]);

      if (paymentResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Pagamento não encontrado',
          status: 'not_found'
        });
      }

      const payment = paymentResult.rows[0];
      
      // Se o pagamento está pendente, verificar no Mercado Pago
      if (payment.status === 'pending' && payment.metadata?.mercadopago_payment_id) {
        try {
          const { getPayment } = require('../config/mercadopago');
          const mercadoPagoPayment = await getPayment(payment.metadata.mercadopago_payment_id);
          
          // Atualizar status se mudou
          if (mercadoPagoPayment.status !== payment.status) {
            const newStatus = mercadoPagoPayment.status === 'approved' ? 'succeeded' : 
                             mercadoPagoPayment.status === 'rejected' ? 'failed' : 
                             mercadoPagoPayment.status;
            
            await pool.query(`
              UPDATE payments 
              SET status = $1, updated_at = $2, metadata = $3
              WHERE id = $4
            `, [
              newStatus,
              new Date(),
              {
                ...payment.metadata,
                mercadopago_status: mercadoPagoPayment.status,
                mercadopago_status_detail: mercadoPagoPayment.status_detail,
                updated_at: new Date().toISOString()
              },
              payment.id
            ]);
            
            payment.status = newStatus;
            payment.metadata = {
              ...payment.metadata,
              mercadopago_status: mercadoPagoPayment.status,
              mercadopago_status_detail: mercadoPagoPayment.status_detail
            };
          }
        } catch (mpError) {
          console.error('[MERCADOPAGO] Erro ao verificar status no MP:', mpError);
          // Continuar com o status do banco se não conseguir verificar no MP
        }
      }

      res.json({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        course_title: payment.course_title,
        created_at: payment.created_at,
        metadata: payment.metadata
      });

    } catch (error) {
      console.error('[PAYMENTS] ❌ Erro ao verificar status:', error);
      res.status(500).json({ 
        error: 'Erro ao verificar status do pagamento',
        details: error.message 
      });
    }
  });

  // Criar preferência de pagamento no Mercado Pago
  router.post('/mercadopago/create-preference', authenticateToken, async (req, res) => {
    try {
      const { course_id } = req.body;
      
      if (!course_id) {
        return res.status(400).json({ error: 'course_id é obrigatório' });
      }

      // Buscar informações do curso
      const courseResult = await pool.query(
        'SELECT id, title, price FROM courses WHERE id = $1',
        [course_id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Curso não encontrado' });
      }

      const course = courseResult.rows[0];
      
      // Criar preferência no Mercado Pago
      const preference = await createPreference([
        {
          title: course.title,
          quantity: 1,
          unit_price: parseFloat(course.price),
          description: `Curso: ${course.title}`,
        }
      ], {
        course_id: course.id,
        user_id: req.user.id,
        external_reference: `course_${course.id}_user_${req.user.id}_${Date.now()}`,
      });

      // Salvar pagamento no banco
      const paymentId = crypto.randomUUID();
      await pool.query(`
        INSERT INTO payments (id, user_id, course_id, amount, currency, status, gateway, external_reference, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        paymentId,
        req.user.id,
        course.id,
        course.price,
        'BRL',
        'pending',
        'mercadopago',
        preference.external_reference,
        {
          mercadopago_preference_id: preference.id,
          created_at: new Date().toISOString(),
        }
      ]);

      console.log(`[MERCADOPAGO] ✅ Preferência criada para curso ${course.id}: ${preference.id}`);

      res.json({
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        external_reference: preference.external_reference,
        payment_id: paymentId,
      });

    } catch (error) {
      console.error('[MERCADOPAGO] ❌ Erro ao criar preferência:', error);
      res.status(500).json({ 
        error: 'Erro ao criar preferência de pagamento',
        details: error.message 
      });
    }
  });

  // ===== ROTAS ADMINISTRATIVAS DE PAGAMENTOS =====

  // 1. Buscar métodos de pagamento disponíveis
  router.get('/methods', authenticateToken, async (req, res) => {
    try {
      console.log('[GET /api/payments/methods] Buscando métodos de pagamento');
      
      const methods = [
        {
          id: 'stripe',
          name: 'Stripe',
          type: 'Cartão de Crédito',
          enabled: true,
          description: 'Processamento de cartões internacionais'
        },
        {
          id: 'mercadopago',
          name: 'Mercado Pago',
          type: 'Múltiplos métodos',
          enabled: true,
          description: 'PIX, Boleto, Cartão de Crédito'
        }
      ];
      
      res.json(methods);
    } catch (error) {
      console.error('[GET /api/payments/methods] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar métodos de pagamento.' });
    }
  });

  // 2. Estatísticas de pagamentos por gateway
  router.get('/stats', authenticateToken, async (req, res) => {
    try {
      console.log('[GET /api/payments/stats] Buscando estatísticas de pagamentos');
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      // Buscar estatísticas por gateway
      const { rows } = await pool.query(`
        SELECT 
          gateway,
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN status = 'succeeded' THEN 1 END)::decimal / COUNT(*)) * 100
              ELSE 0
            END, 2
          ) as success_rate
        FROM payments 
        GROUP BY gateway
        ORDER BY total_payments DESC
      `);

      console.log('[GET /api/payments/stats] Estatísticas encontradas:', rows.length);
      res.json(rows);
    } catch (error) {
      console.error('[GET /api/payments/stats] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
    }
  });

  // 3. Buscar histórico de pagamentos
  router.get('/history', authenticateToken, async (req, res) => {
    try {
      console.log('[GET /api/payments/history] Buscando histórico de pagamentos');

      let query;
      let params;

      if (req.user.role === 'admin') {
        query = `
          SELECT p.*, c.title as course_title, c.thumbnail_url, u.name as user_name, u.email as user_email
          FROM payments p
          JOIN courses c ON p.course_id = c.id
          JOIN profiles u ON p.user_id = u.id
          ORDER BY p.created_at DESC
        `;
        params = [];
      } else {
        query = `
          SELECT p.*, c.title as course_title, c.thumbnail_url
          FROM payments p
          JOIN courses c ON p.course_id = c.id
          WHERE p.user_id = $1
          ORDER BY p.created_at DESC
        `;
        params = [req.user.id];
      }

      const { rows } = await pool.query(query, params);
      console.log('[GET /api/payments/history] Pagamentos encontrados:', rows.length);
      res.json(rows);
    } catch (error) {
      console.error('[GET /api/payments/history] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico de pagamentos.' });
    }
  });

  // 4. Estatísticas gerais de pagamentos
  router.get('/overview', authenticateToken, async (req, res) => {
    try {
      console.log('[GET /api/payments/overview] Buscando visão geral de pagamentos');
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      const { period = '30' } = req.query;
      const daysAgo = parseInt(period);
      
      let whereClause = '';
      if (period !== 'all') {
        whereClause = `WHERE created_at >= NOW() - INTERVAL '${daysAgo} days'`;
      }

      // Buscar estatísticas gerais
      const { rows: generalStats } = await pool.query(`
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
          ROUND(AVG(amount), 2) as average_amount,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN status = 'succeeded' THEN 1 END)::decimal / COUNT(*)) * 100
              ELSE 0
            END, 2
          ) as success_rate
        FROM payments 
        ${whereClause}
      `);

      // Buscar dados dos últimos 7 dias para gráfico
      const { rows: dailyStats } = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as payments_count,
          COALESCE(SUM(amount), 0) as daily_revenue,
          COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded_count
        FROM payments 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      const result = {
        general: generalStats[0] || {
          total_payments: 0,
          total_amount: 0,
          succeeded_payments: 0,
          pending_payments: 0,
          failed_payments: 0,
          average_amount: 0,
          success_rate: 0
        },
        daily: dailyStats
      };

      console.log('[GET /api/payments/overview] Visão geral gerada com sucesso');
      res.json(result);
    } catch (error) {
      console.error('[GET /api/payments/overview] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar visão geral de pagamentos.' });
    }
  });

  // 5. Buscar detalhes de um pagamento específico
  router.get('/:paymentId', authenticateToken, async (req, res) => {
    try {
      console.log('[GET /api/payments/:paymentId] Buscando detalhes do pagamento:', req.params.paymentId);
      
      const { paymentId } = req.params;

      const { rows } = await pool.query(`
        SELECT p.*, c.title as course_title, c.thumbnail_url, u.name as user_name
        FROM payments p
        JOIN courses c ON p.course_id = c.id
        JOIN profiles u ON p.user_id = u.id
        WHERE p.id = $1 AND p.user_id = $2
      `, [paymentId, req.user.id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Pagamento não encontrado.' });
      }

      console.log('[GET /api/payments/:paymentId] Pagamento encontrado');
      res.json(rows[0]);
    } catch (error) {
      console.error('[GET /api/payments/:paymentId] Erro:', error);
      res.status(500).json({ error: 'Erro ao buscar detalhes do pagamento.' });
    }
  });

  return router;
}; 