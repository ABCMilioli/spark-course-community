-- Migration para criar sistema de webhooks
-- Data: 2025-01-10
-- Descrição: Sistema para enviar eventos do sistema para webhooks externos

-- Tabela de webhooks cadastrados
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    secret_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de logs de tentativas de envio
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    is_success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS trigger_update_webhook_updated_at ON webhooks;
CREATE TRIGGER trigger_update_webhook_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();

-- Comentários para documentação
COMMENT ON TABLE webhooks IS 'Tabela para armazenar webhooks cadastrados';
COMMENT ON TABLE webhook_logs IS 'Tabela para armazenar logs de tentativas de envio de webhooks';
COMMENT ON COLUMN webhooks.events IS 'Array com os tipos de eventos que este webhook deve receber';
COMMENT ON COLUMN webhooks.secret_key IS 'Chave secreta para assinar as requisições (opcional)';
COMMENT ON COLUMN webhook_logs.payload IS 'Payload JSON enviado para o webhook';
COMMENT ON COLUMN webhook_logs.response_status IS 'Status HTTP da resposta do webhook';
COMMENT ON COLUMN webhook_logs.response_body IS 'Corpo da resposta do webhook';
COMMENT ON COLUMN webhook_logs.error_message IS 'Mensagem de erro em caso de falha';
COMMENT ON COLUMN webhook_logs.attempt_count IS 'Número de tentativas de envio';
COMMENT ON COLUMN webhook_logs.is_success IS 'Indica se o envio foi bem-sucedido'; 