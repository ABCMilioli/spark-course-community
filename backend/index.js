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
app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['Authorization']
}));
app.use(express.json());

// Log simples para requisições
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// Configura��o do Postgres
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Configura��o do Multer para upload de arquivos
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

// Configura��o do MinIO (usando vari�veis de ambiente da stack)
// process.env.MINIO_ENDPOINT = 'mp.iacas.top';
// process.env.MINIO_PORT = '443';
// process.env.MINIO_ACCESS_KEY = '1013141255245882';
// process.env.MINIO_SECRET_KEY = '5420658821784955';
// process.env.MINIO_USE_SSL = 'true';
// process.env.MINIO_REGION = 'us-east-1';
// process.env.MINIO_BUCKET = 'community';
// process.env.MINIO_PUBLIC_URL = 'https://mp.iacas.top';

// Valida��o das vari�veis de ambiente do MinIO
const requiredMinioVars = [
  'MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 
  'MINIO_SECRET_KEY', 'MINIO_BUCKET', 'MINIO_PUBLIC_URL'
];

const missingVars = requiredMinioVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn('[MinIO] Vari�veis de ambiente ausentes:', missingVars);
  console.warn('[MinIO] Upload de arquivos ser� desabilitado');
} else {
  console.log('[MinIO] Configura��o carregada com sucesso');
  console.log('[MinIO] Endpoint:', process.env.MINIO_ENDPOINT);
  console.log('[MinIO] Bucket:', process.env.MINIO_BUCKET);
}

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

// Endpoint de login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigat�rios.' });

  try {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Usu�rio n�o encontrado.' });

    // Se n�o existir campo de senha, aceite qualquer senha para o admin inicial
    if (!user.password_hash) {
      // Opcional: crie o hash agora
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [hash, user.id]);
      user.password_hash = hash;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha inv�lida.' });

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

// Endpoint para perfil p�blico de usu�rio
app.get('/api/users/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[GET /api/users/:userId/profile] Buscando perfil p�blico para usu�rio:', userId);
    
    // Buscar dados b�sicos do usu�rio (apenas campos p�blicos)
    const userResult = await pool.query(
      'SELECT id, name, role, bio, avatar_url, created_at FROM profiles WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usu�rio n�o encontrado.' });
    }
    
    const user = userResult.rows[0];
    
    // Buscar estat�sticas do usu�rio
    const [postsResult, enrollmentsResult, forumPostsResult] = await Promise.all([
      // Posts criados na comunidade
      pool.query('SELECT COUNT(*) as count FROM posts WHERE author_id = $1', [userId]),
      // Cursos matriculados (apenas contagem)
      pool.query('SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1', [userId]),
      // Posts no f�rum
      pool.query('SELECT COUNT(*) as count FROM forum_posts WHERE author_id = $1', [userId])
    ]);
    
    const stats = {
      posts_count: parseInt(postsResult.rows[0].count),
      courses_enrolled: parseInt(enrollmentsResult.rows[0].count),
      forum_posts_count: parseInt(forumPostsResult.rows[0].count),
    };
    
    // Buscar posts recentes do usu�rio (�ltimos 5)
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
    
    console.log('[GET /api/users/:userId/profile] Perfil p�blico encontrado:', {
      id: user.id,
      name: user.name,
      stats
    });
    
    res.json(response);
  } catch (err) {
    console.error('[GET /api/users/:userId/profile] Erro ao buscar perfil p�blico:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== UPLOAD DE IMAGENS DO F�RUM =====
app.post('/api/forum/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('[POST /api/forum/upload-image] Upload de imagem iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Tipo de arquivo n�o permitido. Use JPEG, PNG, GIF ou WebP.' });
    }

    // Validar tamanho (m�ximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'Arquivo muito grande. Tamanho m�ximo: 10MB.' });
    }

    // Fazer upload para MinIO
    const result = await uploadFile(req.file, 'forum-images');
    
    console.log('[POST /api/forum/upload-image] Upload conclu�do:', result.url);
    
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

// ===== SISTEMA DE F�RUM: GET T�PICOS =====
app.get('/api/forum/topics', authenticateToken, async (req, res) => {
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

// Endpoint para atualizar perfil
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, bio, avatar_url } = req.body;
    
    // Valida��es b�sicas
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email s�o obrigat�rios.' });
    }
    
    // Verificar se o email j� existe (exceto para o usu�rio atual)
    const emailCheck = await pool.query(
      'SELECT id FROM profiles WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Este email j� est� em uso.' });
    }
    
    // Atualizar perfil
    const { rows } = await pool.query(
      'UPDATE profiles SET name = $1, email = $2, bio = $3, avatar_url = $4 WHERE id = $5 RETURNING id, name, email, role, bio, avatar_url, created_at',
      [name, email, bio || null, avatar_url || null, req.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usu�rio n�o encontrado.' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /api/profile] Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// Endpoint de cadastro de usu�rio
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha obrigat�rios.' });
  try {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (rows.length > 0) return res.status(409).json({ error: 'Email j� cadastrado.' });
    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await pool.query('INSERT INTO profiles (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)', [id, name, email, hash, 'student']);
    
    // Disparar webhook para criação de usuário
    try {
      await sendWebhook('user.created', {
        id,
        name,
        email,
        role: 'student',
        created_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook user.created:', webhookError);
    }
    
    res.status(201).json({ message: 'Usu�rio criado com sucesso.' });
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
    console.log('[POST /api/posts] Usu�rio autenticado:', req.user);

    if (!title || !content) {
      console.log('[POST /api/posts] Falha: t�tulo ou conte�do ausente');
      return res.status(400).json({ error: 'T�tulo e conte�do s�o obrigat�rios.' });
    }
    const id = crypto.randomUUID();
    const created_at = new Date();
    await pool.query(
      'INSERT INTO posts (id, title, content, author_id, category, cover_image, video_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, title, content, req.user.id, category, cover_image, video_url, created_at]
    );

    // Disparar webhook para criação de post
    try {
      await sendWebhook('post.created', {
        id,
        title,
        content,
        author_id: req.user.id,
        author_name: req.user.name,
        category,
        cover_image,
        video_url,
        created_at: created_at.toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook post.created:', webhookError);
    }

    // Criar notifica��o para moderadores/admins sobre novo post na comunidade
    try {
      const modAdminResult = await pool.query(`
        SELECT id, name
        FROM profiles
        WHERE role IN ('admin', 'instructor') AND id != $1
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
      console.error('[NOTIFICATION] Erro ao criar notifica��o de novo post da comunidade:', notificationErr);
    }

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

    // Para cada curso, buscar m�dulos e aulas e calcular total_duration
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

// Endpoint para detalhes de um curso espec�fico
app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados b�sicos do curso
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
      return res.status(404).json({ error: 'Curso n�o encontrado.' });
    }
    
    const course = rows[0];
    console.log('[GET /api/courses/:id] Dados do curso:', course);
    
    // Buscar m�dulos e aulas
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
      // Estruturar os dados dos m�dulos
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
      console.error('[GET /api/courses/:id] Erro ao calcular m�dulos/dura��o:', err);
      return res.status(500).json({ error: 'Erro ao calcular m�dulos/dura��o.' });
    }
    
    // Calcular estat�sticas
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
    console.log(`[GET /api/courses/${id}/admin] Requisi��o recebida`);
    console.log(`[GET /api/courses/${id}/admin] Usu�rio:`, req.user);
    
    // Verificar se o usu�rio � admin ou instructor
    if (!['admin', 'instructor'].includes(req.user.role)) {
      console.log(`[GET /api/courses/${id}/admin] Acesso negado para role:`, req.user.role);
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    
    // Buscar dados b�sicos do curso
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
      console.log(`[GET /api/courses/${id}/admin] Curso n�o encontrado`);
      return res.status(404).json({ error: 'Curso n�o encontrado.' });
    }
    
    const course = courseResult.rows[0];
    console.log(`[GET /api/courses/${id}/admin] Curso encontrado:`, course.title);
    
    // Buscar m�dulos e aulas
    const modulesResult = await pool.query(`
      SELECT m.id, m.title, m.module_order, m.is_visible,
             l.id as lesson_id, l.title as lesson_title, l.description as lesson_description,
             l.youtube_id, l.video_url, l.duration, l.lesson_order, l.is_visible as lesson_is_visible, l.release_days
      FROM modules m
      LEFT JOIN lessons l ON l.module_id = m.id
      WHERE m.course_id = $1
      ORDER BY m.module_order, l.lesson_order
    `, [id]);
    
    console.log(`[GET /api/courses/${id}/admin] M�dulos encontrados:`, modulesResult.rows.length);
    
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
    
    console.log(`[GET /api/courses/${id}/admin] Resposta enviada com ${modules.length} m�dulos`);
    res.json(response);
  } catch (err) {
    console.error(`[GET /api/courses/${id}/admin] Erro:`, err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para salvar dados administrativos do curso (incluindo m�dulos e aulas)
app.put('/api/courses/:id/admin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, instructor_id, modules } = req.body;
    
    // Verificar se o usu�rio � admin ou instructor
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso n�o encontrado.' });
    }
    
    // Iniciar transa��o
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Atualizar dados b�sicos do curso
      await client.query(
        'UPDATE courses SET title = $1, description = $2, instructor_id = $3 WHERE id = $4',
        [title, description, instructor_id, id]
      );
      
      // Deletar m�dulos e aulas existentes (cascade vai deletar as aulas automaticamente)
      await client.query('DELETE FROM modules WHERE course_id = $1', [id]);
      
      // Inserir novos m�dulos e aulas
      if (modules && modules.length > 0) {
        for (let i = 0; i < modules.length; i++) {
          const module = modules[i];
          const moduleId = crypto.randomUUID();
          
          // Inserir m�dulo
          await client.query(
            'INSERT INTO modules (id, course_id, title, module_order, is_visible) VALUES ($1, $2, $3, $4, $5)',
            [moduleId, id, module.title, i + 1, module.is_visible]
          );
          
          // Inserir aulas do m�dulo
          if (module.lessons && module.lessons.length > 0) {
            for (let j = 0; j < module.lessons.length; j++) {
              const lesson = module.lessons[j];
              const lessonId = crypto.randomUUID();
              
              // Log para depura��o do conte�do da aula
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

// Endpoint para dados do player de v�deo
app.get('/api/courses/:id/player', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o usu�rio est� matriculado no curso
    const enrollmentCheck = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, id]
    );
    
    if (enrollmentCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Voc� precisa estar matriculado neste curso.' });
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
      return res.status(404).json({ error: 'Curso n�o encontrado.' });
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
      // S� incluir m�dulos vis�veis
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
      
      // S� incluir aulas vis�veis
      if (row.lesson_id && row.lesson_is_visible && currentModule) {
        // Verificar se a aula deve ser liberada baseado na data de matr�cula
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
    
    // Fun��o auxiliar para buscar aulas conclu�das
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

// Endpoint para buscar matr�culas do usu�rio
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { user_id, course_id } = req.query;
    
    if (!user_id && !course_id) {
      return res.status(400).json({ error: 'user_id ou course_id � obrigat�rio.' });
    }
    
    // Buscar as matr�culas e dados b�sicos do curso
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

    // Para cada curso, buscar m�dulos e aulas e calcular total_lessons, total_duration e progresso
    const results = await Promise.all(rows.map(async (enrollment) => {
      // Buscar m�dulos e aulas do curso
      const modulesQuery = `
        SELECT m.id as module_id, m.title as module_title, m.module_order,
               l.id as lesson_id, l.title as lesson_title, l.duration
        FROM modules m
        LEFT JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = $1
        ORDER BY m.module_order, l.lesson_order
      `;
      const { rows: moduleRows } = await pool.query(modulesQuery, [enrollment.course_id]);
      // Montar estrutura de m�dulos e aulas
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
      // Calcular total de aulas e dura��o
      const total_lessons = modules.reduce((total, m) => total + m.lessons.length, 0);
      const total_duration = modules.reduce((total, m) => {
        return total + m.lessons.reduce((sum, lesson) => {
          const duration = lesson.duration ? parseInt(lesson.duration) || 0 : 0;
          return sum + duration;
        }, 0);
      }, 0);
      // Buscar aulas conclu�das pelo usu�rio
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
    console.error('[GET /api/enrollments] Erro ao buscar matr�culas:', err);
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
    // Buscar categorias mais populares baseadas nos posts existentes
    const { rows } = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM posts 
      WHERE category IS NOT NULL AND category <> ''
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 8
    `);
    
    const popularTags = rows.map(row => row.category);
    
    // Se n�o houver tags suficientes, adicionar algumas padr�o
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
    // Fallback para tags fixas em caso de erro
    res.json(['javascript', 'react', 'nodejs', 'python', 'docker', 'aws']);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Servir arquivos est�ticos do React
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para criar novo curso
app.post('/api/courses', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, level, price, thumbnail, demo_video, isPaid } = req.body;
    if (!title || !description || !level) {
      return res.status(400).json({ error: 'Campos obrigat�rios n�o preenchidos.' });
    }

    // Valida��o do pre�o baseada no tipo de curso
    let finalPrice = 0;
    if (isPaid) {
      if (!price || parseFloat(price) <= 0) {
        return res.status(400).json({ error: 'Para cursos pagos, o pre�o deve ser maior que zero.' });
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
    
    // Disparar webhook para criação de curso
    try {
      await sendWebhook('course.created', {
        id,
        title,
        description,
        level,
        price: finalPrice,
        thumbnail_url: thumbnailUrl,
        demo_video: demoVideoUrl,
        tags: category ? [category] : [],
        instructor_id: req.user.id,
        instructor_name: req.user.name,
        created_at: created_at.toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook course.created:', webhookError);
    }
    
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

// Buscar post espec�fico
app.get('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/posts/:id] Buscando post:', id);
    console.log('[GET /api/posts/:id] Usu�rio autenticado:', req.user);
    
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
      console.log('[GET /api/posts/:id] Post n�o encontrado:', id);
      return res.status(404).json({ error: 'Post n�o encontrado.' });
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
      return res.status(400).json({ error: 'T�tulo e conte�do s�o obrigat�rios.' });
    }
    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, category = $3, cover_image = $4, video_url = $5 WHERE id = $6 AND author_id = $7 RETURNING *',
      [title, content, category, cover_image, video_url, id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post n�o encontrado ou sem permiss�o.' });
    }
    
    // Disparar webhook para atualização de post
    try {
      await sendWebhook('post.updated', {
        id,
        title,
        content,
        category,
        cover_image,
        video_url,
        author_id: req.user.id,
        author_name: req.user.name,
        updated_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook post.updated:', webhookError);
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
      return res.status(404).json({ error: 'Post n�o encontrado ou sem permiss�o.' });
    }
    
    // Disparar webhook para exclusão de post
    try {
      const deletedPost = result.rows[0];
      await sendWebhook('post.deleted', {
        id: deletedPost.id,
        title: deletedPost.title,
        author_id: req.user.id,
        author_name: req.user.name,
        deleted_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook post.deleted:', webhookError);
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
      return res.status(400).json({ error: 'Campos obrigat�rios n�o preenchidos.' });
    }

    // Valida��o do pre�o baseada no tipo de curso
    let finalPrice = 0;
    if (isPaid) {
      if (!price || parseFloat(price) <= 0) {
        return res.status(400).json({ error: 'Para cursos pagos, o pre�o deve ser maior que zero.' });
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
      return res.status(404).json({ error: 'Curso n�o encontrado ou sem permiss�o.' });
    }
    
    // Disparar webhook para atualização de curso
    try {
      await sendWebhook('course.updated', {
        id,
        title,
        description,
        level,
        price: finalPrice,
        thumbnail_url: thumbnailUrl,
        demo_video: demoVideoUrl,
        tags: category ? [category] : [],
        instructor_id: req.user.id,
        instructor_name: req.user.name,
        updated_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook course.updated:', webhookError);
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
      return res.status(404).json({ error: 'Curso n�o encontrado ou sem permiss�o.' });
    }
    
    // Disparar webhook para exclusão de curso
    try {
      const deletedCourse = result.rows[0];
      await sendWebhook('course.deleted', {
        id: deletedCourse.id,
        title: deletedCourse.title,
        instructor_id: deletedCourse.instructor_id,
        deleted_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook course.deleted:', webhookError);
    }
    
    res.json({ message: 'Curso deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/courses/:id] Erro ao deletar curso:', err);
    res.status(500).json({ error: 'Erro ao deletar curso.' });
  }
});

// Editar usu�rio
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Campos obrigat�rios n�o preenchidos.' });
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
      return res.status(404).json({ error: 'Usu�rio n�o encontrado ou sem permiss�o.' });
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
    console.error('[PUT /api/users/:id] Erro ao editar usu�rio:', err);
    res.status(500).json({ error: 'Erro ao editar usu�rio.' });
  }
});

// Deletar usu�rio
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM profiles WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usu�rio n�o encontrado ou sem permiss�o.' });
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
    
    res.json({ message: 'Usu�rio deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/users/:id] Erro ao deletar usu�rio:', err);
    res.status(500).json({ error: 'Erro ao deletar usu�rio.' });
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
    
    // Verificar usu�rios
    const usersResult = await pool.query('SELECT id, name, email FROM profiles LIMIT 5');
    console.log('[GET /api/test-data] Usu�rios encontrados:', usersResult.rows);
    
    // Verificar posts
    const postsResult = await pool.query('SELECT id, title, author_id FROM posts LIMIT 5');
    console.log('[GET /api/test-data] Posts encontrados:', postsResult.rows);
    
    // Verificar cursos
    const coursesResult = await pool.query('SELECT id, title, instructor_id FROM courses LIMIT 5');
    console.log('[GET /api/test-data] Cursos encontrados:', coursesResult.rows);
    
    // Verificar matr�culas
    const enrollmentsResult = await pool.query('SELECT id, user_id, course_id FROM enrollments LIMIT 5');
    console.log('[GET /api/test-data] Matr�culas encontradas:', enrollmentsResult.rows);
    
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
    
    // Verificar se j� existem posts
    const postsCheck = await pool.query('SELECT COUNT(*) as count FROM posts');
    if (parseInt(postsCheck.rows[0].count) === 0) {
      console.log('[POST /api/test-data] Criando posts de teste...');
      
      // Criar alguns posts de teste
      const post1Id = crypto.randomUUID();
      const post2Id = crypto.randomUUID();
      
      await pool.query(
        'INSERT INTO posts (id, title, content, author_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [post1Id, 'Meu primeiro post', 'Este � o conte�do do meu primeiro post na comunidade!', req.user.id, 'geral', new Date()]
      );
      
      await pool.query(
        'INSERT INTO posts (id, title, content, author_id, category, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [post2Id, 'D�vida sobre React', 'Algu�m pode me ajudar com hooks no React?', req.user.id, 'programa��o', new Date()]
      );
      
      console.log('[POST /api/test-data] Posts criados com sucesso');
    }
    
    // Verificar se j� existem cursos
    const coursesCheck = await pool.query('SELECT COUNT(*) as count FROM courses');
    if (parseInt(coursesCheck.rows[0].count) === 0) {
      console.log('[POST /api/test-data] Criando cursos de teste...');
      
      // Criar um curso de teste
      const courseId = crypto.randomUUID();
      await pool.query(
        'INSERT INTO courses (id, title, description, level, price, instructor_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [courseId, 'Curso de React B�sico', 'Aprenda os fundamentos do React', 'Iniciante', 99.99, req.user.id, new Date()]
      );
      
      console.log('[POST /api/test-data] Curso criado com sucesso');
    }
    
    // Verificar se j� existem matr�culas
    const enrollmentsCheck = await pool.query('SELECT COUNT(*) as count FROM enrollments');
    if (parseInt(enrollmentsCheck.rows[0].count) === 0) {
      console.log('[POST /api/test-data] Criando matr�culas de teste...');
      
      // Buscar um curso para matricular
      const courseResult = await pool.query('SELECT id FROM courses LIMIT 1');
      if (courseResult.rows.length > 0) {
        const enrollmentId = crypto.randomUUID();
        await pool.query(
          'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
          [enrollmentId, req.user.id, courseResult.rows[0].id, new Date(), 25]
        );
        
        console.log('[POST /api/test-data] Matr�cula criada com sucesso');
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
        [postId, 'Post de Teste', 'Este � um post de teste criado automaticamente.', req.user.id, 'teste', new Date()]
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
    
    // Verificar se j� curtiu (para notificar apenas na primeira curtida)
    const existingLike = await pool.query(
      'SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );
    
    // Tenta inserir, ignora se j� existe
    const result = await pool.query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [postId, userId]
    );
    
    // Se foi uma nova curtida (n�o existia antes), criar notifica��o
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
        console.error('[NOTIFICATION] Erro ao criar notifica��o de curtida em post da comunidade:', notificationErr);
      }
    }
    
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

// Listar coment�rios de um post
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
    res.status(500).json({ error: 'Erro ao buscar coment�rios.' });
  }
});

// Adicionar coment�rio a um post
app.post('/api/posts/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Coment�rio n�o pode ser vazio.' });
    }
    const result = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, content.trim()]
    );

    // Disparar webhook para criação de comentário
    try {
      const comment = result.rows[0];
      await sendWebhook('comment.created', {
        id: comment.id,
        post_id: postId,
        user_id: userId,
        user_name: req.user.name,
        content: comment.content,
        created_at: comment.created_at
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook comment.created:', webhookError);
    }

    // Criar notifica��o para o autor do post sobre novo coment�rio
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
            'Novo coment�rio no seu post',
            `${userName} comentou no seu post "${postTitle}"`,
            'community_comment',
            postId,
            'community_post'
          );
        }
      }
    } catch (notificationErr) {
      console.error('[NOTIFICATION] Erro ao criar notifica��o de coment�rio em post da comunidade:', notificationErr);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /api/posts/:id/comments] Erro:', err);
    res.status(500).json({ error: 'Erro ao adicionar coment�rio.' });
  }
});

// Editar coment�rio
app.put('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Coment�rio n�o pode ser vazio.' });
    }
    const result = await pool.query(
      'UPDATE comments SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [content.trim(), id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Coment�rio n�o encontrado ou sem permiss�o.' });
    }
    
    // Disparar webhook para atualização de comentário
    try {
      const comment = result.rows[0];
      await sendWebhook('comment.updated', {
        id: comment.id,
        post_id: comment.post_id,
        user_id: userId,
        user_name: req.user.name,
        content: comment.content,
        updated_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook comment.updated:', webhookError);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/comments/:id] Erro:', err);
    res.status(500).json({ error: 'Erro ao editar coment�rio.' });
  }
});

