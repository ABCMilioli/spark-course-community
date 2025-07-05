const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

module.exports = (pool, sendWebhook, createNotification, getUserName) => {
  // Listar posts
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const { author_id } = req.query;
      let query = `
        SELECT p.*, 
               u.name as author_name, 
               u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes_count,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
               (SELECT COUNT(*) FROM post_favorites pf WHERE pf.post_id = p.id) as favorites_count
        FROM posts p 
        LEFT JOIN profiles u ON p.author_id = u.id 
      `;
      const params = [];
      if (author_id) {
        query += ' WHERE p.author_id = $1';
        params.push(author_id);
      }
      query += ' ORDER BY p.created_at DESC';
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error('[GET /api/posts] Erro ao buscar posts:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Criar novo post
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const { title, content, category, cover_image, video_url } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
      }
      const id = crypto.randomUUID();
      const created_at = new Date();
      await pool.query(
        'INSERT INTO posts (id, title, content, author_id, category, cover_image, video_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, title, content, req.user.id, category, cover_image, video_url, created_at]
      );
      // Webhook
      try {
        await sendWebhook('post.created', {
          id, title, content, author_id: req.user.id, author_name: req.user.name, category, cover_image, video_url, created_at: created_at.toISOString()
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook post.created:', webhookError);
      }
      // Notificação para moderadores/admins
      try {
        const modAdminResult = await pool.query(`
          SELECT id, name FROM profiles WHERE role IN ('admin', 'instructor') AND id != $1
        `, [req.user.id]);
        const userName = await getUserName(req.user.id, req.user.name);
        for (const moderator of modAdminResult.rows) {
          await createNotification(
            moderator.id,
            'Novo post na comunidade',
            `${userName} criou um novo post "${title}" na comunidade`,
            'community_new_post',
            id,
            'community_post'
          );
        }
      } catch (notificationErr) {
        console.error('[NOTIFICATION] Erro ao criar notificação de novo post da comunidade:', notificationErr);
      }
      res.status(201).json({ id, title, content, category, cover_image, video_url, author_id: req.user.id, created_at });
    } catch (err) {
      console.error('[POST /api/posts] Erro ao criar post:', err);
      res.status(500).json({ error: 'Erro ao criar post.' });
    }
  });

  // Listar categorias
  router.get('/categories', authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT DISTINCT category FROM posts WHERE category IS NOT NULL AND category <> '' ORDER BY category ASC`
      );
      const categories = rows.map(r => r.category);
      res.json(categories);
    } catch (err) {
      console.error('[GET /api/posts/categories] Erro:', err);
      res.status(500).json({ error: 'Erro ao buscar categorias.' });
    }
  });

  // Buscar post específico
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(`
        SELECT p.*, 
               u.name as author_name, 
               u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes_count,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
               (SELECT COUNT(*) FROM post_favorites pf WHERE pf.post_id = p.id) as favorites_count
        FROM posts p 
        LEFT JOIN profiles u ON p.author_id = u.id 
        WHERE p.id = $1
      `, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }
      
      res.json(rows[0]);
    } catch (err) {
      console.error('[GET /api/posts/:id] Erro ao buscar post:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Editar post
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, category, cover_image, video_url } = req.body;
      
      console.log('[PUT /api/posts/:id] Editando post:', id);
      console.log('[PUT /api/posts/:id] Usuário:', req.user.id, req.user.role);
      
      if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
      }
      
      // Verificar se o post existe
      const postCheck = await pool.query(
        'SELECT author_id FROM posts WHERE id = $1',
        [id]
      );
      
      if (postCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }
      
      const post = postCheck.rows[0];
      
      // Verificar permissões (apenas autor ou admin podem editar)
      if (post.author_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para editar este post.' });
      }
      
      const result = await pool.query(
        'UPDATE posts SET title = $1, content = $2, category = $3, cover_image = $4, video_url = $5 WHERE id = $6 RETURNING *',
        [title, content, category, cover_image, video_url, id]
      );
      
      console.log('[PUT /api/posts/:id] Post editado com sucesso');
      
      // Webhook
      try {
        await sendWebhook('post.updated', {
          id, title, content, category, cover_image, video_url, author_id: post.author_id, updated_by: req.user.id, updated_by_name: req.user.name, updated_at: new Date().toISOString()
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook post.updated:', webhookError);
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[PUT /api/posts/:id] Erro ao editar post:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Deletar post
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('[DELETE /api/posts/:id] Deletando post:', id);
      console.log('[DELETE /api/posts/:id] Usuário:', req.user.id, req.user.role);
      
      // Verificar se o post existe
      const postCheck = await pool.query(
        'SELECT author_id FROM posts WHERE id = $1',
        [id]
      );
      
      if (postCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }
      
      const post = postCheck.rows[0];
      
      // Verificar permissões (apenas autor ou admin podem deletar)
      if (post.author_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para deletar este post.' });
      }
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Deletar likes do post
        await client.query('DELETE FROM post_likes WHERE post_id = $1', [id]);
        
        // Deletar favoritos do post
        await client.query('DELETE FROM post_favorites WHERE post_id = $1', [id]);
        
        // Deletar comentários do post
        await client.query('DELETE FROM comments WHERE post_id = $1', [id]);
        
        // Deletar o post
        await client.query('DELETE FROM posts WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        console.log('[DELETE /api/posts/:id] Post deletado com sucesso');
        
        // Webhook
        try {
          await sendWebhook('post.deleted', {
            id, author_id: post.author_id, deleted_by: req.user.id, deleted_by_name: req.user.name, deleted_at: new Date().toISOString()
          });
        } catch (webhookError) {
          console.error('[WEBHOOK] Erro ao enviar webhook post.deleted:', webhookError);
        }
        
        res.json({ message: 'Post deletado com sucesso.' });
        
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      
    } catch (err) {
      console.error('[DELETE /api/posts/:id] Erro ao deletar post:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Curtir post
  router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.id;
      
      const existingLike = await pool.query(
        'SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      
      const result = await pool.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
        [postId, userId]
      );
      
      if (existingLike.rows.length === 0 && result.rows.length > 0) {
        try {
          const postAuthorResult = await pool.query(`
            SELECT p.author_id, p.title, prof.name as author_name
            FROM posts p
            JOIN profiles prof ON p.author_id = prof.id
            WHERE p.id = $1
          `, [postId]);
          
          if (postAuthorResult.rows.length > 0) {
            const { author_id: postAuthorId, title: postTitle } = postAuthorResult.rows[0];
            
            if (postAuthorId !== userId) {
              const userName = await getUserName(req.user.id, req.user.name);
              await createNotification(
                postAuthorId,
                'Curtida no seu post',
                `${userName} curtiu seu post "${postTitle}"`,
                'like',
                postId,
                'community_post'
              );
            }
          }
        } catch (notificationErr) {
          console.error('[NOTIFICATION] Erro ao criar notificação de curtida em post da comunidade:', notificationErr);
        }
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('[POST /api/posts/:id/like] Erro:', err);
      res.status(500).json({ error: 'Erro ao curtir post.' });
    }
  });

  // Descurtir post
  router.delete('/:id/like', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.id;
      await pool.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('[DELETE /api/posts/:id/like] Erro:', err);
      res.status(500).json({ error: 'Erro ao remover curtida.' });
    }
  });

  // Verificar curtidas
  router.get('/:id/likes', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.id;
      const countResult = await pool.query(
        'SELECT COUNT(*)::int as count FROM post_likes WHERE post_id = $1',
        [postId]
      );
      const userResult = await pool.query(
        'SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      res.json({
        count: countResult.rows[0].count,
        likedByUser: userResult.rows.length > 0
      });
    } catch (err) {
      console.error('[GET /api/posts/:id/likes] Erro:', err);
      res.status(500).json({ error: 'Erro ao buscar curtidas.' });
    }
  });

  // Listar comentários de um post
  router.get('/:id/comments', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const { rows } = await pool.query(`
        SELECT c.*, p.name as author_name, p.avatar_url as author_avatar
        FROM comments c
        LEFT JOIN profiles p ON c.user_id = p.id
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC
      `, [postId]);
      res.json(rows);
    } catch (err) {
      console.error('[GET /api/posts/:id/comments] Erro:', err);
      res.status(500).json({ error: 'Erro ao buscar comentários.' });
    }
  });

  // Adicionar comentário a um post
  router.post('/:id/comments', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.id;
      const { content } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comentário não pode ser vazio.' });
      }
      const result = await pool.query(
        'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
        [postId, userId, content.trim()]
      );

      // Webhook
      try {
        const comment = result.rows[0];
        await sendWebhook('comment.created', {
          id: comment.id, post_id: postId, user_id: userId, user_name: req.user.name, content: comment.content, created_at: comment.created_at
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook comment.created:', webhookError);
      }

      // Notificação
      try {
        const postAuthorResult = await pool.query(`
          SELECT p.author_id, p.title, prof.name as author_name
          FROM posts p
          JOIN profiles prof ON p.author_id = prof.id
          WHERE p.id = $1
        `, [postId]);
        
        if (postAuthorResult.rows.length > 0) {
          const { author_id: postAuthorId, title: postTitle } = postAuthorResult.rows[0];
          
          if (postAuthorId !== userId) {
            const userName = await getUserName(req.user.id, req.user.name);
            await createNotification(
              postAuthorId,
              'Novo comentário no seu post',
              `${userName} comentou no seu post "${postTitle}"`,
              'community_comment',
              postId,
              'community_post'
            );
          }
        }
      } catch (notificationErr) {
        console.error('[NOTIFICATION] Erro ao criar notificação de comentário em post da comunidade:', notificationErr);
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[POST /api/posts/:id/comments] Erro:', err);
      res.status(500).json({ error: 'Erro ao adicionar comentário.' });
    }
  });

  // Favoritar post
  router.post('/:id/favorite', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.id;
      await pool.query(
        'INSERT INTO post_favorites (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [postId, userId]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('[POST /api/posts/:id/favorite] Erro:', err);
      res.status(500).json({ error: 'Erro ao favoritar post.' });
    }
  });

  // Desfavoritar post
  router.delete('/:id/favorite', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.id;
      await pool.query(
        'DELETE FROM post_favorites WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('[DELETE /api/posts/:id/favorite] Erro:', err);
      res.status(500).json({ error: 'Erro ao desfavoritar post.' });
    }
  });

  // Verificar favorito
  router.get('/:id/favorite', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.id;
      const result = await pool.query(
        'SELECT 1 FROM post_favorites WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      res.json({ favorited: result.rows.length > 0 });
    } catch (err) {
      console.error('[GET /api/posts/:id/favorite] Erro:', err);
      res.status(500).json({ error: 'Erro ao verificar favorito.' });
    }
  });

  // Editar comentário
  router.put('/comments/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      console.log('[PUT /api/posts/comments/:id] Editando comentário:', id);
      console.log('[PUT /api/posts/comments/:id] Usuário:', req.user.id, req.user.role);
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comentário não pode ser vazio.' });
      }
      
      // Verificar se o comentário existe
      const commentCheck = await pool.query(
        'SELECT user_id FROM comments WHERE id = $1',
        [id]
      );
      
      if (commentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Comentário não encontrado.' });
      }
      
      const comment = commentCheck.rows[0];
      
      // Verificar permissões (apenas autor ou admin podem editar)
      if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para editar este comentário.' });
      }
      
      const result = await pool.query(
        'UPDATE comments SET content = $1 WHERE id = $2 RETURNING *',
        [content.trim(), id]
      );
      
      console.log('[PUT /api/posts/comments/:id] Comentário editado com sucesso');
      
      // Webhook
      try {
        await sendWebhook('comment.updated', {
          id, content: content.trim(), updated_by: req.user.id, updated_by_name: req.user.name, updated_at: new Date().toISOString()
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook comment.updated:', webhookError);
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[PUT /api/posts/comments/:id] Erro ao editar comentário:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Deletar comentário
  router.delete('/comments/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('[DELETE /api/posts/comments/:id] Deletando comentário:', id);
      console.log('[DELETE /api/posts/comments/:id] Usuário:', req.user.id, req.user.role);
      
      // Verificar se o comentário existe
      const commentCheck = await pool.query(
        'SELECT user_id FROM comments WHERE id = $1',
        [id]
      );
      
      if (commentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Comentário não encontrado.' });
      }
      
      const comment = commentCheck.rows[0];
      
      // Verificar permissões (apenas autor ou admin podem deletar)
      if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para deletar este comentário.' });
      }
      
      await pool.query('DELETE FROM comments WHERE id = $1', [id]);
      
      console.log('[DELETE /api/posts/comments/:id] Comentário deletado com sucesso');
      
      // Webhook
      try {
        await sendWebhook('comment.deleted', {
          id, deleted_by: req.user.id, deleted_by_name: req.user.name, deleted_at: new Date().toISOString()
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook comment.deleted:', webhookError);
      }
      
      res.json({ message: 'Comentário deletado com sucesso.' });
    } catch (err) {
      console.error('[DELETE /api/posts/comments/:id] Erro ao deletar comentário:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  return router;
}; 