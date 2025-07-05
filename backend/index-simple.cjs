const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bodyParser = require('body-parser');

// ===== CONFIGURAÇÕES =====
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const app = express();

// 1. Middleware RAW do Mercado Pago (antes de qualquer express.json)
app.use('/api/webhooks/mercadopago', bodyParser.raw({ type: '*/*' }));

// 2. Log de requisições (opcional)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// 3. Agora, para o restante da aplicação, use express.json normalmente
app.use(express.json());

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Token ausente.' });
  }
  
  try {
    const [, token] = auth.split(' ');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error(`[AUTH] Token inválido para ${req.method} ${req.path}:`, err.message);
    res.status(401).json({ error: 'Token inválido.' });
  }
};

// ===== ROTAS BÁSICAS =====

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint de login
app.post('/api/auth/login', async (req, res) => {
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
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, role, bio, avatar_url, created_at FROM profiles WHERE id = $1', [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para notificações
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/notifications] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para contador de notificações
app.get('/api/notifications/count', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = $1 AND read_at IS NULL
    `, [req.user.id]);
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    console.error('[GET /api/notifications/count] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para contador de conversas não lidas
app.get('/api/conversations/unread-count', authenticateToken, async (req, res) => {
  try {
    // Por enquanto, retornar 0 (não implementado)
    res.json({ count: 0 });
  } catch (err) {
    console.error('[GET /api/conversations/unread-count] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para estatísticas de rating de curso
app.get('/api/courses/:id/rating-stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar estatísticas de rating do curso
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_ratings,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM course_ratings 
      WHERE course_id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.json({
        total_ratings: 0,
        average_rating: 0,
        five_star: 0,
        four_star: 0,
        three_star: 0,
        two_star: 0,
        one_star: 0
      });
    }
    
    const stats = rows[0];
    res.json({
      total_ratings: parseInt(stats.total_ratings),
      average_rating: parseFloat(stats.average_rating || 0),
      five_star: parseInt(stats.five_star),
      four_star: parseInt(stats.four_star),
      three_star: parseInt(stats.three_star),
      two_star: parseInt(stats.two_star),
      one_star: parseInt(stats.one_star)
    });
  } catch (err) {
    console.error('[GET /api/courses/:id/rating-stats] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para posts
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, u.name as author_name, u.avatar_url as author_avatar
      FROM posts p
      JOIN profiles u ON p.author_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/posts] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para cursos
app.get('/api/courses', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, u.name as instructor_name
      FROM courses c
      JOIN profiles u ON c.instructor_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/courses] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para estatísticas
app.get('/api/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const [membersResult, coursesResult, postsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM profiles'),
      pool.query('SELECT COUNT(*) as count FROM courses'),
      pool.query('SELECT COUNT(*) as count FROM posts')
    ]);
    
    res.json({
      membersCount: parseInt(membersResult.rows[0].count),
      coursesCount: parseInt(coursesResult.rows[0].count),
      postsCount: parseInt(postsResult.rows[0].count),
      averageRating: 4.5
    });
  } catch (err) {
    console.error('[GET /api/dashboard-stats] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para tags populares
app.get('/api/popular-tags', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM posts 
      WHERE category IS NOT NULL AND category <> ''
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 8
    `);
    
    const popularTags = rows.map(row => row.category);
    
    if (popularTags.length < 6) {
      const defaultTags = ['javascript', 'react', 'nodejs', 'python', 'docker', 'aws'];
      const existingTags = new Set(popularTags);
      
      for (const tag of defaultTags) {
        if (!existingTags.has(tag) && popularTags.length < 8) {
          popularTags.push(tag);
        }
      }
    }
    
    res.json(popularTags);
  } catch (err) {
    console.error('[GET /api/popular-tags] Erro:', err);
    res.json(['javascript', 'react', 'nodejs', 'python', 'docker', 'aws']);
  }
});

// Servir arquivos estáticos do React (APENAS para rotas que não começam com /api)
app.use(express.static(path.join(__dirname, 'public')));

// Rota catch-all para o React (APENAS para rotas que não começam com /api)
app.get('*', (req, res) => {
  // Se a rota começa com /api, retornar 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint não encontrado.' });
  }
  
  // Para outras rotas, servir o React
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend simples rodando na porta ${PORT}`);
  console.log(`✅ Configurações básicas funcionando`);
}); 