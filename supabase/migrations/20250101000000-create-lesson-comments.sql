-- Sistema de Comentários em Aulas
-- Permite que usuários comentem em aulas específicas

-- 1. Tabela para comentários em aulas
CREATE TABLE public.lesson_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.lesson_comments(id) ON DELETE CASCADE, -- Para respostas
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.lesson_comments IS 'Comentários de usuários em aulas específicas.';

-- 2. Tabela para curtidas em comentários
CREATE TABLE public.lesson_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(comment_id, user_id)
);
COMMENT ON TABLE public.lesson_comment_likes IS 'Curtidas de usuários em comentários de aulas.';

-- 3. Tabela para notificações
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'comment' CHECK (type IN ('comment', 'reply', 'like', 'system')),
    reference_id UUID, -- ID do comentário, aula, etc.
    reference_type TEXT, -- 'lesson_comment', 'lesson', etc.
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.notifications IS 'Notificações para usuários sobre atividades relevantes.';

-- 4. Índices para performance
CREATE INDEX idx_lesson_comments_lesson_id ON public.lesson_comments(lesson_id);
CREATE INDEX idx_lesson_comments_user_id ON public.lesson_comments(user_id);
CREATE INDEX idx_lesson_comments_parent_id ON public.lesson_comments(parent_id);
CREATE INDEX idx_lesson_comments_created_at ON public.lesson_comments(created_at);

CREATE INDEX idx_lesson_comment_likes_comment_id ON public.lesson_comment_likes(comment_id);
CREATE INDEX idx_lesson_comment_likes_user_id ON public.lesson_comment_likes(user_id);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- 5. Trigger para atualizar updated_at
CREATE TRIGGER update_lesson_comments_updated_at BEFORE UPDATE ON public.lesson_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. View para facilitar consultas de comentários com informações do usuário
CREATE VIEW public.lesson_comments_with_user AS
SELECT 
    lc.id,
    lc.lesson_id,
    lc.user_id,
    lc.content,
    lc.parent_id,
    lc.created_at,
    lc.updated_at,
    p.name as user_name,
    p.avatar_url as user_avatar,
    p.role as user_role,
    (SELECT COUNT(*) FROM public.lesson_comment_likes WHERE comment_id = lc.id) as likes_count,
    (SELECT COUNT(*) FROM public.lesson_comments WHERE parent_id = lc.id) as replies_count
FROM public.lesson_comments lc
JOIN public.profiles p ON lc.user_id = p.id
ORDER BY lc.created_at DESC;

COMMENT ON VIEW public.lesson_comments_with_user IS 'View para consultar comentários com informações do usuário e contadores.'; 