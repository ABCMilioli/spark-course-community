-- Sistema de Pagamento - Tabelas para transações e pagamentos

-- Tabela para armazenar transações de pagamento
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, canceled
    payment_method TEXT, -- card, pix, boleto
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB -- Para armazenar dados adicionais do Stripe
);
COMMENT ON TABLE public.payments IS 'Armazena transações de pagamento dos cursos';

-- Índices para melhor performance
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_course_id ON public.payments(course_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);

-- Tabela para armazenar webhooks do Stripe
CREATE TABLE public.stripe_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payment_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, failed
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.stripe_webhooks IS 'Armazena webhooks recebidos do Stripe';

-- Índices para webhooks
CREATE INDEX idx_stripe_webhooks_event_type ON public.stripe_webhooks(event_type);
CREATE INDEX idx_stripe_webhooks_payment_intent_id ON public.stripe_webhooks(payment_intent_id);
CREATE INDEX idx_stripe_webhooks_status ON public.stripe_webhooks(status);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON public.payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- View para facilitar consultas de pagamentos com informações do curso e usuário
CREATE VIEW public.payment_details AS
SELECT 
    p.id,
    p.stripe_payment_intent_id,
    p.amount,
    p.currency,
    p.status,
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

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhooks ENABLE ROW LEVEL SECURITY;

-- Políticas para payments
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para stripe_webhooks (apenas admins)
CREATE POLICY "Only admins can view webhooks" ON public.stripe_webhooks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    ); 