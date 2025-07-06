#!/usr/bin/env node

/**
 * Script para testar as rotas administrativas de pagamentos
 * 
 * Este script testa:
 * - GET /api/payments/methods
 * - GET /api/payments/stats (admin)
 * - GET /api/payments/history (admin)
 * - GET /api/payments/overview (admin)
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Configuração do banco de dados para Docker Swarm
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres_postgres.1.fkag6wi0mr3h2zrxl3k6zorxc',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'spark_course_community',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Configuração da API
const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Função para gerar token JWT
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    }, 
    JWT_SECRET, 
    { expiresIn: '1h' }
  );
}

// Função para fazer requisições HTTP
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await response.text();
  let jsonData;
  
  try {
    jsonData = JSON.parse(data);
  } catch (e) {
    console.log('Resposta não é JSON:', data);
    jsonData = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    data: jsonData,
    raw: data
  };
}

// Função para testar endpoint
async function testEndpoint(url, description, token = null) {
  console.log(`\n🔍 Testando: ${description}`);
  console.log(`   URL: ${url}`);
  
  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await makeRequest(url, { headers });
    
    if (response.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      if (response.data) {
        if (Array.isArray(response.data)) {
          console.log(`   📊 Dados: ${response.data.length} itens`);
          if (response.data.length > 0) {
            console.log(`   📋 Primeiro item:`, JSON.stringify(response.data[0], null, 2));
          }
        } else {
          console.log(`   📊 Dados:`, JSON.stringify(response.data, null, 2));
        }
      }
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   📄 Resposta:`, response.raw);
    }
    
    return response.ok;
  } catch (error) {
    console.log(`   💥 Erro: ${error.message}`);
    return false;
  }
}

// Função para buscar usuário admin
async function getAdminUser() {
  try {
    const result = await pool.query(`
      SELECT id, email, role 
      FROM profiles 
      WHERE role = 'admin' 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado no banco');
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.log('❌ Erro ao buscar usuário admin:', error.message);
    return null;
  }
}

// Função para buscar usuário comum
async function getRegularUser() {
  try {
    const result = await pool.query(`
      SELECT id, email, role 
      FROM profiles 
      WHERE role = 'student' 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário comum encontrado no banco');
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.log('❌ Erro ao buscar usuário comum:', error.message);
    return null;
  }
}

// Função para verificar dados de pagamentos no banco
async function checkPaymentData() {
  try {
    console.log('\n📊 Verificando dados de pagamentos no banco...');
    
    // Contar total de pagamentos
    const countResult = await pool.query('SELECT COUNT(*) as total FROM payments');
    const total = countResult.rows[0].total;
    console.log(`   📈 Total de pagamentos: ${total}`);
    
    if (total > 0) {
      // Buscar alguns pagamentos de exemplo
      const sampleResult = await pool.query(`
        SELECT p.*, c.title as course_title, u.name as user_name
        FROM payments p
        JOIN courses c ON p.course_id = c.id
        JOIN profiles u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 3
      `);
      
      console.log(`   📋 Últimos 3 pagamentos:`);
      sampleResult.rows.forEach((payment, index) => {
        console.log(`      ${index + 1}. ${payment.course_title} - R$ ${payment.amount} (${payment.status})`);
      });
      
      // Estatísticas por gateway
      const gatewayResult = await pool.query(`
        SELECT gateway, COUNT(*) as count, SUM(amount) as total
        FROM payments 
        GROUP BY gateway
      `);
      
      console.log(`   🏦 Por gateway:`);
      gatewayResult.rows.forEach(row => {
        console.log(`      ${row.gateway}: ${row.count} pagamentos, R$ ${row.total}`);
      });
      
      // Estatísticas por status
      const statusResult = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM payments 
        GROUP BY status
      `);
      
      console.log(`   📊 Por status:`);
      statusResult.rows.forEach(row => {
        console.log(`      ${row.status}: ${row.count} pagamentos`);
      });
    }
    
    return total > 0;
  } catch (error) {
    console.log('❌ Erro ao verificar dados de pagamentos:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando testes das rotas administrativas de pagamentos...\n');
  
  // Verificar conectividade com o banco
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado ao banco de dados');
  } catch (error) {
    console.log('❌ Erro ao conectar ao banco:', error.message);
    console.log('💡 Certifique-se de que o banco está rodando e as credenciais estão corretas');
    console.log('🔧 Configurações atuais:');
    console.log(`   Host: ${process.env.DB_HOST || 'postgres_postgres.1.fkag6wi0mr3h2zrxl3k6zorxc'}`);
    console.log(`   Port: ${process.env.DB_PORT || 5432}`);
    console.log(`   Database: ${process.env.DB_NAME || 'spark_course_community'}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
    process.exit(1);
  }
  
  // Verificar dados de pagamentos
  const hasPaymentData = await checkPaymentData();
  
  // Buscar usuários
  const adminUser = await getAdminUser();
  const regularUser = await getRegularUser();
  
  if (!adminUser) {
    console.log('❌ Não foi possível continuar sem um usuário admin');
    console.log('💡 Crie um usuário admin primeiro ou verifique se existe no banco');
    process.exit(1);
  }
  
  // Gerar tokens
  const adminToken = generateToken(adminUser);
  const regularToken = regularUser ? generateToken(regularUser) : null;
  
  console.log(`\n👤 Usuário admin: ${adminUser.email} (${adminUser.role})`);
  if (regularUser) {
    console.log(`👤 Usuário comum: ${regularUser.email} (${regularUser.role})`);
  }
  
  // Testar rotas
  let successCount = 0;
  let totalTests = 0;
  
  // 1. Testar métodos de pagamento (acessível a todos)
  totalTests++;
  if (await testEndpoint(`${API_BASE}/api/payments/methods`, 'Métodos de pagamento (sem token)')) {
    successCount++;
  }
  
  totalTests++;
  if (await testEndpoint(`${API_BASE}/api/payments/methods`, 'Métodos de pagamento (com token admin)', adminToken)) {
    successCount++;
  }
  
  // 2. Testar estatísticas (apenas admin)
  totalTests++;
  if (await testEndpoint(`${API_BASE}/api/payments/stats`, 'Estatísticas (sem token)', null)) {
    successCount++;
  }
  
  totalTests++;
  if (await testEndpoint(`${API_BASE}/api/payments/stats`, 'Estatísticas (com token admin)', adminToken)) {
    successCount++;
  }
  
  if (regularToken) {
    totalTests++;
    if (await testEndpoint(`${API_BASE}/api/payments/stats`, 'Estatísticas (com token comum)', regularToken)) {
      successCount++;
    }
  }
  
  // 3. Testar histórico (admin vê todos, usuário comum vê apenas os seus)
  totalTests++;
  if (await testEndpoint(`${API_BASE}/api/payments/history`, 'Histórico (sem token)', null)) {
    successCount++;
  }
  
  totalTests++;
  if (await testEndpoint(`${API_BASE}/api/payments/history`, 'Histórico (com token admin)', adminToken)) {
    successCount++;
  }
  
  if (regularToken) {
    totalTests++;
    if (await testEndpoint(`${API_BASE}/api/payments/history`, 'Histórico (com token comum)', regularToken)) {
      successCount++;
    }
  }
  
  // 4. Testar visão geral (apenas admin)
  totalTests++;
  if (await testEndpoint(`${API_BASE}/api/payments/overview`, 'Visão geral (sem token)', null)) {
    successCount++;
  }
  
  totalTests++;
  if (await testEndpoint(`${API_BASE}/api/payments/overview`, 'Visão geral (com token admin)', adminToken)) {
    successCount++;
  }
  
  if (regularToken) {
    totalTests++;
    if (await testEndpoint(`${API_BASE}/api/payments/overview`, 'Visão geral (com token comum)', regularToken)) {
      successCount++;
    }
  }
  
  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  console.log(`✅ Sucessos: ${successCount}/${totalTests}`);
  console.log(`❌ Falhas: ${totalTests - successCount}/${totalTests}`);
  console.log(`📈 Taxa de sucesso: ${((successCount / totalTests) * 100).toFixed(1)}%`);
  
  if (hasPaymentData) {
    console.log('\n💡 Dados de pagamentos encontrados no banco - as rotas devem funcionar corretamente');
  } else {
    console.log('\n⚠️  Nenhum dado de pagamento encontrado no banco');
    console.log('   As rotas podem retornar arrays vazios, mas não devem dar erro');
  }
  
  console.log('\n🎯 Próximos passos:');
  console.log('   1. Verifique se o backend está rodando em:', API_BASE);
  console.log('   2. Teste a página de admin no frontend: http://localhost:3000/admin/payments');
  console.log('   3. Se houver erros, verifique os logs do container');
  console.log('   4. Para inserir dados de teste: docker exec community_app.1.eqjatzwa0xnjjlbskks41yfl3 psql -U postgres -d spark_course_community -f /scripts/insert-test-payments.sql');
  
  await pool.end();
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, testEndpoint, checkPaymentData }; 