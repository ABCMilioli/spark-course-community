const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

module.exports = (pool) => {
  // Contador de notificações
  router.get('/count', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { rows } = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE is_read = false) as unread_count,
          COUNT(*) as total_count
        FROM notifications 
        WHERE user_id = $1
      `, [userId]);
      res.json(rows[0]);
    } catch (err) {
      console.error('[GET /api/notifications/count]', err);
      res.status(500).json({ error: 'Erro ao buscar contador de notificações.' });
    }
  });

  // Listar notificações
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;
      
      const { rows } = await pool.query(`
        SELECT * FROM notifications 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, parseInt(limit), parseInt(offset)]);
      
      res.json(rows);
    } catch (err) {
      console.error('[GET /api/notifications]', err);
      res.status(500).json({ error: 'Erro ao buscar notificações.' });
    }
  });

  // Marcar notificação como lida
  router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const { rowCount } = await pool.query(`
        UPDATE notifications 
        SET is_read = true 
        WHERE id = $1 AND user_id = $2
      `, [id, userId]);
      
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Notificação não encontrada.' });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('[PUT /api/notifications/:id/read]', err);
      res.status(500).json({ error: 'Erro ao marcar notificação como lida.' });
    }
  });

  // Marcar todas as notificações como lidas
  router.put('/read-all', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      
      await pool.query(`
        UPDATE notifications 
        SET is_read = true 
        WHERE user_id = $1 AND is_read = false
      `, [userId]);
      
      res.json({ success: true });
    } catch (err) {
      console.error('[PUT /api/notifications/read-all]', err);
      res.status(500).json({ error: 'Erro ao marcar notificações como lidas.' });
    }
  });

  // Deletar notificação específica
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await pool.query(`
        DELETE FROM notifications 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Notificação não encontrada.' });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('[DELETE /api/notifications/:id]', err);
      res.status(500).json({ error: 'Erro ao deletar notificação.' });
    }
  });

  // Deletar múltiplas notificações
  router.delete('/', authenticateToken, async (req, res) => {
    try {
      const { notificationIds } = req.body;
      const userId = req.user.id;
      
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({ error: 'IDs das notificações são obrigatórios.' });
      }
      
      const placeholders = notificationIds.map((_, index) => `$${index + 2}`).join(', ');
      const result = await pool.query(`
        DELETE FROM notifications 
        WHERE id IN (${placeholders}) AND user_id = $1
        RETURNING id
      `, [userId, ...notificationIds]);
      
      res.json({ success: true, deletedCount: result.rows.length });
    } catch (err) {
      console.error('[DELETE /api/notifications]', err);
      res.status(500).json({ error: 'Erro ao deletar notificações.' });
    }
  });

  // Deletar todas as notificações
  router.delete('/all', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      
      const result = await pool.query(`
        DELETE FROM notifications 
        WHERE user_id = $1
        RETURNING id
      `, [userId]);
      
      res.json({ success: true, deletedCount: result.rows.length });
    } catch (err) {
      console.error('[DELETE /api/notifications/all]', err);
      res.status(500).json({ error: 'Erro ao deletar todas as notificações.' });
    }
  });

  // Rota para navegação baseada no tipo de notificação
  router.get('/:id/navigate', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Buscar a notificação
      const { rows } = await pool.query(`
        SELECT * FROM notifications 
        WHERE id = $1 AND user_id = $2
      `, [id, userId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Notificação não encontrada.' });
      }
      
      const notification = rows[0];
      
      // Marcar como lida
      await pool.query(`
        UPDATE notifications 
        SET is_read = true 
        WHERE id = $1
      `, [id]);
      
      // Retornar URL de navegação baseada no tipo
      let url = '/';
      
      switch (notification.type) {
        case 'comment':
        case 'reply':
        case 'lesson_comment':
        case 'lesson_comment_like':
          // Navegar para comentário de aula
          if (notification.reference_type === 'lesson_comment') {
            const commentResult = await pool.query(`
              SELECT lc.lesson_id, l.title as lesson_title, m.title as module_title, c.id as course_id, c.title as course_title
              FROM lesson_comments lc
              JOIN lessons l ON lc.lesson_id = l.id
              JOIN modules m ON l.module_id = m.id
              JOIN courses c ON m.course_id = c.id
              WHERE lc.id = $1
            `, [notification.reference_id]);
            
            if (commentResult.rows.length > 0) {
              const comment = commentResult.rows[0];
              url = `/player?courseId=${comment.course_id}&lessonId=${comment.lesson_id}#comment-${notification.reference_id}`;
            }
          }
          break;
          
        case 'community_new_post':
        case 'community_comment':
        case 'community_like':
        case 'community_comment_like':
          // Navegar para post da comunidade
          if (notification.reference_type === 'post') {
            url = `/post/${notification.reference_id}`;
          }
          break;
          
        case 'forum_new_post':
        case 'forum_reply':
        case 'forum_like':
        case 'forum_reply_like':
          // Navegar para post do fórum
          if (notification.reference_type === 'forum_post') {
            const postResult = await pool.query(`
              SELECT id, title, topic_id
              FROM forum_posts 
              WHERE id = $1
            `, [notification.reference_id]);
            
            if (postResult.rows.length > 0) {
              const post = postResult.rows[0];
              url = `/forum/post/${notification.reference_id}`;
            }
          }
          break;
          
        case 'new_message':
          // Navegar para conversa
          if (notification.reference_type === 'conversation') {
            url = `/messages/${notification.reference_id}`;
          }
          break;
          
        case 'system':
          // Notificações do sistema não navegam
          url = '/';
          break;
          
        default:
          // Para tipos não mapeados, ir para a página inicial
          url = '/';
      }
      
      console.log('[NAVIGATION] Navegando para:', url, 'Tipo:', notification.type, 'Reference:', notification.reference_id);
      res.json({ url });
    } catch (err) {
      console.error('[GET /api/notifications/:id/navigate]', err);
      res.status(500).json({ error: 'Erro ao processar navegação da notificação.' });
    }
  });

  return router;
}; 