#!/bin/bash

echo "🧪 Executando teste de notificações..."
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto"
    exit 1
fi

# Verificar se o arquivo de teste existe
if [ ! -f "scripts/test-notifications.cjs" ]; then
    echo "❌ Arquivo de teste não encontrado"
    exit 1
fi

# Executar o teste
echo "📋 Executando teste de notificações..."
node scripts/test-notifications.cjs

echo ""
echo "✅ Teste concluído!" 