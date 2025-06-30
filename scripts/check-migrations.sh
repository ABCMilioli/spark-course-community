#!/bin/bash

echo "🔍 Verificando status das migrations..."

# Verificar se o container está rodando
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Container não está rodando. Execute 'docker-compose up -d' primeiro."
    exit 1
fi

echo "📋 Migrations aplicadas:"
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    migration_name,
    applied_at,
    CASE 
        WHEN applied_at > NOW() - INTERVAL '1 hour' THEN '🟢 Recente'
        WHEN applied_at > NOW() - INTERVAL '1 day' THEN '🟡 Hoje'
        ELSE '🔵 Antiga'
    END as status
FROM migrations_applied 
ORDER BY applied_at DESC;" 2>/dev/null || echo "❌ Erro ao consultar migrations"

echo ""
echo "📁 Migrations disponíveis:"
for f in supabase/migrations/*.sql; do
    if [ -f "$f" ]; then
        echo "  - $(basename "$f")"
    fi
done

echo ""
echo "💡 Para aplicar migrations pendentes, reinicie o container:"
echo "   docker-compose restart app" 