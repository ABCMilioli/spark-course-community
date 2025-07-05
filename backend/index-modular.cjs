const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const bodyParser = require('body-parser');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

// ===== IDENTIFICAÇÃO DA VERSÃO MODULAR =====
console.log('🚀 INICIANDO BACKEND MODULAR v1.0');
console.log('📦 Versão com 13 módulos extraídos');
console.log('📈 Progresso da modularização: 75%');

// Configurações
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// URLs do Mercado Pago
const MERCADOPAGO_SUCCESS_URL = process.env.MERCADOPAGO_SUCCESS_URL || 'https://community.iacas.top/payment/success';
const MERCADOPAGO_FAILURE_URL = process.env.MERCADOPAGO_FAILURE_URL || 'https://community.iacas.top/payment/failure';
const MERCADOPAGO_PENDING_URL = process.env.MERCADOPAGO_PENDING_URL || 'https://community.iacas.top/payment/pending';

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// Configuração do MinIO/S3
const s3Client = new S3Client({
  endpoint: `https://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY
  },
  forcePathStyle: true,
  sslEnabled: process.env.MINIO_USE_SSL === 'true'
});

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

// Configurar pool no app.locals para uso nos módulos
app.locals.pool = pool;
app.locals.s3Client = s3Client;

// ===== MÓDULOS IMPORTADOS =====

// Middlewares
const { authenticateToken } = require('./middleware/auth');
const upload = require('./middleware/upload');

// Serviços
const { sendWebhook } = require('./services/webhookService');

// Utilitários
const { uploadFile } = require('./utils/upload');

// ===== FUNÇÕES AUXILIARES =====

// Função helper para criar notificações
async function createNotification(userId, title, message, type, referenceId = null, referenceType = null) {
  try {
    console.log('[CREATE NOTIFICATION] Tentando criar notificação:', {
      userId, title, message, type, referenceId, referenceType
    });
    
    const result = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING id
    `, [userId, title, message, type, referenceId, referenceType]);
    
    // Disparar webhook para criação de notificação
    try {
      await sendWebhook(pool, 'notification.created', {
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
    
    console.log('[CREATE NOTIFICATION] Notificação criada com sucesso! ID:', result.rows[0].id);
  } catch (err) {
    console.error('[CREATE NOTIFICATION] ERRO ao criar notificação:', err);
    console.error('[CREATE NOTIFICATION] Parâmetros:', {
      userId, title, message, type, referenceId, referenceType
    });
  }
}

// Função helper para obter nome do usuário
async function getUserName(userId, currentUserName = null) {
  // Se já temos o nome, usar ele
  if (currentUserName) {
    return currentUserName;
  }
  
  // Caso contrário, buscar no banco
  try {
    const { rows } = await pool.query('SELECT name FROM profiles WHERE id = $1', [userId]);
    return rows.length > 0 ? rows[0].name : 'Usuário';
  } catch (err) {
    console.error('[GET USER NAME] Erro ao buscar nome:', err);
    return 'Usuário';
  }
}

// Rotas
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const courseRoutes = require('./routes/courses');
const paymentRoutes = require('./routes/payments');
const communityRoutes = require('./routes/community');
const forumRoutes = require('./routes/forum');
const classRoutes = require('./routes/classes');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');

// ===== CONFIGURAÇÃO DAS ROTAS =====

// Rotas de autenticação (precisa de pool)
app.use('/api/auth', authRoutes(pool));

// Rotas de webhooks (precisa de pool e authenticateToken)
app.use('/api/webhooks', webhookRoutes(pool, authenticateToken));

// Rotas de cursos (precisa de pool e sendWebhook)
app.use('/api/courses', courseRoutes(pool, sendWebhook));

// Rotas de pagamentos (precisa de pool e sendWebhook)
app.use('/api/payments', paymentRoutes(pool, sendWebhook));

// Rotas da comunidade (precisa de pool, sendWebhook, createNotification e getUserName)
app.use('/api/posts', communityRoutes(pool, sendWebhook, createNotification, getUserName));

// Rotas do fórum (precisa de pool, sendWebhook, createNotification e getUserName)
app.use('/api/forum', forumRoutes(pool, sendWebhook, createNotification, getUserName));

// Rotas de classes/turmas (exporta diretamente o router)
app.use('/api/classes', classRoutes);

// Rotas administrativas (exporta diretamente o router)
app.use('/api/admin', adminRoutes);

// Rotas de perfil (exporta diretamente o router)
app.use('/api/profile', profileRoutes);

// ===== ENDPOINT DE MATRÍCULAS =====

// Endpoint para buscar matrículas do usuário
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { user_id, course_id } = req.query;
    
    console.log('[GET /api/enrollments] Buscando matrículas');
    console.log('[GET /api/enrollments] Parâmetros:', { user_id, course_id });
    console.log('[GET /api/enrollments] Usuário:', req.user.id, req.user.role);
    
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

    console.log('[GET /api/enrollments] Matrículas encontradas:', results.length);
    res.json(results);
  } catch (err) {
    console.error('[GET /api/enrollments] Erro ao buscar matrículas:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar nova matrícula
app.post('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    
    console.log('[POST /api/enrollments] Criando matrícula');
    console.log('[POST /api/enrollments] Dados:', { course_id });
    console.log('[POST /api/enrollments] Usuário:', req.user.id, req.user.role);
    
    if (!course_id) {
      return res.status(400).json({ error: 'course_id é obrigatório.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id, title, instructor_id FROM courses WHERE id = $1', [course_id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    const course = courseCheck.rows[0];
    
    // Verificar se o usuário já está matriculado
    const existingEnrollment = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, course_id]
    );
    
    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Você já está matriculado neste curso.' });
    }
    
    // Verificar se o usuário não está tentando se matricular no próprio curso
    if (course.instructor_id === req.user.id) {
      return res.status(400).json({ error: 'Instrutores não podem se matricular nos próprios cursos.' });
    }
    
    const enrollmentId = crypto.randomUUID();
    const enrolledAt = new Date();
    
    await pool.query(
      'INSERT INTO enrollments (id, user_id, course_id, enrolled_at, progress) VALUES ($1, $2, $3, $4, $5)',
      [enrollmentId, req.user.id, course_id, enrolledAt, 0]
    );
    
    // Disparar webhook para criação de matrícula
    try {
      await sendWebhook(pool, 'enrollment.created', {
        id: enrollmentId,
        user_id: req.user.id,
        user_name: req.user.name,
        course_id: course_id,
        course_title: course.title,
        instructor_id: course.instructor_id,
        enrolled_at: enrolledAt.toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook enrollment.created:', webhookError);
    }
    
    console.log('[POST /api/enrollments] Matrícula criada com sucesso');
    res.status(201).json({
      id: enrollmentId,
      user_id: req.user.id,
      course_id: course_id,
      enrolled_at: enrolledAt,
      progress: 0
    });
  } catch (err) {
    console.error('[POST /api/enrollments] Erro ao criar matrícula:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ENDPOINTS DE LIÇÕES =====

// Endpoint para buscar comentários de uma lição
app.get('/api/lessons/:lessonId/comments', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    console.log('[GET /api/lessons/:lessonId/comments] Buscando comentários da lição:', lessonId);
    
    const { rows } = await pool.query(`
      SELECT 
        lc.*, p.name as user_name, p.avatar_url as user_avatar,
        (SELECT COUNT(*) FROM lesson_comment_likes WHERE comment_id = lc.id) as likes_count,
        EXISTS(SELECT 1 FROM lesson_comment_likes WHERE comment_id = lc.id AND user_id = $1) as is_liked_by_user
      FROM lesson_comments lc
      JOIN profiles p ON lc.user_id = p.id
      WHERE lc.lesson_id = $2
      ORDER BY lc.created_at DESC
    `, [req.user.id, lessonId]);
    
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/lessons/:lessonId/comments] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar comentário em uma lição
app.post('/api/lessons/:lessonId/comments', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { content } = req.body;
    
    console.log('[POST /api/lessons/:lessonId/comments] Criando comentário na lição:', lessonId);
    console.log('[POST /api/lessons/:lessonId/comments] Usuário:', req.user.id, req.user.name);
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório.' });
    }
    
    const commentId = crypto.randomUUID();
    const result = await pool.query(
      'INSERT INTO lesson_comments (id, lesson_id, user_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [commentId, lessonId, req.user.id, content.trim()]
    );
    
    // Buscar dados do usuário para retornar
    const { rows: userData } = await pool.query(
      'SELECT name as user_name, avatar_url as user_avatar FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    const comment = {
      ...result.rows[0],
      user_name: userData[0]?.user_name || req.user.name,
      user_avatar: userData[0]?.user_avatar
    };
    
    // Disparar webhook para criação de comentário
    try {
      await sendWebhook(pool, 'lesson_comment.created', {
        id: commentId,
        lesson_id: lessonId,
        user_id: req.user.id,
        user_name: req.user.name,
        content: content.trim(),
        created_at: comment.created_at
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook lesson_comment.created:', webhookError);
    }
    
    res.status(201).json(comment);
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/comments] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para editar comentário de lição
app.put('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    console.log('[PUT /api/comments/:commentId] Editando comentário:', commentId);
    console.log('[PUT /api/comments/:commentId] Usuário:', req.user.id, req.user.role);
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório.' });
    }
    
    // Verificar se o comentário existe e se o usuário tem permissão
    const commentCheck = await pool.query(
      'SELECT user_id FROM lesson_comments WHERE id = $1',
      [commentId]
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
      'UPDATE lesson_comments SET content = $1 WHERE id = $2 RETURNING *',
      [content.trim(), commentId]
    );
    
    // Disparar webhook para atualização de comentário
    try {
      await sendWebhook(pool, 'lesson_comment.updated', {
        id: commentId,
        content: content.trim(),
        updated_by: req.user.id,
        updated_by_name: req.user.name,
        updated_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook lesson_comment.updated:', webhookError);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/comments/:commentId] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para deletar comentário de lição
app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    
    console.log('[DELETE /api/comments/:commentId] Deletando comentário:', commentId);
    console.log('[DELETE /api/comments/:commentId] Usuário:', req.user.id, req.user.role);
    
    // Verificar se o comentário existe e se o usuário tem permissão
    const commentCheck = await pool.query(
      'SELECT user_id FROM lesson_comments WHERE id = $1',
      [commentId]
    );
    
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado.' });
    }
    
    const comment = commentCheck.rows[0];
    
    // Verificar permissões (apenas autor ou admin podem deletar)
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Você não tem permissão para deletar este comentário.' });
    }
    
    await pool.query('DELETE FROM lesson_comments WHERE id = $1', [commentId]);
    
    // Disparar webhook para exclusão de comentário
    try {
      await sendWebhook(pool, 'lesson_comment.deleted', {
        id: commentId,
        deleted_by: req.user.id,
        deleted_by_name: req.user.name,
        deleted_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook lesson_comment.deleted:', webhookError);
    }
    
    res.json({ message: 'Comentário deletado com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/comments/:commentId] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para marcar lição como concluída
app.post('/api/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    console.log('[POST /api/lessons/:lessonId/complete] Marcando lição como concluída:', lessonId);
    console.log('[POST /api/lessons/:lessonId/complete] Usuário:', req.user.id, req.user.name);
    
    // Verificar se a lição existe
    const lessonCheck = await pool.query('SELECT id FROM lessons WHERE id = $1', [lessonId]);
    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lição não encontrada.' });
    }
    
    // Verificar se já foi marcada como concluída
    const existingCompletion = await pool.query(
      'SELECT id FROM lesson_completions WHERE user_id = $1 AND lesson_id = $2',
      [req.user.id, lessonId]
    );
    
    if (existingCompletion.rows.length > 0) {
      return res.status(400).json({ error: 'Lição já foi marcada como concluída.' });
    }
    
    const completionId = crypto.randomUUID();
    const completedAt = new Date();
    
    await pool.query(
      'INSERT INTO lesson_completions (id, user_id, lesson_id, completed_at) VALUES ($1, $2, $3, $4)',
      [completionId, req.user.id, lessonId, completedAt]
    );
    
    // Disparar webhook para conclusão de lição
    try {
      await sendWebhook(pool, 'lesson.completed', {
        id: completionId,
        user_id: req.user.id,
        user_name: req.user.name,
        lesson_id: lessonId,
        completed_at: completedAt.toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook lesson.completed:', webhookError);
    }
    
    res.status(201).json({
      id: completionId,
      user_id: req.user.id,
      lesson_id: lessonId,
      completed_at: completedAt
    });
  } catch (err) {
    console.error('[POST /api/lessons/:lessonId/complete] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ENDPOINTS DE AVALIAÇÕES =====

// Endpoint para buscar avaliações de um curso
app.get('/api/courses/:courseId/ratings', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log('[GET /api/courses/:courseId/ratings] Buscando avaliações do curso:', courseId);
    
    const { rows } = await pool.query(`
      SELECT cr.*, p.name as user_name, p.avatar_url as user_avatar
      FROM course_ratings cr
      JOIN profiles p ON cr.user_id = p.id
      WHERE cr.course_id = $1
      ORDER BY cr.created_at DESC
    `, [courseId]);
    
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/courses/:courseId/ratings] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para buscar avaliação do usuário em um curso
app.get('/api/courses/:courseId/my-rating', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    console.log('[GET /api/courses/:courseId/my-rating] Buscando avaliação do usuário:', userId, 'no curso:', courseId);
    
    const { rows } = await pool.query(
      'SELECT * FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );
    
    if (rows.length === 0) {
      return res.json(null);
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/courses/:courseId/my-rating] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para criar/atualizar avaliação de um curso
app.post('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;
    
    console.log('[POST /api/courses/:courseId/rate] Criando avaliação');
    console.log('[POST /api/courses/:courseId/rate] Dados:', { courseId, rating, comment });
    console.log('[POST /api/courses/:courseId/rate] Usuário:', userId, req.user.name);
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await pool.query('SELECT id, title FROM courses WHERE id = $1', [courseId]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    const course = courseCheck.rows[0];
    
    // Verificar se o usuário já avaliou este curso
    const existingRating = await pool.query(
      'SELECT id FROM course_ratings WHERE course_id = $1 AND user_id = $2',
      [courseId, userId]
    );
    
    if (existingRating.rows.length > 0) {
      // Atualizar avaliação existente
      const result = await pool.query(
        'UPDATE course_ratings SET rating = $1, comment = $2, updated_at = now() WHERE course_id = $3 AND user_id = $4 RETURNING *',
        [rating, comment || null, courseId, userId]
      );
      
      // Disparar webhook para atualização de avaliação
      try {
        await sendWebhook(pool, 'course_rating.updated', {
          id: result.rows[0].id,
          course_id: courseId,
          course_title: course.title,
          user_id: userId,
          user_name: req.user.name,
          rating,
          comment: comment || null,
          updated_at: result.rows[0].updated_at
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook course_rating.updated:', webhookError);
      }
      
      console.log('[POST /api/courses/:courseId/rate] Avaliação atualizada com sucesso');
      res.json(result.rows[0]);
    } else {
      // Criar nova avaliação
      const ratingId = crypto.randomUUID();
      const result = await pool.query(
        'INSERT INTO course_ratings (id, course_id, user_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [ratingId, courseId, userId, rating, comment || null]
      );
      
      // Disparar webhook para criação de avaliação
      try {
        await sendWebhook(pool, 'course_rating.created', {
          id: ratingId,
          course_id: courseId,
          course_title: course.title,
          user_id: userId,
          user_name: req.user.name,
          rating,
          comment: comment || null,
          created_at: result.rows[0].created_at
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook course_rating.created:', webhookError);
      }
      
      console.log('[POST /api/courses/:courseId/rate] Avaliação criada com sucesso');
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error('[POST /api/courses/:courseId/rate] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint para deletar avaliação de um curso
app.delete('/api/courses/:courseId/rate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    console.log('[DELETE /api/courses/:courseId/rate] Deletando avaliação');
    console.log('[DELETE /api/courses/:courseId/rate] Usuário:', userId, req.user.name);
    
    const result = await pool.query(
      'DELETE FROM course_ratings WHERE course_id = $1 AND user_id = $2 RETURNING *',
      [courseId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avaliação não encontrada.' });
    }
    
    // Disparar webhook para exclusão de avaliação
    try {
      await sendWebhook(pool, 'course_rating.deleted', {
        course_id: courseId,
        user_id: userId,
        user_name: req.user.name,
        deleted_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[WEBHOOK] Erro ao enviar webhook course_rating.deleted:', webhookError);
    }
    
    console.log('[DELETE /api/courses/:courseId/rate] Avaliação deletada com sucesso');
    res.json({ message: 'Avaliação deletada com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/courses/:courseId/rate] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ENDPOINTS DE LIKES DE COMENTÁRIOS =====

// Endpoint para curtir comentário
app.post('/api/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    console.log('[POST /api/comments/:commentId/like] Curtindo comentário:', commentId);
    console.log('[POST /api/comments/:commentId/like] Usuário:', userId, req.user.name);

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



// ===== ENDPOINTS DE EXPLORE E BUSCA =====

// Categorias populares
app.get('/api/explore/categories', authenticateToken, async (req, res) => {
  try {
    console.log('[GET /api/explore/categories] Buscando categorias populares');
    
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

    console.log('[GET /api/explore/categories] Categorias encontradas:', {
      courseCategories: courseCategories.rows.length,
      postCategories: postCategories.rows.length
    });

    res.json({
      courseCategories: courseCategories.rows,
      postCategories: postCategories.rows
    });
  } catch (err) {
    console.error('[GET /api/explore/categories] Erro:', err);
    res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
});

// Busca geral
app.get('/api/explore/search', authenticateToken, async (req, res) => {
  try {
    const { q, type, category, level, price } = req.query;
    console.log('[GET /api/explore/search] Busca:', { q, type, category, level, price });
    
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

    console.log('[GET /api/explore/search] Resultados encontrados:', {
      courses: results.courses.length,
      posts: results.posts.length,
      instructors: results.instructors.length
    });

    res.json(results);
  } catch (err) {
    console.error('[GET /api/explore/search] Erro:', err);
    res.status(500).json({ error: 'Erro na busca.' });
  }
});





// ===== ENDPOINTS DE NOTIFICAÇÕES =====

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

// Marcar notificação como lida
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
    res.status(500).json({ error: 'Erro ao marcar notificação como lida.' });
  }
});

// Marcar todas as notificações como lidas
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
    res.status(500).json({ error: 'Erro ao marcar todas as notificações como lidas.' });
  }
});

// Deletar notificação específica
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
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/notifications/:id]', err);
    res.status(500).json({ error: 'Erro ao deletar notificação.' });
  }
});

// Deletar múltiplas notificações
app.delete('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ error: 'IDs das notificações são obrigatórios.' });
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
    res.status(500).json({ error: 'Erro ao deletar notificações.' });
  }
});

// Deletar todas as notificações
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
    res.status(500).json({ error: 'Erro ao deletar todas as notificações.' });
  }
});

// Endpoint para listar conversas do usuário
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[GET /api/conversations] Buscando conversas para usuário:', userId);
    
    // Verificar se as tabelas existem
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations'
      ) as conversations_exist,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      ) as messages_exist
    `);
    
    const { conversations_exist, messages_exist } = tableCheck.rows[0];
    console.log('[GET /api/conversations] Tabelas existem:', { conversations_exist, messages_exist });
    
    if (!conversations_exist || !messages_exist) {
      console.log('[GET /api/conversations] Tabelas de mensagens não existem, retornando array vazio');
      return res.json([]);
    }
    
    // Verificar se há conversas para este usuário usando a estrutura correta
    const conversationCount = await pool.query(`
      SELECT COUNT(*) as count FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
    `, [userId]);
    
    console.log('[GET /api/conversations] Total de conversas encontradas:', conversationCount.rows[0].count);
    
    const { rows } = await pool.query(`
      SELECT 
        c.id,
        c.title,
        c.type,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)) as unread_count,
        (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time,
        -- Buscar o outro participante da conversa
        (SELECT JSON_BUILD_OBJECT(
          'id', other_cp.user_id,
          'name', p.name,
          'avatar_url', p.avatar_url
        )
        FROM conversation_participants other_cp
        JOIN profiles p ON other_cp.user_id = p.id
        WHERE other_cp.conversation_id = c.id AND other_cp.user_id != $1
        LIMIT 1) as other_user
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1 AND c.type = 'direct'
      ORDER BY c.updated_at DESC
    `, [userId]);
    
    console.log('[GET /api/conversations] Conversas encontradas:', rows.length);
    console.log('[GET /api/conversations] Primeira conversa:', rows[0] || 'Nenhuma');
    
    // Formatar os dados para o frontend
    const conversations = rows.map(row => {
      const otherUser = row.other_user || { id: null, name: 'Usuário', avatar_url: null };
      console.log('[GET /api/conversations] other_user:', otherUser);
      return {
        id: row.id,
        other_user: otherUser,
        unread_count: parseInt(row.unread_count),
        last_message: row.last_message,
        last_message_time: row.last_message_time,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });
    
    console.log('[GET /api/conversations] Retornando conversas formatadas:', conversations.length);
    res.json(conversations);
  } catch (err) {
    console.error('[GET /api/conversations] Erro:', err);
    // Em caso de erro, retornar array vazio
    res.json([]);
  }
});

// Endpoint para conversas não lidas
app.get('/api/conversations/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[GET /api/conversations/unread-count] Buscando conversas não lidas para usuário:', userId);
    
    // Verificar se as tabelas existem
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations'
      ) as conversations_exist,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      ) as messages_exist
    `);
    
    const { conversations_exist, messages_exist } = tableCheck.rows[0];
    console.log('[GET /api/conversations/unread-count] Tabelas existem:', { conversations_exist, messages_exist });
    
    if (!conversations_exist || !messages_exist) {
      console.log('[GET /api/conversations/unread-count] Tabelas de mensagens não existem, retornando 0');
      return res.json({ unread_count: 0 });
    }
    
    const { rows } = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1
      AND EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.conversation_id = c.id 
        AND m.sender_id != $1 
        AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
      )
    `, [userId]);
    
    const unreadCount = parseInt(rows[0].unread_count);
    console.log('[GET /api/conversations/unread-count] Conversas não lidas encontradas:', unreadCount);
    
    res.json({ unread_count: unreadCount });
  } catch (err) {
    console.error('[GET /api/conversations/unread-count]', err);
    // Em caso de erro, retornar 0 em vez de erro 500
    res.json({ unread_count: 0 });
  }
});

// Endpoint para obter detalhes de uma conversa e suas mensagens
app.get('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    console.log(`[GET /api/conversations/${conversationId}] Buscando detalhes da conversa para usuário:`, userId);

    // Verificar se a conversa existe e se o usuário é participante
    const convResult = await pool.query(`
      SELECT c.id, c.title, c.type, c.created_at, c.updated_at,
        (SELECT JSON_BUILD_OBJECT(
          'id', other_cp.user_id,
          'name', p.name,
          'avatar_url', p.avatar_url
        )
        FROM conversation_participants other_cp
        JOIN profiles p ON other_cp.user_id = p.id
        WHERE other_cp.conversation_id = c.id AND other_cp.user_id != $1
        LIMIT 1) as other_user
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE c.id = $2 AND cp.user_id = $1
      LIMIT 1
    `, [userId, conversationId]);

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada ou acesso negado.' });
    }
    const conversation = convResult.rows[0];

    // Buscar participantes
    const participantsResult = await pool.query(`
      SELECT cp.id, cp.user_id, p.name as user_name, p.avatar_url as user_avatar, p.role as user_role, cp.joined_at, cp.last_read_at, true as is_active
      FROM conversation_participants cp
      JOIN profiles p ON cp.user_id = p.id
      WHERE cp.conversation_id = $1
    `, [conversationId]);
    const participants = participantsResult.rows;

    // Buscar mensagens
    const messagesResult = await pool.query(`
      SELECT m.id, m.conversation_id, m.sender_id, m.content, m.type as message_type, m.attachments, m.reply_to_id, m.created_at, m.updated_at,
        sender.name as sender_name, sender.avatar_url as sender_avatar, sender.role as sender_role
      FROM messages m
      JOIN profiles sender ON m.sender_id = sender.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [conversationId]);
    const messages = messagesResult.rows.map(msg => ({
      ...msg,
      attachments: msg.attachments || [],
      reply_to_message: null // Pode ser implementado depois
    }));

    res.json({
      conversation: {
        ...conversation,
        participants
      },
      messages,
      participants
    });
  } catch (err) {
    console.error('[GET /api/conversations/:id] Erro:', err);
    res.status(500).json({ error: 'Erro ao buscar conversa.' });
  }
});

// ===== ROTAS RESTANTES (AINDA NÃO MODULARIZADAS) =====

// Endpoint para users (não admin)
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
    console.error('[GET /api/users] Erro:', err);
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
    console.error('[GET /api/instructors] Erro:', err);
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
    console.error('[GET /api/dashboard-stats] Erro:', err);
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
    console.error('[GET /api/popular-tags] Erro:', err);
    // Fallback para tags fixas em caso de erro
    res.json(['javascript', 'react', 'nodejs', 'python', 'docker', 'aws']);
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
    
    // Disparar webhook para criação de curso
    try {
      await sendWebhook(pool, 'course.created', {
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
    console.error('[POST /api/courses] Erro:', err);
    res.status(500).json({ error: 'Erro ao criar curso.' });
  }
});

// Endpoint para listar matrículas do usuário
app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id || req.user.id;
    
    // Verificar se a tabela enrollments existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'enrollments'
      ) as enrollments_exist
    `);
    
    const { enrollments_exist } = tableCheck.rows[0];
    
    if (!enrollments_exist) {
      console.log('[GET /api/enrollments] Tabela enrollments não existe, retornando array vazio');
      return res.json([]);
    }
    
    const { rows } = await pool.query(`
      SELECT 
        e.id,
        e.user_id,
        e.course_id,
        e.enrolled_at,
        e.progress,
        e.completed_at,
        c.title as course_title,
        c.description as course_description,
        c.thumbnail_url as course_thumbnail,
        c.level as course_level,
        p.name as instructor_name,
        p.avatar_url as instructor_avatar
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN profiles p ON c.instructor_id = p.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `, [userId]);
    
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/enrollments] Erro:', err);
    // Em caso de erro, retornar array vazio
    res.json([]);
  }
});

// Endpoint para estatísticas de rating de um curso
app.get('/api/courses/:id/rating-stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a tabela course_ratings existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'course_ratings'
      ) as ratings_exist
    `);
    
    const { ratings_exist } = tableCheck.rows[0];
    
    if (!ratings_exist) {
      console.log('[GET /api/courses/:id/rating-stats] Tabela course_ratings não existe, retornando dados padrão');
      return res.json({
        average_rating: 0,
        total_ratings: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }
    
    // Buscar estatísticas de rating
    const statsResult = await pool.query(`
      SELECT 
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(*) as total_ratings,
        COUNT(*) FILTER (WHERE rating = 1) as one_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 5) as five_star
      FROM course_ratings 
      WHERE course_id = $1
    `, [id]);
    
    const stats = statsResult.rows[0];
    
    res.json({
      average_rating: parseFloat(stats.average_rating),
      total_ratings: parseInt(stats.total_ratings),
      rating_distribution: {
        1: parseInt(stats.one_star),
        2: parseInt(stats.two_star),
        3: parseInt(stats.three_star),
        4: parseInt(stats.four_star),
        5: parseInt(stats.five_star)
      }
    });
  } catch (err) {
    console.error('[GET /api/courses/:id/rating-stats] Erro:', err);
    // Em caso de erro, retornar dados padrão
    res.json({
      average_rating: 0,
      total_ratings: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
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
      JOIN profiles u ON p.author_id = u.id
      WHERE p.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado.' });
    }
    
    const post = rows[0];
    
    // Verificar se o usuário deu like no post
    const likeCheck = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    // Verificar se o usuário favoritou o post
    const favoriteCheck = await pool.query(
      'SELECT id FROM post_favorites WHERE post_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    const response = {
      ...post,
      user_liked: likeCheck.rows.length > 0,
      user_favorited: favoriteCheck.rows.length > 0
    };
    
    console.log('[GET /api/posts/:id] Post encontrado:', post.title);
    res.json(response);
  } catch (err) {
    console.error('[GET /api/posts/:id] Erro:', err);
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
    
    // Disparar webhook para criação de matrícula
    try {
      await sendWebhook(pool, 'enrollment.created', {
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

// ===== ROTAS RESTANTES (AINDA NÃO MODULARIZADAS) =====

// ... (outras rotas que ainda não foram modularizadas)

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
  console.log(`🚀 Servidor modular rodando na porta ${PORT}`);
  console.log(`📊 Progresso da modularização:`);
  console.log(`   ✅ Módulos extraídos: 13`);
  console.log(`   📁 Rotas: auth, webhooks, courses, payments, community, forum, classes, admin, profile`);
  console.log(`   🔧 Middlewares: auth, upload`);
  console.log(`   🛠️  Serviços: webhooks`);
  console.log(`   📦 Utilitários: upload`);
  console.log(`   📈 Redução estimada: 75% do código principal`);
  console.log(`   🔄 Arquivo original preservado como backup`);
}); 
