#!/bin/bash

echo "⚠️  ATENÇÃO: Isso vai resetar o controle de migrations!"
echo "📋 Todas as migrations serão executadas novamente na próxima inicialização."
echo ""
read -p "Tem certeza? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Resetando controle de migrations..."
    
    # Verificar se o container está rodando
    if docker-compose ps | grep -q "Up"; then
        echo "🗑️  Limpando tabela de migrations..."
        docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM migrations_applied;" 2>/dev/null || true
        echo "✅ Controle de migrations resetado!"
        echo ""
        echo "🔄 Para aplicar todas as migrations novamente:"
        echo "   docker-compose restart app"
    else
        echo "❌ Container não está rodando. Execute 'docker-compose up -d' primeiro."
        exit 1
    fi
else
    echo "❌ Operação cancelada."
fi 