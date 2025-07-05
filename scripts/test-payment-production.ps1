# Script de Teste - Gateways de Pagamento em Produção
# PowerShell para Windows

Write-Host "🚀 Testando Gateways de Pagamento em Produção" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Configurações
$BASE_URL = $env:APP_URL
if (-not $BASE_URL) {
    $BASE_URL = Read-Host "Digite a URL da aplicação (ex: https://seu-dominio.com)"
}

Write-Host "🔍 Testando: $BASE_URL" -ForegroundColor Yellow

# Função para fazer requisições HTTP
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = "",
        [string]$Description
    )
    
    Write-Host "📍 $Description..." -ForegroundColor Cyan
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -Body $Body -ContentType "application/json" -ErrorAction Stop
        }
        
        Write-Host "   ✅ SUCESSO" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "   ❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 1. Testar conectividade básica
Write-Host "`n🌐 1. Testando Conectividade Básica" -ForegroundColor Blue
Write-Host "------------------------------------" -ForegroundColor Blue

$healthCheck = Test-Endpoint -Url "$BASE_URL/api/health" -Description "Health check da API"
if (-not $healthCheck) {
    Write-Host "❌ API não está respondendo. Verifique se o serviço está ativo." -ForegroundColor Red
    exit 1
}

# 2. Testar endpoints de pagamento (sem autenticação)
Write-Host "`n💳 2. Testando Endpoints de Pagamento" -ForegroundColor Blue
Write-Host "-------------------------------------" -ForegroundColor Blue

$methods = Test-Endpoint -Url "$BASE_URL/api/payments/methods" -Description "Métodos de pagamento disponíveis"

if ($methods) {
    Write-Host "   📋 Métodos encontrados:" -ForegroundColor Yellow
    foreach ($method in $methods) {
        $status = if ($method.enabled) { "✅ ATIVO" } else { "❌ INATIVO" }
        Write-Host "      - $($method.name): $status" -ForegroundColor White
    }
}

# 3. Testar configuração do Stripe
Write-Host "`n💎 3. Testando Configuração do Stripe" -ForegroundColor Blue
Write-Host "-------------------------------------" -ForegroundColor Blue

# Verificar se as variáveis estão configuradas
$stripeKey = $env:STRIPE_SECRET_KEY
$stripeWebhook = $env:STRIPE_WEBHOOK_SECRET

