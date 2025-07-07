#!/usr/bin/env node

/**
 * Script para testar o rastreamento de emails
 * Autor: Sistema de Campanhas de Email
 * Data: 2024
 */

const axios = require('axios');

// Configurações
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_TOKEN = process.env.TEST_TOKEN || 'seu-token-aqui';

// Headers padrão
const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

console.log('🧪 TESTANDO RASTREAMENTO DE EMAILS');
console.log('==================================');
console.log(`API URL: ${API_URL}`);
console.log('');

// Função para fazer requisições com tratamento de erro
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers,
      data
    };
    
    console.log(`📡 ${method} ${endpoint}`);
    const response = await axios(config);
    console.log(`✅ Status: ${response.status}`);
    
    return response.data;
  } catch (error) {
    console.log(`❌ Erro: ${error.response?.status || error.code}`);
    if (error.response?.data?.error) {
      console.log(`   Mensagem: ${error.response.data.error}`);
    }
    throw error;
  }
}

// Função para simular abertura de email
async function simulateEmailOpen(campaignId, recipientId) {
  try {
    console.log(`📧 Simulando abertura de email...`);
    console.log(`   Campanha: ${campaignId}`);
    console.log(`   Destinatário: ${recipientId}`);
    
    const response = await axios.get(`${API_URL}/email-campaigns/webhook/${campaignId}/${recipientId}/opened`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://mail.google.com/'
      }
    });
    
    console.log(`✅ Abertura simulada com sucesso!`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Erro ao simular abertura: ${error.message}`);
    return false;
  }
}

// Função para simular clique em link
async function simulateEmailClick(campaignId, recipientId, url = 'https://example.com') {
  try {
    console.log(`🔗 Simulando clique em link...`);
    console.log(`   Campanha: ${campaignId}`);
    console.log(`   Destinatário: ${recipientId}`);
    console.log(`   URL: ${url}`);
    
    const response = await axios.get(`${API_URL}/email-campaigns/webhook/${campaignId}/${recipientId}/clicked?url=${encodeURIComponent(url)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://mail.google.com/'
      },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Aceitar redirecionamentos
      }
    });
    
    console.log(`✅ Clique simulado com sucesso!`);
    console.log(`   Status: ${response.status}`);
    
    return true;
  } catch (error) {
    if (error.response && error.response.status >= 300 && error.response.status < 400) {
      console.log(`✅ Clique simulado com sucesso! (Redirecionamento)`);
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Location: ${error.response.headers.location}`);
      return true;
    }
    console.log(`❌ Erro ao simular clique: ${error.message}`);
    return false;
  }
}

// Testes
async function runTests() {
  try {
    console.log('🔍 1. Buscando campanhas existentes...');
    const campaigns = await makeRequest('GET', '/email-campaigns');
    console.log(`   Encontradas: ${campaigns.length} campanhas`);
    console.log('');

    if (campaigns.length === 0) {
      console.log('❌ Nenhuma campanha encontrada. Crie uma campanha primeiro.');
      return;
    }

    // Pegar a primeira campanha enviada
    const sentCampaign = campaigns.find(c => c.status === 'sent');
    if (!sentCampaign) {
      console.log('❌ Nenhuma campanha enviada encontrada. Envie uma campanha primeiro.');
      return;
    }

    console.log(`📋 Usando campanha: ${sentCampaign.name} (${sentCampaign.id})`);
    console.log('');

    // Buscar destinatários da campanha
    console.log('🔍 2. Buscando destinatários da campanha...');
    const campaignDetails = await makeRequest('GET', `/email-campaigns/${sentCampaign.id}`);
    console.log(`   Total de destinatários: ${campaignDetails.total_recipients || 0}`);
    console.log('');

    // Buscar estatísticas atuais
    console.log('🔍 3. Estatísticas atuais...');
    const currentStats = await makeRequest('GET', `/email-campaigns/${sentCampaign.id}/stats`);
    console.log(`   Enviados: ${currentStats.stats.sent_count}`);
    console.log(`   Entregues: ${currentStats.stats.delivered_count}`);
    console.log(`   Abertos: ${currentStats.stats.opened_count}`);
    console.log(`   Clicados: ${currentStats.stats.clicked_count}`);
    console.log('');

    // Simular abertura
    console.log('🔍 4. Simulando abertura de email...');
    const openSuccess = await simulateEmailOpen(sentCampaign.id, 'test-recipient-id');
    console.log('');

    // Simular clique
    console.log('🔍 5. Simulando clique em link...');
    const clickSuccess = await simulateEmailClick(sentCampaign.id, 'test-recipient-id');
    console.log('');

    // Aguardar um pouco para processamento
    console.log('⏳ Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // Verificar estatísticas atualizadas
    console.log('🔍 6. Verificando estatísticas atualizadas...');
    const updatedStats = await makeRequest('GET', `/email-campaigns/${sentCampaign.id}/stats`);
    console.log(`   Enviados: ${updatedStats.stats.sent_count}`);
    console.log(`   Entregues: ${updatedStats.stats.delivered_count}`);
    console.log(`   Abertos: ${updatedStats.stats.opened_count}`);
    console.log(`   Clicados: ${updatedStats.stats.clicked_count}`);
    console.log('');

    // Verificar logs
    console.log('🔍 7. Verificando logs recentes...');
    if (updatedStats.recent_logs && updatedStats.recent_logs.length > 0) {
      console.log(`   Logs encontrados: ${updatedStats.recent_logs.length}`);
      updatedStats.recent_logs.slice(0, 5).forEach(log => {
        console.log(`   - ${log.action}: ${log.email} (${new Date(log.created_at).toLocaleString('pt-BR')})`);
      });
    } else {
      console.log('   Nenhum log encontrado');
    }
    console.log('');

    console.log('🎉 TESTE CONCLUÍDO!');
    console.log('==================');
    console.log('');
    console.log('📊 Resumo:');
    console.log(`   Abertura simulada: ${openSuccess ? '✅ Sucesso' : '❌ Falha'}`);
    console.log(`   Clique simulado: ${clickSuccess ? '✅ Sucesso' : '❌ Falha'}`);
    console.log('');
    console.log('💡 Dicas:');
    console.log('1. Verifique os logs do backend para mais detalhes');
    console.log('2. Teste com emails reais para rastreamento completo');
    console.log('3. Configure NEXT_PUBLIC_APP_URL se necessário');

  } catch (error) {
    console.log('');
    console.log('❌ TESTE FALHOU');
    console.log('===============');
    console.log('');
    console.log('🔧 Possíveis soluções:');
    console.log('1. Verifique se o backend está rodando');
    console.log('2. Verifique se o token é válido');
    console.log('3. Verifique se há campanhas enviadas');
    console.log('4. Verifique os logs do backend');
  }
}

// Executar testes
if (require.main === module) {
  runTests();
}

module.exports = { runTests, simulateEmailOpen, simulateEmailClick }; 