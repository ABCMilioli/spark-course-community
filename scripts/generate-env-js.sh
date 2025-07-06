#!/bin/sh

# Script para gerar arquivo env.js com variáveis de ambiente
# Este arquivo será lido pelo frontend para obter configurações dinâmicas

# Diretório onde o arquivo será criado (pasta public do frontend buildado)
ENV_FILE="/app/public/env.js"

# Criar o arquivo env.js com as variáveis de ambiente
cat > "$ENV_FILE" << EOF
// Arquivo gerado automaticamente pelo container
// Contém variáveis de ambiente para o frontend
window.env = {
  VITE_API_URL: '${VITE_API_URL:-https://community.iacas.top}',
  NODE_ENV: '${NODE_ENV:-production}'
};
EOF

echo "Arquivo env.js gerado em $ENV_FILE"
echo "Conteúdo:"
cat "$ENV_FILE" 