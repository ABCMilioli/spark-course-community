#!/bin/bash

echo "🔧 Corrigindo migrations problemáticas..."

# Parar o container se estiver rodando
echo "📦 Parando containers..."
docker-compose down

# Remover migrations problemáticas
echo "🗑️ Removendo migrations problemáticas..."
rm -f supabase/migrations/20250615170005-restructure-classes-system.sql
rm -f supabase/migrations/20250615170006-add-demo-video-to-courses.sql
rm -f supabase/migrations/20250615170007-add-demo-video-to-courses-fix.sql
rm -f supabase/migrations/20250615170008-add-file-support-to-class-content.sql
rm -f supabase/migrations/20250628120000-create-lesson-completions.sql
rm -f supabase/migrations/20259999999999-recreate-class-courses.sql

# Iniciar o container novamente
echo "🚀 Iniciando containers..."
docker-compose up -d

# Aguardar o banco estar pronto
echo "⏳ Aguardando banco de dados..."
sleep 10

# Aplicar a migration de correção
echo "📝 Aplicando migration de correção..."
docker-compose exec backend node scripts/setup-database.js

echo "✅ Correção concluída!"
echo "🎯 Agora as migrations devem funcionar sem conflitos." 