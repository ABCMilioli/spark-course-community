#!/bin/bash

# Script para build local da imagem
set -e

IMAGE_NAME="automacaodebaixocusto/spark-course-community"
TAG="latest"

echo "🔨 Iniciando build local da imagem..."
echo "📦 Imagem: $IMAGE_NAME:$TAG"

# Verificar se o Dockerfile existe
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile não encontrado!"
    exit 1
fi

# Fazer o build
echo "📦 Executando build..."
docker build -t $IMAGE_NAME:$TAG .

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo "📋 Informações da imagem:"
    docker images $IMAGE_NAME:$TAG
    
    echo ""
    echo "🚀 Para fazer o deploy local, execute:"
    echo "./deploy.sh"
    
    echo ""
    echo "📤 Para fazer o push para Docker Hub, execute:"
    echo "./build-and-push.sh"
else
    echo "❌ Erro no build!"
    exit 1
fi 