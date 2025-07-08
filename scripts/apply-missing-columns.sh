#!/bin/bash

# Script para aplicar a migration das colunas faltantes na tabela courses
# Execute: ./scripts/apply-missing-columns.sh

set -e

echo "🔧 Aplicando Migration: Adicionar Colunas Faltantes na Tabela Courses"
echo "=================================================================="

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não configurada"
    echo "💡 Configure a variável DATABASE_URL ou use o arquivo .env"
    exit 1
fi

# Aplicar a migration
echo "📝 Aplicando migration..."
psql "$DATABASE_URL" -f supabase/migrations/20250707200000-add-missing-course-columns.sql

echo "✅ Migration aplicada com sucesso!"
echo ""
echo "📋 Colunas adicionadas:"
echo "   - category (TEXT)"
echo "   - demo_video (TEXT)"
echo "   - isPaid (BOOLEAN, default: false)"
echo "   - updated_at (TIMESTAMPTZ, default: now())"
echo "   - is_active (BOOLEAN, default: true)"
echo ""
echo "🔧 Funcionalidades adicionadas:"
echo "   - Trigger para atualizar updated_at automaticamente"
echo "   - Comentários nas colunas para documentação"
echo ""
echo "🎉 A tabela courses agora está completa e pronta para uso!" 