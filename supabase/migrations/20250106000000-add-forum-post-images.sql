-- Adicionar campos de imagem aos posts do fórum
-- Migration: 20250106000000-add-forum-post-images.sql

-- Adicionar colunas para imagens nos posts
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS content_image_url TEXT;

-- Comentários para documentar os campos
COMMENT ON COLUMN forum_posts.cover_image_url IS 'URL da imagem de capa do post';
COMMENT ON COLUMN forum_posts.content_image_url IS 'URL da imagem de conteúdo do post'; 