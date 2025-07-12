-- Migration: Criação das tabelas ausentes

-- Tabela: temp_cpf_checkout (tabela temporária para armazenar CPFs em checkout)
CREATE TABLE IF NOT EXISTS public.temp_cpf_checkout (
  id SERIAL PRIMARY KEY,
  cpf VARCHAR(14) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: external_checkouts (armazenar checkouts externos)
CREATE TABLE IF NOT EXISTS public.external_checkouts (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  external_id VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: migrations_applied (controle de migrations aplicadas)
CREATE TABLE IF NOT EXISTS public.migrations_applied (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: class_instances (instâncias de turmas)
CREATE TABLE IF NOT EXISTS public.class_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: class_instance_enrollments (matrículas em instâncias de turma)
CREATE TABLE IF NOT EXISTS public.class_instance_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_instance_id UUID NOT NULL,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: class_instance_content (conteúdo vinculado à instância de turma)
CREATE TABLE IF NOT EXISTS public.class_instance_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_instance_id UUID NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
); 