-- Script para adicionar colunas de rastreamento que estão faltando
-- Execute este script no banco de dados para corrigir o erro de colunas

-- Adicionar colunas se não existirem
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS delivered_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounced_count INT DEFAULT 0;

-- Adicionar comentários
COMMENT ON COLUMN public.email_campaigns.delivered_count IS 'Número de emails entregues com sucesso';
COMMENT ON COLUMN public.email_campaigns.bounced_count IS 'Número de emails que retornaram (bounce)';

-- Verificar se as colunas foram adicionadas
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_campaigns' 
AND column_name IN ('delivered_count', 'bounced_count')
ORDER BY column_name; 