async function testForgotPassword() {
  console.log('🧪 Testando endpoint de recuperação de senha...');
  
  const testEmail = process.argv[2] || 'teste@exemplo.com';
  console.log('📧 E-mail de teste:', testEmail);
  
  try {
    console.log('📡 Fazendo requisição para /api/auth/forgot-password...');
    
    const response = await fetch('http://localhost:8080/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testEmail })
    });
    
    console.log('✅ Status da resposta:', response.status);
    
    const data = await response.json();
    console.log('📄 Dados da resposta:', data);
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// Executar teste
testForgotPassword().catch(console.error); 