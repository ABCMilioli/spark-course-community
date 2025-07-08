#!/bin/bash

echo "🚀 Configurando Sistema de Pagamento - Konektus"
echo "================================================================"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

echo "📦 Instalando dependências do Stripe no backend..."
cd backend
npm install stripe@^14.21.0
cd ..

echo "🗄️ Aplicando migração do sistema de pagamento..."
# Aqui você aplicaria a migração do banco de dados
echo "⚠️  IMPORTANTE: Execute manualmente a migração:"
echo "   supabase/migrations/20250116000000-create-payment-system.sql"

echo ""
echo "🔧 Configuração do Stripe necessária:"
echo "======================================"
echo "1. Crie uma conta no Stripe: https://stripe.com"
echo "2. Obtenha suas chaves de API no Dashboard do Stripe"
echo "3. Configure as variáveis de ambiente:"
echo ""
echo "   STRIPE_SECRET_KEY=sk_test_..."
echo "   STRIPE_PUBLISHABLE_KEY=pk_test_..."
echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo "4. Configure o webhook no Stripe Dashboard:"
echo "   URL: https://seu-dominio.com/api/webhooks/stripe"
echo "   Eventos: payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled"
echo ""

echo "✅ Sistema de pagamento configurado!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as chaves do Stripe no docker-stack.yml"
echo "2. Aplique a migração do banco de dados"
echo "3. Reinicie o container"
echo "4. Teste o sistema de pagamento"
echo ""
echo "🔗 Documentação do Stripe: https://stripe.com/docs"
echo "🔗 Documentação do projeto: README.md" 