import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const { Pool } = pkg;
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Postgres
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Token ausente.' });
  
  try {
    const [, token] = auth.split(' ');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido.' });
  }
};

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

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
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

// Endpoint para atualizar perfil
app.put('/api/profile', authenticateToken, async (req, res) => {
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

// Endpoint de cadastro de usuário
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha obrigatórios.' });
  try {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (rows.length > 0) return res.status(409).json({ error: 'Email já cadastrado.' });
    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await pool.query('INSERT INTO profiles (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)', [id, name, email, hash, 'student']);
    res.status(201).json({ message: 'Usuário criado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para listar posts
app.get('/api/posts', authenticateToken, async (req, res) => {
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

// Endpoint para criar novo post
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { title, content, category, cover_image, video_url } = req.body;
    console.log('[POST /api/posts] Dados recebidos:', req.body);
    console.log('[POST /api/posts] Usuário autenticado:', req.user);

    if (!title || !content) {
      console.log('[POST /api/posts] Falha: título ou conteúdo ausente');
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    }
    const id = crypto.randomUUID();
    const created_at = new Date();
    await pool.query(
      'INSERT INTO posts (id, title, content, author_id, category, cover_image, video_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, title, content, req.user.id, category, cover_image, video_url, created_at]
    );
    console.log('[POST /api/posts] Post criado com sucesso:', { id, title, content, category, cover_image, video_url, author_id: req.user.id, created_at });
    res.status(201).json({ id, title, content, category, cover_image, video_url, author_id: req.user.id, created_at });
  } catch (err) {
    console.error('[POST /api/posts] Erro ao criar post:', err);
    res.status(500).json({ error: 'Erro ao criar post.' });
  }
});

// Endpoint para courses
app.get('/api/courses', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const { rows } = await pool.query(`
      SELECT c.*, pr.name as instructor_name,
             CASE WHEN array_length(c.tags, 1) > 0 THEN c.tags[1] ELSE NULL END as category,
             c.thumbnail_url as thumbnail
      FROM courses c 
      LEFT JOIN profiles pr ON c.instructor_id = pr.id 
      ORDER BY c.created_at DESC 
      LIMIT $1
    `, [parseInt(limit)]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para detalhes de um curso específico
app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT c.*, pr.name as instructor_name,
             CASE WHEN array_length(c.tags, 1) > 0 THEN c.tags[1] ELSE NULL END as category,
             c.thumbnail_url as thumbnail
      FROM courses c 
      LEFT JOIN profiles pr ON c.instructor_id = pr.id 
      WHERE c.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para dados administrativos do curso
app.get('/api/courses/:id/admin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[GET /api/courses/${id}/admin] Requisição recebida`);
    console.log(`[GET /api/courses/${id}/admin] Usuário:`, req.user);
    
    // Verificar se o usuário é admin ou instructor
    if (!['admin', 'instructor'].includes(req.user.role)) {
      console.log(`[GET /api/courses/${id}/admin] Acesso negado para role:`, req.user.role);
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    
    // Buscar dados básicos do curso
    const courseResult = await pool.query(`
      SELECT c.*, pr.name as instructor_name,
             (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students,
             CASE WHEN array_length(c.tags, 1) > 0 THEN c.tags[1] ELSE NULL END as category,
             c.thumbnail_url as thumbnail
      FROM courses c 
      LEFT JOIN profiles pr ON c.instructor_id = pr.id 
      WHERE c.id = $1
    `, [id]);
    
    console.log(`[GET /api/courses/${id}/admin] Resultado da busca do curso:`, courseResult.rows.length);
    
    if (courseResult.rows.length === 0) {
      console.log(`[GET /api/courses/${id}/admin] Curso não encontrado`);
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    const course = courseResult.rows[0];
    console.log(`[GET /api/courses/${id}/admin] Curso encontrado:`, course.title);
    
    // Buscar módulos e aulas
    const modulesResult = await pool.query(`
      SELECT m.id, m.title, m.module_order, m.is_visible,
             l.id as lesson_id, l.title as lesson_title, l.description as lesson_description,
             l.youtube_id, l.duration, l.lesson_order, l.is_visible as lesson_is_visible, l.release_days
      FROM modules m
      LEFT JOIN lessons l ON l.module_id = m.id
      WHERE m.course_id = $1
      ORDER BY m.module_order, l.lesson_order
    `, [id]);
    
    console.log(`[GET /api/courses/${id}/admin] Módulos encontrados:`, modulesResult.rows.length);
    
    // Estruturar os dados
    const modules = [];
    let currentModule = null;
    
    modulesResult.rows.forEach(row => {
      if (!currentModule || currentModule.id !== row.id) {
        currentModule = {
          id: row.id,
          title: row.title,
          module_order: row.module_order,
          is_visible: row.is_visible,
          lessons: []
        };
        modules.push(currentModule);
      }
      
      if (row.lesson_id) {
        currentModule.lessons.push({
          id: row.lesson_id,
          title: row.lesson_title,
          description: row.lesson_description,
          youtube_id: row.youtube_id,
          duration: row.duration,
          lesson_order: row.lesson_order,
          is_visible: row.lesson_is_visible,
          release_days: row.release_days
        });
      }
    });
    
    const response = {
      ...course,
      modules
    };
    
    console.log(`[GET /api/courses/${id}/admin] Resposta enviada com ${modules.length} módulos`);
    res.json(response);
  } catch (err) {
    console.error(`[GET /api/courses/${id}/admin] Erro:`, err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para salvar dados administrativos do curso (incluindo módulos e aulas)
app.put('/api/courses/:id/admin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, instructor_id, modules } = req.body;
    
    // Verificar se o usuário é admin ou instructor
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    // Iniciar transação
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Atualizar dados básicos do curso
      await client.query(
        'UPDATE courses SET title = $1, description = $2, instructor_id = $3 WHERE id = $4',
        [title, description, instructor_id, id]
      );
      
      // Deletar módulos e aulas existentes (cascade vai deletar as aulas automaticamente)
      await client.query('DELETE FROM modules WHERE course_id = $1', [id]);
      
      // Inserir novos módulos e aulas
      if (modules && modules.length > 0) {
        for (let i = 0; i < modules.length; i++) {
          const module = modules[i];
          const moduleId = crypto.randomUUID();
          
          // Inserir módulo
          await client.query(
            'INSERT INTO modules (id, course_id, title, module_order, is_visible) VALUES ($1, $2, $3, $4, $5)',
            [moduleId, id, module.title, i + 1, module.is_visible]
          );
          
          // Inserir aulas do módulo
          if (module.lessons && module.lessons.length > 0) {
            for (let j = 0; j < module.lessons.length; j++) {
              const lesson = module.lessons[j];
              const lessonId = crypto.randomUUID();
              
              await client.query(
                'INSERT INTO lessons (id, module_id, title, description, youtube_id, duration, lesson_order, is_visible, release_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [lessonId, moduleId, lesson.title, lesson.description || null, lesson.youtube_id || null, lesson.duration, j + 1, lesson.is_visible, lesson.release_days]
              );
            }
          }
        }
      }
      
      await client.query('COMMIT');
      
      // Retornar dados atualizados
      const updatedCourse = await pool.query(`
        SELECT c.*, pr.name as instructor_name,
               CASE WHEN array_length(c.tags, 1) > 0 THEN c.tags[1] ELSE NULL END as category,
               c.thumbnail_url as thumbnail
        FROM courses c 
        LEFT JOIN profiles pr ON c.instructor_id = pr.id 
        WHERE c.id = $1
      `, [id]);
      
      res.json(updatedCourse.rows[0]);
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('[PUT /api/courses/:id/admin] Erro ao salvar curso:', err);
    res.status(500).json({ error: 'Erro ao salvar curso.' });
  }
});

// Endpoint para dados do player de vídeo
app.get('/api/courses/:id/player', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o usuário está matriculado no curso
    const enrollmentCheck = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, id]
    );
    
    if (enrollmentCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Você precisa estar matriculado neste curso.' });
    }
    
    const { rows } = await pool.query(`
      SELECT c.*, pr.name as instructor_name,
             m.id as module_id, m.title as module_title, m.module_order, m.is_visible as module_is_visible,
             l.id as lesson_id, l.title as lesson_title, l.youtube_id, l.duration, l.lesson_order, 
             l.is_visible as lesson_is_visible, l.release_days
      FROM courses c 
      LEFT JOIN profiles pr ON c.instructor_id = pr.id 
      LEFT JOIN modules m ON m.course_id = c.id
      LEFT JOIN lessons l ON l.module_id = m.id
      WHERE c.id = $1
      ORDER BY m.module_order, l.lesson_order
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    // Estruturar os dados
    const course = {
      id: rows[0].id,
      title: rows[0].title,
      description: rows[0].description,
      instructor_name: rows[0].instructor_name,
      modules: []
    };
    
    let currentModule = null;
    rows.forEach(row => {
      // Só incluir módulos visíveis
      if (row.module_id && row.module_is_visible && (!currentModule || currentModule.id !== row.module_id)) {
        currentModule = {
          id: row.module_id,
          title: row.module_title,
          module_order: row.module_order,
          is_visible: row.module_is_visible,
          lessons: []
        };
        course.modules.push(currentModule);
      }
      
      // Só incluir aulas visíveis
      if (row.lesson_id && row.lesson_is_visible && currentModule) {
        // Verificar se a aula deve ser liberada baseado na data de matrícula
        let shouldShowLesson = true;
        
        if (row.release_days > 0 && enrollmentCheck.rows.length > 0) {
          const enrollmentDate = new Date(enrollmentCheck.rows[0].enrolled_at);
          const releaseDate = new Date(enrollmentDate.getTime() + (row.release_days * 24 * 60 * 60 * 1000));
          const now = new Date();
          
          shouldShowLesson = now >= releaseDate;
        }
        
        if (shouldShowLesson) {
          currentModule.lessons.push({
            id: row.lesson_id,
            title: row.lesson_title,
            youtube_id: row.youtube_id,
            duration: row.duration,
            lesson_order: row.lesson_order,
            is_visible: row.lesson_is_visible,
            release_days: row.release_days
          });
        }
      }
    });
    
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para buscar matrículas do usuário
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { user_id, course_id } = req.query;
    
    if (!user_id && !course_id) {
      return res.status(400).json({ error: 'user_id ou course_id é obrigatório.' });
    }
    
    let query = `
      SELECT e.*, 
             c.title as course_title,
             c.description as course_description,
             c.thumbnail_url as course_thumbnail,
             p.name as instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN profiles p ON c.instructor_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (user_id) {
      query += ` AND e.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }
    
    if (course_id) {
      query += ` AND e.course_id = $${paramIndex}`;
      params.push(course_id);
      paramIndex++;
    }
    
    query += ` ORDER BY e.enrolled_at DESC`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/enrollments] Erro ao buscar matrículas:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { role, limit = 10 } = req.query;
    let query = 'SELECT id, name, email, role, created_at FROM profiles';
    const params = [];
    
    if (role) {
      params.push(role);
      query += ` WHERE role = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para instructors
app.get('/api/instructors', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM profiles 
      WHERE role IN ('instructor', 'admin')
      ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para dashboard stats
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
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para popular tags
app.get('/api/popular-tags', authenticateToken, async (req, res) => {
  try {
    // Por enquanto, retornar tags fixas
    res.json(['javascript', 'react', 'nodejs', 'python', 'docker', 'aws']);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Servir arquivos estáticos do React
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para criar novo curso
app.post('/api/courses', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, level, price, thumbnail, isPaid } = req.body;
    if (!title || !description || !level) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
    }

    // Validação do preço baseada no tipo de curso
    let finalPrice = 0;
    if (isPaid) {
      if (!price || parseFloat(price) <= 0) {
        return res.status(400).json({ error: 'Para cursos pagos, o preço deve ser maior que zero.' });
      }
      finalPrice = parseFloat(price);
    }

    const id = crypto.randomUUID();
    const created_at = new Date();
    const thumbnailUrl = thumbnail && thumbnail.trim() !== '' ? thumbnail : null;
    
    await pool.query(
      'INSERT INTO courses (id, title, description, level, price, thumbnail_url, tags, instructor_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, title, description, level, finalPrice, thumbnailUrl, category ? [category] : [], req.user.id, created_at]
    );
    res.status(201).json({ 
      id, 
      title, 
      description, 
      level, 
      price: finalPrice, 
      thumbnail_url: thumbnailUrl, 
      tags: category ? [category] : [], 
      instructor_id: req.user.id, 
      created_at 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar curso.' });
  }
});

// Listar categorias distintas dos posts
app.get('/api/posts/categories', authenticateToken, async (req, res) => {
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
app.get('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/posts/:id] Buscando post:', id);
    console.log('[GET /api/posts/:id] Usuário autenticado:', req.user);
    
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
    
    console.log('[GET /api/posts/:id] Resultado da query:', rows);
    
    if (rows.length === 0) {
      console.log('[GET /api/posts/:id] Post não encontrado:', id);
      return res.status(404).json({ error: 'Post não encontrado.' });
    }
    
    const post = rows[0];
    console.log('[GET /api/posts/:id] Post encontrado:', {
      id: post.id,
      title: post.title,
      author_name: post.author_name,
      created_at: post.created_at
    });
    
    res.json(post);
  } catch (err) {
    console.error('[GET /api/posts/:id] Erro ao buscar post:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Editar post
app.put('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, cover_image, video_url } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    }
    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, category = $3, cover_image = $4, video_url = $5 WHERE id = $6 AND author_id = $7 RETURNING *',
      [title, content, category, cover_image, video_url, id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post não encontrado ou sem permissão.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/posts/:id] Erro ao editar post:', err);
    res.status(500).json({ error: 'Erro ao editar post.' });
  }
});

// Deletar post
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND author_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post não encontrado ou sem permissão.' });
    }
    res.json({ message: 'Post deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/posts/:id] Erro ao deletar post:', err);
    res.status(500).json({ error: 'Erro ao deletar post.' });
  }
});

// Editar curso
app.put('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, level, price, thumbnail, isPaid } = req.body;
    if (!title || !description || !level) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
    }

    // Validação do preço baseada no tipo de curso
    let finalPrice = 0;
    if (isPaid) {
      if (!price || parseFloat(price) <= 0) {
        return res.status(400).json({ error: 'Para cursos pagos, o preço deve ser maior que zero.' });
      }
      finalPrice = parseFloat(price);
    }

    const thumbnailUrl = thumbnail && thumbnail.trim() !== '' ? thumbnail : null;

    const result = await pool.query(
      'UPDATE courses SET title = $1, description = $2, level = $3, price = $4, thumbnail_url = $5, tags = $6, instructor_id = $7 WHERE id = $8 RETURNING *',
      [title, description, level, finalPrice, thumbnailUrl, category ? [category] : [], req.user.id, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Curso não encontrado ou sem permissão.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/courses/:id] Erro ao editar curso:', err);
    res.status(500).json({ error: 'Erro ao editar curso.' });
  }
});

// Deletar curso
app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM courses WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Curso não encontrado ou sem permissão.' });
    }
    res.json({ message: 'Curso deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/courses/:id] Erro ao deletar curso:', err);
    res.status(500).json({ error: 'Erro ao deletar curso.' });
  }
});

// Editar usuário
app.put('/api/users/:id', authenticateToken, async (req, res) => {
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
    const result = await pool.query(query, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado ou sem permissão.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/users/:id] Erro ao editar usuário:', err);
    res.status(500).json({ error: 'Erro ao editar usuário.' });
  }
});

// Deletar usuário
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM profiles WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado ou sem permissão.' });
    }
    res.json({ message: 'Usuário deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/users/:id] Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
});

// Endpoint para listar todos os cursos (debug)
app.get('/api/courses-debug', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, title, instructor_id, created_at
      FROM courses 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint de teste para verificar dados
app.get('/api/test-data', authenticateToken, async (req, res) => {
  try {
    console.log('[GET /api/test-data] Verificando dados no banco...');
    
    // Verificar usuários
    const usersResult = await pool.query('SELECT id, name, email FROM profiles LIMIT 5');
    console.log('[GET /api/test-data] Usuários encontrados:', usersResult.rows);
    
    // Verificar posts
    const postsResult = await pool.query('SELECT id, title, author_id FROM posts LIMIT 5');
    console.log('[GET /api/test-data] Posts encontrados:', postsResult.rows);
    
    // Verificar cursos
    const coursesResult = await pool.query('SELECT id, title, instructor_id FROM courses LIMIT 5');
    console.log('[GET /api/test-data] Cursos encontrados:', coursesResult.rows);
    
    // Verificar matrículas
    const enrollmentsResult = await pool.query('SELECT id, user_id, course_id FROM enrollments LIMIT 5');
    console.log('[GET /api/test-data] Matrículas encontradas:', enrollmentsResult.rows);
    
    res.json({
      users: usersResult.rows,
      posts: postsResult.rows,
      courses: coursesResult.rows,
      enrollments: enrollmentsResult.rows
    });
  } catch (err) {
    console.error('[GET /api/test-data] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar dados de teste
app.post('/api/test-data', authenticateToken, async (req, res) => {
  try {
    console.log('[POST /api/test-data] Criando dados de teste...');
    
    // Verificar se já existem posts
    const postsCheck = await pool.query('SELECT COUNT(*) as count FROM posts');
    if (parseInt(postsCheck.rows[0].count) === 0) {
      console.log('[POST /api/test-data] Criando posts de teste...');
      
      // Criar alguns posts de teste
      const post1Id = crypto.randomUUID();
      const post2Id = crypto.randomUUID();
      
      await pool.query(
        'INSERT INTO posts (id, title, content, author_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [post1Id, 'Meu primeiro post', 'Este é o conteúdo do meu primeiro post na comunidade!', req.user.id, 'geral', new Date()]
      );
      
      await pool.query(
        'INSERT INTO posts (id, title, content, author_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [post2Id, 'Dúvida sobre React', 'Alguém pode me ajudar com hooks no React?', req.user.id, 'programação', new Date()]
      );
      
      console.log('[POST /api/test-data] Posts criados com sucesso');
    }
    
    // Verificar se já existem cursos
    const coursesCheck = await pool.query('SELECT COUNT(*) as count FROM courses');
    if (parseInt(coursesCheck.rows[0].count) === 0) {
      console.log('[POST /api/test-data] Criando cursos de teste...');
      
      // Criar um curso de teste
      const courseId = crypto.randomUUID();
      await pool.query(
        'INSERT INTO courses (id, title, description, level, price, instructor_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [courseId, 'Curso de React Básico', 'Aprenda os fundamentos do React', 'Iniciante', 99.99, req.user.id, new Date()]
      );
      
      console.log('[POST /api/test-data] Curso criado com sucesso');
    }
    
    // Verificar se já existem matrículas
    const enrollmentsCheck = await pool.query('SELECT COUNT(*) as count FROM enrollments');
    if (parseInt(enrollmentsCheck.rows[0].count) === 0) {
      console.log('[POST /api/test-data] Criando matrículas de teste...');
      
      // Buscar um curso para matricular
      const courseResult = await pool.query('SELECT id FROM courses LIMIT 1');
      if (courseResult.rows.length > 0) {
        const enrollmentId = crypto.randomUUID();
        await pool.query(
          'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
          [enrollmentId, req.user.id, courseResult.rows[0].id, new Date(), 25]
        );
        
        console.log('[POST /api/test-data] Matrícula criada com sucesso');
      }
    }
    
    res.json({ message: 'Dados de teste criados com sucesso!' });
  } catch (err) {
    console.error('[POST /api/test-data] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint simples para verificar posts
app.get('/api/posts-check', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM posts');
    const postsCount = parseInt(rows[0].count);
    
    if (postsCount === 0) {
      // Criar um post de teste
      const postId = crypto.randomUUID();
      await pool.query(
        'INSERT INTO posts (id, title, content, author_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [postId, 'Post de Teste', 'Este é um post de teste criado automaticamente.', req.user.id, 'teste', new Date()]
      );
      res.json({ message: 'Post de teste criado', count: 1 });
    } else {
      res.json({ message: 'Posts encontrados', count: postsCount });
    }
  } catch (err) {
    console.error('[GET /api/posts-check] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Curtir post
app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user.id;
    // Tenta inserir, ignora se já existe
    await pool.query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/posts/:id/like] Erro:', err);
    res.status(500).json({ error: 'Erro ao curtir post.' });
  }
});

// Descurtir post
app.delete('/api/posts/:id/like', authenticateToken, async (req, res) => {
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
app.get('/api/posts/:id/likes', authenticateToken, async (req, res) => {
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
app.get('/api/posts/:id/comments', authenticateToken, async (req, res) => {
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
app.post('/api/posts/:id/comments', authenticateToken, async (req, res) => {
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
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /api/posts/:id/comments] Erro:', err);
    res.status(500).json({ error: 'Erro ao adicionar comentário.' });
  }
});

// Editar comentário
app.put('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comentário não pode ser vazio.' });
    }
    const result = await pool.query(
      'UPDATE comments SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [content.trim(), id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado ou sem permissão.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/comments/:id] Erro:', err);
    res.status(500).json({ error: 'Erro ao editar comentário.' });
  }
});

// Deletar comentário
app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado ou sem permissão.' });
    }
    res.json({ message: 'Comentário deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/comments/:id] Erro:', err);
    res.status(500).json({ error: 'Erro ao deletar comentário.' });
  }
});

// Favoritar post
app.post('/api/posts/:id/favorite', authenticateToken, async (req, res) => {
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

// Remover dos favoritos
app.delete('/api/posts/:id/favorite', authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: 'Erro ao remover dos favoritos.' });
  }
});

// Verificar se o usuário favoritou
app.get('/api/posts/:id/favorite', authenticateToken, async (req, res) => {
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

// ===== SISTEMA DE TURMAS =====

// Listar turmas do usuário
app.get('/api/classes', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id || req.user.id;
    
    const { rows } = await pool.query(`
      SELECT 
        c.*,
        p.name as instructor_name,
        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND status = 'active') as current_students
      FROM classes c
      JOIN profiles p ON c.instructor_id = p.id
      WHERE c.is_active = true
      AND (
        c.is_public = true 
        OR c.id IN (SELECT class_id FROM class_enrollments WHERE user_id = $1 AND status = 'active')
        OR c.instructor_id = $1
      )
      ORDER BY c.created_at DESC
    `, [userId]);
    
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/classes] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Criar nova turma
app.post('/api/classes', authenticateToken, async (req, res) => {
  try {
    console.log('[POST /api/classes] Requisição recebida');
    console.log('[POST /api/classes] Usuário autenticado:', req.user);
    console.log('[POST /api/classes] Dados recebidos:', req.body);
    
    const { name, description, is_public, max_students } = req.body;
    
    if (!name) {
      console.log('[POST /api/classes] Erro: nome da turma não fornecido');
      return res.status(400).json({ error: 'Nome da turma é obrigatório.' });
    }
    
    // Verificar se o usuário é instructor ou admin
    if (!['instructor', 'admin'].includes(req.user.role)) {
      console.log('[POST /api/classes] Erro: usuário não tem permissão, role:', req.user.role);
      return res.status(403).json({ error: 'Apenas instrutores podem criar turmas.' });
    }
    
    const id = crypto.randomUUID();
    console.log('[POST /api/classes] Criando turma com ID:', id);
    
    const { rows } = await pool.query(`
      INSERT INTO classes (id, name, description, instructor_id, is_public, max_students)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, name, description, req.user.id, is_public || false, max_students]);
    
    console.log('[POST /api/classes] Turma criada com sucesso:', rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /api/classes] Erro:', err);
    res.status(500).json({ error: 'Erro ao criar turma.' });
  }
});

// Detalhes de uma turma específica
app.get('/api/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id] Buscando turma:', id);
    console.log('[GET /api/classes/:id] Usuário:', req.user);
    
    // Primeiro, buscar a turma
    const classResult = await pool.query(`
      SELECT 
        c.*,
        p.name as instructor_name,
        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND status = 'active') as current_students
      FROM classes c
      JOIN profiles p ON c.instructor_id = p.id
      WHERE c.id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      console.log('[GET /api/classes/:id] Turma não encontrada');
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    const classData = classResult.rows[0];
    console.log('[GET /api/classes/:id] Turma encontrada:', classData.name);
    
    // Verificar se o usuário tem acesso à turma
    // 1. Se é o instructor da turma
    if (classData.instructor_id === req.user.id) {
      console.log('[GET /api/classes/:id] Usuário é o instructor da turma');
      return res.json(classData);
    }
    
    // 2. Se a turma é pública
    if (classData.is_public) {
      console.log('[GET /api/classes/:id] Turma é pública, acesso permitido');
      return res.json(classData);
    }
    
    // 3. Se o usuário está matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_enrollments 
      WHERE class_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id] Usuário está matriculado na turma');
      return res.json(classData);
    }
    
    console.log('[GET /api/classes/:id] Acesso negado - usuário não tem permissão');
    return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    
  } catch (err) {
    console.error('[GET /api/classes/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Matricular usuário em turma
app.post('/api/classes/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role = 'student' } = req.body;
    
    // Verificar se o usuário atual é instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM classes WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode matricular usuários.' });
    }
    
    // Verificar limite de alunos
    const enrollmentCount = await pool.query(`
      SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = $1 AND status = 'active'
    `, [id]);
    
    const classInfo = await pool.query(`
      SELECT max_students FROM classes WHERE id = $1
    `, [id]);
    
    if (classInfo.rows[0].max_students && 
        parseInt(enrollmentCount.rows[0].count) >= classInfo.rows[0].max_students) {
      return res.status(400).json({ error: 'Turma está lotada.' });
    }
    
    const enrollmentId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO class_enrollments (id, class_id, user_id, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (class_id, user_id) 
      DO UPDATE SET status = 'active', role = $4
    `, [enrollmentId, id, user_id, role]);
    
    res.status(201).json({ message: 'Usuário matriculado com sucesso.' });
  } catch (err) {
    console.error('[POST /api/classes/:id/enroll] Erro:', err);
    res.status(500).json({ error: 'Erro ao matricular usuário.' });
  }
});

// Listar matrículas de uma turma
app.get('/api/classes/:id/enrollments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id/enrollments] Buscando matrículas da turma:', id);
    console.log('[GET /api/classes/:id/enrollments] Usuário:', req.user);
    
    // Primeiro, buscar a turma para verificar se o usuário é o instructor
    const classResult = await pool.query(`
      SELECT instructor_id, is_public FROM classes WHERE id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      console.log('[GET /api/classes/:id/enrollments] Turma não encontrada');
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    const classData = classResult.rows[0];
    
    // Verificar se o usuário tem acesso às matrículas
    // 1. Se é o instructor da turma
    if (classData.instructor_id === req.user.id) {
      console.log('[GET /api/classes/:id/enrollments] Usuário é o instructor da turma');
      const { rows } = await pool.query(`
        SELECT 
          ce.*,
          p.name as user_name,
          p.email as user_email
        FROM class_enrollments ce
        JOIN profiles p ON ce.user_id = p.id
        WHERE ce.class_id = $1
        ORDER BY ce.enrolled_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 2. Se a turma é pública, permitir visualizar matrículas
    if (classData.is_public) {
      console.log('[GET /api/classes/:id/enrollments] Turma é pública, acesso permitido');
      const { rows } = await pool.query(`
        SELECT 
          ce.*,
          p.name as user_name,
          p.email as user_email
        FROM class_enrollments ce
        JOIN profiles p ON ce.user_id = p.id
        WHERE ce.class_id = $1 AND ce.status = 'active'
        ORDER BY ce.enrolled_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 3. Se o usuário está matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_enrollments 
      WHERE class_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/enrollments] Usuário está matriculado na turma');
      const { rows } = await pool.query(`
        SELECT 
          ce.*,
          p.name as user_name,
          p.email as user_email
        FROM class_enrollments ce
        JOIN profiles p ON ce.user_id = p.id
        WHERE ce.class_id = $1 AND ce.status = 'active'
        ORDER BY ce.enrolled_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    console.log('[GET /api/classes/:id/enrollments] Acesso negado - usuário não tem permissão');
    return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    
  } catch (err) {
    console.error('[GET /api/classes/:id/enrollments] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Adicionar curso à turma
app.post('/api/classes/:id/courses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { course_id, is_required = false, order_index = 0 } = req.body;
    
    // Verificar se o usuário é instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM classes WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode adicionar cursos.' });
    }
    
    const classCourseId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO class_courses (id, class_id, course_id, is_required, order_index)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (class_id, course_id) 
      DO UPDATE SET is_required = $4, order_index = $5
    `, [classCourseId, id, course_id, is_required, order_index]);
    
    res.status(201).json({ message: 'Curso adicionado à turma com sucesso.' });
  } catch (err) {
    console.error('[POST /api/classes/:id/courses] Erro:', err);
    res.status(500).json({ error: 'Erro ao adicionar curso à turma.' });
  }
});

// Listar cursos de uma turma
app.get('/api/classes/:id/courses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar acesso à turma
    const accessCheck = await pool.query(`
      SELECT * FROM user_class_access 
      WHERE class_id = $1 AND user_id = $2
    `, [id, req.user.id]);
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    }
    
    const { rows } = await pool.query(`
      SELECT 
        cc.*,
        c.title as course_title,
        c.description as course_description,
        c.thumbnail_url as course_thumbnail
      FROM class_courses cc
      JOIN courses c ON cc.course_id = c.id
      WHERE cc.class_id = $1
      ORDER BY cc.order_index, c.title
    `, [id]);
    
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/classes/:id/courses] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Criar conteúdo na turma
app.post('/api/classes/:id/content', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, content_type = 'announcement', is_pinned = false } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    }
    
    // Verificar se o usuário tem permissão para criar conteúdo
    const accessCheck = await pool.query(`
      SELECT user_role FROM user_class_access 
      WHERE class_id = $1 AND user_id = $2
    `, [id, req.user.id]);
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    }
    
    const userRole = accessCheck.rows[0].user_role;
    if (!['instructor', 'assistant'].includes(userRole)) {
      return res.status(403).json({ error: 'Apenas instrutores e assistentes podem criar conteúdo.' });
    }
    
    const contentId = crypto.randomUUID();
    const { rows } = await pool.query(`
      INSERT INTO class_content (id, class_id, author_id, title, content, content_type, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [contentId, id, req.user.id, title, content, content_type, is_pinned]);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /api/classes/:id/content] Erro:', err);
    res.status(500).json({ error: 'Erro ao criar conteúdo.' });
  }
});

// Listar conteúdo de uma turma
app.get('/api/classes/:id/content', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id/content] Buscando conteúdo da turma:', id);
    console.log('[GET /api/classes/:id/content] Usuário:', req.user);
    
    // Primeiro, buscar a turma para verificar se o usuário é o instructor
    const classResult = await pool.query(`
      SELECT instructor_id, is_public FROM classes WHERE id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      console.log('[GET /api/classes/:id/content] Turma não encontrada');
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    const classData = classResult.rows[0];
    
    // Verificar se o usuário tem acesso ao conteúdo
    // 1. Se é o instructor da turma
    if (classData.instructor_id === req.user.id) {
      console.log('[GET /api/classes/:id/content] Usuário é o instructor da turma');
      const { rows } = await pool.query(`
        SELECT * FROM class_content 
        WHERE class_id = $1 
        ORDER BY created_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 2. Se a turma é pública, permitir visualizar conteúdo
    if (classData.is_public) {
      console.log('[GET /api/classes/:id/content] Turma é pública, acesso permitido');
      const { rows } = await pool.query(`
        SELECT * FROM class_content 
        WHERE class_id = $1 AND is_public = true
        ORDER BY created_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 3. Se o usuário está matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_enrollments 
      WHERE class_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/content] Usuário está matriculado na turma');
      const { rows } = await pool.query(`
        SELECT * FROM class_content 
        WHERE class_id = $1 
        ORDER BY created_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    console.log('[GET /api/classes/:id/content] Acesso negado - usuário não tem permissão');
    return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    
  } catch (err) {
    console.error('[GET /api/classes/:id/content] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para busca na página explore
app.get('/api/explore/search', authenticateToken, async (req, res) => {
  try {
    const { q, type, category, level, price } = req.query;
    
    let results = {};
    
    // Buscar cursos
    if (!type || type === 'courses') {
      let courseQuery = `
        SELECT c.*, pr.name as instructor_name,
               CASE WHEN array_length(c.tags, 1) > 0 THEN c.tags[1] ELSE NULL END as category,
               c.thumbnail_url as thumbnail
        FROM courses c 
        LEFT JOIN profiles pr ON c.instructor_id = pr.id 
        WHERE 1=1
      `;
      const courseParams = [];
      let paramIndex = 1;
      
      if (q) {
        courseQuery += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex} OR pr.name ILIKE $${paramIndex})`;
        courseParams.push(`%${q}%`);
        paramIndex++;
      }
      
      if (category) {
        courseQuery += ` AND c.tags @> $${paramIndex}`;
        courseParams.push(`{${category}}`);
        paramIndex++;
      }
      
      if (level) {
        courseQuery += ` AND c.level = $${paramIndex}`;
        courseParams.push(level);
        paramIndex++;
      }
      
      if (price === 'free') {
        courseQuery += ` AND c.price = 0`;
      } else if (price === 'paid') {
        courseQuery += ` AND c.price > 0`;
      }
      
      courseQuery += ` ORDER BY c.created_at DESC LIMIT 10`;
      
      const courseResult = await pool.query(courseQuery, courseParams);
      results.courses = courseResult.rows;
    }
    
    // Buscar posts
    if (!type || type === 'posts') {
      let postQuery = `
        SELECT p.*, u.name as author_name, u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes_count,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
               (SELECT COUNT(*) FROM post_favorites pf WHERE pf.post_id = p.id) as favorites_count
        FROM posts p 
        LEFT JOIN profiles u ON p.author_id = u.id 
        WHERE 1=1
      `;
      const postParams = [];
      let paramIndex = 1;
      
      if (q) {
        postQuery += ` AND (p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex} OR p.category ILIKE $${paramIndex})`;
        postParams.push(`%${q}%`);
        paramIndex++;
      }
      
      if (category) {
        postQuery += ` AND p.category = $${paramIndex}`;
        postParams.push(category);
        paramIndex++;
      }
      
      postQuery += ` ORDER BY p.created_at DESC LIMIT 10`;
      
      const postResult = await pool.query(postQuery, postParams);
      results.posts = postResult.rows;
    }
    
    // Buscar instrutores
    if (!type || type === 'instructors') {
      let instructorQuery = `
        SELECT id, name, email, avatar_url, bio, created_at
        FROM profiles 
        WHERE role IN ('instructor', 'admin')
      `;
      const instructorParams = [];
      let paramIndex = 1;
      
      if (q) {
        instructorQuery += ` AND (name ILIKE $${paramIndex} OR bio ILIKE $${paramIndex})`;
        instructorParams.push(`%${q}%`);
        paramIndex++;
      }
      
      instructorQuery += ` ORDER BY created_at DESC LIMIT 10`;
      
      const instructorResult = await pool.query(instructorQuery, instructorParams);
      results.instructors = instructorResult.rows;
    }
    
    res.json(results);
  } catch (err) {
    console.error('[GET /api/explore/search] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para categorias populares
app.get('/api/explore/categories', authenticateToken, async (req, res) => {
  try {
    // Buscar categorias de cursos
    const courseCategories = await pool.query(`
      SELECT DISTINCT unnest(tags) as category, COUNT(*) as count
      FROM courses 
      WHERE array_length(tags, 1) > 0
      GROUP BY unnest(tags)
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Buscar categorias de posts
    const postCategories = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM posts 
      WHERE category IS NOT NULL AND category <> ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);
    
    res.json({
      courseCategories: courseCategories.rows,
      postCategories: postCategories.rows
    });
  } catch (err) {
    console.error('[GET /api/explore/categories] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar matrícula
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { course_id, user_id } = req.body;
    
    if (!course_id || !user_id) {
      return res.status(400).json({ error: 'course_id e user_id são obrigatórios.' });
    }

    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id, price FROM courses WHERE id = $1', [course_id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }

    const course = courseCheck.rows[0];

    // Verificar se o usuário já está matriculado
    const existingEnrollment = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [user_id, course_id]
    );

    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já está matriculado neste curso.' });
    }

    // Para cursos pagos, verificar se o pagamento foi realizado
    // Por enquanto, vamos permitir matrícula direta (você pode implementar verificação de pagamento depois)
    if (course.price > 0) {
      // Aqui você pode adicionar verificação de pagamento
      // Por exemplo, verificar se existe um registro de pagamento aprovado
    }

    // Criar matrícula
    const enrollmentId = crypto.randomUUID();
    const enrolledAt = new Date();
    
    await pool.query(
      'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
      [enrollmentId, user_id, course_id, enrolledAt, 0]
    );

    // Atualizar contador de estudantes no curso
    await pool.query(
      'UPDATE courses SET students_count = students_count + 1 WHERE id = $1',
      [course_id]
    );

    res.status(201).json({ 
      id: enrollmentId,
      user_id,
      course_id,
      enrolled_at: enrolledAt,
      progress: 0
    });
  } catch (err) {
    console.error('[POST /api/enrollments] Erro ao criar matrícula:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});

// Rota catch-all para SPA (deve ser a última rota)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Atualizar turma
app.put('/api/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_public, max_students } = req.body;
    
    console.log('[PUT /api/classes/:id] Atualizando turma:', id);
    console.log('[PUT /api/classes/:id] Dados recebidos:', req.body);
    console.log('[PUT /api/classes/:id] Usuário:', req.user);
    
    // Verificar se a turma existe
    const classCheck = await pool.query(`
      SELECT instructor_id FROM classes WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      console.log('[PUT /api/classes/:id] Turma não encontrada');
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    // Verificar se o usuário é o instructor da turma ou admin
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      console.log('[PUT /api/classes/:id] Acesso negado - usuário não é instructor da turma');
      return res.status(403).json({ error: 'Apenas o instructor da turma pode editá-la.' });
    }
    
    // Validar dados obrigatórios
    if (!name || name.trim().length === 0) {
      console.log('[PUT /api/classes/:id] Erro: nome da turma não fornecido');
      return res.status(400).json({ error: 'Nome da turma é obrigatório.' });
    }
    
    // Atualizar turma
    const { rows } = await pool.query(`
      UPDATE classes 
      SET name = $1, description = $2, is_public = $3, max_students = $4, updated_at = now()
      WHERE id = $5
      RETURNING *
    `, [name.trim(), description?.trim() || null, is_public, max_students || null, id]);
    
    console.log('[PUT /api/classes/:id] Turma atualizada com sucesso:', rows[0].name);
    res.json(rows[0]);
    
  } catch (err) {
    console.error('[PUT /api/classes/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Excluir turma
app.delete('/api/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[DELETE /api/classes/:id] Excluindo turma:', id);
    console.log('[DELETE /api/classes/:id] Usuário:', req.user);
    
    // Verificar se a turma existe
    const classCheck = await pool.query(`
      SELECT instructor_id, name FROM classes WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      console.log('[DELETE /api/classes/:id] Turma não encontrada');
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    // Verificar se o usuário é o instructor da turma ou admin
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      console.log('[DELETE /api/classes/:id] Acesso negado - usuário não é instructor da turma');
      return res.status(403).json({ error: 'Apenas o instructor da turma pode excluí-la.' });
    }
    
    const className = classCheck.rows[0].name;
    
    // Excluir turma (as tabelas relacionadas serão excluídas automaticamente devido ao CASCADE)
    await pool.query(`
      DELETE FROM classes WHERE id = $1
    `, [id]);
    
    console.log('[DELETE /api/classes/:id] Turma excluída com sucesso:', className);
    res.json({ message: 'Turma excluída com sucesso.' });
    
  } catch (err) {
    console.error('[DELETE /api/classes/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});