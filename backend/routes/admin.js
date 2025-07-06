const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Middleware de autenticação
const { authenticateToken } = require('../middleware/auth');
const { sendWebhook } = require('../services/webhookService');

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// ===== GERENCIAMENTO DE USUÁRIOS =====

// Listar usuários
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, limit = 10 } = req.query;
    let query = 'SELECT id, name, email, role, created_at FROM profiles';
    const params = [];
    
    if (role) {
      params.push(role);
      query += ` WHERE role = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
    
    const { rows } = await req.app.locals.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/admin/users] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Buscar usuários
router.get('/users/search', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { q, role, limit = 20 } = req.query;
    
    let query = 'SELECT id, name, email, role, created_at FROM profiles WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (q) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }
    
    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
    
    const { rows } = await req.app.locals.pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/admin/users/search] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Editar usuário
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
    }
    
    let query = 'UPDATE profiles SET name = $1, email = $2, role = $3';
    const params = [name, email, role];
    
    if (password) {
      query += ', password_hash = $4';
      const hash = await bcrypt.hash(password, 10);
      params.push(hash);
      query += ' WHERE id = $5 RETURNING *';
      params.push(id);
    } else {
      query += ' WHERE id = $4 RETURNING *';
      params.push(id);
    }
    
    const result = await req.app.locals.pool.query(query, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    // Disparar webhook para atualização de usuário
    try {
      const updatedUser = result.rows[0];
      await sendWebhook('user.updated', {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        updated_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook user.updated:', webhookError);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/admin/users/:id] Erro ao editar usuário:', err);
    res.status(500).json({ error: 'Erro ao editar usuário.' });
  }
});

// Criar usuário
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    
    // Verificar se email já existe
    const existingUser = await req.app.locals.pool.query(
      'SELECT id FROM profiles WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado.' });
    }
    
    // Validar role
    const validRoles = ['admin', 'instructor', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role inválido. Use: admin, instructor ou student.' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    
    const result = await req.app.locals.pool.query(
      'INSERT INTO profiles (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, created_at',
      [id, name, email, hash, role]
    );
    
    // Disparar webhook para criação de usuário
    try {
      await sendWebhook('user.created', {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        role: result.rows[0].role,
        created_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook user.created:', webhookError);
    }
    
    console.log('[POST /api/admin/users] Usuário criado com sucesso:', result.rows[0].email);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /api/admin/users] Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

// Deletar usuário
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se não está tentando deletar a si mesmo
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Não é possível deletar sua própria conta.' });
    }
    
    const result = await req.app.locals.pool.query(
      'DELETE FROM profiles WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    // Disparar webhook para exclusão de usuário
    try {
      const deletedUser = result.rows[0];
      await sendWebhook('user.deleted', {
        id: deletedUser.id,
        name: deletedUser.name,
        email: deletedUser.email,
        role: deletedUser.role,
        deleted_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook user.deleted:', webhookError);
    }
    
    res.json({ message: 'Usuário deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/admin/users/:id] Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
});

// ===== DASHBOARD E ESTATÍSTICAS =====

// Estatísticas do dashboard
router.get('/dashboard-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [membersResult, coursesResult, postsResult, enrollmentsResult] = await Promise.all([
      req.app.locals.pool.query('SELECT COUNT(*) as count FROM profiles'),
      req.app.locals.pool.query('SELECT COUNT(*) as count FROM courses'),
      req.app.locals.pool.query('SELECT COUNT(*) as count FROM posts'),
      req.app.locals.pool.query('SELECT COUNT(*) as count FROM enrollments')
    ]);
    
    // Calcular média de avaliações
    const ratingsResult = await req.app.locals.pool.query(`
      SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings
      FROM course_ratings
    `);
    
    const averageRating = ratingsResult.rows[0].average_rating 
      ? parseFloat(ratingsResult.rows[0].average_rating).toFixed(1) 
      : 0;
    
    res.json({
      membersCount: parseInt(membersResult.rows[0].count),
      coursesCount: parseInt(coursesResult.rows[0].count),
      postsCount: parseInt(postsResult.rows[0].count),
      enrollmentsCount: parseInt(enrollmentsResult.rows[0].count),
      averageRating: parseFloat(averageRating),
      totalRatings: parseInt(ratingsResult.rows[0].total_ratings || 0)
    });
  } catch (err) {
    console.error('[GET /api/admin/dashboard-stats] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Listar instrutores
router.get('/instructors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(`
      SELECT id, name, email, role, created_at, avatar_url
      FROM profiles 
      WHERE role IN ('instructor', 'admin')
      ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/admin/instructors] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Tags populares
