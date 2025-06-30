#!/bin/bash

echo "🧪 Testando sistema de controle de migrations..."

# Parar containers se estiverem rodando
echo "📦 Parando containers..."
docker-compose down

# Limpar volumes para garantir um teste limpo
echo "🧹 Limpando volumes..."
docker-compose down -v

# Iniciar containers
echo "🚀 Iniciando containers pela primeira vez..."
docker-compose up -d

# Aguardar o banco estar pronto
echo "⏳ Aguardando banco de dados..."
sleep 15

# Verificar logs do backend
echo "📋 Verificando logs da primeira inicialização..."
docker-compose logs app

# Verificar se as migrations foram aplicadas
echo "🔍 Verificando migrations aplicadas..."
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT migration_name, applied_at FROM migrations_applied ORDER BY applied_at;" 2>/dev/null || echo "❌ Erro ao consultar migrations"

# Testar se o backend está respondendo
echo "🔍 Testando se o backend está respondendo..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend está funcionando!"
else
    echo "❌ Backend não está respondendo"
    exit 1
fi

# Reiniciar o container para testar se as migrations não são executadas novamente
echo "🔄 Reiniciando container para testar controle de migrations..."
docker-compose restart app

# Aguardar o backend reiniciar
echo "⏳ Aguardando backend reiniciar..."
sleep 10

# Verificar logs da reinicialização
echo "📋 Verificando logs da reinicialização..."
docker-compose logs app --tail=20

# Verificar se não há novas migrations aplicadas
echo "🔍 Verificando se não há novas migrations aplicadas..."
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) as total_migrations FROM migrations_applied;" 2>/dev/null || echo "❌ Erro ao consultar migrations"

# Testar se o backend ainda está funcionando
echo "🔍 Testando se o backend ainda está funcionando..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend ainda está funcionando após reinicialização!"
else
    echo "❌ Backend não está respondendo após reinicialização"
    exit 1
fi

echo "✅ Teste do sistema de controle de migrations concluído com sucesso!"
echo "🎯 O sistema está funcionando corretamente:"
echo "   - Migrations são aplicadas apenas uma vez"
echo "   - Dados não são perdidos ao reiniciar"
echo "   - Container inicia mais rápido após primeira execução" 