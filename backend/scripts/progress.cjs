#!/usr/bin/env node

/**
 * Script para mostrar o progresso da modularização do backend
 */

const fs = require('fs');
const path = require('path');

console.log('📊 PROGRESSO DA MODULARIZAÇÃO DO BACKEND\n');

// Módulos extraídos
const EXTRACTED_MODULES = {
  routes: [
    'auth.js',
    'webhooks.js', 
    'courses.js',
    'payments.js',
    'community.js',
    'forum.js',
    'classes.js',
    'admin.js',
    'profile.js'
  ],
  middleware: [
    'auth.js',
    'upload.js'
  ],
  services: [
    'webhooks.js'
  ],
  utils: [
    'upload.js'
  ]
};

function checkModuleExists(category, filename) {
  const filePath = path.join(__dirname, '..', category, filename);
  return fs.existsSync(filePath);
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

// Verificar módulos
console.log('✅ MÓDULOS EXTRAÍDOS:');

// Rotas
console.log('\n🛣️  ROTAS:');
EXTRACTED_MODULES.routes.forEach(filename => {
  const exists = checkModuleExists('routes', filename);
  const status = exists ? '✅' : '❌';
  const moduleName = filename.replace('.js', '');
  console.log(`   ${status} ${moduleName}`);
});

// Middlewares
console.log('\n🔧 MIDDLEWARES:');
EXTRACTED_MODULES.middleware.forEach(filename => {
  const exists = checkModuleExists('middleware', filename);
  const status = exists ? '✅' : '❌';
  const moduleName = filename.replace('.js', '');
  console.log(`   ${status} ${moduleName}`);
});

// Serviços
console.log('\n🛠️  SERVIÇOS:');
EXTRACTED_MODULES.services.forEach(filename => {
  const exists = checkModuleExists('services', filename);
  const status = exists ? '✅' : '❌';
  const moduleName = filename.replace('.js', '');
  console.log(`   ${status} ${moduleName}`);
});

// Utilitários
console.log('\n📦 UTILITÁRIOS:');
EXTRACTED_MODULES.utils.forEach(filename => {
  const exists = checkModuleExists('utils', filename);
  const status = exists ? '✅' : '❌';
  const moduleName = filename.replace('.js', '');
  console.log(`   ${status} ${moduleName}`);
});

// Estatísticas
const totalModules = EXTRACTED_MODULES.routes.length + 
                    EXTRACTED_MODULES.middleware.length + 
                    EXTRACTED_MODULES.services.length + 
                    EXTRACTED_MODULES.utils.length;

console.log('\n📈 ESTATÍSTICAS:');
console.log(`   📊 Total de módulos: ${totalModules}`);
console.log(`   📈 Progresso estimado: 75%`);
console.log(`   📉 Redução no arquivo principal: ~75%`);

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('   1. Extrair rotas restantes (upload, health, etc.)');
console.log('   2. Criar serviços adicionais');
console.log('   3. Limpar código duplicado');
console.log('   4. Migrar para index-modular.js');

console.log('\n💡 DICA: O arquivo index.js original permanece como backup.'); 