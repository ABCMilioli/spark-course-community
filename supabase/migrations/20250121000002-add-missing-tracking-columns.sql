-- Adicionar colunas de rastreamento que estão faltando na tabela email_campaigns existente
-- Migration: 20250121000002-add-missing-tracking-columns.sql

-- Adicionar colunas de rastreamento se não existirem
DO $$
BEGIN
    -- Adicionar delivered_count se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_campaigns' 
        AND column_name = 'delivered_count'
    ) THEN
        ALTER TABLE public.email_campaigns ADD COLUMN delivered_count INT DEFAULT 0;
        RAISE NOTICE 'Coluna delivered_count adicionada';
    ELSE
        RAISE NOTICE 'Coluna delivered_count já existe';
    END IF;
    
    -- Adicionar bounced_count se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_campaigns' 
        AND column_name = 'bounced_count'
    ) THEN
        ALTER TABLE public.email_campaigns ADD COLUMN bounced_count INT DEFAULT 0;
        RAISE NOTICE 'Coluna bounced_count adicionada';
    ELSE
        RAISE NOTICE 'Coluna bounced_count já existe';
    END IF;
END $$;

-- Adicionar comentários se não existirem
DO $$
BEGIN
    -- Adicionar comentário para delivered_count se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_description 
        WHERE objoid = 'public.email_campaigns'::regclass 
        AND objsubid = (
            SELECT attnum FROM pg_attribute 
            WHERE attrelid = 'public.email_campaigns'::regclass 
            AND attname = 'delivered_count'
        )
    ) THEN
        COMMENT ON COLUMN public.email_campaigns.delivered_count IS 'Número de emails entregues com sucesso';
        RAISE NOTICE 'Comentário para delivered_count adicionado';
    END IF;
    
    -- Adicionar comentário para bounced_count se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_description 
        WHERE objoid = 'public.email_campaigns'::regclass 
        AND objsubid = (
            SELECT attnum FROM pg_attribute 
            WHERE attrelid = 'public.email_campaigns'::regclass 
            AND attname = 'bounced_count'
        )
    ) THEN
        COMMENT ON COLUMN public.email_campaigns.bounced_count IS 'Número de emails que retornaram (bounce)';
        RAISE NOTICE 'Comentário para bounced_count adicionado';
    END IF;
END $$; 