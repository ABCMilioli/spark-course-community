const fetch = require('node-fetch');

async function testApiResponse() {
  console.log('🧪 TESTANDO RESPOSTA DA API');
  console.log('============================\n');

  try {
    // Simular uma requisição para a API de conversas
    const baseUrl = 'https://community.iacas.top';
    
    console.log('1. Testando GET /api/conversations...');
    
    // Nota: Este teste requer um token válido
    // Você pode obter um token fazendo login no frontend e copiando do localStorage
    const token = process.env.TEST_TOKEN || 'SEU_TOKEN_AQUI';
    
    if (token === 'SEU_TOKEN_AQUI') {
      console.log('⚠️  Para testar, defina a variável TEST_TOKEN com um token válido');
      console.log('   Exemplo: TEST_TOKEN=seu_token_aqui node scripts/test-api-response.cjs');
      return;
    }

    const response = await fetch(`${baseUrl}/api/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const conversations = await response.json();
      console.log('✅ Resposta recebida com sucesso');
      console.log(`   Total de conversas: ${conversations.length}`);
      
      if (conversations.length > 0) {
        const firstConversation = conversations[0];
        console.log('\n2. Analisando primeira conversa:');
        console.log('   ID:', firstConversation.id);
        console.log('   Tem other_user:', !!firstConversation.other_user);
        
        if (firstConversation.other_user) {
          console.log('   Other user:', {
            id: firstConversation.other_user.id,
            name: firstConversation.other_user.name,
            avatar_url: firstConversation.other_user.avatar_url
          });
        } else {
          console.log('   ❌ other_user está undefined/null');
        }
        
        console.log('   Tem participants:', !!firstConversation.participants);
        console.log('   Participants count:', firstConversation.participants?.length || 0);
        
        // Testar buscar a conversa específica
        console.log('\n3. Testando GET /api/conversations/:id...');
        const conversationResponse = await fetch(`${baseUrl}/api/conversations/${firstConversation.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (conversationResponse.ok) {
          const conversationData = await conversationResponse.json();
          console.log('✅ Conversa específica carregada com sucesso');
          console.log('   Tem conversation:', !!conversationData.conversation);
          console.log('   Tem participants:', !!conversationData.participants);
          console.log('   Tem messages:', !!conversationData.messages);
          console.log('   Messages count:', conversationData.messages?.length || 0);
          
          if (conversationData.conversation) {
            console.log('   Tem other_user na conversation:', !!conversationData.conversation.other_user);
            if (conversationData.conversation.other_user) {
              console.log('   Other user:', {
                id: conversationData.conversation.other_user.id,
                name: conversationData.conversation.other_user.name
              });
            }
          }
        } else {
          console.log('❌ Erro ao carregar conversa específica:', conversationResponse.status);
          const errorText = await conversationResponse.text();
          console.log('   Erro:', errorText);
        }
      } else {
        console.log('⚠️  Nenhuma conversa encontrada para testar');
      }
    } else {
      console.log('❌ Erro na requisição:', response.status);
      const errorText = await response.text();
      console.log('   Erro:', errorText);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testApiResponse(); 