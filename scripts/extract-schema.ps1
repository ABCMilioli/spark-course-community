# Script PowerShell para extrair estrutura do banco de dados
# Uso: .\extract-schema.ps1 [host] [port] [database] [username]

param(
    [string]$Host = "localhost",
    [string]$Port = "5432",
    [string]$Database = "postgres",
    [string]$Username = "postgres"
)

Write-Host "=== Extraindo estrutura do banco de dados ===" -ForegroundColor Green
Write-Host "Host: $Host"
Write-Host "Port: $Port"
Write-Host "Database: $Database"
Write-Host "Username: $Username"
Write-Host ""

# Criar diretório de saída
if (!(Test-Path "schema_output")) {
    New-Item -ItemType Directory -Path "schema_output"
}

# Função para executar comando psql
function Invoke-PostgreSQL {
    param([string]$Query, [string]$OutputFile)
    
    $env:PGPASSWORD = Read-Host "Digite a senha do PostgreSQL" -AsSecureString | ConvertFrom-SecureString -AsPlainText
    
    try {
        & psql -h $Host -p $Port -d $Database -U $Username -c $Query | Out-File -FilePath $OutputFile -Encoding UTF8
        Write-Host "✓ $OutputFile" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Erro ao executar: $OutputFile" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

# 1. Lista de tabelas
Write-Host "1. Extraindo lista de tabelas..." -ForegroundColor Yellow
$query = @"
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
"@
Invoke-PostgreSQL -Query $query -OutputFile "schema_output\01_tables.txt"

# 2. Estrutura detalhada das tabelas
Write-Host "2. Extraindo estrutura das tabelas..." -ForegroundColor Yellow
$query = @"
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
"@
Invoke-PostgreSQL -Query $query -OutputFile "schema_output\02_table_structure.txt"

# 3. Chaves estrangeiras
Write-Host "3. Extraindo chaves estrangeiras..." -ForegroundColor Yellow
$query = @"
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
"@
Invoke-PostgreSQL -Query $query -OutputFile "schema_output\03_foreign_keys.txt"

# 4. Índices
Write-Host "4. Extraindo índices..." -ForegroundColor Yellow
$query = @"
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"@
Invoke-PostgreSQL -Query $query -OutputFile "schema_output\04_indexes.txt"

# 5. Views
Write-Host "5. Extraindo views..." -ForegroundColor Yellow
$query = @"
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
"@
Invoke-PostgreSQL -Query $query -OutputFile "schema_output\05_views.txt"

# 6. Funções
Write-Host "6. Extraindo funções..." -ForegroundColor Yellow
$query = @"
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
"@
Invoke-PostgreSQL -Query $query -OutputFile "schema_output\06_functions.txt"

# 7. Triggers
Write-Host "7. Extraindo triggers..." -ForegroundColor Yellow
$query = @"
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
"@
Invoke-PostgreSQL -Query $query -OutputFile "schema_output\07_triggers.txt"

# 8. Contagem de registros
Write-Host "8. Contando registros..." -ForegroundColor Yellow
$query = @"
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
"@
Invoke-PostgreSQL -Query $query -OutputFile "schema_output\08_record_counts.txt"

# 9. Gerar migration completa
Write-Host "9. Gerando migration completa..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = Read-Host "Digite a senha do PostgreSQL novamente" -AsSecureString | ConvertFrom-SecureString -AsPlainText
    & psql -h $Host -p $Port -d $Database -U $Username -f "scripts\generate-complete-migration.sql" | Out-File -FilePath "schema_output\09_complete_migration.sql" -Encoding UTF8
    Write-Host "✓ schema_output\09_complete_migration.sql" -ForegroundColor Green
}
catch {
    Write-Host "✗ Erro ao gerar migration completa" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# 10. Criar resumo
Write-Host "10. Criando resumo..." -ForegroundColor Yellow
$tableCount = (Get-Content "schema_output\01_tables.txt" | Select-Object -Skip 2 | Where-Object { $_ -match '\S' }).Count

$summary = @"
=== RESUMO DA ESTRUTURA DO BANCO ===
Data: $(Get-Date)
Host: $Host
Port: $Port
Database: $Database

TABELAS ENCONTRADAS: $tableCount

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
"@

$summary | Out-File -FilePath "schema_output\00_summary.txt" -Encoding UTF8

Write-Host ""
Write-Host "=== Extração concluída! ===" -ForegroundColor Green
Write-Host "Arquivos salvos em: schema_output\" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para visualizar o resumo:" -ForegroundColor Yellow
Write-Host "Get-Content schema_output\00_summary.txt" -ForegroundColor White
Write-Host ""
Write-Host "Para visualizar a migration completa:" -ForegroundColor Yellow
Write-Host "Get-Content schema_output\09_complete_migration.sql" -ForegroundColor White 