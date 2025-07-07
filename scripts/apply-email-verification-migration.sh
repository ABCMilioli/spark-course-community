#!/bin/bash

# Script para aplicar a migration de verificação de email
echo "🔧 Aplicando migration de verificação de email..."

# Verificar se o arquivo de migration existe
MIGRATION_FILE="backend/migrations/20250117000000-create-email-verification-tokens.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Arquivo de migration não encontrado: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration encontrada: $MIGRATION_FILE"

# Verificar se o Docker está rodando
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Verificar se o container está rodando
if ! docker-compose ps | grep -q "app.*Up"; then
    echo "❌ Container da aplicação não está rodando. Execute 'docker-compose up -d' primeiro."
    exit 1
fi

echo "🐳 Aplicando migration via Docker..."

# Aplicar a migration
docker-compose exec -T postgres psql -U postgres -d spark_course < "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Migration aplicada com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Reinicie o container da aplicação: docker-compose restart app"
    echo "2. Teste o fluxo de cadastro com verificação de email"
    echo "3. Configure as variáveis SMTP se ainda não configurou"
    echo ""
    echo "🔧 Para testar, acesse a aplicação e tente criar uma nova conta."
    echo "📧 O sistema enviará um email de verificação antes de criar a conta."
else
    echo "❌ Erro ao aplicar migration"
    exit 1
fi 