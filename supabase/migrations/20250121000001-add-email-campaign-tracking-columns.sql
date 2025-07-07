-- Adicionar colunas de rastreamento que estão faltando na tabela email_campaigns
-- Migration: 20250121000001-add-email-campaign-tracking-columns.sql

-- Adicionar colunas de rastreamento
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS delivered_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounced_count INT DEFAULT 0;

-- Adicionar comentários
COMMENT ON COLUMN public.email_campaigns.delivered_count IS 'Número de emails entregues com sucesso';
COMMENT ON COLUMN public.email_campaigns.bounced_count IS 'Número de emails que retornaram (bounce)';

-- Verificar se as colunas foram adicionadas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_campaigns' 
        AND column_name = 'delivered_count'
    ) THEN
        RAISE EXCEPTION 'Coluna delivered_count não foi adicionada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_campaigns' 
        AND column_name = 'bounced_count'
    ) THEN
        RAISE EXCEPTION 'Coluna bounced_count não foi adicionada';
    END IF;
    
    RAISE NOTICE 'Colunas de rastreamento adicionadas com sucesso!';
END $$; 