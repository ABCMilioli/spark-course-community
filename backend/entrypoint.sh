#!/bin/sh
set -e

echo "Aguardando o Postgres ficar disponível..."
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
  sleep 2
done

echo "Rodando migrations..."
for f in /app/migrations/*.sql; do
  echo "Executando $f"
  if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"; then
    echo "Erro ao executar migration: $f"
    exit 1
  fi
done

echo "Iniciando backend..."
exec node index.js 