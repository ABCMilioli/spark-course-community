#!/bin/bash

# Script para fazer deploy da stack Docker Swarm
echo "🚀 Iniciando deploy da stack Docker Swarm..."

# Definir variáveis
STACK_NAME="spark-course"
COMPOSE_FILE="docker-stack.yml"

# Verificar se o arquivo docker-stack.yml existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Arquivo $COMPOSE_FILE não encontrado!"
    exit 1
fi

# Verificar se estamos em um swarm
if ! docker info | grep -q "Swarm: active"; then
    echo "❌ Docker Swarm não está ativo!"
    echo "💡 Execute: docker swarm init"
    exit 1
fi

# Fazer deploy da stack
echo "📦 Fazendo deploy da stack..."
docker stack deploy -c $COMPOSE_FILE $STACK_NAME

# Verificar status
echo "🔍 Verificando status da stack..."
docker stack services $STACK_NAME

echo "✅ Deploy concluído!"
echo "📊 Para ver os logs: docker service logs spark-course_app"
echo "🔍 Para ver o status: docker stack ps spark-course" 