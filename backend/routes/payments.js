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

  return router;
}; 