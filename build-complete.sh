#!/bin/bash

echo "🔨 Iniciando build completo..."

# 1. Build do frontend
echo "📦 Buildando frontend..."
npm install
npm run build

# 2. Copiar build do frontend para o backend
echo "📋 Copiando build do frontend para o backend..."
mkdir -p backend/public
cp -r dist/* backend/public/

# 3. Build da imagem Docker
echo "🐳 Buildando imagem Docker..."
docker build -t automacaodebaixocusto/spark-course-unificado:v1.0.10 .

echo "✅ Build completo finalizado!"
echo "🚀 Para fazer o deploy, execute:"
echo "docker stack deploy -c docker-stack.yml spark-course" 