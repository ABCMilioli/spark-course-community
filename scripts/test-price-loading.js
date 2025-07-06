import axios from 'axios';

// Teste para verificar se o preço está sendo carregado corretamente
async function testPriceLoading() {
  const courseId = 'ce8cd75f-0284-4a08-b1db-d3c5bc8f87bc'; // ID do curso dos logs
  const apiUrl = process.env.VITE_API_URL || 'https://community.iacas.top/api';
  
  console.log('🧪 Testando carregamento de preço...');
  console.log(`API URL: ${apiUrl}`);
  console.log(`Course ID: ${courseId}`);
  console.log('');
  
  try {
    // Simular requisição sem token (como seria no frontend)
    const response = await axios.get(`${apiUrl}/courses/${courseId}`);
    
    console.log('✅ Resposta da API:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    
    // Verificar se o preço está presente
    if (response.data.price !== undefined) {
      console.log(`✅ Preço encontrado: R$ ${response.data.price}`);
      
      // Verificar tipo do preço
      console.log(`📊 Tipo do preço: ${typeof response.data.price}`);
      
      // Verificar se é um número válido
      const priceNumber = Number(response.data.price);
      if (!isNaN(priceNumber)) {
        console.log(`✅ Preço convertido para número: R$ ${priceNumber.toFixed(2)}`);
      } else {
        console.log('❌ Preço não é um número válido');
      }
    } else {
      console.log('❌ Preço não encontrado na resposta');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar:', error.response?.data || error.message);
  }
}

// Executar teste
testPriceLoading(); 