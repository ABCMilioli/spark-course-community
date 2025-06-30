import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import multer from 'multer';
import { uploadFile, deleteFile } from './utils/upload.js';
import { fileURLToPath } from 'url';
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { s3Client, getPresignedUrl } from './config/minio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do Postgres
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Configuração do Multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    // Permitir todos os tipos de arquivo
    cb(null, true);
  }
});

// Configuração do MinIO (usando variáveis de ambiente da stack)
// process.env.MINIO_ENDPOINT = 'mp.iacas.top';
// process.env.MINIO_PORT = '443';
// process.env.MINIO_ACCESS_KEY = '1013141255245882';
// process.env.MINIO_SECRET_KEY = '5420658821784955';
// process.env.MINIO_USE_SSL = 'true';
// process.env.MINIO_REGION = 'us-east-1';
// process.env.MINIO_BUCKET = 'community';
// process.env.MINIO_PUBLIC_URL = 'https://mp.iacas.top';

// Validação das variáveis de ambiente do MinIO
const requiredMinioVars = [
  'MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 
  'MINIO_SECRET_KEY', 'MINIO_BUCKET', 'MINIO_PUBLIC_URL'
];

const missingVars = requiredMinioVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn('[MinIO] Variáveis de ambiente ausentes:', missingVars);
  console.warn('[MinIO] Upload de arquivos será desabilitado');
} else {
  console.log('[MinIO] Configuração carregada com sucesso');
  console.log('[MinIO] Endpoint:', process.env.MINIO_ENDPOINT);
  console.log('[MinIO] Bucket:', process.env.MINIO_BUCKET);
}

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
             c.thumbnail_url as thumbnail,
             COALESCE(c.rating, 0) as rating,
             (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students_count,
             (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as total_lessons
      FROM courses c 
      LEFT JOIN profiles pr ON c.instructor_id = pr.id 
      ORDER BY c.created_at DESC 
      LIMIT $1
    `, [parseInt(limit)]);

    // Para cada curso, buscar módulos e aulas e calcular total_duration
    const results = await Promise.all(rows.map(async (course) => {
      const modulesQuery = `
        SELECT m.id as module_id, l.id as lesson_id, l.duration
        FROM modules m
        LEFT JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = $1
      `;
      const { rows: moduleRows } = await pool.query(modulesQuery, [course.id]);
      const modulesMap = {};
      moduleRows.forEach(row => {
        if (!row.module_id) return;
        if (!modulesMap[row.module_id]) {
          modulesMap[row.module_id] = { lessons: [] };
        }
        if (row.lesson_id) {
          modulesMap[row.module_id].lessons.push({
            id: row.lesson_id,
            duration: row.duration
          });
        }
      });
      const modules = Object.values(modulesMap);
      const total_duration = modules.reduce((total, m) => {
        return total + m.lessons.reduce((sum, lesson) => {
          const duration = lesson.duration ? parseInt(lesson.duration) || 0 : 0;
          return sum + duration;
        }, 0);
      }, 0);
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        instructor_id: course.instructor_id,
        instructor_name: course.instructor_name,
        thumbnail_url: course.thumbnail_url || course.thumbnail,
        price: course.price,
        created_at: course.created_at,
        updated_at: course.updated_at,
        level: course.level,
        tags: course.tags,
        category: course.category,
        rating: course.rating,
        enrolled_students_count: course.enrolled_students_count,
        total_lessons: course.total_lessons,
        total_duration: total_duration
      };
    }));

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para detalhes de um curso específico
app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados básicos do curso
    const { rows } = await pool.query(`
      SELECT c.*, pr.name as instructor_name, pr.avatar_url as instructor_avatar, pr.bio as instructor_bio, pr.created_at as instructor_created_at,
             CASE WHEN array_length(c.tags, 1) > 0 THEN c.tags[1] ELSE NULL END as category,
             c.thumbnail_url as thumbnail,
             (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students_count,
             COALESCE(c.rating, 0) as rating
      FROM courses c 
      LEFT JOIN profiles pr ON c.instructor_id = pr.id 
      WHERE c.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    const course = rows[0];
    console.log('[GET /api/courses/:id] Dados do curso:', course);
    
    // Buscar módulos e aulas
    let modules = [];
    try {
      const modulesResult = await pool.query(`
        SELECT m.id, m.title, m.module_order, m.is_visible,
               l.id as lesson_id, l.title as lesson_title, l.description as lesson_description,
               l.youtube_id, l.video_url, l.duration, l.lesson_order, l.is_visible as lesson_is_visible, l.release_days
        FROM modules m
        LEFT JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = $1 AND m.is_visible = true
        ORDER BY m.module_order, l.lesson_order
      `, [id]);
      // Estruturar os dados dos módulos
      modules = [];
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
        if (row.lesson_id && row.lesson_is_visible) {
          currentModule.lessons.push({
            id: row.lesson_id,
            title: row.lesson_title,
            description: row.lesson_description,
            youtube_id: row.youtube_id,
            video_url: row.video_url,
            duration: row.duration,
            lesson_order: row.lesson_order,
            is_visible: row.lesson_is_visible,
            release_days: row.release_days
          });
        }
      });
    } catch (err) {
      console.error('[GET /api/courses/:id] Erro ao calcular módulos/duração:', err);
      return res.status(500).json({ error: 'Erro ao calcular módulos/duração.' });
    }
    
    // Calcular estatísticas
    const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
    const totalDuration = modules.reduce((total, module) => {
      return total + module.lessons.reduce((moduleTotal, lesson) => {
        const duration = lesson.duration ? parseInt(lesson.duration) || 0 : 0;
        return moduleTotal + duration;
      }, 0);
    }, 0);
    
    const response = {
      ...course,
      modules,
      total_lessons: totalLessons,
      total_duration: totalDuration,
      instructor: {
        id: course.instructor_id,
        name: course.instructor_name,
        avatar_url: course.instructor_avatar,
        bio: course.instructor_bio,
        created_at: course.instructor_created_at
      }
    };
    
    res.json(response);
  } catch (err) {
    console.error('[GET /api/courses/:id] Erro geral:', err);
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
             c.thumbnail_url as thumbnail,
             COALESCE(c.rating, 0) as rating
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
             l.youtube_id, l.video_url, l.duration, l.lesson_order, l.is_visible as lesson_is_visible, l.release_days
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
          video_url: row.video_url,
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
              
              // Log para depuração do conteúdo da aula
              console.log('[AULA]', lesson);
              await client.query(
                'INSERT INTO lessons (id, module_id, title, description, youtube_id, video_url, duration, lesson_order, is_visible, release_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [lessonId, moduleId, lesson.title, lesson.description || null, lesson.youtube_id || null, lesson.video_url || null, lesson.duration, j + 1, lesson.is_visible, lesson.release_days]
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
             l.id as lesson_id, l.title as lesson_title, l.description as lesson_description, l.youtube_id, l.video_url, l.duration, l.lesson_order, 
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
            description: row.lesson_description,
            youtube_id: row.youtube_id,
            video_url: row.video_url,
            duration: row.duration,
            lesson_order: row.lesson_order,
            is_visible: row.lesson_is_visible,
            release_days: row.release_days,
            isCompleted: false
          });
        }
      }
    });
    
    // Função auxiliar para buscar aulas concluídas
    async function getCompletedLessons(userId, lessonIds, pool) {
      if (!lessonIds.length) return [];
      const completed = await pool.query(
        'SELECT lesson_id FROM lesson_completions WHERE user_id = $1 AND lesson_id = ANY($2)',
        [userId, lessonIds]
      );
      return completed.rows.map(r => r.lesson_id);
    }
    
    const lessonIds = rows.filter(row => row.lesson_id && row.lesson_is_visible).map(row => row.lesson_id);
    const completedLessons = await getCompletedLessons(req.user.id, lessonIds, pool);
    
    // Atualizar o campo isCompleted em cada aula
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        lesson.isCompleted = completedLessons.includes(lesson.id);
      }
    }

    // Calcular progresso do curso
    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedCount = course.modules.reduce((sum, m) => sum + m.lessons.filter(l => l.isCompleted).length, 0);
    const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    res.json({
      ...course,
      progressPercentage
    });
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
    
    // Buscar as matrículas e dados básicos do curso
    let query = `
      SELECT e.*, 
             c.title as course_title,
             c.description as course_description,
             c.thumbnail_url as course_thumbnail,
             c.instructor_id,
             c.level,
             c.price,
             c.tags
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
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

    // Para cada curso, buscar módulos e aulas e calcular total_lessons, total_duration e progresso
    const results = await Promise.all(rows.map(async (enrollment) => {
      // Buscar módulos e aulas do curso
      const modulesQuery = `
        SELECT m.id as module_id, m.title as module_title, m.module_order,
               l.id as lesson_id, l.title as lesson_title, l.duration
        FROM modules m
        LEFT JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = $1
        ORDER BY m.module_order, l.lesson_order
      `;
      const { rows: moduleRows } = await pool.query(modulesQuery, [enrollment.course_id]);
      // Montar estrutura de módulos e aulas
      const modulesMap = {};
      const allLessonIds = [];
      moduleRows.forEach(row => {
        if (!row.module_id) return;
        if (!modulesMap[row.module_id]) {
          modulesMap[row.module_id] = { lessons: [] };
        }
        if (row.lesson_id) {
          modulesMap[row.module_id].lessons.push({
            id: row.lesson_id,
            title: row.lesson_title,
            duration: row.duration
          });
          allLessonIds.push(row.lesson_id);
        }
      });
      const modules = Object.values(modulesMap);
      // Calcular total de aulas e duração
      const total_lessons = modules.reduce((total, m) => total + m.lessons.length, 0);
      const total_duration = modules.reduce((total, m) => {
        return total + m.lessons.reduce((sum, lesson) => {
          const duration = lesson.duration ? parseInt(lesson.duration) || 0 : 0;
          return sum + duration;
        }, 0);
      }, 0);
      // Buscar aulas concluídas pelo usuário
      let completedLessons = 0;
      if (allLessonIds.length > 0) {
        const completedResult = await pool.query(
          'SELECT COUNT(*) FROM lesson_completions WHERE user_id = $1 AND lesson_id = ANY($2)',
          [enrollment.user_id, allLessonIds]
        );
        completedLessons = parseInt(completedResult.rows[0].count, 10);
      }
      // Calcular progresso
      const progress = total_lessons > 0 ? Math.round((completedLessons / total_lessons) * 100) : 0;
      return {
        ...enrollment,
        total_lessons,
        total_duration,
        progress
      };
    }));

    res.json(results);
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
    const { title, description, category, level, price, thumbnail, demo_video, isPaid } = req.body;
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
    const demoVideoUrl = demo_video && demo_video.trim() !== '' ? demo_video : null;
    
    await pool.query(
      'INSERT INTO courses (id, title, description, level, price, thumbnail_url, demo_video, tags, instructor_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [id, title, description, level, finalPrice, thumbnailUrl, demoVideoUrl, category ? [category] : [], req.user.id, created_at]
    );
    res.status(201).json({ 
      id, 
      title, 
      description, 
      level, 
      price: finalPrice, 
      thumbnail_url: thumbnailUrl, 
      demo_video: demoVideoUrl,
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
    const { title, description, category, level, price, thumbnail, demo_video, isPaid } = req.body;
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
    const demoVideoUrl = demo_video && demo_video.trim() !== '' ? demo_video : null;

    const result = await pool.query(
      'UPDATE courses SET title = $1, description = $2, level = $3, price = $4, thumbnail_url = $5, demo_video = $6, tags = $7, instructor_id = $8 WHERE id = $9 RETURNING *',
      [title, description, level, finalPrice, thumbnailUrl, demoVideoUrl, category ? [category] : [], req.user.id, id]
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
        ci.*,
        c.title as course_title,
        p.name as instructor_name,
        (SELECT COUNT(*) FROM class_instance_enrollments WHERE class_instance_id = ci.id AND status = 'active') as current_students
      FROM class_instances ci
      JOIN courses c ON ci.course_id = c.id
      JOIN profiles p ON ci.instructor_id = p.id
      WHERE ci.is_active = true
      AND (
        ci.is_public = true 
        OR ci.id IN (SELECT class_instance_id FROM class_instance_enrollments WHERE user_id = $1 AND status = 'active')
        OR ci.instructor_id = $1
      )
      ORDER BY ci.created_at DESC
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
    
    const { course_id, instance_name, instance_description, is_public, max_students, start_date, end_date, schedule, location } = req.body;
    
    if (!course_id || !instance_name) {
      console.log('[POST /api/classes] Erro: course_id e instance_name são obrigatórios');
      return res.status(400).json({ error: 'ID do curso e nome da turma são obrigatórios.' });
    }
    
    // Verificar se o usuário é instructor ou admin
    if (!['instructor', 'admin'].includes(req.user.role)) {
      console.log('[POST /api/classes] Erro: usuário não tem permissão, role:', req.user.role);
      return res.status(403).json({ error: 'Apenas instrutores podem criar turmas.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [course_id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    const id = crypto.randomUUID();
    console.log('[POST /api/classes] Criando turma com ID:', id);
    
    const { rows } = await pool.query(`
      INSERT INTO class_instances (id, course_id, instructor_id, instance_name, instance_description, is_public, max_students, start_date, end_date, schedule, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [id, course_id, req.user.id, instance_name, instance_description, is_public || false, max_students, start_date, end_date, schedule, location]);
    
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
        ci.*,
        c.title as course_title,
        p.name as instructor_name,
        (SELECT COUNT(*) FROM class_instance_enrollments WHERE class_instance_id = ci.id AND status = 'active') as current_students
      FROM class_instances ci
      JOIN courses c ON ci.course_id = c.id
      JOIN profiles p ON ci.instructor_id = p.id
      WHERE ci.id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      console.log('[GET /api/classes/:id] Turma não encontrada');
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    const classData = classResult.rows[0];
    console.log('[GET /api/classes/:id] Turma encontrada:', classData.instance_name);
    
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
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
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
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    // Verificar limite de alunos
    const enrollmentCount = await pool.query(`
      SELECT COUNT(*) as count FROM class_instance_enrollments WHERE class_instance_id = $1 AND status = 'active'
    `, [id]);
    
    const classInfo = await pool.query(`
      SELECT max_students FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classInfo.rows[0].max_students && 
        parseInt(enrollmentCount.rows[0].count) >= classInfo.rows[0].max_students) {
      return res.status(400).json({ error: 'Turma está lotada.' });
    }
    
    const enrollmentId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO class_instance_enrollments (id, class_instance_id, user_id, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (class_instance_id, user_id) 
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
      SELECT instructor_id, is_public FROM class_instances WHERE id = $1
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
          cie.*,
          p.name as user_name,
          p.email as user_email
        FROM class_instance_enrollments cie
        JOIN profiles p ON cie.user_id = p.id
        WHERE cie.class_instance_id = $1
        ORDER BY cie.enrolled_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 2. Se a turma é pública, permitir visualizar matrículas
    if (classData.is_public) {
      console.log('[GET /api/classes/:id/enrollments] Turma é pública, acesso permitido');
      const { rows } = await pool.query(`
        SELECT 
          cie.*,
          p.name as user_name,
          p.email as user_email
        FROM class_instance_enrollments cie
        JOIN profiles p ON cie.user_id = p.id
        WHERE cie.class_instance_id = $1 AND cie.status = 'active'
        ORDER BY cie.enrolled_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 3. Se o usuário está matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/enrollments] Usuário está matriculado na turma');
      const { rows } = await pool.query(`
        SELECT 
          cie.*,
          p.name as user_name,
          p.email as user_email
        FROM class_instance_enrollments cie
        JOIN profiles p ON cie.user_id = p.id
        WHERE cie.class_instance_id = $1 AND cie.status = 'active'
        ORDER BY cie.enrolled_at DESC
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

// Criar conteúdo na turma
app.post('/api/classes/:id/content', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, content_type = 'announcement', is_pinned = false } = req.body;
    
    if (!title || (!content && !req.file)) {
      return res.status(400).json({ error: 'Título e conteúdo ou arquivo são obrigatórios.' });
    }
    
    // Verificar se a turma existe e se o usuário tem permissão
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    // Verificar se o usuário é o instructor da turma ou admin
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode criar conteúdo.' });
    }
    
    let fileData = null;
    
    // Se há um arquivo, fazer upload para o MinIO
    if (req.file) {
      try {
        const uploadResult = await uploadFile(req.file, 'class-content');
        fileData = {
          file_url: uploadResult.url,
          file_name: req.file.originalname,
          file_size: req.file.size,
          file_type: req.file.mimetype
        };
        console.log('[POST /api/classes/:id/content] Arquivo enviado:', uploadResult.url);
      } catch (uploadError) {
        console.error('[POST /api/classes/:id/content] Erro no upload:', uploadError);
        return res.status(500).json({ error: 'Erro ao fazer upload do arquivo.' });
      }
    }
    
    const contentId = crypto.randomUUID();
    const { rows } = await pool.query(`
      INSERT INTO class_instance_content (
        id, class_instance_id, author_id, title, content, content_type, is_pinned,
        file_url, file_name, file_size, file_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      contentId, id, req.user.id, title, content || null, content_type, is_pinned,
      fileData?.file_url || null, fileData?.file_name || null, 
      fileData?.file_size || null, fileData?.file_type || null
    ]);
    
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
      SELECT instructor_id, is_public FROM class_instances WHERE id = $1
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
        SELECT 
          cic.*,
          p.name as author_name,
          p.avatar_url as author_avatar
        FROM class_instance_content cic
        JOIN profiles p ON cic.author_id = p.id
        WHERE cic.class_instance_id = $1 
        ORDER BY cic.created_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 2. Se a turma é pública, permitir visualizar conteúdo
    if (classData.is_public) {
      console.log('[GET /api/classes/:id/content] Turma é pública, acesso permitido');
      const { rows } = await pool.query(`
        SELECT 
          cic.*,
          p.name as author_name,
          p.avatar_url as author_avatar
        FROM class_instance_content cic
        JOIN profiles p ON cic.author_id = p.id
        WHERE cic.class_instance_id = $1
        ORDER BY cic.created_at DESC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 3. Se o usuário está matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/content] Usuário está matriculado na turma');
      const { rows } = await pool.query(`
        SELECT 
          cic.*,
          p.name as author_name,
          p.avatar_url as author_avatar
        FROM class_instance_content cic
        JOIN profiles p ON cic.author_id = p.id
        WHERE cic.class_instance_id = $1 
        ORDER BY cic.created_at DESC
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

// Atualizar turma
app.put('/api/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { instance_name, instance_description, is_public, max_students, start_date, end_date, schedule, location } = req.body;
    
    console.log('[PUT /api/classes/:id] Atualizando turma:', id);
    console.log('[PUT /api/classes/:id] Dados recebidos:', req.body);
    console.log('[PUT /api/classes/:id] Usuário:', req.user);
    
    // Verificar se a turma existe
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
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
    if (!instance_name || instance_name.trim().length === 0) {
      console.log('[PUT /api/classes/:id] Erro: nome da turma não fornecido');
      return res.status(400).json({ error: 'Nome da turma é obrigatório.' });
    }
    
    // Atualizar turma
    const { rows } = await pool.query(`
      UPDATE class_instances 
      SET instance_name = $1, instance_description = $2, is_public = $3, max_students = $4, 
          start_date = $5, end_date = $6, schedule = $7, location = $8, updated_at = now()
      WHERE id = $9
      RETURNING *
    `, [instance_name.trim(), instance_description?.trim() || null, is_public, max_students || null, 
        start_date, end_date, schedule, location, id]);
    
    console.log('[PUT /api/classes/:id] Turma atualizada com sucesso:', rows[0].instance_name);
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
      SELECT instructor_id, instance_name FROM class_instances WHERE id = $1
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
    
    const className = classCheck.rows[0].instance_name;
    
    // Excluir turma (as tabelas relacionadas serão excluídas automaticamente devido ao CASCADE)
    await pool.query(`
      DELETE FROM class_instances WHERE id = $1
    `, [id]);
    
    console.log('[DELETE /api/classes/:id] Turma excluída com sucesso:', className);
    res.json({ message: 'Turma excluída com sucesso.' });
    
  } catch (err) {
    console.error('[DELETE /api/classes/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar matrícula em curso
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    
    console.log('[POST /api/enrollments] Criando matrícula');
    console.log('[POST /api/enrollments] course_id:', course_id);
    console.log('[POST /api/enrollments] req.user:', req.user);
    
    if (!course_id) {
      return res.status(400).json({ error: 'course_id é obrigatório.' });
    }

    // Verifica se já está matriculado
    const existing = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, course_id]
    );
    
    console.log('[POST /api/enrollments] Verificação de matrícula existente:', existing.rows);
    
    if (existing.rows.length > 0) {
      console.log('[POST /api/enrollments] Usuário já está matriculado');
      return res.status(400).json({ error: 'Usuário já está matriculado.' });
    }

    const id = crypto.randomUUID();
    console.log('[POST /api/enrollments] Criando matrícula com ID:', id);
    
    await pool.query(
      'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
      [id, req.user.id, course_id, new Date(), 0]
    );
    
    // --- NOVA LÓGICA: Matricular automaticamente em todas as turmas do curso ---
    const classInstances = await pool.query(
      'SELECT id FROM class_instances WHERE course_id = $1',
      [course_id]
    );
    for (const turma of classInstances.rows) {
      // Verifica se já está matriculado na turma
      const alreadyEnrolled = await pool.query(
        'SELECT 1 FROM class_instance_enrollments WHERE class_instance_id = $1 AND user_id = $2',
        [turma.id, req.user.id]
      );
      if (alreadyEnrolled.rows.length === 0) {
        await pool.query(
          `INSERT INTO class_instance_enrollments (id, class_instance_id, user_id, enrolled_at, status, role)
           VALUES (gen_random_uuid(), $1, $2, NOW(), 'active', 'student')`,
          [turma.id, req.user.id]
        );
      }
    }
    // --- FIM DA LÓGICA ---

    console.log('[POST /api/enrollments] Matrícula criada com sucesso');
    res.status(201).json({ message: 'Matrícula realizada com sucesso.' });
  } catch (err) {
    console.error('[POST /api/enrollments] Erro:', err);
    res.status(500).json({ error: 'Erro ao realizar matrícula.' });
  }
});

