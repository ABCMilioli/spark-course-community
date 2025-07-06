// Script para testar se as notificações estão sendo criadas com referências corretas
console.log('🧪 Testando criação de notificações com referências...\n');

// Simular diferentes tipos de notificações que deveriam ser criadas
const testNotifications = [
  {
    type: 'community_like',
    reference_type: 'post',
    reference_id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'João curtiu seu post',
    message: 'João curtiu seu post "Como aprender React"'
  },
  {
    type: 'community_comment',
    reference_type: 'post',
    reference_id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Maria comentou no seu post',
    message: 'Maria comentou: "Muito útil esse post!"'
  },
  {
    type: 'forum_like',
    reference_type: 'forum_post',
    reference_id: '123e4567-e89b-12d3-a456-426614174002',
    title: 'Pedro curtiu sua resposta no fórum',
    message: 'Pedro curtiu sua resposta no tópico "Dúvidas sobre TypeScript"'
  },
  {
    type: 'lesson_comment',
    reference_type: 'lesson_comment',
    reference_id: '123e4567-e89b-12d3-a456-426614174003',
    title: 'Ana comentou na aula',
    message: 'Ana comentou na aula "Introdução ao React"'
  },
  {
    type: 'new_message',
    reference_type: 'conversation',
    reference_id: '123e4567-e89b-12d3-a456-426614174004',
    title: 'Nova mensagem de Carlos',
    message: 'Carlos enviou uma mensagem: "Oi, tudo bem?"'
  }
];

console.log('📋 Notificações de teste que deveriam ser criadas:');
testNotifications.forEach((notification, index) => {
  console.log(`${index + 1}. ${notification.type} (${notification.reference_type}: ${notification.reference_id})`);
  console.log(`   Título: ${notification.title}`);
  console.log(`   Mensagem: ${notification.message}`);
  console.log('');
});

console.log('🔍 URLs de navegação que deveriam ser geradas:');
testNotifications.forEach((notification, index) => {
  let expectedUrl = '/';
  
  switch (notification.type) {
    case 'community_like':
    case 'community_comment':
      expectedUrl = `/post/${notification.reference_id}`;
      break;
    case 'forum_like':
      expectedUrl = `/forum/post/${notification.reference_id}`;
      break;
    case 'lesson_comment':
      expectedUrl = `/player?courseId=COURSE_ID&lessonId=LESSON_ID#comment-${notification.reference_id}`;
      break;
    case 'new_message':
      expectedUrl = `/messages/${notification.reference_id}`;
      break;
  }
  
  console.log(`${index + 1}. ${notification.type} → ${expectedUrl}`);
});

console.log('');
console.log('✅ Para testar se está funcionando:');
console.log('1. Suba o serviço no Docker');
console.log('2. Crie uma curtida, comentário ou post');
console.log('3. Verifique no console do navegador se aparecem os logs:');
console.log('   - 🔔 [NotificationBell] Clicou na notificação:');
console.log('   - 🔔 [NotificationBell] Usando navegação inteligente...');
console.log('   - 🔔 [NotificationBell] Resposta da navegação:');
console.log('   - 🔔 [NotificationBell] Navegando para:');
console.log('');
console.log('4. Verifique nos logs do backend se aparecem:');
console.log('   - [NAVIGATION] Navegando para:');
console.log('');
console.log('🎯 Se não funcionar, verifique:');
console.log('- Se as notificações estão sendo criadas com reference_id e reference_type');
console.log('- Se a rota /api/notifications/:id/navigate está respondendo');
console.log('- Se as URLs geradas correspondem às rotas do frontend'); 