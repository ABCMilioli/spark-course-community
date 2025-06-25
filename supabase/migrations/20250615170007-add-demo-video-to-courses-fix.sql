-- Adicionar campo demo_video na tabela courses (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'demo_video'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN demo_video TEXT;
        COMMENT ON COLUMN public.courses.demo_video IS 'URL do vídeo de demonstração do curso';
    END IF;
END $$; 