// Deletar coment�rio
app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Coment�rio n�o encontrado ou sem permiss�o.' });
    }
    
    // Disparar webhook para exclusão de comentário
    try {
      const deletedComment = result.rows[0];
      await sendWebhook('comment.deleted', {
        id: deletedComment.id,
        post_id: deletedComment.post_id,
        user_id: userId,
        user_name: req.user.name,
        deleted_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook comment.deleted:', webhookError);
    }
    
    res.json({ message: 'Coment�rio deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/comments/:id] Erro:', err);
    res.status(500).json({ error: 'Erro ao deletar coment�rio.' });
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

// Verificar se o usu�rio favoritou
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

// Listar turmas do usu�rio
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
    console.log('[POST /api/classes] Requisi��o recebida');
    console.log('[POST /api/classes] Usu�rio autenticado:', req.user);
    console.log('[POST /api/classes] Dados recebidos:', req.body);
    
    const { course_id, instance_name, instance_description, is_public, max_students, start_date, end_date, schedule, location } = req.body;
    
    if (!course_id || !instance_name) {
      console.log('[POST /api/classes] Erro: course_id e instance_name s�o obrigat�rios');
      return res.status(400).json({ error: 'ID do curso e nome da turma s�o obrigat�rios.' });
    }
    
    // Verificar se o usu�rio � instructor ou admin
    if (!['instructor', 'admin'].includes(req.user.role)) {
      console.log('[POST /api/classes] Erro: usu�rio n�o tem permiss�o, role:', req.user.role);
      return res.status(403).json({ error: 'Apenas instrutores podem criar turmas.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [course_id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso n�o encontrado.' });
    }
    
    const id = crypto.randomUUID();
    console.log('[POST /api/classes] Criando turma com ID:', id);
    
    const { rows } = await pool.query(`
      INSERT INTO class_instances (id, course_id, instructor_id, instance_name, instance_description, is_public, max_students, start_date, end_date, schedule, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [id, course_id, req.user.id, instance_name, instance_description, is_public || false, max_students, start_date, end_date, schedule, location]);
    
    // Disparar webhook para criação de turma
    try {
      const newClass = rows[0];
      await sendWebhook('class.created', {
        id: newClass.id,
        course_id: newClass.course_id,
        instructor_id: newClass.instructor_id,
        instructor_name: req.user.name,
        instance_name: newClass.instance_name,
        instance_description: newClass.instance_description,
        is_public: newClass.is_public,
        max_students: newClass.max_students,
        start_date: newClass.start_date,
        end_date: newClass.end_date,
        schedule: newClass.schedule,
        location: newClass.location,
        created_at: newClass.created_at
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook class.created:', webhookError);
    }
    
    console.log('[POST /api/classes] Turma criada com sucesso:', rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /api/classes] Erro:', err);
    res.status(500).json({ error: 'Erro ao criar turma.' });
  }
});

// Detalhes de uma turma espec�fica
app.get('/api/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id] Buscando turma:', id);
    console.log('[GET /api/classes/:id] Usu�rio:', req.user);
    
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
      console.log('[GET /api/classes/:id] Turma n�o encontrada');
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    const classData = classResult.rows[0];
    console.log('[GET /api/classes/:id] Turma encontrada:', classData.instance_name);
    
    // Verificar se o usu�rio tem acesso � turma
    // 1. Se � o instructor da turma
    if (classData.instructor_id === req.user.id) {
      console.log('[GET /api/classes/:id] Usu�rio � o instructor da turma');
      return res.json(classData);
    }
    
    // 2. Se a turma � p�blica
    if (classData.is_public) {
      console.log('[GET /api/classes/:id] Turma � p�blica, acesso permitido');
      return res.json(classData);
    }
    
    // 3. Se o usu�rio est� matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id] Usu�rio est� matriculado na turma');
      return res.json(classData);
    }
    
    console.log('[GET /api/classes/:id] Acesso negado - usu�rio n�o tem permiss�o');
    return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    
  } catch (err) {
    console.error('[GET /api/classes/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Matricular usu�rio em turma
app.post('/api/classes/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role = 'student' } = req.body;
    
    // Verificar se o usu�rio atual � instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
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
      return res.status(400).json({ error: 'Turma est� lotada.' });
    }
    
    const enrollmentId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO class_instance_enrollments (id, class_instance_id, user_id, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (class_instance_id, user_id) 
      DO UPDATE SET status = 'active', role = $4
    `, [enrollmentId, id, user_id, role]);
    
    res.status(201).json({ message: 'Usu�rio matriculado com sucesso.' });
  } catch (err) {
    console.error('[POST /api/classes/:id/enroll] Erro:', err);
    res.status(500).json({ error: 'Erro ao matricular usu�rio.' });
  }
});

