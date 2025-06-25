-- Adicionar campo demo_video na tabela courses
ALTER TABLE public.courses 
ADD COLUMN demo_video TEXT;

COMMENT ON COLUMN public.courses.demo_video IS 'URL do vídeo de demonstração do curso'; 