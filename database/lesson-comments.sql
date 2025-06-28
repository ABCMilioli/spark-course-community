-- Sistema de Comentários em Aulas
-- Permite que usuários comentem em aulas específicas

-- 1. Tabela para comentários em aulas
CREATE TABLE IF NOT EXISTS lesson_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES lesson_comments(id) ON DELETE CASCADE, -- Para respostas
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE lesson_comments IS 'Comentários de usuários em aulas específicas.';

-- 2. Tabela para curtidas em comentários
CREATE TABLE IF NOT EXISTS lesson_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES lesson_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(comment_id, user_id)
);
COMMENT ON TABLE lesson_comment_likes IS 'Curtidas de usuários em comentários de aulas.';

-- 3. Tabela para notificações
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'comment' CHECK (type IN ('comment', 'reply', 'like', 'system')),
    reference_id UUID, -- ID do comentário, aula, etc.
    reference_type TEXT, -- 'lesson_comment', 'lesson', etc.
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE notifications IS 'Notificações para usuários sobre atividades relevantes.';

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson_id ON lesson_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_user_id ON lesson_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_parent_id ON lesson_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_created_at ON lesson_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_lesson_comment_likes_comment_id ON lesson_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comment_likes_user_id ON lesson_comment_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 5. Função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_lesson_comments_updated_at ON lesson_comments;
CREATE TRIGGER update_lesson_comments_updated_at BEFORE UPDATE ON lesson_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. View para facilitar consultas de comentários com informações do usuário
CREATE OR REPLACE VIEW lesson_comments_with_user AS
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
    (SELECT COUNT(*) FROM lesson_comment_likes WHERE comment_id = lc.id) as likes_count,
    (SELECT COUNT(*) FROM lesson_comments WHERE parent_id = lc.id) as replies_count
FROM lesson_comments lc
JOIN profiles p ON lc.user_id = p.id
ORDER BY lc.created_at DESC;

COMMENT ON VIEW lesson_comments_with_user IS 'View para consultar comentários com informações do usuário e contadores.'; 