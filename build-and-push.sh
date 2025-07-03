#!/bin/bash

# Script para build e push da imagem para o Docker Hub
set -e

# Configurações
IMAGE_NAME="automacaodebaixocusto/spark-course-community"
TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo "🔨 Iniciando build e push da imagem ${FULL_IMAGE_NAME}..."

# Verificar se o Dockerfile existe
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile não encontrado!"
    exit 1
fi

# Verificar se está logado no Docker Hub
if ! docker info | grep -q "Username"; then
    echo "❌ Não está logado no Docker Hub!"
    echo "💡 Execute: docker login"
    exit 1
fi

# Fazer o build
echo "📦 Executando build..."
docker build -t ${FULL_IMAGE_NAME} .

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    echo "📋 Informações da imagem:"
    docker images ${FULL_IMAGE_NAME}
    
    # Fazer push para o Docker Hub
    echo "🚀 Fazendo push para o Docker Hub..."
    docker push ${FULL_IMAGE_NAME}
    
    if [ $? -eq 0 ]; then
        echo "✅ Push concluído com sucesso!"
        echo ""
        echo "🎉 Imagem disponível em: https://hub.docker.com/r/${IMAGE_NAME}"
        echo ""
        echo "📋 Para usar a imagem:"
        echo "docker pull ${FULL_IMAGE_NAME}"
        echo ""
        echo "🚀 Para fazer deploy:"
        echo "./deploy.sh"
    else
        echo "❌ Erro no push!"
        exit 1
    fi
else
    echo "❌ Erro no build!"
    exit 1
fi 