router.get('/popular-tags', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Buscar categorias mais populares baseadas nos posts existentes
    const { rows } = await req.app.locals.pool.query(`
      SELECT category, COUNT(*) as count
      FROM posts 
      WHERE category IS NOT NULL AND category <> ''
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 8
    `);
    
    const popularTags = rows.map(row => row.category);
    
    // Se não houver tags suficientes, adicionar algumas padrão
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
    console.error('[GET /api/admin/popular-tags] Erro:', err);
    // Fallback para tags fixas em caso de erro
    res.json(['javascript', 'react', 'nodejs', 'python', 'docker', 'aws']);
  }
});

// ===== MIGRAÇÕES E MANUTENÇÃO =====

// Verificar estrutura da tabela forum_posts
router.get('/check-forum-posts-structure', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'forum_posts' 
      ORDER BY ordinal_position
    `);

    res.json({ columns: result.rows });
  } catch (error) {
    console.error('[GET /api/admin/check-forum-posts-structure] Erro:', error);
    res.status(500).json({ error: 'Erro ao verificar estrutura da tabela.' });
  }
});

// Aplicar migration dos posts do fórum
router.post('/apply-forum-posts-migration', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('[MIGRATION] Aplicando migration dos posts do fórum...');
    
    const client = await req.app.locals.pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar se content_image_url existe
      const checkContentImageUrl = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' AND column_name = 'content_image_url'
      `);
      
      if (checkContentImageUrl.rows.length === 0) {
        console.log('[MIGRATION] Adicionando coluna content_image_url...');
        await client.query('ALTER TABLE forum_posts ADD COLUMN content_image_url TEXT');
      } else {
        console.log('[MIGRATION] Coluna content_image_url já existe');
      }
      
      // Verificar se cover_image_url existe
      const checkCoverImageUrl = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' AND column_name = 'cover_image_url'
      `);
      
      if (checkCoverImageUrl.rows.length > 0) {
        console.log('[MIGRATION] Migrando dados de cover_image_url para content_image_url...');
        await client.query(`
          UPDATE forum_posts 
          SET content_image_url = cover_image_url 
          WHERE cover_image_url IS NOT NULL AND content_image_url IS NULL
        `);
        
        console.log('[MIGRATION] Removendo coluna cover_image_url...');
        await client.query('ALTER TABLE forum_posts DROP COLUMN cover_image_url');
      } else {
        console.log('[MIGRATION] Coluna cover_image_url não existe');
      }
      
      await client.query('COMMIT');
      
      // Verificar estrutura final
      const finalStructure = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' 
        ORDER BY ordinal_position
      `);
      
      console.log('[MIGRATION] Migration aplicada com sucesso!');
      
      res.json({ 
        success: true, 
        message: 'Migration aplicada com sucesso!',
        finalStructure: finalStructure.rows
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('[MIGRATION] Erro ao aplicar migration:', error);
    res.status(500).json({ error: 'Erro ao aplicar migration: ' + error.message });
  }
});

// ===== DADOS DE TESTE E DEBUG =====

