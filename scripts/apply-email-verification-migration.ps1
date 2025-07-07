# Script PowerShell para aplicar a migration de verificação de email
Write-Host "🔧 Aplicando migration de verificação de email..." -ForegroundColor Cyan

# Verificar se o arquivo de migration existe
$MIGRATION_FILE = "backend/migrations/20250117000000-create-email-verification-tokens.sql"

if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ Arquivo de migration não encontrado: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration encontrada: $MIGRATION_FILE" -ForegroundColor Green

# Verificar se o Docker está rodando
try {
    docker ps | Out-Null
} catch {
    Write-Host "❌ Docker não está rodando. Inicie o Docker primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se o container está rodando
try {
    $containerStatus = docker-compose ps | Select-String "app.*Up"
    if (-not $containerStatus) {
        Write-Host "❌ Container da aplicação não está rodando. Execute 'docker-compose up -d' primeiro." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erro ao verificar status do container." -ForegroundColor Red
    exit 1
}

Write-Host "🐳 Aplicando migration via Docker..." -ForegroundColor Yellow

# Aplicar a migration
try {
    Get-Content $MIGRATION_FILE | docker-compose exec -T postgres psql -U postgres -d spark_course
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration aplicada com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
        Write-Host "1. Reinicie o container da aplicação: docker-compose restart app" -ForegroundColor White
        Write-Host "2. Teste o fluxo de cadastro com verificação de email" -ForegroundColor White
        Write-Host "3. Configure as variáveis SMTP se ainda não configurou" -ForegroundColor White
        Write-Host ""
        Write-Host "🔧 Para testar, acesse a aplicação e tente criar uma nova conta." -ForegroundColor Cyan
        Write-Host "📧 O sistema enviará um email de verificação antes de criar a conta." -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erro ao aplicar migration" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erro ao executar migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 