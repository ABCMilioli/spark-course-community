-- Reestruturação do Sistema de Turmas
-- Mudança de: Turma -> Cursos para: Curso -> Turmas

-- 1. Renomear tabela atual de classes para class_instances
ALTER TABLE public.classes RENAME TO class_instances;

-- 2. Adicionar referência ao curso na tabela de instâncias
ALTER TABLE public.class_instances 
ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- 3. Renomear colunas para maior clareza
ALTER TABLE public.class_instances 
RENAME COLUMN name TO instance_name;

ALTER TABLE public.class_instances 
RENAME COLUMN description TO instance_description;

-- 4. Adicionar colunas específicas de instância
ALTER TABLE public.class_instances 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN schedule TEXT, -- "Segundas e Quartas, 19h-21h"
ADD COLUMN location TEXT; -- "Sala 101" ou "Online"

-- 5. Renomear tabela de matrículas
ALTER TABLE public.class_enrollments RENAME TO class_instance_enrollments;

-- 6. Atualizar referências na tabela de matrículas
ALTER TABLE public.class_instance_enrollments 
RENAME COLUMN class_id TO class_instance_id;

-- 7. Remover tabela class_courses (não é mais necessária)
DROP TABLE IF EXISTS public.class_courses;

-- 8. Renomear tabela de conteúdo
ALTER TABLE public.class_content RENAME TO class_instance_content;

-- 9. Atualizar referências na tabela de conteúdo
ALTER TABLE public.class_instance_content 
RENAME COLUMN class_id TO class_instance_id;

-- 10. Atualizar índices
DROP INDEX IF EXISTS idx_class_enrollments_user_id;
DROP INDEX IF EXISTS idx_class_enrollments_class_id;
DROP INDEX IF EXISTS idx_class_courses_class_id;
DROP INDEX IF EXISTS idx_class_courses_course_id;
DROP INDEX IF EXISTS idx_class_content_class_id;
DROP INDEX IF EXISTS idx_classes_instructor_id;
DROP INDEX IF EXISTS idx_classes_is_public;

CREATE INDEX idx_class_instance_enrollments_user_id ON public.class_instance_enrollments(user_id);
CREATE INDEX idx_class_instance_enrollments_instance_id ON public.class_instance_enrollments(class_instance_id);
CREATE INDEX idx_class_instance_content_instance_id ON public.class_instance_content(class_instance_id);
CREATE INDEX idx_class_instances_instructor_id ON public.class_instances(instructor_id);
CREATE INDEX idx_class_instances_course_id ON public.class_instances(course_id);
CREATE INDEX idx_class_instances_is_public ON public.class_instances(is_public);

-- 11. Atualizar triggers
DROP TRIGGER IF EXISTS update_classes_updated_at ON public.classes;
CREATE TRIGGER update_class_instances_updated_at BEFORE UPDATE ON public.class_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Recriar a view user_class_access
DROP VIEW IF EXISTS public.user_class_access;

CREATE VIEW public.user_class_access AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    ci.id as class_instance_id,
    ci.instance_name as class_instance_name,
    c.id as course_id,
    c.title as course_title,
    ci.is_public,
    cie.role as user_role,
    cie.status as enrollment_status,
    p.name as instructor_name
FROM public.profiles u
JOIN public.class_instance_enrollments cie ON u.id = cie.user_id
JOIN public.class_instances ci ON cie.class_instance_id = ci.id
JOIN public.courses c ON ci.course_id = c.id
JOIN public.profiles p ON ci.instructor_id = p.id
WHERE cie.status = 'active' AND ci.is_active = true

UNION

-- Incluir o instructor que criou a instância da turma
SELECT 
    p.id as user_id,
    p.name as user_name,
    p.email as user_email,
    ci.id as class_instance_id,
    ci.instance_name as class_instance_name,
    c.id as course_id,
    c.title as course_title,
    ci.is_public,
    'instructor' as user_role,
    'active' as enrollment_status,
    p.name as instructor_name
FROM public.class_instances ci
JOIN public.courses c ON ci.course_id = c.id
JOIN public.profiles p ON ci.instructor_id = p.id
WHERE ci.is_active = true

UNION

-- Incluir instâncias públicas para todos os usuários
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    ci.id as class_instance_id,
    ci.instance_name as class_instance_name,
    c.id as course_id,
    c.title as course_title,
    ci.is_public,
    'viewer' as user_role,
    'active' as enrollment_status,
    p.name as instructor_name
FROM public.profiles u
CROSS JOIN public.class_instances ci
JOIN public.courses c ON ci.course_id = c.id
JOIN public.profiles p ON ci.instructor_id = p.id
WHERE ci.is_public = true AND ci.is_active = true;

COMMENT ON VIEW public.user_class_access IS 'View para consultar acesso de usuários às instâncias de turmas.';

-- 13. Adicionar comentários nas tabelas
COMMENT ON TABLE public.class_instances IS 'Instâncias de turmas baseadas em cursos específicos.';
COMMENT ON TABLE public.class_instance_enrollments IS 'Matrículas em instâncias específicas de turmas.';
COMMENT ON TABLE public.class_instance_content IS 'Conteúdo específico criado dentro de instâncias de turmas.'; 