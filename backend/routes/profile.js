const express = require('express');
const router = express.Router();

// Middleware de autenticação
const { authenticateToken } = require('../middleware/auth');

// Upload de avatar do usuário
const upload = require('../middleware/upload');
const { uploadFile } = require('../utils/upload');

// ===== PERFIL DO USUÁRIO =====

// Obter perfil do usuário autenticado
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT id, name, email, role, bio, avatar_url, created_at FROM profiles WHERE id = $1', 
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/profile] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Atualizar perfil do usuário
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, bio, avatar_url } = req.body;
    
    // Validações básicas
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }
    
    // Verificar se o email já existe (exceto para o usuário atual)
    const emailCheck = await req.app.locals.pool.query(
      'SELECT id FROM profiles WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Este email já está em uso.' });
    }
    
    // Atualizar perfil
    const { rows } = await req.app.locals.pool.query(
      'UPDATE profiles SET name = $1, email = $2, bio = $3, avatar_url = $4 WHERE id = $5 RETURNING id, name, email, role, bio, avatar_url, created_at',
      [name, email, bio || null, avatar_url || null, req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /api/profile] Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// Upload de avatar do usuário
router.post('/upload/avatar', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    // Verificar se é uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens são permitidas para avatar' });
    }
    const result = await uploadFile(req.file, 'avatars');
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Avatar enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/profile/upload/avatar] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do avatar',
      details: error.message 
    });
  }
});

// ===== PERFIL PÚBLICO DE USUÁRIO =====

// Obter perfil público de um usuário específico
router.get('/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[GET /api/profile/users/:userId] Buscando perfil público para usuário:', userId);
    
    // Buscar dados básicos do usuário (apenas campos públicos)
    const userResult = await req.app.locals.pool.query(
      'SELECT id, name, role, bio, avatar_url, created_at FROM profiles WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    const user = userResult.rows[0];
    
    // Buscar estatísticas do usuário
    const [postsResult, enrollmentsResult, forumPostsResult] = await Promise.all([
      // Posts criados na comunidade
      req.app.locals.pool.query('SELECT COUNT(*) as count FROM posts WHERE author_id = $1', [userId]),
      // Cursos matriculados (apenas contagem)
      req.app.locals.pool.query('SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1', [userId]),
      // Posts no fórum
      req.app.locals.pool.query('SELECT COUNT(*) as count FROM forum_posts WHERE author_id = $1', [userId])
    ]);
    
    const stats = {
      posts_count: parseInt(postsResult.rows[0].count),
      courses_enrolled: parseInt(enrollmentsResult.rows[0].count),
      forum_posts_count: parseInt(forumPostsResult.rows[0].count),
    };
    
    // Buscar posts recentes do usuário (últimos 5)
    const recentPostsResult = await req.app.locals.pool.query(`
      SELECT p.*, 
             (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count
      FROM posts p 
      WHERE p.author_id = $1 
      ORDER BY p.created_at DESC 
      LIMIT 5
    `, [userId]);
    
    const response = {
      ...user,
      stats,
      recent_posts: recentPostsResult.rows
    };
    
    console.log('[GET /api/profile/users/:userId] Perfil público encontrado:', {
      id: user.id,
      name: user.name,
      stats
    });
    
    res.json(response);
  } catch (err) {
    console.error('[GET /api/profile/users/:userId] Erro ao buscar perfil público:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router; 