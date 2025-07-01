-- Script para aplicar migration dos posts do fórum
-- Remove campo cover_image_url se existir e garante que content_image_url existe

-- Primeiro, vamos verificar se a coluna content_image_url existe
DO $$ 
BEGIN
    -- Adicionar content_image_url se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forum_posts' AND column_name = 'content_image_url'
    ) THEN
        ALTER TABLE forum_posts ADD COLUMN content_image_url TEXT;
        RAISE NOTICE 'Coluna content_image_url adicionada à tabela forum_posts';
    ELSE
        RAISE NOTICE 'Coluna content_image_url já existe na tabela forum_posts';
    END IF;

    -- Remover cover_image_url se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forum_posts' AND column_name = 'cover_image_url'
    ) THEN
        -- Primeiro, copiar dados de cover_image_url para content_image_url se necessário
        UPDATE forum_posts 
        SET content_image_url = cover_image_url 
        WHERE cover_image_url IS NOT NULL AND content_image_url IS NULL;
        
        -- Depois remover a coluna
        ALTER TABLE forum_posts DROP COLUMN cover_image_url;
        RAISE NOTICE 'Coluna cover_image_url removida da tabela forum_posts';
    ELSE
        RAISE NOTICE 'Coluna cover_image_url não existe na tabela forum_posts';
    END IF;
END $$; 