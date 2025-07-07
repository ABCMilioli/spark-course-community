#!/bin/bash

# Script para aplicar a migration do sistema de campanhas de email
# Autor: Sistema de Campanhas de Email
# Data: $(date)

echo "🚀 APLICANDO MIGRATION DO SISTEMA DE CAMPANHAS DE EMAIL"
echo "=================================================="

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_PORT" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
    echo "❌ ERRO: Variáveis de ambiente do PostgreSQL não configuradas!"
    echo "Configure as seguintes variáveis:"
    echo "  - POSTGRES_HOST"
    echo "  - POSTGRES_PORT"
    echo "  - POSTGRES_USER"
    echo "  - POSTGRES_DB"
    echo "  - POSTGRES_PASSWORD (opcional, será solicitada)"
    exit 1
fi

# Solicitar senha se não estiver configurada
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo -n "🔐 Digite a senha do PostgreSQL: "
    read -s POSTGRES_PASSWORD
    echo
fi

# Definir variáveis
MIGRATION_FILE="supabase/migrations/20250121000000-create-email-campaigns-system.sql"
DB_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"

echo "📊 Configuração:"
echo "  - Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "  - Database: $POSTGRES_DB"
echo "  - User: $POSTGRES_USER"
echo "  - Migration: $MIGRATION_FILE"
echo

# Verificar se o arquivo de migration existe
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ ERRO: Arquivo de migration não encontrado: $MIGRATION_FILE"
    exit 1
fi

echo "🔍 Verificando conexão com o banco de dados..."
if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ ERRO: Não foi possível conectar ao banco de dados!"
    echo "Verifique as credenciais e a conectividade."
    exit 1
fi

echo "✅ Conexão com o banco de dados estabelecida!"

# Verificar se a migration já foi aplicada
echo "🔍 Verificando se a migration já foi aplicada..."
MIGRATION_EXISTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns');" 2>/dev/null | xargs)

if [ "$MIGRATION_EXISTS" = "t" ]; then
    echo "⚠️  AVISO: As tabelas do sistema de campanhas já existem!"
    echo -n "Deseja recriar as tabelas? (y/N): "
    read -r RECREATE
    
    if [ "$RECREATE" != "y" ] && [ "$RECREATE" != "Y" ]; then
        echo "❌ Migration cancelada pelo usuário."
        exit 0
    fi
    
    echo "🗑️  Removendo tabelas existentes..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
        DROP TABLE IF EXISTS email_send_logs CASCADE;
        DROP TABLE IF EXISTS email_campaign_recipients CASCADE;
        DROP TABLE IF EXISTS email_campaigns CASCADE;
        DROP TABLE IF EXISTS email_templates CASCADE;
    " > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Tabelas removidas com sucesso!"
    else
        echo "❌ ERRO: Falha ao remover tabelas existentes!"
        exit 1
    fi
fi

echo "📝 Aplicando migration..."
echo "⏳ Isso pode levar alguns segundos..."

# Aplicar a migration
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Migration aplicada com sucesso!"
else
    echo "❌ ERRO: Falha ao aplicar migration!"
    exit 1
fi

# Verificar se as tabelas foram criadas
echo "🔍 Verificando criação das tabelas..."
TABLES=("email_campaigns" "email_campaign_recipients" "email_templates" "email_send_logs")

for table in "${TABLES[@]}"; do
    TABLE_EXISTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | xargs)
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        echo "  ✅ Tabela '$table' criada com sucesso"
    else
        echo "  ❌ ERRO: Tabela '$table' não foi criada!"
        exit 1
    fi
done

# Verificar se os templates foram inseridos
echo "🔍 Verificando templates padrão..."
TEMPLATE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM email_templates;" 2>/dev/null | xargs)

if [ "$TEMPLATE_COUNT" -ge 5 ]; then
    echo "  ✅ $TEMPLATE_COUNT templates padrão inseridos"
else
    echo "  ⚠️  AVISO: Apenas $TEMPLATE_COUNT templates encontrados (esperado: 5+)"
fi

echo
echo "🎉 SISTEMA DE CAMPANHAS DE EMAIL INSTALADO COM SUCESSO!"
echo "=================================================="
echo
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Reinicie o backend para carregar as novas rotas"
echo "2. Acesse /admin/email-campaigns no frontend"
echo "3. Configure o serviço de email se necessário"
echo "4. Teste criando uma campanha de exemplo"
echo
echo "📚 RECURSOS DISPONÍVEIS:"
echo "  - Criação de campanhas com templates"
echo "  - Segmentação de público (todos, instrutores, estudantes, turmas)"
echo "  - Agendamento de envios"
echo "  - Estatísticas detalhadas"
echo "  - Logs de envio e interação"
echo "  - Templates pré-definidos para diferentes tipos de conteúdo"
echo
echo "🔧 ENDPOINTS DISPONÍVEIS:"
echo "  - GET    /api/email-campaigns - Listar campanhas"
echo "  - POST   /api/email-campaigns - Criar campanha"
echo "  - GET    /api/email-campaigns/:id - Obter campanha"
echo "  - PUT    /api/email-campaigns/:id - Atualizar campanha"
echo "  - DELETE /api/email-campaigns/:id - Deletar campanha"
echo "  - POST   /api/email-campaigns/:id/send - Enviar campanha"
echo "  - POST   /api/email-campaigns/:id/schedule - Agendar campanha"
echo "  - POST   /api/email-campaigns/:id/cancel - Cancelar campanha"
echo "  - GET    /api/email-campaigns/:id/stats - Estatísticas"
echo "  - GET    /api/email-campaigns/templates - Listar templates"
echo "  - POST   /api/email-campaigns/test-send - Enviar teste"
echo
echo "✨ Sistema pronto para uso!" 