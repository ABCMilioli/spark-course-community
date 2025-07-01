-- Adicionar campos de imagem aos tópicos do fórum
-- Migration: 20250106000001-add-forum-topic-images.sql

-- Adicionar colunas para imagens nos tópicos
ALTER TABLE forum_topics 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Comentários para documentar os campos
COMMENT ON COLUMN forum_topics.cover_image_url IS 'URL da imagem de capa do tópico';
COMMENT ON COLUMN forum_topics.banner_image_url IS 'URL da imagem de banner/cabeçalho do tópico'; 