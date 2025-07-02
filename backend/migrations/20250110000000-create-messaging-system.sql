-- Migration: Sistema de Mensagens
-- Garante que a migration sempre será aplicada corretamente
DROP VIEW IF EXISTS public.conversations_with_last_message CASCADE;
DROP VIEW IF EXISTS public.messages_with_sender CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_direct_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela principal de conversas
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de participantes das conversas
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT false,
    UNIQUE(conversation_id, user_id)
);

-- Tabela de mensagens
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
    attachments JSONB DEFAULT '[]'::jsonb,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente em mensagens
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar conversation.updated_at quando nova mensagem é criada
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET updated_at = now() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_on_message();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read_at ON public.conversation_participants(last_read_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Função para obter ou criar conversa direta entre dois usuários
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_uuid UUID;
BEGIN
    -- Buscar conversa existente entre os dois usuários
    SELECT c.id INTO conversation_uuid
    FROM public.conversations c
    WHERE c.type = 'direct'
      AND EXISTS (
          SELECT 1 FROM public.conversation_participants cp1 
          WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
      )
      AND EXISTS (
          SELECT 1 FROM public.conversation_participants cp2 
          WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
      )
      AND (
          SELECT COUNT(*) FROM public.conversation_participants cp 
          WHERE cp.conversation_id = c.id
      ) = 2;

    -- Se não existe, criar nova conversa
    IF conversation_uuid IS NULL THEN
        INSERT INTO public.conversations (type) 
        VALUES ('direct') 
        RETURNING id INTO conversation_uuid;
        
        -- Adicionar os dois participantes
        INSERT INTO public.conversation_participants (conversation_id, user_id) 
        VALUES 
            (conversation_uuid, user1_id),
            (conversation_uuid, user2_id);
    END IF;

    RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql;

-- View para conversas com última mensagem
CREATE VIEW public.conversations_with_last_message AS
SELECT 
    c.id,
    c.title,
    c.type,
    c.created_at,
    c.updated_at,
    lm.content as last_message_content,
    lm.created_at as last_message_at,
    lm.sender_name as last_message_sender,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'user_id', cp.user_id,
            'name', p.name,
            'avatar_url', p.avatar_url,
            'last_read_at', cp.last_read_at,
            'is_admin', cp.is_admin
        )
    ) as participants
FROM public.conversations c
LEFT JOIN public.conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN public.profiles p ON cp.user_id = p.id
LEFT JOIN (
    SELECT DISTINCT ON (m.conversation_id)
        m.conversation_id,
        m.content,
        m.created_at,
        sender.name as sender_name
    FROM public.messages m
    JOIN public.profiles sender ON m.sender_id = sender.id
    ORDER BY m.conversation_id, m.created_at DESC
) lm ON c.id = lm.conversation_id
GROUP BY c.id, c.title, c.type, c.created_at, c.updated_at, 
         lm.content, lm.created_at, lm.sender_name;

-- View para mensagens com dados do remetente
CREATE VIEW public.messages_with_sender AS
SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.type,
    m.attachments,
    m.reply_to_id,
    m.created_at,
    m.updated_at,
    sender.name as sender_name,
    sender.avatar_url as sender_avatar_url,
    reply_msg.content as reply_to_content,
    reply_sender.name as reply_to_sender_name
FROM public.messages m
JOIN public.profiles sender ON m.sender_id = sender.id
LEFT JOIN public.messages reply_msg ON m.reply_to_id = reply_msg.id
LEFT JOIN public.profiles reply_sender ON reply_msg.sender_id = reply_sender.id;

-- Atualizar tipos de notificação para incluir mensagens
DO $$
BEGIN
    -- Verificar se a coluna type existe na tabela notifications
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        -- Atualizar constraint de tipo se existir
        IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name LIKE '%notifications_type_check%') THEN
            ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
        END IF;
        
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
        CHECK (type IN ('comment', 'reply', 'like', 'system', 'forum_new_post', 'forum_reply', 'new_message'));
    END IF;
END $$; 