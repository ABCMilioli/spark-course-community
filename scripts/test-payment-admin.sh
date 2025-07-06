#!/bin/bash

# Script para testar as rotas administrativas de pagamentos
# Este script executa os testes dentro do container Docker

set -e

echo "🚀 Testando rotas administrativas de pagamentos..."

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Execute este script na raiz do projeto"
    exit 1
fi

# Verificar se o container está rodando
if ! docker-compose ps | grep -q "backend.*Up"; then
    echo "❌ Backend não está rodando. Inicie com: docker-compose up -d"
    exit 1
fi

echo "✅ Backend está rodando"

# Executar o script de teste dentro do container
echo "🔍 Executando testes das rotas de pagamentos..."
docker-compose exec backend node scripts/test-payment-admin-routes.cjs

echo ""
echo "🎯 Próximos passos:"
echo "   1. Verifique se todas as rotas passaram nos testes"
echo "   2. Acesse a página de admin: http://localhost:3000/admin/payments"
echo "   3. Se houver erros, verifique os logs do backend"
echo ""
echo "📊 Para inserir dados de teste no banco:"
echo "   docker-compose exec db psql -U postgres -d spark_course_community -f /scripts/insert-test-payments.sql" 