// ===== ENDPOINTS DE UPLOAD MINIO =====

// Teste de conectividade com MinIO
app.get('/api/minio/test', authenticateToken, async (req, res) => {
  try {
    console.log('[GET /api/minio/test] Testando conectividade com MinIO');
    
    const command = new ListBucketsCommand({});
    const result = await s3Client.send(command);
    
    console.log('[GET /api/minio/test] Buckets encontrados:', result.Buckets?.map(b => b.Name));
    
    res.json({ 
      success: true, 
      message: 'Conectividade com MinIO OK',
      buckets: result.Buckets?.map(b => b.Name) || []
    });
  } catch (error) {
    console.error('[GET /api/minio/test] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro na conectividade com MinIO',
      details: error.message 
    });
  }
});

// Upload de thumbnail para curso
app.post('/api/upload/thumbnail', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/thumbnail] Upload de thumbnail iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se é uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens são permitidas para thumbnail' });
    }

    const result = await uploadFile(req.file, 'thumbnails');
    
    console.log('[POST /api/upload/thumbnail] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Thumbnail enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/thumbnail] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload da thumbnail',
      details: error.message 
    });
  }
});

// Upload de vídeo para aula
app.post('/api/upload/video', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/video] Upload de vídeo iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se é um vídeo
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ error: 'Apenas vídeos são permitidos' });
    }

    const result = await uploadFile(req.file, 'videos');
    
    console.log('[POST /api/upload/video] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Vídeo enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/video] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do vídeo',
      details: error.message 
    });
  }
});

