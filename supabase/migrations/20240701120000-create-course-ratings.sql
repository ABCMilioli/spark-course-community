-- Sistema de Avaliações de Cursos
CREATE TABLE IF NOT EXISTS public.course_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(course_id, user_id)
);
COMMENT ON TABLE public.course_ratings IS 'Avaliações de usuários em cursos específicos.';

CREATE INDEX IF NOT EXISTS idx_course_ratings_course_id ON public.course_ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_user_id ON public.course_ratings(user_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_course_ratings_updated_at ON public.course_ratings;
CREATE TRIGGER update_course_ratings_updated_at BEFORE UPDATE ON public.course_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 