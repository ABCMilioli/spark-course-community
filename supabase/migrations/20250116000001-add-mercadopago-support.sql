-- Adicionar suporte ao Mercado Pago mantendo Stripe

-- Adicionar coluna para identificar o gateway de pagamento
ALTER TABLE public.payments 
ADD COLUMN gateway TEXT NOT NULL DEFAULT 'stripe' CHECK (gateway IN ('stripe', 'mercadopago'));

-- Adicionar coluna para external reference (usado pelo Mercado Pago)
ALTER TABLE public.payments 
ADD COLUMN external_reference TEXT;

-- Adicionar coluna para payment method details
ALTER TABLE public.payments 
ADD COLUMN payment_method_details JSONB;

-- Criar índice para external reference
CREATE INDEX idx_payments_external_reference ON public.payments(external_reference);

-- Criar índice para gateway
CREATE INDEX idx_payments_gateway ON public.payments(gateway);

-- Atualizar view para incluir informações do gateway
DROP VIEW IF EXISTS public.payment_details;
CREATE VIEW public.payment_details AS
SELECT 
    p.id,
    p.gateway,
    p.stripe_payment_intent_id,
    p.external_reference,
    p.amount,
    p.currency,
    p.status,
    p.payment_method,
    p.payment_method_details,
    p.created_at,
    p.updated_at,
    u.name as user_name,
    u.email as user_email,
    c.title as course_title,
    c.price as course_price
FROM public.payments p
JOIN public.profiles u ON p.user_id = u.id
JOIN public.courses c ON p.course_id = c.id;

-- Tabela para webhooks do Mercado Pago
CREATE TABLE public.mercadopago_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mp_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payment_id TEXT,
    external_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, failed
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para webhooks do Mercado Pago
CREATE INDEX idx_mercadopago_webhooks_event_type ON public.mercadopago_webhooks(event_type);
CREATE INDEX idx_mercadopago_webhooks_payment_id ON public.mercadopago_webhooks(payment_id);
CREATE INDEX idx_mercadopago_webhooks_external_reference ON public.mercadopago_webhooks(external_reference);
CREATE INDEX idx_mercadopago_webhooks_status ON public.mercadopago_webhooks(status);

-- Políticas de segurança para webhooks do Mercado Pago
ALTER TABLE public.mercadopago_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view MercadoPago webhooks" ON public.mercadopago_webhooks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Função para obter estatísticas de pagamentos por gateway
CREATE OR REPLACE FUNCTION get_payment_stats()
RETURNS TABLE (
    gateway TEXT,
    total_payments BIGINT,
    total_amount NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.gateway,
        COUNT(*) as total_payments,
        SUM(p.amount) as total_amount,
        ROUND(
            (COUNT(*) FILTER (WHERE p.status = 'succeeded')::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
        ) as success_rate
    FROM public.payments p
    GROUP BY p.gateway
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON COLUMN public.payments.gateway IS 'Gateway de pagamento usado (stripe ou mercadopago)';
COMMENT ON COLUMN public.payments.external_reference IS 'Referência externa do pagamento (usado pelo Mercado Pago)';
COMMENT ON COLUMN public.payments.payment_method_details IS 'Detalhes específicos do método de pagamento';
COMMENT ON TABLE public.mercadopago_webhooks IS 'Armazena webhooks recebidos do Mercado Pago';
COMMENT ON FUNCTION get_payment_stats() IS 'Retorna estatísticas de pagamentos por gateway'; 