// Upload de material complementar
app.post('/api/upload/material', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/material] Upload de material iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const result = await uploadFile(req.file, 'materials');
    
    console.log('[POST /api/upload/material] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Material enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/material] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do material',
      details: error.message 
    });
  }
});

// Upload de avatar do usuário
app.post('/api/upload/avatar', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/avatar] Upload de avatar iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se é uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens são permitidas para avatar' });
    }

    const result = await uploadFile(req.file, 'avatars');
    
    console.log('[POST /api/upload/avatar] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Avatar enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/avatar] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do avatar',
      details: error.message 
    });
  }
});

// Deletar arquivo
app.delete('/api/upload/:fileName', authenticateToken, async (req, res) => {
  try {
    const { fileName } = req.params;
    
    console.log('[DELETE /api/upload/:fileName] Deletando arquivo:', fileName);
    
    const result = await deleteFile(fileName);
    
    res.json({
      success: true,
      message: 'Arquivo deletado com sucesso!'
    });
  } catch (error) {
    console.error('[DELETE /api/upload/:fileName] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao deletar arquivo',
      details: error.message 
    });
  }
});

// Endpoint para upload de vídeo de aula
app.post('/api/upload/lesson-video', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado.' });
    }
    // Apenas vídeos
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ error: 'Apenas arquivos de vídeo são permitidos.' });
    }
    const result = await uploadFile(req.file, 'lessons');
    res.json({ url: result.url });
  } catch (err) {
    console.error('[POST /api/upload/lesson-video] Erro:', err);
    res.status(500).json({ error: 'Erro ao fazer upload do vídeo.' });
  }
});

