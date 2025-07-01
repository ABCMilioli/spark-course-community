-- Corrigir tipos de notificação permitidos
-- Adicionar novos tipos para o sistema de fórum e outros tipos de notificação

-- 1. Remover o constraint antigo
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Adicionar novo constraint com todos os tipos de notificação suportados
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'comment',        -- Comentário em aula
        'reply',          -- Resposta a comentário
        'like',           -- Curtida em post/comentário
        'system',         -- Notificação do sistema
        'forum_new_post', -- Novo post no fórum
        'forum_reply'     -- Resposta no fórum
    ));

-- 3. Comentário explicativo
COMMENT ON COLUMN public.notifications.type IS 'Tipo da notificação: comment, reply, like, system, forum_new_post, forum_reply'; 