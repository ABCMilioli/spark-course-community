-- Sistema de Pagamento - Tabelas para transações e pagamentos
-- Migration: 20250116000000-create-payment-system.sql

-- Tabela para armazenar transações de pagamento
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, canceled
    gateway TEXT NOT NULL DEFAULT 'stripe', -- stripe, mercadopago
    payment_method TEXT, -- card, pix, boleto
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB -- Para armazenar dados adicionais do gateway
);

-- Comentário da tabela
COMMENT ON TABLE public.payments IS 'Armazena transações de pagamento dos cursos';

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON public.payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON public.payments(gateway);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);

-- Tabela para armazenar webhooks do Stripe
CREATE TABLE IF NOT EXISTS public.stripe_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payment_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, failed
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comentário da tabela de webhooks
COMMENT ON TABLE public.stripe_webhooks IS 'Armazena webhooks recebidos do Stripe';

-- Índices para webhooks
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_event_type ON public.stripe_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_payment_intent_id ON public.stripe_webhooks(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_status ON public.stripe_webhooks(status);

-- Função para atualizar o timestamp de updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON public.payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- View para facilitar consultas de pagamentos com informações do curso e usuário
CREATE OR REPLACE VIEW public.payment_details AS
SELECT 
    p.id,
    p.stripe_payment_intent_id,
    p.amount,
    p.currency,
    p.status,
    p.gateway,
    p.payment_method,
    p.created_at,
    p.updated_at,
    u.name as user_name,
    u.email as user_email,
    c.title as course_title,
    c.price as course_price
FROM public.payments p
JOIN public.profiles u ON p.user_id = u.id
JOIN public.courses c ON p.course_id = c.id;

-- Inserir dados de teste (apenas se não existir nenhum pagamento)
DO $$
DECLARE
    payment_count INTEGER;
    admin_user_id UUID;
    test_course_id UUID;
    test_course_price NUMERIC;
BEGIN
    -- Verificar se já existem pagamentos
    SELECT COUNT(*) INTO payment_count FROM public.payments;
    
    IF payment_count = 0 THEN
        -- Buscar usuário admin
        SELECT id INTO admin_user_id 
        FROM public.profiles 
        WHERE role = 'admin' 
        LIMIT 1;
        
        -- Buscar curso com preço > 0
        SELECT id, price INTO test_course_id, test_course_price
        FROM public.courses 
        WHERE price > 0 
        LIMIT 1;
        
        -- Inserir dados de teste se encontrou usuário e curso
        IF admin_user_id IS NOT NULL AND test_course_id IS NOT NULL THEN
            INSERT INTO public.payments (
                id, user_id, course_id, amount, status, gateway, 
                stripe_payment_intent_id, created_at
            ) VALUES 
                (gen_random_uuid(), admin_user_id, test_course_id, test_course_price, 'succeeded', 'stripe', 'pi_test_' || gen_random_uuid()::text, NOW() - INTERVAL '7 days'),
                (gen_random_uuid(), admin_user_id, test_course_id, test_course_price, 'pending', 'stripe', 'pi_test_' || gen_random_uuid()::text, NOW() - INTERVAL '3 days'),
                (gen_random_uuid(), admin_user_id, test_course_id, test_course_price, 'failed', 'stripe', 'pi_test_' || gen_random_uuid()::text, NOW() - INTERVAL '1 day'),
                (gen_random_uuid(), admin_user_id, test_course_id, test_course_price, 'succeeded', 'mercadopago', NULL, NOW() - INTERVAL '5 days');
            
            RAISE NOTICE 'Dados de teste para pagamentos inseridos com sucesso!';
        ELSE
            RAISE NOTICE 'Não foi possível inserir dados de teste - usuário admin ou curso não encontrados';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela payments já contém dados - pulando inserção de dados de teste';
    END IF;
END $$; 