// Endpoint para obter URL assinada do vídeo da aula
app.get('/api/lessons/:lessonId/video-url', authenticateToken, async (req, res) => {
  const { lessonId } = req.params;
  try {
    // Buscar a aula no banco
    const { rows } = await pool.query('SELECT video_url FROM lessons WHERE id = $1', [lessonId]);
    if (!rows.length || !rows[0].video_url) {
      return res.status(404).json({ error: 'Vídeo não encontrado para esta aula.' });
    }
    // Extrair o caminho do arquivo no bucket
    const videoPath = rows[0].video_url.replace(/^https?:\/\/[^/]+\/[a-zA-Z0-9_-]+\//, '');
    // Exemplo: https://meu-minio/bucket/pasta/video.mp4 => pasta/video.mp4
    const signedUrl = await getPresignedUrl(process.env.MINIO_BUCKET, videoPath, 3600); // 1 hora
    res.json({ url: signedUrl });
  } catch (err) {
    console.error('[GET /api/lessons/:lessonId/video-url]', err);
    res.status(500).json({ error: 'Erro ao gerar URL assinada.' });
  }
});

// Endpoint para marcar aula como concluída
app.post('/api/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    // Verifica se já existe
    const check = await pool.query('SELECT * FROM lesson_completions WHERE user_id = $1 AND lesson_id = $2', [userId, lessonId]);
    if (check.rows.length === 0) {
      await pool.query('INSERT INTO lesson_completions (user_id, lesson_id, completed_at) VALUES ($1, $2, NOW())', [userId, lessonId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/complete]', err);
    res.status(500).json({ error: 'Erro ao marcar aula como concluída.' });
  }
});

// ===== SISTEMA DE COMENTÁRIOS EM AULAS =====

// Buscar comentários de uma aula
app.get('/api/lessons/:lessonId/comments', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        lc.id, lc.lesson_id, lc.user_id, lc.content, lc.parent_id, lc.created_at, lc.updated_at,
        p.name as user_name, p.avatar_url as user_avatar, p.role as user_role,
        (SELECT COUNT(*) FROM lesson_comment_likes WHERE comment_id = lc.id) as likes_count,
        (SELECT COUNT(*) FROM lesson_comments WHERE parent_id = lc.id) as replies_count,
        EXISTS(SELECT 1 FROM lesson_comment_likes WHERE comment_id = lc.id AND user_id = $1) as is_liked_by_user
      FROM lesson_comments lc
      JOIN profiles p ON lc.user_id = p.id
      WHERE lc.lesson_id = $2 AND lc.parent_id IS NULL
      ORDER BY lc.created_at DESC
    `, [req.user.id, lessonId]);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/lessons/:lessonId/comments]', err);
    res.status(500).json({ error: 'Erro ao buscar comentários.' });
  }
});

// Criar comentário
app.post('/api/lessons/:lessonId/comments', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { content, parent_id } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório.' });
    }

    const { rows } = await pool.query(`
      INSERT INTO lesson_comments (lesson_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [lessonId, userId, content.trim(), parent_id || null]);

    res.json({ success: true, comment_id: rows[0].id });
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/comments]', err);
    res.status(500).json({ error: 'Erro ao criar comentário.' });
  }
});

// Atualizar comentário
app.put('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório.' });
    }

    // Verificar se o comentário existe e pertence ao usuário
    const commentCheck = await pool.query(
      'SELECT id FROM lesson_comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado ou não autorizado.' });
    }

    // Atualizar comentário
    await pool.query(
      'UPDATE lesson_comments SET content = $1, updated_at = NOW() WHERE id = $2',
      [content.trim(), commentId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/comments/:commentId]', err);
    res.status(500).json({ error: 'Erro ao atualizar comentário.' });
  }
});

// Deletar comentário
app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Verificar se o comentário existe e pertence ao usuário
    const commentCheck = await pool.query(
      'SELECT id FROM lesson_comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado ou não autorizado.' });
    }

    // Deletar comentário (cascade irá deletar respostas e curtidas)
    await pool.query('DELETE FROM lesson_comments WHERE id = $1', [commentId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/comments/:commentId]', err);
    res.status(500).json({ error: 'Erro ao deletar comentário.' });
  }
});

// Curtir/descurtir comentário
app.post('/api/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const likeCheck = await pool.query(
      'SELECT id FROM lesson_comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (likeCheck.rows.length > 0) {
      await pool.query(
        'DELETE FROM lesson_comment_likes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO lesson_comment_likes (comment_id, user_id) VALUES ($1, $2)',
        [commentId, userId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/comments/:commentId/like]', err);
    res.status(500).json({ error: 'Erro ao curtir comentário.' });
  }
});

// ===== SISTEMA DE NOTIFICAÇÕES =====

// Buscar notificações do usuário
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(`
      SELECT id, user_id, title, message, type, reference_id, reference_type, is_read, created_at
      FROM notifications 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/notifications]', err);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

app.get('/api/notifications/count', authenticateToken, async (req, res) => {
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

// ===== SISTEMA DE AVALIAÇÕES DE CURSOS =====

// Buscar avaliações de um curso
app.get('/api/courses/:courseId/ratings', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        cr.id, cr.course_id, cr.user_id, cr.rating, cr.review, cr.created_at, cr.updated_at,
        p.name as user_name, p.avatar_url as user_avatar, p.role as user_role
      FROM course_ratings cr
      JOIN profiles p ON cr.user_id = p.id
      WHERE cr.course_id = $1
      ORDER BY cr.created_at DESC
    `, [courseId]);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/courses/:courseId/ratings]', err);
    res.status(500).json({ error: 'Erro ao buscar avaliações.' });
  }
});

