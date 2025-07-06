#!/bin/bash

echo "🔧 Aplicando migração de tipos de notificação..."

# Verificar se as variáveis de ambiente estão definidas
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
    echo "❌ Variáveis de ambiente do PostgreSQL não definidas"
    echo "Defina: POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB"
    exit 1
fi

# Aplicar a migração
echo "📝 Executando migração..."
psql "host=$POSTGRES_HOST user=$POSTGRES_USER password=$POSTGRES_PASSWORD dbname=$POSTGRES_DB" -f backend/migrations/20250120000000-update-notification-types.sql

if [ $? -eq 0 ]; then
    echo "✅ Migração aplicada com sucesso!"
    
    # Verificar se a constraint foi atualizada
    echo "🔍 Verificando constraint atualizada..."
    psql "host=$POSTGRES_HOST user=$POSTGRES_USER password=$POSTGRES_PASSWORD dbname=$POSTGRES_DB" -c "
    SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
    FROM pg_constraint 
    WHERE conrelid = 'public.notifications'::regclass 
    AND contype = 'c';
    "
else
    echo "❌ Erro ao aplicar migração"
    exit 1
fi

 