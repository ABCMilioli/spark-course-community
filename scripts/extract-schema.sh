#!/bin/bash

# Script para extrair estrutura do banco de dados
# Uso: ./extract-schema.sh [host] [port] [database] [username]

set -e

# Configurações padrão
HOST=${1:-localhost}
PORT=${2:-5432}
DATABASE=${3:-postgres}
USERNAME=${4:-postgres}

echo "=== Extraindo estrutura do banco de dados ==="
echo "Host: $HOST"
echo "Port: $PORT"
echo "Database: $DATABASE"
echo "Username: $USERNAME"
echo ""

# Criar diretório de saída
mkdir -p schema_output

# 1. Lista de tabelas
echo "1. Extraindo lista de tabelas..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -c "
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
" > schema_output/01_tables.txt

# 2. Estrutura detalhada das tabelas
echo "2. Extraindo estrutura das tabelas..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -c "
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;
" > schema_output/02_table_structure.txt

# 3. Chaves estrangeiras
echo "3. Extraindo chaves estrangeiras..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -c "
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
" > schema_output/03_foreign_keys.txt

# 4. Índices
echo "4. Extraindo índices..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -c "
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
" > schema_output/04_indexes.txt

# 5. Views
echo "5. Extraindo views..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -c "
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
" > schema_output/05_views.txt

# 6. Funções
echo "6. Extraindo funções..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -c "
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
" > schema_output/06_functions.txt

# 7. Triggers
echo "7. Extraindo triggers..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -c "
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
" > schema_output/07_triggers.txt

# 8. Contagem de registros
echo "8. Contando registros..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -c "
DO \$\$
DECLARE
    r RECORD;
    query TEXT;
    count_val BIGINT;
BEGIN
    RAISE NOTICE '=== CONTAGEM DE REGISTROS ===';
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    LOOP
        query := 'SELECT COUNT(*) FROM ' || quote_ident(r.tablename);
        EXECUTE query INTO count_val;
        RAISE NOTICE '%: % registros', r.tablename, count_val;
    END LOOP;
END \$\$;
" > schema_output/08_record_counts.txt

# 9. Gerar migration completa
echo "9. Gerando migration completa..."
psql -h $HOST -p $PORT -d $DATABASE -U $USERNAME -f scripts/generate-complete-migration.sql > schema_output/09_complete_migration.sql

# 10. Criar resumo
echo "10. Criando resumo..."
cat > schema_output/00_summary.txt << EOF
=== RESUMO DA ESTRUTURA DO BANCO ===
Data: $(date)
Host: $HOST
Port: $PORT
Database: $DATABASE

TABELAS ENCONTRADAS:
$(cat schema_output/01_tables.txt | grep -v "tablename" | wc -l)

ARQUIVOS GERADOS:
- 01_tables.txt: Lista de todas as tabelas
- 02_table_structure.txt: Estrutura detalhada das tabelas
- 03_foreign_keys.txt: Chaves estrangeiras
- 04_indexes.txt: Índices
- 05_views.txt: Views
- 06_functions.txt: Funções
- 07_triggers.txt: Triggers
- 08_record_counts.txt: Contagem de registros
- 09_complete_migration.sql: Migration completa

PRÓXIMOS PASSOS:
1. Revisar os arquivos gerados
2. Ajustar a migration conforme necessário
3. Testar a migration em ambiente de desenvolvimento
4. Aplicar no novo ambiente

EOF

echo ""
echo "=== Extração concluída! ==="
echo "Arquivos salvos em: schema_output/"
echo ""
echo "Para visualizar o resumo:"
echo "cat schema_output/00_summary.txt"
echo ""
echo "Para visualizar a migration completa:"
echo "cat schema_output/09_complete_migration.sql" 