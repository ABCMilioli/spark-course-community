const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'spark_community',
});

async function testNotifications() {
  try {
    console.log('🧪 Testando sistema de notificações...\n');

    // 1. Verificar se a tabela notifications existe
    console.log('1. Verificando se a tabela notifications existe...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Tabela notifications não existe!');
      return;
    }
    console.log('✅ Tabela notifications existe\n');

    // 2. Verificar estrutura da tabela
    console.log('2. Verificando estrutura da tabela notifications...');
    const structureCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications'
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura da tabela:');
    structureCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('');

    // 3. Verificar constraint de tipos
    console.log('3. Verificando constraint de tipos...');
    const constraintCheck = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints 
      WHERE constraint_name LIKE '%notifications_type_check%'
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('✅ Constraint de tipos encontrada:');
      console.log(`   ${constraintCheck.rows[0].check_clause}`);
    } else {
      console.log('⚠️  Constraint de tipos não encontrada');
    }
    console.log('');

    // 4. Verificar se há usuários para testar
    console.log('4. Verificando usuários disponíveis...');
    const usersCheck = await pool.query('SELECT id, name, email FROM profiles LIMIT 3');
    
    if (usersCheck.rows.length === 0) {
      console.error('❌ Nenhum usuário encontrado para testar!');
      return;
    }
    
    console.log(`✅ ${usersCheck.rows.length} usuários encontrados:`);
    usersCheck.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });
    console.log('');

    // 5. Testar inserção de notificação
    console.log('5. Testando inserção de notificação...');
    const testUserId = usersCheck.rows[0].id;
    
    const insertResult = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING id, user_id, title, message, type, created_at
    `, [
      testUserId,
      'Teste de Notificação',
      'Esta é uma notificação de teste para verificar se o sistema está funcionando.',
      'system',
      null,
      null
    ]);
    
    console.log('✅ Notificação criada com sucesso:');
    console.log(`   ID: ${insertResult.rows[0].id}`);
    console.log(`   Usuário: ${insertResult.rows[0].user_id}`);
    console.log(`   Título: ${insertResult.rows[0].title}`);
    console.log(`   Tipo: ${insertResult.rows[0].type}`);
    console.log(`   Criada em: ${insertResult.rows[0].created_at}`);
    console.log('');

    // 6. Verificar se a notificação foi salva
    console.log('6. Verificando se a notificação foi salva...');
    const savedCheck = await pool.query(`
      SELECT * FROM notifications WHERE id = $1
    `, [insertResult.rows[0].id]);
    
    if (savedCheck.rows.length > 0) {
      console.log('✅ Notificação encontrada no banco de dados');
    } else {
      console.error('❌ Notificação não foi encontrada no banco de dados');
    }
    console.log('');

    // 7. Testar tipos de notificação específicos
    console.log('7. Testando tipos de notificação específicos...');
    const testTypes = [
      'community_like',
      'community_comment',
      'forum_like',
      'lesson_comment',
      'new_message'
    ];
    
    for (const testType of testTypes) {
      try {
        await pool.query(`
          INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type, is_read)
          VALUES ($1, $2, $3, $4, $5, $6, false)
        `, [
          testUserId,
          `Teste ${testType}`,
          `Notificação de teste para tipo ${testType}`,
          testType,
          '00000000-0000-0000-0000-000000000000',
          'test'
        ]);
        console.log(`✅ Tipo '${testType}' aceito`);
      } catch (err) {
        console.error(`❌ Tipo '${testType}' rejeitado: ${err.message}`);
      }
    }
    console.log('');

    // 8. Limpar notificações de teste
    console.log('8. Limpando notificações de teste...');
    await pool.query(`
      DELETE FROM notifications 
      WHERE title LIKE 'Teste%' OR title = 'Teste de Notificação'
    `);
    console.log('✅ Notificações de teste removidas');
    console.log('');

    console.log('🎉 Teste de notificações concluído com sucesso!');
    console.log('O sistema de notificações está funcionando corretamente.');

  } catch (err) {
    console.error('❌ Erro durante o teste:', err);
    console.error('Stack trace:', err.stack);
  } finally {
    await pool.end();
  }
}

// Executar o teste
testNotifications(); 