#!/bin/bash

echo "🔍 Testando container localmente..."

# Remover container anterior se existir
docker rm -f test-community 2>/dev/null || true

# Executar container em modo interativo para debug
echo "🚀 Executando container em modo debug..."
docker run -d --name test-community -p 8080:80 automacaodebaixocusto/spark-course-community:latest

# Aguardar um pouco
sleep 5

# Verificar se o container está rodando
echo "📋 Status do container:"
docker ps | grep test-community

# Verificar logs
echo "📝 Logs do container:"
docker logs test-community

# Verificar se o nginx está rodando
echo "🔍 Verificando processos no container:"
docker exec test-community ps aux

# Testar o endpoint de health
echo "🏥 Testando health check:"
curl -f http://localhost:8080/health || echo "Health check falhou"

# Verificar se os arquivos foram copiados
echo "📁 Verificando arquivos no container:"
docker exec test-community ls -la /usr/share/nginx/html/

# Limpar
echo "🧹 Limpando container de teste..."
docker rm -f test-community 