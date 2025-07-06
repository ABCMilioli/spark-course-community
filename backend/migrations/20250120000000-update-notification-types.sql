-- Migration: Atualizar tipos de notificação
-- Adiciona todos os tipos de notificação necessários

-- Atualizar constraint de tipos de notificação
DO $$
BEGIN
    -- Verificar se a tabela notifications existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        -- Verificar se a coluna type existe na tabela notifications
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type' AND table_schema = 'public') THEN
            -- Remover constraint de tipo se existir
            IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name LIKE '%notifications_type_check%') THEN
                ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
                RAISE NOTICE 'Constraint notifications_type_check removida';
            END IF;
            
            -- Adicionar nova constraint com todos os tipos
            ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
            CHECK (type IN (
                'comment', 
                'reply', 
                'like', 
                'system', 
                'forum_new_post', 
                'forum_reply', 
                'new_message',
                'community_new_post',
                'community_like',
                'community_comment',
                'community_comment_like',
                'forum_like',
                'forum_reply_like',
                'lesson_comment',
                'lesson_comment_like'
            ));
            
            RAISE NOTICE 'Constraint de tipos de notificação atualizada com sucesso';
        ELSE
            RAISE NOTICE 'Coluna type não encontrada na tabela notifications';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela notifications não encontrada';
    END IF;
END $$; 