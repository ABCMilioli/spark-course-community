import axios from 'axios';

// Script para testar a verificação de status do pagamento
async function testPaymentStatus() {
  const courseId = 'ce8cd75f-0284-4a08-b1db-d3c5bc8f87bc'; // ID do curso dos logs
  const apiUrl = process.env.VITE_API_URL || 'https://community.iacas.top/api';
  
  console.log('🧪 Testando verificação de status do pagamento...');
  console.log(`API URL: ${apiUrl}`);
  console.log(`Course ID: ${courseId}`);
  console.log('');
  
  try {
    // Simular requisição com token (como seria no frontend)
    const token = 'seu_token_aqui'; // Substitua por um token válido
    
    const response = await axios.get(`${apiUrl}/payments/status/${courseId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Resposta da API:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    
    // Verificar se o status está presente
    if (response.data.status) {
      console.log(`✅ Status encontrado: ${response.data.status}`);
      
      // Verificar se é um status válido
      const validStatuses = ['pending', 'succeeded', 'failed', 'approved', 'rejected'];
      if (validStatuses.includes(response.data.status)) {
        console.log(`✅ Status válido: ${response.data.status}`);
      } else {
        console.log(`⚠️  Status não reconhecido: ${response.data.status}`);
      }
    } else {
      console.log('❌ Status não encontrado na resposta');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Dica: Token de autenticação necessário');
    }
  }
}

// Executar teste
testPaymentStatus(); 