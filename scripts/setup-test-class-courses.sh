#!/bin/bash

echo "🧪 Configurando dados de teste para cursos nas turmas..."

# Verificar se o container está rodando
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Container não está rodando. Execute 'docker-compose up -d' primeiro."
    exit 1
fi

echo "📊 Verificando estado atual..."
./scripts/test-class-courses.sh

echo ""
echo "🔧 Inserindo dados de teste..."
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /app/scripts/insert-test-class-courses.sql 2>/dev/null || echo "❌ Erro ao inserir dados de teste"

echo ""
echo "✅ Verificando resultado final..."
./scripts/test-class-courses.sh

echo ""
echo "🎯 Próximos passos:"
echo "1. Acesse a aplicação em http://localhost:8080"
echo "2. Vá para uma turma específica"
echo "3. Clique na aba 'Cursos'"
echo "4. Verifique se os cursos aparecem na lista"
echo ""
echo "🔍 Se não aparecer, verifique:"
echo "   - Console do navegador para erros"
echo "   - Logs do backend: docker-compose logs app"
echo "   - Se o usuário tem permissão para acessar a turma" 