// Buscar estatísticas de avaliações de um curso
app.get('/api/courses/:courseId/rating-stats', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        course_id,
        COUNT(*)::int as total_ratings,
        COALESCE(AVG(rating), 0)::float as average_rating,
        COUNT(*) FILTER (WHERE rating = 5)::int as five_star_count,
        COUNT(*) FILTER (WHERE rating = 4)::int as four_star_count,
        COUNT(*) FILTER (WHERE rating = 3)::int as three_star_count,
        COUNT(*) FILTER (WHERE rating = 2)::int as two_star_count,
        COUNT(*) FILTER (WHERE rating = 1)::int as one_star_count,
        ROUND(
          (COUNT(*) FILTER (WHERE rating >= 4)::DECIMAL / COUNT(*)::DECIMAL) * 100, 1
        )::float as satisfaction_percentage
      FROM course_ratings
      WHERE course_id = $1
      GROUP BY course_id
    `, [courseId]);
    
    res.json(rows[0] || {
      course_id: courseId,
      total_ratings: 0,
      average_rating: 0,
      five_star_count: 0,
      four_star_count: 0,
      three_star_count: 0,
      two_star_count: 0,
      one_star_count: 0,
      satisfaction_percentage: 0
    });
  } catch (err) {
    console.error('[GET /api/courses/:courseId/rating-stats]', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de avaliação.' });
  }
});

// Buscar avaliação do usuário atual para um curso
app.get('/api/courses/:courseId/my-rating', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    const { rows } = await pool.query(`
      SELECT 
        cr.id, cr.course_id, cr.user_id, cr.rating, cr.review, cr.created_at, cr.updated_at,
        p.name as user_name, p.avatar_url as user_avatar, p.role as user_role
      FROM course_ratings cr
      JOIN profiles p ON cr.user_id = p.id
      WHERE cr.course_id = $1 AND cr.user_id = $2
    `, [courseId, userId]);
    
    res.json(rows[0] || null);
  } catch (err) {
    console.error('[GET /api/courses/:courseId/my-rating]', err);
    res.status(500).json({ error: 'Erro ao buscar avaliação do usuário.' });
  }
});

// Criar ou atualizar avaliação de um curso
app.post('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Validações
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5 estrelas.' });
    }

    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }

    // Verificar se já existe uma avaliação do usuário
    const existingRating = await pool.query(
      'SELECT id FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );

    if (existingRating.rows.length > 0) {
      // Atualizar avaliação existente
      await pool.query(
        'UPDATE course_ratings SET rating = $1, review = $2, updated_at = NOW() WHERE course_id = $3 AND user_id = $4',
        [rating, review || null, courseId, userId]
      );
    } else {
      // Criar nova avaliação
      await pool.query(
        'INSERT INTO course_ratings (course_id, user_id, rating, review) VALUES ($1, $2, $3, $4)',
        [courseId, userId, rating, review || null]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/courses/:courseId/rate]', err);
    res.status(500).json({ error: 'Erro ao avaliar curso.' });
  }
});

// Deletar avaliação do usuário
app.delete('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const { rowCount } = await pool.query(
      'DELETE FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Avaliação não encontrada.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/courses/:courseId/rate]', err);
    res.status(500).json({ error: 'Erro ao deletar avaliação.' });
  }
});

// ===== ENDPOINTS DE EXPLORE E BUSCA =====

// Busca geral
app.get('/api/explore/search', authenticateToken, async (req, res) => {
  try {
    const { q, type, category, level, price } = req.query;
    const results = { courses: [], posts: [], instructors: [] };

    // Buscar cursos
    if (!type || type === 'all' || type === 'courses') {
      let courseQuery = `
        SELECT c.*, pr.name as instructor_name,
               CASE WHEN array_length(c.tags, 1) > 0 THEN c.tags[1] ELSE NULL END as category,
               c.thumbnail_url as thumbnail,
               COALESCE(c.rating, 0) as rating,
               (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students_count,
               (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as total_lessons
        FROM courses c 
        LEFT JOIN profiles pr ON c.instructor_id = pr.id 
        WHERE 1=1
      `;
      const courseParams = [];
      let paramIndex = 1;

      if (q) {
        courseQuery += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        courseParams.push(`%${q}%`);
        paramIndex++;
      }

      if (category && category !== 'all') {
        courseQuery += ` AND c.tags @> $${paramIndex}`;
        courseParams.push(`{${category}}`);
        paramIndex++;
      }

      if (level && level !== 'all') {
        courseQuery += ` AND c.level = $${paramIndex}`;
        courseParams.push(level);
        paramIndex++;
      }

      if (price && price !== 'all') {
        if (price === 'free') {
          courseQuery += ` AND c.price = 0`;
        } else if (price === 'paid') {
          courseQuery += ` AND c.price > 0`;
        }
      }

      courseQuery += ` ORDER BY c.created_at DESC LIMIT 10`;
      
      const courseResult = await pool.query(courseQuery, courseParams);
      results.courses = courseResult.rows;
    }

    // Buscar posts
    if (!type || type === 'all' || type === 'posts') {
      let postQuery = `
        SELECT p.*, u.name as author_name, u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes_count,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count
        FROM posts p 
        LEFT JOIN profiles u ON p.author_id = u.id 
        WHERE 1=1
      `;
      const postParams = [];
      let paramIndex = 1;

      if (q) {
        postQuery += ` AND (p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`;
        postParams.push(`%${q}%`);
        paramIndex++;
      }

      if (category && category !== 'all') {
        postQuery += ` AND p.category = $${paramIndex}`;
        postParams.push(category);
        paramIndex++;
      }

      postQuery += ` ORDER BY p.created_at DESC LIMIT 10`;
      
      const postResult = await pool.query(postQuery, postParams);
      results.posts = postResult.rows;
    }

    // Buscar instrutores
    if (!type || type === 'all' || type === 'instructors') {
      let instructorQuery = `
        SELECT id, name, email, bio, avatar_url, created_at
        FROM profiles 
        WHERE role = 'instructor'
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
    console.error('[GET /api/explore/search]', err);
    res.status(500).json({ error: 'Erro na busca.' });
  }
});

// Categorias populares
app.get('/api/explore/categories', authenticateToken, async (req, res) => {
  try {
    // Categorias de cursos
    const courseCategories = await pool.query(`
      SELECT 
        CASE WHEN array_length(tags, 1) > 0 THEN tags[1] ELSE 'Sem categoria' END as category,
        COUNT(*) as count
      FROM courses 
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY CASE WHEN array_length(tags, 1) > 0 THEN tags[1] ELSE 'Sem categoria' END
      ORDER BY count DESC
      LIMIT 10
    `);

    // Categorias de posts
    const postCategories = await pool.query(`
      SELECT 
        COALESCE(category, 'Sem categoria') as category,
        COUNT(*) as count
      FROM posts 
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      courseCategories: courseCategories.rows,
      postCategories: postCategories.rows
    });
  } catch (err) {
    console.error('[GET /api/explore/categories]', err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
});

// Usuários por role
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { role, limit = 10 } = req.query;
    
    let query = `
      SELECT id, name, email, bio, avatar_url, created_at
      FROM profiles 
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ` AND role = $1`;
      params.push(role);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/users]', err);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
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

// Endpoint para buscar estatísticas de um curso
app.get('/api/courses/:courseId/stats', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('[GET /api/courses/:courseId/stats] Buscando estatísticas do curso:', courseId);
    
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1) as total_lessons,
        (SELECT COALESCE(SUM(CASE WHEN l.duration ~ '^[0-9]+' THEN CAST(l.duration AS INTEGER) ELSE 0 END), 0)
         FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1) as total_duration,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = $1) as enrolled_students_count
    `;
    
    const { rows } = await pool.query(query, [courseId]);
    
    console.log('[GET /api/courses/:courseId/stats] Resultado:', rows[0]);
    
    res.json(rows[0] || { total_lessons: 0, total_duration: 0, enrolled_students_count: 0 });
  } catch (err) {
    console.error('[GET /api/courses/:courseId/stats] Erro ao buscar estatísticas:', err);
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
    
    // Buscar as matrículas e dados básicos do curso
    let query = `
      SELECT e.*, 
             c.title as course_title,
             c.description as course_description,
             c.thumbnail_url as course_thumbnail,
             c.instructor_id,
             c.level,
             c.price,
             c.tags
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
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

    // Para cada curso, buscar módulos e aulas e calcular total_lessons, total_duration e progresso
    const results = await Promise.all(rows.map(async (enrollment) => {
      // Buscar módulos e aulas do curso
      const modulesQuery = `
        SELECT m.id as module_id, m.title as module_title, m.module_order,
               l.id as lesson_id, l.title as lesson_title, l.duration
        FROM modules m
        LEFT JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = $1
        ORDER BY m.module_order, l.lesson_order
      `;
      const { rows: moduleRows } = await pool.query(modulesQuery, [enrollment.course_id]);
      // Montar estrutura de módulos e aulas
      const modulesMap = {};
      const allLessonIds = [];
      moduleRows.forEach(row => {
        if (!row.module_id) return;
        if (!modulesMap[row.module_id]) {
          modulesMap[row.module_id] = { lessons: [] };
        }
        if (row.lesson_id) {
          modulesMap[row.module_id].lessons.push({
            id: row.lesson_id,
            title: row.lesson_title,
            duration: row.duration
          });
          allLessonIds.push(row.lesson_id);
        }
      });
      const modules = Object.values(modulesMap);
      // Calcular total de aulas e duração
      const total_lessons = modules.reduce((total, m) => total + m.lessons.length, 0);
      const total_duration = modules.reduce((total, m) => {
        return total + m.lessons.reduce((sum, lesson) => {
          const duration = lesson.duration ? parseInt(lesson.duration) || 0 : 0;
          return sum + duration;
        }, 0);
      }, 0);
      // Buscar aulas concluídas pelo usuário
      let completedLessons = 0;
      if (allLessonIds.length > 0) {
        const completedResult = await pool.query(
          'SELECT COUNT(*) FROM lesson_completions WHERE user_id = $1 AND lesson_id = ANY($2)',
          [enrollment.user_id, allLessonIds]
        );
        completedLessons = parseInt(completedResult.rows[0].count, 10);
      }
      // Calcular progresso
      const progress = total_lessons > 0 ? Math.round((completedLessons / total_lessons) * 100) : 0;
      return {
        ...enrollment,
        total_lessons,
        total_duration,
        progress
      };
    }));

    res.json(results);
  } catch (err) {
    console.error('[GET /api/enrollments] Erro ao buscar matrículas:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint de debug para verificar estrutura das tabelas
app.get('/api/debug/tables', authenticateToken, async (req, res) => {
  try {
    console.log('[DEBUG] Verificando estrutura das tabelas...');
    
    // Verificar se a tabela enrollments existe
    const enrollmentsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'enrollments'
      ORDER BY ordinal_position
    `);
    
    // Verificar se a tabela courses existe
    const coursesCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'courses'
      ORDER BY ordinal_position
    `);
    
    // Verificar se a tabela profiles existe
    const profilesCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position
    `);
    
    // Verificar se há dados nas tabelas
    const enrollmentsCount = await pool.query('SELECT COUNT(*) as count FROM enrollments');
    const coursesCount = await pool.query('SELECT COUNT(*) as count FROM courses');
    const profilesCount = await pool.query('SELECT COUNT(*) as count FROM profiles');
    
    res.json({
      enrollments: {
        columns: enrollmentsCheck.rows,
        count: enrollmentsCount.rows[0].count
      },
      courses: {
        columns: coursesCheck.rows,
        count: coursesCount.rows[0].count
      },
      profiles: {
        columns: profilesCheck.rows,
        count: profilesCount.rows[0].count
      }
    });
  } catch (err) {
    console.error('[DEBUG] Erro ao verificar tabelas:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ENDPOINTS PARA GERENCIAR CURSOS DAS TURMAS =====

// Listar cursos de uma turma
app.get('/api/classes/:id/courses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id/courses] Buscando cursos da turma:', id);
    console.log('[GET /api/classes/:id/courses] Usuário:', req.user);
    
    // Primeiro, buscar a turma para verificar se o usuário tem acesso
    const classResult = await pool.query(`
      SELECT instructor_id, is_public FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      console.log('[GET /api/classes/:id/courses] Turma não encontrada');
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    const classData = classResult.rows[0];
    
    // Verificar se o usuário tem acesso aos cursos
    // 1. Se é o instructor da turma
    if (classData.instructor_id === req.user.id) {
      console.log('[GET /api/classes/:id/courses] Usuário é o instructor da turma');
      const { rows } = await pool.query(`
        SELECT * FROM class_courses_with_details 
        WHERE class_instance_id = $1
        ORDER BY order_index ASC, created_at ASC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 2. Se a turma é pública, permitir visualizar cursos
    if (classData.is_public) {
      console.log('[GET /api/classes/:id/courses] Turma é pública, acesso permitido');
      const { rows } = await pool.query(`
        SELECT * FROM class_courses_with_details 
        WHERE class_instance_id = $1
        ORDER BY order_index ASC, created_at ASC
      `, [id]);
      
      return res.json(rows);
    }
    
    // 3. Se o usuário está matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/courses] Usuário está matriculado na turma');
      const { rows } = await pool.query(`
        SELECT * FROM class_courses_with_details 
        WHERE class_instance_id = $1
        ORDER BY order_index ASC, created_at ASC
      `, [id]);
      
      return res.json(rows);
    }
    
    console.log('[GET /api/classes/:id/courses] Acesso negado - usuário não tem permissão');
    return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    
  } catch (err) {
    console.error('[GET /api/classes/:id/courses] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Adicionar curso à turma
app.post('/api/classes/:id/courses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { course_id, is_required = false, order_index } = req.body;
    
    console.log('[POST /api/classes/:id/courses] Adicionando curso à turma:', id);
    console.log('[POST /api/classes/:id/courses] Dados recebidos:', req.body);
    console.log('[POST /api/classes/:id/courses] Usuário:', req.user);
    
    if (!course_id) {
      return res.status(400).json({ error: 'course_id é obrigatório.' });
    }
    
    // Verificar se o usuário é instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode adicionar cursos.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [course_id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    // Verificar se o curso já está na turma
    const existingCheck = await pool.query(`
      SELECT id FROM class_courses WHERE class_instance_id = $1 AND course_id = $2
    `, [id, course_id]);
    
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Este curso já está associado à turma.' });
    }
    
    // Determinar a ordem do curso
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const maxOrderResult = await pool.query(`
        SELECT COALESCE(MAX(order_index), -1) as max_order FROM class_courses WHERE class_instance_id = $1
      `, [id]);
      finalOrderIndex = maxOrderResult.rows[0].max_order + 1;
    }
    
    const courseClassId = crypto.randomUUID();
    const { rows } = await pool.query(`
      INSERT INTO class_courses (id, class_instance_id, course_id, is_required, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [courseClassId, id, course_id, is_required, finalOrderIndex]);
    
    console.log('[POST /api/classes/:id/courses] Curso adicionado com sucesso');
    res.status(201).json(rows[0]);
    
  } catch (err) {
    console.error('[POST /api/classes/:id/courses] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Atualizar configurações de um curso na turma
app.put('/api/classes/:id/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { id, courseId } = req.params;
    const { is_required, order_index } = req.body;
    
    console.log('[PUT /api/classes/:id/courses/:courseId] Atualizando curso da turma');
    console.log('[PUT /api/classes/:id/courses/:courseId] Dados recebidos:', req.body);
    console.log('[PUT /api/classes/:id/courses/:courseId] Usuário:', req.user);
    
    // Verificar se o usuário é instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode editar cursos.' });
    }
    
    // Verificar se o curso está na turma
    const courseCheck = await pool.query(`
      SELECT id FROM class_courses WHERE class_instance_id = $1 AND course_id = $2
    `, [id, courseId]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado na turma.' });
    }
    
    // Atualizar configurações
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (is_required !== undefined) {
      updateFields.push(`is_required = $${paramIndex}`);
      updateValues.push(is_required);
      paramIndex++;
    }
    
    if (order_index !== undefined) {
      updateFields.push(`order_index = $${paramIndex}`);
      updateValues.push(order_index);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar fornecido.' });
    }
    
    updateValues.push(id, courseId);
    
    const { rows } = await pool.query(`
      UPDATE class_courses 
      SET ${updateFields.join(', ')}
      WHERE class_instance_id = $${paramIndex} AND course_id = $${paramIndex + 1}
      RETURNING *
    `, updateValues);
    
    console.log('[PUT /api/classes/:id/courses/:courseId] Curso atualizado com sucesso');
    res.json(rows[0]);
    
  } catch (err) {
    console.error('[PUT /api/classes/:id/courses/:courseId] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Remover curso da turma
app.delete('/api/classes/:id/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { id, courseId } = req.params;
    
    console.log('[DELETE /api/classes/:id/courses/:courseId] Removendo curso da turma');
    console.log('[DELETE /api/classes/:id/courses/:courseId] Usuário:', req.user);
    
    // Verificar se o usuário é instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode remover cursos.' });
    }
    
    // Verificar se o curso está na turma
    const courseCheck = await pool.query(`
      SELECT id, is_required FROM class_courses WHERE class_instance_id = $1 AND course_id = $2
    `, [id, courseId]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado na turma.' });
    }
    
    // Não permitir remover o curso obrigatório (primeiro curso)
    if (courseCheck.rows[0].is_required) {
      return res.status(400).json({ error: 'Não é possível remover o curso obrigatório da turma.' });
    }
    
    // Remover o curso
    await pool.query(`
      DELETE FROM class_courses WHERE class_instance_id = $1 AND course_id = $2
    `, [id, courseId]);
    
    console.log('[DELETE /api/classes/:id/courses/:courseId] Curso removido com sucesso');
    res.json({ message: 'Curso removido da turma com sucesso.' });
    
  } catch (err) {
    console.error('[DELETE /api/classes/:id/courses/:courseId] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar matrícula em curso
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    
    console.log('[POST /api/enrollments] Criando matrícula');
    console.log('[POST /api/enrollments] course_id:', course_id);
    console.log('[POST /api/enrollments] req.user:', req.user);
    
    if (!course_id) {
      return res.status(400).json({ error: 'course_id é obrigatório.' });
    }

    // Verifica se já está matriculado
    const existing = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, course_id]
    );
    
    console.log('[POST /api/enrollments] Verificação de matrícula existente:', existing.rows);
    
    if (existing.rows.length > 0) {
      console.log('[POST /api/enrollments] Usuário já está matriculado');
      return res.status(400).json({ error: 'Usuário já está matriculado.' });
    }

    const id = crypto.randomUUID();
    console.log('[POST /api/enrollments] Criando matrícula com ID:', id);
    
    await pool.query(
      'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
      [id, req.user.id, course_id, new Date(), 0]
    );
    
    // --- NOVA LÓGICA: Matricular automaticamente em todas as turmas do curso ---
    const classInstances = await pool.query(
      'SELECT id FROM class_instances WHERE course_id = $1',
      [course_id]
    );
    for (const turma of classInstances.rows) {
      // Verifica se já está matriculado na turma
      const alreadyEnrolled = await pool.query(
        'SELECT 1 FROM class_instance_enrollments WHERE class_instance_id = $1 AND user_id = $2',
        [turma.id, req.user.id]
      );
      if (alreadyEnrolled.rows.length === 0) {
        await pool.query(
          `INSERT INTO class_instance_enrollments (id, class_instance_id, user_id, enrolled_at, status, role)
           VALUES (gen_random_uuid(), $1, $2, NOW(), 'active', 'student')`,
          [turma.id, req.user.id]
        );
      }
    }
    // --- FIM DA LÓGICA ---

    console.log('[POST /api/enrollments] Matrícula criada com sucesso');
    res.status(201).json({ message: 'Matrícula realizada com sucesso.' });
  } catch (err) {
    console.error('[POST /api/enrollments] Erro:', err);
    res.status(500).json({ error: 'Erro ao realizar matrícula.' });
  }
});

// ===== ENDPOINTS DE UPLOAD MINIO =====

// Teste de conectividade com MinIO
app.get('/api/minio/test', authenticateToken, async (req, res) => {
  try {
    console.log('[GET /api/minio/test] Testando conectividade com MinIO');
    
    const command = new ListBucketsCommand({});
    const result = await s3Client.send(command);
    
    console.log('[GET /api/minio/test] Buckets encontrados:', result.Buckets?.map(b => b.Name));
    
    res.json({ 
      success: true, 
      message: 'Conectividade com MinIO OK',
      buckets: result.Buckets?.map(b => b.Name) || []
    });
  } catch (error) {
    console.error('[GET /api/minio/test] Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro na conectividade com MinIO',
      details: error.message 
    });
  }
});

// Upload de thumbnail para curso
app.post('/api/upload/thumbnail', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/thumbnail] Upload de thumbnail iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se é uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens são permitidas para thumbnail' });
    }

    const result = await uploadFile(req.file, 'thumbnails');
    
    console.log('[POST /api/upload/thumbnail] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Thumbnail enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/thumbnail] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload da thumbnail',
      details: error.message 
    });
  }
});

