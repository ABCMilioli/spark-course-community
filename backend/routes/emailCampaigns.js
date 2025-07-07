const express = require('express');
const router = express.Router();

// Middleware de autenticação
const { authenticateToken } = require('../middleware/auth');

// Importar módulo de campanhas
const emailCampaigns = require('../modules/emailCampaigns');

// ===== ROTAS DE CAMPANHAS =====

// Listar campanhas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      campaign_type: req.query.campaign_type,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };
    
    const campaigns = await emailCampaigns.getCampaigns(req.app.locals.pool, req.user.id, filters);
    res.json(campaigns);
  } catch (err) {
    console.error('[GET /api/email-campaigns] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ROTAS DE TEMPLATES =====

// Listar templates
router.get('/templates', authenticateToken, async (req, res) => {
  console.log('[GET /api/email-campaigns/templates] Iniciando...');
  try {
    const { campaign_type } = req.query;
    console.log('[GET /api/email-campaigns/templates] campaign_type:', campaign_type);
    const templates = await emailCampaigns.getTemplates(req.app.locals.pool, campaign_type);
    console.log('[GET /api/email-campaigns/templates] Templates encontrados:', templates.length);
    res.json(templates);
  } catch (err) {
    console.error('[GET /api/email-campaigns/templates] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Obter campanha específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await emailCampaigns.getCampaign(req.app.locals.pool, id, req.user.id);
    res.json(campaign);
  } catch (err) {
    console.error('[GET /api/email-campaigns/:id] Erro:', err);
    if (err.message === 'Campanha não encontrada') {
      res.status(404).json({ error: err.message });
    } else if (err.message === 'Sem permissão para acessar esta campanha') {
      res.status(403).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno.' });
    }
  }
});

// Criar nova campanha
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      subject,
      html_content,
      text_content,
      campaign_type,
      target_audience,
      target_classes,
      custom_filter,
      scheduled_at,
      reference_id,
      reference_type
    } = req.body;
    
    // Validações básicas
    if (!name || !subject || !html_content || !campaign_type) {
      return res.status(400).json({ error: 'Nome, assunto, conteúdo HTML e tipo de campanha são obrigatórios.' });
    }
    
    const campaignData = {
      name,
      subject,
      html_content,
      text_content,
      campaign_type,
      target_audience: target_audience || 'all',
      target_classes: target_classes || [],
      custom_filter,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
      reference_id,
      reference_type
    };
    
    const campaign = await emailCampaigns.createCampaign(req.app.locals.pool, campaignData, req.user.id);
    res.status(201).json(campaign);
  } catch (err) {
    console.error('[POST /api/email-campaigns] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Atualizar campanha
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const campaign = await emailCampaigns.updateCampaign(req.app.locals.pool, id, updateData, req.user.id);
    res.json(campaign);
  } catch (err) {
    console.error('[PUT /api/email-campaigns/:id] Erro:', err);
    if (err.message === 'Campanha não encontrada') {
      res.status(404).json({ error: err.message });
    } else if (err.message === 'Sem permissão para acessar esta campanha') {
      res.status(403).json({ error: err.message });
    } else if (err.message === 'Nenhum campo válido para atualizar') {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno.' });
    }
  }
});

// Deletar campanha
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await emailCampaigns.deleteCampaign(req.app.locals.pool, id, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('[DELETE /api/email-campaigns/:id] Erro:', err);
    if (err.message === 'Campanha não encontrada') {
      res.status(404).json({ error: err.message });
    } else if (err.message === 'Sem permissão para acessar esta campanha') {
      res.status(403).json({ error: err.message });
    } else if (err.message === 'Não é possível deletar uma campanha já enviada') {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno.' });
    }
  }
});

// Agendar campanha
router.post('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at } = req.body;
    
    if (!scheduled_at) {
      return res.status(400).json({ error: 'Data de agendamento é obrigatória.' });
    }
    
    const campaign = await emailCampaigns.scheduleCampaign(req.app.locals.pool, id, new Date(scheduled_at), req.user.id);
    res.json(campaign);
  } catch (err) {
    console.error('[POST /api/email-campaigns/:id/schedule] Erro:', err);
    if (err.message === 'Campanha não encontrada') {
      res.status(404).json({ error: err.message });
    } else if (err.message === 'Sem permissão para acessar esta campanha') {
      res.status(403).json({ error: err.message });
    } else if (err.message === 'Apenas campanhas em rascunho podem ser agendadas') {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno.' });
    }
  }
});

// Cancelar campanha
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await emailCampaigns.cancelCampaign(req.app.locals.pool, id, req.user.id);
    res.json(campaign);
  } catch (err) {
    console.error('[POST /api/email-campaigns/:id/cancel] Erro:', err);
    if (err.message === 'Campanha não encontrada') {
      res.status(404).json({ error: err.message });
    } else if (err.message === 'Sem permissão para acessar esta campanha') {
      res.status(403).json({ error: err.message });
    } else if (err.message === 'Não é possível cancelar uma campanha já enviada') {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno.' });
    }
  }
});

