-- Migration para resolver conflitos entre migrations existentes
-- Esta migration garante que todas as estruturas sejam criadas corretamente
-- Compatível com o sistema Docker que executa migrations automaticamente
-- NÃO DROPA DADOS EXISTENTES

-- 1. Limpar estruturas que podem estar causando conflitos (de forma segura)
-- NÃO vamos dropar a tabela class_courses se ela já existir com dados
DROP VIEW IF EXISTS class_courses_with_details CASCADE;
DROP FUNCTION IF EXISTS get_class_course_stats(UUID) CASCADE;

-- 2. Garantir que a tabela class_instances existe e tem a estrutura correta
DO $$
BEGIN
    -- Verificar se a tabela classes ainda existe (não foi renomeada)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'classes') THEN
        ALTER TABLE public.classes RENAME TO class_instances;
    END IF;
    
    -- Adicionar colunas se não existirem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'course_id') THEN
        ALTER TABLE public.class_instances ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'instance_name') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'name') THEN
            ALTER TABLE public.class_instances RENAME COLUMN name TO instance_name;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'instance_description') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'description') THEN
            ALTER TABLE public.class_instances RENAME COLUMN description TO instance_description;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'start_date') THEN
        ALTER TABLE public.class_instances ADD COLUMN start_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'end_date') THEN
        ALTER TABLE public.class_instances ADD COLUMN end_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'schedule') THEN
        ALTER TABLE public.class_instances ADD COLUMN schedule TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instances' AND column_name = 'location') THEN
        ALTER TABLE public.class_instances ADD COLUMN location TEXT;
    END IF;
END $$;

-- 3. Garantir que a tabela class_enrollments foi renomeada corretamente
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'class_enrollments') THEN
        ALTER TABLE public.class_enrollments RENAME TO class_instance_enrollments;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instance_enrollments' AND column_name = 'class_id') THEN
        ALTER TABLE public.class_instance_enrollments RENAME COLUMN class_id TO class_instance_id;
    END IF;
END $$;

-- 4. Garantir que a tabela class_content foi renomeada corretamente
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'class_content') THEN
        ALTER TABLE public.class_content RENAME TO class_instance_content;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instance_content' AND column_name = 'class_id') THEN
        ALTER TABLE public.class_instance_content RENAME COLUMN class_id TO class_instance_id;
    END IF;
END $$;

-- 5. Recriar índices de forma segura
DROP INDEX IF EXISTS idx_class_enrollments_user_id;
DROP INDEX IF EXISTS idx_class_enrollments_class_id;
DROP INDEX IF EXISTS idx_class_courses_class_id;
DROP INDEX IF EXISTS idx_class_courses_course_id;
DROP INDEX IF EXISTS idx_class_content_class_id;
DROP INDEX IF EXISTS idx_classes_instructor_id;
DROP INDEX IF EXISTS idx_classes_is_public;

