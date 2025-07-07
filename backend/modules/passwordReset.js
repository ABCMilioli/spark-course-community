const crypto = require('crypto');
const { sendMail } = require('../services/emailService');
const bcrypt = require('bcryptjs');

// Função para gerar token seguro
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Salvar e buscar tokens no banco (exemplo usando pool do app.locals)
async function saveResetToken(pool, userId, token) {
  // Remove tokens antigos
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  // Salva novo token
  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
    [userId, token]
  );
}

async function getUserByEmail(pool, email) {
  const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
  return rows[0];
}

async function getUserByResetToken(pool, token) {
  const { rows } = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  if (!rows[0]) return null;
  const userRes = await pool.query('SELECT * FROM profiles WHERE id = $1', [rows[0].user_id]);
  return userRes.rows[0];
}

async function deleteResetToken(pool, token) {
  await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
}

module.exports = {
  async requestPasswordReset(pool, email) {
    console.log('[passwordReset] Iniciando recuperação para:', email);
    
    const user = await getUserByEmail(pool, email);
    console.log('[passwordReset] Usuário encontrado:', !!user);
    
    if (!user) {
      console.log('[passwordReset] Usuário não encontrado, retornando silenciosamente');
      return; // Não revela se existe ou não
    }
    
    console.log('[passwordReset] Gerando token para usuário:', user.id);
    const token = generateToken();
    console.log('[passwordReset] Token gerado:', token.substring(0, 10) + '...');
    
    await saveResetToken(pool, user.id, token);
    console.log('[passwordReset] Token salvo no banco');
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;
    console.log('[passwordReset] Link de reset gerado:', resetLink);
    
    console.log('[passwordReset] Configurações SMTP:');
    console.log('[passwordReset] - SMTP_HOST:', process.env.SMTP_HOST);
    console.log('[passwordReset] - SMTP_PORT:', process.env.SMTP_PORT);
    console.log('[passwordReset] - SMTP_USER:', process.env.SMTP_USER);
    console.log('[passwordReset] - SMTP_FROM:', process.env.SMTP_FROM);
    
    try {
      console.log('[passwordReset] Enviando e-mail...');
      await sendMail({
        to: user.email,
        subject: 'Recuperação de senha',
        html: `<p>Olá,</p><p>Para redefinir sua senha, clique no link abaixo:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Se não foi você, ignore este e-mail.</p>`,
      });
      console.log('[passwordReset] E-mail enviado com sucesso!');
    } catch (error) {
      console.error('[passwordReset] Erro ao enviar e-mail:', error);
      throw error;
    }
  },

  async resetPassword(pool, token, newPassword) {
    const user = await getUserByResetToken(pool, token);
    if (!user) throw new Error('Token inválido ou expirado');
    // Atualizar senha (hash recomendado)
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [hash, user.id]);
    await deleteResetToken(pool, token);
  },
}; 