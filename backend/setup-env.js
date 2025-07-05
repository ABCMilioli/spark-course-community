const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const supabaseConfig = {
  projectId: 'ibaykdcjfeqjrnxshczt',
  databaseUrl: 'postgresql://postgres.ibaykdcjfeqjrnxshczt:postgres@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
};

// Conteúdo do arquivo .env
const envContent = `# Configuração do Banco de Dados (Supabase)
DATABASE_URL=${supabaseConfig.databaseUrl}

# Configuração do JWT
JWT_SECRET=your-secret-key-change-in-production

# Configuração do MinIO/S3
MINIO_ENDPOINT=http://localhost:9000
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Configuração do Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=WHK-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_NOTIFICATION_URL=https://seu-dominio.com/api/webhooks/mercadopago

# URLs de retorno após pagamento
PAYMENT_SUCCESS_URL=https://seu-dominio.com/payment/success
PAYMENT_FAILURE_URL=https://seu-dominio.com/payment/failure
PAYMENT_CANCEL_URL=https://seu-dominio.com/payment/pending

# URL base da aplicação
APP_URL=https://seu-dominio.com

# Ambiente
NODE_ENV=development
`;

// Caminho do arquivo .env
const envPath = path.join(__dirname, '.env');

try {
  // Verificar se o arquivo já existe
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Arquivo .env já existe. Não foi sobrescrito.');
    console.log('📁 Localização:', envPath);
  } else {
    // Criar o arquivo .env
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Arquivo .env criado com sucesso!');
    console.log('📁 Localização:', envPath);
  }
  
  console.log('\n📋 Configurações do Supabase:');
  console.log('   Project ID:', supabaseConfig.projectId);
  console.log('   Database URL:', supabaseConfig.databaseUrl);
  
  console.log('\n🔧 Para usar estas configurações:');
  console.log('   1. Instale o dotenv: npm install dotenv');
  console.log('   2. Adicione no início do index-modular.cjs:');
  console.log('      require("dotenv").config();');
  console.log('   3. Reinicie o servidor');
  
} catch (error) {
  console.error('❌ Erro ao criar arquivo .env:', error.message);
} 