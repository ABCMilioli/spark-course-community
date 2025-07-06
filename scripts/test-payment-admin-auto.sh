#!/bin/bash

# Script para testar as rotas administrativas de pagamentos no Docker Swarm
# Este script detecta automaticamente o nome do container da aplicação

set -e

echo "🚀 Testando rotas administrativas de pagamentos no Docker Swarm..."

# Detectar automaticamente o nome do container da aplicação
CONTAINER_NAME=$(docker ps --filter "ancestor=automacaodebaixocusto/spark-course-unificado:v1.0.10" --format "{{.Names}}" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Container da aplicação não encontrado"
    echo "📋 Containers disponíveis:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_NAME"

# Verificar se o container está rodando
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container $CONTAINER_NAME não está rodando"
    exit 1
fi

echo "✅ Container $CONTAINER_NAME está rodando"

# Verificar se o script de teste existe no container
if ! docker exec $CONTAINER_NAME test -f /app/scripts/test-payment-admin-routes.cjs; then
    echo "❌ Script de teste não encontrado no container"
    echo "💡 Copiando script para o container..."
    
    # Copiar o script para o container
    docker cp scripts/test-payment-admin-routes.cjs $CONTAINER_NAME:/app/scripts/test-payment-admin-routes.cjs
fi

# Executar o script de teste dentro do container
echo "🔍 Executando testes das rotas de pagamentos..."
docker exec $CONTAINER_NAME node /app/scripts/test-payment-admin-routes.cjs

echo ""
echo "🎯 Próximos passos:"
echo "   1. Verifique se todas as rotas passaram nos testes"
echo "   2. Acesse a página de admin: http://localhost:3000/admin/payments"
echo "   3. Se houver erros, verifique os logs do container:"
echo "      docker logs $CONTAINER_NAME"
echo ""
echo "📊 Para inserir dados de teste no banco:"
echo "   docker exec $CONTAINER_NAME psql -U postgres -d spark_course_community -f /app/scripts/insert-test-payments.sql" 