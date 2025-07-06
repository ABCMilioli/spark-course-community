#!/bin/bash

# Script para testar as rotas administrativas de pagamentos no Docker Swarm
# Este script executa os testes dentro do container da aplicação

set -e

echo "🚀 Testando rotas administrativas de pagamentos no Docker Swarm..."

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

# Executar o script de teste dentro do container
echo "🔍 Executando testes das rotas de pagamentos..."
docker exec $CONTAINER_NAME node scripts/test-payment-admin-routes.cjs

echo ""
echo "🎯 Próximos passos:"
echo "   1. Verifique se todas as rotas passaram nos testes"
echo "   2. Acesse a página de admin: http://localhost:3000/admin/payments"
echo "   3. Se houver erros, verifique os logs do container:"
echo "      docker logs $CONTAINER_NAME"
echo ""
echo "📊 Para inserir dados de teste no banco:"
echo "   docker exec $CONTAINER_NAME psql -U postgres -d spark_course_community -f /scripts/insert-test-payments.sql" 