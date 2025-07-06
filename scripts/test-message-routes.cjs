const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '131489152850082175195580',
  database: process.env.POSTGRES_DB || 'community',
});

async function testMessageRoutes() {
  console.log('🧪 TESTANDO ROTAS DE MENSAGENS');
  console.log('================================\n');

  try {
    // 1. Verificar se o arquivo messages.js existe
    console.log('1. Verificando arquivo backend/routes/messages.js...');
    const fs = require('fs');
    const path = require('path');
    
    const messagesFile = path.join(__dirname, '..', 'backend', 'routes', 'messages.js');
    if (fs.existsSync(messagesFile)) {
      console.log('✅ Arquivo messages.js encontrado');
    } else {
      console.log('❌ Arquivo messages.js não encontrado');
      return;
    }

    // 2. Verificar se as tabelas existem
    console.log('\n2. Verificando tabelas do sistema de mensagens...');
    
    const tables = ['conversations', 'conversation_participants', 'messages'];
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        ) as table_exists
      `, [table]);
      
      console.log(`   ${table}: ${result.rows[0].table_exists ? '✅' : '❌'}`);
    }

    // 3. Verificar se as views existem
    console.log('\n3. Verificando views do sistema de mensagens...');
    
    const views = ['conversations_with_last_message', 'messages_with_sender'];
    for (const view of views) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_name = $1
        ) as view_exists
      `, [view]);
      
      console.log(`   ${view}: ${result.rows[0].view_exists ? '✅' : '❌'}`);
    }

    // 4. Testar view conversations_with_last_message
    console.log('\n4. Testando view conversations_with_last_message...');
    try {
      const result = await pool.query('SELECT * FROM conversations_with_last_message LIMIT 1');
      console.log('✅ View funciona corretamente');
      console.log('   Estrutura dos dados:', Object.keys(result.rows[0] || {}));
    } catch (error) {
      console.log('❌ Erro na view:', error.message);
    }

    // 5. Verificar se há conversas no sistema
    console.log('\n5. Verificando conversas existentes...');
    const conversationsResult = await pool.query('SELECT COUNT(*) as count FROM conversations');
    console.log(`   Total de conversas: ${conversationsResult.rows[0].count}`);

    // 6. Verificar se há participantes
    const participantsResult = await pool.query('SELECT COUNT(*) as count FROM conversation_participants');
    console.log(`   Total de participantes: ${participantsResult.rows[0].count}`);

    // 7. Verificar se há mensagens
    const messagesResult = await pool.query('SELECT COUNT(*) as count FROM messages');
    console.log(`   Total de mensagens: ${messagesResult.rows[0].count}`);

    // 8. Testar estrutura de uma conversa com participantes
    console.log('\n6. Testando estrutura de conversa com participantes...');
    const conversationWithParticipants = await pool.query(`
      SELECT c.*, cp.user_id, p.name, p.avatar_url
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      JOIN profiles p ON cp.user_id = p.id
      LIMIT 1
    `);

    if (conversationWithParticipants.rows.length > 0) {
      console.log('✅ Conversa com participantes encontrada');
      console.log('   Estrutura dos dados:', Object.keys(conversationWithParticipants.rows[0]));
    } else {
      console.log('⚠️  Nenhuma conversa com participantes encontrada');
    }

    console.log('\n✅ Teste concluído com sucesso!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Verifique se o backend está rodando');
    console.log('2. Teste as rotas via frontend ou Postman');
    console.log('3. Se o arquivo messages.js foi criado corretamente');
    console.log('4. Se as rotas estão sendo registradas no index-modular.cjs');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await pool.end();
  }
}

testMessageRoutes(); 