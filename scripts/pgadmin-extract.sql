-- Script para executar no pgAdmin
-- Copie e cole este script no Query Tool do pgAdmin

-- =====================================================
-- 1. LISTA DE TODAS AS TABELAS
-- =====================================================
SELECT 'TABELA: ' || tablename as info
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 2. ESTRUTURA DETALHADA DE CADA TABELA
-- =====================================================
SELECT 
    'TABELA: ' || t.table_name || ' | COLUNA: ' || c.column_name || 
    ' | TIPO: ' || c.data_type || 
    CASE WHEN c.character_maximum_length IS NOT NULL 
         THEN '(' || c.character_maximum_length || ')' 
         ELSE '' 
    END ||
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN c.column_default IS NOT NULL 
         THEN ' DEFAULT ' || c.column_default 
         ELSE '' 
    END as estrutura
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- =====================================================
-- 3. CHAVES ESTRANGEIRAS
-- =====================================================
SELECT 
    'FK: ' || tc.table_name || '.' || kcu.column_name || 
    ' -> ' || ccu.table_name || '.' || ccu.column_name as foreign_keys
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

-- =====================================================
-- 4. ÍNDICES (EXCLUINDO CHAVES PRIMÁRIAS)
-- =====================================================
SELECT 
    'INDICE: ' || tablename || '.' || indexname || ' -> ' || indexdef as indices
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

-- =====================================================
-- 5. VIEWS
-- =====================================================
SELECT 
    'VIEW: ' || table_name || ' -> ' || view_definition as views
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 6. FUNÇÕES
-- =====================================================
SELECT 
    'FUNCAO: ' || p.proname || ' -> ' || pg_get_functiondef(p.oid) as funcoes
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================
SELECT 
    'TRIGGER: ' || trigger_name || ' na tabela ' || event_object_table || 
    ' -> ' || action_statement as triggers
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 8. CONTAGEM DE REGISTROS POR TABELA
-- =====================================================
DO $$
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
END $$;

-- =====================================================
-- 9. TAMANHO DAS TABELAS
-- =====================================================
SELECT 
    'TAMANHO: ' || tablename || ' -> ' || 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanhos
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 10. INFORMAÇÕES GERAIS DO BANCO
-- =====================================================
SELECT 
    'BANCO: ' || current_database() as info
UNION ALL
SELECT 
    'USUARIO: ' || current_user as info
UNION ALL
SELECT 
    'VERSAO: ' || version() as info; 