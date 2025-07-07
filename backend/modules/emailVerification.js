const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../services/emailService');

// Função para gerar token seguro
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Função para verificar se email já existe
async function checkEmailExists(pool, email) {
  const { rows } = await pool.query('SELECT id FROM profiles WHERE email = $1', [email]);
  return rows.length > 0;
}

// Função para salvar dados de verificação
async function saveVerificationData(pool, email, token, name, passwordHash) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
  
  await pool.query(
    'INSERT INTO email_verification_tokens (email, token, name, password_hash, expires_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET token = $2, name = $3, password_hash = $4, expires_at = $5',
    [email, token, name, passwordHash, expiresAt]
  );
}

// Função para buscar dados de verificação
async function getVerificationData(pool, token) {
  const { rows } = await pool.query(
    'SELECT * FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  return rows[0] || null;
}

// Função para remover token usado
async function removeVerificationToken(pool, token) {
  await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);
}

// Função para limpar tokens expirados
async function cleanupExpiredTokens(pool) {
  await pool.query('DELETE FROM email_verification_tokens WHERE expires_at < NOW()');
}

module.exports = {
  async requestEmailVerification(pool, name, email, password) {
    console.log('[emailVerification] Iniciando verificação para:', email);
    
    // Verificar se email já existe
    const emailExists = await checkEmailExists(pool, email);
    if (emailExists) {
      throw new Error('Este email já está cadastrado.');
    }
    
    // Gerar token
    const token = generateToken();
    console.log('[emailVerification] Token gerado:', token.substring(0, 10) + '...');
    
    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Salvar dados temporários
    await saveVerificationData(pool, email, token, name, passwordHash);
    console.log('[emailVerification] Dados salvos temporariamente');
    
    // Limpar tokens expirados
    await cleanupExpiredTokens(pool);
    
    // Gerar link de verificação
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/verify-email?token=${token}`;
    console.log('[emailVerification] Link de verificação gerado:', verificationLink);
    
    // Enviar email
    try {
      console.log('[emailVerification] Enviando e-mail de verificação...');
      await sendMail({
        to: email,
        subject: 'Confirme seu email - Spark Course Community',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">Spark Course Community</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Confirme seu email para completar o cadastro</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Olá ${name}!</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Obrigado por se cadastrar no Spark Course Community! Para completar seu cadastro e começar a usar a plataforma, 
                clique no botão abaixo para confirmar seu endereço de email.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block; 
                          font-weight: bold;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  Confirmar Email
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
                Se o botão não funcionar, você pode copiar e colar o link abaixo no seu navegador:
              </p>
              
              <p style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; color: #495057;">
                <a href="${verificationLink}" style="color: #667eea;">${verificationLink}</a>
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="color: #999; font-size: 14px; margin-bottom: 10px;">
                  <strong>Importante:</strong>
                </p>
                <ul style="color: #999; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">
                  <li>Este link expira em 24 horas</li>
                  <li>Se você não solicitou este cadastro, ignore este email</li>
                  <li>Para dúvidas, entre em contato conosco</li>
                </ul>
              </div>
            </div>
            
            <div style="background: #343a40; padding: 20px; text-align: center; color: #adb5bd;">
              <p style="margin: 0; font-size: 14px;">
                © 2024 Spark Course Community. Todos os direitos reservados.
              </p>
            </div>
          </div>
        `,
        text: `
          Confirme seu email - Spark Course Community
          
          Olá ${name}!
          
          Obrigado por se cadastrar no Spark Course Community! Para completar seu cadastro, 
          clique no link abaixo:
          
          ${verificationLink}
          
          Este link expira em 24 horas.
          Se você não solicitou este cadastro, ignore este email.
        `
      });
      console.log('[emailVerification] E-mail de verificação enviado com sucesso!');
    } catch (error) {
      console.error('[emailVerification] Erro ao enviar e-mail:', error);
      throw error;
    }
  },

  async confirmEmailVerification(pool, token) {
    console.log('[emailVerification] Confirmando verificação para token:', token.substring(0, 10) + '...');
    
    // Buscar dados de verificação
    const verificationData = await getVerificationData(pool, token);
    if (!verificationData) {
      throw new Error('Token inválido ou expirado.');
    }
    
    console.log('[emailVerification] Dados de verificação encontrados para:', verificationData.email);
    
    // Verificar se email ainda não foi usado
    const emailExists = await checkEmailExists(pool, verificationData.email);
    if (emailExists) {
      // Remover token mesmo assim
      await removeVerificationToken(pool, token);
      throw new Error('Este email já foi verificado e está em uso.');
    }
    
    // Criar usuário
    const userId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO profiles (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [userId, verificationData.name, verificationData.email, verificationData.password_hash, 'student']
    );
    
    console.log('[emailVerification] Usuário criado com sucesso:', verificationData.email);
    
    // Remover token usado
    await removeVerificationToken(pool, token);
    
    // Disparar webhook para criação de usuário
    try {
      const { sendWebhook } = require('../services/webhookService');
      await sendWebhook('user.created', {
        id: userId,
        name: verificationData.name,
        email: verificationData.email,
        role: 'student',
        created_at: new Date().toISOString()
      });
    } catch (webhookError) {
      console.error('[emailVerification] Erro ao enviar webhook user.created:', webhookError);
    }
    
    return {
      id: userId,
      name: verificationData.name,
      email: verificationData.email,
      role: 'student'
    };
  },

  // Função para reenviar email de verificação
  async resendVerificationEmail(pool, email) {
    console.log('[emailVerification] Reenviando verificação para:', email);
    
    // Buscar dados existentes
    const { rows } = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE email = $1 AND expires_at > NOW()',
      [email]
    );
    
    if (rows.length === 0) {
      throw new Error('Não foi encontrada uma solicitação de verificação válida para este email.');
    }
    
    const verificationData = rows[0];
    
    // Gerar novo token
    const newToken = generateToken();
    
    // Atualizar token
    await pool.query(
      'UPDATE email_verification_tokens SET token = $1, expires_at = $2 WHERE email = $3',
      [newToken, new Date(Date.now() + 24 * 60 * 60 * 1000), email]
    );
    
    // Gerar novo link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/verify-email?token=${newToken}`;
    
    // Enviar novo email
    await sendMail({
      to: email,
      subject: 'Reenvio - Confirme seu email - Spark Course Community',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Spark Course Community</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Reenvio - Confirme seu email</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Olá ${verificationData.name}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Você solicitou um novo link de verificação. Clique no botão abaixo para confirmar seu email:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-weight: bold;">
                Confirmar Email
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              Link direto: <a href="${verificationLink}" style="color: #667eea;">${verificationLink}</a>
            </p>
            
            <p style="color: #999; font-size: 14px;">
              Este link expira em 24 horas.
            </p>
          </div>
        </div>
      `
    });
    
    console.log('[emailVerification] E-mail de reenvio enviado com sucesso!');
  }
}; 