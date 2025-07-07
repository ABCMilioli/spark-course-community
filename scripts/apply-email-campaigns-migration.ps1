# Script para aplicar a migration do sistema de campanhas de email
# Autor: Sistema de Campanhas de Email
# Data: $(Get-Date)

Write-Host "🚀 APLICANDO MIGRATION DO SISTEMA DE CAMPANHAS DE EMAIL" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Verificar se as variáveis de ambiente estão configuradas
$requiredVars = @("POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_USER", "POSTGRES_DB")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not (Get-Variable -Name $var -ErrorAction SilentlyContinue)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ ERRO: Variáveis de ambiente do PostgreSQL não configuradas!" -ForegroundColor Red
    Write-Host "Configure as seguintes variáveis:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Yellow
    }
    Write-Host "  - POSTGRES_PASSWORD (opcional, será solicitada)" -ForegroundColor Yellow
    exit 1
}

# Solicitar senha se não estiver configurada
if (-not (Get-Variable -Name "POSTGRES_PASSWORD" -ErrorAction SilentlyContinue)) {
    $POSTGRES_PASSWORD = Read-Host "🔐 Digite a senha do PostgreSQL" -AsSecureString
    $POSTGRES_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($POSTGRES_PASSWORD))
}

# Definir variáveis
$MIGRATION_FILE = "supabase/migrations/20250121000000-create-email-campaigns-system.sql"
$DB_URL = "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST`:$POSTGRES_PORT/$POSTGRES_DB"

Write-Host "📊 Configuração:" -ForegroundColor Green
Write-Host "  - Host: $POSTGRES_HOST`:$POSTGRES_PORT" -ForegroundColor White
Write-Host "  - Database: $POSTGRES_DB" -ForegroundColor White
Write-Host "  - User: $POSTGRES_USER" -ForegroundColor White
Write-Host "  - Migration: $MIGRATION_FILE" -ForegroundColor White
Write-Host ""

# Verificar se o arquivo de migration existe
if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ ERRO: Arquivo de migration não encontrado: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Verificando conexão com o banco de dados..." -ForegroundColor Yellow

# Verificar se o psql está disponível
try {
    $psqlVersion = & psql --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "psql não encontrado"
    }
} catch {
    Write-Host "❌ ERRO: psql não encontrado no PATH!" -ForegroundColor Red
    Write-Host "Instale o PostgreSQL Client ou adicione ao PATH." -ForegroundColor Yellow
    exit 1
}

# Testar conexão
$testConnection = & psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO: Não foi possível conectar ao banco de dados!" -ForegroundColor Red
    Write-Host "Verifique as credenciais e a conectividade." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Conexão com o banco de dados estabelecida!" -ForegroundColor Green

# Verificar se a migration já foi aplicada
Write-Host "🔍 Verificando se a migration já foi aplicada..." -ForegroundColor Yellow
$MIGRATION_EXISTS = & psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns');" 2>$null

if ($MIGRATION_EXISTS -match "t") {
    Write-Host "⚠️  AVISO: As tabelas do sistema de campanhas já existem!" -ForegroundColor Yellow
    $RECREATE = Read-Host "Deseja recriar as tabelas? (y/N)"
    
    if ($RECREATE -ne "y" -and $RECREATE -ne "Y") {
        Write-Host "❌ Migration cancelada pelo usuário." -ForegroundColor Red
        exit 0
    }
    
    Write-Host "🗑️  Removendo tabelas existentes..." -ForegroundColor Yellow
    $dropTables = @"
        DROP TABLE IF EXISTS email_send_logs CASCADE;
        DROP TABLE IF EXISTS email_campaign_recipients CASCADE;
        DROP TABLE IF EXISTS email_campaigns CASCADE;
        DROP TABLE IF EXISTS email_templates CASCADE;
"@
    
    & psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c $dropTables 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Tabelas removidas com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ ERRO: Falha ao remover tabelas existentes!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "📝 Aplicando migration..." -ForegroundColor Yellow
Write-Host "⏳ Isso pode levar alguns segundos..." -ForegroundColor Yellow

# Aplicar a migration
& psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f $MIGRATION_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration aplicada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ ERRO: Falha ao aplicar migration!" -ForegroundColor Red
    exit 1
}

# Verificar se as tabelas foram criadas
Write-Host "🔍 Verificando criação das tabelas..." -ForegroundColor Yellow
$TABLES = @("email_campaigns", "email_campaign_recipients", "email_templates", "email_send_logs")

foreach ($table in $TABLES) {
    $TABLE_EXISTS = & psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" 2>$null
    
    if ($TABLE_EXISTS -match "t") {
        Write-Host "  ✅ Tabela '$table' criada com sucesso" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ERRO: Tabela '$table' não foi criada!" -ForegroundColor Red
        exit 1
    }
}

# Verificar se os templates foram inseridos
Write-Host "🔍 Verificando templates padrão..." -ForegroundColor Yellow
$TEMPLATE_COUNT = & psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM email_templates;" 2>$null

if ([int]$TEMPLATE_COUNT -ge 5) {
    Write-Host "  ✅ $TEMPLATE_COUNT templates padrão inseridos" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  AVISO: Apenas $TEMPLATE_COUNT templates encontrados (esperado: 5+)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 SISTEMA DE CAMPANHAS DE EMAIL INSTALADO COM SUCESSO!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Reinicie o backend para carregar as novas rotas" -ForegroundColor White
Write-Host "2. Acesse /admin/email-campaigns no frontend" -ForegroundColor White
Write-Host "3. Configure o serviço de email se necessário" -ForegroundColor White
Write-Host "4. Teste criando uma campanha de exemplo" -ForegroundColor White
Write-Host ""
Write-Host "📚 RECURSOS DISPONÍVEIS:" -ForegroundColor Cyan
Write-Host "  - Criação de campanhas com templates" -ForegroundColor White
Write-Host "  - Segmentação de público (todos, instrutores, estudantes, turmas)" -ForegroundColor White
Write-Host "  - Agendamento de envios" -ForegroundColor White
Write-Host "  - Estatísticas detalhadas" -ForegroundColor White
Write-Host "  - Logs de envio e interação" -ForegroundColor White
Write-Host "  - Templates pré-definidos para diferentes tipos de conteúdo" -ForegroundColor White
Write-Host ""
Write-Host "🔧 ENDPOINTS DISPONÍVEIS:" -ForegroundColor Cyan
Write-Host "  - GET    /api/email-campaigns - Listar campanhas" -ForegroundColor White
Write-Host "  - POST   /api/email-campaigns - Criar campanha" -ForegroundColor White
Write-Host "  - GET    /api/email-campaigns/:id - Obter campanha" -ForegroundColor White
Write-Host "  - PUT    /api/email-campaigns/:id - Atualizar campanha" -ForegroundColor White
Write-Host "  - DELETE /api/email-campaigns/:id - Deletar campanha" -ForegroundColor White
Write-Host "  - POST   /api/email-campaigns/:id/send - Enviar campanha" -ForegroundColor White
Write-Host "  - POST   /api/email-campaigns/:id/schedule - Agendar campanha" -ForegroundColor White
Write-Host "  - POST   /api/email-campaigns/:id/cancel - Cancelar campanha" -ForegroundColor White
Write-Host "  - GET    /api/email-campaigns/:id/stats - Estatísticas" -ForegroundColor White
Write-Host "  - GET    /api/email-campaigns/templates - Listar templates" -ForegroundColor White
Write-Host "  - POST   /api/email-campaigns/test-send - Enviar teste" -ForegroundColor White
Write-Host ""
Write-Host "✨ Sistema pronto para uso!" -ForegroundColor Green 