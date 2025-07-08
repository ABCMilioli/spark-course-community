# Script PowerShell para aplicar a migration das colunas faltantes na tabela courses
# Execute: .\scripts\apply-missing-columns.ps1

Write-Host "🔧 Aplicando Migration: Adicionar Colunas Faltantes na Tabela Courses" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Verificar se as variáveis de ambiente estão configuradas
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL não configurada" -ForegroundColor Red
    Write-Host "💡 Configure a variável DATABASE_URL ou use o arquivo .env" -ForegroundColor Yellow
    exit 1
}

# Aplicar a migration
Write-Host "📝 Aplicando migration..." -ForegroundColor Green
try {
    psql $env:DATABASE_URL -f "supabase/migrations/20250707200000-add-missing-course-columns.sql"
    Write-Host "✅ Migration aplicada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao aplicar migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Colunas adicionadas:" -ForegroundColor Yellow
Write-Host "   - category (TEXT)" -ForegroundColor White
Write-Host "   - demo_video (TEXT)" -ForegroundColor White
Write-Host "   - isPaid (BOOLEAN, default: false)" -ForegroundColor White
Write-Host "   - updated_at (TIMESTAMPTZ, default: now())" -ForegroundColor White
Write-Host "   - is_active (BOOLEAN, default: true)" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Funcionalidades adicionadas:" -ForegroundColor Yellow
Write-Host "   - Trigger para atualizar updated_at automaticamente" -ForegroundColor White
Write-Host "   - Comentários nas colunas para documentação" -ForegroundColor White
Write-Host ""
Write-Host "🎉 A tabela courses agora está completa e pronta para uso!" -ForegroundColor Green 