// Enviar campanha imediatamente
router.post('/:id/send', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await emailCampaigns.sendCampaignNow(req.app.locals.pool, id, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('[POST /api/email-campaigns/:id/send] Erro:', err);
    if (err.message === 'Campanha não encontrada') {
      res.status(404).json({ error: err.message });
    } else if (err.message === 'Sem permissão para acessar esta campanha') {
      res.status(403).json({ error: err.message });
    } else if (err.message === 'Apenas campanhas em rascunho ou agendadas podem ser enviadas') {
      res.status(400).json({ error: err.message });
    } else if (err.message === 'Nenhum destinatário encontrado para esta campanha') {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno.' });
    }
  }
});

// Obter estatísticas da campanha
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await emailCampaigns.getCampaignStats(req.app.locals.pool, id, req.user.id);
    res.json(stats);
  } catch (err) {
    console.error('[GET /api/email-campaigns/:id/stats] Erro:', err);
    if (err.message === 'Campanha não encontrada') {
      res.status(404).json({ error: err.message });
    } else if (err.message === 'Sem permissão para acessar esta campanha') {
      res.status(403).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Erro interno.' });
    }
  }
});

// ===== ROTAS DE DESTINATÁRIOS =====

// Obter destinatários para preview
router.post('/preview-recipients', authenticateToken, async (req, res) => {
  try {
    const { target_audience, target_classes, custom_filter } = req.body;
    
    const recipients = await emailCampaigns.getRecipients(
      req.app.locals.pool, 
      target_audience || 'all', 
      target_classes || [], 
      custom_filter
    );
    
    res.json({
      count: recipients.length,
      recipients: recipients.slice(0, 10) // Mostrar apenas os primeiros 10 para preview
    });
  } catch (err) {
    console.error('[POST /api/email-campaigns/preview-recipients] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ROTAS DE CONTEÚDO =====

// Obter dados do conteúdo relacionado
router.post('/content-data', authenticateToken, async (req, res) => {
  try {
    const { reference_id, reference_type } = req.body;
    
    const contentData = await emailCampaigns.getContentData(
      req.app.locals.pool, 
      reference_id, 
      reference_type
    );
    
    res.json(contentData);
  } catch (err) {
    console.error('[POST /api/email-campaigns/content-data] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ROTAS DE WEBHOOK =====

// Webhook para processar eventos de email (abertura, clique, etc.)
router.post('/webhook/:campaignId/:recipientId', async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;
    const { action, details } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Ação é obrigatória.' });
    }
    
    await emailCampaigns.processEmailWebhook(
      req.app.locals.pool, 
      campaignId, 
      recipientId, 
      action, 
      details || {}
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/email-campaigns/webhook/:campaignId/:recipientId] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Webhook para rastreamento de abertura (pixel de rastreamento)
router.get('/webhook/:campaignId/:recipientId/opened', async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;
    
    console.log(`[WEBHOOK] Pixel de abertura detectado para campanha ${campaignId}, destinatário ${recipientId}`);
    console.log(`[WEBHOOK] User-Agent: ${req.headers['user-agent']}`);
    console.log(`[WEBHOOK] Referer: ${req.headers.referer}`);
    
    await emailCampaigns.processEmailWebhook(
      req.app.locals.pool, 
      campaignId, 
      recipientId, 
      'opened', 
      { 
        source: 'pixel_tracking',
        user_agent: req.headers['user-agent'],
        referer: req.headers.referer,
        ip: req.ip
      }
    );
    
    // Retornar pixel transparente 1x1
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (err) {
    console.error('[GET /api/email-campaigns/webhook/:campaignId/:recipientId/opened] Erro:', err);
    // Mesmo com erro, retornar pixel para não quebrar o email
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  }
});

// Webhook para rastreamento de clique
router.get('/webhook/:campaignId/:recipientId/clicked', async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;
    const { url } = req.query;
    
    console.log(`[WEBHOOK] Clique detectado para campanha ${campaignId}, destinatário ${recipientId}, URL: ${url}`);
    
    await emailCampaigns.processEmailWebhook(
      req.app.locals.pool, 
      campaignId, 
      recipientId, 
      'clicked', 
      { source: 'link_tracking', url: url }
    );
    
    // Redirecionar para a URL original
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.redirect('/');
    }
  } catch (err) {
    console.error('[GET /api/email-campaigns/webhook/:campaignId/:recipientId/clicked] Erro:', err);
    // Redirecionar mesmo com erro
    const { url } = req.query;
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.redirect('/');
    }
  }
});

// ===== ROTAS DE TESTE =====

// Testar envio de email
router.post('/test-send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, html_content, text_content } = req.body;
    
    if (!to || !subject || !html_content) {
      return res.status(400).json({ error: 'Destinatário, assunto e conteúdo HTML são obrigatórios.' });
    }
    
    // Enviar email de teste
    await req.app.locals.sendMail({
      to,
      subject,
      html: html_content,
      text: text_content
    });
    
    res.json({ success: true, message: 'Email de teste enviado com sucesso!' });
  } catch (err) {
    console.error('[POST /api/email-campaigns/test-send] Erro:', err);
    res.status(500).json({ error: 'Erro ao enviar email de teste.' });
  }
});

module.exports = router; 