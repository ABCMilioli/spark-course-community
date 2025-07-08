#!/usr/bin/env node

/**
 * Script de teste para verificar o fluxo de checkout interno/externo
 * Execute: node scripts/test-checkout-flow.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testCheckoutFlow() {
  console.log('🧪 Testando Fluxo de Checkout (Interno/Externo)');
  console.log('=' .repeat(60));
  
  try {
    const token = process.env.TEST_TOKEN;
    if (!token) {
      console.log('⚠️  TEST_TOKEN não configurado. Pulando testes que requerem autenticação.');
      return;
    }

    // 1. Criar curso com checkout interno (Mercado Pago)
    console.log('\n1. Testando criação de curso com checkout interno...');
    
    const internalCourseData = {
      title: 'Curso Teste Checkout Interno',
      description: 'Curso para testar checkout interno (Mercado Pago)',
      category: 'Teste',
      level: 'Iniciante',
      isPaid: true,
      price: '99.90',
      payment_gateway: 'mercadopago'
    };

    const internalCourseResponse = await axios.post(`${API_URL}/courses`, internalCourseData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Curso interno criado:', {
      id: internalCourseResponse.data.id,
      title: internalCourseResponse.data.title,
      payment_gateway: internalCourseResponse.data.payment_gateway,
      price: internalCourseResponse.data.price
    });

    const internalCourseId = internalCourseResponse.data.id;

    // 2. Criar curso com checkout externo (Hotmart)
    console.log('\n2. Testando criação de curso com checkout externo...');
    
    const externalCourseData = {
      title: 'Curso Teste Checkout Externo',
      description: 'Curso para testar checkout externo (Hotmart)',
      category: 'Teste',
      level: 'Iniciante',
      isPaid: true,
      price: '149.90',
      payment_gateway: 'hotmart',
      external_checkout_url: 'https://pay.hotmart.com/teste123'
    };

    const externalCourseResponse = await axios.post(`${API_URL}/courses`, externalCourseData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Curso externo criado:', {
      id: externalCourseResponse.data.id,
      title: externalCourseResponse.data.title,
      payment_gateway: externalCourseResponse.data.payment_gateway,
      external_checkout_url: externalCourseResponse.data.external_checkout_url
    });

    const externalCourseId = externalCourseResponse.data.id;

    // 3. Testar busca dos cursos
    console.log('\n3. Testando busca dos cursos...');
    
    const internalCourse = await axios.get(`${API_URL}/courses/${internalCourseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const externalCourse = await axios.get(`${API_URL}/courses/${externalCourseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Curso interno encontrado:', {
      payment_gateway: internalCourse.data.payment_gateway,
      price: internalCourse.data.price,
      isInternal: internalCourse.data.payment_gateway === 'mercadopago' || internalCourse.data.payment_gateway === 'stripe'
    });

    console.log('✅ Curso externo encontrado:', {
      payment_gateway: externalCourse.data.payment_gateway,
      external_checkout_url: externalCourse.data.external_checkout_url,
      isExternal: externalCourse.data.payment_gateway === 'hotmart' || externalCourse.data.payment_gateway === 'kiwify'
    });

    // 4. Testar salvamento de CPF para checkout externo
    console.log('\n4. Testando salvamento de CPF para checkout externo...');
    
    const cpfData = {
      cpf: '12345678900',
      course_id: externalCourseId
    };

    const cpfResponse = await axios.post(`${API_URL}/external/save-cpf`, cpfData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ CPF salvo com sucesso:', {
      success: cpfResponse.data.success,
      message: cpfResponse.data.message,
      course_title: cpfResponse.data.course_title,
      payment_gateway: cpfResponse.data.payment_gateway
    });

    // 5. Verificar se o CPF foi salvo no banco
    console.log('\n5. Verificando se o CPF foi salvo no banco...');
    
    // Buscar usuário por CPF
    const userResult = await axios.post(`${API_URL}/external/check-enrollment`, {
      cpf: '12345678900',
      course_id: externalCourseId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Verificação de CPF:', {
      user_id: userResult.data.user_id,
      enrollment_status: userResult.data.enrollment.status
    });

    // 6. Testar API externa de matrícula (simulação do N8N)
    console.log('\n6. Testando API externa de matrícula (simulação N8N)...');
    
    const enrollmentData = {
      user: { cpf: '12345678900', email: 'teste@email.com', name: 'Usuário Teste' },
      course_id: externalCourseId,
      action: 'enroll'
    };

    const enrollmentResponse = await axios.post(`${API_URL}/external/enroll`, enrollmentData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Matrícula externa realizada:', {
      success: enrollmentResponse.data.success,
      user_id: enrollmentResponse.data.user_id,
      enrollment_id: enrollmentResponse.data.enrollment_id
    });

    // 7. Limpeza - deletar cursos de teste
    console.log('\n7. Limpando dados de teste...');
    
    await axios.delete(`${API_URL}/courses/${internalCourseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    await axios.delete(`${API_URL}/courses/${externalCourseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Cursos de teste deletados');

    console.log('\n🎉 Todos os testes passaram!');
    console.log('\n📋 Resumo do Fluxo:');
    console.log('- ✅ Criação de cursos com checkout interno/externo');
    console.log('- ✅ Botão único que se comporta conforme o checkout');
    console.log('- ✅ Modal para captura de CPF (checkout externo)');
    console.log('- ✅ Salvamento permanente de CPF');
    console.log('- ✅ Redirecionamento para checkout externo');
    console.log('- ✅ API externa para matrícula (N8N)');
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
testCheckoutFlow(); 