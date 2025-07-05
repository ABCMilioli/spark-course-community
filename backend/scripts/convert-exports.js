const fs = require('fs');
const path = require('path');

// Arquivos para converter
const files = [
  'config/stripe.js',
  'config/minio.js',
  'config/mercadopago.js'
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Converter exports individuais para funções normais
  content = content.replace(/^export async function /gm, 'async function ');
  content = content.replace(/^export function /gm, 'function ');
  
  // Adicionar module.exports no final
  if (content.includes('export default')) {
    content = content.replace(/export default /, 'module.exports = ');
  } else {
    // Se não tem export default, adicionar um module.exports básico
    content += '\n\nmodule.exports = {\n';
    
    // Extrair nomes das funções
    const functionMatches = content.match(/^(?:async )?function (\w+)/gm);
    if (functionMatches) {
      const functionNames = functionMatches.map(match => match.replace(/^(?:async )?function /, ''));
      content += functionNames.map(name => `  ${name}`).join(',\n');
    }
    
    content += '\n};\n';
  }
  
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Convertido: ${filePath}`);
});

console.log('🎉 Todos os arquivos convertidos para CommonJS!'); 