-- Sistema de Turmas (Classes)
-- Permite criar turmas com controle granular de acesso

-- 1. Tabela de Turmas
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false, -- Se true, qualquer usuário pode ver o conteúdo
    is_active BOOLEAN DEFAULT true,
    max_students INT, -- NULL = sem limite
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.classes IS 'Turmas criadas por instrutores com controle de acesso.';

-- 2. Matrículas em Turmas
CREATE TABLE public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'assistant', 'instructor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    UNIQUE(class_id, user_id)
);
COMMENT ON TABLE public.class_enrollments IS 'Controle de matrículas em turmas específicas.';

-- 3. Associação de Cursos com Turmas
CREATE TABLE public.class_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false, -- Se é obrigatório para a turma
    order_index INT DEFAULT 0, -- Ordem de apresentação na turma
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(class_id, course_id)
);
COMMENT ON TABLE public.class_courses IS 'Associação de cursos específicos com turmas.';

-- 4. Conteúdo Específico de Turmas (posts, anúncios, etc.)
CREATE TABLE public.class_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    content_type TEXT NOT NULL DEFAULT 'announcement' CHECK (content_type IN ('announcement', 'material', 'assignment')),
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.class_content IS 'Conteúdo específico criado dentro de turmas.';

-- 5. Índices para performance
CREATE INDEX idx_class_enrollments_user_id ON public.class_enrollments(user_id);
CREATE INDEX idx_class_enrollments_class_id ON public.class_enrollments(class_id);
CREATE INDEX idx_class_courses_class_id ON public.class_courses(class_id);
CREATE INDEX idx_class_courses_course_id ON public.class_courses(course_id);
CREATE INDEX idx_class_content_class_id ON public.class_content(class_id);
CREATE INDEX idx_classes_instructor_id ON public.classes(instructor_id);
CREATE INDEX idx_classes_is_public ON public.classes(is_public);

-- 6. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Triggers para updated_at
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_content_updated_at BEFORE UPDATE ON public.class_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. View para facilitar consultas de acesso
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