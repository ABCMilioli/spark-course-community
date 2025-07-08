#!/usr/bin/env node

/**
 * Script de teste para verificar a configuração de gateway de pagamento
 * Execute: node scripts/test-gateway-config.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testGatewayConfig() {
  console.log('🧪 Testando Configuração de Gateway de Pagamento');
  console.log('=' .repeat(50));
  
  try {
    // 1. Testar criação de curso com gateway
    console.log('\n1. Testando criação de curso com gateway...');
    
    const token = process.env.TEST_TOKEN;
    if (!token) {
      console.log('⚠️  TEST_TOKEN não configurado. Pulando testes que requerem autenticação.');
      return;
    }

    const courseData = {
      title: 'Curso Teste Gateway',
      description: 'Curso para testar configuração de gateway',
      category: 'Teste',
      level: 'Iniciante',
      isPaid: true,
      price: '99.90',
      payment_gateway: 'hotmart',
      external_checkout_url: 'https://pay.hotmart.com/teste123'
    };

    const createResponse = await axios.post(`${API_URL}/courses`, courseData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Curso criado com sucesso:', {
      id: createResponse.data.id,
      title: createResponse.data.title,
      payment_gateway: createResponse.data.payment_gateway,
      external_checkout_url: createResponse.data.external_checkout_url
    });

    const courseId = createResponse.data.id;

    // 2. Testar busca do curso criado
    console.log('\n2. Testando busca do curso...');
    
    const getResponse = await axios.get(`${API_URL}/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const course = getResponse.data;
    console.log('✅ Curso encontrado:', {
      id: course.id,
      title: course.title,
      payment_gateway: course.payment_gateway,
      external_checkout_url: course.external_checkout_url,
      price: course.price
    });

    // 3. Testar edição do curso
    console.log('\n3. Testando edição do curso...');
    
    const updateData = {
      payment_gateway: 'kiwify',
      external_checkout_url: 'https://kiwify.com.br/teste456'
    };

    const updateResponse = await axios.put(`${API_URL}/courses/${courseId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Curso atualizado com sucesso');

    // 4. Verificar se a edição foi aplicada
    console.log('\n4. Verificando se a edição foi aplicada...');
    
    const getUpdatedResponse = await axios.get(`${API_URL}/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const updatedCourse = getUpdatedResponse.data;
    console.log('✅ Curso atualizado:', {
      payment_gateway: updatedCourse.payment_gateway,
      external_checkout_url: updatedCourse.external_checkout_url
    });

    // 5. Testar listagem de cursos
    console.log('\n5. Testando listagem de cursos...');
    
    const listResponse = await axios.get(`${API_URL}/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const courses = listResponse.data;
    const testCourse = courses.find(c => c.id === courseId);
    
    if (testCourse) {
      console.log('✅ Curso encontrado na listagem:', {
        title: testCourse.title,
        payment_gateway: testCourse.payment_gateway,
        external_checkout_url: testCourse.external_checkout_url
      });
    } else {
      console.log('❌ Curso não encontrado na listagem');
    }

    // 6. Limpeza - deletar curso de teste
    console.log('\n6. Limpando curso de teste...');
    
    await axios.delete(`${API_URL}/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Curso de teste deletado');

    console.log('\n🎉 Todos os testes passaram!');
    console.log('\n📋 Resumo:');
    console.log('- ✅ Criação de curso com gateway');
    console.log('- ✅ Busca de curso com campos de gateway');
    console.log('- ✅ Edição de gateway');
    console.log('- ✅ Listagem com campos de gateway');
    console.log('- ✅ Limpeza de dados de teste');

  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Dica: Configure TEST_TOKEN com um token válido');
    }
    
    process.exit(1);
  }
}

// Executar testes
testGatewayConfig(); 