// Upload de vídeo para aula
app.post('/api/upload/video', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/video] Upload de vídeo iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se é um vídeo
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ error: 'Apenas vídeos são permitidos' });
    }

    const result = await uploadFile(req.file, 'videos');
    
    console.log('[POST /api/upload/video] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Vídeo enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/video] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do vídeo',
      details: error.message 
    });
  }
});

// Upload de material complementar
app.post('/api/upload/material', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/material] Upload de material iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const result = await uploadFile(req.file, 'materials');
    
    console.log('[POST /api/upload/material] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Material enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/material] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do material',
      details: error.message 
    });
  }
});

// Upload de avatar do usuário
app.post('/api/upload/avatar', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/avatar] Upload de avatar iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se é uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens são permitidas para avatar' });
    }

    const result = await uploadFile(req.file, 'avatars');
    
    console.log('[POST /api/upload/avatar] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'Avatar enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/avatar] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do avatar',
      details: error.message 
    });
  }
});

// Deletar arquivo
app.delete('/api/upload/:fileName', authenticateToken, async (req, res) => {
  try {
    const { fileName } = req.params;
    
    console.log('[DELETE /api/upload/:fileName] Deletando arquivo:', fileName);
    
    const result = await deleteFile(fileName);
    
    res.json({
      success: true,
      message: 'Arquivo deletado com sucesso!'
    });
  } catch (error) {
    console.error('[DELETE /api/upload/:fileName] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao deletar arquivo',
      details: error.message 
    });
  }
});

