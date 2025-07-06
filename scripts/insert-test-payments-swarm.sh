#!/bin/bash

# Script para inserir dados de teste de pagamentos no Docker Swarm
# Este script executa o SQL dentro do container da aplicação

set -e

echo "📊 Inserindo dados de teste de pagamentos no Docker Swarm..."

# Nome do container da aplicação no Swarm (atualizado)
CONTAINER_NAME="community_app.1.eqjatzwa0xnjjlbskks41yfl3"

# Verificar se o container está rodando
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container $CONTAINER_NAME não está rodando"
    echo "📋 Containers disponíveis:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    exit 1
fi

echo "✅ Container $CONTAINER_NAME está rodando"

# Verificar se o script SQL existe no container
if ! docker exec $CONTAINER_NAME test -f /scripts/insert-test-payments.sql; then
    echo "❌ Script SQL não encontrado no container"
    echo "💡 Copiando script para o container..."
    
    # Copiar o script para o container
    docker cp scripts/insert-test-payments.sql $CONTAINER_NAME:/scripts/insert-test-payments.sql
fi

echo "🔍 Executando script SQL para inserir dados de teste..."

# Executar o script SQL dentro do container
docker exec $CONTAINER_NAME psql -U postgres -d spark_course_community -f /scripts/insert-test-payments.sql

echo ""
echo "✅ Dados de teste inseridos com sucesso!"
echo ""
echo "🎯 Próximos passos:"
echo "   1. Teste as rotas: ./scripts/test-payment-admin-swarm.sh"
echo "   2. Acesse a página de admin: http://localhost:3000/admin/payments"
echo "   3. Verifique se os dados aparecem na interface" 