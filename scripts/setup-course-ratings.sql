-- Sistema de Avaliações de Cursos
-- Permite que usuários avaliem cursos com estrelas e comentários

-- 1. Tabela para avaliações de cursos
CREATE TABLE IF NOT EXISTS course_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT, -- Comentário opcional sobre o curso
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(course_id, user_id)
);
COMMENT ON TABLE course_ratings IS 'Avaliações de usuários em cursos específicos.';

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_course_ratings_course_id ON course_ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_user_id ON course_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_rating ON course_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_course_ratings_created_at ON course_ratings(created_at);

-- 3. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_course_ratings_updated_at ON course_ratings;
CREATE TRIGGER update_course_ratings_updated_at BEFORE UPDATE ON course_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. View para facilitar consultas de avaliações com informações do usuário
CREATE OR REPLACE VIEW course_ratings_with_user AS
SELECT 
    cr.id,
    cr.course_id,
    cr.user_id,
    cr.rating,
    cr.review,
    cr.created_at,
    cr.updated_at,
    p.name as user_name,
    p.avatar_url as user_avatar,
    p.role as user_role
FROM course_ratings cr
JOIN profiles p ON cr.user_id = p.id
ORDER BY cr.created_at DESC;

COMMENT ON VIEW course_ratings_with_user IS 'View para consultar avaliações com informações do usuário.';

-- 5. View para estatísticas de avaliações por curso
CREATE OR REPLACE VIEW course_rating_stats AS
SELECT 
    course_id,
    COUNT(*) as total_ratings,
    AVG(rating) as average_rating,
    COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
    COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
    COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
    COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
    COUNT(*) FILTER (WHERE rating = 1) as one_star_count,
    ROUND(
        (COUNT(*) FILTER (WHERE rating >= 4)::DECIMAL / COUNT(*)::DECIMAL) * 100, 1
    ) as satisfaction_percentage
FROM course_ratings
GROUP BY course_id;

COMMENT ON VIEW course_rating_stats IS 'Estatísticas de avaliações por curso.';

-- 6. Função para atualizar estatísticas do curso automaticamente
CREATE OR REPLACE FUNCTION update_course_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar a tabela courses com as estatísticas de avaliação
    UPDATE courses 
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0) 
            FROM course_ratings 
            WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
        ),
        students_count = (
            SELECT COUNT(DISTINCT user_id) 
            FROM course_ratings 
            WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
        )
    WHERE id = COALESCE(NEW.course_id, OLD.course_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. Triggers para manter estatísticas atualizadas
DROP TRIGGER IF EXISTS trigger_update_course_rating_stats_insert ON course_ratings;
DROP TRIGGER IF EXISTS trigger_update_course_rating_stats_update ON course_ratings;
DROP TRIGGER IF EXISTS trigger_update_course_rating_stats_delete ON course_ratings;

CREATE TRIGGER trigger_update_course_rating_stats_insert
    AFTER INSERT ON course_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_course_rating_stats();

CREATE TRIGGER trigger_update_course_rating_stats_update
    AFTER UPDATE ON course_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_course_rating_stats();

CREATE TRIGGER trigger_update_course_rating_stats_delete
    AFTER DELETE ON course_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_course_rating_stats(); 