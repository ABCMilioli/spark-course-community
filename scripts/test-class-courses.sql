-- Script para testar se a tabela class_courses foi criada
-- Execute este script para verificar se a implementação está funcionando

-- 1. Verificar se a tabela existe
SELECT 
    'Tabela class_courses existe' as status,
    COUNT(*) as total_records
FROM information_schema.tables 
WHERE table_name = 'class_courses' AND table_schema = 'public';

-- 2. Verificar se a view existe
SELECT 
    'View class_courses_with_details existe' as status,
    COUNT(*) as total_records
FROM information_schema.views 
WHERE table_name = 'class_courses_with_details' AND table_schema = 'public';

-- 3. Verificar se a função existe
SELECT 
    'Função get_class_course_stats existe' as status,
    COUNT(*) as total_records
FROM information_schema.routines 
WHERE routine_name = 'get_class_course_stats' AND routine_schema = 'public';

-- 4. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'class_courses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'class_courses' AND schemaname = 'public';

-- 6. Testar inserção de dados (se houver turmas e cursos)
SELECT 
    'Turmas disponíveis' as info,
    COUNT(*) as total
FROM class_instances;

SELECT 
    'Cursos disponíveis' as info,
    COUNT(*) as total
FROM courses;

-- 7. Testar a view (se houver dados)
SELECT 
    'Dados na view class_courses_with_details' as info,
    COUNT(*) as total
FROM class_courses_with_details; 