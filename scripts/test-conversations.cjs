const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'community',
  user: 'postgres',
  password: '131489152850082175195580'
});

async function testConversations() {
  try {
    console.log('🔍 Testando sistema de conversas...\n');

    // 1. Verificar se as tabelas existem
    console.log('1. Verificando tabelas...');
    const tablesCheck = await pool.query(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') as conversations_exist,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversation_participants') as participants_exist,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') as messages_exist
    `);
    
    console.log('Tabelas encontradas:', tablesCheck.rows[0]);

    // 2. Verificar se a view existe
    console.log('\n2. Verificando view conversations_with_last_message...');
    const viewCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'conversations_with_last_message'
      ) as view_exists
    `);
    
    console.log('View conversations_with_last_message existe:', viewCheck.rows[0].view_exists);

    if (viewCheck.rows[0].view_exists) {
      // 3. Testar a view
      console.log('\n3. Testando view conversations_with_last_message...');
      const viewTest = await pool.query('SELECT * FROM conversations_with_last_message LIMIT 5');
      console.log('Dados da view:', viewTest.rows);
    }

    // 4. Verificar se há usuários para testar
    console.log('\n4. Verificando usuários...');
    const usersCheck = await pool.query('SELECT id, name FROM profiles LIMIT 5');
    console.log('Usuários encontrados:', usersCheck.rows);

    // 5. Verificar conversas existentes
    console.log('\n5. Verificando conversas existentes...');
    const conversationsCheck = await pool.query(`
      SELECT 
        c.id,
        c.title,
        c.type,
        c.created_at,
        COUNT(cp.user_id) as participants_count,
        COUNT(m.id) as messages_count
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN messages m ON c.id = m.conversation_id
      GROUP BY c.id, c.title, c.type, c.created_at
      ORDER BY c.created_at DESC
      LIMIT 5
    `);
    
    console.log('Conversas encontradas:', conversationsCheck.rows);

    // 6. Testar query da rota /api/conversations
    console.log('\n6. Testando query da rota /api/conversations...');
    if (usersCheck.rows.length > 0) {
      const userId = usersCheck.rows[0].id;
      console.log('Testando com usuário:', userId);
      
      const conversationsQuery = await pool.query(`
        SELECT 
          c.id,
          c.title,
          c.type,
          c.created_at,
          cp.last_read_at,
          (
            SELECT json_build_object(
              'id', m.id,
              'content', m.content,
              'type', m.type,
              'created_at', m.created_at,
              'sender_id', m.sender_id,
              'sender_name', p.name
            )
            FROM messages m
            JOIN profiles p ON m.sender_id = p.id
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'name', p.name,
                'avatar_url', p.avatar_url,
                'role', p.role
              )
            )
            FROM conversation_participants cp2
            JOIN profiles p ON cp2.user_id = p.id
            WHERE cp2.conversation_id = c.id
          ) as participants,
          (
            SELECT COUNT(*)
            FROM messages m2
            WHERE m2.conversation_id = c.id
              AND m2.sender_id != $1
              AND (cp.last_read_at IS NULL OR m2.created_at > cp.last_read_at)
          ) as unread_count
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE cp.user_id = $1
        ORDER BY 
          CASE 
            WHEN last_message IS NOT NULL THEN (last_message->>'created_at')::timestamp
            ELSE c.created_at
          END DESC
      `, [userId]);
      
      console.log('Resultado da query de conversas:', conversationsQuery.rows);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testConversations(); 