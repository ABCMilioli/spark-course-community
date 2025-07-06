#!/bin/bash

# Script para inserir dados de teste de pagamentos no Docker Swarm
# Este script detecta automaticamente o nome do container da aplicação

set -e

echo "📊 Inserindo dados de teste de pagamentos no Docker Swarm..."

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

# Verificar se o script SQL existe no container
if ! docker exec $CONTAINER_NAME test -f /app/scripts/insert-test-payments.sql; then
    echo "❌ Script SQL não encontrado no container"
    echo "💡 Copiando script para o container..."
    
    # Copiar o script para o container
    docker cp scripts/insert-test-payments.sql $CONTAINER_NAME:/app/scripts/insert-test-payments.sql
fi

echo "🔍 Executando script SQL para inserir dados de teste..."

# Executar o script SQL dentro do container
docker exec $CONTAINER_NAME psql -U postgres -d spark_course_community -f /app/scripts/insert-test-payments.sql

echo ""
echo "✅ Dados de teste inseridos com sucesso!"
echo ""
echo "🎯 Próximos passos:"
echo "   1. Teste as rotas: ./scripts/test-payment-admin-auto.sh"
echo "   2. Acesse a página de admin: http://localhost:3000/admin/payments"
echo "   3. Verifique se os dados aparecem na interface" 