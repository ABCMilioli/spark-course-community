const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { requestPasswordReset, resetPassword } = require('../modules/passwordReset');
const { requestEmailVerification, confirmEmailVerification, resendVerificationEmail } = require('../modules/emailVerification');

const router = express.Router();

module.exports = (pool) => {
  // Endpoint de login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios.' });

    try {
      const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
      const user = rows[0];
      if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });

      // Se não existir campo de senha, aceite qualquer senha para o admin inicial
      if (!user.password_hash) {
        // Opcional: crie o hash agora
        const hash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [hash, user.id]);
        user.password_hash = hash;
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Senha inválida.' });

      const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Endpoint protegido de exemplo
  router.get('/profile', authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, name, email, role, bio, avatar_url, created_at FROM profiles WHERE id = $1', [req.user.id]);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Endpoint para perfil público de usuário
  router.get('/users/:userId/profile', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('[GET /api/users/:userId/profile] Buscando perfil público para usuário:', userId);
      
      // Buscar dados básicos do usuário (apenas campos públicos)
      const userResult = await pool.query(
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
        pool.query('SELECT COUNT(*) as count FROM posts WHERE author_id = $1', [userId]),
        // Cursos matriculados (apenas contagem)
        pool.query('SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1', [userId]),
        // Posts no fórum
        pool.query('SELECT COUNT(*) as count FROM forum_posts WHERE author_id = $1', [userId])
      ]);
      
      const stats = {
        posts_count: parseInt(postsResult.rows[0].count),
        courses_enrolled: parseInt(enrollmentsResult.rows[0].count),
        forum_posts_count: parseInt(forumPostsResult.rows[0].count),
      };
      
      // Buscar posts recentes do usuário (últimos 5)
      const recentPostsResult = await pool.query(`
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
      
      console.log('[GET /api/users/:userId/profile] Perfil público encontrado:', {
        id: user.id,
        name: user.name,
        stats
      });
      
      res.json(response);
    } catch (err) {
      console.error('[GET /api/users/:userId/profile] Erro ao buscar perfil público:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Endpoint para atualizar perfil
  router.put('/profile', authenticateToken, async (req, res) => {
    try {
      const { name, email, bio, avatar_url } = req.body;
      
      // Validações básicas
      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
      }
      
      // Verificar se o email já existe (exceto para o usuário atual)
      const emailCheck = await pool.query(
        'SELECT id FROM profiles WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );
      
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Este email já está em uso.' });
      }
      
      // Atualizar perfil
      const { rows } = await pool.query(
        'UPDATE profiles SET name = $1, email = $2, bio = $3, avatar_url = $4 WHERE id = $5 RETURNING id, name, email, role, bio, avatar_url, created_at',
        [name, email, bio, avatar_url, req.user.id]
      );
      
      res.json(rows[0]);
    } catch (err) {
      console.error('[PUT /api/profile] Erro ao atualizar perfil:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  // Solicitar recuperação de senha
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log('[POST /api/auth/forgot-password] Recebida solicitação para:', email);
    
    if (!email) {
      console.log('[POST /api/auth/forgot-password] Erro: E-mail não fornecido');
      return res.status(400).json({ error: 'E-mail obrigatório.' });
    }
    
    try {
      console.log('[POST /api/auth/forgot-password] Iniciando processo de recuperação...');
      console.log('[POST /api/auth/forgot-password] Pool disponível:', !!req.app.locals.pool);
      
      await requestPasswordReset(req.app.locals.pool, email);
      console.log('[POST /api/auth/forgot-password] E-mail de recuperação enviado com sucesso');
      res.json({ success: true });
    } catch (err) {
      console.error('[POST /api/auth/forgot-password] Erro detalhado:', err);
      console.error('[POST /api/auth/forgot-password] Stack trace:', err.stack);
      res.status(500).json({ error: 'Erro ao solicitar recuperação de senha.' });
    }
  });

  // Redefinir senha
  router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token e nova senha obrigatórios.' });
    try {
      await resetPassword(req.app.locals.pool, token, password);
      res.json({ success: true });
    } catch (err) {
      console.error('[POST /api/auth/reset-password]', err);
      res.status(400).json({ error: err.message || 'Erro ao redefinir senha.' });
    }
  });

  // ===== VERIFICAÇÃO DE EMAIL =====

  // Solicitar verificação de email (etapa 1 do cadastro)
  router.post('/signup-request', async (req, res) => {
    const { name, email, password } = req.body;
    console.log('[POST /api/auth/signup-request] Recebida solicitação para:', email);
    
    if (!name || !email || !password) {
      console.log('[POST /api/auth/signup-request] Erro: Dados incompletos');
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }
    
    try {
      console.log('[POST /api/auth/signup-request] Iniciando processo de verificação...');
      
      await requestEmailVerification(req.app.locals.pool, name, email, password);
      console.log('[POST /api/auth/signup-request] E-mail de verificação enviado com sucesso');
      
      res.json({ 
        success: true, 
        message: 'E-mail de verificação enviado. Verifique sua caixa de entrada e spam.' 
      });
    } catch (err) {
      console.error('[POST /api/auth/signup-request] Erro detalhado:', err);
      console.error('[POST /api/auth/signup-request] Stack trace:', err.stack);
      
      if (err.message.includes('já está cadastrado')) {
        res.status(409).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Erro ao solicitar verificação de email.' });
      }
    }
  });

  // Confirmar verificação de email (etapa 2 do cadastro)
  router.post('/signup-confirm', async (req, res) => {
    const { token } = req.body;
    console.log('[POST /api/auth/signup-confirm] Recebida confirmação para token:', token ? token.substring(0, 10) + '...' : 'null');
    
    if (!token) {
      console.log('[POST /api/auth/signup-confirm] Erro: Token não fornecido');
      return res.status(400).json({ error: 'Token de verificação obrigatório.' });
    }
    
    try {
      console.log('[POST /api/auth/signup-confirm] Iniciando confirmação...');
      
      const user = await confirmEmailVerification(req.app.locals.pool, token);
      console.log('[POST /api/auth/signup-confirm] Usuário criado com sucesso:', user.email);
      
      res.json({ 
        success: true, 
        message: 'Email confirmado com sucesso! Sua conta foi criada.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('[POST /api/auth/signup-confirm] Erro detalhado:', err);
      console.error('[POST /api/auth/signup-confirm] Stack trace:', err.stack);
      
      if (err.message.includes('Token inválido') || err.message.includes('expirado')) {
        res.status(400).json({ error: err.message });
      } else if (err.message.includes('já foi verificado')) {
        res.status(409).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Erro ao confirmar verificação de email.' });
      }
    }
  });

  // Reenviar email de verificação
  router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    console.log('[POST /api/auth/resend-verification] Recebida solicitação de reenvio para:', email);
    
    if (!email) {
      console.log('[POST /api/auth/resend-verification] Erro: E-mail não fornecido');
      return res.status(400).json({ error: 'E-mail obrigatório.' });
    }
    
    try {
      console.log('[POST /api/auth/resend-verification] Iniciando reenvio...');
      
      await resendVerificationEmail(req.app.locals.pool, email);
      console.log('[POST /api/auth/resend-verification] E-mail de reenvio enviado com sucesso');
      
      res.json({ 
        success: true, 
        message: 'Novo e-mail de verificação enviado. Verifique sua caixa de entrada e spam.' 
      });
    } catch (err) {
      console.error('[POST /api/auth/resend-verification] Erro detalhado:', err);
      console.error('[POST /api/auth/resend-verification] Stack trace:', err.stack);
      
      if (err.message.includes('não foi encontrada')) {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Erro ao reenviar e-mail de verificação.' });
      }
    }
  });

  return router;
}; 