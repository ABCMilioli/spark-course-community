-- Script para inserir dados de teste de pagamentos
-- Execute este script no banco de dados para testar a página administrativa

-- Verificar se existem usuários e cursos
DO $$
BEGIN
    -- Verificar se há usuários
    IF NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado. Crie usuários primeiro.';
    END IF;
    
    -- Verificar se há cursos
    IF NOT EXISTS (SELECT 1 FROM courses LIMIT 1) THEN
        RAISE EXCEPTION 'Nenhum curso encontrado. Crie cursos primeiro.';
    END IF;
    
    RAISE NOTICE 'Usuários e cursos encontrados. Inserindo dados de teste...';
END $$;

-- Inserir dados de teste de pagamentos
INSERT INTO payments (id, user_id, course_id, amount, currency, status, gateway, payment_method, created_at, metadata)
SELECT 
    gen_random_uuid() as id,
    p.id as user_id,
    c.id as course_id,
    c.price as amount,
    'BRL' as currency,
    CASE 
        WHEN random() < 0.7 THEN 'succeeded'
        WHEN random() < 0.9 THEN 'pending'
        ELSE 'failed'
    END as status,
    CASE 
        WHEN random() < 0.6 THEN 'stripe'
        ELSE 'mercadopago'
    END as gateway,
    CASE 
        WHEN random() < 0.5 THEN 'card'
        WHEN random() < 0.8 THEN 'pix'
        ELSE 'boleto'
    END as payment_method,
    NOW() - (random() * interval '30 days') as created_at,
    jsonb_build_object(
        'test_data', true,
        'payment_method', CASE 
            WHEN random() < 0.5 THEN 'card'
            WHEN random() < 0.8 THEN 'pix'
            ELSE 'boleto'
        END,
        'installments', CASE 
            WHEN random() < 0.3 THEN 1
            WHEN random() < 0.6 THEN 3
            ELSE 6
        END,
        'created_at', NOW() - (random() * interval '30 days')
    ) as metadata
FROM 
    profiles p
    CROSS JOIN courses c
WHERE 
    p.role = 'student'  -- Apenas usuários estudantes
    AND c.price > 0     -- Apenas cursos com preço
LIMIT 20;  -- Inserir 20 pagamentos de teste

-- Verificar os dados inseridos
SELECT 
    'Dados de teste inseridos com sucesso!' as message,
    COUNT(*) as total_payments,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN gateway = 'stripe' THEN 1 END) as stripe_payments,
    COUNT(CASE WHEN gateway = 'mercadopago' THEN 1 END) as mercadopago_payments,
    SUM(amount) as total_amount
FROM payments 
WHERE metadata->>'test_data' = 'true';

-- Mostrar alguns exemplos dos pagamentos inseridos
SELECT 
    p.id,
    u.name as user_name,
    c.title as course_title,
    p.amount,
    p.status,
    p.gateway,
    p.payment_method,
    p.created_at
FROM payments p
JOIN profiles u ON p.user_id = u.id
JOIN courses c ON p.course_id = c.id
WHERE p.metadata->>'test_data' = 'true'
ORDER BY p.created_at DESC
LIMIT 5; 