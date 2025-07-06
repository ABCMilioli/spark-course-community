-- Script para verificar dados de pagamentos no banco
-- Execute este comando no PostgreSQL para diagnosticar o problema

-- 1. Verificar se a tabela payments existe
SELECT 
    'Tabela payments existe' as status,
    COUNT(*) as total_payments
FROM payments;

-- 2. Verificar estrutura da tabela payments
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- 3. Verificar se há dados de pagamentos
SELECT 
    'Dados de pagamentos' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN gateway = 'stripe' THEN 1 END) as stripe,
    COUNT(CASE WHEN gateway = 'mercadopago' THEN 1 END) as mercadopago,
    COALESCE(SUM(amount), 0) as total_amount
FROM payments;

-- 4. Verificar se há usuários admin
SELECT 
    'Usuários admin' as info,
    COUNT(*) as total_admins,
    STRING_AGG(email, ', ') as admin_emails
FROM profiles 
WHERE role = 'admin';

-- 5. Verificar se há cursos
SELECT 
    'Cursos disponíveis' as info,
    COUNT(*) as total_courses,
    COUNT(CASE WHEN price > 0 THEN 1 END) as paid_courses,
    COALESCE(SUM(price), 0) as total_value
FROM courses;

-- 6. Verificar relacionamentos (últimos 5 pagamentos)
SELECT 
    'Últimos pagamentos' as info,
    p.id,
    u.name as user_name,
    u.email as user_email,
    c.title as course_title,
    p.amount,
    p.status,
    p.gateway,
    p.created_at
FROM payments p
JOIN profiles u ON p.user_id = u.id
JOIN courses c ON p.course_id = c.id
ORDER BY p.created_at DESC
LIMIT 5;

-- 7. Estatísticas por gateway (como a API deveria retornar)
SELECT 
    gateway,
    COUNT(*) as total_payments,
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded_payments,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
    ROUND(
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN status = 'succeeded' THEN 1 END)::decimal / COUNT(*)) * 100
            ELSE 0
        END, 2
    ) as success_rate
FROM payments 
GROUP BY gateway
ORDER BY total_payments DESC;

-- 8. Histórico completo (como a API deveria retornar)
SELECT 
    p.*,
    c.title as course_title,
    c.thumbnail_url,
    u.name as user_name,
    u.email as user_email
FROM payments p
JOIN courses c ON p.course_id = c.id
JOIN profiles u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 10; 