// Endpoint para upload de vídeo de aula
app.post('/api/upload/lesson-video', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado.' });
    }
    // Apenas vídeos
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ error: 'Apenas arquivos de vídeo são permitidos.' });
    }
    const result = await uploadFile(req.file, 'lessons');
    res.json({ url: result.url });
  } catch (err) {
    console.error('[POST /api/upload/lesson-video] Erro:', err);
    res.status(500).json({ error: 'Erro ao fazer upload do vídeo.' });
  }
});

// Endpoint para obter URL assinada do vídeo da aula
app.get('/api/lessons/:lessonId/video-url', authenticateToken, async (req, res) => {
  const { lessonId } = req.params;
  try {
    // Buscar a aula no banco
    const { rows } = await pool.query('SELECT video_url FROM lessons WHERE id = $1', [lessonId]);
    if (!rows.length || !rows[0].video_url) {
      return res.status(404).json({ error: 'Vídeo não encontrado para esta aula.' });
    }
    // Extrair o caminho do arquivo no bucket
    const videoPath = rows[0].video_url.replace(/^https?:\/\/[^/]+\/[a-zA-Z0-9_-]+\//, '');
    // Exemplo: https://meu-minio/bucket/pasta/video.mp4 => pasta/video.mp4
    const signedUrl = await getPresignedUrl(process.env.MINIO_BUCKET, videoPath, 3600); // 1 hora
    res.json({ url: signedUrl });
  } catch (err) {
    console.error('[GET /api/lessons/:lessonId/video-url]', err);
    res.status(500).json({ error: 'Erro ao gerar URL assinada.' });
  }
});

// Endpoint para marcar aula como concluída
app.post('/api/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    // Verifica se já existe
    const check = await pool.query('SELECT * FROM lesson_completions WHERE user_id = $1 AND lesson_id = $2', [userId, lessonId]);
    if (check.rows.length === 0) {
      await pool.query('INSERT INTO lesson_completions (user_id, lesson_id, completed_at) VALUES ($1, $2, NOW())', [userId, lessonId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/complete]', err);
    res.status(500).json({ error: 'Erro ao marcar aula como concluída.' });
  }
});

// ===== SISTEMA DE COMENTÁRIOS EM AULAS =====

// Buscar comentários de uma aula
app.get('/api/lessons/:lessonId/comments', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        lc.id, lc.lesson_id, lc.user_id, lc.content, lc.parent_id, lc.created_at, lc.updated_at,
        p.name as user_name, p.avatar_url as user_avatar, p.role as user_role,
        (SELECT COUNT(*) FROM lesson_comment_likes WHERE comment_id = lc.id) as likes_count,
        (SELECT COUNT(*) FROM lesson_comments WHERE parent_id = lc.id) as replies_count,
        EXISTS(SELECT 1 FROM lesson_comment_likes WHERE comment_id = lc.id AND user_id = $1) as is_liked_by_user
      FROM lesson_comments lc
      JOIN profiles p ON lc.user_id = p.id
      WHERE lc.lesson_id = $2 AND lc.parent_id IS NULL
      ORDER BY lc.created_at DESC
    `, [req.user.id, lessonId]);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/lessons/:lessonId/comments]', err);
    res.status(500).json({ error: 'Erro ao buscar comentários.' });
  }
});

// Criar comentário
app.post('/api/lessons/:lessonId/comments', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { content, parent_id } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório.' });
    }

    const { rows } = await pool.query(`
      INSERT INTO lesson_comments (lesson_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [lessonId, userId, content.trim(), parent_id || null]);

    res.json({ success: true, comment_id: rows[0].id });
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/comments]', err);
    res.status(500).json({ error: 'Erro ao criar comentário.' });
  }
});

// Atualizar comentário
app.put('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório.' });
    }

    // Verificar se o comentário existe e pertence ao usuário
    const commentCheck = await pool.query(
      'SELECT id FROM lesson_comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado ou não autorizado.' });
    }

    // Atualizar comentário
    await pool.query(
      'UPDATE lesson_comments SET content = $1, updated_at = NOW() WHERE id = $2',
      [content.trim(), commentId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/comments/:commentId]', err);
    res.status(500).json({ error: 'Erro ao atualizar comentário.' });
  }
});

// Deletar comentário
app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Verificar se o comentário existe e pertence ao usuário
    const commentCheck = await pool.query(
      'SELECT id FROM lesson_comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado ou não autorizado.' });
    }

    // Deletar comentário (cascade irá deletar respostas e curtidas)
    await pool.query('DELETE FROM lesson_comments WHERE id = $1', [commentId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/comments/:commentId]', err);
    res.status(500).json({ error: 'Erro ao deletar comentário.' });
  }
});

// Curtir/descurtir comentário
app.post('/api/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const likeCheck = await pool.query(
      'SELECT id FROM lesson_comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (likeCheck.rows.length > 0) {
      await pool.query(
        'DELETE FROM lesson_comment_likes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO lesson_comment_likes (comment_id, user_id) VALUES ($1, $2)',
        [commentId, userId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/comments/:commentId/like]', err);
    res.status(500).json({ error: 'Erro ao curtir comentário.' });
  }
});

// ===== SISTEMA DE NOTIFICAÇÕES =====

// Buscar notificações do usuário
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(`
      SELECT id, user_id, title, message, type, reference_id, reference_type, is_read, created_at
      FROM notifications 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/notifications]', err);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

app.get('/api/notifications/count', authenticateToken, async (req, res) => {
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

// ===== SISTEMA DE AVALIAÇÕES DE CURSOS =====

// Buscar avaliações de um curso
app.get('/api/courses/:courseId/ratings', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        cr.id, cr.course_id, cr.user_id, cr.rating, cr.review, cr.created_at, cr.updated_at,
        p.name as user_name, p.avatar_url as user_avatar, p.role as user_role
      FROM course_ratings cr
      JOIN profiles p ON cr.user_id = p.id
      WHERE cr.course_id = $1
      ORDER BY cr.created_at DESC
    `, [courseId]);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/courses/:courseId/ratings]', err);
    res.status(500).json({ error: 'Erro ao buscar avaliações.' });
  }
});

