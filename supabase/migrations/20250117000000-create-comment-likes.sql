-- Migration: Criar tabela de likes para comentários da comunidade
-- Data: 2025-01-17

-- Criar tabela de likes para comentários da comunidade
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que um usuário só pode curtir um comentário uma vez
    UNIQUE(comment_id, user_id)
);

-- Comentários
COMMENT ON TABLE public.comment_likes IS 'Curtidas de usuários em comentários da comunidade.';
COMMENT ON COLUMN public.comment_likes.id IS 'ID único da curtida.';
COMMENT ON COLUMN public.comment_likes.comment_id IS 'ID do comentário curtido.';
COMMENT ON COLUMN public.comment_likes.user_id IS 'ID do usuário que curtiu.';
COMMENT ON COLUMN public.comment_likes.created_at IS 'Data e hora da curtida.';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON public.comment_likes(created_at);

-- Atualizar a view de comentários para incluir contagem de likes
CREATE OR REPLACE VIEW public.comments_with_likes AS
SELECT 
    c.*,
    p.name as user_name,
    p.avatar_url as user_avatar,
    (SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = c.id) as likes_count,
    EXISTS(
        SELECT 1 FROM public.comment_likes 
        WHERE comment_id = c.id AND user_id = auth.uid()
    ) as is_liked_by_user
FROM public.comments c
JOIN public.profiles p ON c.user_id = p.id;

-- Comentário na view
COMMENT ON VIEW public.comments_with_likes IS 'View que retorna comentários da comunidade com contagem de likes e status de curtida do usuário atual.'; 