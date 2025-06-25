#!/bin/bash

# Script para fazer build e push da imagem Docker
echo "🚀 Iniciando build e push da imagem Docker..."

# Definir variáveis
IMAGE_NAME="automacaodebaixocusto/spark-course-unificado"
TAG="latest"

# Fazer build da imagem
echo "📦 Fazendo build da imagem..."
docker build -t $IMAGE_NAME:$TAG .

# Fazer push para o Docker Hub
echo "⬆️ Fazendo push para o Docker Hub..."
docker push $IMAGE_NAME:$TAG

echo "✅ Build e push concluídos com sucesso!"
echo "🔄 Para atualizar a stack, execute:"
echo "   docker stack deploy -c docker-stack.yml spark-course" 