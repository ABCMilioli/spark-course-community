#!/bin/bash

# Script para aplicar migration das colunas de rastreamento de email
# Autor: Sistema de Campanhas de Email
# Data: 2024

set -e

echo "🔧 APLICANDO MIGRATION - COLUNAS DE RASTREAMENTO"
echo "================================================"
echo ""

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERRO: DATABASE_URL não está configurada"
    echo "   Configure a variável DATABASE_URL no seu arquivo .env"
    exit 1
fi

echo "📊 Verificando conexão com o banco de dados..."
echo "   DATABASE_URL: ${DATABASE_URL:0:20}..."

# Verificar se a tabela email_campaigns existe
echo ""
echo "🔍 Verificando se a tabela email_campaigns existe..."
TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaigns');" | xargs)

if [ "$TABLE_EXISTS" != "t" ]; then
    echo "❌ ERRO: Tabela email_campaigns não existe!"
    echo "   Execute primeiro a migration principal:"
    echo "   ./scripts/apply-email-campaigns-migration.sh"
    exit 1
fi

echo "✅ Tabela email_campaigns encontrada"

# Verificar se as colunas já existem
echo ""
echo "🔍 Verificando colunas existentes..."
DELIVERED_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'delivered_count');" | xargs)
BOUNCED_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'bounced_count');" | xargs)

if [ "$DELIVERED_EXISTS" = "t" ] && [ "$BOUNCED_EXISTS" = "t" ]; then
    echo "✅ Colunas de rastreamento já existem"
    echo "   - delivered_count: ✅"
    echo "   - bounced_count: ✅"
    echo ""
    echo "🎉 Migration já foi aplicada anteriormente!"
    exit 0
fi

echo "📝 Aplicando migration das colunas de rastreamento..."
echo ""

# Aplicar a migration
echo "🔧 Executando ALTER TABLE..."
psql "$DATABASE_URL" -f supabase/migrations/20250121000001-add-email-campaign-tracking-columns.sql

echo ""
echo "✅ Migration aplicada com sucesso!"
echo ""

# Verificar se as colunas foram criadas
echo "🔍 Verificando se as colunas foram criadas..."
DELIVERED_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'delivered_count');" | xargs)
BOUNCED_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'bounced_count');" | xargs)

if [ "$DELIVERED_EXISTS" = "t" ] && [ "$BOUNCED_EXISTS" = "t" ]; then
    echo "✅ Colunas criadas com sucesso:"
    echo "   - delivered_count: ✅"
    echo "   - bounced_count: ✅"
else
    echo "❌ ERRO: Algumas colunas não foram criadas"
    echo "   - delivered_count: $([ "$DELIVERED_EXISTS" = "t" ] && echo "✅" || echo "❌")"
    echo "   - bounced_count: $([ "$BOUNCED_EXISTS" = "t" ] && echo "✅" || echo "❌")"
    exit 1
fi

echo ""
echo "🎉 MIGRATION CONCLUÍDA COM SUCESSO!"
echo "==================================="
echo ""
echo "📊 Colunas adicionadas:"
echo "   • delivered_count - Contador de emails entregues"
echo "   • bounced_count - Contador de emails que retornaram"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Reinicie o backend para aplicar as mudanças"
echo "   2. Teste o envio de uma nova campanha"
echo "   3. Verifique as estatísticas no dashboard"
echo ""
echo "💡 Dica: As campanhas existentes terão delivered_count = 0"
echo "   Novas campanhas serão rastreadas corretamente" 