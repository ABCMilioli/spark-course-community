#!/bin/sh
set -e

echo "Aguardando o Postgres ficar disponível..."
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  sleep 2
done

echo "Verificando migrations já aplicadas..."

# Criar tabela de controle de migrations se não existir
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
CREATE TABLE IF NOT EXISTS migrations_applied (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);" 2>/dev/null || true

echo "Rodando migrations..."
for f in /app/migrations/*.sql; do
  # Extrair nome do arquivo
  migration_name=$(basename "$f")
  
  # Verificar se a migration já foi aplicada
  if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT 1 FROM migrations_applied WHERE migration_name = '$migration_name';" | grep -q 1; then
    echo "Migration $migration_name já foi aplicada, pulando..."
    continue
  fi
  
  echo "Executando $migration_name"
  if PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"; then
    # Registrar que a migration foi aplicada com sucesso
    PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "INSERT INTO migrations_applied (migration_name) VALUES ('$migration_name');"
    echo "✅ Migration $migration_name aplicada com sucesso"
  else
    echo "❌ Erro ao executar migration: $migration_name"
    exit 1
  fi
done

echo "Todas as migrations foram aplicadas!"
echo "Iniciando backend..."
exec node index.js 