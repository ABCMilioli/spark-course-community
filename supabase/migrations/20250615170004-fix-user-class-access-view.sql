-- Corrigir a view user_class_access para incluir o instructor que criou a turma
DROP VIEW IF EXISTS public.user_class_access;

CREATE VIEW public.user_class_access AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    c.id as class_id,
    c.name as class_name,
    c.is_public,
    ce.role as user_role,
    ce.status as enrollment_status,
    p.name as instructor_name
FROM public.profiles u
JOIN public.class_enrollments ce ON u.id = ce.user_id
JOIN public.classes c ON ce.class_id = c.id
JOIN public.profiles p ON c.instructor_id = p.id
WHERE ce.status = 'active' AND c.is_active = true

UNION

-- Incluir o instructor que criou a turma
SELECT 
    p.id as user_id,
    p.name as user_name,
    p.email as user_email,
    c.id as class_id,
    c.name as class_name,
    c.is_public,
    'instructor' as user_role,
    'active' as enrollment_status,
    p.name as instructor_name
FROM public.classes c
JOIN public.profiles p ON c.instructor_id = p.id
WHERE c.is_active = true

UNION

-- Incluir turmas públicas para todos os usuários
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    c.id as class_id,
    c.name as class_name,
    c.is_public,
    'viewer' as user_role,
    'active' as enrollment_status,
    p.name as instructor_name
FROM public.profiles u
CROSS JOIN public.classes c
JOIN public.profiles p ON c.instructor_id = p.id
WHERE c.is_public = true AND c.is_active = true;

COMMENT ON VIEW public.user_class_access IS 'View para consultar acesso de usuários às turmas.'; 