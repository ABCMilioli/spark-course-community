const axios = require('axios');

async function testForgotPassword() {
  console.log('🧪 Testando endpoint de recuperação de senha...');
  
  const testEmail = process.argv[2] || 'teste@exemplo.com';
  console.log('📧 E-mail de teste:', testEmail);
  
  try {
    console.log('📡 Fazendo requisição para /api/auth/forgot-password...');
    
    const response = await axios.post('http://localhost:8080/api/auth/forgot-password', {
      email: testEmail
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Resposta do servidor:', response.status);
    console.log('📄 Dados da resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro na requisição:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error('Erro de rede:', error.message);
    }
  }
}

// Executar teste
testForgotPassword().catch(console.error); 