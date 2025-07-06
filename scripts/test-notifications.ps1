Write-Host "Executando teste de notificacoes..." -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "ERRO: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar se o arquivo de teste existe
if (-not (Test-Path "scripts/test-notifications.cjs")) {
    Write-Host "ERRO: Arquivo de teste nao encontrado" -ForegroundColor Red
    exit 1
}

# Executar o teste
Write-Host "Executando teste de notificacoes..." -ForegroundColor Yellow
node scripts/test-notifications.cjs

Write-Host ""
Write-Host "Teste concluido!" -ForegroundColor Green 