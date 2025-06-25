-- Adicionar campos de visibilidade e data de liberação para módulos e aulas

-- Adicionar campo de visibilidade para módulos
ALTER TABLE public.modules 
ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;

-- Adicionar campo de visibilidade e data de liberação para aulas
ALTER TABLE public.lessons 
ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN release_days INT DEFAULT 0; -- Dias após a matrícula para liberar a aula

-- Comentários para documentar os novos campos
COMMENT ON COLUMN public.modules.is_visible IS 'Controla se o módulo está visível para os alunos';
COMMENT ON COLUMN public.lessons.is_visible IS 'Controla se a aula está visível para os alunos';
COMMENT ON COLUMN public.lessons.release_days IS 'Dias após a matrícula para liberar a aula (0 = imediatamente)';

-- Criar índices para melhor performance nas consultas de visibilidade
CREATE INDEX idx_modules_visible ON public.modules(is_visible);
CREATE INDEX idx_lessons_visible ON public.lessons(is_visible);
CREATE INDEX idx_lessons_release_days ON public.lessons(release_days); 