// Listar matr�culas de uma turma
app.get('/api/classes/:id/enrollments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id/enrollments] Buscando matr�culas da turma:', id);
    console.log('[GET /api/classes/:id/enrollments] Usu�rio:', req.user);
    
    // Primeiro, buscar a turma para verificar se o usu�rio � o instructor
    const classResult = await pool.query(`
      SELECT instructor_id, is_public FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      console.log('[GET /api/classes/:id/enrollments] Turma n�o encontrada');
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    const classData = classResult.rows[0];
    
    // Verificar se o usu�rio tem acesso �s matr�culas
    // 1. Se � o instructor da turma
    if (classData.instructor_id === req.user.id) {
      console.log('[GET /api/classes/:id/enrollments] Usu�rio � o instructor da turma');
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
    
    // 2. Se a turma � p�blica, permitir visualizar matr�culas
    if (classData.is_public) {
      console.log('[GET /api/classes/:id/enrollments] Turma � p�blica, acesso permitido');
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
    
    // 3. Se o usu�rio est� matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/enrollments] Usu�rio est� matriculado na turma');
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
    
    console.log('[GET /api/classes/:id/enrollments] Acesso negado - usu�rio n�o tem permiss�o');
    return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    
  } catch (err) {
    console.error('[GET /api/classes/:id/enrollments] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Criar conte�do na turma
app.post('/api/classes/:id/content', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, content_type = 'announcement', is_pinned = false } = req.body;
    
    if (!title || (!content && !req.file)) {
      return res.status(400).json({ error: 'T�tulo e conte�do ou arquivo s�o obrigat�rios.' });
    }
    
    // Verificar se a turma existe e se o usu�rio tem permiss�o
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    // Verificar se o usu�rio � o instructor da turma ou admin
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode criar conte�do.' });
    }
    
    let fileData = null;
    
    // Se h� um arquivo, fazer upload para o MinIO
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
    res.status(500).json({ error: 'Erro ao criar conte�do.' });
  }
});

// Listar conte�do de uma turma
app.get('/api/classes/:id/content', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id/content] Buscando conte�do da turma:', id);
    console.log('[GET /api/classes/:id/content] Usu�rio:', req.user);
    
    // Primeiro, buscar a turma para verificar se o usu�rio � o instructor
    const classResult = await pool.query(`
      SELECT instructor_id, is_public FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      console.log('[GET /api/classes/:id/content] Turma n�o encontrada');
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    const classData = classResult.rows[0];
    
    // Verificar se o usu�rio tem acesso ao conte�do
    // 1. Se � o instructor da turma
    if (classData.instructor_id === req.user.id) {
      console.log('[GET /api/classes/:id/content] Usu�rio � o instructor da turma');
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
    
    // 2. Se a turma � p�blica, permitir visualizar conte�do
    if (classData.is_public) {
      console.log('[GET /api/classes/:id/content] Turma � p�blica, acesso permitido');
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
    
    // 3. Se o usu�rio est� matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/content] Usu�rio est� matriculado na turma');
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
    
    console.log('[GET /api/classes/:id/content] Acesso negado - usu�rio n�o tem permiss�o');
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
    console.log('[PUT /api/classes/:id] Usu�rio:', req.user);
    
    // Verificar se a turma existe
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      console.log('[PUT /api/classes/:id] Turma n�o encontrada');
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    // Verificar se o usu�rio � o instructor da turma ou admin
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      console.log('[PUT /api/classes/:id] Acesso negado - usu�rio n�o � instructor da turma');
      return res.status(403).json({ error: 'Apenas o instructor da turma pode edit�-la.' });
    }
    
    // Validar dados obrigat�rios
    if (!instance_name || instance_name.trim().length === 0) {
      console.log('[PUT /api/classes/:id] Erro: nome da turma n�o fornecido');
      return res.status(400).json({ error: 'Nome da turma � obrigat�rio.' });
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
    console.log('[DELETE /api/classes/:id] Usu�rio:', req.user);
    
    // Verificar se a turma existe
    const classCheck = await pool.query(`
      SELECT instructor_id, instance_name FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      console.log('[DELETE /api/classes/:id] Turma n�o encontrada');
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    // Verificar se o usu�rio � o instructor da turma ou admin
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      console.log('[DELETE /api/classes/:id] Acesso negado - usu�rio n�o � instructor da turma');
      return res.status(403).json({ error: 'Apenas o instructor da turma pode exclu�-la.' });
    }
    
    const className = classCheck.rows[0].instance_name;
    
    // Excluir turma (as tabelas relacionadas ser�o exclu�das automaticamente devido ao CASCADE)
    await pool.query(`
      DELETE FROM class_instances WHERE id = $1
    `, [id]);
    
    console.log('[DELETE /api/classes/:id] Turma exclu�da com sucesso:', className);
    res.json({ message: 'Turma exclu�da com sucesso.' });
    
  } catch (err) {
    console.error('[DELETE /api/classes/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar matr�cula em curso
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    
    console.log('[POST /api/enrollments] Criando matr�cula');
    console.log('[POST /api/enrollments] course_id:', course_id);
    console.log('[POST /api/enrollments] req.user:', req.user);
    
    if (!course_id) {
      return res.status(400).json({ error: 'course_id � obrigat�rio.' });
    }

    // Verifica se j� est� matriculado
    const existing = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, course_id]
    );
    
    console.log('[POST /api/enrollments] Verifica��o de matr�cula existente:', existing.rows);
    
    if (existing.rows.length > 0) {
      console.log('[POST /api/enrollments] Usu�rio j� est� matriculado');
      return res.status(400).json({ error: 'Usu�rio j� est� matriculado.' });
    }

    const id = crypto.randomUUID();
    console.log('[POST /api/enrollments] Criando matr�cula com ID:', id);
    
    await pool.query(
      'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
      [id, req.user.id, course_id, new Date(), 0]
    );
    
    // Disparar webhook para criação de matrícula
    try {
      await sendWebhook('enrollment.created', {
        id,
        user_id: req.user.id,
        user_name: req.user.name,
        course_id,
        enrolled_at: new Date().toISOString(),
        progress: 0
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook enrollment.created:', webhookError);
    }
    
    // --- NOVA L�GICA: Matricular automaticamente em todas as turmas do curso ---
    const classInstances = await pool.query(
      'SELECT id FROM class_instances WHERE course_id = $1',
      [course_id]
    );
    for (const turma of classInstances.rows) {
      // Verifica se j� est� matriculado na turma
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
    // --- FIM DA L�GICA ---

    console.log('[POST /api/enrollments] Matr�cula criada com sucesso');
    res.status(201).json({ message: 'Matr�cula realizada com sucesso.' });
  } catch (err) {
    console.error('[POST /api/enrollments] Erro:', err);
    res.status(500).json({ error: 'Erro ao realizar matr�cula.' });
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

    // Verificar se � uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens s�o permitidas para thumbnail' });
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

// Upload de v�deo para aula
app.post('/api/upload/video', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/video] Upload de v�deo iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se � um v�deo
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ error: 'Apenas v�deos s�o permitidos' });
    }

    const result = await uploadFile(req.file, 'videos');
    
    console.log('[POST /api/upload/video] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'V�deo enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/video] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do v�deo',
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

// Upload de avatar do usu�rio
app.post('/api/upload/avatar', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/avatar] Upload de avatar iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se � uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens s�o permitidas para avatar' });
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

// Endpoint para upload de v�deo de aula
app.post('/api/upload/lesson-video', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo n�o enviado.' });
    }
    // Apenas v�deos
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ error: 'Apenas arquivos de v�deo s�o permitidos.' });
    }
    const result = await uploadFile(req.file, 'lessons');
    res.json({ url: result.url });
  } catch (err) {
    console.error('[POST /api/upload/lesson-video] Erro:', err);
    res.status(500).json({ error: 'Erro ao fazer upload do v�deo.' });
  }
});

// Endpoint para obter URL assinada do v�deo da aula
app.get('/api/lessons/:lessonId/video-url', authenticateToken, async (req, res) => {
  const { lessonId } = req.params;
  try {
    // Buscar a aula no banco
    const { rows } = await pool.query('SELECT video_url FROM lessons WHERE id = $1', [lessonId]);
    if (!rows.length || !rows[0].video_url) {
      return res.status(404).json({ error: 'V�deo n�o encontrado para esta aula.' });
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

// Endpoint para marcar aula como conclu�da
app.post('/api/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    // Verifica se j� existe
    const check = await pool.query('SELECT * FROM lesson_completions WHERE user_id = $1 AND lesson_id = $2', [userId, lessonId]);
    if (check.rows.length === 0) {
      await pool.query('INSERT INTO lesson_completions (user_id, lesson_id, completed_at) VALUES ($1, $2, NOW())', [userId, lessonId]);
      
      // Disparar webhook para conclusão de aula
      try {
        // Buscar informações da aula e curso para o webhook
        const lessonInfo = await pool.query(`
          SELECT l.title as lesson_title, l.module_id, m.course_id, m.title as module_title, c.title as course_title
          FROM lessons l
          JOIN modules m ON l.module_id = m.id
          JOIN courses c ON m.course_id = c.id
          WHERE l.id = $1
        `, [lessonId]);
        
        if (lessonInfo.rows.length > 0) {
          const lesson = lessonInfo.rows[0];
          await sendWebhook('lesson.completed', {
            user_id: userId,
            user_name: req.user.name,
            lesson_id: lessonId,
            lesson_title: lesson.lesson_title,
            module_id: lesson.module_id,
            module_title: lesson.module_title,
            course_id: lesson.course_id,
            course_title: lesson.course_title,
            completed_at: new Date().toISOString()
          });
        }
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook lesson.completed:', webhookError);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/complete]', err);
    res.status(500).json({ error: 'Erro ao marcar aula como conclu�da.' });
  }
});

// ===== SISTEMA DE COMENT�RIOS EM AULAS =====

// Buscar coment�rios de uma aula
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
    res.status(500).json({ error: 'Erro ao buscar coment�rios.' });
  }
});

// Criar coment�rio
app.post('/api/lessons/:lessonId/comments', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { content, parent_id } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conte�do do coment�rio � obrigat�rio.' });
    }

    const { rows } = await pool.query(`
      INSERT INTO lesson_comments (lesson_id, user_id, content, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [lessonId, userId, content.trim(), parent_id || null]);

    // Disparar webhook para criação de comentário em aula
    try {
      await sendWebhook('lesson_comment.created', {
        id: rows[0].id,
        lesson_id: lessonId,
        user_id: userId,
        user_name: req.user.name,
        content: content.trim(),
        parent_id: parent_id || null,
        created_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook lesson_comment.created:', webhookError);
    }

    // Criar notifica��es
    try {
      if (parent_id) {
        // � uma resposta a um coment�rio - notificar autor do coment�rio pai
        const parentCommentResult = await pool.query(`
          SELECT lc.user_id, p.name as author_name, l.title as lesson_title
          FROM lesson_comments lc
          JOIN profiles p ON lc.user_id = p.id
          JOIN lessons l ON lc.lesson_id = l.id
          WHERE lc.id = $1
        `, [parent_id]);
        
        if (parentCommentResult.rows.length > 0) {
          const { user_id: parentAuthorId, lesson_title } = parentCommentResult.rows[0];
          
          if (parentAuthorId !== userId) {
            const userName = await getUserName(req.user.id, req.user.name);
            await createNotification(
              parentAuthorId,
              'Resposta ao seu coment�rio',
              `${userName} respondeu ao seu coment�rio na aula "${lesson_title}"`,
              'reply',
              lessonId,
              'lesson'
            );
          }
        }
      } else {
        // � um coment�rio novo - notificar instrutor da aula
        const lessonInstructorResult = await pool.query(`
          SELECT c.instructor_id, p.name as instructor_name, l.title as lesson_title
          FROM lessons l
          JOIN modules m ON l.module_id = m.id
          JOIN courses c ON m.course_id = c.id
          JOIN profiles p ON c.instructor_id = p.id
          WHERE l.id = $1
        `, [lessonId]);
        
        if (lessonInstructorResult.rows.length > 0) {
          const { instructor_id: instructorId, lesson_title } = lessonInstructorResult.rows[0];
          
          if (instructorId !== userId) {
            const userName = await getUserName(req.user.id, req.user.name);
            await createNotification(
              instructorId,
              'Novo coment�rio na sua aula',
              `${userName} comentou na aula "${lesson_title}"`,
              'comment',
              lessonId,
              'lesson'
            );
          }
        }
      }
    } catch (notificationErr) {
      console.error('[NOTIFICATION] Erro ao criar notifica��o de coment�rio:', notificationErr);
    }

    res.json({ success: true, comment_id: rows[0].id });
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/comments]', err);
    res.status(500).json({ error: 'Erro ao criar coment�rio.' });
  }
});

// Atualizar coment�rio
app.put('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conte�do do coment�rio � obrigat�rio.' });
    }

    // Verificar se o coment�rio existe e pertence ao usu�rio
    const commentCheck = await pool.query(
      'SELECT id FROM lesson_comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Coment�rio n�o encontrado ou n�o autorizado.' });
    }

    // Atualizar coment�rio
    await pool.query(
      'UPDATE lesson_comments SET content = $1, updated_at = NOW() WHERE id = $2',
      [content.trim(), commentId]
    );

    // Disparar webhook para atualização de comentário em aula
    try {
      await sendWebhook('lesson_comment.updated', {
        id: commentId,
        user_id: userId,
        user_name: req.user.name,
        content: content.trim(),
        updated_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook lesson_comment.updated:', webhookError);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/comments/:commentId]', err);
    res.status(500).json({ error: 'Erro ao atualizar coment�rio.' });
  }
});

