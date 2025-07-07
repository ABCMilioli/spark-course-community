const axios = require('axios');

async function testEmailVerification() {
  console.log('🧪 Testando sistema de verificação de email...');
  
  const testEmail = process.argv[2] || 'teste@exemplo.com';
  const testName = process.argv[3] || 'Usuário Teste';
  const testPassword = process.argv[4] || 'senha123';
  
  console.log('📧 Dados de teste:');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Nome: ${testName}`);
  console.log(`   Senha: ${testPassword}`);
  console.log('');
  
  try {
    // Teste 1: Solicitar verificação de email
    console.log('1️⃣ Testando solicitação de verificação...');
    
    const signupResponse = await axios.post('http://localhost:8080/api/auth/signup-request', {
      name: testName,
      email: testEmail,
      password: testPassword
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (signupResponse.data.success) {
      console.log('✅ Solicitação de verificação enviada com sucesso!');
      console.log(`   Resposta: ${signupResponse.data.message}`);
    } else {
      console.log('❌ Erro na solicitação de verificação');
      console.log(`   Erro: ${signupResponse.data.error}`);
    }
    
    console.log('');
    
    // Teste 2: Tentar reenviar verificação
    console.log('2️⃣ Testando reenvio de verificação...');
    
    try {
      const resendResponse = await axios.post('http://localhost:8080/api/auth/resend-verification', {
        email: testEmail
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (resendResponse.data.success) {
        console.log('✅ Reenvio de verificação enviado com sucesso!');
        console.log(`   Resposta: ${resendResponse.data.message}`);
      } else {
        console.log('❌ Erro no reenvio de verificação');
        console.log(`   Erro: ${resendResponse.data.error}`);
      }
    } catch (resendError) {
      if (resendError.response) {
        console.log('❌ Erro no reenvio de verificação');
        console.log(`   Status: ${resendError.response.status}`);
        console.log(`   Erro: ${resendError.response.data.error}`);
      } else {
        console.log('❌ Erro de conexão no reenvio');
        console.log(`   Erro: ${resendError.message}`);
      }
    }
    
    console.log('');
    
    // Teste 3: Tentar confirmar com token inválido
    console.log('3️⃣ Testando confirmação com token inválido...');
    
    try {
      const confirmResponse = await axios.post('http://localhost:8080/api/auth/signup-confirm', {
        token: 'token-invalido-123'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Confirmação deveria ter falhado');
      console.log(`   Resposta inesperada: ${confirmResponse.data}`);
    } catch (confirmError) {
      if (confirmError.response) {
        console.log('✅ Confirmação com token inválido falhou corretamente');
        console.log(`   Status: ${confirmError.response.status}`);
        console.log(`   Erro: ${confirmError.response.data.error}`);
      } else {
        console.log('❌ Erro de conexão na confirmação');
        console.log(`   Erro: ${confirmError.message}`);
      }
    }
    
    console.log('');
    console.log('🎉 Testes concluídos!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Verifique se o email foi recebido (incluindo spam)');
    console.log('2. Clique no link de verificação no email');
    console.log('3. Teste o login com a conta criada');
    console.log('');
    console.log('🔧 Para testar manualmente:');
    console.log(`   - Acesse: http://localhost:3000`);
    console.log(`   - Clique em "Criar Conta"`);
    console.log(`   - Use o email: ${testEmail}`);
    
  } catch (error) {
    console.error('❌ Erro geral nos testes:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
  }
}

// Executar testes
if (require.main === module) {
  testEmailVerification().catch(console.error);
}

module.exports = { testEmailVerification }; 