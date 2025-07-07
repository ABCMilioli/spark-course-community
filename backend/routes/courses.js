const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

module.exports = (pool, sendWebhook) => {
  // Listar cursos
  router.get('/', authenticateToken, async (req, res) => {
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



  // Detalhes de um curso específico
  router.get('/:id', authenticateToken, async (req, res) => {
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

  // Criar novo curso
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const { title, description, category, level, price, thumbnail, demo_video, isPaid, payment_gateway = 'mercadopago', external_checkout_url = null } = req.body;
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
      await pool.query(
        `INSERT INTO courses (id, title, description, category, level, price, thumbnail_url, demo_video, isPaid, payment_gateway, external_checkout_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, title, description, category, level, finalPrice, thumbnail, demo_video, isPaid, payment_gateway, external_checkout_url, created_at, created_at]
      );
      res.status(201).json({ id, title, payment_gateway, external_checkout_url });
    } catch (err) {
      console.error('[POST /api/courses]', err);
      res.status(500).json({ error: 'Erro ao criar curso.' });
    }
  });

  // Editar curso
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, category, level, price, thumbnail, demo_video, isPaid, payment_gateway, external_checkout_url } = req.body;
      // Atualiza apenas os campos enviados
      const fields = [];
      const values = [];
      let idx = 1;
      if (title) { fields.push(`title = $${idx++}`); values.push(title); }
      if (description) { fields.push(`description = $${idx++}`); values.push(description); }
      if (category) { fields.push(`category = $${idx++}`); values.push(category); }
      if (level) { fields.push(`level = $${idx++}`); values.push(level); }
      if (price) { fields.push(`price = $${idx++}`); values.push(price); }
      if (thumbnail) { fields.push(`thumbnail_url = $${idx++}`); values.push(thumbnail); }
      if (demo_video) { fields.push(`demo_video = $${idx++}`); values.push(demo_video); }
      if (isPaid !== undefined) { fields.push(`isPaid = $${idx++}`); values.push(isPaid); }
      if (payment_gateway) { fields.push(`payment_gateway = $${idx++}`); values.push(payment_gateway); }
      if (external_checkout_url) { fields.push(`external_checkout_url = $${idx++}`); values.push(external_checkout_url); }
      if (fields.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
      }
      fields.push(`updated_at = $${idx++}`); values.push(new Date());
      values.push(id);
      const query = `UPDATE courses SET ${fields.join(', ')} WHERE id = $${idx}`;
      await pool.query(query, values);
      res.json({ success: true });
    } catch (err) {
      console.error('[PUT /api/courses/:id]', err);
      res.status(500).json({ error: 'Erro ao atualizar curso.' });
    }
  });

  // Deletar curso
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM courses WHERE id = $1 AND instructor_id = $2 RETURNING *',
        [id, req.user.id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Curso não encontrado ou sem permissão.' });
      }
      
      // Disparar webhook para exclusão de curso
      try {
        const deletedCourse = result.rows[0];
        await sendWebhook('course.deleted', {
          id: deletedCourse.id,
          title: deletedCourse.title,
          instructor_id: req.user.id,
          instructor_name: req.user.name,
          deleted_at: new Date().toISOString()
        });
      } catch (webhookError) {
        console.error('[WEBHOOK] Erro ao enviar webhook course.deleted:', webhookError);
      }
      
      res.json({ message: 'Curso deletado com sucesso.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao deletar curso.' });
    }
  });

  // ===== ROTAS DE ADMINISTRAÇÃO DE CURSOS =====
  
  // Função helper para verificar se o usuário é admin ou instructor
  const requireAdmin = (req, res, next) => {
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores e instrutores podem acessar esta rota.' });
    }
    next();
  };

  // Buscar dados completos do curso para administração
  router.get('/:id/admin', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[GET /api/courses/${id}/admin] Requisição recebida`);
      console.log(`[GET /api/courses/${id}/admin] Usuário:`, req.user);
      
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

  // Atualizar dados completos do curso (administração)
  router.put('/:id/admin', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, instructor_id, modules } = req.body;
      
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
  router.get('/:id/player', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('[GET /api/courses/:id/player] Buscando dados do player para curso:', id);
      console.log('[GET /api/courses/:id/player] Usuário:', req.user.id, req.user.role);
      
      // Verificar se o usuário está matriculado no curso
      const enrollmentCheck = await pool.query(
        'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [req.user.id, id]
      );
      
      if (enrollmentCheck.rows.length === 0 && req.user.role !== 'admin') {
        console.log('[GET /api/courses/:id/player] Usuário não matriculado e não é admin');
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
        console.log('[GET /api/courses/:id/player] Curso não encontrado');
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

      console.log('[GET /api/courses/:id/player] Dados do player retornados com sucesso');
      console.log('[GET /api/courses/:id/player] Progresso:', progressPercentage + '%');

      res.json({
        ...course,
        progressPercentage
      });
    } catch (err) {
      console.error('[GET /api/courses/:id/player] Erro:', err);
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  return router;
}; 