// Deletar coment�rio
app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Verificar se o coment�rio existe e pertence ao usu�rio
    const commentCheck = await pool.query(
      'SELECT id FROM lesson_comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Coment�rio n�o encontrado ou n�o autorizado.' });
    }

    // Deletar coment�rio (cascade ir� deletar respostas e curtidas)
    await pool.query('DELETE FROM lesson_comments WHERE id = $1', [commentId]);

    // Disparar webhook para exclusão de comentário em aula
    try {
      await sendWebhook('lesson_comment.deleted', {
        id: commentId,
        user_id: userId,
        user_name: req.user.name,
        deleted_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook lesson_comment.deleted:', webhookError);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/comments/:commentId]', err);
    res.status(500).json({ error: 'Erro ao deletar coment�rio.' });
  }
});

// Curtir/descurtir coment�rio
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
      
      // Criar notifica��o para o autor do coment�rio (se n�o for o mesmo usu�rio)
      try {
        const commentAuthorResult = await pool.query(`
          SELECT lc.user_id, p.name as author_name, l.title as lesson_title, lc.content
          FROM lesson_comments lc
          JOIN profiles p ON lc.user_id = p.id
          JOIN lessons l ON lc.lesson_id = l.id
          WHERE lc.id = $1
        `, [commentId]);
        
        if (commentAuthorResult.rows.length > 0) {
          const { user_id: commentAuthorId, lesson_title, content } = commentAuthorResult.rows[0];
          
          if (commentAuthorId !== userId) {
            const userName = await getUserName(req.user.id, req.user.name);
            const shortContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
            await createNotification(
              commentAuthorId,
              'Curtida no seu coment�rio',
              `${userName} curtiu seu coment�rio "${shortContent}" na aula "${lesson_title}"`,
              'like',
              commentId,
              'lesson_comment'
            );
          }
        }
      } catch (notificationErr) {
        console.error('[NOTIFICATION] Erro ao criar notifica��o de curtida em coment�rio:', notificationErr);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/comments/:commentId/like]', err);
    res.status(500).json({ error: 'Erro ao curtir coment�rio.' });
  }
});

// ===== SISTEMA DE NOTIFICA��ES =====

// Fun��o helper para criar notifica��es
async function createNotification(userId, title, message, type, referenceId = null, referenceType = null) {
  try {
    console.log('[CREATE NOTIFICATION] Tentando criar notifica��o:', {
      userId, title, message, type, referenceId, referenceType
    });
    
    const result = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING id
    `, [userId, title, message, type, referenceId, referenceType]);
    
    // Disparar webhook para criação de notificação
    try {
      await sendWebhook('notification.created', {
        id: result.rows[0].id,
        user_id: userId,
        title,
        message,
        type,
        reference_id: referenceId,
        reference_type: referenceType,
        created_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook notification.created:', webhookError);
    }
    
    console.log('[CREATE NOTIFICATION] Notifica��o criada com sucesso! ID:', result.rows[0].id);
  } catch (err) {
    console.error('[CREATE NOTIFICATION] ERRO ao criar notifica��o:', err);
    console.error('[CREATE NOTIFICATION] Par�metros:', {
      userId, title, message, type, referenceId, referenceType
    });
  }
}

// Fun��o helper para obter nome do usu�rio
async function getUserName(userId, currentUserName = null) {
  // Se j� temos o nome, usar ele
  if (currentUserName) {
    return currentUserName;
  }
  
  // Caso contr�rio, buscar no banco
  try {
    const { rows } = await pool.query('SELECT name FROM profiles WHERE id = $1', [userId]);
    return rows.length > 0 ? rows[0].name : 'Usu�rio';
  } catch (err) {
    console.error('[GET USER NAME] Erro ao buscar nome:', err);
    return 'Usu�rio';
  }
}

// Buscar notifica��es do usu�rio
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
    res.status(500).json({ error: 'Erro ao buscar notifica��es.' });
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
    res.status(500).json({ error: 'Erro ao buscar contador de notifica��es.' });
  }
});

// Marcar notifica��o como lida
app.put('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    await pool.query(`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/notifications/:id/read]', err);
    res.status(500).json({ error: 'Erro ao marcar notifica��o como lida.' });
  }
});

// Marcar todas as notifica��es como lidas
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: 'Erro ao marcar todas as notifica��es como lidas.' });
  }
});

// Deletar notifica��o espec�fica
app.delete('/api/notifications/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [notificationId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notifica��o n�o encontrada.' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/notifications/:id]', err);
    res.status(500).json({ error: 'Erro ao deletar notifica��o.' });
  }
});

// Deletar m�ltiplas notifica��es
app.delete('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'IDs das notifica��es s�o obrigat�rios.' });
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
    res.status(500).json({ error: 'Erro ao deletar notifica��es.' });
  }
});

// Deletar todas as notifica��es
app.delete('/api/notifications/all', authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: 'Erro ao deletar todas as notifica��es.' });
  }
});

// Navega��o inteligente
app.get('/api/notifications/:notificationId/navigate', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    const { rows } = await pool.query(`
      SELECT type, reference_id, reference_type
      FROM notifications 
      WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notifica��o n�o encontrada.' });
    }
    
    const { type, reference_id, reference_type } = rows[0];
    let url = '/';
    
    switch (reference_type) {
      case 'forum_post':
        url = `/forum/post/${reference_id}`;
        break;
      case 'forum_topic':
        url = `/forum/topic/${reference_id}`;
        break;
      case 'forum_reply':
        // Para respostas do f�rum, navegar para o post pai
        const forumReplyResult = await pool.query(`
          SELECT post_id FROM forum_replies WHERE id = $1
        `, [reference_id]);
        if (forumReplyResult.rows.length > 0) {
          url = `/forum/post/${forumReplyResult.rows[0].post_id}`;
        } else {
          url = '/forum';
        }
        break;
      case 'course':
        url = `/courses/${reference_id}`;
        break;
      case 'lesson':
        // Para aulas, buscar o courseId
        const lessonResult = await pool.query(`
          SELECT m.course_id FROM lessons l
          JOIN modules m ON l.module_id = m.id
          WHERE l.id = $1
        `, [reference_id]);
        if (lessonResult.rows.length > 0) {
          url = `/player?courseId=${lessonResult.rows[0].course_id}&lessonId=${reference_id}`;
        } else {
          url = '/';
        }
        break;
      case 'lesson_comment':
        // Para coment�rios de aula, navegar para a aula
        const lessonCommentResult = await pool.query(`
          SELECT lc.lesson_id, m.course_id 
          FROM lesson_comments lc
          JOIN lessons l ON lc.lesson_id = l.id
          JOIN modules m ON l.module_id = m.id
          WHERE lc.id = $1
        `, [reference_id]);
        if (lessonCommentResult.rows.length > 0) {
          const { lesson_id, course_id } = lessonCommentResult.rows[0];
          url = `/player?courseId=${course_id}&lessonId=${lesson_id}`;
        } else {
          url = '/';
        }
        break;
      case 'community_post':
        url = `/post/${reference_id}`;
        break;
      case 'class':
        url = `/classes/${reference_id}`;
        break;
      default:
        url = '/';
    }
    
    // Marcar como lida ao navegar
    await pool.query(`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);
    
    res.json({ url });
  } catch (err) {
    console.error('[GET /api/notifications/:id/navigate]', err);
    res.status(500).json({ error: 'Erro ao navegar pela notifica��o.' });
  }
});


// ===== SISTEMA DE AVALIA��ES DE CURSOS =====

// Buscar avalia��es de um curso
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
    res.status(500).json({ error: 'Erro ao buscar avalia��es.' });
  }
});

// Buscar estat�sticas de avalia��es de um curso
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
    res.status(500).json({ error: 'Erro ao buscar estat�sticas de avalia��o.' });
  }
});

// Buscar avalia��o do usu�rio atual para um curso
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
    res.status(500).json({ error: 'Erro ao buscar avalia��o do usu�rio.' });
  }
});

// Criar ou atualizar avalia��o de um curso
app.post('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Valida��es
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Avalia��o deve ser entre 1 e 5 estrelas.' });
    }

    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso n�o encontrado.' });
    }

    // Verificar se j� existe uma avalia��o do usu�rio
    const existingRating = await pool.query(
      'SELECT id FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );

    if (existingRating.rows.length > 0) {
      // Atualizar avalia��o existente
      await pool.query(
        'UPDATE course_ratings SET rating = $1, review = $2, updated_at = NOW() WHERE course_id = $3 AND user_id = $4',
        [rating, review || null, courseId, userId]
      );
    } else {
      // Criar nova avalia��o
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

// Deletar avalia��o do usu�rio
app.delete('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const { rowCount } = await pool.query(
      'DELETE FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Avalia��o n�o encontrada.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/courses/:courseId/rate]', err);
    res.status(500).json({ error: 'Erro ao deletar avalia��o.' });
  }
});

// ===== SISTEMA DE MENSAGENS =====

// Buscar conversas do usu�rio
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { rows } = await pool.query(`
      SELECT * FROM conversations_with_last_message 
      WHERE id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        WHERE user_id = $1
      )
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
    `, [userId]);

    res.json(rows);
  } catch (err) {
    console.error('[GET /api/conversations]', err);
    res.status(500).json({ error: 'Erro ao buscar conversas.' });
  }
});

