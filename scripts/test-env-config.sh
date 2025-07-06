#!/bin/bash

echo "🧪 Testando configuração de ambiente dinâmica..."
echo ""

# Simular diferentes ambientes
echo "1. Testando com VITE_API_URL padrão:"
VITE_API_URL="https://community.iacas.top" ./scripts/generate-env-js.sh
echo ""

echo "2. Testando com VITE_API_URL customizado:"
VITE_API_URL="https://staging.iacas.top" ./scripts/generate-env-js.sh
echo ""

echo "3. Testando sem VITE_API_URL (deve usar padrão):"
unset VITE_API_URL
./scripts/generate-env-js.sh
echo ""

echo "✅ Testes concluídos!"
echo ""
echo "📝 Para usar em produção:"
echo "   docker run -e VITE_API_URL=https://seu-dominio.com minha-imagem"
echo ""
echo "📝 Para usar no Docker Swarm:"
echo "   - Adicione VITE_API_URL no seu docker-stack.yml"
echo "   - Ou use secrets para configurações sensíveis" 