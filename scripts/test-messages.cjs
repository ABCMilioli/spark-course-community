// Script para testar se o sistema de mensagens está funcionando
console.log('💬 Testando sistema de mensagens...\n');

// Simular diferentes cenários de mensagens
const testScenarios = [
  {
    name: 'Enviar mensagem em conversa existente',
    method: 'POST',
    url: '/api/conversations/{conversationId}/messages',
    body: {
      content: 'Olá! Como você está?',
      type: 'text'
    },
    expectedStatus: 201
  },
  {
    name: 'Buscar mensagens de uma conversa',
    method: 'GET',
    url: '/api/conversations/{conversationId}/messages',
    expectedStatus: 200
  },
  {
    name: 'Marcar conversa como lida',
    method: 'POST',
    url: '/api/conversations/{conversationId}/mark-read',
    expectedStatus: 200
  },
  {
    name: 'Buscar usuários para conversa',
    method: 'GET',
    url: '/api/users/search?q=teste',
    expectedStatus: 200
  },
  {
    name: 'Contar mensagens não lidas',
    method: 'GET',
    url: '/api/conversations/unread-count',
    expectedStatus: 200
  },
  {
    name: 'Listar conversas do usuário',
    method: 'GET',
    url: '/api/conversations',
    expectedStatus: 200
  },
  {
    name: 'Criar nova conversa',
    method: 'POST',
    url: '/api/conversations',
    body: {
      title: 'Nova conversa de teste',
      type: 'direct',
      participant_ids: ['123e4567-e89b-12d3-a456-426614174000']
    },
    expectedStatus: 201
  }
];

console.log('📋 Cenários de teste:');
testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   ${scenario.method} ${scenario.url}`);
  if (scenario.body) {
    console.log(`   Body: ${JSON.stringify(scenario.body)}`);
  }
  console.log(`   Status esperado: ${scenario.expectedStatus}`);
  console.log('');
});

console.log('✅ Para testar se está funcionando:');
console.log('1. Suba o serviço no Docker');
console.log('2. Acesse a página de mensagens no frontend');
console.log('3. Tente enviar uma mensagem');
console.log('4. Verifique se não aparece erro 404');
console.log('');
console.log('🎯 Se aparecer erro 404, verifique:');
console.log('- Se o arquivo backend/routes/messages.js foi criado');
console.log('- Se as rotas foram adicionadas ao index-modular.cjs');
console.log('- Se a migração 20250110000000-create-messaging-system.sql foi aplicada');
console.log('- Se as tabelas conversations, conversation_participants e messages existem');
console.log('');
console.log('🔍 Para verificar as tabelas no banco:');
console.log('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = \'conversations\');');
console.log('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = \'conversation_participants\');');
console.log('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = \'messages\');');
console.log('SELECT EXISTS (SELECT FROM information_schema.views WHERE view_name = \'messages_with_sender\');'); 