#!/bin/bash

echo "🧪 Testando migrations..."

# Parar containers se estiverem rodando
echo "📦 Parando containers..."
docker-compose down

# Limpar volumes para garantir um teste limpo
echo "🧹 Limpando volumes..."
docker-compose down -v

# Iniciar containers
echo "🚀 Iniciando containers..."
docker-compose up -d

# Aguardar o banco estar pronto
echo "⏳ Aguardando banco de dados..."
sleep 15

# Verificar logs do backend
echo "📋 Verificando logs do backend..."
docker-compose logs app

# Testar se o backend está respondendo
echo "🔍 Testando se o backend está respondendo..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Backend está funcionando!"
else
    echo "❌ Backend não está respondendo"
    echo "📋 Últimos logs:"
    docker-compose logs app --tail=50
    exit 1
fi

echo "✅ Teste concluído com sucesso!"
echo "🎯 As migrations estão funcionando corretamente." 