# Script para aplicar migration das colunas de rastreamento de email (Windows)
# Autor: Sistema de Campanhas de Email
# Data: 2024

param(
    [string]$DatabaseUrl = $env:DATABASE_URL
)

Write-Host "🔧 APLICANDO MIGRATION - COLUNAS DE RASTREAMENTO" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se as variáveis de ambiente estão configuradas
if (-not $DatabaseUrl) {
    Write-Host "❌ ERRO: DATABASE_URL não está configurada" -ForegroundColor Red
    Write-Host "   Configure a variável DATABASE_URL no seu arquivo .env" -ForegroundColor Yellow
    Write-Host "   Ou passe como parâmetro: .\scripts\apply-email-tracking-columns.ps1 -DatabaseUrl 'sua_url'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📊 Verificando conexão com o banco de dados..." -ForegroundColor Green
Write-Host "   DATABASE_URL: $($DatabaseUrl.Substring(0, [Math]::Min(20, $DatabaseUrl.Length)))..." -ForegroundColor Gray

# Verificar se a tabela email_campaigns existe
Write-Host ""
Write-Host "🔍 Verificando se a tabela email_campaigns existe..." -ForegroundColor Green

try {
    $tableExists = psql $DatabaseUrl -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_campaigns');" 2>$null | ForEach-Object { $_.Trim() }
    
    if ($tableExists -ne "t") {
        Write-Host "❌ ERRO: Tabela email_campaigns não existe!" -ForegroundColor Red
        Write-Host "   Execute primeiro a migration principal:" -ForegroundColor Yellow
        Write-Host "   .\scripts\apply-email-campaigns-migration.ps1" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Tabela email_campaigns encontrada" -ForegroundColor Green
} catch {
    Write-Host "❌ ERRO: Não foi possível conectar ao banco de dados" -ForegroundColor Red
    Write-Host "   Verifique se o DATABASE_URL está correto e se o banco está acessível" -ForegroundColor Yellow
    exit 1
}

# Verificar se as colunas já existem
Write-Host ""
Write-Host "🔍 Verificando colunas existentes..." -ForegroundColor Green

try {
    $deliveredExists = psql $DatabaseUrl -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'delivered_count');" 2>$null | ForEach-Object { $_.Trim() }
    $bouncedExists = psql $DatabaseUrl -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'bounced_count');" 2>$null | ForEach-Object { $_.Trim() }
    
    if ($deliveredExists -eq "t" -and $bouncedExists -eq "t") {
        Write-Host "✅ Colunas de rastreamento já existem" -ForegroundColor Green
        Write-Host "   - delivered_count: ✅" -ForegroundColor Green
        Write-Host "   - bounced_count: ✅" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Migration já foi aplicada anteriormente!" -ForegroundColor Cyan
        exit 0
    }
} catch {
    Write-Host "❌ ERRO: Não foi possível verificar as colunas existentes" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Aplicando migration das colunas de rastreamento..." -ForegroundColor Green
Write-Host ""

# Aplicar a migration
Write-Host "🔧 Executando ALTER TABLE..." -ForegroundColor Green

try {
    psql $DatabaseUrl -f "supabase/migrations/20250121000001-add-email-campaign-tracking-columns.sql" 2>$null
    Write-Host "✅ Migration aplicada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ ERRO: Falha ao aplicar a migration" -ForegroundColor Red
    Write-Host "   Verifique se o arquivo de migration existe e se você tem permissões" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Verificar se as colunas foram criadas
Write-Host "🔍 Verificando se as colunas foram criadas..." -ForegroundColor Green

try {
    $deliveredExists = psql $DatabaseUrl -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'delivered_count');" 2>$null | ForEach-Object { $_.Trim() }
    $bouncedExists = psql $DatabaseUrl -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'bounced_count');" 2>$null | ForEach-Object { $_.Trim() }
    
    if ($deliveredExists -eq "t" -and $bouncedExists -eq "t") {
        Write-Host "✅ Colunas criadas com sucesso:" -ForegroundColor Green
        Write-Host "   - delivered_count: ✅" -ForegroundColor Green
        Write-Host "   - bounced_count: ✅" -ForegroundColor Green
    } else {
        Write-Host "❌ ERRO: Algumas colunas não foram criadas" -ForegroundColor Red
        Write-Host "   - delivered_count: $(if ($deliveredExists -eq "t") { "✅" } else { "❌" })" -ForegroundColor $(if ($deliveredExists -eq "t") { "Green" } else { "Red" })
        Write-Host "   - bounced_count: $(if ($bouncedExists -eq "t") { "✅" } else { "❌" })" -ForegroundColor $(if ($bouncedExists -eq "t") { "Green" } else { "Red" })
        exit 1
    }
} catch {
    Write-Host "❌ ERRO: Não foi possível verificar se as colunas foram criadas" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 MIGRATION CONCLUÍDA COM SUCESSO!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Colunas adicionadas:" -ForegroundColor White
Write-Host "   • delivered_count - Contador de emails entregues" -ForegroundColor Gray
Write-Host "   • bounced_count - Contador de emails que retornaram" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Próximos passos:" -ForegroundColor White
Write-Host "   1. Reinicie o backend para aplicar as mudanças" -ForegroundColor Yellow
Write-Host "   2. Teste o envio de uma nova campanha" -ForegroundColor Yellow
Write-Host "   3. Verifique as estatísticas no dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Dica: As campanhas existentes terão delivered_count = 0" -ForegroundColor Gray
Write-Host "   Novas campanhas serão rastreadas corretamente" -ForegroundColor Gray 