// Buscar estatísticas de avaliações de um curso
app.get('/api/courses/:courseId/rating-stats', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        course_id,
        COUNT(*)::int as total_ratings,
        COALESCE(AVG(rating), 0)::float as average_rating,
        COUNT(*) FILTER (WHERE rating = 5)::int as five_star_count,
        COUNT(*) FILTER (WHERE rating = 4)::int as four_star_count,
        COUNT(*) FILTER (WHERE rating = 3)::int as three_star_count,
        COUNT(*) FILTER (WHERE rating = 2)::int as two_star_count,
        COUNT(*) FILTER (WHERE rating = 1)::int as one_star_count,
        ROUND(
          (COUNT(*) FILTER (WHERE rating >= 4)::DECIMAL / COUNT(*)::DECIMAL) * 100, 1
        )::float as satisfaction_percentage
      FROM course_ratings
      WHERE course_id = $1
      GROUP BY course_id
    `, [courseId]);
    
    res.json(rows[0] || {
      course_id: courseId,
      total_ratings: 0,
      average_rating: 0,
      five_star_count: 0,
      four_star_count: 0,
      three_star_count: 0,
      two_star_count: 0,
      one_star_count: 0,
      satisfaction_percentage: 0
    });
  } catch (err) {
    console.error('[GET /api/courses/:courseId/rating-stats]', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de avaliação.' });
  }
});

// Buscar avaliação do usuário atual para um curso
app.get('/api/courses/:courseId/my-rating', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    const { rows } = await pool.query(`
      SELECT 
        cr.id, cr.course_id, cr.user_id, cr.rating, cr.review, cr.created_at, cr.updated_at,
        p.name as user_name, p.avatar_url as user_avatar, p.role as user_role
      FROM course_ratings cr
      JOIN profiles p ON cr.user_id = p.id
      WHERE cr.course_id = $1 AND cr.user_id = $2
    `, [courseId, userId]);
    
    res.json(rows[0] || null);
  } catch (err) {
    console.error('[GET /api/courses/:courseId/my-rating]', err);
    res.status(500).json({ error: 'Erro ao buscar avaliação do usuário.' });
  }
});

// Criar ou atualizar avaliação de um curso
app.post('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Validações
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5 estrelas.' });
    }

    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }

    // Verificar se já existe uma avaliação do usuário
    const existingRating = await pool.query(
      'SELECT id FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );

    if (existingRating.rows.length > 0) {
      // Atualizar avaliação existente
      await pool.query(
        'UPDATE course_ratings SET rating = $1, review = $2, updated_at = NOW() WHERE course_id = $3 AND user_id = $4',
        [rating, review || null, courseId, userId]
      );
    } else {
      // Criar nova avaliação
      await pool.query(
        'INSERT INTO course_ratings (course_id, user_id, rating, review) VALUES ($1, $2, $3, $4)',
        [courseId, userId, rating, review || null]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/courses/:courseId/rate]', err);
    res.status(500).json({ error: 'Erro ao avaliar curso.' });
  }
});

// Deletar avaliação do usuário
app.delete('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const { rowCount } = await pool.query(
      'DELETE FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Avaliação não encontrada.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/courses/:courseId/rate]', err);
    res.status(500).json({ error: 'Erro ao deletar avaliação.' });
  }
});

// ===== ENDPOINTS DE EXPLORE E BUSCA =====

// Busca geral
app.get('/api/explore/search', authenticateToken, async (req, res) => {
  try {
    const { q, type, category, level, price } = req.query;
    const results = { courses: [], posts: [], instructors: [] };

    // Buscar cursos
    if (!type || type === 'all' || type === 'courses') {
      let courseQuery = `
        SELECT c.*, pr.name as instructor_name,
               CASE WHEN array_length(c.tags, 1) > 0 THEN c.tags[1] ELSE NULL END as category,
               c.thumbnail_url as thumbnail,
               COALESCE(c.rating, 0) as rating,
               (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_students_count,
               (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as total_lessons
        FROM courses c 
        LEFT JOIN profiles pr ON c.instructor_id = pr.id 
        WHERE 1=1
      `;
      const courseParams = [];
      let paramIndex = 1;

      if (q) {
        courseQuery += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        courseParams.push(`%${q}%`);
        paramIndex++;
      }

      if (category && category !== 'all') {
        courseQuery += ` AND c.tags @> $${paramIndex}`;
        courseParams.push(`{${category}}`);
        paramIndex++;
      }

      if (level && level !== 'all') {
        courseQuery += ` AND c.level = $${paramIndex}`;
        courseParams.push(level);
        paramIndex++;
      }

      if (price && price !== 'all') {
        if (price === 'free') {
          courseQuery += ` AND c.price = 0`;
        } else if (price === 'paid') {
          courseQuery += ` AND c.price > 0`;
        }
      }

      courseQuery += ` ORDER BY c.created_at DESC LIMIT 10`;
      
      const courseResult = await pool.query(courseQuery, courseParams);
      results.courses = courseResult.rows;
    }

    // Buscar posts
    if (!type || type === 'all' || type === 'posts') {
      let postQuery = `
        SELECT p.*, u.name as author_name, u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes_count,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count
        FROM posts p 
        LEFT JOIN profiles u ON p.author_id = u.id 
        WHERE 1=1
      `;
      const postParams = [];
      let paramIndex = 1;

      if (q) {
        postQuery += ` AND (p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`;
        postParams.push(`%${q}%`);
        paramIndex++;
      }

      if (category && category !== 'all') {
        postQuery += ` AND p.category = $${paramIndex}`;
        postParams.push(category);
        paramIndex++;
      }

      postQuery += ` ORDER BY p.created_at DESC LIMIT 10`;
      
      const postResult = await pool.query(postQuery, postParams);
      results.posts = postResult.rows;
    }

    // Buscar instrutores
    if (!type || type === 'all' || type === 'instructors') {
      let instructorQuery = `
        SELECT id, name, email, bio, avatar_url, created_at
        FROM profiles 
        WHERE role = 'instructor'
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
    console.error('[GET /api/explore/search]', err);
    res.status(500).json({ error: 'Erro na busca.' });
  }
});

// Categorias populares
app.get('/api/explore/categories', authenticateToken, async (req, res) => {
  try {
    // Categorias de cursos
    const courseCategories = await pool.query(`
      SELECT 
        CASE WHEN array_length(tags, 1) > 0 THEN tags[1] ELSE 'Sem categoria' END as category,
        COUNT(*) as count
      FROM courses 
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY CASE WHEN array_length(tags, 1) > 0 THEN tags[1] ELSE 'Sem categoria' END
      ORDER BY count DESC
      LIMIT 10
    `);

    // Categorias de posts
    const postCategories = await pool.query(`
      SELECT 
        COALESCE(category, 'Sem categoria') as category,
        COUNT(*) as count
      FROM posts 
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      courseCategories: courseCategories.rows,
      postCategories: postCategories.rows
    });
  } catch (err) {
    console.error('[GET /api/explore/categories]', err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
});

// Usuários por role
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { role, limit = 10 } = req.query;
    
    let query = `
      SELECT id, name, email, bio, avatar_url, created_at
      FROM profiles 
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ` AND role = $1`;
      params.push(role);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/users]', err);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// Endpoint de teste para verificar se a tabela class_courses foi criada
app.get('/api/test/class-courses', async (req, res) => {
  try {
    console.log('[GET /api/test/class-courses] Testando se a tabela class_courses existe');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'class_courses' AND table_schema = 'public'
    `);
    
    // Verificar se a view existe
    const viewCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.views 
      WHERE table_name = 'class_courses_with_details' AND table_schema = 'public'
    `);
    
    // Verificar se a função existe
    const functionCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.routines 
      WHERE routine_name = 'get_class_course_stats' AND routine_schema = 'public'
    `);
    
    // Verificar estrutura da tabela
    const structureCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'class_courses' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const result = {
      table_exists: tableCheck.rows[0].count > 0,
      view_exists: viewCheck.rows[0].count > 0,
      function_exists: functionCheck.rows[0].count > 0,
      table_structure: structureCheck.rows,
      status: 'success'
    };
    
    console.log('[GET /api/test/class-courses] Resultado:', result);
    res.json(result);
    
  } catch (err) {
    console.error('[GET /api/test/class-courses] Erro:', err);
    res.status(500).json({ error: 'Erro interno.', details: err.message });
  }
});