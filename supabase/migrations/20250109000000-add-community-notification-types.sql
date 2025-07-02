-- Adicionar tipos de notificação da comunidade
-- Esta migration adiciona os tipos community_new_post e community_comment ao constraint

-- 1. Remover o constraint atual
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Recriar o constraint com todos os tipos incluindo os da comunidade
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type = ANY (ARRAY[
        'comment'::text,           -- Comentário em aula
        'reply'::text,             -- Resposta a comentário
        'like'::text,              -- Curtida em post/comentário
        'system'::text,            -- Notificação do sistema
        'forum_new_post'::text,    -- Novo post no fórum
        'forum_reply'::text,       -- Resposta no fórum
        'community_new_post'::text, -- Novo post na comunidade
        'community_comment'::text  -- Comentário em post da comunidade
    ]));

-- 3. Atualizar comentário da coluna
COMMENT ON COLUMN public.notifications.type IS 'Tipo da notificação: comment, reply, like, system, forum_new_post, forum_reply, community_new_post, community_comment'; 