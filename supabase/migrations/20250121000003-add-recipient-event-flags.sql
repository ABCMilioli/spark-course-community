-- Migration: 20250121000003-add-recipient-event-flags.sql
-- Adiciona flags booleanas para rastreamento de eventos por destinatário

ALTER TABLE public.email_campaign_recipients
  ADD COLUMN IF NOT EXISTS was_delivered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS was_opened BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS was_clicked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS was_bounced BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.email_campaign_recipients.was_delivered IS 'Destinatário já teve email entregue (delivered)';
COMMENT ON COLUMN public.email_campaign_recipients.was_opened IS 'Destinatário já abriu o email (opened)';
COMMENT ON COLUMN public.email_campaign_recipients.was_clicked IS 'Destinatário já clicou em algum link (clicked)';
COMMENT ON COLUMN public.email_campaign_recipients.was_bounced IS 'Email do destinatário já retornou (bounced)'; 