-- Adicionar suporte a arquivos na tabela class_instance_content
-- Permite upload de arquivos de qualquer tipo para o conteúdo das turmas

-- Adicionar colunas para arquivos
ALTER TABLE public.class_instance_content 
ADD COLUMN file_url TEXT, -- URL do arquivo no MinIO
ADD COLUMN file_name TEXT, -- Nome original do arquivo
ADD COLUMN file_size INTEGER, -- Tamanho do arquivo em bytes
ADD COLUMN file_type TEXT; -- Tipo MIME do arquivo

-- Adicionar comentários
COMMENT ON COLUMN public.class_instance_content.file_url IS 'URL do arquivo armazenado no MinIO';
COMMENT ON COLUMN public.class_instance_content.file_name IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN public.class_instance_content.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN public.class_instance_content.file_type IS 'Tipo MIME do arquivo';

-- Criar índice para busca por arquivos
CREATE INDEX idx_class_instance_content_has_file ON public.class_instance_content(file_url) WHERE file_url IS NOT NULL; 