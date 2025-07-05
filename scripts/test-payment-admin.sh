#!/bin/bash

# Script para testar a página administrativa de pagamentos
# Este script verifica se os endpoints estão funcionando corretamente

echo "🧪 Testando Página Administrativa de Pagamentos"
echo "================================================"

# Configurações
API_URL="http://localhost:3001/api"
ADMIN_TOKEN=""

# Função para fazer login como admin
login_admin() {
    echo "🔐 Fazendo login como admin..."
    
    # Primeiro, vamos tentar fazer login com um admin existente
    # Se não existir, vamos criar um
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@example.com",
            "password": "admin123"
        }')
    
    if echo "$LOGIN_RESPONSE" | grep -q "error"; then
        echo "❌ Login falhou. Criando usuário admin..."
        
        # Criar usuário admin
        CREATE_RESPONSE=$(curl -s -X POST "$API_URL/users" \
            -H "Content-Type: application/json" \
            -d '{
                "name": "Admin",
                "email": "admin@example.com",
                "password": "admin123",
                "role": "admin"
            }')
        
        if echo "$CREATE_RESPONSE" | grep -q "error"; then
            echo "❌ Erro ao criar usuário admin: $CREATE_RESPONSE"
            return 1
        fi
        
        # Tentar login novamente
        LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d '{
                "email": "admin@example.com",
                "password": "admin123"
            }')
    fi
    
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo "❌ Falha ao obter token de admin"
        return 1
    fi
    
    echo "✅ Login realizado com sucesso"
    echo "Token: ${ADMIN_TOKEN:0:20}..."
}

# Função para testar endpoint de estatísticas
test_stats() {
    echo "📊 Testando endpoint de estatísticas..."
    
    RESPONSE=$(curl -s -X GET "$API_URL/payments/stats" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$RESPONSE" | grep -q "error"; then
        echo "❌ Erro ao buscar estatísticas: $RESPONSE"
        return 1
    fi
    
    echo "✅ Estatísticas obtidas com sucesso:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
}

# Função para testar endpoint de histórico
test_history() {
    echo "📋 Testando endpoint de histórico..."
    
    RESPONSE=$(curl -s -X GET "$API_URL/payments/history" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$RESPONSE" | grep -q "error"; then
        echo "❌ Erro ao buscar histórico: $RESPONSE"
        return 1
    fi
    
    echo "✅ Histórico obtido com sucesso:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
}

# Função para testar endpoint de métodos de pagamento
test_methods() {
    echo "💳 Testando endpoint de métodos de pagamento..."
    
    RESPONSE=$(curl -s -X GET "$API_URL/payments/methods" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$RESPONSE" | grep -q "error"; then
        echo "❌ Erro ao buscar métodos: $RESPONSE"
        return 1
    fi
    
    echo "✅ Métodos obtidos com sucesso:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
}

# Função para testar acesso negado para usuário não-admin
test_access_denied() {
    echo "🚫 Testando acesso negado para usuário comum..."
    
    # Criar usuário comum
    CREATE_RESPONSE=$(curl -s -X POST "$API_URL/users" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "User",
            "email": "user@example.com",
            "password": "user123",
            "role": "student"
        }')
    
    # Login como usuário comum
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "user@example.com",
            "password": "user123"
        }')
    
    USER_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    # Tentar acessar endpoint de estatísticas
    RESPONSE=$(curl -s -X GET "$API_URL/payments/stats" \
        -H "Authorization: Bearer $USER_TOKEN")
    
    if echo "$RESPONSE" | grep -q "Acesso negado"; then
        echo "✅ Acesso negado corretamente para usuário comum"
    else
        echo "❌ Usuário comum conseguiu acessar endpoint admin: $RESPONSE"
        return 1
    fi
}

# Função para verificar se o frontend está acessível
test_frontend() {
    echo "🌐 Testando acesso ao frontend..."
    
    # Verificar se a página de admin está acessível
    FRONTEND_URL="http://localhost:3000"
    
    if curl -s -f "$FRONTEND_URL" > /dev/null; then
        echo "✅ Frontend está acessível em $FRONTEND_URL"
        echo "📝 Para acessar a página administrativa de pagamentos:"
        echo "   1. Acesse: $FRONTEND_URL/admin"
        echo "   2. Clique na aba 'Pagamentos'"
        echo "   3. Ou acesse diretamente: $FRONTEND_URL/admin/payments"
    else
        echo "❌ Frontend não está acessível em $FRONTEND_URL"
        echo "   Certifique-se de que o frontend está rodando"
    fi
}

# Função principal
main() {
    echo "🚀 Iniciando testes da página administrativa de pagamentos..."
    echo ""
    
    # Verificar se o backend está rodando
    if ! curl -s -f "$API_URL/auth/login" > /dev/null; then
        echo "❌ Backend não está acessível em $API_URL"
        echo "   Certifique-se de que o backend está rodando"
        exit 1
    fi
    
    echo "✅ Backend está acessível"
    echo ""
    
    # Executar testes
    login_admin || exit 1
    echo ""
    
    test_stats || exit 1
    echo ""
    
    test_history || exit 1
    echo ""
    
    test_methods || exit 1
    echo ""
    
    test_access_denied || exit 1
    echo ""
    
    test_frontend
    echo ""
    
    echo "🎉 Todos os testes passaram!"
    echo ""
    echo "📋 Resumo:"
    echo "   ✅ Backend acessível"
    echo "   ✅ Login de admin funcionando"
    echo "   ✅ Endpoint de estatísticas funcionando"
    echo "   ✅ Endpoint de histórico funcionando"
    echo "   ✅ Endpoint de métodos funcionando"
    echo "   ✅ Controle de acesso funcionando"
    echo ""
    echo "🌐 Para acessar a página administrativa:"
    echo "   http://localhost:3000/admin/payments"
    echo ""
    echo "🔧 Para configurar os gateways de pagamento:"
    echo "   1. Configure as variáveis de ambiente no docker-stack.yml"
    echo "   2. Configure os webhooks no Stripe e Mercado Pago"
    echo "   3. Reinicie os containers"
}

# Executar função principal
main 