// Endpoint para listar todos os cursos (debug)
router.get('/courses-debug', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(`
      SELECT id, title, instructor_id, created_at
      FROM courses 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/admin/courses-debug] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint de teste para verificar dados
router.get('/test-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('[GET /api/admin/test-data] Verificando dados no banco...');
    
    // Verificar usuários
    const usersResult = await req.app.locals.pool.query('SELECT id, name, email FROM profiles LIMIT 5');
    console.log('[GET /api/admin/test-data] Usuários encontrados:', usersResult.rows);
    
    // Verificar posts
    const postsResult = await req.app.locals.pool.query('SELECT id, title, author_id FROM posts LIMIT 5');
    console.log('[GET /api/admin/test-data] Posts encontrados:', postsResult.rows);
    
    // Verificar cursos
    const coursesResult = await req.app.locals.pool.query('SELECT id, title, instructor_id FROM courses LIMIT 5');
    console.log('[GET /api/admin/test-data] Cursos encontrados:', coursesResult.rows);
    
    // Verificar matrículas
    const enrollmentsResult = await req.app.locals.pool.query('SELECT id, user_id, course_id FROM enrollments LIMIT 5');
    console.log('[GET /api/admin/test-data] Matrículas encontradas:', enrollmentsResult.rows);
    
    res.json({
      users: usersResult.rows,
      posts: postsResult.rows,
      courses: coursesResult.rows,
      enrollments: enrollmentsResult.rows
    });
  } catch (err) {
    console.error('[GET /api/admin/test-data] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar dados de teste
router.post('/test-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('[POST /api/admin/test-data] Criando dados de teste...');
    
    // Verificar se já existem posts
    const postsCheck = await req.app.locals.pool.query('SELECT COUNT(*) as count FROM posts');
    if (parseInt(postsCheck.rows[0].count) === 0) {
      console.log('[POST /api/admin/test-data] Criando posts de teste...');
      
      // Criar alguns posts de teste
      const post1Id = crypto.randomUUID();
      const post2Id = crypto.randomUUID();
      
      await req.app.locals.pool.query(
        'INSERT INTO posts (id, title, content, author_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [post1Id, 'Meu primeiro post', 'Este é o conteúdo do meu primeiro post na comunidade!', req.user.id, 'geral', new Date()]
      );
      
      await req.app.locals.pool.query(
        'INSERT INTO posts (id, title, content, author_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [post2Id, 'Dúvida sobre React', 'Alguém pode me ajudar com hooks no React?', req.user.id, 'programação', new Date()]
      );
      
      console.log('[POST /api/admin/test-data] Posts criados com sucesso');
    }
    
    // Verificar se já existem cursos
    const coursesCheck = await req.app.locals.pool.query('SELECT COUNT(*) as count FROM courses');
    if (parseInt(coursesCheck.rows[0].count) === 0) {
      console.log('[POST /api/admin/test-data] Criando cursos de teste...');
      
      // Criar um curso de teste
      const courseId = crypto.randomUUID();
      await req.app.locals.pool.query(
        'INSERT INTO courses (id, title, description, level, price, instructor_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [courseId, 'Curso de React Básico', 'Aprenda os fundamentos do React', 'Iniciante', 99.99, req.user.id, new Date()]
      );
      
      console.log('[POST /api/admin/test-data] Curso criado com sucesso');
    }
    
    // Verificar se já existem matrículas
    const enrollmentsCheck = await req.app.locals.pool.query('SELECT COUNT(*) as count FROM enrollments');
    if (parseInt(enrollmentsCheck.rows[0].count) === 0) {
      console.log('[POST /api/admin/test-data] Criando matrículas de teste...');
      
      // Buscar um curso para matricular
      const courseResult = await req.app.locals.pool.query('SELECT id FROM courses LIMIT 1');
      if (courseResult.rows.length > 0) {
        const enrollmentId = crypto.randomUUID();
        await req.app.locals.pool.query(
          'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
          [enrollmentId, req.user.id, courseResult.rows[0].id, new Date(), 25]
        );
        
        console.log('[POST /api/admin/test-data] Matrícula criada com sucesso');
      }
    }
    
    res.json({ message: 'Dados de teste criados com sucesso!' });
  } catch (err) {
    console.error('[POST /api/admin/test-data] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router; 