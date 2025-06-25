-- Adicionar campo video_url na tabela lessons
ALTER TABLE public.lessons 
ADD COLUMN video_url TEXT;

COMMENT ON COLUMN public.lessons.video_url IS 'URL do vídeo enviado para a aula (upload próprio, não YouTube)'; 