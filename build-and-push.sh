#!/bin/bash

# Script para build e push da imagem para Docker Hub
set -e

IMAGE_NAME="automacaodebaixocusto/spark-course-community"
TAG="latest"

echo "🚀 Iniciando build e push da imagem para Docker Hub..."
echo "📦 Imagem: $IMAGE_NAME:$TAG"

# Verificar se o Dockerfile existe
if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile não encontrado!"
    exit 1
fi

# Fazer o build
echo "🔨 Executando build..."
docker build -t $IMAGE_NAME:$TAG .

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
    
    # Perguntar se quer fazer o push
    echo ""
    read -p "🤔 Deseja fazer o push para o Docker Hub? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 Fazendo login no Docker Hub..."
        docker login
        
        echo "🚀 Fazendo push da imagem..."
        docker push $IMAGE_NAME:$TAG
        
        if [ $? -eq 0 ]; then
            echo "✅ Push concluído com sucesso!"
            echo "🌐 Imagem disponível em: https://hub.docker.com/r/automacaodebaixocusto/spark-course-community"
        else
            echo "❌ Erro no push!"
            exit 1
        fi
    else
        echo "⏸️ Push cancelado pelo usuário."
    fi
    
    echo ""
    echo "📋 Informações da imagem local:"
    docker images $IMAGE_NAME:$TAG
    
else
    echo "❌ Erro no build!"
    exit 1
fi 