-- Script para gerar migrations completas baseadas na estrutura atual
-- Este script deve ser executado no banco de produção para gerar as migrations

-- Função para gerar CREATE TABLE statements
CREATE OR REPLACE FUNCTION generate_create_tables()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    table_record RECORD;
    column_record RECORD;
    constraint_record RECORD;
    index_record RECORD;
    column_def TEXT;
    constraints TEXT;
    indexes TEXT;
BEGIN
    -- Para cada tabela
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    LOOP
        result := result || '-- Tabela: ' || table_record.tablename || E'\n';
        result := result || 'CREATE TABLE IF NOT EXISTS ' || quote_ident(table_record.tablename) || ' (' || E'\n';
        
        -- Colunas
        column_def := '';
        FOR column_record IN 
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                numeric_precision,
                numeric_scale,
                is_nullable,
                column_default,
                ordinal_position
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
                AND table_name = table_record.tablename
            ORDER BY ordinal_position
        LOOP
            IF column_def != '' THEN
                column_def := column_def || ',' || E'\n';
            END IF;
            
            column_def := column_def || '    ' || quote_ident(column_record.column_name) || ' ' || column_record.data_type;
            
            -- Adicionar tamanho para tipos de caractere
            IF column_record.character_maximum_length IS NOT NULL THEN
                column_def := column_def || '(' || column_record.character_maximum_length || ')';
            END IF;
            
            -- Adicionar precisão para tipos numéricos
            IF column_record.numeric_precision IS NOT NULL THEN
                column_def := column_def || '(' || column_record.numeric_precision;
                IF column_record.numeric_scale IS NOT NULL THEN
                    column_def := column_def || ',' || column_record.numeric_scale;
                END IF;
                column_def := column_def || ')';
            END IF;
            
            -- NOT NULL
            IF column_record.is_nullable = 'NO' THEN
                column_def := column_def || ' NOT NULL';
            END IF;
            
            -- DEFAULT
            IF column_record.column_default IS NOT NULL THEN
                column_def := column_def || ' DEFAULT ' || column_record.column_default;
            END IF;
        END LOOP;
        
        result := result || column_def;
        
        -- Constraints
        constraints := '';
        FOR constraint_record IN 
            SELECT 
                tc.constraint_type,
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema = 'public' 
                AND tc.table_name = table_record.tablename
                AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
            ORDER BY tc.constraint_type, tc.constraint_name
        LOOP
            IF constraints != '' THEN
                constraints := constraints || ',' || E'\n';
            END IF;
            
            IF constraint_record.constraint_type = 'PRIMARY KEY' THEN
                constraints := constraints || '    PRIMARY KEY (' || quote_ident(constraint_record.column_name) || ')';
            ELSIF constraint_record.constraint_type = 'FOREIGN KEY' THEN
                constraints := constraints || '    FOREIGN KEY (' || quote_ident(constraint_record.column_name) || ') REFERENCES ' || 
                             quote_ident(constraint_record.foreign_table_name) || '(' || quote_ident(constraint_record.foreign_column_name) || ')';
            ELSIF constraint_record.constraint_type = 'UNIQUE' THEN
                constraints := constraints || '    UNIQUE (' || quote_ident(constraint_record.column_name) || ')';
            END IF;
        END LOOP;
        
        IF constraints != '' THEN
            result := result || ',' || E'\n' || constraints;
        END IF;
        
        result := result || E'\n);' || E'\n\n';
        
        -- Índices
        indexes := '';
        FOR index_record IN 
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE schemaname = 'public' 
                AND tablename = table_record.tablename
                AND indexname NOT LIKE '%_pkey'  -- Excluir índices de chave primária
            ORDER BY indexname
        LOOP
            indexes := indexes || '-- Índice: ' || index_record.indexname || E'\n';
            indexes := indexes || index_record.indexdef || ';' || E'\n';
        END LOOP;
        
        IF indexes != '' THEN
            result := result || indexes || E'\n';
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Executar a função para gerar as migrations
SELECT generate_create_tables();

-- Gerar statements para Views
SELECT 
    '-- View: ' || table_name || E'\n' ||
    'CREATE OR REPLACE VIEW ' || quote_ident(table_name) || ' AS ' || E'\n' ||
    view_definition || ';' || E'\n'
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Gerar statements para Funções
SELECT 
    '-- Função: ' || p.proname || E'\n' ||
    pg_get_functiondef(p.oid) || ';' || E'\n'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- Gerar statements para Triggers
SELECT 
    '-- Trigger: ' || trigger_name || ' na tabela ' || event_object_table || E'\n' ||
    'CREATE TRIGGER ' || quote_ident(trigger_name) || E'\n' ||
    '    ' || action_timing || ' ' || event_manipulation || E'\n' ||
    '    ON ' || quote_ident(event_object_table) || E'\n' ||
    '    FOR EACH ROW' || E'\n' ||
    '    EXECUTE FUNCTION ' || action_statement || ';' || E'\n'
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Limpar a função
DROP FUNCTION generate_create_tables(); 