// Buscar conversa espec�fica com mensagens
app.get('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Verificar se o usu�rio � participante da conversa
    const participantCheck = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a esta conversa.' });
    }

    // Buscar dados da conversa
    const conversationResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa n�o encontrada.' });
    }

    // Buscar participantes
    const participantsResult = await pool.query(`
      SELECT cp.*, p.name, p.avatar_url
      FROM conversation_participants cp
      JOIN profiles p ON cp.user_id = p.id
      WHERE cp.conversation_id = $1
    `, [id]);

    // Buscar mensagens
    const messagesResult = await pool.query(`
      SELECT * FROM messages_with_sender
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

    // Marcar mensagens como lidas
    await pool.query(`
      UPDATE conversation_participants 
      SET last_read_at = NOW()
      WHERE conversation_id = $1 AND user_id = $2
    `, [id, userId]);

    res.json({
      conversation: conversationResult.rows[0],
      participants: participantsResult.rows,
      messages: messagesResult.rows.reverse(), // Ordem cronol�gica
      hasMore: messagesResult.rows.length === parseInt(limit)
    });
  } catch (err) {
    console.error('[GET /api/conversations/:id]', err);
    res.status(500).json({ error: 'Erro ao buscar conversa.' });
  }
});

// Criar conversa direta entre dois usu�rios
app.post('/api/conversations/direct', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user.id;

    if (!otherUserId) {
      return res.status(400).json({ error: 'ID do outro usu�rio � obrigat�rio.' });
    }

    if (otherUserId === userId) {
      return res.status(400).json({ error: 'N�o � poss�vel criar conversa consigo mesmo.' });
    }

    // Verificar se o outro usu�rio existe
    const userCheck = await pool.query('SELECT 1 FROM profiles WHERE id = $1', [otherUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usu�rio n�o encontrado.' });
    }

    // Usar fun��o do banco para obter ou criar conversa
    const { rows } = await pool.query(
      'SELECT get_or_create_direct_conversation($1, $2) as conversation_id',
      [userId, otherUserId]
    );

    const conversationId = rows[0].conversation_id;
    
    // Buscar dados da conversa criada/encontrada
    const conversationData = await pool.query(`
      SELECT * FROM conversations_with_last_message WHERE id = $1
    `, [conversationId]);

    res.json(conversationData.rows[0]);
  } catch (err) {
    console.error('[POST /api/conversations/direct]', err);
    res.status(500).json({ error: 'Erro ao criar conversa.' });
  }
});

// Enviar mensagem
app.post('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { content, type = 'text', reply_to_id = null } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Conte�do da mensagem � obrigat�rio.' });
    }

    // Verificar se o usu�rio � participante da conversa
    const participantCheck = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a esta conversa.' });
    }

    // Verificar se reply_to_id existe na conversa (se fornecido)
    if (reply_to_id) {
      const replyCheck = await pool.query(
        'SELECT 1 FROM messages WHERE id = $1 AND conversation_id = $2',
        [reply_to_id, conversationId]
      );
      if (replyCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Mensagem de resposta n�o encontrada.' });
      }
    }

    // Inserir mensagem
    const messageResult = await pool.query(`
      INSERT INTO messages (conversation_id, sender_id, content, type, reply_to_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [conversationId, userId, content.trim(), type, reply_to_id]);

    const messageId = messageResult.rows[0].id;

    // Buscar mensagem completa com dados do remetente
    const fullMessage = await pool.query(`
      SELECT * FROM messages_with_sender WHERE id = $1
    `, [messageId]);

    // Buscar outros participantes para notificar
    const otherParticipants = await pool.query(`
      SELECT cp.user_id, p.name
      FROM conversation_participants cp
      JOIN profiles p ON cp.user_id = p.id
      WHERE cp.conversation_id = $1 AND cp.user_id != $2
    `, [conversationId, userId]);

    // Criar notifica��es para outros participantes
    const senderName = await getUserName(userId);
    for (const participant of otherParticipants.rows) {
      await createNotification(
        participant.user_id,
        'Nova mensagem',
        `${senderName} enviou uma mensagem`,
        'new_message',
        conversationId,
        'conversation'
      );
    }

    res.status(201).json(fullMessage.rows[0]);
  } catch (err) {
    console.error('[POST /api/conversations/:id/messages]', err);
    res.status(500).json({ error: 'Erro ao enviar mensagem.' });
  }
});

// Carregar mensagens mais antigas
app.get('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { before, limit = 20 } = req.query;
    const userId = req.user.id;

    // Verificar se o usu�rio � participante da conversa
    const participantCheck = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a esta conversa.' });
    }

    let query = `
      SELECT * FROM messages_with_sender
      WHERE conversation_id = $1
    `;
    const params = [conversationId];

    if (before) {
      query += ` AND created_at < (SELECT created_at FROM messages WHERE id = $2)`;
      params.push(before);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const { rows } = await pool.query(query, params);
    
    res.json({
      messages: rows.reverse(), // Ordem cronol�gica
      hasMore: rows.length === parseInt(limit)
    });
  } catch (err) {
    console.error('[GET /api/conversations/:id/messages]', err);
    res.status(500).json({ error: 'Erro ao carregar mensagens.' });
  }
});

// Marcar conversa como lida
app.post('/api/conversations/:id/mark-read', authenticateToken, async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.id;

    // Verificar se o usu�rio � participante da conversa
    const participantCheck = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a esta conversa.' });
    }

    // Atualizar timestamp de leitura
    await pool.query(`
      UPDATE conversation_participants 
      SET last_read_at = NOW()
      WHERE conversation_id = $1 AND user_id = $2
    `, [conversationId, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/conversations/:id/mark-read]', err);
    res.status(500).json({ error: 'Erro ao marcar como lida.' });
  }
});

// Buscar usu�rios para iniciar conversa
app.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const userId = req.user.id;

    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const { rows } = await pool.query(`
      SELECT id, name, avatar_url, role
      FROM profiles
      WHERE id != $1 
        AND (name ILIKE $2 OR email ILIKE $2)
      ORDER BY name
      LIMIT $3
    `, [userId, `%${q.trim()}%`, parseInt(limit)]);

    res.json(rows);
  } catch (err) {
    console.error('[GET /api/users/search]', err);
    res.status(500).json({ error: 'Erro ao buscar usu�rios.' });
  }
});