if ($stripeKey) {
    if ($stripeKey.StartsWith("sk_live_")) {
        Write-Host "   ✅ Stripe configurado para PRODUÇÃO" -ForegroundColor Green
    } elseif ($stripeKey.StartsWith("sk_test_")) {
        Write-Host "   ⚠️  Stripe configurado para TESTE" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Chave Stripe inválida" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ STRIPE_SECRET_KEY não configurado" -ForegroundColor Red
}

if ($stripeWebhook) {
    Write-Host "   ✅ Webhook secret configurado" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  STRIPE_WEBHOOK_SECRET não configurado" -ForegroundColor Yellow
}

# 4. Testar configuração do Mercado Pago
Write-Host "`n🛒 4. Testando Configuração do Mercado Pago" -ForegroundColor Blue
Write-Host "-------------------------------------------" -ForegroundColor Blue

$mpToken = $env:MERCADOPAGO_ACCESS_TOKEN

if ($mpToken) {
    if ($mpToken.StartsWith("APP_USR-")) {
        Write-Host "   ✅ Mercado Pago configurado para PRODUÇÃO" -ForegroundColor Green
        
        # Testar API do Mercado Pago
        try {
            $headers = @{ "Authorization" = "Bearer $mpToken" }
            $mpTest = Invoke-RestMethod -Uri "https://api.mercadopago.com/v1/payment_methods" -Headers $headers -ErrorAction Stop
            Write-Host "   ✅ API do Mercado Pago respondendo" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Erro na API do Mercado Pago: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } elseif ($mpToken.StartsWith("TEST-")) {
        Write-Host "   ⚠️  Mercado Pago configurado para TESTE" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Token Mercado Pago inválido" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  MERCADOPAGO_ACCESS_TOKEN não configurado" -ForegroundColor Yellow
    Write-Host "      Mercado Pago será desabilitado" -ForegroundColor Gray
}

# 5. Testar webhooks (se possível)
Write-Host "`n🔗 5. Testando Webhooks" -ForegroundColor Blue
Write-Host "------------------------" -ForegroundColor Blue

# Testar webhook Stripe (simulação)
$stripeWebhookTest = Test-Endpoint -Url "$BASE_URL/api/webhooks/stripe" -Method "POST" -Description "Webhook Stripe (teste de conectividade)"
if ($stripeWebhookTest) {
    Write-Host "   ✅ Endpoint do webhook Stripe acessível" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Endpoint do webhook Stripe com problemas (normal se sem assinatura)" -ForegroundColor Yellow
}

# Testar webhook Mercado Pago (simulação)  
$mpWebhookTest = Test-Endpoint -Url "$BASE_URL/api/webhooks/mercadopago" -Method "POST" -Description "Webhook Mercado Pago (teste de conectividade)"

# 6. Verificar banco de dados
Write-Host "`n🗄️ 6. Verificando Banco de Dados" -ForegroundColor Blue
Write-Host "--------------------------------" -ForegroundColor Blue

# Testar endpoint que usa o banco
$dbTest = Test-Endpoint -Url "$BASE_URL/api/payments/stats" -Description "Conectividade com banco de dados (endpoint stats)"

if ($dbTest) {
    Write-Host "   ✅ Banco de dados respondendo" -ForegroundColor Green
} else {
    Write-Host "   ❌ Problema com banco de dados ou permissões" -ForegroundColor Red
}

# 7. Testar HTTPS e certificado
Write-Host "`n🔒 7. Verificando HTTPS" -ForegroundColor Blue
Write-Host "----------------------" -ForegroundColor Blue

if ($BASE_URL.StartsWith("https://")) {
    Write-Host "   ✅ HTTPS configurado" -ForegroundColor Green
    
    # Testar certificado SSL
    try {
        $uri = [System.Uri]$BASE_URL
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($uri.Host, 443)
        $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream())
        $sslStream.AuthenticateAsClient($uri.Host)
        $cert = $sslStream.RemoteCertificate
        $tcpClient.Close()
        
        Write-Host "   ✅ Certificado SSL válido" -ForegroundColor Green
        Write-Host "      Expira em: $($cert.NotAfter)" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  Problema com certificado SSL: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ HTTPS NÃO configurado - OBRIGATÓRIO para produção!" -ForegroundColor Red
}

# 8. Resumo dos testes
Write-Host "`n📊 8. Resumo dos Testes" -ForegroundColor Blue
Write-Host "------------------------" -ForegroundColor Blue

$summary = @"
Resumo da Configuração:

🌐 URL Base: $BASE_URL
💎 Stripe: $(if ($stripeKey) { if ($stripeKey.StartsWith("sk_live_")) { "✅ PRODUÇÃO" } else { "⚠️ TESTE" } } else { "❌ NÃO CONFIGURADO" })
🛒 Mercado Pago: $(if ($mpToken) { if ($mpToken.StartsWith("APP_USR-")) { "✅ PRODUÇÃO" } else { "⚠️ TESTE" } } else { "❌ NÃO CONFIGURADO" })
🗄️ Banco de Dados: $(if ($dbTest) { "✅ FUNCIONANDO" } else { "❌ PROBLEMA" })
🔒 HTTPS: $(if ($BASE_URL.StartsWith("https://")) { "✅ ATIVO" } else { "❌ NÃO CONFIGURADO" })

"@

Write-Host $summary -ForegroundColor White

# 9. Próximos passos
Write-Host "`n🎯 9. Próximos Passos" -ForegroundColor Blue
Write-Host "---------------------" -ForegroundColor Blue

if ($BASE_URL.StartsWith("https://") -and $stripeKey -and $stripeKey.StartsWith("sk_live_")) {
    Write-Host "✅ Sistema pronto para PRODUÇÃO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Acesse o dashboard de pagamentos em:" -ForegroundColor Yellow
    Write-Host "$BASE_URL/admin/payments" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para testar pagamentos reais:" -ForegroundColor Yellow
    Write-Host "1. Crie um curso com valor baixo (R$ 1,00)" -ForegroundColor White
    Write-Host "2. Teste o fluxo completo de pagamento" -ForegroundColor White
    Write-Host "3. Verifique se os webhooks estão funcionando" -ForegroundColor White
} else {
    Write-Host "⚠️  Sistema ainda NÃO está pronto para produção!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Itens a corrigir:" -ForegroundColor Red
    if (-not $BASE_URL.StartsWith("https://")) {
        Write-Host "❌ Configure HTTPS com certificado SSL válido" -ForegroundColor Red
    }
    if (-not $stripeKey -or -not $stripeKey.StartsWith("sk_live_")) {
        Write-Host "❌ Configure chaves de PRODUÇÃO do Stripe" -ForegroundColor Red
    }
    if (-not $dbTest) {
        Write-Host "❌ Corrija problemas com o banco de dados" -ForegroundColor Red
    }
}

Write-Host "`n🔧 Para mais detalhes, consulte:" -ForegroundColor Blue
Write-Host "README-PAYMENT-PRODUCTION.md" -ForegroundColor Cyan

Write-Host "`n🎉 Teste concluído!" -ForegroundColor Green 