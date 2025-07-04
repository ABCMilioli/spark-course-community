-- Migration para corrigir a função add_default_course_to_class
-- Data: 2025-01-15
-- Descrição: Corrige a função para usar class_id em vez de class_instance_id

-- 1. Dropar o trigger existente (se existir)
DROP TRIGGER IF EXISTS trigger_add_default_course ON public.class_instances;

-- 2. Recriar a função com a coluna correta
CREATE OR REPLACE FUNCTION public.add_default_course_to_class()
RETURNS TRIGGER AS $$
BEGIN
    -- Adicionar o curso base da turma como primeiro curso
    -- Usar class_id em vez de class_instance_id conforme estrutura atual da tabela
    INSERT INTO public.class_courses (class_id, course_id, is_required, order_index)
    VALUES (NEW.id, NEW.course_id, true, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar o trigger na tabela class_instances
CREATE TRIGGER trigger_add_default_course 
    AFTER INSERT ON public.class_instances 
    FOR EACH ROW 
    EXECUTE FUNCTION public.add_default_course_to_class();

-- 4. Adicionar comentários para documentação
COMMENT ON FUNCTION public.add_default_course_to_class() IS 'Função que adiciona automaticamente o curso base quando uma nova turma é criada';
COMMENT ON TRIGGER trigger_add_default_course ON public.class_instances IS 'Trigger que dispara a função add_default_course_to_class ao criar nova turma'; 