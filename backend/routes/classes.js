const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Middleware de autenticação
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadFile } = require('../utils/upload');
const { sendWebhook } = require('../services/webhookService');

// ===== SISTEMA DE TURMAS =====

// Listar turmas do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id || req.user.id;
    
    const { rows } = await req.app.locals.pool.query(`
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
router.post('/', authenticateToken, async (req, res) => {
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
    const courseCheck = await req.app.locals.pool.query('SELECT id FROM courses WHERE id = $1', [course_id]);
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    const id = crypto.randomUUID();
    console.log('[POST /api/classes] Criando turma com ID:', id);
    
    const { rows } = await req.app.locals.pool.query(`
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

// Detalhes de uma turma específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id] Buscando turma:', id);
    console.log('[GET /api/classes/:id] Usuário:', req.user);
    
    // Primeiro, buscar a turma
    const classResult = await req.app.locals.pool.query(`
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
    const enrollmentCheck = await req.app.locals.pool.query(`
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
router.post('/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role = 'student' } = req.body;
    
    // Verificar se o usuário atual é instructor da turma ou admin
    const classCheck = await req.app.locals.pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    // Verificar limite de alunos
    const enrollmentCount = await req.app.locals.pool.query(`
      SELECT COUNT(*) as count FROM class_instance_enrollments WHERE class_instance_id = $1 AND status = 'active'
    `, [id]);
    
    const classInfo = await req.app.locals.pool.query(`
      SELECT max_students FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classInfo.rows[0].max_students && 
        parseInt(enrollmentCount.rows[0].count) >= classInfo.rows[0].max_students) {
      return res.status(400).json({ error: 'Turma está lotada.' });
    }
    
    const enrollmentId = crypto.randomUUID();
    await req.app.locals.pool.query(`
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
router.get('/:id/enrollments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id/enrollments] Buscando matrículas da turma:', id);
    console.log('[GET /api/classes/:id/enrollments] Usuário:', req.user);
    
    // Primeiro, buscar a turma para verificar se o usuário é o instructor
    const classResult = await req.app.locals.pool.query(`
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
      const { rows } = await req.app.locals.pool.query(`
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
      const { rows } = await req.app.locals.pool.query(`
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
    const enrollmentCheck = await req.app.locals.pool.query(`
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/enrollments] Usuário está matriculado na turma');
      const { rows } = await req.app.locals.pool.query(`
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
router.post('/:id/content', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, content_type = 'announcement', is_pinned = false } = req.body;
    
    if (!title || (!content && !req.file)) {
      return res.status(400).json({ error: 'Título e conteúdo ou arquivo são obrigatórios.' });
    }
    
    // Verificar se a turma existe e se o usuário tem permissão
    const classCheck = await req.app.locals.pool.query(`
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
    const { rows } = await req.app.locals.pool.query(`
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
router.get('/:id/content', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[GET /api/classes/:id/content] Buscando conteúdo da turma:', id);
    console.log('[GET /api/classes/:id/content] Usuário:', req.user);
    
    // Primeiro, buscar a turma para verificar se o usuário é o instructor
    const classResult = await req.app.locals.pool.query(`
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
      const { rows } = await req.app.locals.pool.query(`
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
      const { rows } = await req.app.locals.pool.query(`
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
    const enrollmentCheck = await req.app.locals.pool.query(`
      SELECT * FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      console.log('[GET /api/classes/:id/content] Usuário está matriculado na turma');
      const { rows } = await req.app.locals.pool.query(`
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
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { instance_name, instance_description, is_public, max_students, start_date, end_date, schedule, location } = req.body;
    
    console.log('[PUT /api/classes/:id] Atualizando turma:', id);
    console.log('[PUT /api/classes/:id] Dados recebidos:', req.body);
    console.log('[PUT /api/classes/:id] Usuário:', req.user);
    
    // Verificar se a turma existe
    const classCheck = await req.app.locals.pool.query(`
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
    const { rows } = await req.app.locals.pool.query(`
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
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[DELETE /api/classes/:id] Excluindo turma:', id);
    console.log('[DELETE /api/classes/:id] Usuário:', req.user);
    
    // Verificar se a turma existe
    const classCheck = await req.app.locals.pool.query(`
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
    await req.app.locals.pool.query(`
      DELETE FROM class_instances WHERE id = $1
    `, [id]);
    
    console.log('[DELETE /api/classes/:id] Turma excluída com sucesso:', className);
    res.json({ message: 'Turma excluída com sucesso.' });
    
  } catch (err) {
    console.error('[DELETE /api/classes/:id] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ===== ENDPOINTS PARA GERENCIAR CURSOS DAS TURMAS =====

// Listar cursos de uma turma
router.get('/:id/courses', authenticateToken, async (req, res) => {
  try {
    // Desabilitar cache
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '0');
    res.set('Pragma', 'no-cache');
    
    const { id } = req.params;
    
    // Buscar a turma para verificar se o usuário tem acesso
    const classResult = await req.app.locals.pool.query(`
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
      const { rows } = await req.app.locals.pool.query(query, [id]);
      return res.json(rows);
    }
    
    // 2. Se a turma é pública, permitir visualizar cursos
    if (classData.is_public) {
      const { rows } = await req.app.locals.pool.query(query, [id]);
      return res.json(rows);
    }
    
    // 3. Se o usuário está matriculado na turma
    const enrollmentCheck = await req.app.locals.pool.query(`
      SELECT 1 FROM class_instance_enrollments 
      WHERE class_instance_id = $1 AND user_id = $2 AND status = 'active'
    `, [id, req.user.id]);
    
    if (enrollmentCheck.rows.length > 0) {
      const { rows } = await req.app.locals.pool.query(query, [id]);
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

// Adicionar curso à turma
router.post('/:id/courses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { course_id, is_required = false, order_index } = req.body;
    
    console.log('[POST /api/classes/:id/courses] Adicionando curso à turma:', id);
    console.log('[POST /api/classes/:id/courses] Dados recebidos:', req.body);
    console.log('[POST /api/classes/:id/courses] Usuário:', req.user);
    
    if (!course_id) {
      console.log('[POST /api/classes/:id/courses] Erro: course_id não fornecido');
      return res.status(400).json({ error: 'course_id é obrigatório.' });
    }
    
    // Verificar se o usuário é instructor da turma ou admin
    const classCheck = await req.app.locals.pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      console.log('[POST /api/classes/:id/courses] Erro: Turma não encontrada');
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    console.log('[POST /api/classes/:id/courses] Instructor da turma:', classCheck.rows[0].instructor_id);
    console.log('[POST /api/classes/:id/courses] Usuário atual:', req.user.id);
    console.log('[POST /api/classes/:id/courses] Role do usuário:', req.user.role);
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      console.log('[POST /api/classes/:id/courses] Erro: Acesso negado');
      return res.status(403).json({ error: 'Apenas o instructor da turma pode adicionar cursos.' });
    }
    
    // Verificar se o curso existe
    const courseCheck = await req.app.locals.pool.query('SELECT id FROM courses WHERE id = $1', [course_id]);
    if (courseCheck.rows.length === 0) {
      console.log('[POST /api/classes/:id/courses] Erro: Curso não encontrado');
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }
    
    // Verificar se o curso já está na turma
    const existingCheck = await req.app.locals.pool.query(`
      SELECT id FROM class_courses WHERE class_id = $1 AND course_id = $2
    `, [id, course_id]);
    
    if (existingCheck.rows.length > 0) {
      console.log('[POST /api/classes/:id/courses] Erro: Curso já está na turma');
      return res.status(400).json({ error: 'Este curso já está associado à turma.' });
    }
    
    // Determinar a ordem do curso
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const maxOrderResult = await req.app.locals.pool.query(`
        SELECT COALESCE(MAX(order_index), -1) as max_order FROM class_courses WHERE class_id = $1
      `, [id]);
      finalOrderIndex = maxOrderResult.rows[0].max_order + 1;
    }
    
    console.log('[POST /api/classes/:id/courses] Ordem final:', finalOrderIndex);
    
    const courseClassId = crypto.randomUUID();
    const { rows } = await req.app.locals.pool.query(`
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

// Atualizar configurações de um curso na turma
router.put('/:id/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { id, courseId } = req.params;
    const { is_required, order_index } = req.body;
    
    console.log('[PUT /api/classes/:id/courses/:courseId] Atualizando curso da turma');
    console.log('[PUT /api/classes/:id/courses/:courseId] Dados recebidos:', req.body);
    console.log('[PUT /api/classes/:id/courses/:courseId] Usuário:', req.user);
    
    // Verificar se o usuário é instructor da turma ou admin
    const classCheck = await req.app.locals.pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode editar cursos.' });
    }
    
    // Verificar se o curso está na turma
    const courseCheck = await req.app.locals.pool.query(`
      SELECT id FROM class_courses WHERE class_id = $1 AND course_id = $2
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
    
    const { rows } = await req.app.locals.pool.query(`
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
router.delete('/:id/courses/:courseId', authenticateToken, async (req, res) => {
  try {
    const { id, courseId } = req.params;
    
    console.log('[DELETE /api/classes/:id/courses/:courseId] Removendo curso da turma');
    console.log('[DELETE /api/classes/:id/courses/:courseId] Usuário:', req.user);
    
    // Verificar se o usuário é instructor da turma ou admin
    const classCheck = await req.app.locals.pool.query(`
      SELECT instructor_id FROM class_instances WHERE id = $1
    `, [id]);
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada.' });
    }
    
    if (classCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas o instructor da turma pode remover cursos.' });
    }
    
    // Verificar se o curso está na turma
    const courseCheck = await req.app.locals.pool.query(`
      SELECT id, is_required FROM class_courses WHERE class_id = $1 AND course_id = $2
    `, [id, courseId]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado na turma.' });
    }
    
    // Não permitir remover o curso obrigatório (primeiro curso)
    if (courseCheck.rows[0].is_required) {
      return res.status(400).json({ error: 'Não é possível remover o curso obrigatório da turma.' });
    }
    
    // Remover o curso
    await req.app.locals.pool.query(`
      DELETE FROM class_courses WHERE class_id = $1 AND course_id = $2
    `, [id, courseId]);
    
    console.log('[DELETE /api/classes/:id/courses/:courseId] Curso removido com sucesso');
    res.json({ message: 'Curso removido da turma com sucesso.' });
    
  } catch (err) {
    console.error('[DELETE /api/classes/:id/courses/:courseId] Erro:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router; 