-- Script para verificar a estrutura da tabela courses
-- Execute: psql DATABASE_URL -f scripts/check-courses-table.sql

-- Verificar todas as colunas da tabela courses
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se as colunas específicas existem
SELECT 
    'Verificação de Colunas Específicas' as info,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'category') 
         THEN '✅ category' ELSE '❌ category' END as category,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'demo_video') 
         THEN '✅ demo_video' ELSE '❌ demo_video' END as demo_video,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'isPaid') 
         THEN '✅ isPaid' ELSE '❌ isPaid' END as isPaid,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'updated_at') 
         THEN '✅ updated_at' ELSE '❌ updated_at' END as updated_at,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'is_active') 
         THEN '✅ is_active' ELSE '❌ is_active' END as is_active,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'payment_gateway') 
         THEN '✅ payment_gateway' ELSE '❌ payment_gateway' END as payment_gateway,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'external_checkout_url') 
         THEN '✅ external_checkout_url' ELSE '❌ external_checkout_url' END as external_checkout_url;

-- Verificar triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'courses'
  AND trigger_schema = 'public';

-- Verificar funções relacionadas
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name LIKE '%updated_at%';

-- Contar registros na tabela
SELECT 
    'Total de cursos' as info,
    COUNT(*) as total_courses
FROM courses; 