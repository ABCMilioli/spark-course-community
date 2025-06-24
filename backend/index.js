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

// Endpoint de cadastro de usuário
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha obrigatórios.' });
  try {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (rows.length > 0) return res.status(409).json({ error: 'Email já cadastrado.' });
    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await pool.query('INSERT INTO profiles (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)', [id, name, email, hash, 'free']);
    res.status(201).json({ message: 'Usuário criado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para posts
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { author_id, sort, limit = 10 } = req.query;
    let query = `
      SELECT p.*, pr.name as author_name 
      FROM posts p 
      JOIN profiles pr ON p.author_id = pr.id 
    `;
    
    const params = [];
    if (author_id) {
      params.push(author_id);
      query += ` WHERE p.author_id = $${params.length}`;
    }
    
    if (sort === 'likes_count') {
      query += ` ORDER BY p.likes_count DESC`;
    } else {
      query += ` ORDER BY p.created_at DESC`;
    }
    
    query += ` LIMIT ${parseInt(limit)}`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar novo post
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    console.log('[POST /api/posts] Dados recebidos:', req.body);
    console.log('[POST /api/posts] Usuário autenticado:', req.user);

    if (!title || !content) {
      console.log('[POST /api/posts] Falha: título ou conteúdo ausente');
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    }
    const id = crypto.randomUUID();
    const created_at = new Date();
    await pool.query(
      'INSERT INTO posts (id, title, content, author_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, title, content, req.user.id, category, created_at]
    );
    console.log('[POST /api/posts] Post criado com sucesso:', { id, title, content, category, author_id: req.user.id, created_at });
    res.status(201).json({ id, title, content, category, author_id: req.user.id, created_at });
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
      SELECT c.*, pr.name as instructor_name 
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
      SELECT c.*, pr.name as instructor_name 
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
             (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students
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
      SELECT m.id, m.title, m.module_order,
             l.id as lesson_id, l.title as lesson_title, l.description as lesson_description,
             l.youtube_id, l.duration, l.lesson_order
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
          lesson_order: row.lesson_order
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
            'INSERT INTO modules (id, course_id, title, module_order) VALUES ($1, $2, $3, $4)',
            [moduleId, id, module.title, i + 1]
          );
          
          // Inserir aulas do módulo
          if (module.lessons && module.lessons.length > 0) {
            for (let j = 0; j < module.lessons.length; j++) {
              const lesson = module.lessons[j];
              const lessonId = crypto.randomUUID();
              
              await client.query(
                'INSERT INTO lessons (id, module_id, title, description, youtube_id, duration, lesson_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [lessonId, moduleId, lesson.title, lesson.description || null, lesson.youtube_id || null, lesson.duration, j + 1]
              );
            }
          }
        }
      }
      
      await client.query('COMMIT');
      
      // Retornar dados atualizados
      const updatedCourse = await pool.query(`
        SELECT c.*, pr.name as instructor_name
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
             m.id as module_id, m.title as module_title, m.module_order,
             l.id as lesson_id, l.title as lesson_title, l.youtube_id, l.duration, l.lesson_order
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
      if (row.module_id && (!currentModule || currentModule.id !== row.module_id)) {
        currentModule = {
          id: row.module_id,
          title: row.module_title,
          module_order: row.module_order,
          lessons: []
        };
        course.modules.push(currentModule);
      }
      
      if (row.lesson_id && currentModule) {
        currentModule.lessons.push({
          id: row.lesson_id,
          title: row.lesson_title,
          youtube_id: row.youtube_id,
          duration: row.duration,
          lesson_order: row.lesson_order
        });
      }
    });
    
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para enrollments
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.query;
    const targetUserId = user_id || req.user.id;
    
    const { rows } = await pool.query(`
      SELECT e.*, c.title as course_title, c.thumbnail_url, pr.name as instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN profiles pr ON c.instructor_id = pr.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `, [targetUserId]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
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

// Rota catch-all para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para criar novo curso
app.post('/api/courses', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, level, price, thumbnail } = req.body;
    if (!title || !description || !level || !price) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
    }
    const id = crypto.randomUUID();
    const created_at = new Date();
    await pool.query(
      'INSERT INTO courses (id, title, description, level, price, thumbnail_url, tags, instructor_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, title, description, level, price, thumbnail, category ? [category] : [], req.user.id, created_at]
    );
    res.status(201).json({ id, title, description, level, price, thumbnail_url: thumbnail, tags: category ? [category] : [], instructor_id: req.user.id, created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar curso.' });
  }
});

// Editar post
app.put('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    }
    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, category = $3 WHERE id = $4 AND author_id = $5 RETURNING *',
      [title, content, category, id, req.user.id]
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
    const { title, description, category, level, price, thumbnail } = req.body;
    if (!title || !description || !level || !price) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
    }
    const result = await pool.query(
      'UPDATE courses SET title = $1, description = $2, level = $3, price = $4, thumbnail_url = $5, tags = $6, instructor_id = $7 WHERE id = $8 RETURNING *',
      [title, description, level, price, thumbnail, category ? [category] : [], req.user.id, id]
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
}); 