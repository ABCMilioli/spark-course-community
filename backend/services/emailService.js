const nodemailer = require('nodemailer');

function createTransporter() {
  console.log('[emailService] Criando transporter SMTP...');
  console.log('[emailService] Configurações:', {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? '***' : 'NÃO DEFINIDA',
  });
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outros
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Envia um e-mail usando SMTP genérico
 * @param {Object} options
 * @param {string} options.to - Destinatário
 * @param {string} options.subject - Assunto
 * @param {string} [options.html] - Corpo em HTML
 * @param {string} [options.text] - Corpo em texto puro
 * @param {string} [options.from] - Remetente (opcional)
 */
async function sendMail({ to, subject, html, text, from }) {
  console.log('[emailService] Iniciando envio de e-mail...');
  console.log('[emailService] Para:', to);
  console.log('[emailService] Assunto:', subject);
  console.log('[emailService] De:', from || process.env.SMTP_FROM || process.env.SMTP_USER);
  
  try {
    const transporter = createTransporter();
    console.log('[emailService] Transporter criado, verificando conexão...');
    
    // Verificar conexão
    await transporter.verify();
    console.log('[emailService] Conexão SMTP verificada com sucesso');
    
    const mailOptions = {
      from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    };
    
    console.log('[emailService] Enviando e-mail...');
    const result = await transporter.sendMail(mailOptions);
    console.log('[emailService] E-mail enviado com sucesso!');
    console.log('[emailService] Message ID:', result.messageId);
    
    return result;
  } catch (error) {
    console.error('[emailService] Erro ao enviar e-mail:', error);
    console.error('[emailService] Detalhes do erro:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw error;
  }
}

module.exports = { sendMail }; 