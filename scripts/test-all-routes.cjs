const fetch = require('node-fetch');

async function testAllRoutes() {
  console.log('🧪 TESTANDO TODAS AS ROTAS IMPLEMENTADAS');
  console.log('==========================================\n');

  const baseUrl = 'https://community.iacas.top';
  const token = process.env.TEST_TOKEN || 'SEU_TOKEN_AQUI';
  
  if (token === 'SEU_TOKEN_AQUI') {
    console.log('⚠️  Para testar, defina a variável TEST_TOKEN com um token válido');
    console.log('   Exemplo: TEST_TOKEN=seu_token_aqui node scripts/test-all-routes.cjs');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const tests = [
    {
      name: 'GET /api/conversations',
      url: `${baseUrl}/api/conversations`,
      method: 'GET'
    },
    {
      name: 'GET /api/users/:userId/profile',
      url: `${baseUrl}/api/users/fa7b736b-29fa-4991-9eea-cb9380c90de1/profile`,
      method: 'GET'
    },
    {
      name: 'GET /api/users (admin)',
      url: `${baseUrl}/api/users?limit=5`,
      method: 'GET'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testando: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url, {
        method: test.method,
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Status: ${response.status}`);
        
        if (test.name.includes('conversations') && Array.isArray(data)) {
          console.log(`   📊 Conversas encontradas: ${data.length}`);
          if (data.length > 0) {
            const first = data[0];
            console.log(`   👤 Primeira conversa tem other_user: ${!!first.other_user}`);
            if (first.other_user) {
              console.log(`   👤 Other user: ${first.other_user.name}`);
            }
          }
        } else if (test.name.includes('profile')) {
          console.log(`   👤 Perfil: ${data.name} (${data.role})`);
          console.log(`   📊 Stats: ${data.stats?.posts_count || 0} posts, ${data.stats?.courses_enrolled || 0} cursos`);
        } else if (test.name.includes('users') && Array.isArray(data)) {
          console.log(`   👥 Usuários encontrados: ${data.length}`);
        }
      } else {
        console.log(`   ❌ Status: ${response.status}`);
        const errorText = await response.text();
        console.log(`   ❌ Erro: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro de conexão: ${error.message}`);
    }
  }

  console.log('\n✅ Teste concluído!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Se todas as rotas retornaram 200, o backend está funcionando');
  console.log('2. Teste o frontend para ver se os erros foram resolvidos');
  console.log('3. Verifique se o clique no nome do usuário agora funciona');
}

testAllRoutes(); 