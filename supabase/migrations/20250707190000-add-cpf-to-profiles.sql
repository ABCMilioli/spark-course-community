-- Migration: 20250707190000-add-cpf-to-profiles.sql
-- Adiciona campo CPF ao perfil do usuário

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) NOT NULL UNIQUE;

COMMENT ON COLUMN public.profiles.cpf IS 'CPF do usuário, obrigatório e único.'; 