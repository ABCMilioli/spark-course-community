#!/bin/bash

# Script para build da imagem Docker
set -e

echo "🔨 Iniciando build da imagem automacaodebaixocusto/konektus:latest..."

# Verificar se o Dockerfile existe
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile não encontrado!"
    exit 1
fi

# Fazer o build
echo "📦 Executando build..."
docker build -t automacaodebaixocusto/konektus:latest .

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo "📋 Informações da imagem:"
    docker images automacaodebaixocusto/konektus:latest
    
    echo ""
    echo "🚀 Para fazer o deploy, execute:"
    echo "./deploy.sh"
else
    echo "❌ Erro no build!"
    exit 1
fi 