-- Renomear tabelas
ALTER TABLE IF EXISTS public.class_instances RENAME TO classes;
ALTER TABLE IF EXISTS public.class_instance_enrollments RENAME TO class_enrollments;
ALTER TABLE IF EXISTS public.class_instance_content RENAME TO class_content;

-- Renomear colunas
ALTER TABLE IF EXISTS public.class_courses RENAME COLUMN class_instance_id TO class_id;
ALTER TABLE IF EXISTS public.class_enrollments RENAME COLUMN class_instance_id TO class_id;
ALTER TABLE IF EXISTS public.class_content RENAME COLUMN class_instance_id TO class_id;

-- Renomear índices
ALTER INDEX IF EXISTS idx_class_instance_enrollments_instance_id RENAME TO idx_class_enrollments_class_id;
ALTER INDEX IF EXISTS idx_class_instance_content_instance_id RENAME TO idx_class_content_class_id;
ALTER INDEX IF EXISTS idx_class_courses_class_instance_id RENAME TO idx_class_courses_class_id;

-- Atualizar comentários
COMMENT ON TABLE public.classes IS 'Turmas baseadas em cursos específicos.';
COMMENT ON TABLE public.class_enrollments IS 'Matrículas de usuários em turmas.';
COMMENT ON TABLE public.class_content IS 'Conteúdo das turmas (anúncios, materiais, etc).';

-- Criar views para compatibilidade
CREATE OR REPLACE VIEW public.classes AS
SELECT * FROM public.class_instances;

CREATE OR REPLACE VIEW public.class_enrollments AS
SELECT * FROM public.class_instance_enrollments;

CREATE OR REPLACE VIEW public.class_content AS
SELECT * FROM public.class_instance_content;

-- Atualizar a view class_courses_with_details para usar os nomes corretos
CREATE OR REPLACE VIEW public.class_courses_with_details AS
SELECT 
  cc.id,
  cc.class_id,
  cc.course_id,
  cc.is_required,
  cc.order_index,
  cc.created_at,
  c.title as course_title,
  c.description as course_description,
  c.thumbnail_url as course_thumbnail,
  c.level,
  c.price,
  p.name as instructor_name,
  p.avatar_url as instructor_avatar,
  ci.instance_name as class_instance_name
FROM class_courses cc
JOIN courses c ON cc.course_id = c.id
JOIN profiles p ON c.instructor_id = p.id
JOIN classes ci ON cc.class_id = ci.id; 