// Contar mensagens n�o lidas
app.get('/api/conversations/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Verificar se as tabelas existem primeiro
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'conversations'
      ) as conversations_exist,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'conversation_participants'
      ) as participants_exist,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'messages'
      ) as messages_exist
    `);

    const { conversations_exist, participants_exist, messages_exist } = tableCheck.rows[0];

    // Se as tabelas n�o existem, retornar 0
    if (!conversations_exist || !participants_exist || !messages_exist) {
      return res.json({ 
        unread_count: 0,
        total_count: 0,
        message: 'Sistema de mensagens n�o configurado'
      });
    }

    // Query simplificada para evitar erros
    const { rows } = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id)::int as unread_count,
        COUNT(DISTINCT c.id)::int as total_count
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
        AND EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.conversation_id = c.id 
            AND m.sender_id != $1
        )
    `, [userId]);

    res.json({ 
      unread_count: rows[0]?.unread_count || 0,
      total_count: rows[0]?.total_count || 0
    });
  } catch (err) {
    console.error('[GET /api/conversations/unread-count]', err);
    // Retornar resposta de sucesso com 0 em caso de erro
    res.json({ 
      unread_count: 0,
      total_count: 0,
      error: 'Erro ao contar mensagens n�o lidas.'
    });
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

// Usu�rios por role
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
    res.status(500).json({ error: 'Erro ao buscar usu�rios.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend rodando na porta ${PORT}`);
});

// Endpoint para buscar estat�sticas de um curso
app.get('/api/courses/:courseId/stats', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('[GET /api/courses/:courseId/stats] Buscando estat�sticas do curso:', courseId);
    
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
    console.error('[GET /api/courses/:courseId/stats] Erro ao buscar estat�sticas:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para buscar matr�culas do usu�rio
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { user_id, course_id } = req.query;
    
    if (!user_id && !course_id) {
      return res.status(400).json({ error: 'user_id ou course_id � obrigat�rio.' });
    }
    
    // Buscar as matr�culas e dados b�sicos do curso
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

    // Para cada curso, buscar m�dulos e aulas e calcular total_lessons, total_duration e progresso
    const results = await Promise.all(rows.map(async (enrollment) => {
      // Buscar m�dulos e aulas do curso
      const modulesQuery = `
        SELECT m.id as module_id, m.title as module_title, m.module_order,
               l.id as lesson_id, l.title as lesson_title, l.duration
        FROM modules m
        LEFT JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = $1
        ORDER BY m.module_order, l.lesson_order
      `;
      const { rows: moduleRows } = await pool.query(modulesQuery, [enrollment.course_id]);
      // Montar estrutura de m�dulos e aulas
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
      // Calcular total de aulas e dura��o
      const total_lessons = modules.reduce((total, m) => total + m.lessons.length, 0);
      const total_duration = modules.reduce((total, m) => {
        return total + m.lessons.reduce((sum, lesson) => {
          const duration = lesson.duration ? parseInt(lesson.duration) || 0 : 0;
          return sum + duration;
        }, 0);
      }, 0);
      // Buscar aulas conclu�das pelo usu�rio
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
    console.error('[GET /api/enrollments] Erro ao buscar matr�culas:', err);
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
    
    // Verificar se h� dados nas tabelas
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
    // Desabilitar cache
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '0');
    res.set('Pragma', 'no-cache');
    
    const { id } = req.params;
    
    // Buscar a turma para verificar se o usuário tem acesso
    const classResult = await pool.query(`
      SELECT instructor_id, is_public FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    const classData = classResult.rows[0];
    const query = `
      SELECT 
        cc.id,
        cc.class_id,
        cc.course_id,
        cc.is_required,
        cc.order_index,
        cc.created_at,
        c.title as course_title,
        c.description as course_description,
        c.thumbnail_url as course_thumbnail,
        c.level,
        c.price,
        p.name as instructor_name,
        p.avatar_url as instructor_avatar
      FROM class_courses cc
      JOIN courses c ON cc.course_id = c.id
      JOIN profiles p ON c.instructor_id = p.id
      WHERE cc.class_id = $1
      ORDER BY cc.order_index ASC, cc.created_at ASC
    `;
    
    // Verificar se o usuário tem acesso aos cursos
    // 1. Se é o instructor da turma
    if (classData.instructor_id === req.user.id) {
      const { rows } = await pool.query(query, [id]);
      return res.json(rows);
    }
    
    // 2. Se a turma é pública, permitir visualizar cursos
    if (classData.is_public) {
      const { rows } = await pool.query(query, [id]);
      return res.json(rows);
    }
    
    // 3. Se o usuário está matriculado na turma
    const enrollmentCheck = await pool.query(`
      SELECT 1 FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      const { rows } = await pool.query(query, [id]);
      return res.json(rows);
    }
    
    return res.status(403).json({ error: 'Acesso negado a esta turma.' });
    
  } catch (err) {
    console.error('[GET /api/classes/:id/courses] === ERRO ===');
    console.error('[GET /api/classes/:id/courses] Erro:', err);
    console.error('[GET /api/classes/:id/courses] Stack:', err.stack);
    console.error('[GET /api/classes/:id/courses] === FIM DO ERRO ===');
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Adicionar curso � turma
app.post('/api/classes/:id/courses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { course_id, is_required = false, order_index } = req.body;
    
    console.log('[POST /api/classes/:id/courses] Adicionando curso � turma:', id);
    console.log('[POST /api/classes/:id/courses] Dados recebidos:', req.body);
    console.log('[POST /api/classes/:id/courses] Usu�rio:', req.user);
    
    if (!course_id) {
      console.log('[POST /api/classes/:id/courses] Erro: course_id n�o fornecido');
      return res.status(400).json({ error: 'course_id � obrigat�rio.' });
    }
    
    // Verificar se o usu�rio � instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      console.log('[POST /api/classes/:id/courses] Erro: Turma n�o encontrada');
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    console.log('[POST /api/classes/:id/courses] Instructor da turma:', classCheck.rows[0].instructor_id);
    console.log('[POST /api/classes/:id/courses] Usu�rio atual:', req.user.id);
    console.log('[POST /api/classes/:id/courses] Role do usu�rio:', req.user.role);
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      console.log('[POST /api/classes/:id/courses] Erro: Acesso negado');
      return res.status(403).json({ error: 'Apenas o instructor da turma pode adicionar cursos.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [course_id]);
    if (courseCheck.rows.length === 0) {
      console.log('[POST /api/classes/:id/courses] Erro: Curso n�o encontrado');
      return res.status(404).json({ error: 'Curso n�o encontrado.' });
    }
    
    // Verificar se o curso j� est� na turma
    const existingCheck = await pool.query(`
      SELECT id FROM class_courses WHERE class_id = $1 AND course_id = $2
    `, [id, course_id]);
    
    if (existingCheck.rows.length > 0) {
      console.log('[POST /api/classes/:id/courses] Erro: Curso j� est� na turma');
      return res.status(400).json({ error: 'Este curso j� est� associado � turma.' });
    }
    
    // Determinar a ordem do curso
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const maxOrderResult = await pool.query(`
        SELECT COALESCE(MAX(order_index), -1) as max_order FROM class_courses WHERE class_id = $1
      `, [id]);
      finalOrderIndex = maxOrderResult.rows[0].max_order + 1;
    }
    
    console.log('[POST /api/classes/:id/courses] Ordem final:', finalOrderIndex);
    
    const courseClassId = crypto.randomUUID();
    const { rows } = await pool.query(`
      INSERT INTO class_courses (id, class_id, course_id, is_required, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [courseClassId, id, course_id, is_required, finalOrderIndex]);
    
    console.log('[POST /api/classes/:id/courses] Curso adicionado com sucesso:', rows[0]);
    res.status(201).json(rows[0]);
    
  } catch (err) {
    console.error('[POST /api/classes/:id/courses] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Atualizar configura��es de um curso na turma
app.put('/api/classes/:id/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { id, courseId } = req.params;
    const { is_required, order_index } = req.body;
    
    console.log('[PUT /api/classes/:id/courses/:courseId] Atualizando curso da turma');
    console.log('[PUT /api/classes/:id/courses/:courseId] Dados recebidos:', req.body);
    console.log('[PUT /api/classes/:id/courses/:courseId] Usu�rio:', req.user);
    
    // Verificar se o usu�rio � instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode editar cursos.' });
    }
    
    // Verificar se o curso est� na turma
    const courseCheck = await pool.query(`
      SELECT id FROM class_courses WHERE class_id = $1 AND course_id = $2
    `, [id, courseId]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso n�o encontrado na turma.' });
    }
    
    // Atualizar configura��es
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
      WHERE class_id = $${paramIndex} AND course_id = $${paramIndex + 1}
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
    console.log('[DELETE /api/classes/:id/courses/:courseId] Usu�rio:', req.user);
    
    // Verificar se o usu�rio � instructor da turma ou admin
    const classCheck = await pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma n�o encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode remover cursos.' });
    }
    
    // Verificar se o curso est� na turma
    const courseCheck = await pool.query(`
      SELECT id, is_required FROM class_courses WHERE class_id = $1 AND course_id = $2
    `, [id, courseId]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso n�o encontrado na turma.' });
    }
    
    // N�o permitir remover o curso obrigat�rio (primeiro curso)
    if (courseCheck.rows[0].is_required) {
      return res.status(400).json({ error: 'N�o � poss�vel remover o curso obrigat�rio da turma.' });
    }
    
    // Remover o curso
    await pool.query(`
      DELETE FROM class_courses WHERE class_id = $1 AND course_id = $2
    `, [id, courseId]);
    
    console.log('[DELETE /api/classes/:id/courses/:courseId] Curso removido com sucesso');
    res.json({ message: 'Curso removido da turma com sucesso.' });
    
  } catch (err) {
    console.error('[DELETE /api/classes/:id/courses/:courseId] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar matr�cula em curso
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    
    console.log('[POST /api/enrollments] Criando matr�cula');
    console.log('[POST /api/enrollments] course_id:', course_id);
    console.log('[POST /api/enrollments] req.user:', req.user);
    
    if (!course_id) {
      return res.status(400).json({ error: 'course_id � obrigat�rio.' });
    }

    // Verifica se j� est� matriculado
    const existing = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, course_id]
    );
    
    console.log('[POST /api/enrollments] Verifica��o de matr�cula existente:', existing.rows);
    
    if (existing.rows.length > 0) {
      console.log('[POST /api/enrollments] Usu�rio j� est� matriculado');
      return res.status(400).json({ error: 'Usu�rio j� est� matriculado.' });
    }

    const id = crypto.randomUUID();
    console.log('[POST /api/enrollments] Criando matr�cula com ID:', id);
    
    await pool.query(
      'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
      [id, req.user.id, course_id, new Date(), 0]
    );
    
    // --- NOVA L�GICA: Matricular automaticamente em todas as turmas do curso ---
    const classInstances = await pool.query(
      'SELECT id FROM class_instances WHERE course_id = $1',
      [course_id]
    );
    for (const turma of classInstances.rows) {
      // Verifica se j� est� matriculado na turma
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
    // --- FIM DA L�GICA ---

    console.log('[POST /api/enrollments] Matr�cula criada com sucesso');
    res.status(201).json({ message: 'Matr�cula realizada com sucesso.' });
  } catch (err) {
    console.error('[POST /api/enrollments] Erro:', err);
    res.status(500).json({ error: 'Erro ao realizar matr�cula.' });
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

    // Verificar se � uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens s�o permitidas para thumbnail' });
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

// Upload de v�deo para aula
app.post('/api/upload/video', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/video] Upload de v�deo iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se � um v�deo
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ error: 'Apenas v�deos s�o permitidos' });
    }

    const result = await uploadFile(req.file, 'videos');
    
    console.log('[POST /api/upload/video] Upload realizado:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      message: 'V�deo enviado com sucesso!'
    });
  } catch (error) {
    console.error('[POST /api/upload/video] Erro:', error);
    res.status(500).json({ 
      error: 'Erro no upload do v�deo',
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

// Upload de avatar do usu�rio
app.post('/api/upload/avatar', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('[POST /api/upload/avatar] Upload de avatar iniciado');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se � uma imagem
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Apenas imagens s�o permitidas para avatar' });
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

// Endpoint para upload de v�deo de aula
app.post('/api/upload/lesson-video', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo n�o enviado.' });
    }
    // Apenas v�deos
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ error: 'Apenas arquivos de v�deo s�o permitidos.' });
    }
    const result = await uploadFile(req.file, 'lessons');
    res.json({ url: result.url });
  } catch (err) {
    console.error('[POST /api/upload/lesson-video] Erro:', err);
    res.status(500).json({ error: 'Erro ao fazer upload do v�deo.' });
  }
});

// Endpoint para obter URL assinada do v�deo da aula
app.get('/api/lessons/:lessonId/video-url', authenticateToken, async (req, res) => {
  const { lessonId } = req.params;
  try {
    // Buscar a aula no banco
    const { rows } = await pool.query('SELECT video_url FROM lessons WHERE id = $1', [lessonId]);
    if (!rows.length || !rows[0].video_url) {
      return res.status(404).json({ error: 'V�deo n�o encontrado para esta aula.' });
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

// Endpoint para marcar aula como conclu�da
app.post('/api/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    // Verifica se j� existe
    const check = await pool.query('SELECT * FROM lesson_completions WHERE user_id = $1 AND lesson_id = $2', [userId, lessonId]);
    if (check.rows.length === 0) {
      await pool.query('INSERT INTO lesson_completions (user_id, lesson_id, completed_at) VALUES ($1, $2, NOW())', [userId, lessonId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/complete]', err);
    res.status(500).json({ error: 'Erro ao marcar aula como conclu�da.' });
  }
});

// ===== SISTEMA DE COMENT�RIOS EM AULAS =====
// (Endpoints implementados anteriormente na linha 2363)

// Buscar avalia��es de um curso
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
    res.status(500).json({ error: 'Erro ao buscar avalia��es.' });
  }
});

// Buscar estat�sticas de avalia��es de um curso
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
    res.status(500).json({ error: 'Erro ao buscar estat�sticas de avalia��o.' });
  }
});

// Buscar avalia��o do usu�rio atual para um curso
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
    res.status(500).json({ error: 'Erro ao buscar avalia��o do usu�rio.' });
  }
});

// Criar ou atualizar avalia��o de um curso
app.post('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Valida��es
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Avalia��o deve ser entre 1 e 5 estrelas.' });
    }

    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso n�o encontrado.' });
    }

    // Verificar se j� existe uma avalia��o do usu�rio
    const existingRating = await pool.query(
      'SELECT id FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );

    if (existingRating.rows.length > 0) {
      // Atualizar avalia��o existente
      await pool.query(
        'UPDATE course_ratings SET rating = $1, review = $2, updated_at = NOW() WHERE course_id = $3 AND user_id = $4',
        [rating, review || null, courseId, userId]
      );
    } else {
      // Criar nova avalia��o
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

// Deletar avalia��o do usu�rio
app.delete('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const { rowCount } = await pool.query(
      'DELETE FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Avalia��o n�o encontrada.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/courses/:courseId/rate]', err);
    res.status(500).json({ error: 'Erro ao deletar avalia��o.' });
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

// Usu�rios por role
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
    res.status(500).json({ error: 'Erro ao buscar usu�rios.' });
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
    
    // Verificar se a fun��o existe
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

// Endpoint de teste para verificar a view class_courses_with_details
app.get('/api/test/class-courses-view', authenticateToken, async (req, res) => {
  try {
    console.log('[GET /api/test/class-courses-view] Testando view class_courses_with_details');
    
    // Verificar se a view existe
    const viewCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'class_courses_with_details' AND table_schema = 'public'
    `);
    
    if (viewCheck.rows.length === 0) {
      return res.status(500).json({ error: 'View class_courses_with_details n�o existe' });
    }
    
    // Testar a view
    const { rows } = await pool.query('SELECT COUNT(*) as total FROM class_courses_with_details');
    
    res.json({
      message: 'View class_courses_with_details est� funcionando',
      total_records: rows[0].total,
      view_exists: true
    });
  } catch (err) {
    console.error('[GET /api/test/class-courses-view] Erro:', err);
    res.status(500).json({ error: 'Erro ao testar view', details: err.message });
  }
});

// Endpoint para verificar status da tabela class_courses
app.get('/api/test/class-courses-table', authenticateToken, async (req, res) => {
  try {
    console.log('[GET /api/test/class-courses-table] Verificando tabela class_courses');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'class_courses' AND table_schema = 'public'
    `);
    
    if (tableCheck.rows.length === 0) {
      return res.status(500).json({ error: 'Tabela class_courses n�o existe' });
    }
    
    // Contar registros
    const countResult = await pool.query('SELECT COUNT(*) as total FROM class_courses');
    
    // Verificar estrutura
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'class_courses' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    res.json({
      message: 'Tabela class_courses est� funcionando',
      table_exists: true,
      total_records: countResult.rows[0].total,
      structure: structureResult.rows
    });
  } catch (err) {
    console.error('[GET /api/test/class-courses-table] Erro:', err);
    res.status(500).json({ error: 'Erro ao verificar tabela', details: err.message });
  }
});

// Endpoint para testar dados da tabela class_courses
app.get('/api/test/class-courses-data', authenticateToken, async (req, res) => {
  try {
    console.log('[GET /api/test/class-courses-data] Testando dados da tabela class_courses');
    
    // Verificar se h� dados na tabela
    const countResult = await pool.query('SELECT COUNT(*) as total FROM class_courses');
    
    // Buscar alguns registros de exemplo
    const sampleResult = await pool.query(`
      SELECT 
        cc.id,
        cc.class_instance_id,
        cc.course_id,
        cc.is_required,
        cc.order_index,
        c.title as course_title,
        ci.instance_name as class_name
      FROM class_courses cc
      JOIN courses c ON cc.course_id = c.id
      JOIN class_instances ci ON cc.class_instance_id = ci.id
      LIMIT 5
    `);
    
    res.json({
      message: 'Dados da tabela class_courses',
      total_records: countResult.rows[0].total,
      sample_data: sampleResult.rows
    });
  } catch (err) {
    console.error('[GET /api/test/class-courses-data] Erro:', err);
    res.status(500).json({ error: 'Erro ao verificar dados', details: err.message });
  }
});

// ===== SISTEMA DE F�RUM =====

// Criar novo t�pico (apenas admin/instructor)
app.post('/api/forum/topics', authenticateToken, async (req, res) => {
  try {
    const { title, description, order_index = 0, cover_image_url, banner_image_url } = req.body;
    
    console.log('[POST /api/forum/topics] Criando t�pico:', title);
    console.log('[POST /api/forum/topics] Usu�rio:', req.user);
    
    // Verificar permiss�o
    if (!['admin', 'instructor'].includes(req.user.role)) {
      console.log('[POST /api/forum/topics] Acesso negado para role:', req.user.role);
      return res.status(403).json({ error: 'Apenas administradores e instrutores podem criar t�picos.' });
    }
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'T�tulo � obrigat�rio.' });
    }
    
    // Gerar slug �nico
    const baseSlug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Verificar se slug j� existe
    while (true) {
      const existingSlug = await pool.query('SELECT id FROM forum_topics WHERE slug = $1', [slug]);
      if (existingSlug.rows.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    const id = crypto.randomUUID();
    const { rows } = await pool.query(`
      INSERT INTO forum_topics (id, title, description, slug, order_index, created_by, cover_image_url, banner_image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, title.trim(), description?.trim() || null, slug, order_index, req.user.id, cover_image_url || null, banner_image_url || null]);
    
    console.log('[POST /api/forum/topics] T�pico criado com sucesso:', rows[0].title);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /api/forum/topics] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Editar t�pico (apenas admin/instructor ou criador)
app.put('/api/forum/topics/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order_index, cover_image_url, banner_image_url } = req.body;
    
    console.log('[PUT /api/forum/topics/:id] Editando t�pico:', id);
    console.log('[PUT /api/forum/topics/:id] Usu�rio:', req.user);
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'T�tulo � obrigat�rio.' });
    }
    
    // Verificar se o t�pico existe
    const topicCheck = await pool.query(`
      SELECT * FROM forum_topics WHERE id = $1
    `, [id]);
    
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'T�pico n�o encontrado.' });
    }
    
    const topic = topicCheck.rows[0];
    
    // Verificar permiss�o (admin, instructor ou criador do t�pico)
    if (!['admin', 'instructor'].includes(req.user.role) && topic.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Voc� n�o tem permiss�o para editar este t�pico.' });
    }
    
    // Gerar novo slug se o t�tulo mudou
    let slug = topic.slug;
    if (title.trim() !== topic.title) {
      const baseSlug = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
      
      slug = baseSlug;
      let counter = 1;
      
      // Verificar se slug j� existe (excluindo o t�pico atual)
      while (true) {
        const existingSlug = await pool.query('SELECT id FROM forum_topics WHERE slug = $1 AND id != $2', [slug, id]);
        if (existingSlug.rows.length === 0) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }
    
    const { rows } = await pool.query(`
      UPDATE forum_topics 
      SET title = $1, description = $2, slug = $3, order_index = $4, cover_image_url = $5, banner_image_url = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [title.trim(), description?.trim() || null, slug, order_index || topic.order_index, cover_image_url || null, banner_image_url || null, id]);
    
    console.log('[PUT /api/forum/topics/:id] T�pico editado com sucesso:', rows[0].title);
    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /api/forum/topics/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Excluir t�pico (apenas admin/instructor ou criador)
app.delete('/api/forum/topics/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[DELETE /api/forum/topics/:id] Excluindo t�pico:', id);
    console.log('[DELETE /api/forum/topics/:id] Usu�rio:', req.user);
    
    // Verificar se o t�pico existe
    const topicCheck = await pool.query(`
      SELECT * FROM forum_topics WHERE id = $1
    `, [id]);
    
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'T�pico n�o encontrado.' });
    }
    
    const topic = topicCheck.rows[0];
    
    // Verificar permiss�o (admin, instructor ou criador do t�pico)
    if (!['admin', 'instructor'].includes(req.user.role) && topic.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Voc� n�o tem permiss�o para excluir este t�pico.' });
    }
    
    // Verificar se h� posts no t�pico
    const postsCheck = await pool.query(`
      SELECT COUNT(*) as count FROM forum_posts WHERE topic_id = $1
    `, [id]);
    
    const postsCount = parseInt(postsCheck.rows[0].count);
    
    if (postsCount > 0) {
      return res.status(400).json({ 
        error: `N�o � poss�vel excluir o t�pico. Ele possui ${postsCount} post(s). Remova todos os posts primeiro.` 
      });
    }
    
    await pool.query(`
      DELETE FROM forum_topics WHERE id = $1
    `, [id]);
    
    console.log('[DELETE /api/forum/topics/:id] T�pico exclu�do com sucesso:', topic.title);
    res.json({ message: 'T�pico exclu�do com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/forum/topics/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Listar posts de um t�pico
app.get('/api/forum/topics/:slug/posts', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20, sort = 'latest' } = req.query;
    
    console.log('[GET /api/forum/topics/:slug/posts] Buscando posts do t�pico:', slug);
    
    // Verificar se o t�pico existe
    const topicResult = await pool.query(`
      SELECT ft.*, p.name as created_by_name
      FROM forum_topics ft
      JOIN profiles p ON ft.created_by = p.id
      WHERE ft.slug = $1 AND ft.is_active = true
    `, [slug]);
    
    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: 'T�pico n�o encontrado.' });
    }
    
    const topic = topicResult.rows[0];
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir query de ordena��o
    let orderClause = 'ORDER BY fp.is_pinned DESC, fp.created_at DESC';
    if (sort === 'popular') {
      orderClause = 'ORDER BY fp.is_pinned DESC, fp.view_count DESC, fp.created_at DESC';
    } else if (sort === 'replies') {
      orderClause = 'ORDER BY fp.is_pinned DESC, replies_count DESC, fp.created_at DESC';
    }
    
    const { rows } = await pool.query(`
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
        array_agg(DISTINCT ft.name) as tags
      FROM forum_posts fp
      JOIN profiles p ON fp.author_id = p.id
      LEFT JOIN forum_post_tags fpt ON fp.id = fpt.post_id
      LEFT JOIN forum_tags ft ON fpt.tag_id = ft.id
      WHERE fp.topic_id = $2
      GROUP BY fp.id, p.name, p.avatar_url, p.role
      ${orderClause}
      LIMIT $3 OFFSET $4
    `, [req.user.id, topic.id, parseInt(limit), offset]);
    
    // Contar total de posts
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM forum_posts WHERE topic_id = $1
    `, [topic.id]);
    
    console.log('[GET /api/forum/topics/:slug/posts] Posts encontrados:', rows.length);
    
    res.json({
      topic,
      posts: rows,
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

// Criar novo post
app.post('/api/forum/posts', authenticateToken, async (req, res) => {
  try {
    const { topic_id, title, content, tags = [], content_image_url } = req.body;
    
    console.log('[POST /api/forum/posts] Criando post:', title);
    console.log('[POST /api/forum/posts] Usu�rio:', req.user);
    
    if (!topic_id || !title || !content) {
      return res.status(400).json({ error: 'T�pico, t�tulo e conte�do s�o obrigat�rios.' });
    }
    
    // Verificar se o t�pico existe e est� ativo
    const topicCheck = await pool.query(`
      SELECT id FROM forum_topics WHERE id = $1 AND is_active = true
    `, [topic_id]);
    
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'T�pico n�o encontrado ou inativo.' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const postId = crypto.randomUUID();
      
      // Inserir post
      const postResult = await client.query(`
        INSERT INTO forum_posts (id, topic_id, title, content, author_id, content_image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [postId, topic_id, title.trim(), content.trim(), req.user.id, req.body.content_image_url || null]);
      
      // Inserir tags se fornecidas
      if (tags.length > 0) {
        for (const tagName of tags) {
          // Verificar se tag existe, se n�o, criar
          let tagResult = await client.query('SELECT id FROM forum_tags WHERE name = $1', [tagName]);
          let tagId;
          
          if (tagResult.rows.length === 0) {
            const newTagResult = await client.query(`
              INSERT INTO forum_tags (name) VALUES ($1) RETURNING id
            `, [tagName]);
            tagId = newTagResult.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
          }
          
          // Associar tag ao post
          await client.query(`
            INSERT INTO forum_post_tags (post_id, tag_id) VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [postId, tagId]);
        }
      }
      
      await client.query('COMMIT');
      
      // Disparar webhook para criação de post no fórum
      try {
        const newPost = postResult.rows[0];
        await sendWebhook('post.created', {
          id: newPost.id,
          topic_id: newPost.topic_id,
          title: newPost.title,
          content: newPost.content,
          author_id: newPost.author_id,
          author_name: req.user.name,
          content_image_url: newPost.content_image_url,
          created_at: newPost.created_at
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook post.created (forum):', webhookError);
      }
      
      // Criar notifica��o para moderadores/admins sobre novo post
      try {
        const modAdminResult = await pool.query(`
          SELECT id, name
          FROM profiles
          WHERE role IN ('admin', 'instructor') AND id != $1
        `, [req.user.id]);
        
        const topicResult = await pool.query(`
          SELECT title FROM forum_topics WHERE id = $1
        `, [topic_id]);
        
        if (topicResult.rows.length > 0) {
          const topicTitle = topicResult.rows[0].title;
          
          const userName = await getUserName(req.user.id, req.user.name);
          for (const moderator of modAdminResult.rows) {
            await createNotification(
              moderator.id,
              'Novo post no f�rum',
              `${userName} criou um novo post "${title}" no t�pico "${topicTitle}"`,
              'forum_new_post',
              postResult.rows[0].id,
              'forum_post'
            );
          }
        }
      } catch (notificationErr) {
        console.error('[NOTIFICATION] Erro ao criar notifica��o de novo post:', notificationErr);
      }
      
      console.log('[POST /api/forum/posts] Post criado com sucesso:', postResult.rows[0].title);
      res.status(201).json(postResult.rows[0]);
      
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

// Buscar post espec�fico com respostas
app.get('/api/forum/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[GET /api/forum/posts/:id] Buscando post:', id);
    
    // Buscar dados do post
    const postResult = await pool.query(`
      SELECT 
        fp.*,
        p.name as author_name,
        p.avatar_url as author_avatar,
        p.role as author_role,
        ft.title as topic_title,
        ft.slug as topic_slug,
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
      return res.status(404).json({ error: 'Post n�o encontrado.' });
    }
    
    const post = postResult.rows[0];
    
    // Incrementar contador de visualiza��es
    await pool.query(`
      UPDATE forum_posts SET view_count = view_count + 1 WHERE id = $1
    `, [id]);
    
    // Buscar respostas
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
    
    console.log('[GET /api/forum/posts/:id] Post e respostas encontrados');
    
    res.json({
      post,
      replies: repliesResult.rows
    });
    
  } catch (err) {
    console.error('[GET /api/forum/posts/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Criar resposta
app.post('/api/forum/posts/:id/replies', authenticateToken, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { content, parent_reply_id } = req.body;
    
    console.log('[POST /api/forum/posts/:id/replies] Criando resposta');
    console.log('[POST /api/forum/posts/:id/replies] Usu�rio:', req.user);
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conte�do � obrigat�rio.' });
    }
    
    // Verificar se o post existe e n�o est� bloqueado
    const postCheck = await pool.query(`
      SELECT id, is_locked FROM forum_posts WHERE id = $1
    `, [postId]);
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post n�o encontrado.' });
    }
    
    if (postCheck.rows[0].is_locked) {
      return res.status(400).json({ error: 'Este post est� bloqueado para novas respostas.' });
    }
    
    const replyId = crypto.randomUUID();
    const { rows } = await pool.query(`
      INSERT INTO forum_replies (id, post_id, parent_reply_id, content, author_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [replyId, postId, parent_reply_id || null, content.trim(), req.user.id]);
    
    // Disparar webhook para criação de resposta no fórum
    try {
      const newReply = rows[0];
      await sendWebhook('forum_reply.created', {
        id: newReply.id,
        post_id: newReply.post_id,
        parent_reply_id: newReply.parent_reply_id,
        content: newReply.content,
        author_id: newReply.author_id,
        author_name: req.user.name,
        created_at: newReply.created_at
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook forum_reply.created:', webhookError);
    }
    
    // Criar notifica��o para o autor do post (se n�o for o mesmo usu�rio)
    try {
      const postAuthorResult = await pool.query(`
        SELECT fp.author_id, fp.title, p.name as author_name
        FROM forum_posts fp
        JOIN profiles p ON fp.author_id = p.id
        WHERE fp.id = $1
      `, [postId]);
      
      if (postAuthorResult.rows.length > 0) {
        const { author_id: postAuthorId, title: postTitle, author_name } = postAuthorResult.rows[0];
        
        if (postAuthorId !== req.user.id) {
          const userName = await getUserName(req.user.id, req.user.name);
          await createNotification(
            postAuthorId,
            'Nova resposta no seu post',
            `${userName} respondeu ao seu post "${postTitle}"`,
            'forum_reply',
            postId,
            'forum_post'
          );
        }
      }
    } catch (notificationErr) {
      console.error('[NOTIFICATION] Erro ao criar notifica��o de resposta:', notificationErr);
    }
    
    console.log('[POST /api/forum/posts/:id/replies] Resposta criada com sucesso');
    res.status(201).json(rows[0]);
    
  } catch (err) {
    console.error('[POST /api/forum/posts/:id/replies] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Curtir/descurtir post
app.post('/api/forum/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user.id;
    
    const likeCheck = await pool.query(`
      SELECT id FROM forum_post_likes WHERE post_id = $1 AND user_id = $2
    `, [postId, userId]);
    
    if (likeCheck.rows.length > 0) {
      // Remover curtida
      await pool.query(`
        DELETE FROM forum_post_likes WHERE post_id = $1 AND user_id = $2
      `, [postId, userId]);
    } else {
      // Adicionar curtida
      await pool.query(`
        INSERT INTO forum_post_likes (post_id, user_id) VALUES ($1, $2)
      `, [postId, userId]);
      
      // Criar notifica��o para o autor do post (se n�o for o mesmo usu�rio)
      try {
        const postAuthorResult = await pool.query(`
          SELECT fp.author_id, fp.title, p.name as author_name
          FROM forum_posts fp
          JOIN profiles p ON fp.author_id = p.id
          WHERE fp.id = $1
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
              'forum_post'
            );
          }
        }
      } catch (notificationErr) {
        console.error('[NOTIFICATION] Erro ao criar notifica��o de curtida:', notificationErr);
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/forum/posts/:id/like] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Favoritar/desfavoritar post
app.post('/api/forum/posts/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user.id;
    
    const favoriteCheck = await pool.query(`
      SELECT id FROM forum_post_favorites WHERE post_id = $1 AND user_id = $2
    `, [postId, userId]);
    
    if (favoriteCheck.rows.length > 0) {
      // Remover dos favoritos
      await pool.query(`
        DELETE FROM forum_post_favorites WHERE post_id = $1 AND user_id = $2
      `, [postId, userId]);
    } else {
      // Adicionar aos favoritos
      await pool.query(`
        INSERT INTO forum_post_favorites (post_id, user_id) VALUES ($1, $2)
      `, [postId, userId]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/forum/posts/:id/favorite] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Curtir/descurtir resposta
app.post('/api/forum/replies/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id: replyId } = req.params;
    const userId = req.user.id;
    
    const likeCheck = await pool.query(`
      SELECT id FROM forum_reply_likes WHERE reply_id = $1 AND user_id = $2
    `, [replyId, userId]);
    
    if (likeCheck.rows.length > 0) {
      // Remover curtida
      await pool.query(`
        DELETE FROM forum_reply_likes WHERE reply_id = $1 AND user_id = $2
      `, [replyId, userId]);
    } else {
      // Adicionar curtida
      await pool.query(`
        INSERT INTO forum_reply_likes (reply_id, user_id) VALUES ($1, $2)
      `, [replyId, userId]);
      
      // Criar notifica��o para o autor da resposta (se n�o for o mesmo usu�rio)
      try {
        const replyAuthorResult = await pool.query(`
          SELECT fr.author_id, fr.content, p.name as author_name,
                 fp.title as post_title
          FROM forum_replies fr
          JOIN profiles p ON fr.author_id = p.id
          JOIN forum_posts fp ON fr.post_id = fp.id
          WHERE fr.id = $1
        `, [replyId]);
        
        if (replyAuthorResult.rows.length > 0) {
          const { author_id: replyAuthorId, post_title, content } = replyAuthorResult.rows[0];
          
          if (replyAuthorId !== userId) {
            const userName = await getUserName(req.user.id, req.user.name);
            const shortContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
            await createNotification(
              replyAuthorId,
              'Curtida na sua resposta',
              `${userName} curtiu sua resposta "${shortContent}" no post "${post_title}"`,
              'like',
              replyId,
              'forum_reply'
            );
          }
        }
      } catch (notificationErr) {
        console.error('[NOTIFICATION] Erro ao criar notifica��o de curtida em resposta:', notificationErr);
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/forum/replies/:id/like] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Editar coment�rio/resposta do f�rum
app.put('/api/forum/replies/:id', authenticateToken, async (req, res) => {
  try {
    const { id: replyId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    console.log('[PUT /api/forum/replies/:id] Editando resposta:', replyId);
    console.log('[PUT /api/forum/replies/:id] Usu�rio:', req.user);
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conte�do da resposta � obrigat�rio.' });
    }
    
    // Verificar se a resposta existe e se o usu�rio tem permiss�o para editar
    const replyCheck = await pool.query(`
      SELECT author_id FROM forum_replies WHERE id = $1
    `, [replyId]);
    
    if (replyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Resposta n�o encontrada.' });
    }
    
    const reply = replyCheck.rows[0];
    
    // Verificar permiss�es (apenas autor ou admin podem editar)
    if (reply.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Voc� n�o tem permiss�o para editar esta resposta.' });
    }
    
    // Atualizar a resposta
    await pool.query(`
      UPDATE forum_replies 
      SET content = $1, updated_at = NOW() 
      WHERE id = $2
    `, [content.trim(), replyId]);
    
    // Disparar webhook para atualização de resposta no fórum
    try {
      await sendWebhook('forum_reply.updated', {
        id: replyId,
        content: content.trim(),
        author_id: req.user.id,
        author_name: req.user.name,
        updated_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook forum_reply.updated:', webhookError);
    }
    
    console.log('[PUT /api/forum/replies/:id] Resposta editada com sucesso');
    res.json({ success: true, message: 'Resposta editada com sucesso.' });
    
  } catch (err) {
    console.error('[PUT /api/forum/replies/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Deletar coment�rio/resposta do f�rum
app.delete('/api/forum/replies/:id', authenticateToken, async (req, res) => {
  try {
    const { id: replyId } = req.params;
    const userId = req.user.id;
    
    console.log('[DELETE /api/forum/replies/:id] Deletando resposta:', replyId);
    console.log('[DELETE /api/forum/replies/:id] Usu�rio:', req.user);
    
    // Verificar se a resposta existe e se o usu�rio tem permiss�o para deletar
    const replyCheck = await pool.query(`
      SELECT author_id FROM forum_replies WHERE id = $1
    `, [replyId]);
    
    if (replyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Resposta n�o encontrada.' });
    }
    
    const reply = replyCheck.rows[0];
    
    // Verificar permiss�es (apenas autor ou admin podem deletar)
    if (reply.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Voc� n�o tem permiss�o para deletar esta resposta.' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Deletar curtidas da resposta
      await client.query('DELETE FROM forum_reply_likes WHERE reply_id = $1', [replyId]);
      
      // Deletar respostas filhas (se houver)
      await client.query('DELETE FROM forum_replies WHERE parent_reply_id = $1', [replyId]);
      
      // Deletar a resposta
      await client.query('DELETE FROM forum_replies WHERE id = $1', [replyId]);
      
      await client.query('COMMIT');
      
      // Disparar webhook para exclusão de resposta no fórum
      try {
        await sendWebhook('forum_reply.deleted', {
          id: replyId,
          author_id: req.user.id,
          author_name: req.user.name,
          deleted_at: new Date().toISOString()
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook forum_reply.deleted:', webhookError);
      }
      
      console.log('[DELETE /api/forum/replies/:id] Resposta deletada com sucesso');
      res.json({ success: true, message: 'Resposta deletada com sucesso.' });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('[DELETE /api/forum/replies/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ENDPOINTS DE ADMINISTRA��O PARA MIGRATION =====

// Verificar estrutura da tabela forum_posts
app.get('/api/admin/check-forum-posts-structure', authenticateToken, async (req, res) => {
  try {
    // Verificar se � admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'forum_posts' 
      ORDER BY ordinal_position
    `);

    res.json({ columns: result.rows });
  } catch (error) {
    console.error('Erro ao verificar estrutura:', error);
    res.status(500).json({ error: 'Erro ao verificar estrutura da tabela.' });
  }
});

// Aplicar migration dos posts do f�rum
app.post('/api/admin/apply-forum-posts-migration', authenticateToken, async (req, res) => {
  try {
    // Verificar se � admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    console.log('[MIGRATION] Aplicando migration dos posts do f�rum...');
    
    const client = await pool.connect();
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
        console.log('[MIGRATION] Coluna content_image_url j� existe');
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
        console.log('[MIGRATION] Coluna cover_image_url n�o existe');
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

// Editar post do f�rum
app.put('/api/forum/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags = [], content_image_url } = req.body;
    
    console.log('[PUT /api/forum/posts/:id] Editando post:', id);
    console.log('[PUT /api/forum/posts/:id] Usu�rio:', req.user);
    
    if (!title || !content) {
      return res.status(400).json({ error: 'T�tulo e conte�do s�o obrigat�rios.' });
    }
    
    // Verificar se o post existe e se o usu�rio tem permiss�o para editar
    const postCheck = await pool.query(`
      SELECT author_id FROM forum_posts WHERE id = $1
    `, [id]);
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post n�o encontrado.' });
    }
    
    const post = postCheck.rows[0];
    
    // Verificar permiss�es (apenas autor ou admin podem editar)
    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Voc� n�o tem permiss�o para editar este post.' });
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
      if (tags.length > 0) {
        for (const tagName of tags) {
          // Verificar se tag existe, se n�o, criar
          let tagResult = await client.query('SELECT id FROM forum_tags WHERE name = $1', [tagName]);
          let tagId;
          
          if (tagResult.rows.length === 0) {
            const newTagResult = await client.query(`
              INSERT INTO forum_tags (name) VALUES ($1) RETURNING id
            `, [tagName]);
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

// Excluir post do f�rum
app.delete('/api/forum/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[DELETE /api/forum/posts/:id] Excluindo post:', id);
    console.log('[DELETE /api/forum/posts/:id] Usu�rio:', req.user);
    
    // Verificar se o post existe e se o usu�rio tem permiss�o para excluir
    const postCheck = await pool.query(`
      SELECT author_id FROM forum_posts WHERE id = $1
    `, [id]);
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post n�o encontrado.' });
    }
    
    const post = postCheck.rows[0];
    
    // Verificar permiss�es (apenas autor ou admin podem excluir)
    if (post.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Voc� n�o tem permiss�o para excluir este post.' });
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
      
      console.log('[DELETE /api/forum/posts/:id] Post exclu�do com sucesso');
      res.json({ success: true, message: 'Post exclu�do com sucesso.' });
      
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

// Buscar respostas de um post espec�fico
app.get('/api/forum/posts/:id/replies', authenticateToken, async (req, res) => {
  try {
    const { id: postId } = req.params;
    
    console.log('[GET /api/forum/posts/:id/replies] Buscando respostas do post:', postId);
    
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
    `, [req.user.id, postId]);
    
    console.log('[GET /api/forum/posts/:id/replies] Encontradas', repliesResult.rows.length, 'respostas');
    
    res.json(repliesResult.rows);
    
  } catch (err) {
    console.error('[GET /api/forum/posts/:id/replies] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== SISTEMA DE WEBHOOKS =====

// Endpoint de teste para webhooks
app.post('/api/test-webhook', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    console.log('[TEST WEBHOOK] Testando envio de webhook...');
    
    await sendWebhook('test.event', {
      message: 'Este é um webhook de teste',
      user_id: req.user.id,
      user_name: req.user.name,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Webhook de teste enviado!' });
  } catch (err) {
    console.error('[TEST WEBHOOK] Erro:', err);
    res.status(500).json({ error: 'Erro ao testar webhook: ' + err.message });
  }
});

// Fun��o para enviar webhook
async function sendWebhook(eventType, payload) {
  try {
    console.log(`[WEBHOOK] Iniciando envio para evento: ${eventType}`);
    
    // Buscar webhooks ativos que escutam este evento
    const { rows: webhooks } = await pool.query(`
      SELECT * FROM webhooks 
      WHERE is_active = true 
      AND $1 = ANY(events)
    `, [eventType]);

    console.log(`[WEBHOOK] Encontrados ${webhooks.length} webhooks ativos para evento ${eventType}`);

    if (webhooks.length === 0) {
      console.log(`[WEBHOOK] Nenhum webhook configurado para o evento ${eventType}`);
      return;
    }

    for (const webhook of webhooks) {
      try {
        // Preparar payload final
        const fullPayload = {
          event: eventType,
          timestamp: new Date().toISOString(),
          data: payload
        };

        // Preparar headers
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'EduCommunity-Webhook/1.0'
        };

        // Adicionar assinatura HMAC se houver chave secreta
        if (webhook.secret_key) {
          const crypto = require('crypto');
          const signature = crypto
            .createHmac('sha256', webhook.secret_key)
            .update(JSON.stringify(fullPayload))
            .digest('hex');
          headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }

        // Fazer requisi��o
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(fullPayload),
          timeout: 10000 // 10 segundos
        });

        const responseText = await response.text();
        const isSuccess = response.status >= 200 && response.status < 300;

        // Log da tentativa
        await pool.query(`
          INSERT INTO webhook_logs (webhook_id, event_type, payload, response_status, response_body, is_success)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          webhook.id,
          eventType,
          fullPayload,
          response.status,
          responseText.substring(0, 5000), // Limitar tamanho
          isSuccess
        ]);

        if (!isSuccess) {
          console.error(`[WEBHOOK] Erro no webhook ${webhook.name}: ${response.status} ${responseText}`);
        }

      } catch (webhookError) {
        // Log do erro
        await pool.query(`
          INSERT INTO webhook_logs (webhook_id, event_type, payload, error_message, is_success)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          webhook.id,
          eventType,
          { event: eventType, timestamp: new Date().toISOString(), data: payload },
          webhookError.message,
          false
        ]);
        
        console.error(`[WEBHOOK] Erro ao enviar webhook ${webhook.name}:`, webhookError);
      }
    }
  } catch (error) {
    console.error('[WEBHOOK] Erro geral no sistema de webhooks:', error);
  }
}

// ===== ROTAS DA API PARA WEBHOOKS =====

// Listar webhooks
app.get('/api/webhooks', authenticateToken, async (req, res) => {
  try {
    console.log('[GET /api/webhooks] Usu�rio:', req.user);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    console.log('[GET /api/webhooks] Executando query...');
    const { rows } = await pool.query(`
      SELECT id, name, url, events, is_active, created_at, updated_at
      FROM webhooks 
      ORDER BY created_at DESC
    `);
    console.log('[GET /api/webhooks] Resultado:', rows);

    res.json(rows);
  } catch (err) {
    console.error('[GET /api/webhooks]', err);
    res.status(500).json({ error: 'Erro ao buscar webhooks.' });
  }
});

// Criar webhook
app.post('/api/webhooks', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { name, url, events, is_active = true, secret_key } = req.body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Nome, URL e eventos s�o obrigat�rios.' });
    }

    const id = crypto.randomUUID();
    const { rows } = await pool.query(`
      INSERT INTO webhooks (id, name, url, events, is_active, secret_key)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, url, events, is_active, created_at, updated_at
    `, [id, name, url, events, is_active, secret_key || null]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /api/webhooks]', err);
    res.status(500).json({ error: 'Erro ao criar webhook.' });
  }
});

// Atualizar webhook
app.put('/api/webhooks/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { id } = req.params;
    const { name, url, events, is_active, secret_key } = req.body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Nome, URL e eventos s�o obrigat�rios.' });
    }

    const { rows } = await pool.query(`
      UPDATE webhooks 
      SET name = $1, url = $2, events = $3, is_active = $4, secret_key = $5
      WHERE id = $6
      RETURNING id, name, url, events, is_active, created_at, updated_at
    `, [name, url, events, is_active, secret_key || null, id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Webhook n�o encontrado.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('[PUT /api/webhooks/:id]', err);
    res.status(500).json({ error: 'Erro ao atualizar webhook.' });
  }
});

// Deletar webhook
app.delete('/api/webhooks/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { id } = req.params;

    const { rowCount } = await pool.query('DELETE FROM webhooks WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Webhook n�o encontrado.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/webhooks/:id]', err);
    res.status(500).json({ error: 'Erro ao deletar webhook.' });
  }
});

// Buscar logs de um webhook
app.get('/api/webhooks/:id/logs', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { rows } = await pool.query(`
      SELECT * FROM webhook_logs 
      WHERE webhook_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), parseInt(offset)]);

    res.json(rows);
  } catch (err) {
    console.error('[GET /api/webhooks/:id/logs]', err);
    res.status(500).json({ error: 'Erro ao buscar logs.' });
  }
});

// Rota catch-all para SPA (deve ser a �ltima rota)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
