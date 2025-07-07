-- Migration: 20250707193000-add-payment-gateway-to-courses.sql
-- Adiciona campos para gateway de pagamento e URL de checkout externo em cursos

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS external_checkout_url TEXT;

COMMENT ON COLUMN public.courses.payment_gateway IS 'Gateway de pagamento do curso (mercadopago, hotmart, kiwify, etc)';
COMMENT ON COLUMN public.courses.external_checkout_url IS 'URL do checkout externo (Hotmart, Kiwify, etc)'; 