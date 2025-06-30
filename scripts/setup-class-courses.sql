-- Script para recriar a tabela class_courses no PostgreSQL
-- Execute este script diretamente no seu banco de dados PostgreSQL

-- Recriar Sistema de Múltiplos Cursos por Turma
-- Permite que uma turma tenha múltiplos cursos associados

-- 1. Recriar tabela class_courses
CREATE TABLE IF NOT EXISTS public.class_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_instance_id UUID NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false, -- Se é obrigatório para a turma
    order_index INT DEFAULT 0, -- Ordem de apresentação na turma
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(class_instance_id, course_id)
);
COMMENT ON TABLE public.class_courses IS 'Associação de múltiplos cursos com turmas específicas.';

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_class_courses_class_instance_id ON public.class_courses(class_instance_id);
CREATE INDEX IF NOT EXISTS idx_class_courses_course_id ON public.class_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_class_courses_order_index ON public.class_courses(order_index);

-- 3. View para facilitar consultas de cursos das turmas
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
    c.thumbnail as course_thumbnail,
    c.category,
    c.level,
    c.price,
    p.name as instructor_name,
    p.avatar_url as instructor_avatar,
    ci.instance_name as class_instance_name
FROM public.class_courses cc
JOIN public.courses c ON cc.course_id = c.id
JOIN public.profiles p ON c.instructor_id = p.id
JOIN public.class_instances ci ON cc.class_instance_id = ci.id
ORDER BY cc.order_index ASC, cc.created_at ASC;

COMMENT ON VIEW public.class_courses_with_details IS 'View para consultar cursos das turmas com detalhes completos.';

-- 4. Função para obter estatísticas de cursos por turma
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

COMMENT ON FUNCTION get_class_course_stats(UUID) IS 'Função para obter estatísticas de cursos de uma turma específica.';

-- 5. Verificar se a tabela foi criada corretamente
SELECT 
    'Tabela class_courses criada com sucesso!' as status,
    COUNT(*) as total_records
FROM public.class_courses;

-- 6. Verificar se a view foi criada corretamente
SELECT 
    'View class_courses_with_details criada com sucesso!' as status,
    COUNT(*) as total_records
FROM public.class_courses_with_details; 