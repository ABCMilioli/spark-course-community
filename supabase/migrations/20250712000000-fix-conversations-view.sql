-- =====================================================
-- FIX: Adicionar view conversations_with_last_message
-- Esta view é necessária para a rota /api/conversations
-- =====================================================

-- Criar ou recriar a view conversations_with_last_message
CREATE OR REPLACE VIEW conversations_with_last_message AS
SELECT 
    c.id,
    c.title,
    c.type,
    c.created_at,
    c.updated_at,
    lm.content AS last_message_content,
    lm.created_at AS last_message_at,
    lm.sender_name AS last_message_sender,
    array_agg(
        json_build_object(
            'user_id', cp.user_id, 
            'name', p.name, 
            'avatar_url', p.avatar_url, 
            'last_read_at', cp.last_read_at, 
            'is_admin', cp.is_admin
        )
    ) AS participants
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN profiles p ON cp.user_id = p.id
LEFT JOIN (
    SELECT DISTINCT ON (m.conversation_id) 
        m.conversation_id,
        m.content,
        m.created_at,
        sender.name AS sender_name
    FROM messages m
    JOIN profiles sender ON m.sender_id = sender.id
    ORDER BY m.conversation_id, m.created_at DESC
) lm ON c.id = lm.conversation_id
GROUP BY c.id, c.title, c.type, c.created_at, c.updated_at, lm.content, lm.created_at, lm.sender_name;

-- Verificar se a view foi criada com sucesso
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'conversations_with_last_message') THEN
        RAISE NOTICE 'View conversations_with_last_message criada com sucesso!';
    ELSE
        RAISE EXCEPTION 'Falha ao criar view conversations_with_last_message';
    END IF;
END $$; 