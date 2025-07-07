const express = require('express');
const crypto = require('crypto');
const externalApiAuth = require('../middleware/externalApiAuth');

const router = express.Router();

module.exports = (pool) => {
  // Endpoint para matrícula/desmatrícula externa
  router.post('/enroll', externalApiAuth, async (req, res) => {
    try {
      const { user, course_id, class_id, action = 'enroll' } = req.body;
      if (!user || !user.cpf || (!course_id && !class_id)) {
        return res.status(400).json({ error: 'CPF e course_id/class_id são obrigatórios.' });
      }
      // Buscar ou criar usuário por CPF
      let userId;
      const userResult = await pool.query('SELECT id FROM profiles WHERE cpf = $1', [user.cpf]);
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
      } else {
        userId = crypto.randomUUID();
        await pool.query(
          'INSERT INTO profiles (id, cpf, email, name, external_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
          [userId, user.cpf, user.email || null, user.name || null, user.external_id || null]
        );
      }
      // Matrícula/desmatrícula em curso
      let enrollmentId = null;
      if (course_id) {
        if (action === 'enroll') {
          enrollmentId = crypto.randomUUID();
          await pool.query(
            'INSERT INTO enrollments (id, user_id, course_id, enrolled_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id, course_id) DO NOTHING',
            [enrollmentId, userId, course_id]
          );
        } else if (action === 'unenroll') {
          await pool.query(
            'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, course_id]
          );
        }
      }
      // Matrícula/desmatrícula em turma
      let classEnrollmentId = null;
      if (class_id) {
        if (action === 'enroll') {
          classEnrollmentId = crypto.randomUUID();
          await pool.query(
            'INSERT INTO class_enrollments (id, user_id, class_id, role, status, enrolled_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (class_id, user_id) DO UPDATE SET status = $5',
            [classEnrollmentId, userId, class_id, 'student', 'active']
          );
        } else if (action === 'unenroll') {
          await pool.query(
            'UPDATE class_enrollments SET status = $1 WHERE user_id = $2 AND class_id = $3',
            ['inactive', userId, class_id]
          );
        }
      }
      // Log da operação (pode ser expandido)
      return res.json({
        success: true,
        message: action === 'enroll' ? 'Usuário matriculado com sucesso.' : 'Usuário desmatriculado com sucesso.',
        user_id: userId,
        enrollment_id: enrollmentId,
        class_enrollment_id: classEnrollmentId
      });
    } catch (err) {
      console.error('[POST /api/external/enroll]', err);
      res.status(500).json({ error: 'Erro ao processar matrícula externa.' });
    }
  });

  // Endpoint para consulta de matrícula
  router.post('/check-enrollment', externalApiAuth, async (req, res) => {
    try {
      const { cpf, course_id, class_id } = req.body;
      if (!cpf || (!course_id && !class_id)) {
        return res.status(400).json({ error: 'CPF e course_id/class_id são obrigatórios.' });
      }
      // Buscar usuário por CPF
      const userResult = await pool.query('SELECT id FROM profiles WHERE cpf = $1', [cpf]);
      if (userResult.rows.length === 0) {
        return res.json({ success: true, user_id: null, enrollment: { status: 'none' }, class_enrollment: { status: 'none' } });
      }
      const userId = userResult.rows[0].id;
      // Consultar matrícula em curso
      let enrollment = { status: 'none' };
      if (course_id) {
        const enrollResult = await pool.query('SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, course_id]);
        if (enrollResult.rows.length > 0) {
          enrollment = { course_id, status: 'active' };
        } else {
          enrollment = { course_id, status: 'none' };
        }
      }
      // Consultar matrícula em turma
      let classEnrollment = { status: 'none' };
      if (class_id) {
        const classEnrollResult = await pool.query('SELECT status FROM class_enrollments WHERE user_id = $1 AND class_id = $2', [userId, class_id]);
        if (classEnrollResult.rows.length > 0) {
          classEnrollment = { class_id, status: classEnrollResult.rows[0].status };
        } else {
          classEnrollment = { class_id, status: 'none' };
        }
      }
      return res.json({ success: true, user_id: userId, enrollment, class_enrollment: classEnrollment });
    } catch (err) {
      console.error('[POST /api/external/check-enrollment]', err);
      res.status(500).json({ error: 'Erro ao consultar matrícula.' });
    }
  });

  // Buscar curso por nome exato
  router.post('/find-course', externalApiAuth, async (req, res) => {
    try {
      const { course_name } = req.body;
      if (!course_name) {
        return res.status(400).json({ error: 'Nome do curso obrigatório.' });
      }
      const result = await pool.query('SELECT * FROM courses WHERE title = $1', [course_name]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Curso não encontrado.' });
      }
      return res.json({ success: true, courses: result.rows });
    } catch (err) {
      console.error('[POST /api/external/find-course]', err);
      res.status(500).json({ error: 'Erro ao buscar curso.' });
    }
  });

  // Buscar turma por nome exato
  router.post('/find-class', externalApiAuth, async (req, res) => {
    try {
      const { class_name } = req.body;
      if (!class_name) {
        return res.status(400).json({ error: 'Nome da turma obrigatório.' });
      }
      const result = await pool.query('SELECT * FROM classes WHERE name = $1', [class_name]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Turma não encontrada.' });
      }
      return res.json({ success: true, classes: result.rows });
    } catch (err) {
      console.error('[POST /api/external/find-class]', err);
      res.status(500).json({ error: 'Erro ao buscar turma.' });
    }
  });

  return router;
}; 