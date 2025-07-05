#!/usr/bin/env node

/**
 * Script para mostrar o progresso da modularização do backend
 * 
 * Este script analisa o arquivo index.js original e os módulos extraídos
 * para calcular o progresso da modularização.
 */

const fs = require('fs');
const path = require('path');

// Configurações
const ORIGINAL_FILE = path.join(__dirname, '..', 'index.js');
const MODULAR_FILE = path.join(__dirname, '..', 'index-modular.js');
const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const MIDDLEWARE_DIR = path.join(__dirname, '..', 'middleware');
const SERVICES_DIR = path.join(__dirname, '..', 'services');
const UTILS_DIR = path.join(__dirname, '..', 'utils');

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

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkModuleExists(category, filename) {
  const filePath = path.join(__dirname, '..', category, filename);
  return fs.existsSync(filePath);
}

function main() {
  console.log('📊 PROGRESSO DA MODULARIZAÇÃO DO BACKEND\n');
  
  // Estatísticas do arquivo original
  const originalLines = countLines(ORIGINAL_FILE);
  const originalSize = getFileSize(ORIGINAL_FILE);
  
  console.log(`📁 ARQUIVO ORIGINAL:`);
  console.log(`   📄 index.js: ${originalLines.toLocaleString()} linhas (${formatBytes(originalSize)})`);
  console.log(`   📄 index-modular.js: ${countLines(MODULAR_FILE).toLocaleString()} linhas (${formatBytes(getFileSize(MODULAR_FILE))})`);
  console.log('');
  
  // Módulos extraídos
  console.log(`📦 MÓDULOS EXTRAÍDOS:`);
  
  let totalExtractedLines = 0;
  let totalExtractedSize = 0;
  
  // Rotas
  console.log(`   🛣️  ROTAS (${ROUTES_DIR}):`);
  EXTRACTED_MODULES.routes.forEach(filename => {
    const exists = checkModuleExists('routes', filename);
    const filePath = path.join(ROUTES_DIR, filename);
    const lines = exists ? countLines(filePath) : 0;
    const size = exists ? getFileSize(filePath) : 0;
    totalExtractedLines += lines;
    totalExtractedSize += size;
    
    const status = exists ? '✅' : '❌';
    const moduleName = filename.replace('.js', '');
    console.log(`      ${status} ${moduleName}: ${lines.toLocaleString()} linhas (${formatBytes(size)})`);
  });
  
  // Middlewares
  console.log(`   🔧 MIDDLEWARES (${MIDDLEWARE_DIR}):`);
  EXTRACTED_MODULES.middleware.forEach(filename => {
    const exists = checkModuleExists('middleware', filename);
    const filePath = path.join(MIDDLEWARE_DIR, filename);
    const lines = exists ? countLines(filePath) : 0;
    const size = exists ? getFileSize(filePath) : 0;
    totalExtractedLines += lines;
    totalExtractedSize += size;
    
    const status = exists ? '✅' : '❌';
    const moduleName = filename.replace('.js', '');
    console.log(`      ${status} ${moduleName}: ${lines.toLocaleString()} linhas (${formatBytes(size)})`);
  });
  
  // Serviços
  console.log(`   🛠️  SERVIÇOS (${SERVICES_DIR}):`);
  EXTRACTED_MODULES.services.forEach(filename => {
    const exists = checkModuleExists('services', filename);
    const filePath = path.join(SERVICES_DIR, filename);
    const lines = exists ? countLines(filePath) : 0;
    const size = exists ? getFileSize(filePath) : 0;
    totalExtractedLines += lines;
    totalExtractedSize += size;
    
    const status = exists ? '✅' : '❌';
    const moduleName = filename.replace('.js', '');
    console.log(`      ${status} ${moduleName}: ${lines.toLocaleString()} linhas (${formatBytes(size)})`);
  });
  
  // Utilitários
  console.log(`   📦 UTILITÁRIOS (${UTILS_DIR}):`);
  EXTRACTED_MODULES.utils.forEach(filename => {
    const exists = checkModuleExists('utils', filename);
    const filePath = path.join(UTILS_DIR, filename);
    const lines = exists ? countLines(filePath) : 0;
    const size = exists ? getFileSize(filePath) : 0;
    totalExtractedLines += lines;
    totalExtractedSize += size;
    
    const status = exists ? '✅' : '❌';
    const moduleName = filename.replace('.js', '');
    console.log(`      ${status} ${moduleName}: ${lines.toLocaleString()} linhas (${formatBytes(size)})`);
  });
  
  console.log('');
  
  // Estatísticas gerais
  console.log(`📈 ESTATÍSTICAS GERAIS:`);
  console.log(`   📊 Total de módulos extraídos: ${EXTRACTED_MODULES.routes.length + EXTRACTED_MODULES.middleware.length + EXTRACTED_MODULES.services.length + EXTRACTED_MODULES.utils.length}`);
  console.log(`   📄 Total de linhas extraídas: ${totalExtractedLines.toLocaleString()}`);
  console.log(`   💾 Total de bytes extraídos: ${formatBytes(totalExtractedSize)}`);
  
  // Cálculo do progresso
  const estimatedOriginalCode = originalLines * 0.8; // Estimativa de código funcional (excluindo comentários e espaços)
  const progressPercentage = Math.min(100, Math.round((totalExtractedLines / estimatedOriginalCode) * 100));
  
  console.log(`   📈 Progresso estimado: ${progressPercentage}%`);
  console.log(`   📉 Redução estimada no arquivo principal: ${Math.round((totalExtractedLines / originalLines) * 100)}%`);
  
  console.log('');
  
  // Próximos passos
  console.log(`🎯 PRÓXIMOS PASSOS:`);
  console.log(`   1. Extrair rotas restantes (upload, health, etc.)`);
  console.log(`   2. Criar serviços adicionais (notifications, etc.)`);
  console.log(`   3. Extrair funções utilitárias restantes`);
  console.log(`   4. Limpar código duplicado do index.js original`);
  console.log(`   5. Migrar completamente para index-modular.js`);
  
  console.log('');
  console.log(`💡 DICA: O arquivo index.js original permanece como backup e referência.`);
  console.log(`   Para migrar completamente, substitua o conteúdo do index.js pelo index-modular.js`);
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main }; 