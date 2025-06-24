#!/bin/bash

# Script de deploy para Docker Swarm
set -e

echo "🚀 Iniciando deploy do Spark Course Community..."

# Verificar se estamos no modo swarm
if ! docker info | grep -q "Swarm: active"; then
    echo "❌ Docker Swarm não está ativo. Inicializando..."
    docker swarm init
fi

# Criar rede se não existir
if ! docker network ls | grep -q "network_public"; then
    echo "🌐 Criando rede network_public..."
    docker network create --driver overlay --attachable network_public
fi

# Criar volumes se não existirem
if ! docker volume ls | grep -q "volume_swarm_certificates"; then
    echo "📦 Criando volume volume_swarm_certificates..."
    docker volume create volume_swarm_certificates
fi

if ! docker volume ls | grep -q "volume_swarm_shared"; then
    echo "📦 Criando volume volume_swarm_shared..."
    docker volume create volume_swarm_shared
fi

# Build da imagem
echo "🔨 Fazendo build da imagem automacaodebaixocusto/spark-course-community:latest..."
docker build -t automacaodebaixocusto/spark-course-community:latest .

# Deploy do Traefik (se não estiver rodando)
if ! docker stack ls | grep -q "traefik"; then
    echo "🔧 Deployando Traefik..."
    docker stack deploy -c traefik-stack.yml traefik
    echo "⏳ Aguardando Traefik inicializar..."
    sleep 30
fi

# Deploy da aplicação
echo "📦 Deployando aplicação..."
docker stack deploy -c docker-stack.yml spark-course

echo "✅ Deploy concluído!"
echo "📊 Dashboard Traefik: http://traefik.community.iacas.top:8080"
echo "🌐 Aplicação: https://community.iacas.top"

# Mostrar status
echo "📋 Status dos serviços:"
docker stack services spark-course 