# Script PowerShell para testar a página administrativa de pagamentos
# Este script verifica se os endpoints estão funcionando corretamente

Write-Host "🧪 Testando Página Administrativa de Pagamentos" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Configurações
$API_URL = "http://localhost:3001/api"
$ADMIN_TOKEN = ""

# Função para fazer login como admin
function Login-Admin {
    Write-Host "🔐 Fazendo login como admin..." -ForegroundColor Yellow
    
    # Primeiro, vamos tentar fazer login com um admin existente
    # Se não existir, vamos criar um
    $loginBody = @{
        email = "admin@example.com"
        password = "admin123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction SilentlyContinue
    
    if ($loginResponse.error) {
        Write-Host "❌ Login falhou. Criando usuário admin..." -ForegroundColor Red
        
        # Criar usuário admin
        $createBody = @{
            name = "Admin"
            email = "admin@example.com"
            password = "admin123"
            role = "admin"
        } | ConvertTo-Json
        
        $createResponse = Invoke-RestMethod -Uri "$API_URL/users" -Method POST -Body $createBody -ContentType "application/json" -ErrorAction SilentlyContinue
        
        if ($createResponse.error) {
            Write-Host "❌ Erro ao criar usuário admin: $($createResponse.error)" -ForegroundColor Red
            return $false
        }
        
        # Tentar login novamente
        $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction SilentlyContinue
    }
    
    $script:ADMIN_TOKEN = $loginResponse.token
    
    if (-not $ADMIN_TOKEN) {
        Write-Host "❌ Falha ao obter token de admin" -ForegroundColor Red
        return $false
    }
    
    Write-Host "✅ Login realizado com sucesso" -ForegroundColor Green
    Write-Host "Token: $($ADMIN_TOKEN.Substring(0, [Math]::Min(20, $ADMIN_TOKEN.Length)))..." -ForegroundColor Gray
    return $true
}

# Função para testar endpoint de estatísticas
function Test-Stats {
    Write-Host "📊 Testando endpoint de estatísticas..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $ADMIN_TOKEN"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/payments/stats" -Method GET -Headers $headers
        Write-Host "✅ Estatísticas obtidas com sucesso:" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
        return $true
    }
    catch {
        Write-Host "❌ Erro ao buscar estatísticas: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para testar endpoint de histórico
function Test-History {
    Write-Host "📋 Testando endpoint de histórico..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $ADMIN_TOKEN"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/payments/history" -Method GET -Headers $headers
        Write-Host "✅ Histórico obtido com sucesso:" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
        return $true
    }
    catch {
        Write-Host "❌ Erro ao buscar histórico: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para testar endpoint de métodos de pagamento
function Test-Methods {
    Write-Host "💳 Testando endpoint de métodos de pagamento..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $ADMIN_TOKEN"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/payments/methods" -Method GET -Headers $headers
        Write-Host "✅ Métodos obtidos com sucesso:" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10
        return $true
    }
    catch {
        Write-Host "❌ Erro ao buscar métodos: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para testar acesso negado para usuário não-admin
function Test-AccessDenied {
    Write-Host "🚫 Testando acesso negado para usuário comum..." -ForegroundColor Yellow
    
    # Criar usuário comum
    $createBody = @{
        name = "User"
        email = "user@example.com"
        password = "user123"
        role = "student"
    } | ConvertTo-Json
    
    try {
        $createResponse = Invoke-RestMethod -Uri "$API_URL/users" -Method POST -Body $createBody -ContentType "application/json" -ErrorAction SilentlyContinue
    }
    catch {
        # Usuário já pode existir, continuar
    }
    
    # Login como usuário comum
    $loginBody = @{
        email = "user@example.com"
        password = "user123"
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        $userToken = $loginResponse.token
        
        # Tentar acessar endpoint de estatísticas
        $headers = @{
            "Authorization" = "Bearer $userToken"
        }
        
        try {
            $response = Invoke-RestMethod -Uri "$API_URL/payments/stats" -Method GET -Headers $headers
            Write-Host "❌ Usuário comum conseguiu acessar endpoint admin" -ForegroundColor Red
            return $false
        }
        catch {
            if ($_.Exception.Message -like "*Acesso negado*" -or $_.Exception.Message -like "*403*") {
                Write-Host "✅ Acesso negado corretamente para usuário comum" -ForegroundColor Green
                return $true
            }
            else {
                Write-Host "❌ Erro inesperado: $($_.Exception.Message)" -ForegroundColor Red
                return $false
            }
        }
    }
    catch {
        Write-Host "❌ Erro ao testar acesso negado: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Função para verificar se o frontend está acessível
function Test-Frontend {
    Write-Host "🌐 Testando acesso ao frontend..." -ForegroundColor Yellow
    
    # Verificar se a página de admin está acessível
    $FRONTEND_URL = "http://localhost:3000"
    
    try {
        $response = Invoke-WebRequest -Uri $FRONTEND_URL -Method GET -ErrorAction Stop
        Write-Host "✅ Frontend está acessível em $FRONTEND_URL" -ForegroundColor Green
        Write-Host "📝 Para acessar a página administrativa de pagamentos:" -ForegroundColor Cyan
        Write-Host "   1. Acesse: $FRONTEND_URL/admin" -ForegroundColor White
        Write-Host "   2. Clique na aba 'Pagamentos'" -ForegroundColor White
        Write-Host "   3. Ou acesse diretamente: $FRONTEND_URL/admin/payments" -ForegroundColor White
        return $true
    }
    catch {
        Write-Host "❌ Frontend não está acessível em $FRONTEND_URL" -ForegroundColor Red
        Write-Host "   Certifique-se de que o frontend está rodando" -ForegroundColor Yellow
        return $false
    }
}

# Função principal
function Main {
    Write-Host "🚀 Iniciando testes da página administrativa de pagamentos..." -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar se o backend está rodando
    try {
        $response = Invoke-WebRequest -Uri "$API_URL/auth/login" -Method GET -ErrorAction Stop
        Write-Host "✅ Backend está acessível" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Backend não está acessível em $API_URL" -ForegroundColor Red
        Write-Host "   Certifique-se de que o backend está rodando" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    
    # Executar testes
    if (-not (Login-Admin)) { exit 1 }
    Write-Host ""
    
    if (-not (Test-Stats)) { exit 1 }
    Write-Host ""
    
    if (-not (Test-History)) { exit 1 }
    Write-Host ""
    
    if (-not (Test-Methods)) { exit 1 }
    Write-Host ""
    
    if (-not (Test-AccessDenied)) { exit 1 }
    Write-Host ""
    
    Test-Frontend
    Write-Host ""
    
    Write-Host "🎉 Todos os testes passaram!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Resumo:" -ForegroundColor Cyan
    Write-Host "   ✅ Backend acessível" -ForegroundColor Green
    Write-Host "   ✅ Login de admin funcionando" -ForegroundColor Green
    Write-Host "   ✅ Endpoint de estatísticas funcionando" -ForegroundColor Green
    Write-Host "   ✅ Endpoint de histórico funcionando" -ForegroundColor Green
    Write-Host "   ✅ Endpoint de métodos funcionando" -ForegroundColor Green
    Write-Host "   ✅ Controle de acesso funcionando" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Para acessar a página administrativa:" -ForegroundColor Cyan
    Write-Host "   http://localhost:3000/admin/payments" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Para configurar os gateways de pagamento:" -ForegroundColor Cyan
    Write-Host "   1. Configure as variáveis de ambiente no docker-stack.yml" -ForegroundColor White
    Write-Host "   2. Configure os webhooks no Stripe e Mercado Pago" -ForegroundColor White
    Write-Host "   3. Reinicie os containers" -ForegroundColor White
}

# Executar função principal
Main 