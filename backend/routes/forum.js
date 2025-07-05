const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadFile } = require('../utils/upload');

const router = express.Router();

module.exports = (pool, sendWebhook, createNotification, getUserName) => {
  // Upload de imagem do fórum
  router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.' });
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 10MB.' });
      }

      const result = await uploadFile(req.file, 'forum-images');
      
      res.json({
        success: true,
        url: result.url,
        fileName: result.fileName,
        size: result.size
      });
      
    } catch (error) {
      console.error('[POST /api/forum/upload-image] Erro:', error);
      res.status(500).json({ error: 'Erro ao fazer upload da imagem.' });
    }
  });

  // Listar tópicos do fórum
  router.get('/topics', authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          ft.*,
          p.name as created_by_name,
          p.avatar_url as created_by_avatar,
          (SELECT COUNT(*) FROM forum_posts WHERE topic_id = ft.id) as posts_count,
          (SELECT COUNT(*) FROM forum_posts fp 
           JOIN forum_replies fr ON fp.id = fr.post_id 
           WHERE fp.topic_id = ft.id) as replies_count,
          (SELECT MAX(fp.updated_at) FROM forum_posts fp WHERE fp.topic_id = ft.id) as last_activity
        FROM forum_topics ft
        JOIN profiles p ON ft.created_by = p.id
        WHERE ft.is_active = true
        ORDER BY ft.is_pinned DESC, ft.order_index ASC, ft.created_at ASC
      `);
      
      if (!Array.isArray(rows)) {
        res.json([]);
        return;
      }
      
      res.json(rows);
    } catch (err) {
      console.error('[GET /api/forum/topics] Erro ao buscar tópicos:', err.message);
      res.status(500).json({ error: 'Erro interno ao buscar tópicos.' });
    }
  });

  // Criar novo tópico
  router.post('/topics', authenticateToken, async (req, res) => {
    try {
      const { title, description, slug } = req.body;
      
      console.log('[POST /api/forum/topics] Criando tópico:', { title, description, slug });
      console.log('[POST /api/forum/topics] Usuário:', req.user.id);
      
      if (!title || !description) {
        return res.status(400).json({ error: 'Título e descrição são obrigatórios.' });
      }

      // Verificar se o slug já existe
      if (slug) {
        const slugExists = await pool.query(
          'SELECT id FROM forum_topics WHERE slug = $1',
          [slug]
        );

        if (slugExists.rows.length > 0) {
          return res.status(400).json({ error: 'Este slug já está em uso.' });
        }
      }

      const id = crypto.randomUUID();
      const created_at = new Date();
      
      await pool.query(
        'INSERT INTO forum_topics (id, title, description, slug, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, title, description, slug, req.user.id, created_at]
      );

      console.log('[POST /api/forum/topics] Tópico criado com sucesso');

      // Webhook (opcional, não deve quebrar se falhar)
      if (typeof sendWebhook === 'function') {
        try {
          await sendWebhook('forum_topic.created', {
            id, title, description, slug, created_by: req.user.id, created_by_name: req.user.name, created_at: created_at.toISOString()
          });
        } catch (webhookError) {
          console.error('[WEBHOOK] Erro ao enviar webhook forum_topic.created:', webhookError);
        }
      }

      res.status(201).json({ id, title, description, slug, created_by: req.user.id, created_at });
    } catch (err) {
      console.error('[POST /api/forum/topics] Erro ao criar tópico:', err);
      console.error('[POST /api/forum/topics] Detalhes do erro:', {
        message: err.message,
        code: err.code,
        detail: err.detail
      });
      res.status(500).json({ error: 'Erro ao criar tópico.' });
    }
  });

  // Editar tópico
  router.put('/topics/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, order_index, cover_image_url, banner_image_url } = req.body;
      
      console.log('[PUT /api/forum/topics/:id] Editando tópico:', id);
      console.log('[PUT /api/forum/topics/:id] Dados:', { title, description, order_index, cover_image_url, banner_image_url });
      console.log('[PUT /api/forum/topics/:id] Usuário:', req.user.id);
      
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Título é obrigatório.' });
      }
      
      // Verificar se o tópico existe
      const topicCheck = await pool.query(`
        SELECT * FROM forum_topics WHERE id = $1
      `, [id]);
      
      if (topicCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Tópico não encontrado.' });
      }
      
      const topic = topicCheck.rows[0];
      
      // Verificar permissão (admin, instructor ou criador do tópico)
      if (!['admin', 'instructor'].includes(req.user.role) && topic.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para editar este tópico.' });
      }
      
      // Gerar novo slug se o título mudou
      let slug = topic.slug;
      if (title.trim() !== topic.title) {
        const baseSlug = title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
        
        slug = baseSlug;
        let counter = 1;
        
        // Verificar se slug já existe (excluindo o tópico atual)
        while (true) {
          const existingSlug = await pool.query('SELECT id FROM forum_topics WHERE slug = $1 AND id != $2', [slug, id]);
          if (existingSlug.rows.length === 0) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }
      
      const result = await pool.query(`
        UPDATE forum_topics 
        SET title = $1, description = $2, slug = $3, order_index = $4, cover_image_url = $5, banner_image_url = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [title.trim(), description?.trim() || null, slug, order_index || topic.order_index, cover_image_url || null, banner_image_url || null, id]);
      
      console.log('[PUT /api/forum/topics/:id] Tópico editado com sucesso:', result.rows[0].title);
      
      // Webhook (opcional, não deve quebrar se falhar)
      if (typeof sendWebhook === 'function') {
        try {
          await sendWebhook('forum_topic.updated', {
            id, title, description, slug, updated_by: req.user.id, updated_by_name: req.user.name, updated_at: new Date().toISOString()
          });
        } catch (webhookError) {
          console.error('[WEBHOOK] Erro ao enviar webhook forum_topic.updated:', webhookError);
        }
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[PUT /api/forum/topics/:id] Erro ao editar tópico:', err);
      console.error('[PUT /api/forum/topics/:id] Detalhes do erro:', {
        message: err.message,
        code: err.code,
        detail: err.detail
      });
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Deletar tópico
  router.delete('/topics/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('[DELETE /api/forum/topics/:id] Deletando tópico:', id);
      console.log('[DELETE /api/forum/topics/:id] Usuário:', req.user.id);
      
      // Verificar se o tópico existe
      const topicCheck = await pool.query(`
        SELECT * FROM forum_topics WHERE id = $1
      `, [id]);
      
      if (topicCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Tópico não encontrado.' });
      }
      
      const topic = topicCheck.rows[0];
      
      // Verificar permissão (admin, instructor ou criador do tópico)
      if (!['admin', 'instructor'].includes(req.user.role) && topic.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para deletar este tópico.' });
      }
      
      // Verificar se há posts no tópico
      const postsCheck = await pool.query(`
        SELECT COUNT(*) as count FROM forum_posts WHERE topic_id = $1
      `, [id]);
      
      const postsCount = parseInt(postsCheck.rows[0].count);
      
      if (postsCount > 0) {
        return res.status(400).json({ 
          error: `Não é possível deletar o tópico. Ele possui ${postsCount} post(s). Remova todos os posts primeiro.` 
        });
      }
      
      await pool.query(`
        DELETE FROM forum_topics WHERE id = $1
      `, [id]);
      
      console.log('[DELETE /api/forum/topics/:id] Tópico deletado com sucesso:', topic.title);
      
      // Webhook (opcional, não deve quebrar se falhar)
      if (typeof sendWebhook === 'function') {
        try {
          await sendWebhook('forum_topic.deleted', {
            id: topic.id, title: topic.title, deleted_by: req.user.id, deleted_by_name: req.user.name, deleted_at: new Date().toISOString()
          });
        } catch (webhookError) {
          console.error('[WEBHOOK] Erro ao enviar webhook forum_topic.deleted:', webhookError);
        }
      }
      
      res.json({ message: 'Tópico deletado com sucesso.' });
    } catch (err) {
      console.error('[DELETE /api/forum/topics/:id] Erro ao deletar tópico:', err);
      console.error('[DELETE /api/forum/topics/:id] Detalhes do erro:', {
        message: err.message,
        code: err.code,
        detail: err.detail
      });
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Listar posts de um tópico
  router.get('/topics/:slug/posts', authenticateToken, async (req, res) => {
    try {
      const { slug } = req.params;
      const { page = 1, limit = 20, sort = 'latest' } = req.query;
      
      const topicResult = await pool.query(
        'SELECT id, title, description FROM forum_topics WHERE slug = $1 AND is_active = true',
        [slug]
      );

      if (topicResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tópico não encontrado.' });
      }

      const topic = topicResult.rows[0];
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Ordenação
      let orderClause = 'ORDER BY fp.is_pinned DESC, fp.created_at DESC';
      if (sort === 'popular') {
        orderClause = 'ORDER BY fp.is_pinned DESC, fp.view_count DESC, fp.created_at DESC';
      } else if (sort === 'replies') {
        orderClause = 'ORDER BY fp.is_pinned DESC, replies_count DESC, fp.created_at DESC';
      }

      const postsResult = await pool.query(`
        SELECT 
          fp.*,
          p.name as author_name,
          p.avatar_url as author_avatar,
          p.role as author_role,
          (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) as replies_count,
          (SELECT COUNT(*) FROM forum_post_likes WHERE post_id = fp.id) as likes_count,
          (SELECT COUNT(*) FROM forum_post_favorites WHERE post_id = fp.id) as favorites_count,
          EXISTS(SELECT 1 FROM forum_post_likes WHERE post_id = fp.id AND user_id = $1) as is_liked_by_user,
          EXISTS(SELECT 1 FROM forum_post_favorites WHERE post_id = fp.id AND user_id = $1) as is_favorited_by_user,
          array_agg(DISTINCT ftags.name) as tags
        FROM forum_posts fp
        JOIN profiles p ON fp.author_id = p.id
        LEFT JOIN forum_post_tags fpt ON fp.id = fpt.post_id
        LEFT JOIN forum_tags ftags ON fpt.tag_id = ftags.id
        WHERE fp.topic_id = $2
        GROUP BY fp.id, p.name, p.avatar_url, p.role
        ${orderClause}
        LIMIT $3 OFFSET $4
      `, [req.user.id, topic.id, parseInt(limit), offset]);

      // Contar total de posts
      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM forum_posts WHERE topic_id = $1',
        [topic.id]
      );

      res.json({
        topic,
        posts: postsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / parseInt(limit))
        }
      });
    } catch (err) {
      console.error('[GET /api/forum/topics/:slug/posts] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Buscar post específico por ID
  router.get('/posts/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      console.log('[GET /api/forum/posts/:id] Buscando post:', id);

      // Buscar o post
      const postResult = await pool.query(`
        SELECT 
          fp.*,
          p.name as author_name,
          p.avatar_url as author_avatar,
          p.role as author_role,
          ft.title as topic_title,
          ft.slug as topic_slug,
          (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) as replies_count,
          (SELECT COUNT(*) FROM forum_post_likes WHERE post_id = fp.id) as likes_count,
          (SELECT COUNT(*) FROM forum_post_favorites WHERE post_id = fp.id) as favorites_count,
          EXISTS(SELECT 1 FROM forum_post_likes WHERE post_id = fp.id AND user_id = $1) as is_liked_by_user,
          EXISTS(SELECT 1 FROM forum_post_favorites WHERE post_id = fp.id AND user_id = $1) as is_favorited_by_user,
          array_agg(DISTINCT ftags.name) as tags
        FROM forum_posts fp
        JOIN profiles p ON fp.author_id = p.id
        JOIN forum_topics ft ON fp.topic_id = ft.id
        LEFT JOIN forum_post_tags fpt ON fp.id = fpt.post_id
        LEFT JOIN forum_tags ftags ON fpt.tag_id = ftags.id
        WHERE fp.id = $2
        GROUP BY fp.id, p.name, p.avatar_url, p.role, ft.title, ft.slug
      `, [req.user.id, id]);

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }

      const post = postResult.rows[0];

      // Buscar respostas do post
      const repliesResult = await pool.query(`
        SELECT 
          fr.*,
          p.name as author_name,
          p.avatar_url as author_avatar,
          p.role as author_role,
          (SELECT COUNT(*) FROM forum_reply_likes WHERE reply_id = fr.id) as likes_count,
          EXISTS(SELECT 1 FROM forum_reply_likes WHERE reply_id = fr.id AND user_id = $1) as is_liked_by_user
        FROM forum_replies fr
        JOIN profiles p ON fr.author_id = p.id
        WHERE fr.post_id = $2
        ORDER BY fr.is_solution DESC, fr.created_at ASC
      `, [req.user.id, id]);

      // Incrementar view count
      await pool.query(
        'UPDATE forum_posts SET view_count = view_count + 1 WHERE id = $1',
        [id]
      );

      console.log('[GET /api/forum/posts/:id] Post e respostas encontrados');

      res.json({
        post: post,
        replies: repliesResult.rows
      });

    } catch (err) {
      console.error('[GET /api/forum/posts/:id] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Criar novo post
  router.post('/posts', authenticateToken, async (req, res) => {
    try {
      const { topic_id, title, content, tags = [], content_image_url } = req.body;
      
      console.log('[POST /api/forum/posts] Criando post:', title);
      console.log('[POST /api/forum/posts] Usuário:', req.user);
      
      if (!topic_id || !title || !content) {
        return res.status(400).json({ error: 'Tópico, título e conteúdo são obrigatórios.' });
      }

      const id = crypto.randomUUID();
      const created_at = new Date();
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Inserir o post
        const postResult = await client.query(`
          INSERT INTO forum_posts (id, title, content, topic_id, author_id, content_image_url, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [id, title.trim(), content.trim(), topic_id, req.user.id, content_image_url || null, created_at, created_at]);

        const post = postResult.rows[0];

        // Inserir tags se fornecidas
        if (tags && tags.length > 0) {
          // Filtrar tags válidas (não vazias, não nulas)
          const validTags = tags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0);
          
          for (const tagName of validTags) {
            const trimmedTagName = tagName.trim();
            
            // Verificar se tag existe, se não, criar
            let tagResult = await client.query('SELECT id FROM forum_tags WHERE name = $1', [trimmedTagName]);
            let tagId;
            
            if (tagResult.rows.length === 0) {
              const newTagResult = await client.query(`
                INSERT INTO forum_tags (name) VALUES ($1) RETURNING id
              `, [trimmedTagName]);
              tagId = newTagResult.rows[0].id;
            } else {
              tagId = tagResult.rows[0].id;
            }
            
            // Associar tag ao post
            await client.query(`
              INSERT INTO forum_post_tags (post_id, tag_id) VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [id, tagId]);
          }
        }

        await client.query('COMMIT');

        // Buscar informações do tópico
        const topicResult = await pool.query(
          'SELECT title as topic_title, slug as topic_slug FROM forum_topics WHERE id = $1',
          [topic_id]
        );

        const postWithDetails = {
          ...post,
          author_name: req.user.name,
          author_avatar: req.user.avatar_url,
          topic_title: topicResult.rows[0]?.topic_title,
          topic_slug: topicResult.rows[0]?.topic_slug,
          replies_count: 0,
          likes_count: 0,
          favorites_count: 0
        };

        // Webhook (opcional, não deve quebrar se falhar)
        if (typeof sendWebhook === 'function') {
          try {
            await sendWebhook('forum_post.created', {
              id, title, content, topic_id, author_id: req.user.id, author_name: req.user.name, created_at: created_at.toISOString()
            });
          } catch (webhookError) {
            console.error('[WEBHOOK] Erro ao enviar webhook forum_post.created:', webhookError);
          }
        }

        console.log('[POST /api/forum/posts] Post criado com sucesso:', post.title);
        res.status(201).json(postWithDetails);

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

    } catch (err) {
      console.error('[POST /api/forum/posts] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Editar post
  router.put('/posts/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, tags = [], content_image_url } = req.body;
      
      console.log('[PUT /api/forum/posts/:id] Editando post:', id);
      console.log('[PUT /api/forum/posts/:id] Usuário:', req.user);
      
      if (!title || !content) {
        return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
      }
      
      // Verificar se o post existe e se o usuário tem permissão para editar
      const postCheck = await pool.query(`
        SELECT author_id FROM forum_posts WHERE id = $1
      `, [id]);
      
      if (postCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }
      
      const post = postCheck.rows[0];
      
      // Verificar permissões (apenas autor ou admin podem editar)
      if (post.author_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para editar este post.' });
      }
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Atualizar post
        const updateResult = await client.query(`
          UPDATE forum_posts 
          SET title = $1, content = $2, content_image_url = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *
        `, [title.trim(), content.trim(), content_image_url || null, id]);
        
        // Remover tags antigas
        await client.query('DELETE FROM forum_post_tags WHERE post_id = $1', [id]);
        
        // Inserir novas tags se fornecidas
        if (tags && tags.length > 0) {
          // Filtrar tags válidas (não vazias, não nulas)
          const validTags = tags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0);
          
          for (const tagName of validTags) {
            const trimmedTagName = tagName.trim();
            
            // Verificar se tag existe, se não, criar
            let tagResult = await client.query('SELECT id FROM forum_tags WHERE name = $1', [trimmedTagName]);
            let tagId;
            
            if (tagResult.rows.length === 0) {
              const newTagResult = await client.query(`
                INSERT INTO forum_tags (name) VALUES ($1) RETURNING id
              `, [trimmedTagName]);
              tagId = newTagResult.rows[0].id;
            } else {
              tagId = tagResult.rows[0].id;
            }
            
            // Associar tag ao post
            await client.query(`
              INSERT INTO forum_post_tags (post_id, tag_id) VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [id, tagId]);
          }
        }
        
        await client.query('COMMIT');
        
        console.log('[PUT /api/forum/posts/:id] Post atualizado com sucesso');
        res.json(updateResult.rows[0]);
        
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      
    } catch (err) {
      console.error('[PUT /api/forum/posts/:id] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Deletar post
  router.delete('/posts/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('[DELETE /api/forum/posts/:id] Excluindo post:', id);
      console.log('[DELETE /api/forum/posts/:id] Usuário:', req.user);
      
      // Verificar se o post existe e se o usuário tem permissão para excluir
      const postCheck = await pool.query(`
        SELECT author_id FROM forum_posts WHERE id = $1
      `, [id]);
      
      if (postCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }
      
      const post = postCheck.rows[0];
      
      // Verificar permissões (apenas autor ou admin podem excluir)
      if (post.author_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para excluir este post.' });
      }
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Excluir relacionamentos de curtidas
        await client.query('DELETE FROM forum_post_likes WHERE post_id = $1', [id]);
        
        // Excluir relacionamentos de favoritos
        await client.query('DELETE FROM forum_post_favorites WHERE post_id = $1', [id]);
        
        // Excluir relacionamentos de tags
        await client.query('DELETE FROM forum_post_tags WHERE post_id = $1', [id]);
        
        // Excluir curtidas de respostas
        await client.query(`
          DELETE FROM forum_reply_likes 
          WHERE reply_id IN (SELECT id FROM forum_replies WHERE post_id = $1)
        `, [id]);
        
        // Excluir respostas
        await client.query('DELETE FROM forum_replies WHERE post_id = $1', [id]);
        
        // Excluir o post
        await client.query('DELETE FROM forum_posts WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        console.log('[DELETE /api/forum/posts/:id] Post excluído com sucesso');
        res.json({ success: true, message: 'Post excluído com sucesso.' });
        
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      
    } catch (err) {
      console.error('[DELETE /api/forum/posts/:id] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Criar resposta para um post
  router.post('/posts/:id/replies', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Conteúdo é obrigatório.' });
      }

      console.log('[POST /api/forum/posts/:id/replies] Criando resposta');
      console.log('[POST /api/forum/posts/:id/replies] Usuário:', req.user);

      // Verificar se o post existe
      const postResult = await pool.query(
        'SELECT id, title FROM forum_posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }

      const replyId = crypto.randomUUID();
      const created_at = new Date();
      
      const replyResult = await pool.query(`
        INSERT INTO forum_replies (id, content, post_id, author_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [replyId, content, postId, req.user.id, created_at, created_at]);

      const reply = replyResult.rows[0];

      const replyWithDetails = {
        ...reply,
        author_name: req.user.name,
        author_avatar: req.user.avatar_url,
        likes_count: 0
      };

      // Webhook
      try {
        await sendWebhook('forum_reply.created', {
          id: replyId, content, post_id: postId, author_id: req.user.id, author_name: req.user.name, created_at: created_at.toISOString()
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook forum_reply.created:', webhookError);
      }

      console.log('[POST /api/forum/posts/:id/replies] Resposta criada com sucesso');
      res.status(201).json(replyWithDetails);

    } catch (err) {
      console.error('[POST /api/forum/posts/:id/replies] Erro:', err);
      res.status(500).json({ error: 'Erro ao criar resposta.' });
    }
  });

  // Curtir/descurtir post
  router.post('/posts/:id/like', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      
      // Verificar se o post existe
      const postResult = await pool.query(
        'SELECT id FROM forum_posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }

      // Verificar se já curtiu
      const existingLike = await pool.query(
        'SELECT id FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, req.user.id]
      );

      if (existingLike.rows.length > 0) {
        // Descurtir
        await pool.query(
          'DELETE FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, req.user.id]
        );
        res.json({ liked: false, message: 'Post descurtido.' });
      } else {
        // Curtir
        const likeId = crypto.randomUUID();
        await pool.query(
          'INSERT INTO forum_post_likes (id, post_id, user_id, created_at) VALUES ($1, $2, $3, $4)',
          [likeId, postId, req.user.id, new Date()]
        );
        res.json({ liked: true, message: 'Post curtido.' });
      }

    } catch (err) {
      console.error('[POST /api/forum/posts/:id/like] Erro:', err);
      res.status(500).json({ error: 'Erro ao processar like.' });
    }
  });

  // Favoritar/desfavoritar post
  router.post('/posts/:id/favorite', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      
      // Verificar se o post existe
      const postResult = await pool.query(
        'SELECT id FROM forum_posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post não encontrado.' });
      }

      // Verificar se já favoritou
      const existingFavorite = await pool.query(
        'SELECT id FROM forum_post_favorites WHERE post_id = $1 AND user_id = $2',
        [postId, req.user.id]
      );

      if (existingFavorite.rows.length > 0) {
        // Desfavoritar
        await pool.query(
          'DELETE FROM forum_post_favorites WHERE post_id = $1 AND user_id = $2',
          [postId, req.user.id]
        );
        res.json({ favorited: false, message: 'Post removido dos favoritos.' });
      } else {
        // Favoritar
        const favoriteId = crypto.randomUUID();
        await pool.query(
          'INSERT INTO forum_post_favorites (id, post_id, user_id, created_at) VALUES ($1, $2, $3, $4)',
          [favoriteId, postId, req.user.id, new Date()]
        );
        res.json({ favorited: true, message: 'Post adicionado aos favoritos.' });
      }

    } catch (err) {
      console.error('[POST /api/forum/posts/:id/favorite] Erro:', err);
      res.status(500).json({ error: 'Erro ao processar favorito.' });
    }
  });

  // Listar respostas de um post
  router.get('/posts/:id/replies', authenticateToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      console.log('[GET /api/forum/posts/:id/replies] Buscando respostas do post:', postId);

      const repliesResult = await pool.query(`
        SELECT 
          fr.*,
          p.name as author_name,
          p.avatar_url as author_avatar,
          (SELECT COUNT(*) FROM forum_reply_likes WHERE reply_id = fr.id) as likes_count
        FROM forum_replies fr
        JOIN profiles p ON fr.author_id = p.id
        WHERE fr.post_id = $1
        ORDER BY fr.created_at ASC
      `, [postId]);

      console.log('[GET /api/forum/posts/:id/replies] Encontradas', repliesResult.rows.length, 'respostas');
      res.json(repliesResult.rows);

    } catch (err) {
      console.error('[GET /api/forum/posts/:id/replies] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Editar resposta
  router.put('/replies/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Conteúdo é obrigatório.' });
      }

      const result = await pool.query(`
        UPDATE forum_replies 
        SET content = $1, updated_at = $2
        WHERE id = $3 AND author_id = $4
        RETURNING *
      `, [content, new Date(), id, req.user.id]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Resposta não encontrada ou sem permissão.' });
      }

      res.json(result.rows[0]);

    } catch (err) {
      console.error('[PUT /api/forum/replies/:id] Erro:', err);
      res.status(500).json({ error: 'Erro ao atualizar resposta.' });
    }
  });

  // Deletar resposta
  router.delete('/replies/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se a resposta existe e se o usuário tem permissão
      const replyResult = await pool.query(
        'SELECT * FROM forum_replies WHERE id = $1 AND author_id = $2',
        [id, req.user.id]
      );

      if (replyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Resposta não encontrada ou sem permissão.' });
      }

      // Deletar likes da resposta
      await pool.query('DELETE FROM forum_reply_likes WHERE reply_id = $1', [id]);
      
      // Deletar a resposta
      await pool.query('DELETE FROM forum_replies WHERE id = $1', [id]);

      res.json({ message: 'Resposta excluída com sucesso.' });

    } catch (err) {
      console.error('[DELETE /api/forum/replies/:id] Erro:', err);
      res.status(500).json({ error: 'Erro ao excluir resposta.' });
    }
  });

  // Listar todas as tags do fórum
  router.get('/tags', authenticateToken, async (req, res) => {
    try {
      console.log('[GET /api/forum/tags] Listando tags do fórum');

      const tagsResult = await pool.query(`
        SELECT 
          ft.*,
          (SELECT COUNT(*) FROM forum_post_tags WHERE tag_id = ft.id) as usage_count
        FROM forum_tags ft
        ORDER BY usage_count DESC, ft.name ASC
      `);

      console.log('[GET /api/forum/tags] Tags encontradas:', tagsResult.rows.length);
      res.json(tagsResult.rows);

    } catch (err) {
      console.error('[GET /api/forum/tags] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Buscar tags populares
  router.get('/tags/popular', authenticateToken, async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      
      console.log('[GET /api/forum/tags/popular] Buscando tags populares, limite:', limit);

      const tagsResult = await pool.query(`
        SELECT 
          ft.*,
          (SELECT COUNT(*) FROM forum_post_tags WHERE tag_id = ft.id) as usage_count
        FROM forum_tags ft
        WHERE (SELECT COUNT(*) FROM forum_post_tags WHERE tag_id = ft.id) > 0
        ORDER BY usage_count DESC, ft.name ASC
        LIMIT $1
      `, [parseInt(limit)]);

      console.log('[GET /api/forum/tags/popular] Tags populares encontradas:', tagsResult.rows.length);
      res.json(tagsResult.rows);

    } catch (err) {
      console.error('[GET /api/forum/tags/popular] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  return router;
}; 