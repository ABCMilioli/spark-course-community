#!/usr/bin/env node

/**
 * Script para testar o sistema de campanhas de email
 * Autor: Sistema de Campanhas de Email
 * Data: 2024
 */

const axios = require('axios');

// Configurações
const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'teste@example.com';

// Token de teste (substitua por um token válido)
const TEST_TOKEN = process.env.TEST_TOKEN || 'seu-token-aqui';

// Headers padrão
const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

console.log('🧪 TESTANDO SISTEMA DE CAMPANHAS DE EMAIL');
console.log('==========================================');
console.log(`API URL: ${API_URL}`);
console.log(`Test Email: ${TEST_EMAIL}`);
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
    
    if (response.data) {
      if (Array.isArray(response.data)) {
        console.log(`📊 Resultados: ${response.data.length} itens`);
      } else if (typeof response.data === 'object') {
        console.log(`📊 Resultados: ${Object.keys(response.data).length} campos`);
      }
    }
    
    return response.data;
  } catch (error) {
    console.log(`❌ Erro: ${error.response?.status || error.code}`);
    if (error.response?.data?.error) {
      console.log(`   Mensagem: ${error.response.data.error}`);
    }
    throw error;
  }
}

// Testes
async function runTests() {
  try {
    console.log('🔍 1. Testando listagem de campanhas...');
    await makeRequest('GET', '/email-campaigns');
    console.log('');

    console.log('🔍 2. Testando listagem de templates...');
    const templates = await makeRequest('GET', '/email-campaigns/templates');
    console.log('');

    console.log('🔍 3. Testando preview de destinatários...');
    await makeRequest('POST', '/email-campaigns/preview-recipients', {
      target_audience: 'all'
    });
    console.log('');

    console.log('🔍 4. Testando criação de campanha...');
    const campaignData = {
      name: 'Campanha de Teste',
      subject: 'Teste do Sistema de Campanhas',
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h1>Teste do Sistema</h1>
          <p>Esta é uma campanha de teste para verificar se o sistema está funcionando.</p>
          <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      `,
      text_content: 'Teste do Sistema de Campanhas - Esta é uma campanha de teste.',
      campaign_type: 'custom',
      target_audience: 'all'
    };
    
    const newCampaign = await makeRequest('POST', '/email-campaigns', campaignData);
    console.log('');

    if (newCampaign && newCampaign.id) {
      console.log('🔍 5. Testando obtenção da campanha criada...');
      await makeRequest('GET', `/email-campaigns/${newCampaign.id}`);
      console.log('');

      console.log('🔍 6. Testando envio de email de teste...');
      await makeRequest('POST', '/email-campaigns/test-send', {
        to: TEST_EMAIL,
        subject: 'Teste do Sistema de Campanhas',
        html_content: '<h1>Teste</h1><p>Este é um email de teste.</p>'
      });
      console.log('');

      console.log('🔍 7. Testando estatísticas da campanha...');
      await makeRequest('GET', `/email-campaigns/${newCampaign.id}/stats`);
      console.log('');

      console.log('🔍 8. Testando atualização da campanha...');
      await makeRequest('PUT', `/email-campaigns/${newCampaign.id}`, {
        name: 'Campanha de Teste - Atualizada',
        subject: 'Teste Atualizado'
      });
      console.log('');

      console.log('🔍 9. Testando agendamento da campanha...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await makeRequest('POST', `/email-campaigns/${newCampaign.id}/schedule`, {
        scheduled_at: tomorrow.toISOString()
      });
      console.log('');

      console.log('🔍 10. Testando cancelamento da campanha...');
      await makeRequest('POST', `/email-campaigns/${newCampaign.id}/cancel`);
      console.log('');

      console.log('🔍 11. Testando exclusão da campanha...');
      await makeRequest('DELETE', `/email-campaigns/${newCampaign.id}`);
      console.log('');
    }

    console.log('🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('==========================================');
    console.log('');
    console.log('✅ Sistema de campanhas de email está funcionando corretamente!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Acesse /admin/email-campaigns no frontend');
    console.log('2. Configure o serviço de email se necessário');
    console.log('3. Crie sua primeira campanha real');
    console.log('4. Teste com diferentes tipos de conteúdo');

  } catch (error) {
    console.log('');
    console.log('❌ ALGUNS TESTES FALHARAM');
    console.log('========================');
    console.log('');
    console.log('🔧 Possíveis soluções:');
    console.log('1. Verifique se o backend está rodando');
    console.log('2. Verifique se a migration foi aplicada');
    console.log('3. Verifique se o token de teste é válido');
    console.log('4. Verifique as configurações de email');
    console.log('');
    console.log('📞 Para mais ajuda, consulte a documentação:');
    console.log('   README-EMAIL-CAMPAIGNS.md');
  }
}

// Executar testes
if (require.main === module) {
  runTests();
}

module.exports = { runTests }; 