CREATE INDEX IF NOT EXISTS idx_class_instance_enrollments_user_id ON public.class_instance_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_instance_enrollments_instance_id ON public.class_instance_enrollments(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_class_instance_content_instance_id ON public.class_instance_content(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_instructor_id ON public.class_instances(instructor_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_course_id ON public.class_instances(course_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_is_public ON public.class_instances(is_public);

-- 6. Recriar trigger de forma segura
DROP TRIGGER IF EXISTS update_classes_updated_at ON public.classes;
DROP TRIGGER IF EXISTS update_class_instances_updated_at ON public.class_instances;

CREATE TRIGGER update_class_instances_updated_at BEFORE UPDATE ON public.class_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Recriar a view user_class_access
DROP VIEW IF EXISTS public.user_class_access;

CREATE VIEW public.user_class_access AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    ci.id as class_instance_id,
    COALESCE(ci.instance_name, ci.name) as class_instance_name,
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
    COALESCE(ci.instance_name, ci.name) as class_instance_name,
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
    COALESCE(ci.instance_name, ci.name) as class_instance_name,
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

-- 8. Criar a tabela class_courses apenas se não existir
CREATE TABLE IF NOT EXISTS public.class_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_instance_id UUID NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(class_instance_id, course_id)
);

-- Adicionar colunas se não existirem (para compatibilidade com versões antigas)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_courses' AND column_name = 'is_required') THEN
        ALTER TABLE public.class_courses ADD COLUMN is_required BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_courses' AND column_name = 'order_index') THEN
        ALTER TABLE public.class_courses ADD COLUMN order_index INT DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_class_courses_class_instance_id ON public.class_courses(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_class_courses_course_id ON public.class_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_class_courses_order_index ON public.class_courses(order_index);

-- 9. Recriar a view class_courses_with_details
CREATE OR REPLACE VIEW public.class_courses_with_details AS
SELECT 
    cc.id,
    cc.class_instance_id,
    cc.course_id,
    cc.is_required,
    cc.order_index,
    cc.created_at,
    c.title as course_title,
    c.description as course_description,
    c.thumbnail_url as course_thumbnail,
    c.level,
    c.price,
    p.name as instructor_name,
    p.avatar_url as instructor_avatar,
    COALESCE(ci.instance_name, ci.name) as class_instance_name
FROM public.class_courses cc
JOIN public.courses c ON cc.course_id = c.id
JOIN public.profiles p ON c.instructor_id = p.id
JOIN public.class_instances ci ON cc.class_instance_id = ci.id
ORDER BY cc.order_index ASC, cc.created_at ASC;

-- 10. Recriar a função get_class_course_stats
CREATE OR REPLACE FUNCTION get_class_course_stats(class_instance_uuid UUID)
RETURNS TABLE(
    total_courses BIGINT,
    required_courses BIGINT,
    optional_courses BIGINT,
    total_students BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(cc.id) as total_courses,
        COUNT(cc.id) FILTER (WHERE cc.is_required = true) as required_courses,
        COUNT(cc.id) FILTER (WHERE cc.is_required = false) as optional_courses,
        COUNT(DISTINCT cie.user_id) as total_students
    FROM public.class_instances ci
    LEFT JOIN public.class_courses cc ON ci.id = cc.class_instance_id
    LEFT JOIN public.class_instance_enrollments cie ON ci.id = cie.class_instance_id
    WHERE ci.id = class_instance_uuid
    GROUP BY ci.id;
END;
$$ LANGUAGE plpgsql;

-- 11. Garantir que as colunas de arquivo existem na tabela class_instance_content
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instance_content' AND column_name = 'file_url') THEN
        ALTER TABLE public.class_instance_content ADD COLUMN file_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instance_content' AND column_name = 'file_name') THEN
        ALTER TABLE public.class_instance_content ADD COLUMN file_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instance_content' AND column_name = 'file_size') THEN
        ALTER TABLE public.class_instance_content ADD COLUMN file_size BIGINT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'class_instance_content' AND column_name = 'file_type') THEN
        ALTER TABLE public.class_instance_content ADD COLUMN file_type TEXT;
    END IF;
END $$;

-- 12. Garantir que a coluna demo_video existe na tabela courses
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'demo_video') THEN
        ALTER TABLE public.courses ADD COLUMN demo_video TEXT;
    END IF;
END $$;

-- 13. Garantir que a tabela lesson_completions existe
CREATE TABLE IF NOT EXISTS public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user_id ON public.lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson_id ON public.lesson_completions(lesson_id);

-- Adicionar comentários
COMMENT ON TABLE public.class_instances IS 'Instâncias de turmas baseadas em cursos específicos.';
COMMENT ON TABLE public.class_instance_enrollments IS 'Matrículas em instâncias específicas de turmas.';
COMMENT ON TABLE public.class_instance_content IS 'Conteúdo específico criado dentro de instâncias de turmas.';
COMMENT ON TABLE public.class_courses IS 'Relação entre instâncias de turmas e cursos.';
COMMENT ON VIEW public.user_class_access IS 'View para consultar acesso de usuários às instâncias de turmas.';
COMMENT ON VIEW public.class_courses_with_details IS 'View com detalhes dos cursos associados às turmas.'; 