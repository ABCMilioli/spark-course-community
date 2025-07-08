-- Migration: 20250707200000-add-missing-course-columns.sql
-- Adiciona colunas que estão faltando na tabela courses

-- Adicionar coluna category se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'category') THEN
        ALTER TABLE public.courses ADD COLUMN category TEXT;
        COMMENT ON COLUMN public.courses.category IS 'Categoria do curso';
    END IF;
END $$;

-- Adicionar coluna demo_video se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'demo_video') THEN
        ALTER TABLE public.courses ADD COLUMN demo_video TEXT;
        COMMENT ON COLUMN public.courses.demo_video IS 'URL do vídeo de demonstração do curso';
    END IF;
END $$;

-- Adicionar coluna isPaid se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'isPaid') THEN
        ALTER TABLE public.courses ADD COLUMN isPaid BOOLEAN DEFAULT false;
        COMMENT ON COLUMN public.courses.isPaid IS 'Indica se o curso é pago';
    END IF;
END $$;

-- Adicionar coluna updated_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'updated_at') THEN
        ALTER TABLE public.courses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        COMMENT ON COLUMN public.courses.updated_at IS 'Data da última atualização do curso';
    END IF;
END $$;

-- Adicionar coluna is_active se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'is_active') THEN
        ALTER TABLE public.courses ADD COLUMN is_active BOOLEAN DEFAULT true;
        COMMENT ON COLUMN public.courses.is_active IS 'Indica se o curso está ativo';
    END IF;
END $$;

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Adicionar trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_courses_updated_at') THEN
        CREATE TRIGGER update_courses_updated_at 
            BEFORE UPDATE ON public.courses 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verificar se as colunas foram adicionadas corretamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND column_name IN ('category', 'demo_video', 'isPaid', 'updated_at', 'is_active', 'payment_gateway', 'external_checkout_url')
ORDER BY column_name; 