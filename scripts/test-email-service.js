const { sendMail } = require('../backend/services/emailService');

async function testEmailService() {
  console.log('🧪 Testando serviço de e-mail...');
  
  // Verificar variáveis de ambiente
  const requiredEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM'
  ];
  
  console.log('\n📋 Variáveis de ambiente:');
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${envVar.includes('PASS') ? '***' : value}`);
    } else {
      console.log(`❌ ${envVar}: NÃO DEFINIDA`);
    }
  }
  
  // Testar envio de e-mail
  try {
    console.log('\n📧 Testando envio de e-mail...');
    
    const testEmail = {
      to: process.env.SMTP_USER || 'teste@exemplo.com',
      subject: 'Teste de Recuperação de Senha - Spark Course',
      html: `
        <h2>Teste de E-mail</h2>
        <p>Este é um e-mail de teste para verificar se o sistema de recuperação de senha está funcionando.</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <p>Se você recebeu este e-mail, o sistema está configurado corretamente!</p>
      `,
      text: 'Teste de e-mail - Sistema de recuperação de senha funcionando.'
    };
    
    await sendMail(testEmail);
    console.log('✅ E-mail enviado com sucesso!');
    console.log('📬 Verifique sua caixa de entrada (e spam)');
    
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error.message);
    console.log('\n🔧 Possíveis soluções:');
    console.log('1. Verifique se as variáveis SMTP estão configuradas');
    console.log('2. Para Gmail, use "Senha de App" em vez da senha normal');
    console.log('3. Verifique se o servidor SMTP está acessível');
    console.log('4. Verifique se a porta SMTP não está bloqueada');
  }
}

// Executar teste
testEmailService().catch(console.error); 