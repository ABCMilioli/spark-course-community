const express = require('express');
const bodyParser = require('body-parser');
const { WebhookService, sendWebhook } = require('../services/webhookService');

const router = express.Router();

// Middleware específico para webhooks - body como raw
router.use(bodyParser.raw({ type: '*/*' }));

module.exports = (pool, authenticateToken) => {
  const webhookService = new WebhookService(pool);

  // Webhook do Mercado Pago (não precisa de autenticação)
  router.post('/mercadopago', async (req, res) => {
    await webhookService.processMercadoPagoWebhook(req, res);
  });

  // ===== ENDPOINTS DE GERENCIAMENTO DE WEBHOOKS =====

  // Listar webhooks (precisa de autenticação de admin)
  router.get('/', authenticateToken, async (req, res) => {
    try {
      console.log('[GET /api/webhooks] Usuário:', req.user);
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      console.log('[GET /api/webhooks] Executando query...');
      
      // Primeiro verificar se a tabela existe
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'webhooks'
        );
      `);
      console.log('[GET /api/webhooks] Tabela webhooks existe:', tableCheck.rows[0].exists);
      
      if (!tableCheck.rows[0].exists) {
        return res.status(500).json({ error: 'Tabela webhooks não existe. Execute as migrations.' });
      }
      
      const { rows } = await pool.query(`
        SELECT id, name, url, events, is_active, created_at, updated_at
        FROM webhooks 
        ORDER BY created_at DESC
      `);
      console.log('[GET /api/webhooks] Resultado:', rows);

      res.json(rows);
    } catch (err) {
      console.error('[GET /api/webhooks] Erro:', err);
      res.status(500).json({ error: 'Erro ao buscar webhooks.' });
    }
  });

  // Criar webhook (precisa de autenticação de admin)
  router.post('/', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      const { name, url, events, is_active = true, secret_key } = req.body;

      if (!name || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Nome, URL e eventos são obrigatórios.' });
      }

      const crypto = require('crypto');
      const id = crypto.randomUUID();
      const { rows } = await pool.query(`
        INSERT INTO webhooks (id, name, url, events, is_active, secret_key)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, url, events, is_active, created_at, updated_at
      `, [id, name, url, events, is_active, secret_key || null]);

      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('[POST /api/webhooks]', err);
      res.status(500).json({ error: 'Erro ao criar webhook.' });
    }
  });

  // Atualizar webhook (precisa de autenticação de admin)
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      const { id } = req.params;
      const { name, url, events, is_active, secret_key } = req.body;

      if (!name || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Nome, URL e eventos são obrigatórios.' });
      }

      const { rows } = await pool.query(`
        UPDATE webhooks 
        SET name = $1, url = $2, events = $3, is_active = $4, secret_key = $5
        WHERE id = $6
        RETURNING id, name, url, events, is_active, created_at, updated_at
      `, [name, url, events, is_active, secret_key || null, id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Webhook não encontrado.' });
      }

      res.json(rows[0]);
    } catch (err) {
      console.error('[PUT /api/webhooks/:id]', err);
      res.status(500).json({ error: 'Erro ao atualizar webhook.' });
    }
  });

  // Deletar webhook (precisa de autenticação de admin)
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      const { id } = req.params;

      const { rowCount } = await pool.query('DELETE FROM webhooks WHERE id = $1', [id]);

      if (rowCount === 0) {
        return res.status(404).json({ error: 'Webhook não encontrado.' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('[DELETE /api/webhooks/:id]', err);
      res.status(500).json({ error: 'Erro ao deletar webhook.' });
    }
  });

  // Buscar logs de um webhook (precisa de autenticação de admin)
  router.get('/:id/logs', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const { rows } = await pool.query(`
        SELECT * FROM webhook_logs 
        WHERE webhook_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [id, parseInt(limit), parseInt(offset)]);

      res.json(rows);
    } catch (err) {
      console.error('[GET /api/webhooks/:id/logs]', err);
      res.status(500).json({ error: 'Erro ao buscar logs.' });
    }
  });

  return router;
}; 